import { Context } from 'grammy';
import { addUser, getUserData, updateUserStatus, saveMessage } from '../../services/supabase';
import { getMainMenuKeyboard, getContactKeyboard } from '../keyboards';
import { sendPurchaseMaterialsToUser } from '../materials';
import { sendDayMaterial } from './day';

export async function handleStartCommand(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const userId = ctx.from.id;
  const username = ctx.from.username || '';
  const firstName = ctx.from.first_name || '';
  const lastName = ctx.from.last_name || '';

  // 1. Deep linking extraction
  const messageText = ctx.message?.text || '';
  const parts = messageText.split(' ');
  const payload = parts.length > 1 ? parts[1].trim() : '';

  let utmSource: string | undefined;
  let utmMedium: string | undefined;

  if (payload.startsWith('utm_')) {
    const utmParts = payload.split('_');
    utmSource = utmParts[1];
    utmMedium = utmParts[2];
  }

  // 2. Extract profile avatar if possible
  let avatarUrl: string | undefined;
  try {
    const photos = await ctx.api.getUserProfilePhotos(userId, { limit: 1 });
    if (photos.total_count > 0 && photos.photos[0].length > 0) {
      const fileId = photos.photos[0][0].file_id;
      const file = await ctx.api.getFile(fileId);
      if (file.file_path && process.env.TELEGRAM_BOT_TOKEN) {
        avatarUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch avatar for user ${userId}:`, err);
  }

  // 3. Register or update user in Supabase
  await addUser(userId, username, firstName, lastName, utmSource, utmMedium, avatarUrl);
  await saveMessage(userId, 'user', messageText);

  // 4. Handle direct payment deep link: e.g. /start pay_base
  if (payload.startsWith('pay_')) {
    const pkg = payload.replace('pay_', '');
    console.log(`💳 Deep link payment detected for user ${userId}: package ${pkg}`);
    await updateUserStatus(userId, pkg);

    const congrats = `🎉 <b>Вітаємо! Ваш доступ до практикуму успішно активовано!</b>\n\nТариф: <b>${pkg.toUpperCase()}</b>. Завантажуємо ваші зошити та бонуси...`;
    await ctx.reply(congrats, { parse_mode: 'HTML' });
    await saveMessage(userId, 'bot', congrats);

    // Send workbooks & gifts
    sendPurchaseMaterialsToUser(ctx.api as any, userId).catch(console.error);
    return;
  }

  // 5. Require phone number
  const userData = await getUserData(userId);
  if (!userData?.phone) {
    const contactMsg = "📱 Будь ласка, натисніть кнопку нижче, щоб поділитися номером телефону.\nЦе обов'язково для доступу до матеріалів.";
    await ctx.reply(contactMsg, { reply_markup: getContactKeyboard() });
    await saveMessage(userId, 'bot', contactMsg);
    return;
  }

  // 6. Check if user has an active paid subscription
  const status = userData?.status || 'free';
  const isPaid = ['base', 'support', 'vip'].includes(status);

  if (isPaid) {
    const currentDay = userData?.current_day || 1;
    const paidWelcome = 
      `🌟 <b>Вітаємо з поверненням, ${firstName || username}!</b>\n\n` +
      `Ваш тариф: <b>${status.toUpperCase()}</b>. Ви маєте повний доступ до всіх 8 днів практикуму.\n\n` +
      `Нижче надіслано матеріали вашого поточного заняття (День ${currentDay}):`;

    await ctx.reply(paidWelcome, {
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(true)
    });
    await saveMessage(userId, 'bot', paidWelcome);

    // Send current day's lesson
    await sendDayMaterial(ctx.api as any, userId, currentDay);
    return;
  }

  // 6. Welcome message for free / new users
  const welcomePhotoId = 'AgACAgIAAxkBAANVak6WSTsVQrt6lmZknTrIJI_kC4IAAjYZaxuTmnhKRtt4EyzTttIBAAMCAAN5AAM8BA';
  const welcomeText = 
    `Дорогі учасниці, вітаю вас!\n\n` +
    `Попереду 8 днів, які можуть стати точкою переходу до більшої ясності, свободи й нових можливостей.\n\n` +
    `Я хочу, щоб цей простір став місцем, де можна чесно подивитися на себе, не поспішати, не оцінювати себе й пройти цей шлях у власному темпі.\n\n` +
    `Кілька рекомендацій, щоб отримати максимальний результат:\n` +
    `• проходьте практикум щодня;\n` +
    `• дотримуйтеся послідовності: спочатку урок, потім аудіопрактика;\n` +
    `• ведіть зошит практикуму — записуйте думки, відповіді на запитання, свої відкриття та зміни. Вони допомагають побачити те, що раніше залишалося непоміченим.\n\n` +
    `Не намагайтеся зробити все ідеально. Просто будьте чесними із собою.\n\n` +
    `Пам’ятайте: найважливіші зміни починаються не тоді, коли ми більше стараємося, а тоді, коли починаємо по-справжньому бачити себе 🌿\n\n` +
    `Бажаю вам глибоких усвідомлень, внутрішньої легкості та приємних відкриттів ✨\n\n` +
    `Ласкаво просимо до практикуму <b>«7+1. Точка переходу»</b>. Починаємо!`;

  try {
    await ctx.replyWithPhoto(welcomePhotoId, {
      caption: welcomeText,
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(false),
      protect_content: true
    });
    await saveMessage(userId, 'bot', '[Надіслано вітальне фото]');
    await saveMessage(userId, 'bot', welcomeText);
  } catch {
    // Fallback if photo file_id fails
    await ctx.reply(welcomeText, {
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(false),
      protect_content: true
    });
    await saveMessage(userId, 'bot', welcomeText);
  }
}
