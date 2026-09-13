# 🌟 TonyBot Unified Platform — Онлайн-практикум «Точка переходу»

> **Єдина консолідована екосистема:** Telegram-бот на базі `grammY` + CRM Адмін-панель на `Express` & `React` + `Supabase PostgreSQL`.  
> Дозволяє розгортати весь бекенд як **один єдиний веб-сервіс на Render (7$/міс)** замість двох окремих сервісів, заощаджуючи кошти та усуваючи конфлікти Telegram Polling 409.

---

## 🏗️ Архітектура та стек технологій

- **Бекенд:** Node.js, TypeScript, Express 4, `grammY` 1.35.
- **Telegram Bot Engine:**
  - `grammY` з підтримкою **Webhook** у продакшні на Render (`/api/telegram-webhook`) та автоматичним fallback на **Long Polling** під час локальної розробки.
  - Повний захист авторського контенту (`protect_content: true`) для всіх відео, аудіо-практик та робочих зошитів PDF.
  - Діагностичний FSM-тест (7 запитань) з розрахунком балів та персоналізованими рекомендаціями.
  - Емпатичний ШІ-помічник (Groq Llama-3.3-70b + fallback на Gemini 1.5 Flash) з тонко налаштованим психологічним промптом від імені Антоніни Пашко.
  - Денний ліміт 15 повідомлень/день на користувача для ШІ-чату.
  - Детекція ключових слів для ескалації на живу людину (`[CALL_HUMAN]`) з миттєвим сповіщенням адміністраторів через основний та службовий адмін-боти.
  - Глибокі посилання (Deep Linking): `/start pay_*` (миттєва активація доступу після оплати) та `/start utm_*` (маркетингова аналітика).
  - Автоматичне завантаження аватарок користувачів Telegram та збереження в базі.
  - Автоматична видача 2 варіантів робочого зошита та 3 бонусів з 15-секундними інтервалами.
- **База даних:** Supabase (PostgreSQL) як єдине джерело істини (Single Source of Truth) для користувачів, тарифів, лідів, результатів тестів, повідомлень та логів розсилок.
- **Платіжна система:** WayForPay Webhook (`/api/payment/wayforpay-webhook`) з перевіркою підпису, пошуком користувача за номером телефону, авто-активацією статусу та створенням гостьових акаунтів (якщо користувач оплатив на сайті до запуску бота).
- **Планувальник розсилок:** Щоденна автоматична видача наступного уроку (1-8 дні) о заданій годині (за Києвом) з урахуванням лімітів швидкості Telegram.
- **Фронтенд адмін-панелі:** React 19, Vite 6, Tailwind CSS v4, Motion, Recharts, Lucide Icons.

---

## 📁 Структура проєкту

```
tony-bot-unified/
├── server.ts                    # Головний сервер: Express + grammY webhook + API
├── schema.sql                   # SQL-схема таблиць для Supabase
├── render.yaml                  # Маніфест автоматичного деплою на Render
├── package.json                 # Залежності та скрипти збірки
├── vite.config.ts               # Конфігурація збірки React клієнта
├── tsconfig.json                # TypeScript налаштування
├── .env.example                 # Приклад змінних оточення
├── src/
│   ├── bot/                     # Telegram-бот на grammY
│   │   ├── bot.ts               # Ініціалізація бота, реєстрація middleware та роутів
│   │   ├── keyboards.ts         # Inline-клавіатури та меню
│   │   ├── materials.ts         # Видача робочих зошитів та бонусів з інтервалами
│   │   └── handlers/
│   │       ├── start.ts         # Команда /start, deep-linking, аватарки
│   │       ├── callbacks.ts     # Обробники кнопок меню, тарифи, інформація
│   │       ├── test.ts          # FSM діагностичний тест (7 питань)
│   │       ├── day.ts           # Команди /day1 - /day8, доставка занять
│   │       ├── contact.ts       # Отримання номера телефону, зв'язка з гостьовими оплатами
│   │       ├── upload.ts        # Службова команда адміна #upload для реєстрації file_id
│   │       └── aiText.ts        # ШІ-діалог (Groq/Gemini), ліміти 15 msg/day, ескалація
│   ├── services/
│   │   ├── supabase.ts          # CRUD-операції з PostgreSQL Supabase
│   │   ├── ai.ts                # Groq + Gemini клієнти та системний промпт Антоніни
│   │   ├── adminNotifier.ts     # Сповіщення адміна через основний бот та Admin Bot
│   │   ├── scheduler.ts         # Щоденний фоновий планувальник розсилок занять
│   │   └── sheets.ts            # Логування в Google Таблиці
│   ├── components/              # React компоненти адмінки
│   │   ├── CRMDashboard.tsx     # Реєстр користувачів, тарифи, чат, статистика
│   │   ├── TelegramSimulator.tsx# Інтерактивний симулятор бота в реальному часі
│   │   ├── CourseMaterials.tsx  # Редактор контенту та описів занять 1-8
│   │   └── CodeExplorer.tsx     # Довідник архітектури
│   ├── data/
│   │   ├── lessonsData.ts       # Дані занять з Telegram file_id
│   │   ├── lessons.json         # Кеш структури уроків
│   │   └── scheduler_config.json# Конфігурація години щоденної розсилки
│   ├── types.ts                 # Спільні TypeScript типи
│   ├── App.tsx                  # Головний React додаток з табами
│   └── main.tsx                 # Точка входу фронтенду
```

