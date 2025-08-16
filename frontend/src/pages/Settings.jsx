// frontend/src/pages/Settings.jsx (исправленный)
import React from "react";
import { useSettings } from "../contexts/SettingsContext";

export default function Settings() {
  const { theme, setTheme, lang, setLang, t, isDark, toggleTheme } = useSettings();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">{t("settings_title")}</h1>
        <p className="settings-subtitle">Персонализируйте ваш опыт использования приложения</p>
      </div>

      <div className="settings-sections">
        {/* Appearance Section */}
        <div className="settings-section">
          <div className="section-header">
            <h3 className="section-title">Внешний вид</h3>
            <p className="section-description">Настройте тему и отображение интерфейса</p>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t("theme_label")}</span>
              <span className="setting-description">Выберите светлую или темную тему</span>
            </div>

            <div className="theme-selector">
              <button
                onClick={() => setTheme("light")}
                className={`theme-option ${theme === "light" ? "active" : ""}`}
                aria-pressed={theme === "light"}
              >
                <div className="theme-preview light-preview">
                  <div className="preview-header"></div>
                  <div className="preview-content">
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                  </div>
                </div>
                <span>{t("theme_light")}</span>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`theme-option ${theme === "dark" ? "active" : ""}`}
                aria-pressed={theme === "dark"}
              >
                <div className="theme-preview dark-preview">
                  <div className="preview-header"></div>
                  <div className="preview-content">
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                  </div>
                </div>
                <span>{t("theme_dark")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div className="settings-section">
          <div className="section-header">
            <h3 className="section-title">Язык и регион</h3>
            <p className="section-description">Выберите предпочитаемый язык интерфейса</p>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">{t("lang_label")}</span>
              <span className="setting-description">Язык интерфейса приложения</span>
            </div>

            <div className="language-selector">
              <button
                onClick={() => setLang("ru")}
                className={`lang-option ${lang === "ru" ? "active" : ""}`}
                aria-pressed={lang === "ru"}
              >
                <span className="lang-flag">🇷🇺</span>
                <span>{t("lang_ru")}</span>
              </button>

              <button
                onClick={() => setLang("en")}
                className={`lang-option ${lang === "en" ? "active" : ""}`}
                aria-pressed={lang === "en"}
              >
                <span className="lang-flag">🇺🇸</span>
                <span>{t("lang_en")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Toggle */}
        <div className="settings-section">
          <div className="section-header">
            <h3 className="section-title">Быстрые действия</h3>
            <p className="section-description">Удобные переключатели для часто используемых функций</p>
          </div>

          <div className="quick-toggles">
            <button
              className="quick-toggle-btn"
              onClick={toggleTheme}
            >
              <div className="toggle-icon">
                {isDark ? "🌙" : "☀️"}
              </div>
              <div className="toggle-info">
                <span className="toggle-label">Переключить тему</span>
                <span className="toggle-status">{isDark ? "Темная активна" : "Светлая активна"}</span>
              </div>
              <div className="toggle-arrow">→</div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          padding: var(--spacing-lg) 0;
          min-height: calc(100vh - 200px);
        }

        .settings-header {
          margin-bottom: var(--spacing-xl);
          text-align: center;
        }

        .settings-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
        }

        .settings-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        }

        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .settings-section {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
        }

        .settings-section:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .section-header {
          margin-bottom: var(--spacing-lg);
          padding-bottom: var(--spacing-md);
          border-bottom: 1px solid var(--border-light);
        }

        .section-title {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .section-description {
          margin: 0;
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-lg);
        }

        .setting-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .setting-label {
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
        }

        .setting-description {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
          line-height: 1.4;
        }

        /* Theme Selector */
        .theme-selector {
          display: flex;
          gap: var(--spacing-md);
        }

        .theme-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--surface-elevated);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 100px;
        }

        .theme-option:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
          border-color: var(--accent);
        }

        .theme-option.active {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent-hover);
          font-weight: 600;
        }

        .theme-preview {
          width: 48px;
          height: 36px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .light-preview {
          background: #ffffff;
        }

        .dark-preview {
          background: #0d1117;
        }

        .preview-header {
          height: 8px;
          margin-bottom: 2px;
        }

        .light-preview .preview-header {
          background: #f3f4f6;
        }

        .dark-preview .preview-header {
          background: #1f2937;
        }

        .preview-content {
          padding: 4px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .preview-line {
          height: 2px;
          border-radius: 1px;
        }

        .preview-line.short {
          width: 70%;
        }

        .light-preview .preview-line {
          background: #d1d5db;
        }

        .dark-preview .preview-line {
          background: #4b5563;
        }

        /* Language Selector */
        .language-selector {
          display: flex;
          gap: var(--spacing-sm);
        }

        .lang-option {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--surface-elevated);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          color: var(--text-secondary);
        }

        .lang-option:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--accent);
        }

        .lang-option.active {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent-hover);
          font-weight: 600;
        }

        .lang-flag {
          font-size: var(--font-size-lg);
        }

        /* Quick Toggles */
        .quick-toggles {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .quick-toggle-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          text-align: left;
        }

        .quick-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--accent);
        }

        .toggle-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: var(--accent-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-xl);
        }

        .toggle-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .toggle-label {
          color: var(--text-primary);
          font-weight: 600;
        }

        .toggle-status {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .toggle-arrow {
          color: var(--text-muted);
          font-size: var(--font-size-lg);
          transition: transform 0.2s ease;
        }

        .quick-toggle-btn:hover .toggle-arrow {
          transform: translateX(4px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .setting-item {
            flex-direction: column;
            gap: var(--spacing-md);
          }

          .theme-selector,
          .language-selector {
            align-self: stretch;
            justify-content: center;
          }

          .theme-option,
          .lang-option {
            flex: 1;
          }
        }

        @media (max-width: 480px) {
          .settings-page {
            padding: var(--spacing-md) 0;
          }

          .settings-section {
            padding: var(--spacing-lg);
          }

          .theme-selector {
            flex-direction: column;
          }

          .language-selector {
            flex-direction: column;
          }
        }

        /* Focus states */
        .theme-option:focus-visible,
        .lang-option:focus-visible,
        .quick-toggle-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}