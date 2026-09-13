import { Context } from 'grammy';
import fs from 'fs';
import path from 'path';
import { ADMIN_TELEGRAM_ID } from '../../services/adminNotifier';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');

/**
 * Admin #upload command handler.
 * Format: #upload [day_X] [type] or #upload [welcome] [photo]
 * Types: photo, video, audio, document
 */
export async function handleAdminMediaUpload(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const caption = ctx.message?.caption || '';

  if (userId !== ADMIN_TELEGRAM_ID || !caption.startsWith('#upload')) return;

  const match = caption.match(/#upload\s+\[(day_\d+|welcome)\]\s+\[(\w+)\]/i);
  if (!match) {
    await ctx.reply('❌ Некоректний формат підпису. Має бути:\n`#upload [day_X] [type]` або `#upload [welcome] [photo]`', { parse_mode: 'Markdown' });
    return;
  }

  const dayKey = match[1].toLowerCase();
  const mediaType = match[2].toLowerCase();

  let fileId: string | undefined;
  if (mediaType === 'photo' && ctx.message?.photo) {
    fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  } else if (mediaType === 'video' && ctx.message?.video) {
    fileId = ctx.message.video.file_id;
  } else if (mediaType === 'audio' && ctx.message?.audio) {
    fileId = ctx.message.audio.file_id;
  } else if (mediaType === 'document' && ctx.message?.document) {
    fileId = ctx.message.document.file_id;
  } else {
    await ctx.reply(`❌ Медіафайл не відповідає вказаному типу [${mediaType}]`);
    return;
  }

  try {
    const lessonsPath = path.join(DATA_DIR, 'lessons.json');
    if (!fs.existsSync(lessonsPath)) {
      await ctx.reply('❌ Файл lessons.json не знайдено.');
      return;
    }

    const lessons = JSON.parse(fs.readFileSync(lessonsPath, 'utf-8'));

    if (dayKey === 'welcome') {
      for (const l of lessons) {
        l.welcomePhotoFileId = fileId;
      }
    } else {
      const dayNum = parseInt(dayKey.replace('day_', ''));
      const target = lessons.find((l: any) => l.day === dayNum);
      if (!target) {
        await ctx.reply(`❌ День ${dayNum} не знайдено в lessons.json.`);
        return;
      }

      if (mediaType === 'photo') target.photoFileId = fileId;
      if (mediaType === 'video') target.videoFileId = fileId;
      if (mediaType === 'audio') target.audioFileId = fileId;
      if (mediaType === 'document') {
        target.pdfFileId = fileId;
        if (ctx.message?.document?.file_name) {
          target.pdfFiles = [ctx.message.document.file_name];
        }
      }
    }

    fs.writeFileSync(lessonsPath, JSON.stringify(lessons, null, 2), 'utf-8');
    await ctx.reply(`✅ Успішно зареєстровано ${mediaType} для ${dayKey}!\nFile ID: <code>${fileId}</code>`, { parse_mode: 'HTML' });
  } catch (err: any) {
    console.error('Error in #upload handler:', err);
    await ctx.reply(`❌ Помилка збереження: ${err.message}`);
  }
}
