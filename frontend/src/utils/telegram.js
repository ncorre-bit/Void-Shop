// frontend/src/utils/telegram.js - ФИНАЛЬНАЯ ВЕРСИЯ: ТОЛЬКО реальные данные Telegram
async function waitForTelegram(maxWait = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (window.Telegram?.WebApp) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

export async function isTelegramWebApp() {
  console.log('🔍 Проверка Telegram WebApp среды...');
  const telegramLoaded = await waitForTelegram(3000);

  if (!telegramLoaded) {
    console.error('❌ Telegram WebApp скрипт не загружен');
    throw new Error('Приложение должно запускаться через Telegram бота. Откройте бота и нажмите кнопку запуска.');
  }

  const tg = window.Telegram.WebApp;
  console.log('✅ Telegram WebApp найден!', {
    version: tg.version,
    platform: tg.platform,
    hasUser: !!tg.initDataUnsafe?.user,
    hasInitData: !!tg.initData
  });

  return true;
}

export async function getTelegramUser() {
  console.log('🔍 Получение данных пользователя Telegram...');

  // КРИТИЧНО: Проверяем что мы в Telegram
  const isInTelegram = await isTelegramWebApp();
  if (!isInTelegram) {
    throw new Error('Приложение должно запускаться через Telegram бота');
  }

  const tg = window.Telegram.WebApp;
  let user = null;

  // Получаем пользователя из initDataUnsafe (приоритет)
  if (tg.initDataUnsafe?.user) {
    user = tg.initDataUnsafe.user;
    console.log('✅ Пользователь получен из initDataUnsafe');
  }
  // Парсим из initData как fallback
  else if (tg.initData) {
    try {
      const urlParams = new URLSearchParams(tg.initData);
      const userJson = urlParams.get('user');
      if (userJson) {
        user = JSON.parse(decodeURIComponent(userJson));
        console.log('✅ Пользователь получен из initData');
      }
    } catch (error) {
      console.error('❌ Ошибка парсинга initData:', error);
    }
  }

  // УБРАНО: Все тестовые данные и fallback'и - ТОЛЬКО реальный Telegram
  if (!user?.id) {
    console.error('❌ НЕ УДАЛОСЬ получить данные пользователя из Telegram');
    throw new Error('Не удалось получить данные пользователя. Убедитесь что приложение запущено через Telegram бота.');
  }

  // Валидация и очистка данных
  const validatedUser = {
    id: Number(user.id),
    first_name: user.first_name ? String(user.first_name).trim() : null,
    last_name: user.last_name ? String(user.last_name).trim() : null,
    username: user.username ? String(user.username).trim() : null,
    language_code: user.language_code || "ru",
    is_premium: Boolean(user.is_premium),
    photo_url: user.photo_url || null,
  };

  // КРИТИЧНО: ID должен быть валидным
  if (!validatedUser.id || validatedUser.id < 1) {
    throw new Error('Некорректный Telegram ID пользователя');
  }

  console.log('✅ Данные пользователя валидированы:', {
    id: validatedUser.id,
    first_name: validatedUser.first_name,
    username: validatedUser.username,
    has_photo: !!validatedUser.photo_url
  });

  return validatedUser;
}

export async function initTelegramWebApp() {
  console.log('🚀 Инициализация Telegram WebApp...');

  const isInTelegram = await isTelegramWebApp();
  if (!isInTelegram) {
    throw new Error('Приложение должно запускаться через Telegram бота!');
  }

  const tg = window.Telegram.WebApp;

  try {
    // Основная инициализация
    tg.ready();
    tg.expand();

    const version = parseFloat(tg.version || '6.0');

    // Включаем доп. функции если поддерживаются
    if (version >= 6.1 && typeof tg.enableVerticalSwipes === 'function') {
      tg.enableVerticalSwipes();
    }

    if (version >= 6.2 && typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }

    // Настройка цветов
    try {
      if (typeof tg.setHeaderColor === 'function') {
        tg.setHeaderColor('secondary_bg_color');
      }
    } catch (e) {
      console.warn('Не удалось установить цвета:', e);
    }

    // Скрываем стандартные кнопки Telegram
    if (tg.MainButton) tg.MainButton.hide();
    if (tg.BackButton) tg.BackButton.hide();

    // Применяем тему из Telegram
    if (tg.themeParams?.bg_color) {
      const bgColor = tg.themeParams.bg_color;
      const hex = bgColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      const themeClass = brightness < 128 ? 'theme-dark' : 'theme-light';
      document.documentElement.className = themeClass;
    }

    console.log('🎉 Telegram WebApp успешно инициализирован!');

  } catch (error) {
    console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    throw error;
  }
}

export function sendDataToTelegramBot(data) {
  if (!window.Telegram?.WebApp?.sendData) {
    console.error('❌ SendData недоступен - приложение не в Telegram');
    return false;
  }

  try {
    if (!data || typeof data !== 'object') {
      console.error('❌ Некорректные данные для отправки в бот');
      return false;
    }

    const jsonData = JSON.stringify(data);
    if (jsonData.length > 4096) { // Telegram лимит
      console.error('❌ Данные слишком большие для отправки в бот');
      return false;
    }

    window.Telegram.WebApp.sendData(jsonData);
    console.log('✅ Данные отправлены в Telegram бот:', data);
    return true;

  } catch (error) {
    console.error('❌ Ошибка отправки данных в бот:', error);
    return false;
  }
}