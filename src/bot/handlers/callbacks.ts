import { Context } from 'grammy';
import { 
  getMainMenuKeyboard, 
  getBackToMenuKeyboard, 
  getProgramMenuKeyboard, 
  getProgramDayKeyboard, 
  getPackagesKeyboard, 
  getOrderConfirmationKeyboard, 
  getContactsKeyboard,
  getTestIntroKeyboard
} from '../keyboards';
import { getUserData, getAllPackages, saveLead, saveMessage } from '../../services/supabase';
import { lessonsData } from '../../data/lessonsData';
import { sendDayMaterial } from './day';
import { sendPurchaseMaterialsToUser } from '../materials';
import { notifyAdminAboutMessage, sendAdminBotNotification } from '../../services/adminNotifier';

export async function handleCallbacks(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.from) return;

  const userId = ctx.from.id;
  const username = ctx.from.username;
  await ctx.answerCallbackQuery();

  const editOrReply = async (text: string, keyboard: any) => {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    await saveMessage(userId, 'bot', text);
  };

  // 1. Main Menu
  if (data === 'main_menu') {
    const userData = await getUserData(userId);
    const isPaid = ['base', 'support', 'vip'].includes(userData?.status);
    const text = 
      `Головне меню онлайн-практикуму <b>«Точка переходу»</b>.\n\n` +
      `Обери розділ для ознайомлення з програмою, тестуванням чи тарифами.`;
    await editOrReply(text, getMainMenuKeyboard(isPaid));
  }

  // 2. About Course
  else if (data === 'about_course') {
    const text = 
      `🌟 <b>7+1 - денний онлайн-практикум «Точка переходу»</b>\n\n` +
      `Це не криза. Це точка твого переходу до нового рівня життя.\n\n` +
      `<b>Для кого цей практикум?</b>\n` +
      `Для жінок, які зовні справляються та мають успіх, але всередині відчувають глибоку втому, потребу зупинитися і почати жити для себе, а не для відповідності чужим очікуванням.\n\n` +
      `🔄 <b>Що зміниться (Трансформація):</b>\n` +
      `1. <i>Ілюзія контролю:</i> Щось закінчилося, але ще незрозуміло що саме.\n` +
      `   ➡️ <b>Нова опора:</b> Зі мною все гаразд — я на порозі масштабного нового.\n\n` +
      `2. <i>Ілюзія контролю:</i> Звичний відпочинок більше не повертає сили.\n` +
      `   ➡️ <b>Нова опора:</b> Я чітко бачу, куди насправді витікає моя енергія.\n\n` +
      `3. <i>Ілюзія контролю:</i> Стало занадто складно зрозуміти, чого хочеться насправді.\n` +
      `   ➡️ <b>Нова опора:</b> Я знову чую свій внутрішній голос та справжні бажання.\n\n` +
      `⏱ <b>Формат:</b> 15-30 хвилин на день, проходження у власному темпі, доступ назавжди!`;
    await editOrReply(text, getBackToMenuKeyboard());
  }

  // 3. Test Intro
  else if (data === 'start_test') {
    const text = 
      `📝 <b>Діагностичний тест: 7 ознак заниженої самооцінки та втрати ресурсу</b>\n\n` +
      `Цей тест допоможе тобі чесно поглянути на свій внутрішній стан та зрозуміти, чи перебуваєш ти зараз у точці переходу.\n\n` +
      `Тест складається з 7 коротких питань. Тобі потрібно відповідати щиро.\n\n` +
      `Готова почати?`;
    await editOrReply(text, getTestIntroKeyboard());
  }

  // 4. Program Menu
  else if (data === 'program_menu') {
    const text = 
      `📅 <b>Програма: 7+1 днів, які повертають контакт із собою</b>\n\n` +
      `Кожен день містить відео, аудіо-практику та запитання в робочому зошиті. Обери день для детального ознайомлення:`;
    await editOrReply(text, getProgramMenuKeyboard());
  }

  // 5. Individual Day preview
  else if (data.startsWith('prog_day_')) {
    const dayNum = parseInt(data.replace('prog_day_', ''));
    const lesson = lessonsData.find(l => l.day === dayNum);
    if (lesson) {
      const text = 
        `📅 <b>День ${dayNum}. ${lesson.title}</b>\n\n` +
        `🔍 <b>Короткий опис:</b>\n${lesson.description}\n\n` +
        `🔍 <b>Практика:</b>\n${lesson.practiceTitle || 'Аудіо-медитація'}\n\n` +
        `🎬 Відео ${lesson.videoDuration || '15-20 хв'}\n` +
        `🎧 Аудіо-практика\n` +
        `📝 Робочий зошит PDF`;
      await editOrReply(text, getProgramDayKeyboard(dayNum));
    }
  }

  // 6. Request Day Lesson Send
  else if (data.startsWith('send_lesson_')) {
    const dayNum = parseInt(data.replace('send_lesson_', ''));
    await sendDayMaterial(ctx.api as any, userId, dayNum);
  }

  // 7. About Author
  else if (data === 'about_author') {
    const text = 
      `👤 <b>Антоніна Пашко — Авторка практикуму</b>\n\n` +
      `Провідник у внутрішніх транзитах без надриву та напруги. Допомагає жінкам почути себе за межами ролей, очікувань та постійного 'треба'.\n\n` +
      `🏆 <b>Регалії та цифри:</b>\n` +
      `• <b>17+ років</b> практичного досвіду коучем, психологом та енергопрактиком.\n` +
      `• <b>1350+ жінок</b>, які пройшли свій шлях трансформації та змін.\n` +
      `• <b>70+ авторських проєктів</b>, присвячених розвитку особистості.\n` +
      `• Доктор філософії у сфері психології Кембриджської академії.\n` +
      `• Гранд-доктор філософії в галузі інформаційних технологій (психологія).\n` +
      `• Професорка психології та спікерка європейського рівня.\n\n` +
      `💬 <i>«Мені важливо, щоб реальний внутрішній зсув ви відчули вже з першої практики.»</i>`;
    await editOrReply(text, getBackToMenuKeyboard());
  }

  // 8. Contacts
  else if (data === 'contacts') {
    const text = 
      `❓ <b>Виникли запитання?</b>\n\n` +
      `Якщо у вас залишилися питання щодо тарифів, програми чи процесу оплати, ви можете:\n\n` +
      `📱 Написати Антоніні в Instagram: @tonypashko\n` +
      `💬 Зв'язатися безпосередньо у Telegram: @tonypashko\n\n` +
      `Або просто напишіть повідомлення в цей чат — я передам його особисто Антоніні!`;
    await editOrReply(text, getContactsKeyboard());
  }

  // 9. Packages Menu
  else if (data === 'packages_menu') {
    const packages = await getAllPackages();
    const text = 
      `💳 <b>Обери безпечний та комфортний формат участі:</b>\n\n` +
      `🟢 <b>1. Самостійно (Базовий)</b>\n` +
      `• Повне самостійне проходження у своєму темпі\n` +
      `• 8 відео-уроків, 8 аудіопрактик, робочий зошит\n` +
      `• Доступ назавжди + 3 подарунки\n` +
      `🔥 <b>Ціна: 20€</b> (замість <s>100€</s>)\n\n` +
      `🔵 <b>2. Зі спікером (Супровід)</b>\n` +
      `• Все з базового пакета + живий контакт\n` +
      `• Telegram-група з учасницями та голосові відповіді від Антоніни\n` +
      `• <b>1 особиста сесія в Zoom</b> після курсу\n` +
      `🔥 <b>Ціна: 125€</b> (замість <s>200€</s>) (Залишилося місць: 5)\n\n` +
      `🟣 <b>3. VIP Супровід (Індивідуально)</b>\n` +
      `• Все з пакета Супровід\n` +
      `• <b>4 особисті сесії в Zoom</b> та особистий супровід 24/7\n` +
      `🔥 <b>Ціна: 400€</b> (замість <s>600€</s>) (Залишилося місць: 2)\n\n` +
      `💡 <i>Старт одразу після оплати. Доступ залишається назавжди!</i>`;
    await editOrReply(text, getPackagesKeyboard(packages));
  }

  // 10. Package Orders
  else if (data.startsWith('order_')) {
    const pkgId = data.replace('order_', '');
    const pkgNames: Record<string, string> = {
      base: 'Самостійно (Базовий) — 20€',
      support: 'Зі спікером (Супровід) — 125€',
      vip: 'Індивідуально (VIP) — 400€'
    };
    const title = pkgNames[pkgId] || pkgId;

    await saveLead(userId, pkgId, 'pending');
    await notifyAdminAboutMessage(ctx.api as any, userId, username, `Користувач обрав тариф: ${title}`, 'order');
    await sendAdminBotNotification(userId, username, `Користувач перейшов до оплати тарифу: ${title}`, 'order');

    const text = 
      `🎉 <b>Заявку на участь прийнято!</b>\n\n` +
      `Ви обрали пакет: <b>${title}</b>.\n\n` +
      `Натисніть кнопку нижче, щоб перейти до безпечної оплати через платіжний сервіс <b>WayForPay</b>.\n\n` +
      `Після здійснення оплати доступ до практикуму буде відкрито автоматично.`;
    await editOrReply(text, getOrderConfirmationKeyboard(pkgId));
  }

  // 11. My Workbooks (re-send for paid users)
  else if (data === 'my_workbooks') {
    const userData = await getUserData(userId);
    if (['base', 'support', 'vip'].includes(userData?.status)) {
      await ctx.reply('⏳ Надсилаємо ваші робочі зошити та бонуси...');
      sendPurchaseMaterialsToUser(ctx.api as any, userId).catch(console.error);
    } else {
      await ctx.reply('🔒 Робочі зошити доступні після активації одного з тарифів практикуму.', {
        reply_markup: getPackagesKeyboard(await getAllPackages())
      });
    }
  }
}
