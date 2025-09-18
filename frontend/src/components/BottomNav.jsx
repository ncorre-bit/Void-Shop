// frontend/src/components/BottomNav.jsx - ИСПРАВЛЕНО: иконка настроек + оптимизация
import React from "react";

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  ),
  news: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2z"/>
      <path d="M6 12h8M6 8h8M6 16h6"/>
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  settings: (
    // ИСПРАВЛЕНО: Правильная иконка шестеренки настроек
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
};

export default function BottomNav({ onNavigate, active }) {
  const items = [
    { key: "home", label: "Главная", icon: ICONS.home },
    { key: "news", label: "Новости", icon: ICONS.news },
    { key: "profile", label: "Профиль", icon: ICONS.profile },
    { key: "settings", label: "Настройки", icon: ICONS.settings } // ИСПРАВЛЕНО: новая иконка
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Основная навигация">
      <div className="nav-container">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate?.(item.key)}
            className={`nav-item ${active === item.key ? "active" : ""}`}
            aria-pressed={active === item.key}
            aria-label={item.label}
          >
            <div className="nav-icon" aria-hidden="true">
              {item.icon}
            </div>
            <span className="nav-label">{item.label}</span>

            {/* НОВОЕ: Активный индикатор */}
            {active === item.key && (
              <div className="active-indicator" aria-hidden="true"></div>
            )}
          </button>
        ))}
      </div>

      <style>{`
        .bottom-nav {
          position: fixed;
          left: var(--bottom-nav-margin);
          right: var(--bottom-nav-margin);
          bottom: var(--bottom-nav-margin);
          height: var(--bottom-nav-height);
          margin: 0 auto;
          max-width: calc(var(--container-max) - var(--bottom-nav-margin) * 2);
          border-radius: var(--radius-xl);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-xl);
          transition: all 0.3s ease;
          padding: 0 var(--spacing-md);
          box-sizing: border-box;
        }

        .nav-container {
          display: flex;
          width: 100%;
          justify-content: space-between;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .nav-item {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-xs);
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          font-weight: 500;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex: 1;
          min-width: 0;
          position: relative;
          font-family: var(--font-family-system);
        }

        .nav-item:hover:not(.active) {
          background: var(--accent-soft);
          color: var(--accent);
          transform: translateY(-2px);
        }

        .nav-item:active {
          transform: translateY(0);
        }

        .nav-item.active {
          color: var(--accent);
          font-weight: 600;
          background: var(--accent-soft);
        }

        /* НОВОЕ: Активный индикатор */
        /* НОВОЕ: Активный индикатор */
        .active-indicator {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          border-radius: 2px;
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-item.active .nav-icon {
          transform: translateY(-1px);
        }

        .nav-icon {
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2px;
        }

        .nav-label {
          transition: all 0.3s ease;
          font-size: 11px;
          line-height: 1;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .bottom-nav {
            left: 12px;
            right: 12px;
            bottom: 12px;
            max-width: none;
            padding: 0 var(--spacing-sm);
          }

          .nav-item {
            padding: 8px 6px;
          }

          .nav-label {
            font-size: 10px;
          }
        }

        @media (max-width: 480px) {
          .nav-container {
            gap: 4px;
          }

          .nav-item {
            padding: 6px 4px;
          }

          .nav-label {
            font-size: 9px;
          }

          .active-indicator {
            width: 20px;
            height: 2px;
          }
        }

        /* Focus states */
        .nav-item:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        /* Dark theme adjustments */
        :global(.theme-dark) .bottom-nav {
          background: rgba(31, 41, 55, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </nav>
  );
}