import express, { Request, Response } from 'express';
import { webhookCallback } from 'grammy';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createBot } from './src/bot/bot';
import { 
  addUser, 
  getUserData, 
  getAllUsers, 
  updateUserStatus, 
  updateUserDay, 
  getAllLeads, 
  saveLead, 
  getAllTestResults, 
  saveTestResult, 
  saveMessage, 
  getUserMessages, 
  logUserAction, 
  logCourseProgress, 
  checkSupabaseConnection,
  setSupabaseConfig 
} from './src/services/supabase';
import { sendPurchaseMaterialsToUser } from './src/bot/materials';
import { runNewsletterBroadcast, startBackgroundScheduler, getSchedulerConfig } from './src/services/scheduler';
import { sendAdminBotNotification } from './src/services/adminNotifier';
import { lessonsData } from './src/data/lessonsData';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'src/data');

// Parse JSON bodies
app.use(express.json());

// Initialize Telegram bot
const bot = createBot();

// --- 1. TELEGRAM WEBHOOK OR POLLING ---
const WEBHOOK_URL = process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '';
const USE_POLLING = process.env.USE_POLLING === 'true' || !WEBHOOK_URL;

if (!USE_POLLING && WEBHOOK_URL) {
  const webhookPath = '/api/telegram-webhook';
  console.log(`🌐 Mounting Telegram webhook at ${webhookPath}`);
  app.use(webhookPath, webhookCallback(bot, 'express'));

  const fullWebhookUrl = `${WEBHOOK_URL.replace(/\/$/, '')}${webhookPath}`;
  bot.api.setWebhook(fullWebhookUrl)
    .then(() => console.log(`✅ Webhook set successfully to ${fullWebhookUrl}`))
    .catch((err) => console.error('❌ Failed to set Telegram webhook:', err));
} else {
  console.log('🔄 Long Polling mode enabled for local development.');
  bot.api.deleteWebhook().catch(() => {});
  bot.start({
    onStart: (botInfo) => console.log(`🤖 Bot @${botInfo.username} started via Long Polling!`)
  }).catch((err) => console.error('Error starting bot polling:', err));
}

// Helper for reading JSON data
function readDataFile<T>(filename: string, fallback: T): T {
  try {
    const p = path.join(DATA_DIR, filename);
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
  }
  return fallback;
}

