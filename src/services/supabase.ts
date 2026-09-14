import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { User, Lead, TestResult, Package, SchedulerConfig } from '../types';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_KEY || '';
const USE_LOCAL_DB = process.env.USE_LOCAL_DB === 'true' || !SUPABASE_URL || !SUPABASE_KEY;

export let supabase: SupabaseClient | null = null;

if (!USE_LOCAL_DB) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase client successfully initialized');
  } catch (err) {
    console.error('⚠️ Failed to initialize Supabase client. Falling back to local storage:', err);
    supabase = null;
  }
} else {
  console.log('ℹ️ Running in Local DB mode (JSON storage fallback).');
}

// Helper to ensure data directory and files exist
const DATA_DIR = path.resolve(process.cwd(), 'src/data');
function readJsonFile<T>(filename: string, defaultValue: T): T {
  try {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  try {
    const filePath = path.join(DATA_DIR, filename);
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
}

export async function checkSupabaseConnection(): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('users').select('user_id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

// --- USERS ---

export async function addUser(
  userId: number | string,
  username?: string,
  firstName?: string,
  lastName?: string,
  utmSource?: string,
  utmMedium?: string,
  avatarUrl?: string
): Promise<any> {
  const uId = String(userId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', uId)
        .maybeSingle();

      if (!existing) {
        const insertPayload: any = {
          user_id: uId,
          username: username || `user_${uId}`,
          first_name: firstName || null,
          last_name: lastName || null,
          status: 'free',
          current_day: 1,
          join_date: now,
          last_active: now,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          avatar_url: avatarUrl || null
        };
        const { data, error } = await supabase.from('users').insert(insertPayload).select().single();
        if (error) console.error('Error inserting user to Supabase:', error);
        return data || insertPayload;
      } else {
        const updatePayload: any = { last_active: now };
        if (username) updatePayload.username = username;
        if (firstName) updatePayload.first_name = firstName;
        if (lastName) updatePayload.last_name = lastName;
        if (avatarUrl) updatePayload.avatar_url = avatarUrl;
        if (utmSource && !existing.utm_source) updatePayload.utm_source = utmSource;
        if (utmMedium && !existing.utm_medium) updatePayload.utm_medium = utmMedium;

        const { data } = await supabase.from('users').update(updatePayload).eq('user_id', uId).select().single();
        return data || existing;
      }
    } catch (err) {
      console.error('Supabase addUser exception:', err);
    }
  }

  // Local fallback
  const localUsers = readJsonFile<User[]>('users.json', []);
  let found = localUsers.find(u => u.telegramId === uId || u.id === uId);
  if (!found) {
    found = {
      id: uId,
      telegramId: uId,
      username: username || `user_${uId}`,
      name: `${firstName || ''} ${lastName || ''}`.trim() || username || `User ${uId}`,
      status: 'free',
      currentDay: 1,
      completedDays: [],
      registrationDate: now,
      lastActivity: now,
      utmSource,
      utmMedium,
      avatar: avatarUrl
    };
    localUsers.push(found);
  } else {
    found.lastActivity = now;
    if (avatarUrl) found.avatar = avatarUrl;
  }
  writeJsonFile('users.json', localUsers);
  return found;
}

export async function getUserData(userId: number | string): Promise<any | null> {
  const uId = String(userId);
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('user_id', uId).maybeSingle();
      if (!error && data) return data;
    } catch (err) {
      console.error('Supabase getUserData error:', err);
    }
  }

  const localUsers = readJsonFile<User[]>('users.json', []);
  const found = localUsers.find(u => u.telegramId === uId || u.id === uId);
  return found ? {
    user_id: found.telegramId,
    username: found.username,
    status: found.status,
    current_day: found.currentDay,
    phone: found.phone,
    join_date: found.registrationDate,
    last_active: found.lastActivity
  } : null;
}

export async function updateUserStatus(userId: number | string, status: string): Promise<boolean> {
  const uId = String(userId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status, last_active: now })
        .eq('user_id', uId);
      if (!error) return true;
      console.error('Supabase updateUserStatus error:', error);
    } catch (err) {
      console.error('Exception in updateUserStatus:', err);
    }
  }

  const localUsers = readJsonFile<User[]>('users.json', []);
  const idx = localUsers.findIndex(u => u.telegramId === uId || u.id === uId);
  if (idx !== -1) {
    localUsers[idx].status = status as any;
    localUsers[idx].lastActivity = now;
    writeJsonFile('users.json', localUsers);
    return true;
  }
  return false;
}

