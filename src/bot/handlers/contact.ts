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
      `🎉 <b>Ваша оплата на сайті успішно знайдена в базі даних!</b>\n\n` +
      `Пакет: <b>${paidStatus.toUpperCase()}</b>.\n` +
      `Надсилаємо вам ваші матеріали та 1-й день... 👇`;
    await ctx.reply(successMsg, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
    await saveMessage(userId, 'bot', successMsg);

    // Send workbooks & first day lesson
    sendPurchaseMaterialsToUser(ctx.api as any, userId).catch(console.error);
    await sendDayMaterial(ctx.api as any, userId, 1);
    
    // Show main menu
    const { handleStartCommand } = require('./start');
    await handleStartCommand(ctx);
  } else {
    const ackMsg = `✅ Дякуємо! Ваш номер телефону <b>${phoneNumber}</b> збережено.`;
    await ctx.reply(ackMsg, { parse_mode: 'HTML', reply_markup: { remove_keyboard: true } });
    await saveMessage(userId, 'bot', ackMsg);
    
    // Trigger the start flow so they see the main menu
    const { handleStartCommand } = require('./start');
    await handleStartCommand(ctx);
  }
}
