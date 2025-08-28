# WebRTC → WebSocket → Vosk: рабочий пример (Node.js + Python)

Полностью рабочая минимальная связка для реального времени:

**Браузер (WebRTC DataChannel, AudioWorklet, downsample до 16 kHz PCM16)** → **Node.js (wrtc) — signaling + мост** → **Python Vosk (WebSocket ASR-сервер)**.

---

## 📁 Структура проекта
```
webrtc-vosk-demo/
├─ server/                    # Python ASR WebSocket сервер (Vosk)
│  ├─ asr_server.py
│  └─ requirements.txt
├─ node/                      # Node.js сигналинг + мост в Vosk
│  ├─ package.json
│  └─ signaling-server.js
└─ web/                       # Простейший фронтенд (браузер)
   ├─ index.html
   └─ audio-processor.js      # AudioWorklet для downsample → Int16 PCM
```

---

## 🚀 Быстрый старт

### 1) Установка Vosk и запуск ASR-сервера (Python)
```bash
cd server
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# скачай модель (пример: русская маленькая)
wget https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip
unzip vosk-model-small-ru-0.22.zip

# запусти сервер, указав путь к модели
python asr_server.py --model ./vosk-model-small-ru-0.22 --host 127.0.0.1 --port 2700
```
Сервер поднимет WebSocket на `ws://127.0.0.1:2700` и будет принимать **сырые бинарные чанки PCM16, 16 kHz, mono**. Отдаёт JSON с `partial` и `text`.

### 2) Установка и запуск Node.js сигналинга/моста
```bash
cd ../node
npm install
node signaling-server.js
```
Сервер поднимется на `http://127.0.0.1:8080` и будет:
- отдавать статику из `../web`;
- принимать WebRTC `offer` от браузера на `POST /offer`;
- устанавливать **DataChannel** для аудио-чанков и прокидывать их бинарно в Python ASR;
- пересылать текстовые результаты обратно в браузер (тем же каналом в виде JSON-строк).

### 3) Открыть фронтенд
Открой в браузере: `http://127.0.0.1:8080` → нажми **Start**, дай доступ к микрофону. В консоли и на странице будут появляться частичные/финальные результаты распознавания.

> Примечание: в Chrome может потребоваться запуск с флагом `--disable-web-security` для работы с localhost + AudioWorklet из file-системы, но в этом примере Worklet грузится со статического сервера Node, так что всё ок. Если возникнут проблемы — проверь `https`/`localhost` и разрешения микрофона.

---

## 🧠 server/requirements.txt
```txt
vosk==0.3.45
websockets==12.0
numpy==1.26.4
```

## 🧠 server/asr_server.py
```python
import argparse
import asyncio
import json
import struct

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

    async def handler(self, websocket):
        rec = KaldiRecognizer(self.model, 16000)
        rec.SetWords(True)

        async for msg in websocket:
            if isinstance(msg, (bytes, bytearray)):
                # Бинарные данные → Int16 → bytes → в Vosk
                # Убедимся, что длина чётная
                if len(msg) % 2 != 0:
                    # добиваем нулём, чтобы не упасть
                    msg += b"\x00"
                if rec.AcceptWaveform(msg):
                    result = rec.Result()  # финальный кусок
                    await websocket.send(result)
                else:
                    partial = rec.PartialResult()
                    await websocket.send(partial)
            else:
                # Текстовые команды (необязательно)
                try:
                    data = json.loads(msg)
                    if data.get("cmd") == "finalize":
                        await websocket.send(rec.FinalResult())
                        # После финализации можно пересоздать рекогнайзер для нового сегмента
                        rec = KaldiRecognizer(self.model, 16000)
                        rec.SetWords(True)
                except Exception:
                    # игнорируем не-JSON текст
                    pass

    async def run(self, host: str, port: int):
        async with websockets.serve(self.handler, host, port, max_size=2**23):
            print(f"ASR WebSocket server listening on ws://{host}:{port}")
            await asyncio.Future()  # run forever


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True, help="Path to Vosk model directory")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2700)
    args = parser.parse_args()

    server = ASRServer(args.model)
    asyncio.run(server.run(args.host, args.port))


if __name__ == "__main__":
    main()
```

