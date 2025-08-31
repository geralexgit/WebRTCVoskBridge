import TelegramBot, { Message } from 'node-telegram-bot-api';
import fetch from 'node-fetch';

// Telegram Bot Token
const TELEGRAM_TOKEN = '8088079041:AAFMKT7lk9M2Qaw7AFHOPWdWQsSJdN4fdd8';

// Initialize bot
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// In-memory conversation storage (in production, use a database)
const conversations = new Map<number, Array<{ role: 'user' | 'ai'; content: string; timestamp: Date }>>();

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

// Helper function to send typing indicator periodically
function startTypingIndicator(chatId: number): () => void {
  const interval = setInterval(() => {
    bot.sendChatAction(chatId, 'typing').catch(err => {
      log.warn('Failed to send typing indicator', { chatId, error: err.message });
    });
  }, 4000); // Send every 4 seconds to keep the indicator active

  // Return function to stop the indicator
  return () => clearInterval(interval);
}

// Helper function to call Ollama API
async function callOllama(prompt: string): Promise<string> {
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

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { response: string };
    return data.response;
  } catch (error) {
    log.error('Error calling Ollama API', error);
    throw error;
  }
}

// Handle /start command
bot.onText(/\/start/, (msg: Message) => {
  const chatId = msg.chat.id;
  const userName = msg.from?.first_name || 'User';

  log.info(`New user started bot`, { chatId, userName });

  bot.sendMessage(chatId, `Привет, ${userName}! Я HR-ассистент. Отправьте мне описание вакансии и резюме для анализа, или просто начните чат для интервью.

Команды:
/start - начать
/help - помощь
/clear - очистить историю разговора`);
});

// Handle /help command
bot.onText(/\/help/, (msg: Message) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, `Я HR-ассистент для проведения интервью и анализа резюме.

Для анализа резюме отправьте сообщение в формате:
Вакансия: [описание вакансии]
Резюме: [текст резюме]

Для чата просто отправьте сообщение, и я отвечу как HR-ассистент.

Команды:
/start - начать
/help - помощь
/clear - очистить историю разговора`);
});

// Handle /clear command
bot.onText(/\/clear/, (msg: Message) => {
  const chatId = msg.chat.id;

  conversations.delete(chatId);
  log.info(`Cleared conversation for chat`, { chatId });

  bot.sendMessage(chatId, 'История разговора очищена.');
});

// Handle text messages
bot.on('message', async (msg: Message) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return; // Ignore commands

  log.info(`Received message`, { chatId, textLength: text.length });

  // Send typing indicator
  await bot.sendChatAction(chatId, 'typing');

  try {
    // Check if message contains resume analysis request
    if (text.includes('Вакансия:') && text.includes('Резюме:')) {
      await handleResumeAnalysis(chatId, text);
    } else {
      await handleChat(chatId, text);
    }
  } catch (error) {
    log.error('Error processing message', { chatId, error });
    bot.sendMessage(chatId, 'Произошла ошибка при обработке сообщения. Попробуйте еще раз.');
  }
});

