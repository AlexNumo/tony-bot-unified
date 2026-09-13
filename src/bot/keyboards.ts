import { InlineKeyboard, Keyboard } from 'grammy';
import { Package } from '../types';

export function getContactKeyboard(): Keyboard {
  return new Keyboard()
    .requestContact('📱 Поділитися контактом')
    .resized()
    .oneTime();
}

export function getMainMenuKeyboard(isPaid = false): InlineKeyboard {
  const keyboard = new InlineKeyboard()
    .text('ℹ️ Про практикум', 'about_course')
    .text('📝 Пройти тест (7 ознак)', 'start_test')
    .row()
    .text('📅 Програма за днями', 'program_menu')
    .text('👤 Про автора', 'about_author')
    .row()
    .text('💳 Тарифи та запис', 'packages_menu')
    .text('❓ Задати питання', 'contacts');

  if (isPaid) {
    keyboard.row().text('📚 Мої зошити та бонуси', 'my_workbooks');
  }

  return keyboard;
}

export function getBackToMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('↩️ Головне меню', 'main_menu');
}

export function getProgramMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🎬 День 1. Мотивація', 'prog_day_1')
    .text('🎬 День 2. Енергія', 'prog_day_2')
    .row()
    .text('🎬 День 3. Страхи', 'prog_day_3')
    .text('🎬 День 4. Хто Я', 'prog_day_4')
    .row()
    .text('🎬 День 5. Точка відчаю', 'prog_day_5')
    .text('🎬 День 6. Переконання', 'prog_day_6')
    .row()
    .text('🎬 День 7. Тіло і рішення', 'prog_day_7')
    .text('🎬 День 8. Інтеграція', 'prog_day_8')
    .row()
    .text('↩️ Головне меню', 'main_menu');
}

export function getProgramDayKeyboard(dayNum: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(`📅 Отримати матеріали Дня ${dayNum}`, `send_lesson_${dayNum}`)
    .row()
    .text('↩️ До програми', 'program_menu')
    .text('💳 Тарифи та запис', 'packages_menu')
    .row()
    .text('↩️ Головне меню', 'main_menu');
}

export function getPackagesKeyboard(packages: Package[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();

  // 1. WebApp button for the full interactive website
  keyboard.webApp('✨ 🌐 ВІДКРИТИ САЙТ ПРЯМО ТУТ 🌐 ✨', 'https://www.tonypashko.com/').row();

  // 2. Package order buttons
  const orderCallbacks: Record<string, string> = {
    base: 'order_base',
    support: 'order_support',
    vip: 'order_vip'
  };

  const icons: Record<string, string> = {
    base: '🟢',
    support: '🔵',
    vip: '🟣'
  };

  for (const pkg of packages) {
    const icon = icons[pkg.id] || '👉';
    const callback = orderCallbacks[pkg.id] || `order_${pkg.id}`;
    keyboard.text(`${icon} ${pkg.name} (${pkg.price})`, callback).row();
  }

  keyboard.text('↩️ Головне меню', 'main_menu');
  return keyboard;
}

export function getOrderConfirmationKeyboard(packageId: string): InlineKeyboard {
  const paymentUrls: Record<string, string> = {
    base: 'https://secure.wayforpay.com/button/b2860b6ba58a1',
    support: 'https://secure.wayforpay.com/button/b2a8990c0471e',
    vip: 'https://secure.wayforpay.com/button/b23ef4af753b2'
  };

  const url = paymentUrls[packageId] || 'https://www.tonypashko.com/';

  return new InlineKeyboard()
    .url('💳 Оплатити через WayForPay', url)
    .row()
    .text('↩️ Назад до тарифів', 'packages_menu')
    .text('↩️ Головне меню', 'main_menu');
}

export function getTestQuestionKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Так, це про мене', 'test_yes')
    .text('❌ Ні, це не про мене', 'test_no')
    .row()
    .text('↩️ Перервати тест', 'main_menu');
}

export function getTestIntroKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('🚀 Почати тест', 'test_begin')
    .row()
    .text('↩️ Головне меню', 'main_menu');
}

export function getTestResultKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📅 Подивитись програму', 'program_menu')
    .text('💳 Пакети участі', 'packages_menu')
    .row()
    .text('↩️ Головне меню', 'main_menu');
}

export function getContactsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url('📸 Instagram @tonypashko', 'https://www.instagram.com/tonypashko')
    .url('💬 Telegram @tonypashko', 'https://t.me/tonypashko')
    .row()
    .text('↩️ Головне меню', 'main_menu');
}
