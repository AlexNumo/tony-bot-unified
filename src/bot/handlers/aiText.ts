import { Context } from 'grammy';
import { saveMessage, getUserMessages } from '../../services/supabase';
import { generateAiResponse } from '../../services/ai';
import { notifyAdminAboutMessage, sendAdminBotNotification } from '../../services/adminNotifier';

const ESCALATION_KEYWORDS = [
  'людин', 'антонін', 'тоня', 'жива', 'менеджер', 'підтримк', 
  'оператор', 'поговорити', 'дзвінок', "зв'язатися", "зв'язок", 
  'перетелефонуйте', 'питання до автора'
];

// Daily tracker: userId -> { date: string, count: number }
const userAiDailyTracker = new Map<number, { date: string; count: number }>();

export async function handleAiTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || !ctx.from) return;

  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name || `user_${userId}`;
  const todayStr = new Date().toISOString().split('T')[0];

  await saveMessage(userId, 'user', text);

  // Check daily limit (15 msgs/day)
  let tracker = userAiDailyTracker.get(userId);
  if (!tracker || tracker.date !== todayStr) {
    tracker = { date: todayStr, count: 0 };
    userAiDailyTracker.set(userId, tracker);
  }

  if (tracker.count >= 15) {
    const limitReply = 
      `Вибачте, ви досягли денного ліміту повідомлень для ШІ-помічника (15/день).\n\n` +
      `Якщо у вас залишилися важливі запитання, напишіть Антоніні особисто в Instagram: @tonypashko.`;
    await ctx.reply(limitReply);
    await saveMessage(userId, 'bot', limitReply);
    return;
  }

  tracker.count++;

  // Check for human escalation keywords
  const lowerText = text.toLowerCase();
  const requiresHuman = ESCALATION_KEYWORDS.some(kw => lowerText.includes(kw));

  if (requiresHuman) {
    console.log(`🚨 Human escalation triggered by keyword for user ${userId}`);
    await notifyAdminAboutMessage(ctx.api as any, userId, username, text, 'human_request');
    await sendAdminBotNotification(userId, username, text, 'human_request');

    const escalationReply = 
      `Дякую за повідомлення! Я обов'язково відповім вам особисто найближчим часом. Зберігайте спокій, зробіть глибокий вдих. Я поруч. 🙏\n\n` +
      `<i>*(я вже покликала Антоніну, вона відповість особисто найближчим часом)*</i>`;

    await ctx.reply(escalationReply, { parse_mode: 'HTML' });
    await saveMessage(userId, 'bot', escalationReply);
    return;
  }

  // Generate AI response
  try {
    const history = await getUserMessages(userId, 6);
    let aiReply = await generateAiResponse(username, text, history);

    if (aiReply.includes('[CALL_HUMAN]')) {
      console.log(`🚨 AI response requested human escalation for user ${userId}`);
      aiReply = aiReply.replace('[CALL_HUMAN]', '').trim();
      aiReply += `\n\n<i>*(я вже покликала Антоніну, вона відповість особисто найближчим часом)*</i>`;

      await notifyAdminAboutMessage(ctx.api as any, userId, username, text, 'human_request');
      await sendAdminBotNotification(userId, username, text, 'human_request');
    }

    await ctx.reply(aiReply, { parse_mode: 'HTML' });
    await saveMessage(userId, 'bot', aiReply);
  } catch (err) {
    console.error(`Failed to handle AI text message for ${userId}:`, err);
    const fallbackReply = `Дякую за твоє повідомлення! Я обов'язково відповім тобі особисто найближчим часом. Зберігай спокій, зроби глибокий вдих. Я поруч. 🙏`;
    await ctx.reply(fallbackReply);
    await saveMessage(userId, 'bot', fallbackReply);
  }
}
