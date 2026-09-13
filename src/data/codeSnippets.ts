export interface CodeFile {
  name: string;
  language: string;
  code: string;
  description: string;
}

export const codeSnippets: CodeFile[] = [
  {
    name: "server.ts",
    language: "typescript",
    description: "Головна точка входу об'єднаного бекенду: Express API + grammY Webhook / Polling + Планувальник.",
    code: `import express from 'express';
import { webhookCallback } from 'grammy';
import { createBot } from './src/bot/bot';
import { startBackgroundScheduler } from './src/services/scheduler';

const app = express();
const bot = createBot();

// Webhook for Telegram
app.use('/api/telegram-webhook', webhookCallback(bot, 'express'));

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 TonyBot Unified Platform online');
  startBackgroundScheduler(bot);
});`
  },
  {
    name: "bot.ts",
    language: "typescript",
    description: "Ініціалізація grammY бота, обробники команд /start, /day1-8, FSM тестів та ШІ-відповідей.",
    code: `import { Bot } from 'grammy';
import { handleStartCommand } from './handlers/start';
import { handleAiTextMessage } from './handlers/aiText';

export function createBot() {
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
  bot.command('start', handleStartCommand);
  bot.on('message:text', handleAiTextMessage);
  return bot;
}`
  },
  {
    name: "supabase.ts",
    language: "typescript",
    description: "Шар доступу до даних Supabase PostgreSQL (users, leads, test_results, messages, progress_logs).",
    code: `import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);`
  }
];