function writeDataFile<T>(filename: string, data: T): void {
  try {
    const p = path.join(DATA_DIR, filename);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

// --- 2. REST API ENDPOINTS ---

// Check Supabase connection
app.get('/api/supabase-status', async (_req: Request, res: Response) => {
  const isConnected = await checkSupabaseConnection();
  res.json({ connected: isConnected });
});

// Users
app.get('/api/users', async (_req: Request, res: Response) => {
  const users = await getAllUsers();
  res.json({ success: true, data: users });
});

app.post('/api/users', async (req: Request, res: Response) => {
  const { telegramId, username, name } = req.body;
  const user = await addUser(telegramId, username, name);
  res.json({ success: true, data: user });
});

app.put('/api/users/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const success = await updateUserStatus(id, status);

  if (success && ['base', 'support', 'vip'].includes(status)) {
    console.log(`🚀 Status upgraded to ${status} for user ${id}. Sending purchase materials...`);
    sendPurchaseMaterialsToUser(bot, id).catch(console.error);
  }

  res.json({ success });
});

app.post('/api/users/:id/send-lesson', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { dayNum } = req.body;
  try {
    const result = await runNewsletterBroadcast(bot, { 
      trigger: 'manual', 
      targetUserId: id, 
      dayNum: Number(dayNum) 
    });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/current-day', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { currentDay } = req.body;
  const success = await updateUserDay(id, Number(currentDay));
  res.json({ success });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  // Local deletion support
  const localUsers = readDataFile<any[]>('users.json', []);
  const filtered = localUsers.filter(u => u.telegramId !== req.params.id && u.id !== req.params.id);
  writeDataFile('users.json', filtered);
  res.json({ success: true });
});

// Leads
app.get('/api/leads', async (_req: Request, res: Response) => {
  const leads = await getAllLeads();
  res.json({ success: true, data: leads });
});

app.post('/api/leads', async (req: Request, res: Response) => {
  const { telegramId, packageName, status } = req.body;
  const lead = await saveLead(telegramId, packageName, status || 'pending');
  res.json({ success: true, data: lead });
});

// Test Results
app.get('/api/test-results', async (_req: Request, res: Response) => {
  const results = await getAllTestResults();
  res.json({ success: true, data: results });
});

app.post('/api/test-results', async (req: Request, res: Response) => {
  const { telegramId, score } = req.body;
  const result = await saveTestResult(telegramId, Number(score));
  res.json({ success: true, data: result });
});

// Logs
app.post('/api/logs/action', async (req: Request, res: Response) => {
  const { telegramId, actionType, targetElement, metadata } = req.body;
  await logUserAction(telegramId, actionType, targetElement, metadata);
  res.json({ success: true });
});

app.post('/api/logs/progress', async (req: Request, res: Response) => {
  const { telegramId, dayNum, deliveryType, status, errorMessage } = req.body;
  await logCourseProgress(telegramId, dayNum, deliveryType, status, errorMessage);
  res.json({ success: true });
});

// Messages
app.get('/api/messages/:id', async (req: Request, res: Response) => {
  const messages = await getUserMessages(req.params.id);
  res.json({ success: true, data: messages });
});

app.post('/api/messages/save', async (req: Request, res: Response) => {
  const { telegramId, sender, text } = req.body;
  await saveMessage(telegramId, sender, text);
  res.json({ success: true });
});

// Admin sending message to user via Telegram
app.post('/api/messages', async (req: Request, res: Response) => {
  const { telegramId, text } = req.body;
  try {
    await bot.api.sendMessage(Number(telegramId), text, { parse_mode: 'HTML' });
    await saveMessage(telegramId, 'admin', text);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`Failed to send admin message to ${telegramId}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Lessons
app.get('/api/lessons', (_req: Request, res: Response) => {
  const lessons = readDataFile('lessons.json', lessonsData);
  res.json({ success: true, data: lessons });
});

app.put('/api/lessons', (req: Request, res: Response) => {
  const { lessons } = req.body;
  if (Array.isArray(lessons)) {
    writeDataFile('lessons.json', lessons);
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, error: 'Invalid lessons data format' });
});

// Broadcast
app.get('/api/broadcast/config', async (_req: Request, res: Response) => {
  const config = await getSchedulerConfig();
  res.json({ success: true, data: config });
});

app.post('/api/broadcast/config', async (req: Request, res: Response) => {
  await setSupabaseConfig(req.body);
  res.json({ success: true });
});

app.get('/api/broadcast/logs', (_req: Request, res: Response) => {
  const logs = readDataFile('broadcast_logs.json', []);
  res.json({ success: true, data: logs });
});

app.post('/api/broadcast/trigger', async (req: Request, res: Response) => {
  const { targetUserId, dayNum } = req.body;
  const result = await runNewsletterBroadcast(bot, {
    trigger: 'manual',
    targetUserId,
    dayNum: dayNum ? Number(dayNum) : undefined
  });
  res.json(result);
});

// --- 3. WAYFORPAY WEBHOOK ---
app.post('/api/payment/wayforpay-webhook', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    console.log('💳 Received WayForPay webhook callback:', JSON.stringify(data));

    const {
      orderReference,
      transactionStatus,
      clientPhone,
      clientEmail,
      clientName,
      amount,
      currency
    } = data;

    const time = Math.floor(Date.now() / 1000);
    const secretKey = process.env.WAYFORPAY_MERCHANT_SECRET_KEY || '';

    // Signature response according to WayForPay protocol
    let signature = '';
    if (secretKey) {
      const signString = `${orderReference};accept;${time}`;
      signature = crypto.createHmac('md5', secretKey).update(signString).digest('hex');
    }

    if (transactionStatus === 'Approved') {
      console.log(`✅ Payment Approved for order ${orderReference} (${amount} ${currency})`);

      // Determine package from orderReference or amount
      let packageType = 'base';
      const refLower = (orderReference || '').toLowerCase();
      if (refLower.includes('support') || amount == 125) {
        packageType = 'support';
      } else if (refLower.includes('vip') || amount == 400) {
        packageType = 'vip';
      }

      // Find user by phone
      let matchedUser: any = null;
      if (clientPhone) {
        const cleanPhone = clientPhone.replace(/\D/g, '');
        const last10 = cleanPhone.slice(-10);
        const allUsers = await getAllUsers();
        matchedUser = allUsers.find(u => (u.phone || '').replace(/\D/g, '').endsWith(last10));

        if (matchedUser) {
          console.log(`🎯 Matched user ${matchedUser.telegramId} (@${matchedUser.username}) by phone ${clientPhone}`);
          await updateUserStatus(matchedUser.telegramId, packageType);
          await saveLead(matchedUser.telegramId, packageType, 'paid');
          await logUserAction(matchedUser.telegramId, 'payment_success', 'wayforpay', { amount, currency, orderReference });

          // Send purchase materials to user in Telegram
          sendPurchaseMaterialsToUser(bot, matchedUser.telegramId).catch(console.error);

          await sendAdminBotNotification(
            matchedUser.telegramId,
            matchedUser.username,
            `Оплачено тариф ${packageType.toUpperCase()} (${amount} ${currency}) через WayForPay. Телефон: ${clientPhone}`,
            'payment'
          );
        } else {
          // Create guest record so user gets access once they connect
          console.log(`ℹ️ User not found in bot for phone ${clientPhone}. Creating guest record...`);
          const guestId = `guest_${last10}`;
          await addUser(guestId, clientName || 'Guest', '', '', 'wayforpay');
          await updateUserStatus(guestId, packageType);
          await saveLead(guestId, packageType, 'paid');

          await sendAdminBotNotification(
            guestId,
            clientName,
            `Оплата на сайті без запуску бота! Телефон: ${clientPhone}, Тариф: ${packageType.toUpperCase()} (${amount} ${currency})`,
            'payment'
          );
        }
      }
    }

    // Always respond accept to WayForPay
    res.json({
      orderReference,
      status: 'accept',
      time,
      signature
    });
  } catch (err: any) {
    console.error('WayForPay webhook handler error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- 4. STATIC FILE SERVING FOR REACT ADMIN UI ---
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- 5. START SERVER & BACKGROUND SCHEDULER ---
app.listen(PORT, () => {
  console.log(`🚀 TonyBot Unified Server running on port ${PORT}`);
  startBackgroundScheduler(bot);
});