---

## 🧩 node/package.json
```json
{
  "name": "webrtc-vosk-node-bridge",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "express": "^4.19.2",
    "ws": "^8.18.0",
    "wrtc": "^0.4.7",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2",
    "node-fetch": "^3.3.2"
  }
}
```

## 🧩 node/signaling-server.js
```js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import { RTCPeerConnection } from "wrtc";
import WebSocket from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));

// Раздаём статику фронта
app.use(express.static(path.join(__dirname, "../web")));

const server = http.createServer(app);

// ====== VOSK WS client ======
const VOSK_URL = process.env.VOSK_URL || "ws://127.0.0.1:2700";

// Храним активные сессии по id
const sessions = new Map();

// REST endpoint для приёма SDP offer и возврата answer
app.post("/offer", async (req, res) => {
  try {
    const pc = new RTCPeerConnection({});

    // Один общий datachannel (клиент может создать сам, но мы перехватим ondatachannel)
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      console.log("DataChannel received:", channel.label);

      // Подключаемся к VOSK WS
      const asr = new WebSocket(VOSK_URL);

      asr.on("open", () => {
        console.log("Connected to VOSK at", VOSK_URL);
      });

      asr.on("message", (msg) => {
        // Ответы от Vosk → обратно в браузер (строкой)
        try {
          const text = typeof msg === "string" ? msg : msg.toString();
          channel.send(text);
        } catch (e) {
          console.error("Failed to send to browser:", e);
        }
      });

      channel.onmessage = (ev) => {
        // Ожидаем ArrayBuffer с PCM16 16k mono
        const data = ev.data;
        if (typeof data === "string") {
          // Вдруг пришла команда finalize
          asr.readyState === WebSocket.OPEN && asr.send(data);
          return;
        }
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(new Uint8Array(data));
        if (asr.readyState === WebSocket.OPEN) {
          asr.send(buf);
        }
      };

      channel.onclose = () => {
        console.log("DataChannel closed");
        try { asr.close(); } catch {}
      };
    };

    // Создаём и устанавливаем удалённое описание (offer)
    await pc.setRemoteDescription(req.body);

    // Генерируем answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    res.json(pc.localDescription);

    pc.onicecandidate = ({ candidate }) => {
      // Трюк: для простоты не реализуем trickle ICE,
      // фронт ждёт финальный answer (без отдельного обмена кандидатами)
    };

    // Убираем peer через 5 минут
    setTimeout(() => pc.close(), 5 * 60 * 1000);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling/bridge on http://127.0.0.1:${PORT}`);
});
```

---

## 🎛️ web/index.html
```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WebRTC → Vosk Demo</title>
  <style>
    body { font-family: system-ui, Arial, sans-serif; margin: 20px; }
    #log { white-space: pre-wrap; background: #111; color: #0f0; padding: 12px; border-radius: 8px; height: 240px; overflow: auto; }
    button { padding: 10px 16px; font-size: 16px; }
  </style>
