// frontend/src/utils/telegram.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
// Утилиты для работы с Telegram WebApp API

export function isTelegramWebApp() {
  // ИСПРАВЛЕНО: более точная проверка
  return !!(
    typeof window !== 'undefined' &&
    window.Telegram &&
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initData
  );
}

export function validateTelegramWebApp() {
  if (!isTelegramWebApp()) return false;

  const tg = window.Telegram.WebApp;
  const initData = tg.initData;

  // ИСПРАВЛЕНО: более гибкая валидация для тестирования
  if (!initData) {
    console.warn('InitData от Telegram пустые');
    return false;
  }

  // Для тестирования разрешаем короткие initData
  if (initData.length < 10) {
    console.warn('InitData от Telegram недостаточные');
    return false;
  }

  const urlParams = new URLSearchParams(initData);
  const user = urlParams.get('user');
  const hash = urlParams.get('hash');

  if (!user || !hash) {
    console.warn('Отсутствуют критические параметры в initData');
    return false;
  }

  try {
    JSON.parse(user);
    return true;
  } catch {
    console.warn('Некорректный формат данных пользователя');
    return false;
  }
}

export function getTelegramUser() {
  // ИСПРАВЛЕНО: проверяем реальное окружение Telegram
  const isInTelegram = isTelegramWebApp();

  console.log('🔍 Telegram environment check:', {
    isInTelegram,
    hasWindow: typeof window !== 'undefined',
    hasTelegramObject: !!(window.Telegram),
    hasWebApp: !!(window.Telegram?.WebApp),
    hasInitData: !!(window.Telegram?.WebApp?.initData),
    initDataLength: window.Telegram?.WebApp?.initData?.length || 0,
    userAgent: navigator?.userAgent?.includes('Telegram') || false
  });

  if (!isInTelegram) {
    // ИСПРАВЛЕНО: только в DEV режиме возвращаем тестовые данные
    if (import.meta.env.DEV || window.location.hostname === 'localhost') {
      console.warn('🧪 DEV: Используем тестовые данные пользователя');
      return {
        id: 999999999,
        first_name: "Test",
        last_name: "User",
        username: "testuser",
        language_code: "ru",
        is_premium: false,
        photo_url: null,
      };
    }

    console.error('❌ Не запущено в Telegram WebApp и не dev режим');
    return null;
  }

  const tg = window.Telegram.WebApp;

  // ИСПРАВЛЕНО: более детальная проверка данных
  if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
    console.error('❌ Отсутствуют данные пользователя в initDataUnsafe');
    return null;
  }

  const user = tg.initDataUnsafe.user;

  if (!user || !user.id) {
    console.error('❌ Некорректные данные пользователя:', user);
    return null;
  }

  // ИСПРАВЛЕНО: получаем аватар правильно
  let photoUrl = null;
  if (user.photo_url) {
    photoUrl = user.photo_url;
  }

  const validatedUser = {
    id: Number(user.id),
    first_name: user.first_name ? String(user.first_name).trim() : null,
    last_name: user.last_name ? String(user.last_name).trim() : null,
    username: user.username ? String(user.username).trim() : null,
    language_code: user.language_code || "ru",
    is_premium: Boolean(user.is_premium),
    photo_url: photoUrl,
  };

  if (!validatedUser.id || validatedUser.id < 1) {
    console.error('❌ Некорректный Telegram ID:', validatedUser.id);
    return null;
  }

  console.log('✅ Получены и валидированы данные пользователя:', {
    id: validatedUser.id,
    first_name: validatedUser.first_name,
    username: validatedUser.username,
    has_photo: !!validatedUser.photo_url,
    is_premium: validatedUser.is_premium
  });

  return validatedUser;
}

