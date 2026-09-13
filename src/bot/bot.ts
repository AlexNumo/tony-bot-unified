import { Bot, Context } from 'grammy';
import dotenv from 'dotenv';
import { handleStartCommand } from './handlers/start';
import { handleCallbacks } from './handlers/callbacks';
import { handleTestCallbacks } from './handlers/test';
import { handleDayCommand } from './handlers/day';
import { handleContactMessage } from './handlers/contact';
import { handleAdminMediaUpload } from './handlers/upload';
import { handleAiTextMessage } from './handlers/aiText';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || '';

if (!BOT_TOKEN) {
  console.warn('⚠️ Warning: TELEGRAM_BOT_TOKEN is not set in environment!');
}

export function createBot(): Bot<Context> {
  const bot = new Bot<Context>(BOT_TOKEN);

  // Global error handler
  bot.catch((err) => {
    console.error(`❌ Bot error encountered in update ${err.ctx?.update?.update_id}:`, err.error);
  });

  // 1. /start command
  bot.command('start', handleStartCommand);

  // 2. /help command
  bot.command('help', async (ctx) => {
    const helpMsg = 
      `🤖 <b>Помічник бота «Точка переходу»:</b>\n\n` +
      `• /start — перезапустити бота та відкрити головне меню\n` +
      `• /day1 ... /day8 — отримати матеріали відповідного дня (доступно тільки для оплачених користувачів)\n` +
      `• /help — довідка по командах бота\n\n` +
      `Для індивідуальних питань звертайтеся до автора: @tonypashko`;
    await ctx.reply(helpMsg, { parse_mode: 'HTML' });
  });

  // 3. /day1 ... /day8 commands
  bot.hears(/^\/day\d+$/i, handleDayCommand);

  // 4. Admin media upload handler (#upload caption)
  bot.on('message', async (ctx, next) => {
    if (ctx.message?.caption?.startsWith('#upload')) {
      await handleAdminMediaUpload(ctx);
      return;
    }
    await next();
  });

  // 5. Contact sharing
  bot.on(':contact', handleContactMessage);

  // 6. Callback queries (Test vs Menus)
  bot.on('callback_query:data', async (ctx) => {
    const handledByTest = await handleTestCallbacks(ctx);
    if (!handledByTest) {
      await handleCallbacks(ctx);
    }
  });

  // 7. Regular text messages (handled by empathetic AI with daily limits)
  bot.on('message:text', async (ctx) => {
    // Ignore commands (starts with '/')
    if (ctx.message.text.startsWith('/')) return;
    await handleAiTextMessage(ctx);
  });

  return bot;
}
