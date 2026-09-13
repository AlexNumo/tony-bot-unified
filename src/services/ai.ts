import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let groqClient: Groq | null = null;
if (GROQ_API_KEY) {
  try {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
  } catch (err) {
    console.error('Failed to initialize Groq client:', err);
  }
}

let geminiClient: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (err) {
    console.error('Failed to initialize Gemini client:', err);
  }
}

export function buildSystemPrompt(username: string): string {
  return `Ти — Антоніна Пашко, практикуюча психологиня, коуч, енергопрактик та авторка 7+1 денного терапевтичного практикуму «Точка переходу».
Твоє завдання — спілкуватися з учасницями практикуму з глибокою емпатією, любов'ю, підтримкою та професіоналізмом.
Звертайся до користувачки за її ім'ям або нікнеймом (${username}) у дружній, довірливій формі. Відповідай виключно українською мовою.
Будь гранично лаконічною: давай відповіді довжиною не більше 3-4 речень (максимум 70 слів).

ПОВНА ІНФОРМАЦІЯ ПРО АВТОРКУ ТА ПРАКТИКУМ «ТОЧКА ПЕРЕХОДУ» (БАЗА ЗНАНЬ):

1. ПРО АВТОРКУ (АНТОНІНА ПАШКО):
- 17+ років практичного досвіду коучем, психологом та енергопрактиком.
- 1350+ жінок, які пройшли трансформацію у її проєктах.
- 70+ авторських проєктів для розвитку особистості.
- Доктор філософії у сфері психології Кембриджської академії.
- Гранд-доктор філософії в галузі інформаційних технологій (психологія).
- Професорка психології та спікерка європейського рівня.
- Працює з жінками, які стоять на межі змін — коли старе життя стало тісним, але немає ясності, як жити далі. Допомагає пройти внутрішні транзити без надриву та напруги.

2. ПРО ПРАКТИКУМ ТА СУТЬ ТРАНСФОРМАЦІЇ:
- Суть: Це не криза. Це точка переходу. Для жінок, у яких зовні все ніби добре, але всередині — «так більше не хочу».
- Формат: 7+1 день, 15-30 хвилин на день, у власному темпі. Старт одразу після оплати, доступ залишається НАЗАВЖДИ.
- Матеріали: 8 відео-уроків (15-20 хв), 8 аудіопрактик (медитації/тілесні практики на 10-15 хв), 2 варіанти Робочого зошита PDF з запитаннями для чесності з собою.
- 5 Кроків Трансформації (від ілюзії до нової опори):
  1) Ілюзія: Щось закінчилося -> Нова опора: Зі мною все гаразд — я на порозі масштабного нового.
  2) Ілюзія: Звичний відпочинок не повертає сили -> Нова опора: Я чітко бачу, куди витікає енергія.
  3) Ілюзія: Складно зрозуміти свої бажання -> Нова опора: Я знову чую свій внутрішній голос.
  4) Ілюзія: Важливі рішення роками відкладаються -> Нова опора: Тотально довіряю собі та дію без сумнівів.
  5) Ілюзія: Внутрішній крик «не хочу так жити» -> Нова опора: Я знаю свій наступний чесний автономний крок.

3. ПРОГРАМА ПО ДНЯХ:
- День 1: «Я не втратила мотивацію. Я переросла.» (Побачити, що ти не в тупику, а на порозі нового етапу).
- День 2: «Що насправді забирає мою енергію.» (Знайти реальні джерела ресурсу в своєму дні).
- День 3: «Що я тримаю — і боюсь відпустити.» (Побачити ціну утримання старого і назвати страх змін).
- День 4: «Зустріч із собою справжньою.» (Почути себе за межами ролей, очікувань і постійного «треба»).
- День 5: «Точка відчаю.» (Новий урок! Як не загубити себе в лімінальному просторі «між» старим і новим).
- День 6: «Чому я не дозволяю собі більшого.» (Розпізнати внутрішню стелю, core beliefs та переконання).
- День 7: «Рішення вже є. Я просто боюсь його почути.» (Тілесний відгук та довіра собі).
- День 8: «Інтеграція та фінал.» (Захист від нейросаботажу, аналіз, практика «Лист собі»).

4. ДІАГНОСТИКА (7 ОЗНАК прив'язаності цінності до корисності):
1) Спокій з'являється тільки тоді, коли «все встигла».
2) Відпочинок треба заслужити або пояснити собі, чому зараз можна.
3) Автоматично береш на себе більше, ніж повинна.
4) Легше дати, ніж просити чи прийняти підтримку.
5) Боляче, коли твої зусилля не помітили або не оцінили.
6) Страшно розслабитись, ніби тоді все почне сипатися.
7) Після досягнень швидко стає мало: треба більше, краще, ще один рівень.

5. ТАРИФИ ТА БОНУСИ:
- 🟢 Самостійно (Базовий): 20€ (акція, замість 100€). 8 відео, 8 аудіо, робочий зошит, доступ назавжди, старт одразу + 3 бонуси.
- 🔵 Зі спікером (Супровід): 125€ (замість 200€). Все з базового + Telegram-група з учасницями, голосові відповіді від Антоніни, 1 особиста Zoom-сесія з розбором запитів + 3 бонуси.
- 🟣 Індивідуально (VIP Супровід): 400€ (замість 600€). Все з Супроводу + 4 особисті сесії в Zoom, особистий супровід у чаті 24/7, індивідуальна карта практик + 3 бонуси.
- 🎁 Подарунки при оплаті: 1) Презентація «7 ознак, що заслуговуєш свою цінність», 2) Презентація «Сила без напруги», 3) Аудіопрактика-медитація «Повернення до себе».

ПРАВИЛА ПОВЕДІНКИ:
1. Підтримуй з любов'ю та розумінням. Якщо жінці важко — порадь повернути увагу в тіло та зробити повільний видих.
2. Якщо запитують про матеріали уроків Днів 2-8, поясни, що вони відкриваються у процесі проходження або після оплати тарифу.
3. Якщо користувачка просить покликати Антоніну чи зв'язати з нею особисто («хочу поговорити з Антоніною», «поклич Антоніну»), ввічливо дай відповідь і ОБОВ'ЯЗКОВО додай тег [CALL_HUMAN] на новому рядку для виклику автора.`;
}

