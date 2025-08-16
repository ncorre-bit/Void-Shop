 // frontend/src/utils/telegram.js
// Утилиты для работы с Telegram WebApp API

/**
 * Проверяет, запущено ли приложение внутри Telegram
 */
export function isTelegramWebApp() {
  return !!(window.Telegram && window.Telegram.WebApp);
}

/**
 * Получает данные пользователя из Telegram WebApp
 */
export function getTelegramUser() {
  if (!isTelegramWebApp()) {
    // Для разработки возвращаем фейковые данные
    console.warn('Не запущено в Telegram WebApp, используем тестовые данные');
    return {
      id: 1158345802, // Твой ID из .env
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      language_code: "ru",
      is_premium: false,
    };
  }

  const tg = window.Telegram.WebApp;
  const user = tg.initDataUnsafe?.user;

  if (!user) {
    console.error('Не удалось получить данные пользователя из Telegram');
    return null;
  }

  console.log('Получены данные пользователя из Telegram:', user);
  return user;
}

/**
 * Настраивает Telegram WebApp (тема, кнопки, полноэкранный режим)
 */
export function initTelegramWebApp() {
  if (!isTelegramWebApp()) {
    console.log('Не в Telegram WebApp, пропускаем инициализацию');
    return;
  }

  const tg = window.Telegram.WebApp;

  try {
    // Расширяем приложение на весь экран
    tg.expand();

    // Полноэкранный режим
    tg.setHeaderColor('#0d1117');
    tg.setBackgroundColor('#0d1117');

    // Включаем подтверждение закрытия
    tg.enableClosingConfirmation();

    // Скрываем главную кнопку если есть
    if (tg.MainButton) {
      tg.MainButton.hide();
    }

    // Настраиваем тему
    if (tg.themeParams) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0d1117');
      document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#6b7280');
      document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#8b5cf6');
      document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#8b5cf6');
      document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    }

    // Дополнительные настройки для полноэкранного режима
    if (tg.requestFullscreen && typeof tg.requestFullscreen === 'function') {
      tg.requestFullscreen();
    }

    // Уведомляем Telegram что приложение готово
    tg.ready();

    console.log('Telegram WebApp инициализирован:', {
      version: tg.version,
      platform: tg.platform,
      colorScheme: tg.colorScheme,
      isExpanded: tg.isExpanded,
      viewportHeight: tg.viewportHeight,
      viewportStableHeight: tg.viewportStableHeight
    });

  } catch (error) {
    console.error('Ошибка при инициализации Telegram WebApp:', error);
  }
}

/**
 * Показывает подтверждение через Telegram
 */
export function showTelegramConfirm(message) {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showConfirm(message, resolve);
    } else {
      resolve(confirm(message));
    }
  });
}

/**
 * Закрывает WebApp
 */
export function closeTelegramWebApp() {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.close();
  } else {
    window.close();
  }
}

/**
 * Отправляет данные обратно в Telegram бот
 */
export function sendDataToTelegramBot(data) {
  if (isTelegramWebApp()) {
    window.Telegram.WebApp.sendData(JSON.stringify(data));
  } else {
    console.log('SendData (dev mode):', data);
  }
}