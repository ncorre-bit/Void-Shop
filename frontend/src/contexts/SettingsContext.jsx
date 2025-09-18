// frontend/src/contexts/SettingsContext.jsx (с автоопределением темы Telegram)
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

const STORAGE_THEME_KEY = "voidshop_theme";

const defaultSettings = {
  theme: "auto", // "light", "dark", или "auto" (по Telegram)
};

// Функция получения темы из Telegram WebApp
function getTelegramTheme() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    if (tg.themeParams && tg.colorScheme) {
      return tg.colorScheme === 'dark' ? 'dark' : 'light';
    }
  }

  // Fallback - определяем по системной теме
  if (window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light'; // По умолчанию светлая
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_THEME_KEY) || defaultSettings.theme;
    } catch {
      return defaultSettings.theme;
    }
  });

  const [actualTheme, setActualTheme] = useState('light');

  // Определяем реальную тему на основе настроек
  useEffect(() => {
    let resolvedTheme;

    if (theme === 'auto') {
      resolvedTheme = getTelegramTheme();
    } else {
      resolvedTheme = theme;
    }

    setActualTheme(resolvedTheme);

    // Применяем тему к document element
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(resolvedTheme === "dark" ? "theme-dark" : "theme-light");

    // Сохраняем настройку темы
    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch (error) {
      console.warn('Не удалось сохранить тему в localStorage:', error);
    }
  }, [theme]);

  // Следим за изменениями темы в Telegram (если включен авто режим)
  useEffect(() => {
    if (theme !== 'auto') return;

    const handleThemeChange = () => {
      const newTheme = getTelegramTheme();
      setActualTheme(newTheme);
    };

    // Слушаем изменения темы в Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.onEvent('themeChanged', handleThemeChange);
    }

    // Слушаем изменения системной темы
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);

    return () => {
      if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.offEvent('themeChanged', handleThemeChange);
      }
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [theme]);

  // Функция переключения темы (для быстрой кнопки)
  const toggleTheme = () => {
    if (theme === 'auto') {
      // Если авто, переключаем на противоположную от текущей
      setTheme(actualTheme === 'dark' ? 'light' : 'dark');
    } else if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('auto');
    }
  };

  // Memoized значение контекста
  const value = useMemo(() => ({
    theme, // Настройка пользователя (auto, light, dark)
    actualTheme, // Реальная применяемая тема (light, dark)
    setTheme,
    isDark: actualTheme === "dark",
    toggleTheme,
  }), [theme, actualTheme]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}