// frontend/src/pages/Settings.jsx - УПРОЩЕННАЯ ВЕРСИЯ
import React from "react";
import { useSettings } from "../contexts/SettingsContext";

export default function Settings() {
  const { theme, setTheme, isDark } = useSettings();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Настройки</h1>
        <p className="settings-subtitle">Персонализируйте внешний вид приложения</p>
      </div>

      <div className="settings-sections">
        {/* Единственная секция - Внешний вид */}
        <div className="settings-section">
          <div className="section-header">
            <h3 className="section-title">Внешний вид</h3>
            <p className="section-description">
              Настройте тему интерфейса. Автоматическая тема подстраивается под настройки Telegram
            </p>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">Тема интерфейса</span>
              <span className="current-theme-info">
                Сейчас: {theme === "auto" ? "Автоматическая" : theme === "dark" ? "Темная" : "Светлая"}
                ({isDark ? "темная" : "светлая"} применена)
              </span>
            </div>

            <div className="theme-selector">
              <button
                onClick={() => setTheme("auto")}
                className={`theme-option ${theme === "auto" ? "active" : ""}`}
                aria-pressed={theme === "auto"}
              >
                <div className="theme-preview auto-preview">
                  <div className="preview-half light"></div>
                  <div className="preview-half dark"></div>
                </div>
                <span>Как в Telegram</span>
              </button>

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
                <span>Светлая</span>
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
                <span>Темная</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page {
          padding: var(--spacing-lg) 0;
          min-height: calc(100vh - 200px);
        }

        .settings-header {
          margin-bottom: var(--spacing-2xl);
          text-align: center;
          padding: var(--spacing-xl);
          background: var(--surface);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }

        .settings-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
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
        }

        .settings-section {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
        }

        .settings-section:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .section-header {
          margin-bottom: var(--spacing-xl);
          padding-bottom: var(--spacing-lg);
          border-bottom: 2px solid var(--border-light);
          text-align: center;
        }

        .section-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .section-description {
          margin: 0;
          color: var(--text-muted);
          font-size: var(--font-size-base);
          line-height: 1.5;
          max-width: 500px;
          margin: 0 auto;
        }

        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-xl);
        }

        .setting-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .setting-label {
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .current-theme-info {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
          font-style: italic;
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
          padding: var(--spacing-lg);
          background: var(--surface-elevated);
          border: 2px solid var(--border);
          border-radius: var(--radius-xl);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          color: var(--text-secondary);
          min-width: 110px;
          position: relative;
          overflow: hidden;
        }

        .theme-option::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
          transition: left 0.5s;
        }

        .theme-option:hover::before {
          left: 100%;
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
          box-shadow: var(--shadow-lg);
        }

        .theme-preview {
          width: 60px;
          height: 45px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(0, 0, 0, 0.1);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-sm);
        }

        .auto-preview {
          display: flex;
          flex-direction: row;
        }

        .auto-preview .preview-half {
          width: 50%;
          height: 100%;
        }

        .auto-preview .light {
          background: #ffffff;
          border-right: 1px solid rgba(0, 0, 0, 0.1);
        }

        .auto-preview .dark {
          background: #0d1117;
        }

        .light-preview {
          background: #ffffff;
        }

        .dark-preview {
          background: #0d1117;
        }

        .preview-header {
          height: 10px;
          margin-bottom: 3px;
        }

        .light-preview .preview-header {
          background: #f3f4f6;
        }

        .dark-preview .preview-header {
          background: #1f2937;
        }

        .preview-content {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .preview-line {
          height: 3px;
          border-radius: 2px;
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

        /* Responsive */
        @media (max-width: 768px) {
          .setting-item {
            flex-direction: column;
            gap: var(--spacing-lg);
          }

          .theme-selector {
            align-self: stretch;
            justify-content: center;
          }

          .theme-option {
            flex: 1;
            min-width: 90px;
          }

          .theme-preview {
            width: 50px;
            height: 38px;
          }
        }

        @media (max-width: 480px) {
          .settings-page {
            padding: var(--spacing-md) 0;
          }

          .settings-section {
            padding: var(--spacing-xl);
          }

          .settings-header {
            padding: var(--spacing-lg);
          }

          .settings-title {
            font-size: var(--font-size-2xl);
          }

          .theme-selector {
            flex-direction: column;
          }

          .theme-option {
            flex-direction: row;
            gap: var(--spacing-md);
            justify-content: flex-start;
          }
        }

        /* Focus states */
        .theme-option:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}