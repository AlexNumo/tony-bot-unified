import { Bot } from 'grammy';
import dotenv from 'dotenv';

dotenv.config();

export const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID ? Number(process.env.ADMIN_TELEGRAM_ID) : 7780694746;
export const SECONDARY_ADMIN_ID = process.env.SECONDARY_ADMIN_ID ? Number(process.env.SECONDARY_ADMIN_ID) : 216147493;
export const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || '8923506126:AAE4CrClTzepTR4T2WfmjlYUB2Yba_d_3Tg';

/**
 * Sends a notification directly via the main bot to the primary admin.
 */
export async function notifyAdminAboutMessage(
  mainBot: Bot<any>,
  userId: number | string,
  username: string | undefined,
  text: string,
  reason = 'new_message'
): Promise<void> {
  try {
    const userDisplay = username ? `@${username} (${userId})` : `ID: ${userId}`;
    let title = '💬 Нове повідомлення від користувача';
    if (reason === 'human_request') {
      title = '🚨 Користувач просить живої розмови з Антоніною!';
    } else if (reason === 'order') {
      title = '💳 Нове замовлення тарифу!';
    }

    const adminMsg = 
      `<b>${title}</b>\n\n` +
      `👤 <b>Користувач:</b> ${userDisplay}\n` +
      `📝 <b>Текст:</b>\n<i>${text}</i>\n\n` +
      `🔗 <a href="tg://user?id=${userId}">Відкрити профіль користувача</a>`;

    await mainBot.api.sendMessage(ADMIN_TELEGRAM_ID, adminMsg, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Failed to notify primary admin via main bot:', err);
  }
}

/**
 * Sends notification via the dedicated Admin Bot to all admin IDs [7780694746, 216147493].
 */
export async function sendAdminBotNotification(
  userId: number | string,
  username: string | undefined,
  text: string,
  reason = 'escalation'
): Promise<void> {
  if (!ADMIN_BOT_TOKEN) return;

  const adminIds = [ADMIN_TELEGRAM_ID, SECONDARY_ADMIN_ID].filter(Boolean);
  const userDisplay = username ? `@${username} (${userId})` : `ID: ${userId}`;

  let alertHeader = '🔔 Сповіщення від Точки переходу';
  if (reason === 'human_request') alertHeader = '🚨 ВИКЛИК АНТОНІНИ / ПОТРІБНА ЛЮДИНА';
  if (reason === 'payment') alertHeader = '💰 УСПІШНА ОПЛАТА НА САЙТІ / WAYFORPAY';

  const message = 
    `<b>${alertHeader}</b>\n\n` +
    `👤 <b>Користувач:</b> ${userDisplay}\n` +
    `📝 <b>Деталі:</b>\n${text}\n\n` +
    `🕒 <i>${new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</i>`;

  for (const adminId of adminIds) {
    try {
      const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: message,
          parse_mode: 'HTML'
        })
      });
    } catch (err) {
      console.error(`Failed to send admin notification to ${adminId}:`, err);
    }
  }
}