---

## ⚙️ Налаштування оточення (`.env`)

Створіть файл `.env` на основі `.env.example`:

```bash
# Telegram Bot Token (від @BotFather)
TELEGRAM_BOT_TOKEN="your_bot_token"

# Службовий бот та ID адмінів для сповіщень
ADMIN_BOT_TOKEN="8923506126:AAE4CrClTzepTR4T2WfmjlYUB2Yba_d_3Tg"
ADMIN_TELEGRAM_ID="7780694746"
SECONDARY_ADMIN_ID="216147493"

# URL вебхуку на Render (залиште пустим для локального polling)
WEBHOOK_URL="https://tony-bot-unified.onrender.com"

# Supabase PostgreSQL
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SECRET_KEY="your-service-role-key"

# AI Integrations (Groq безкоштовний + Gemini fallback)
GROQ_API_KEY="gsk_your_groq_api_key"
GEMINI_API_KEY="your_gemini_api_key"

# WayForPay платіжний шлюз
WAYFORPAY_MERCHANT_ACCOUNT="your_merchant_account"
WAYFORPAY_MERCHANT_SECRET_KEY="your_merchant_secret"

# Налаштування сервера
PORT=3000
NODE_ENV="production"
USE_POLLING=false
```

---

## 🗄️ Налаштування бази даних Supabase

1. Відкрийте ваш проєкт у [Supabase Dashboard](https://supabase.com/).
2. Перейдіть у розділ **SQL Editor** -> **New query**.
3. Вставте вміст файлу `schema.sql` з цього репозиторію та натисніть **Run**.
4. Будуть створені всі необхідні таблиці:
   - `users` — користувачі, тарифи, прогрес за днями, телефон, аватар.
   - `packages` — тарифи (Самостійно, Зі спікером, VIP).
   - `leads` — заявки на оплату та успішні покупки.
   - `test_results` — результати діагностичного тесту 7 ознак.
   - `messages` — повна історія чату бота та повідомлень від адміна.
   - `course_progress_logs` — журнал успішної доставки щоденних уроків.
   - `user_actions` — події взаємодії з ботом.

---

## 🚀 Розгортання на Render (Крок за кроком)

1. Зайдіть у [Render Dashboard](https://dashboard.render.com/).
2. Натисніть **New +** -> **Web Service**.
3. Підключіть цей репозиторій: `AlexNumo/tony-bot-unified`.
4. Вкажіть наступні параметри:
   - **Name:** `tony-bot-unified`
   - **Environment:** `Node`
   - **Plan:** `Starter` ($7/міс)
   - **Build Command:**
     ```bash
     npm install && npm run build
     ```
   - **Start Command:**
     ```bash
     npm start
     ```
5. У розділі **Environment Variables** додайте ваші ключі з `.env`:
   - `TELEGRAM_BOT_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `WEBHOOK_URL` — вкажіть ваш публічний URL Render, наприклад `https://tony-bot-unified.onrender.com`.
6. Натисніть **Deploy Web Service**.
7. Після успішного деплою:
   - Відкрийте URL вашого сервісу в браузері — завантажиться адмін-панель CRM.
   - Telegram-бот автоматично зареєструє свій Webhook і почне відповідати користувачам без будь-яких затримок та конфліктів!

---

## 💻 Локальний запуск для розробки

```bash
# 1. Встановлення залежностей
npm install

# 2. Запуск у режимі розробки (зі зручним Long Polling)
npm run dev
```

Сервер підніметься на `http://localhost:3000`. В адмін-панелі можна в реальному часі тестувати роботу бота, перемикати тарифи та переглядати базу підписників!
