import argparse
import asyncio
import json
import struct
import os

import numpy as np
import websockets
from vosk import Model, KaldiRecognizer

# Принимаем бинарные чанки PCM16 mono 16 kHz, выдаём partial/final JSON
# Протокол:
#  - бинарные сообщения: сырые Int16LE семплы
#  - текстовые сообщения: служебные команды ("reset", "finalize") — опционально

class ASRServer:
    def __init__(self, model_path: str):
        self.model = Model(model_path)
        print(f"Loaded Vosk model from: {model_path}")

    async def handler(self, websocket):
        rec = KaldiRecognizer(self.model, 16000)
        rec.SetWords(True)
        print(f"New connection from {websocket.remote_address}")

        try:
            async for msg in websocket:
                if isinstance(msg, (bytes, bytearray)):
                    # Бинарные данные → Int16 → bytes → в Vosk
                    # Убедимся, что длина чётная
                    if len(msg) % 2 != 0:
                        # добиваем нулём, чтобы не упасть
                        msg += b"\x00"
                    
                    if rec.AcceptWaveform(msg):
                        result = rec.Result()  # финальный кусок
                        print(f"Final result: {result}")
                        await websocket.send(result)
                    else:
                        partial = rec.PartialResult()
                        if json.loads(partial).get("partial"):  # Отправляем только если есть текст
                            await websocket.send(partial)
                else:
                    # Текстовые команды (необязательно)
                    try:
                        data = json.loads(msg)
                        if data.get("cmd") == "finalize":
                            final_result = rec.FinalResult()
                            await websocket.send(final_result)
                            # После финализации можно пересоздать рекогнайзер для нового сегмента
                            rec = KaldiRecognizer(self.model, 16000)
                            rec.SetWords(True)
                        elif data.get("cmd") == "reset":
                            rec = KaldiRecognizer(self.model, 16000)
                            rec.SetWords(True)
                    except Exception as e:
                        # игнорируем не-JSON текст
                        print(f"Error parsing command: {e}")
                        pass
        except websockets.exceptions.ConnectionClosed:
            print(f"Connection closed: {websocket.remote_address}")
        except Exception as e:
            print(f"Error in handler: {e}")

    async def run(self, host: str, port: int):
        print(f"Starting ASR WebSocket server on ws://{host}:{port}")
        async with websockets.serve(self.handler, host, port, max_size=2**23):
            print(f"ASR WebSocket server listening on ws://{host}:{port}")
            await asyncio.Future()  # run forever


def main():
    parser = argparse.ArgumentParser(description="Vosk ASR WebSocket Server")
    parser.add_argument("--model", default="./vosk-model", help="Path to Vosk model directory")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=2700)
    args = parser.parse_args()

    # Check if model exists
    if not os.path.exists(args.model):
        print(f"Error: Model directory '{args.model}' does not exist!")
        print("Please download a Vosk model, for example:")
        print("wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip")
        print("unzip vosk-model-small-en-us-0.15.zip")
        print("mv vosk-model-small-en-us-0.15 vosk-model")
        return

    try:
        server = ASRServer(args.model)
        asyncio.run(server.run(args.host, args.port))
    except ImportError:
        print("Error: Required packages not installed!")
        print("Please run: pip install vosk websockets numpy")
    except Exception as e:
        print(f"Error starting server: {e}")


if __name__ == "__main__":
    main()
