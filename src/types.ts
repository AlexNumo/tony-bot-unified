export type UserStatus = 'free' | 'base' | 'support' | 'vip';

export interface User {
  id: string;
  telegramId: string;
  username: string;
  name: string;
  phone?: string;
  status: UserStatus;
  currentDay: number;
  completedDays: number[];
  registrationDate: string;
  lastActivity: string;
  notes?: string;
  avatar?: string;
  utmSource?: string;
  utmMedium?: string;
  isBlocked?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system' | 'admin';
  text: string;
  timestamp: string;
  buttons?: { 
    text: string; 
    action: string; 
    url?: string;
    isWebApp?: boolean;
  }[];
  mediaType?: 'photo' | 'video' | 'audio' | 'pdf' | 'success';
  mediaUrl?: string;
  photoFileId?: string;
  videoFileId?: string;
  mediaTitle?: string;
  mediaSubtitle?: string;
  protectContent?: boolean;
}

export interface Lesson {
  day: number;
  title: string;
  description: string;
  practiceTitle: string;
  videoDuration: string;
  videoFileId?: string;
  audioFileName?: string;
  audioFileId?: string;
  pdfFiles: string[];
  pdfFileId?: string;
  photoFileId?: string;
  welcomePhotoFileId?: string;
  fullDescription?: string;
}

export interface Lead {
  id: string;
  telegramId: string;
  username?: string;
  packageName: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
}

export interface TestResult {
  id: string;
  telegramId: string;
  username?: string;
  score: number;
  createdAt: string;
}

export interface BroadcastLog {
  timestamp: string;
  trigger: 'auto' | 'manual';
  target: 'all' | 'paid' | 'free';
  sentCount: number;
  details: string[];
}

export interface SchedulerConfig {
  broadcastHour: number;
  broadcastMinute: number;
  targetAudience: 'all' | 'paid' | 'free';
  lastBroadcastDate: string;
}

export interface Package {
  id: string;
  name: string;
  tag: string;
  price: string;
  old_price: string;
  desc_text: string;
  features: string[];
  available_places?: number | null;
}
