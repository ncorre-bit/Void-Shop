// frontend/src/contexts/SettingsContext.jsx (исправленный)
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

const STORAGE_THEME_KEY = "voidshop_theme";
const STORAGE_LANG_KEY = "voidshop_lang";

const defaultSettings = {
  theme: "dark", // "light" or "dark"
  lang: "ru",     // "ru" or "en"
};

const translations = {
  ru: {
    settings_title: "Настройки",
    theme_label: "Тема",
    theme_light: "Светлая",
    theme_dark: "Тёмная",
    lang_label: "Язык",
    lang_ru: "Русский",
    lang_en: "English",
    save_ok: "Сохранено",
  },
  en: {
    settings_title: "Settings",
    theme_label: "Theme",
    theme_light: "Light",
    theme_dark: "Dark",
    lang_label: "Language",
    lang_ru: "Russian",
    lang_en: "English",
    save_ok: "Saved",
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_THEME_KEY) || defaultSettings.theme;
    } catch {
      return defaultSettings.theme;
    }
  });

  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_LANG_KEY) || defaultSettings.lang;
    } catch {
      return defaultSettings.lang;
    }
  });

  // Применяем тему к document element при изменении
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(theme === "dark" ? "theme-dark" : "theme-light");

    try {
      localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch (error) {
      console.warn('Не удалось сохранить тему в localStorage:', error);
    }
  }, [theme]);

  // Сохраняем язык при изменении
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
    } catch (error) {
      console.warn('Не удалось сохранить язык в localStorage:', error);
    }
  }, [lang]);

  // Функция перевода
  const t = (key) => {
    return translations[lang]?.[key] ?? translations["ru"]?.[key] ?? key;
  };

  // Мemoized значение контекста
  const value = useMemo(() => ({
    theme,
    setTheme,
    isDark: theme === "dark",
    toggleTheme: () => setTheme((prevTheme) => (prevTheme === "dark" ? "light" : "dark")),
    lang,
    setLang,
    t,
  }), [theme, lang]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}