Пример простого **Node.js сервиса на Express**, который принимает **вакансию и резюме** и вызывает **Gemma 3n через Ollama API** для генерации вопросов.

---

## 📂 Структура проекта

```
hr-ai-service/
 ├── server.js        # основной сервер Express
 ├── package.json
```

---

## 📜 package.json

```json
{
  "name": "hr-ai-service",
  "version": "1.0.0",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "body-parser": "^1.20.2",
    "node-fetch": "^3.3.2",
    "cors": "^2.8.5"
  }
}
```

---

## 📜 server.js

```js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// POST /process-resume
app.post("/process-resume", async (req, res) => {
  const { jobDescription, resume } = req.body;

  if (!jobDescription || !resume) {
    return res.status(400).json({ error: "jobDescription и resume обязательны" });
  }

  // Формируем промпт для Gemma
  const prompt = `
Ты — HR-ассистент. 
У тебя есть описание вакансии и резюме кандидата. 
1. Извлеки ключевые требования из вакансии. 
2. Извлеки ключевые навыки из резюме. 
3. Определи совпадения и пробелы. 
4. Сгенерируй 5 вопросов для интервью (technical, case study, soft skills).
Верни ответ в JSON с ключами: job_requirements, candidate_skills, matches, gaps, questions.
---
Вакансия:
${jobDescription}

Резюме:
${resume}
`;

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3n:latest",
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();

    // Ollama возвращает { response: "..." }
    const rawOutput = data.response;
    let jsonOutput;

    try {
      jsonOutput = JSON.parse(rawOutput);
    } catch (e) {
      // Если модель вернула текст вместо JSON
      jsonOutput = { raw: rawOutput };
    }

    res.json(jsonOutput);
  } catch (error) {
    console.error("Ошибка при запросе к Ollama:", error);
    res.status(500).json({ error: "Ошибка при обработке запроса" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 HR AI сервис запущен на http://localhost:${PORT}`);
});
```

---

## 🚀 Запуск

1. Установи зависимости:

```bash
npm install
```

2. Убедись, что **Ollama запущен локально** и модель `gemma3n:latest` загружена:

```bash
ollama pull gemma3n:latest
```

3. Запусти сервис:

```bash
npm start
```

4. Отправь тестовый запрос (например, через curl или Postman):

```bash
curl -X POST http://localhost:3000/process-resume \
  -H "Content-Type: application/json" \
  -d '{
    "jobDescription": "Ищем Python-разработчика с опытом в SQL и аналитике данных",
    "resume": "Опыт: 3 года Python, Excel, PowerBI"
  }'
```
