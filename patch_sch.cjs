const fs = require('fs');
let c = fs.readFileSync('src/services/scheduler.ts', 'utf8');

c = c.replace(
  "import { getUsersByStatus, updateUserDay, logCourseProgress } from './supabase';",
  "import { getUsersByStatus, updateUserDay, logCourseProgress, cleanupOldMessages, getSupabaseConfig, setSupabaseConfig, hasUserReceivedLessonToday } from './supabase';"
);

c = c.replace(
  "function getSchedulerConfig(): SchedulerConfig {",
  "export async function getSchedulerConfig(): Promise<SchedulerConfig> {\n  const dbConfig = await getSupabaseConfig();\n  if(dbConfig) return dbConfig;\n"
);

c = c.replace(
  "      const config = getSchedulerConfig();",
  "      const config = await getSchedulerConfig();"
);

c = c.replace(
  "        fs.writeFileSync(path.join(DATA_DIR, 'scheduler_config.json'), JSON.stringify(config, null, 2), 'utf-8');\n\n        await runNewsletterBroadcast(bot, { trigger: 'auto' });",
  "        await setSupabaseConfig(config);\n        fs.writeFileSync(path.join(DATA_DIR, 'scheduler_config.json'), JSON.stringify(config, null, 2), 'utf-8');\n\n        await runNewsletterBroadcast(bot, { trigger: 'auto' });\n        await cleanupOldMessages(7);"
);

c = c.replace(
  "      if (currentDay > 8) {\n        details.push(\[\] ?? Користувач \ вже завершив практикум (День 8)\);\n        continue;\n      }\n\n      try {",
  "      if (currentDay > 8) {\n        details.push(\[\] ?? Користувач \ вже завершив практикум (День 8)\);\n        continue;\n      }\n      const receivedToday = await hasUserReceivedLessonToday(userId);\n      if(receivedToday) {\n        details.push(\[\] ?? Пропущено: Користувач \ вже отримав заняття сьогодні.\);\n        continue;\n      }\n\n      try {"
);

fs.writeFileSync('src/services/scheduler.ts', c, 'utf8');