export async function updateUserDay(userId: number | string, day: number): Promise<boolean> {
  const uId = String(userId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ current_day: day, last_active: now })
        .eq('user_id', uId);
      if (!error) return true;
    } catch (err) {
      console.error('Exception in updateUserDay:', err);
    }
  }

  const localUsers = readJsonFile<User[]>('users.json', []);
  const idx = localUsers.findIndex(u => u.telegramId === uId || u.id === uId);
  if (idx !== -1) {
    localUsers[idx].currentDay = day;
    localUsers[idx].lastActivity = now;
    writeJsonFile('users.json', localUsers);
    return true;
  }
  return false;
}

export async function updateUserPhone(userId: number | string, phone: string): Promise<boolean> {
  const uId = String(userId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone, last_active: now })
        .eq('user_id', uId);
      if (!error) return true;
    } catch (err) {
      console.error('Exception in updateUserPhone:', err);
    }
  }

  const localUsers = readJsonFile<User[]>('users.json', []);
  const idx = localUsers.findIndex(u => u.telegramId === uId || u.id === uId);
  if (idx !== -1) {
    localUsers[idx].phone = phone;
    localUsers[idx].lastActivity = now;
    writeJsonFile('users.json', localUsers);
    return true;
  }
  return false;
}

export async function getAllUsers(): Promise<User[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').order('join_date', { ascending: false });
      if (!error && data) {
        return data.map((u: any) => ({
          id: String(u.user_id),
          telegramId: String(u.user_id),
          username: u.username || '',
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || `User ${u.user_id}`,
          phone: u.phone || undefined,
          status: u.status || 'free',
          currentDay: u.current_day || 1,
          completedDays: [],
          registrationDate: u.join_date || '',
          lastActivity: u.last_active || '',
          avatar: u.avatar_url || undefined,
          utmSource: u.utm_source || undefined,
          utmMedium: u.utm_medium || undefined,
          isBlocked: u.is_blocked || false
        }));
      }
    } catch (err) {
      console.error('Error fetching all users from Supabase:', err);
    }
  }
  return readJsonFile<User[]>('users.json', []);
}

export async function getUsersByStatus(statusList: string[]): Promise<any[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('status', statusList)
        .order('current_day', { ascending: true });
      if (!error && data) return data;
    } catch (err) {
      console.error('Supabase getUsersByStatus error:', err);
    }
  }

  const localUsers = readJsonFile<User[]>('users.json', []);
  return localUsers.filter(u => statusList.includes(u.status));
}

// --- LEADS ---

export async function saveLead(userId: number | string, packageName: string, status: string = 'pending'): Promise<any> {
  const uId = String(userId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('leads').insert({
        user_id: uId,
        package_name: packageName,
        status,
        created_at: now
      }).select().single();
      if (!error) return data;
    } catch (err) {
      console.error('Supabase saveLead error:', err);
    }
  }

  const leads = readJsonFile<Lead[]>('leads.json', []);
  const newLead: Lead = {
    id: `lead-${Date.now()}`,
    telegramId: uId,
    packageName,
    status: status as any,
    createdAt: now
  };
  leads.unshift(newLead);
  writeJsonFile('leads.json', leads);
  return newLead;
}

export async function getAllLeads(): Promise<Lead[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*, users(username, first_name, last_name)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((l: any) => ({
          id: String(l.id),
          telegramId: String(l.user_id),
          username: l.users?.username || undefined,
          packageName: l.package_name,
          status: l.status,
          createdAt: l.created_at
        }));
      }
    } catch (err) {
      console.error('Supabase getAllLeads error:', err);
    }
  }
  return readJsonFile<Lead[]>('leads.json', []);
}

// --- TEST RESULTS ---

export async function saveTestResult(userId: number | string, score: number): Promise<any> {
  const uId = String(userId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('test_results').insert({
        user_id: uId,
        score,
        created_at: now
      }).select().single();
      if (!error) return data;
    } catch (err) {
      console.error('Supabase saveTestResult error:', err);
    }
  }

  const results = readJsonFile<TestResult[]>('test_results.json', []);
  const newRes: TestResult = {
    id: `tr-${Date.now()}`,
    telegramId: uId,
    score,
    createdAt: now
  };
  results.unshift(newRes);
  writeJsonFile('test_results.json', results);
  return newRes;
}

