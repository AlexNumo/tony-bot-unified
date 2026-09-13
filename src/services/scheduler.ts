import { Bot } from 'grammy';
import fs from 'fs';
import path from 'path';
import { getUsersByStatus, updateUserDay, logCourseProgress } from './supabase';
import { sendDayMaterial } from '../bot/handlers/day';
import { BroadcastLog, SchedulerConfig } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'src/data');

function getSchedulerConfig(): SchedulerConfig {
  try {
    const filePath = path.join(DATA_DIR, 'scheduler_config.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading scheduler config:', err);
  }
  return {
    broadcastHour: 9,
    broadcastMinute: 0,
    targetAudience: 'paid',
    lastBroadcastDate: ''
  };
}

function appendBroadcastLog(log: BroadcastLog): void {
  try {
    const filePath = path.join(DATA_DIR, 'broadcast_logs.json');
    let logs: BroadcastLog[] = [];
    if (fs.existsSync(filePath)) {
      logs = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    logs.unshift(log);
    fs.writeFileSync(filePath, JSON.stringify(logs.slice(0, 100), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error appending broadcast log:', err);
  }
}

export async function runNewsletterBroadcast(
  bot: Bot<any>,
  options: { trigger?: 'auto' | 'manual'; targetUserId?: string | number; dayNum?: number } = {}
): Promise<{ success: boolean; sentCount: number; details: string[] }> {
  const trigger = options.trigger || 'manual';
  const details: string[] = [];
  let sentCount = 0;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  details.push(`[${timeStr}] ⏳ Початок розсилки занять (тригер: ${trigger === 'auto' ? 'Автоматично' : 'Вручну'})...`);

  try {
    let targets: any[] = [];
    if (options.targetUserId) {
      const uId = String(options.targetUserId);
      targets = [{ user_id: uId, current_day: options.dayNum || 1 }];
    } else {
      const paidStatuses = ['base', 'support', 'vip'];
      targets = await getUsersByStatus(paidStatuses);
      details.push(`[${timeStr}] 👥 Знайдено користувачів для розсилки: ${targets.length}`);
    }

    for (const student of targets) {
      const userId = Number(student.user_id);
      const currentDay = options.dayNum || student.current_day || 1;

      if (currentDay > 8) {
        details.push(`[${timeStr}] 🎓 Користувач ${student.username || userId} вже завершив практикум (День 8)`);
        continue;
      }

      try {
        await sendDayMaterial(bot, userId, currentDay);
        await updateUserDay(userId, currentDay + 1);
        await logCourseProgress(userId, currentDay, trigger, 'sent');
        sentCount++;
        details.push(`[${timeStr}] ✅ [День ${currentDay}] успішно надіслано користувачу ${student.username || userId}. Встановлено день: ${currentDay + 1}`);

        // Sleep 50ms to respect Telegram flood rate limit
        await new Promise(resolve => setTimeout(resolve, 60));
      } catch (err: any) {
        console.error(`Failed to send lesson day ${currentDay} to ${userId}:`, err);
        await logCourseProgress(userId, currentDay, trigger, 'failed', err?.message);
        details.push(`[${timeStr}] ⚠️ Помилка надсилання користувачу ${student.username || userId}: ${err?.message}`);
      }
    }

    details.push(`[${timeStr}] 🚀 Розсилку завершено! Всього успішно відправлено: ${sentCount} користувачам.`);
    appendBroadcastLog({
      timestamp: now.toISOString(),
      trigger,
      target: 'paid',
      sentCount,
      details
    });

    return { success: true, sentCount, details };
  } catch (err: any) {
    details.push(`❌ Критична помилка розсилки: ${err.message}`);
    return { success: false, sentCount, details };
  }
}

/**
 * Starts the 15-second background scheduler that checks whether today's broadcast should run.
 */
export function startBackgroundScheduler(bot: Bot<any>): void {
  console.log('⏱️ Background broadcast scheduler initialized (checks every 15s)');

  setInterval(async () => {
    try {
      const config = getSchedulerConfig();
      const now = new Date();
      // Kyiv timezone: UTC+2 or UTC+3 depending on DST
      const kyivDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Kyiv' }));
      const todayStr = kyivDate.toISOString().split('T')[0];
      const hour = kyivDate.getHours();
      const minute = kyivDate.getMinutes();

      if (config.lastBroadcastDate === todayStr) {
        return;
      }

      if (hour === config.broadcastHour && minute === config.broadcastMinute) {
        console.log(`⏰ Scheduled broadcast time reached (${hour}:${minute} Kyiv). Triggering daily broadcast...`);
        config.lastBroadcastDate = todayStr;
        fs.writeFileSync(path.join(DATA_DIR, 'scheduler_config.json'), JSON.stringify(config, null, 2), 'utf-8');

        await runNewsletterBroadcast(bot, { trigger: 'auto' });
      }
    } catch (err) {
      console.error('Error in scheduler interval:', err);
    }
  }, 15000);
}
