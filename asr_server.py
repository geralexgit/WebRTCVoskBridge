import argparse
import asyncio
import json
import struct
import os
import zipfile
import urllib.request

import numpy as np
import websockets
from vosk import Model, KaldiRecognizer

# Принимаем бинарные чанки PCM16 mono 16 kHz, выдаём partial/final JSON
# Протокол:
#  - бинарные сообщения: сырые Int16LE семплы
#  - текстовые сообщения: служебные команды ("reset", "finalize") — опционально

class ASRServer:
    def __init__(self, model_paths: dict):
        self.models = {}
        self.current_language = 'en'
        
        # Load available models
        for lang, path in model_paths.items():
            if os.path.exists(path):
                try:
                    self.models[lang] = Model(path)
                    print(f"Loaded {lang} model from: {path}")
                except Exception as e:
                    print(f"Failed to load {lang} model: {e}")
        
        if not self.models:
            raise ValueError("No valid models found!")
        
        # Set default language to first available model
        if 'en' in self.models:
            self.current_language = 'en'
        else:
            self.current_language = list(self.models.keys())[0]
        
        print(f"Default language: {self.current_language}")
    
    def get_current_model(self):
        return self.models.get(self.current_language)
    
    def set_language(self, language: str):
        if language in self.models:
            self.current_language = language
            print(f"Switched to language: {language}")
            return True
        else:
            print(f"Language {language} not available. Available: {list(self.models.keys())}")
            return False

    async def handler(self, websocket):
        # Each connection maintains its own language state
        connection_language = self.current_language
        model = self.models[connection_language]
        rec = KaldiRecognizer(model, 16000)
        rec.SetWords(True)
        print(f"New connection from {websocket.remote_address} using language: {connection_language}")

        final_results = []  # Store all final results for this connection

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
                        final_results.append(json.loads(result).get("text", ""))
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
                            # Store the last segment
                            final_results.append(json.loads(final_result).get("text", ""))
                            # After finalization, you can recreate recognizer for new segment
                            model = self.models[connection_language]
                            rec = KaldiRecognizer(model, 16000)
                            rec.SetWords(True)
                            # Concatenate all results and send as one string
                            full_text = " ".join([r for r in final_results if r]).strip()
                            print(f"Full session result: {full_text}")
                            await websocket.send(json.dumps({"full_result": full_text}))
                        elif data.get("cmd") == "reset":
                            model = self.models[connection_language]
                            rec = KaldiRecognizer(model, 16000)
                            rec.SetWords(True)
                            final_results.clear()
                        elif data.get("cmd") == "set_language":
                            language = data.get("language", "en")
                            if language in self.models:
                                # Update connection language and recreate recognizer
                                connection_language = language
                                model = self.models[connection_language]
                                rec = KaldiRecognizer(model, 16000)
                                rec.SetWords(True)
                                print(f"Connection {websocket.remote_address} switched to language: {language}")
                                await websocket.send(json.dumps({
                                    "status": "language_changed",
                                    "language": language
                                }))
                            else:
                                await websocket.send(json.dumps({
                                    "status": "language_error",
                                    "message": f"Language {language} not available",
                                    "available": list(self.models.keys())
                                }))
                        elif data.get("cmd") == "get_final_results":
                            # Return all accumulated final results for this session
                            full_text = " ".join([r for r in final_results if r]).strip()
                            await websocket.send(json.dumps({
                                "cmd": "final_results",
                                "results": final_results,
                                "full_text": full_text,
                                "result_count": len(final_results)
                            }))
                            print(f"Sent final results to {websocket.remote_address}: {full_text}")
                    except Exception as e:
                        # игнорируем не-JSON текст
                        print(f"Error parsing command: {e}")
                        pass
        except websockets.exceptions.ConnectionClosed:
            # On connection close, print the full result
            full_text = " ".join([r for r in final_results if r]).strip()
            print(f"Connection closed: {websocket.remote_address}")
            print(f"Full session result: {full_text}")
        except websockets.exceptions.InvalidUpgrade as e:
            print(f"Invalid WebSocket upgrade from {websocket.remote_address}: {e}")
        except Exception as e:
            print(f"Error in handler: {e}")

    async def run(self, host: str, port: int):
        print(f"Starting ASR WebSocket server on ws://{host}:{port}")
        async with websockets.serve(self.handler, host, port, max_size=2**23):
            print(f"ASR WebSocket server listening on ws://{host}:{port}")
            await asyncio.Future()  # run forever


def main():
    parser = argparse.ArgumentParser(description="Vosk ASR WebSocket Server")
    parser.add_argument("--model", default="./vosk-model", help="Path to default English model directory")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=2700)
    args = parser.parse_args()

    # Define model paths for different languages
    model_paths = {
        'en': args.model,  # English model (default)
        'ru': './vosk-model-ru',  # Russian model (if available)
        'de': './vosk-model-de',  # German model (if available)
        'fr': './vosk-model-fr',  # French model (if available)
        'es': './vosk-model-es',  # Spanish model (if available)
        'zh': './vosk-model-zh',  # Chinese model (if available)
    }

    # Check if at least the default English model exists
    if not os.path.exists(args.model):
        print(f"Error: Default model directory '{args.model}' does not exist!")
        print("Please download a Vosk model, for example:")
        print("wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip")
        print("unzip vosk-model-small-en-us-0.15.zip")
        print("mv vosk-model-small-en-us-0.15 vosk-model")
        return

    try:
        server = ASRServer(model_paths)
        asyncio.run(server.run(args.host, args.port))
    except ImportError:
        print("Error: Required packages not installed!")
        print("Please run: pip install vosk websockets numpy")
    except Exception as e:
        print(f"Error starting server: {e}")


if __name__ == "__main__":
    main()
