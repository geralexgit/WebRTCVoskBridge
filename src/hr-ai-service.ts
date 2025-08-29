import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import cors from "cors";

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

const app = express();
const PORT = 3001; // Using different port to avoid conflicts

// In-memory conversation storage (in production, use a database)
const conversations = new Map<string, Array<{ role: 'user' | 'ai'; content: string; timestamp: Date }>>();

// Logging utility
const log = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error);
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

// Request logging middleware
app.use((req, res, next) => {
  const requestId = Math.random().toString(36).substr(2, 9);
  req.requestId = requestId;
  
  log.info(`Incoming ${req.method} request to ${req.path}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });
  
  next();
});

app.use(cors());
app.use(bodyParser.json());

// POST /process-resume
app.post("/process-resume", async (req, res) => {
  const requestId = req.requestId;
  const startTime = Date.now();
  
  log.info(`Processing resume analysis request`, {
    requestId,
    hasJobDescription: !!req.body.jobDescription,
    hasResume: !!req.body.resume,
    jobDescriptionLength: req.body.jobDescription?.length || 0,
    resumeLength: req.body.resume?.length || 0
  });

  const { jobDescription, resume } = req.body;

  if (!jobDescription || !resume) {
    log.warn(`Missing required fields in request`, {
      requestId,
      hasJobDescription: !!jobDescription,
      hasResume: !!resume
    });
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

  log.debug(`Generated prompt for Ollama`, {
    requestId,
    promptLength: prompt.length,
    model: "gemma3n:latest"
  });

  try {
    log.info(`Sending request to Ollama API`, {
      requestId,
      ollamaUrl: "http://localhost:11434/api/generate",
      model: "gemma3n:latest"
    });

    const ollamaStartTime = Date.now();
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3n:latest",
        prompt: prompt,
        stream: false
      })
    });

    const ollamaResponseTime = Date.now() - ollamaStartTime;
    
    if (!response.ok) {
      log.error(`Ollama API returned error status`, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        responseTime: ollamaResponseTime
      });
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    log.info(`Received response from Ollama API`, {
      requestId,
      status: response.status,
      responseTime: ollamaResponseTime,
      contentType: response.headers.get('content-type')
    });

    const data = await response.json() as { response: string };

    // Ollama возвращает { response: "..." }
    const rawOutput = data.response;
    
    log.debug(`Raw Ollama response`, {
      requestId,
      responseLength: rawOutput?.length || 0,
      responsePreview: rawOutput?.substring(0, 200) + (rawOutput?.length > 200 ? '...' : '')
    });

    let jsonOutput;

    try {
      jsonOutput = JSON.parse(rawOutput);
      log.info(`Successfully parsed JSON response from Ollama`, {
        requestId,
        hasJobRequirements: !!jsonOutput.job_requirements,
        hasCandidateSkills: !!jsonOutput.candidate_skills,
        hasMatches: !!jsonOutput.matches,
        hasGaps: !!jsonOutput.gaps,
        hasQuestions: !!jsonOutput.questions,
        questionsCount: jsonOutput.questions?.length || 0
      });
    } catch (e) {
      log.warn(`Failed to parse JSON from Ollama response, returning raw text`, {
        requestId,
        parseError: e instanceof Error ? e.message : 'Unknown error',
        rawResponseLength: rawOutput?.length || 0
      });
      // Если модель вернула текст вместо JSON
      jsonOutput = { raw: rawOutput };
    }

    const totalTime = Date.now() - startTime;
    log.info(`Resume analysis completed successfully`, {
      requestId,
      totalProcessingTime: totalTime,
      ollamaResponseTime,
      responseType: jsonOutput.raw ? 'raw' : 'structured'
    });

    res.json(jsonOutput);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    log.error(`Error processing resume analysis request`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      totalProcessingTime: totalTime
    });
    
    res.status(500).json({ 
      error: "Ошибка при обработке запроса",
      requestId: requestId
    });
  }
});

// POST /chat - New endpoint for conversational messages
app.post("/chat", async (req, res) => {
  const requestId = req.requestId;
  const startTime = Date.now();
  
  log.info(`Processing chat message`, {
    requestId,
    hasMessage: !!req.body.message,
    hasSessionId: !!req.body.sessionId,
    messageLength: req.body.message?.length || 0
  });

  const { message, sessionId = 'default', jobDescription, conversationHistory } = req.body;

  if (!message) {
    log.warn(`Missing message in chat request`, { requestId });
    return res.status(400).json({ error: "Message is required" });
  }

  // Get or create conversation history
  let history = conversations.get(sessionId) || [];
  
  // Add user message to history
  history.push({ role: 'user', content: message, timestamp: new Date() });
  
  // Prepare conversation context for the AI
  const conversationContext = history
    .slice(-10) // Keep last 10 messages for context
    .map(msg => `${msg.role === 'user' ? 'Candidate' : 'HR Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `
Ты — HR-ассистент, проводящий интервью с кандидатом.

${jobDescription ? `Описание вакансии: ${jobDescription}` : ''}

Контекст разговора:
${conversationContext}

Твоя задача:
1. Проанализируй ответ кандидата
2. Оцени соответствие требованиям вакансии
3. Задай следующий уместный вопрос или дай обратную связь
4. Будь дружелюбным, но профессиональным

Верни ответ в JSON формате:
{
  "analysis": "краткий анализ ответа",
  "score": "оценка от 1 до 10",
  "feedback": "конструктивная обратная связь",
  "next_question": "следующий вопрос для кандидата",
  "overall_assessment": "общая оценка соответствия вакансии"
}

Ответ кандидата: ${message}
`;

  try {
    log.info(`Sending chat request to Ollama API`, {
      requestId,
      ollamaUrl: "http://localhost:11434/api/generate",
      model: "gemma3n:latest",
      conversationLength: history.length
    });

    const ollamaStartTime = Date.now();
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemma3n:latest",
        prompt: prompt,
        stream: false
      })
    });

    const ollamaResponseTime = Date.now() - ollamaStartTime;
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { response: string };
    const rawOutput = data.response;
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(rawOutput);
    } catch (e) {
      // If JSON parsing fails, use raw response
      aiResponse = { 
        analysis: "Анализирую ответ...",
        feedback: rawOutput,
        next_question: "Расскажите подробнее о вашем опыте."
      };
    }

    // Add AI response to history
    history.push({ role: 'ai', content: JSON.stringify(aiResponse), timestamp: new Date() });
    conversations.set(sessionId, history);

    const totalTime = Date.now() - startTime;
    log.info(`Chat message processed successfully`, {
      requestId,
      totalProcessingTime: totalTime,
      ollamaResponseTime,
      sessionId,
      conversationLength: history.length
    });

    res.json(aiResponse);
  } catch (error) {
    const totalTime = Date.now() - startTime;
    log.error(`Error processing chat message`, {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalProcessingTime: totalTime
    });
    
    res.status(500).json({ 
      error: "Ошибка при обработке сообщения",
      requestId: requestId
    });
  }
});

// GET /conversation/:sessionId - Get conversation history
app.get("/conversation/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const requestId = req.requestId;
  
  const history = conversations.get(sessionId) || [];
  
  log.info(`Retrieved conversation history`, {
    requestId,
    sessionId,
    messageCount: history.length
  });
  
  res.json({ 
    sessionId, 
    messages: history,
    messageCount: history.length
  });
});

// DELETE /conversation/:sessionId - Clear conversation history
app.delete("/conversation/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const requestId = req.requestId;
  
  const deleted = conversations.delete(sessionId);
  
  log.info(`Cleared conversation history`, {
    requestId,
    sessionId,
    wasDeleted: deleted
  });
  
  res.json({ 
    sessionId, 
    cleared: deleted,
    message: deleted ? "Conversation cleared" : "Conversation not found"
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  const requestId = req.requestId;
  
  log.info(`Health check requested`, {
    requestId,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    activeConversations: conversations.size
  });
  
  res.json({ 
    status: "OK", 
    service: "HR AI Service", 
    port: PORT,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    requestId,
    activeConversations: conversations.size
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  log.error(`Unhandled error in request`, {
    requestId: req.requestId,
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: "Internal server error",
    requestId: req.requestId
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Startup logging
log.info('Starting HR AI Service', {
  port: PORT,
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  pid: process.pid
});

app.listen(PORT, () => {
  log.info(`HR AI Service started successfully`, {
    port: PORT,
    url: `http://localhost:${PORT}`,
    endpoints: [
      'POST /process-resume',
      'POST /chat',
      'GET /conversation/:sessionId',
      'DELETE /conversation/:sessionId',
      'GET /health'
    ]
  });
  
  // Test Ollama connection on startup
  fetch("http://localhost:11434/api/version")
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    })
    .then(data => {
      log.info('Ollama connection test successful', data);
    })
    .catch(error => {
      log.warn('Ollama connection test failed - service may not work properly', {
        error: error.message,
        suggestion: 'Make sure Ollama is running: ollama serve'
      });
    });
});