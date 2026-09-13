import { Context } from 'grammy';
import { updateUserPhone, checkAndLinkGuestPayment, saveMessage } from '../../services/supabase';
import { sendPurchaseMaterialsToUser } from '../materials';
import { sendDayMaterial } from './day';

export async function handleContactMessage(ctx: Context): Promise<void> {
  const contact = ctx.message?.contact;
  if (!contact || !ctx.from) return;

  const userId = ctx.from.id;
  const phoneNumber = contact.phone_number;

  console.log(`📱 Received contact from user ${userId}: ${phoneNumber}`);
  await updateUserPhone(userId, phoneNumber);
  await saveMessage(userId, 'user', `[Поділився контактом: ${phoneNumber}]`);

  // Check if user has an existing guest payment on the website
  const paidStatus = await checkAndLinkGuestPayment(userId, phoneNumber);

  if (paidStatus) {
    const successMsg = 
      `🎉 <b>Вашу оплату на сайті успішно знайдено та підтверджено!</b>\n\n` +
      `Тариф: <b>${paidStatus.toUpperCase()}</b>.\n` +
      `Преміум-доступ до курсу відкрито назавжди. Надсилаємо матеріали... ✨`;
    await ctx.reply(successMsg, { parse_mode: 'HTML' });
    await saveMessage(userId, 'bot', successMsg);

    // Send workbooks & first day lesson
    sendPurchaseMaterialsToUser(ctx.api as any, userId).catch(console.error);
    await sendDayMaterial(ctx.api as any, userId, 1);
  } else {
    const ackMsg = `✅ Дякуємо! Ваш номер телефону <b>${phoneNumber}</b> успішно збережено в системі.`;
    await ctx.reply(ackMsg, { parse_mode: 'HTML' });
    await saveMessage(userId, 'bot', ackMsg);
  }
}