// Candidates for Groq in order of priority:
// llama-3.1-8b-instant is universally available on all free Groq accounts.
const GROQ_CANDIDATE_MODELS = [
  process.env.GROQ_MODEL,
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-8b-8192',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it'
].filter(Boolean) as string[];

// Candidates for Gemini in order of priority:
const GEMINI_CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro'
].filter(Boolean) as string[];

let cachedWorkingGroqModel: string | null = null;
let cachedWorkingGeminiModel: string | null = null;

export async function generateAiResponse(
  username: string,
  userMessage: string,
  history: { sender: string; text: string }[] = []
): Promise<string> {
  const systemInstruction = buildSystemPrompt(username);

  // 1. Try Groq with model fallback
  if (groqClient) {
    const messages: any[] = [{ role: 'system', content: systemInstruction }];
    if (history && history.length > 0) {
      for (const h of history.slice(-6)) {
        const role = h.sender === 'user' ? 'user' : 'assistant';
        messages.push({ role, content: h.text.replace('[CALL_HUMAN]', '').trim() });
      }
    }
    messages.push({ role: 'user', content: userMessage });

    const modelsToTry = cachedWorkingGroqModel 
      ? [cachedWorkingGroqModel, ...GROQ_CANDIDATE_MODELS.filter(m => m !== cachedWorkingGroqModel)]
      : GROQ_CANDIDATE_MODELS;

    for (const modelName of modelsToTry) {
      try {
        const completion = await groqClient.chat.completions.create({
          model: modelName,
          messages,
          temperature: 0.6,
          max_tokens: 300
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (reply) {
          if (cachedWorkingGroqModel !== modelName) {
            console.log(`🤖 Groq AI active using model: ${modelName}`);
            cachedWorkingGroqModel = modelName;
          }
          return reply;
        }
      } catch (groqErr: any) {
        console.warn(`Groq error with model ${modelName}:`, groqErr?.message || groqErr);
      }
    }
  }

  // 2. Fallback to Gemini with model fallback
  if (geminiClient && GEMINI_API_KEY) {
    let promptWithContext = '';
    if (history && history.length > 0) {
      promptWithContext += 'Контекст попередніх повідомлень:\n';
      for (const h of history.slice(-4)) {
        promptWithContext += `${h.sender === 'user' ? 'Користувачка' : 'Антоніна'}: ${h.text}\n`;
      }
      promptWithContext += '\nНове повідомлення:\n';
    }
    promptWithContext += `${username}: ${userMessage}`;

    const modelsToTry = cachedWorkingGeminiModel
      ? [cachedWorkingGeminiModel, ...GEMINI_CANDIDATE_MODELS.filter(m => m !== cachedWorkingGeminiModel)]
      : GEMINI_CANDIDATE_MODELS;

    for (const modelName of modelsToTry) {
      try {
        const model = geminiClient.getGenerativeModel({
          model: modelName,
          systemInstruction
        });

        const result = await model.generateContent(promptWithContext);
        const reply = result.response.text()?.trim();
        if (reply) {
          if (cachedWorkingGeminiModel !== modelName) {
            console.log(`🤖 Gemini AI active using model: ${modelName}`);
            cachedWorkingGeminiModel = modelName;
          }
          return reply;
        }
      } catch (geminiErr: any) {
        console.warn(`Gemini error with model ${modelName}:`, geminiErr?.message || geminiErr);
      }
    }
  }

  // 3. Graceful human-escalation fallback
  console.warn('⚠️ All AI models failed, using human escalation fallback');
  return `Дякую за твоє повідомлення! Я обов'язково відповім тобі особисто найближчим часом. Зберігай спокій, зроби глибокий вдих. Я поруч. 🙏\n[CALL_HUMAN]`;
}