export function initTelegramWebApp() {
  if (!isTelegramWebApp()) {
    console.log('🔧 Не в Telegram WebApp, пропускаем инициализацию');
    return;
  }

  const tg = window.Telegram.WebApp;

  try {
    console.log('🚀 Инициализация Telegram WebApp...');

    tg.ready();

    const version = parseFloat(tg.version || '6.0');
    console.log('📱 Telegram WebApp API версия:', version);

    if (version >= 6.1) {
      tg.expand();

      if (tg.enableVerticalSwipes) {
        tg.enableVerticalSwipes();
      }

      if (tg.requestFullscreen) {
        tg.requestFullscreen();
      }
    }

    // Настраиваем цвета
    if (tg.setHeaderColor) {
      tg.setHeaderColor('secondary_bg_color');
    }

    if (tg.setBottomBarColor) {
      tg.setBottomBarColor('secondary_bg_color');
    }

    // Скрываем стандартные кнопки
    if (tg.MainButton) tg.MainButton.hide();
    if (tg.BackButton) tg.BackButton.hide();
    if (tg.SettingsButton) tg.SettingsButton.hide();

    if (tg.enableClosingConfirmation) {
      tg.enableClosingConfirmation();
    }

    // ИСПРАВЛЕНО: применяем CSS переменные из Telegram темы
    if (tg.themeParams) {
      const root = document.documentElement;

      root.style.setProperty('--tg-bg', tg.themeParams.bg_color || '#0d1117');
      root.style.setProperty('--tg-text', tg.themeParams.text_color || '#f0f6fc');
      root.style.setProperty('--tg-hint', tg.themeParams.hint_color || '#8b949e');
      root.style.setProperty('--tg-link', tg.themeParams.link_color || '#a78bfa');
      root.style.setProperty('--tg-button', tg.themeParams.button_color || '#8b5cf6');
      root.style.setProperty('--tg-button-text', tg.themeParams.button_text_color || '#ffffff');

      // Автоматически определяем тему
      const bgColor = tg.themeParams.bg_color;
      if (bgColor) {
        const isDarkBg = parseInt(bgColor.slice(1), 16) < 0x808080;
        root.className = isDarkBg ? 'theme-dark' : 'theme-light';
        console.log('🎨 Применена тема:', isDarkBg ? 'dark' : 'light');
      }
    }

    // ИСПРАВЛЕНО: устанавливаем viewport правильно
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

    // CSS для полноэкранного режима
    const style = document.createElement('style');
    style.id = 'telegram-webapp-styles';
    style.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100vh;
        overflow-x: hidden;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
        padding-right: env(safe-area-inset-right);
      }

      #root {
        width: 100%;
        min-height: 100vh;
        min-height: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
      }

      ::-webkit-scrollbar {
        width: 0px;
        background: transparent;
      }
    `;

    const oldStyles = document.getElementById('telegram-webapp-styles');
    if (oldStyles) oldStyles.remove();
    document.head.appendChild(style);

    console.log('✅ Telegram WebApp инициализирован:', {
      version: tg.version,
      platform: tg.platform,
      colorScheme: tg.colorScheme,
      isExpanded: tg.isExpanded,
      viewportHeight: tg.viewportHeight,
      viewportStableHeight: tg.viewportStableHeight,
      isValidated: validateTelegramWebApp()
    });

  } catch (error) {
    console.error('❌ Ошибка при инициализации Telegram WebApp:', error);
  }
}

export function showTelegramConfirm(message, timeout = 30000) {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      const timer = setTimeout(() => resolve(false), timeout);
      window.Telegram.WebApp.showConfirm(message, (result) => {
        clearTimeout(timer);
        resolve(result);
      });
    } else {
      resolve(confirm(message));
    }
  });
}

export function showTelegramAlert(message) {
  return new Promise((resolve) => {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.showAlert(message, resolve);
    } else {
      alert(message);
      resolve();
    }
  });
}

export function closeTelegramWebApp() {
  if (isTelegramWebApp()) {
    try {
      window.Telegram.WebApp.close();
    } catch (error) {
      console.error('Ошибка при закрытии WebApp:', error);
    }
  } else {
    window.close();
  }
}

export function sendDataToTelegramBot(data) {
  if (isTelegramWebApp()) {
    try {
      if (!data || typeof data !== 'object') {
        console.error('Некорректные данные для отправки в бот');
        return false;
      }

      const jsonData = JSON.stringify(data);

      if (jsonData.length > 4000) {
        console.error('Данные слишком большие для отправки в бот');
        return false;
      }

      window.Telegram.WebApp.sendData(jsonData);
      console.log('✅ Данные отправлены в бот:', data);
      return true;

    } catch (error) {
      console.error('Ошибка при отправке данных в бот:', error);
      return false;
    }
  } else {
    console.log('📤 SendData (dev mode):', data);
    return true;
  }
}

export function getTelegramStartParam() {
  if (!isTelegramWebApp()) return null;
  try {
    const tg = window.Telegram.WebApp;
    return tg.initDataUnsafe?.start_param || null;
  } catch {
    return null;
  }
}

export function getTelegramChat() {
  if (!isTelegramWebApp()) return null;
  try {
    const tg = window.Telegram.WebApp;
    return tg.initDataUnsafe?.chat || null;
  } catch {
    return null;
  }
}

export function setTelegramMainButton(text, onClick, options = {}) {
  if (!isTelegramWebApp()) return false;

  try {
    const tg = window.Telegram.WebApp;
    const mainButton = tg.MainButton;

    if (!mainButton) return false;

    mainButton.setText(text);

    if (options.color) mainButton.setColor(options.color);
    if (options.textColor) mainButton.setTextColor(options.textColor);

    mainButton.offClick();

    if (onClick && typeof onClick === 'function') {
      mainButton.onClick(onClick);
    }

    if (!options.disabled) {
      mainButton.show();
    }

    return true;
  } catch (error) {
    console.error('Ошибка при настройке главной кнопки:', error);
    return false;
  }
}

export function hideTelegramMainButton() {
  if (!isTelegramWebApp()) return false;

  try {
    const tg = window.Telegram.WebApp;
    if (tg.MainButton) {
      tg.MainButton.hide();
      return true;
    }
  } catch (error) {
    console.error('Ошибка при скрытии главной кнопки:', error);
  }

  return false;
}