import { Bot, InputFile } from 'grammy';
import fs from 'fs';
import path from 'path';
import { saveMessage } from '../services/supabase';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Sends both Workbooks (PDFs) and 3 gifts with 15-second delays between files.
 * Supports passing Bot, Api, or Context.
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

  // Helper to send a local file or log if absent
  async function sendFileSafe(filePath: string, type: 'document' | 'audio', caption: string, logLabel: string) {
    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const file = new InputFile(resolvedPath);
        if (type === 'document') {
          await api.sendDocument(uId, file, { caption, protect_content: true });
        } else if (type === 'audio') {
          await api.sendAudio(uId, file, { caption, protect_content: true });
        }
        await saveMessage(uId, 'bot', logLabel);
      } catch (err) {
        console.error(`Failed to send file ${filePath}:`, err);
      }
    } else {
      console.log(`ℹ️ File ${filePath} not found locally, simulating message log: ${logLabel}`);
      await saveMessage(uId, 'bot', logLabel);
    }
  }

  // 1. Workbook 1
  await sendFileSafe(
    'Material/Робочий_зошит_Точка_переходу.pdf',
    'document',
    '📚 Робочий зошит «Точка переходу» (Варіант 1)\n\nТвій особистий простір для роздумів, відкриттів та чесної розмови із собою.',
    '[Надіслано Робочий зошит PDF (Варіант 1)]'
  );
  await sleep(15000);

  // 2. Workbook 2
  await sendFileSafe(
    'Material/Робочий_зошит_Точка_переходу_2.pdf',
    'document',
    '📚 Робочий зошит «Точка переходу» (Варіант 2)\n\nАльтернативний формат зошиту для зручного використання.',
    '[Надіслано Робочий зошит PDF (Варіант 2)]'
  );
  await sleep(15000);

  // 3. Bonus 1
  await sendFileSafe(
    'Material/Gift/7_ОЗНАК_ЩО_ЗАСЛУГОВУЄШ_СВОЮ_ЦІННІСТЬ.pptx',
    'document',
    "🎁 Бонус 1: Презентація '7 ознак, що заслуговуєш свою цінність'",
    '[Надіслано бонус: 7_ОЗНАК_ЩО_ЗАСЛУГОВУЄШ_СВОЮ_ЦІННІСТЬ.pptx]'
  );
  await sleep(15000);

  // 4. Bonus 2
  await sendFileSafe(
    'Material/Gift/СИЛА без НАПРУГИ.pptx',
    'document',
    "🎁 Бонус 2: Презентація 'Сила без напруги'",
    '[Надіслано бонус: СИЛА без НАПРУГИ.pptx]'
  );
  await sleep(15000);

  // 5. Bonus 3
  await sendFileSafe(
    'Material/Gift/ПРАКТИКА - Медитація подарунок.m4a',
    'audio',
    "🎁 Бонус 3: Аудіопрактика-медитація 'Повернення до себе'",
    '[Надіслано бонус: ПРАКТИКА - Медитація подарунок.m4a]'
  );
}
