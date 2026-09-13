import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_SHEET_WEBHOOK_URL = process.env.GOOGLE_SHEET_WEBHOOK_URL || '';

export async function logToGoogleSheet(sheetName: string, data: Record<string, any>): Promise<void> {
  if (!GOOGLE_SHEET_WEBHOOK_URL) return;

  try {
    const payload = {
      sheet: sheetName,
      timestamp: new Date().toISOString(),
      ...data
    };

    const res = await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.warn(`Google Sheet webhook returned status: ${res.status}`);
    }
  } catch (err) {
    console.error('Failed to log to Google Sheets:', err);
  }
}
