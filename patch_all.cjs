const fs = require('fs');

// Fix server.ts
let lines = fs.readFileSync('server.ts', 'utf8').split('\n');
lines = lines.filter(l => !l.includes('res.json({ success: true, data: config });'));
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('app.get(\'/api/broadcast/config\',')) {
    if (lines[i+4] && lines[i+4].trim() === '});') {
      lines[i+4] = '';
    }
  }
}
fs.writeFileSync('server.ts', lines.join('\n'), 'utf8');

// Fix supabase.ts
let s = fs.readFileSync('src/services/supabase.ts', 'utf8');
s = s.split('\\\\').join(''); // In case any double backslashes
s = s.replace('', ''); // Remove broken characters if any
s = s.replace(/\\??/g, '??').replace(/\\ /g, ' ');
let idx = s.indexOf('export async function cleanupOldMessages');
if (idx > -1) {
  s = s.slice(0, idx);
}
const newFunc = 'export async function cleanupOldMessages(daysOld = 7): Promise<void> {\n' +
'  const thresholdDate = new Date();\n' +
'  thresholdDate.setDate(thresholdDate.getDate() - daysOld);\n' +
'  const thresholdIso = thresholdDate.toISOString();\n' +
'  if (supabase) {\n' +
'    try {\n' +
'      const { error, count } = await supabase.from("messages").delete({ count: "exact" }).lt("created_at", thresholdIso).neq("user_id", "SYSTEM_CONFIG");\n' +
'      if (error) console.error("Supabase cleanup error:", error);\n' +
'      else console.log("Cleaned up old messages from Supabase.");\n' +
'    } catch (err) {\n' +
'      console.error("Supabase cleanup error:", err);\n' +
'    }\n' +
'  }\n' +
'}\n';
s = s + '\n' + newFunc;
fs.writeFileSync('src/services/supabase.ts', s, 'utf8');

// Fix CRMDashboard.tsx
let c = fs.readFileSync('src/components/CRMDashboard.tsx', 'utf8');
const replacement = '  const handleManualSend = async (u: User) => {\n' +
'    const dayStr = window.prompt("Який день відправити користувачу " + u.username + "? (Введіть число від 1 до 8)");\n' +
'    if (!dayStr) return;\n' +
'    const dayNum = parseInt(dayStr);\n' +
'    if (isNaN(dayNum) || dayNum < 1 || dayNum > 8) {\n' +
'      alert("Будь ласка, введіть коректне число від 1 до 8.");\n' +
'      return;\n' +
'    }\n' +
'    if (window.confirm("Дійсно відправити матеріали Дня " + dayNum + " користувачу " + u.username + "?")) {\n' +
'      try {\n' +
'        const res = await fetch("/api/users/" + u.telegramId + "/send-lesson", {\n' +
'          method: "POST",\n' +
'          headers: { "Content-Type": "application/json" },\n' +
'          body: JSON.stringify({ dayNum })\n' +
'        });\n' +
'        const data = await res.json();\n' +
'        if (data.success) {\n' +
'          alert("Заняття успішно відправлено!");\n' +
'        } else {\n' +
'          alert("Помилка: " + data.error);\n' +
'        }\n' +
'      } catch (e: any) {\n' +
'        alert("Помилка: " + e.message);\n' +
'      }\n' +
'    }\n' +
'  };';

c = c.replace(/  const handleManualSend = async \(u: User\) => \{[\s\S]*?\}\n  \};\n/g, replacement + '\n');
c = c.replace(/<Send className="w-3 h-3" \/>[\s\S]*?<\/button>/, '<Send className="w-3 h-3" />\n                                Відправити\n                              </button>');
fs.writeFileSync('src/components/CRMDashboard.tsx', c, 'utf8');