export async function getAllTestResults(): Promise<TestResult[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*, users(username)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((r: any) => ({
          id: String(r.id),
          telegramId: String(r.user_id),
          username: r.users?.username || undefined,
          score: r.score,
          createdAt: r.created_at
        }));
      }
    } catch (err) {
      console.error('Supabase getAllTestResults error:', err);
    }
  }
  return readJsonFile<TestResult[]>('test_results.json', []);
}

// --- MESSAGES ---

export async function saveMessage(telegramId: number | string, sender: 'user' | 'bot' | 'admin' | 'system', text: string): Promise<void> {
  const uId = String(telegramId);
  const now = new Date().toISOString();

  if (supabase) {
    try {
      await supabase.from('messages').insert({
        user_id: uId,
        direction: sender,
        text,
        created_at: now
      });
    } catch (err) {
      console.error('Supabase saveMessage error:', err);
    }
  }

  // Store in user_messages.json for Simulator compatibility
  const userMessages = readJsonFile<{ [key: string]: any[] }>('user_messages.json', {});
  if (!userMessages[uId]) userMessages[uId] = [];
  userMessages[uId].push({
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    sender,
    text,
    timestamp: now
  });
  writeJsonFile('user_messages.json', userMessages);
}

export async function getUserMessages(telegramId: number | string, limit = 50): Promise<any[]> {
  const uId = String(telegramId);
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', uId)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (!error && data && data.length > 0) {
        return data.map(m => ({
          id: String(m.id),
          sender: m.direction,
          text: m.text,
          timestamp: m.created_at
        }));
      }
    } catch (err) {
      console.error('Supabase getUserMessages error:', err);
    }
  }

  const userMessages = readJsonFile<{ [key: string]: any[] }>('user_messages.json', {});
  return userMessages[uId] || [];
}

// --- ACTIONS & PROGRESS LOGS ---

export async function logUserAction(userId: number | string, actionType: string, targetElement?: string, metadata?: any): Promise<void> {
  const uId = String(userId);
  if (supabase) {
    try {
      await supabase.from('user_actions').insert({
        user_id: uId,
        action_type: actionType,
        target_element: targetElement || null,
        metadata: metadata || null,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Supabase logUserAction error:', err);
    }
  }
}

export async function logCourseProgress(
  userId: number | string,
  dayNum: number,
  deliveryType: 'auto' | 'manual' = 'auto',
  status: 'sent' | 'failed' = 'sent',
  errorMessage?: string
): Promise<void> {
  const uId = String(userId);
  if (supabase) {
    try {
      await supabase.from('course_progress_logs').insert({
        user_id: uId,
        day_num: dayNum,
        delivery_type: deliveryType,
        status,
        error_message: errorMessage || null,
        sent_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Supabase logCourseProgress error:', err);
    }
  }
}

// --- GUEST PAYMENT LINKING ---
/**
 * Matches a user's phone with guest payments created when someone pays on website before launching bot.
 */
export async function checkAndLinkGuestPayment(userId: number | string, phone: string): Promise<string | null> {
  if (!phone) return null;
  const cleanedPhone = phone.replace(/\D/g, '');
  if (cleanedPhone.length < 9) return null;

  const last10 = cleanedPhone.slice(-10);
  console.log(`🔍 Checking guest payments for phone ending with ${last10} (User ID: ${userId})`);

  if (supabase) {
    try {
      // Find any guest user whose user_id is the guest phone or phone ends with last10
      const { data: guestUsers } = await supabase
        .from('users')
        .select('*')
        .or(`user_id.ilike.%${last10}%,phone.ilike.%${last10}%`)
        .neq('user_id', String(userId));

      if (guestUsers && guestUsers.length > 0) {
        // Find if any had a paid status
        const paidGuest = guestUsers.find(g => ['base', 'support', 'vip'].includes(g.status));
        if (paidGuest) {
          console.log(`🎉 Found paid guest record (${paidGuest.user_id}) with status ${paidGuest.status}! Transferring to ${userId}...`);
          await updateUserStatus(userId, paidGuest.status);
          await updateUserPhone(userId, phone);
          // Clean up the temporary guest record
          await supabase.from('users').delete().eq('user_id', paidGuest.user_id);
          return paidGuest.status;
        }
      }
    } catch (err) {
      console.error('Error linking guest payment:', err);
    }
  }

  return null;
}

// --- PACKAGES ---

export async function getAllPackages(): Promise<Package[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('packages').select('*').order('id');
      if (!error && data && data.length > 0) {
        return data.map(p => ({
          id: p.id,
          name: p.name,
          tag: p.tag,
          price: p.price,
          old_price: p.old_price,
          desc_text: p.desc_text,
          features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]'),
          available_places: p.available_places
        }));
      }
    } catch (err) {
      console.error('Supabase getAllPackages error:', err);
    }
  }

  return [
    {
      id: 'base',
      name: 'Самостійно',
      tag: 'Базовий',
      price: '20€',
      old_price: '100€',
      desc_text: 'Повне самостійне проходження практикуму у своєму темпі',
      features: ['8 відео-уроків', '8 аудіопрактик', 'Робочий зошит', 'Доступ назавжди', '3 бонуси'],
      available_places: null
    },
    {
      id: 'support',
      name: 'Зі спікером',
      tag: 'Супровід',
      price: '125€',
      old_price: '200€',
      desc_text: 'Живий контакт і підтримка від Антоніни',
      features: ['Все з базового', 'Telegram-група з учасницями', 'Голосові відповіді від Антоніни', '1 Zoom-сесія', '3 бонуси'],
      available_places: 5
    },
    {
      id: 'vip',
      name: 'Індивідуально',
      tag: 'VIP Супровід',
      price: '400€',
      old_price: '600€',
      desc_text: 'Максимальна трансформація тет-а-тет',
      features: ['Все з Супроводу', '4 особисті сесії Zoom', 'Чат 24/7 зі спікером', 'Індивідуальна карта практик', '3 бонуси'],
      available_places: 2
    }
  ];
}

export async function cleanupOldMessages(daysOld = 7): Promise<void> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysOld);
  const thresholdIso = thresholdDate.toISOString();
  if (supabase) {
    try {
      const { error, count } = await supabase.from('messages').delete({ count: 'exact' }).lt('created_at', thresholdIso).neq('user_id', 0);
      if (error) console.error('Supabase cleanup error:', error);
      else console.log('Cleaned up old messages from Supabase.');
    } catch (err) {
      console.error('Supabase cleanup error:', err);
    }
  }
}