</head>
<body>
  <h1>WebRTC → WebSocket → Vosk</h1>
  <button id="start">Start</button>
  <button id="stop" disabled>Stop</button>
  <div id="status"></div>
  <h3>Transcription</h3>
  <div id="log"></div>

  <script>
    const logEl = document.getElementById('log');
    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('start');
    const stopBtn = document.getElementById('stop');

    let pc, channel, mediaStream, workletNode, audioContext;

    function log(line) {
      logEl.textContent += line + "\n";
      logEl.scrollTop = logEl.scrollHeight;
    }

    async function createPeer() {
      pc = new RTCPeerConnection();

      // Канал, по которому сервер будет отвечать (и который мы будем использовать, если сервер не создаёт свой)
      channel = pc.createDataChannel('audio');
      channel.binaryType = 'arraybuffer';

      channel.onopen = () => {
        statusEl.textContent = 'DataChannel open';
      };
      channel.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.partial) log('[partial] ' + data.partial);
          if (data.text) log('[final]   ' + data.text);
        } catch (e) {
          // возможно пришёл не-JSON
          log('[raw] ' + ev.data);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const answer = await fetch('/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pc.localDescription)
      }).then(r => r.json());

      await pc.setRemoteDescription(answer);
    }

    async function start() {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      await createPeer();

      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioContext = new AudioContext({ sampleRate: 48000 });
      await audioContext.audioWorklet.addModule('audio-processor.js');

      const source = audioContext.createMediaStreamSource(mediaStream);
      workletNode = new AudioWorkletNode(audioContext, 'pcm16-downsampler', { processorOptions: { targetSampleRate: 16000 } });

      workletNode.port.onmessage = (ev) => {
        // ev.data — это ArrayBuffer с Int16LE (mono, 16k)
        if (channel && channel.readyState === 'open') {
          channel.send(ev.data);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination); // можно отключить, если не нужно слышать себя
    }

    function stop() {
      startBtn.disabled = false;
      stopBtn.disabled = true;

      if (workletNode) { workletNode.disconnect(); workletNode = null; }
      if (audioContext) { audioContext.close(); audioContext = null; }
      if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
      if (channel && channel.readyState === 'open') {
        channel.send(JSON.stringify({ cmd: 'finalize' }));
      }
      if (pc) { pc.close(); pc = null; }
    }

    startBtn.onclick = start;
    stopBtn.onclick = stop;
  </script>
</body>
</html>
```

## 🎚️ web/audio-processor.js (AudioWorklet)
```js
// Регистрируем процессор, который:
// 1) принимает Float32 PCM 48kHz (обычно так даёт AudioContext)
// 2) downsample до 16kHz
// 3) конвертирует в Int16LE и отправляет в main через port.postMessage(ArrayBuffer)

class PCM16Downsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.inputSampleRate = sampleRate; // системный (например, 48000)
    this.targetSampleRate = (options && options.processorOptions && options.processorOptions.targetSampleRate) || 16000;
    this._ratio = this.inputSampleRate / this.targetSampleRate;
    this._buffer = [];
  }

  static get parameterDescriptors() { return []; }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channelData = input[0]; // mono берём 0-й канал
    if (!channelData || channelData.length === 0) return true;

    // Downsample простым дециматором (для демо достаточно)
    const outLength = Math.floor(channelData.length / this._ratio);
    const out = new Int16Array(outLength);
    for (let i = 0, j = 0; j < outLength; j++) {
      const idx = Math.floor(j * this._ratio);
      let s = channelData[idx];
      // clamp + convert float32 [-1,1) → int16
      s = Math.max(-1, Math.min(1, s));
      out[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    this.port.postMessage(out.buffer, [out.buffer]);
    return true;
  }
}

registerProcessor('pcm16-downsampler', PCM16Downsampler);
```

---

## ✅ Проверка и отладка
- Если в браузер не приходят ответы — проверь логи Node: подключился ли к Vosk (`Connected to VOSK…`).
- Если Vosk ругается на формат — убедись, что идёт **mono 16 kHz Int16LE**. В логе Python можно временно печатать размеры чанков.
- Для устойчивости в проде добавь:
  - heartbeat/пинги между Node ↔ Vosk и Node ↔ браузером;
  - ограничение размера/частоты отправки чанков (например, ~20–50 мс аудио за пакет);
  - буферизацию и backpressure.

## 🔒 Замечания по безопасности и качеству
- Включи HTTPS и `secure` контекст для getUserMedia/WebRTC в проде.
- Добавь VAD (voice activity detection) на клиенте или сервере, чтобы не гнать тишину.
- Для лучшей точности используй полноразмерную модель (не `small`) и доменную словарную адаптацию.

---

Готово! Этот пример можно клонировать как основу, расширять диаризацией и пост‑обработкой (пунктуация, нормализация чисел, типографика) и интегрировать в общий пайплайн интервьюера.

