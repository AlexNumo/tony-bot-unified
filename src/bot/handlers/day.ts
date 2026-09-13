import { Bot, Context, InputFile } from 'grammy';
import fs from 'fs';
import path from 'path';
import { getUserData, saveMessage } from '../../services/supabase';
import { lessonsData } from '../../data/lessonsData';
import { getPackagesKeyboard } from '../keyboards';
import { getAllPackages } from '../../services/supabase';

export async function handleDayCommand(ctx: Context): Promise<void> {
  if (!ctx.from || !ctx.message?.text) return;

  const userId = ctx.from.id;
  const cmd = ctx.message.text.trim().toLowerCase();
  const dayMatch = cmd.match(/^\/day(\d+)$/);

  if (!dayMatch) return;
  const dayNum = parseInt(dayMatch[1]);

  if (dayNum < 1 || dayNum > 8) {
    await ctx.reply('❌ Невірний день. Доступні дні: від /day1 до /day8.');
    return;
  }

  // Check paid status
  const userData = await getUserData(userId);
  const isPaid = ['base', 'support', 'vip'].includes(userData?.status);

  if (!isPaid) {
    const blockedMsg = 
      `🔒 <b>Матеріал [День ${dayNum}] заблоковано.</b>\n\n` +
      `Для отримання повного доступу до 8 днів практикуму, включаючи відео-уроки, аудіо-практики та робочі зошити, придбайте один із пакетів участі.`;
    await ctx.reply(blockedMsg, {
      parse_mode: 'HTML',
      reply_markup: getPackagesKeyboard(await getAllPackages())
    });
    return;
  }

  await sendDayMaterial(ctx.api as any, userId, dayNum);
}

export async function sendDayMaterial(bot: Bot<any>, userId: number | string, dayNum: number): Promise<void> {
  const uId = Number(userId);
  const lesson = lessonsData.find(l => l.day === dayNum);
  if (!lesson) return;

  const pdfStr = lesson.pdfFiles && lesson.pdfFiles.length > 0 
    ? lesson.pdfFiles.map(f => `• ${f}`).join('\n') 
    : '—';

  const formattedText = 
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🌸 <b>ДЕНЬ ${lesson.day} • ПРАКТИКУМ «ТОЧКА ПЕРЕХОДУ»</b> 🌸\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `✨ <b>Тема дня:</b>\n«${lesson.title}»\n\n` +
    `📝 <b>Про що цей день:</b>\n${lesson.description}\n\n` +
    `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n` +
    `ℹ️ <b>МАТЕРІАЛИ ЗАНЯТТЯ:</b>\n` +
    `🎥 <b>Відео-урок:</b> ${lesson.videoDuration || '15-20 хв'}\n` +
    `🧘‍♀️ <b>Практика:</b> ${lesson.practiceTitle || 'Аудіо-медитація'}\n\n` +
    `📖 <b>Детальний зміст:</b>\n${lesson.fullDescription || ''}\n\n` +
    `📂 <b>Завдання в робочому зошиті:</b>\n${pdfStr}\n\n` +
    `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n` +
    `🙏 Проходьте практику у зручному темпі!\n` +
    `Наступний урок буде надіслано автоматично.`;

  // 1. Send Text
  await bot.api.sendMessage(uId, formattedText, { parse_mode: 'HTML', protect_content: true });
  await saveMessage(uId, 'bot', formattedText);

  // 2. Send Video (by file_id)
  if (lesson.videoFileId) {
    try {
      await bot.api.sendVideo(uId, lesson.videoFileId, {
        caption: `🎬 Відео-урок День ${dayNum}: ${lesson.title}`,
        protect_content: true
      });
      await saveMessage(uId, 'bot', `[Надіслано відео Дня ${dayNum}]`);
    } catch (err) {
      console.error(`Failed to send video for day ${dayNum}:`, err);
    }
  }

  // 3. Send Audio (by file_id or local file)
  if (lesson.audioFileId) {
    try {
      await bot.api.sendAudio(uId, lesson.audioFileId, {
        caption: `🎵 День ${dayNum}. Аудіо-практика: ${lesson.practiceTitle}`,
        protect_content: true
      });
      await saveMessage(uId, 'bot', `[Надіслано аудіо Дня ${dayNum}]`);
    } catch (err) {
      console.error(`Failed to send audio for day ${dayNum}:`, err);
    }
  } else if (lesson.audioFileName) {
    const audioPath = path.resolve(process.cwd(), `Material/Day_${dayNum}/${lesson.audioFileName}`);
    if (fs.existsSync(audioPath)) {
      try {
        await bot.api.sendAudio(uId, new InputFile(audioPath), {
          caption: `🎵 День ${dayNum}. Аудіо-практика: ${lesson.practiceTitle}`,
          protect_content: true
        });
      } catch (err) {
        console.error(`Failed to send local audio:`, err);
      }
    }
  }

  // 4. Send PDF Workbook (by file_id or local file)
  if (lesson.pdfFileId) {
    try {
      await bot.api.sendDocument(uId, lesson.pdfFileId, {
        caption: `📄 Робочий зошит до Дня ${dayNum}`,
        protect_content: true
      });
      await saveMessage(uId, 'bot', `[Надіслано PDF Дня ${dayNum}]`);
    } catch (err) {
      console.error(`Failed to send PDF for day ${dayNum}:`, err);
    }
  }
}
