import { saveMessage } from '../services/supabase';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Persistent Telegram file_ids for Workbooks and Bonus Gifts
// Content protection is intentionally NOT enabled for workbooks/gifts so users can download and print them.
export const BONUS_MATERIALS_FILE_IDS = {
  WORKBOOK_1: 'BQACAgIAAxkDAAIB6mqnAcL5jxEwi5v3aU-Mwztb_6gmAALpqAACXlU5Sb2hZKv6HhZyPQQ',
  WORKBOOK_2: 'BQACAgIAAxkDAAIB62qnAdQeIkPUR51U66o_x7teevS5AALqqAACXlU5SW8gSUk-AAE0QD0E',
  GIFT_1: 'BQACAgIAAxkDAAIB7GqnAd2Wqf_qb8LvF53CVKi3xtsLAALtqAACXlU5SbhHFPTBcQWIPQQ',
  GIFT_2: 'BQACAgIAAxkDAAIB7WqnAel6ac8mN949dDLJvYKv1o-0AALvqAACXlU5SV7idxMq0MM1PQQ',
  GIFT_3: 'CQACAgIAAxkDAAIB7mqnAfDmh8Tvo6w1ynIpT8o7p8DdAALwqAACXlU5Sd5hj_g7zRcPPQQ'
};

/**
 * Sends both Workbooks (PDFs) and 3 gifts with 15-second delays between files.
 * Supports passing Bot, Api, or Context.
 * Note: Sent without protect_content so users can save, open in apps, and print.
 */
export async function sendPurchaseMaterialsToUser(botOrApi: any, userId: number | string): Promise<void> {
  const uId = Number(userId);
  const api = botOrApi?.api || botOrApi;

  const congratsText = 
    `<b>🎉 Вітаємо у практикумі «Точка переходу»!</b>\n\n` +
    `Ваша оплата успішно отримана та доступ до програми активовано.\n\n` +
    `Нижче ми надсилаємо вам обіцяні матеріали: <b>два варіанти Робочого зошита</b> практикуму ` +
    `(оберіть той, який вам зручніше заповнювати), а також <b>3 спеціальні бонуси</b>, ` +
    `які допоможуть вам підготуватися та пройти цей шлях максимально комфортно і глибоко. ✨\n\n` +
    `<i>⏳ Для вашої зручності файли надходитимуть послідовно з інтервалом у 15 секунд.</i>`;

  try {
    await api.sendMessage(uId, congratsText, { parse_mode: 'HTML' });
    await saveMessage(uId, 'bot', congratsText);
  } catch (err) {
    console.error(`Error sending congrats to ${uId}:`, err);
  }

  await sleep(3000);

  // 1. Workbook 1
  try {
    await api.sendDocument(uId, BONUS_MATERIALS_FILE_IDS.WORKBOOK_1, {
      caption: '📚 Робочий зошит «Точка переходу» (Варіант 1)\n\nТвій особистий простір для роздумів, відкриттів та чесної розмови із собою.'
    });
    await saveMessage(uId, 'bot', '[Надіслано Робочий зошит PDF (Варіант 1)]');
  } catch (err) {
    console.error(`Failed to send Workbook 1 to ${uId}:`, err);
  }

  await sleep(15000);

  // 2. Workbook 2
  try {
    await api.sendDocument(uId, BONUS_MATERIALS_FILE_IDS.WORKBOOK_2, {
      caption: '📚 Робочий зошит «Точка переходу» (Варіант 2)\n\nАльтернативний формат зошиту для зручного використання.'
    });
    await saveMessage(uId, 'bot', '[Надіслано Робочий зошит PDF (Варіант 2)]');
  } catch (err) {
    console.error(`Failed to send Workbook 2 to ${uId}:`, err);
  }

  await sleep(15000);

  // 3. Gifts
  const gifts = [
    {
      fileId: BONUS_MATERIALS_FILE_IDS.GIFT_1,
      type: 'document' as const,
      caption: "🎁 Бонус 1: Презентація '7 ознак, що заслуговуєш свою цінність'",
      log: '[Надіслано бонус: 7_ОЗНАК_ЩО_ЗАСЛУГОВУЄШ_СВОЮ_ЦІННІСТЬ.pptx]'
    },
    {
      fileId: BONUS_MATERIALS_FILE_IDS.GIFT_2,
      type: 'document' as const,
      caption: "🎁 Бонус 2: Презентація 'Сила без напруги'",
      log: '[Надіслано бонус: СИЛА без НАПРУГИ.pptx]'
    },
    {
      fileId: BONUS_MATERIALS_FILE_IDS.GIFT_3,
      type: 'audio' as const,
      caption: "🎁 Бонус 3: Аудіопрактика-медитація 'Повернення до себе'",
      log: '[Надіслано бонус: ПРАКТИКА - Медитація подарунок.m4a]'
    }
  ];

  for (let idx = 0; idx < gifts.length; idx++) {
    const gift = gifts[idx];
    try {
      if (gift.type === 'document') {
        await api.sendDocument(uId, gift.fileId, { caption: gift.caption });
      } else if (gift.type === 'audio') {
        await api.sendAudio(uId, gift.fileId, { caption: gift.caption });
      }
      await saveMessage(uId, 'bot', gift.log);
    } catch (err) {
      console.error(`Failed to send gift ${idx + 1} to ${uId}:`, err);
    }

    if (idx < gifts.length - 1) {
      await sleep(15000);
    }
  }
}