// Handle resume analysis
async function handleResumeAnalysis(chatId: number, text: string) {
  log.info(`Processing resume analysis`, { chatId });

  const jobDescriptionMatch = text.match(/Вакансия:\s*(.+?)(?=Резюме:|$)/s);
  const resumeMatch = text.match(/Резюме:\s*(.+)$/s);

  if (!jobDescriptionMatch || !resumeMatch) {
    bot.sendMessage(chatId, 'Пожалуйста, укажите вакансию и резюме в формате:\nВакансия: [описание]\nРезюме: [текст]');
    return;
  }

  const jobDescription = jobDescriptionMatch[1].trim();
  const resume = resumeMatch[1].trim();

  const prompt = `
    Ты — HR-ассистент.
    У тебя есть описание вакансии и резюме кандидата.
    1. Извлеки ключевые требования из вакансии.
    2. Извлеки ключевые навыки из резюме.
    3. Определи совпадения и пробелы.
    4. Сгенерируй 5 вопросов для интервью (technical, case study, soft skills).
    5. Ответ кандидата приходит из системы распознавания речи, вероятно, содержит ошибки учитывай это при анализе
    Верни ответ в JSON с ключами: job_requirements, candidate_skills, matches, gaps, questions.
    ---
    Вакансия:
    ${jobDescription}

    Резюме:
    ${resume}
`;

  // Start typing indicator
  const stopTyping = startTypingIndicator(chatId);

  try {
    const rawOutput = await callOllama(prompt);
    let jsonOutput;

    try {
      jsonOutput = JSON.parse(rawOutput);
    } catch (e) {
      jsonOutput = { raw: rawOutput };
    }

    let responseText = 'Анализ резюме:\n\n';

    if (jsonOutput.job_requirements) {
      responseText += `Требования вакансии: ${jsonOutput.job_requirements}\n\n`;
    }
    if (jsonOutput.candidate_skills) {
      responseText += `Навыки кандидата: ${jsonOutput.candidate_skills}\n\n`;
    }
    if (jsonOutput.matches) {
      responseText += `Совпадения: ${jsonOutput.matches}\n\n`;
    }
    if (jsonOutput.gaps) {
      responseText += `Пробелы: ${jsonOutput.gaps}\n\n`;
    }
    if (jsonOutput.questions) {
      responseText += `Вопросы для интервью:\n${jsonOutput.questions.join('\n')}\n\n`;
    }

    if (jsonOutput.raw) {
      responseText = jsonOutput.raw;
    }

    // Stop typing indicator and send message
    stopTyping();
    await bot.sendMessage(chatId, responseText);
    log.info(`Resume analysis completed`, { chatId });
  } catch (error) {
    stopTyping();
    log.error('Error in resume analysis', { chatId, error });
    bot.sendMessage(chatId, 'Ошибка при анализе резюме. Попробуйте еще раз.');
  }
}

// Handle chat messages
async function handleChat(chatId: number, message: string) {
  log.info(`Processing chat message`, { chatId });

  // Get or create conversation history
  let history = conversations.get(chatId) || [];

  // Add user message to history
  history.push({ role: 'user', content: message, timestamp: new Date() });

  // Prepare conversation context for the AI
  const conversationContext = history
    .slice(-10) // Keep last 10 messages for context
    .map(msg => `${msg.role === 'user' ? 'Candidate' : 'HR Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `
Ты — HR-ассистент, проводящий интервью с кандидатом.

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

  // Start typing indicator
  const stopTyping = startTypingIndicator(chatId);

  try {
    const rawOutput = await callOllama(prompt);
    let aiResponse;

    try {
      aiResponse = JSON.parse(rawOutput);
    } catch (e) {
      aiResponse = {
        analysis: "Анализирую ответ...",
        feedback: rawOutput,
        next_question: "Расскажите подробнее о вашем опыте."
      };
    }

    // Add AI response to history
    history.push({ role: 'ai', content: JSON.stringify(aiResponse), timestamp: new Date() });
    conversations.set(chatId, history);

    // Only respond with feedback field
    const responseText = aiResponse.feedback || 'Спасибо за ответ!';

    // Stop typing indicator and send message
    stopTyping();
    await bot.sendMessage(chatId, responseText);
    log.info(`Chat message processed`, { chatId, conversationLength: history.length });
  } catch (error) {
    stopTyping();
    log.error('Error in chat processing', { chatId, error });
    bot.sendMessage(chatId, 'Ошибка при обработке сообщения. Попробуйте еще раз.');
  }
}

// Startup logging
log.info('Starting Telegram Bot Service', {
  token: TELEGRAM_TOKEN.substring(0, 10) + '...',
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  pid: process.pid
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully');
  bot.stopPolling();
  process.exit(0);
});

console.log('Telegram Bot is running...');