export async function getSupabaseConfig(): Promise<SchedulerConfig | null> {
  if (!supabase) return null;
  try {
    // 1. Try dedicated bot_settings table
    const { data: settingData, error: settingError } = await supabase
      .from('bot_settings')
      .select('value')
      .eq('key', 'scheduler_config')
      .maybeSingle();

    if (!settingError && settingData?.value) {
      const val = typeof settingData.value === 'string' ? JSON.parse(settingData.value) : settingData.value;
      if (val && val.broadcastHour !== undefined) return val;
    }

    // 2. Fallback to messages table (system message)
    const { data: msgData, error: msgError } = await supabase
      .from('messages')
      .select('text')
      .eq('direction', 'system')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!msgError && msgData?.text) {
      try {
        const parsed = JSON.parse(msgData.text);
        if (parsed && parsed.broadcastHour !== undefined) return parsed;
      } catch {}
    }
  } catch (err) {
    console.error('getSupabaseConfig error:', err);
  }
  return null;
}

export async function setSupabaseConfig(config: SchedulerConfig): Promise<void> {
  // Always update local file first
  try {
    const filePath = path.join(DATA_DIR, 'scheduler_config.json');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {}

  if (!supabase) return;

  try {
    // 1. Try saving to bot_settings table
    const { error: settingError } = await supabase
      .from('bot_settings')
      .upsert({
        key: 'scheduler_config',
        value: config,
        updated_at: new Date().toISOString()
      });

    if (!settingError) {
      console.log('✅ Scheduler config successfully saved to Supabase bot_settings');
      return;
    }

    // 2. If bot_settings table does not exist, fallback to messages with an existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .order('user_id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingUser?.user_id) {
      const { error: msgError } = await supabase.from('messages').insert({
        user_id: existingUser.user_id,
        direction: 'system',
        text: JSON.stringify(config),
        created_at: new Date().toISOString()
      });
      if (!msgError) {
        console.log('✅ Scheduler config saved to Supabase messages');
        return;
      }
    }
  } catch (err) {
    console.error('Failed to save config to Supabase:', err);
  }
}

export async function hasUserReceivedLessonToday(userId: number | string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('course_progress_logs').select('id').eq('user_id', String(userId)).eq('status', 'sent').gte('created_at', todayStr + 'T00:00:00Z');
    return data && data.length > 0;
  } catch (err) {
    return false;
  }
}
