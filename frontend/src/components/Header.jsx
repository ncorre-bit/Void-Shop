// frontend/src/components/Header.jsx - ИСПРАВЛЕНО: только лого + каталог
import React from "react";

export default function Header({ onCatalogClick }) {
  return (
    <header className="app-header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo" aria-label="Void Shop">
          <span className="logo-icon">V</span>
        </div>

        {/* ИСПРАВЛЕНО: Кнопка каталога занимает всё свободное место */}
        <button
          className="catalog-button"
          onClick={onCatalogClick}
          type="button"
        >
          <span className="catalog-icon">📦</span>
          <span className="catalog-text">Каталог товаров</span>
          <div className="catalog-arrow">→</div>
        </button>
      </div>

      <style>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--surface-elevated);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: var(--spacing-md) 0;
          box-shadow: var(--shadow-sm);
        }

        .header-container {
          width: 100%;
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 0 var(--container-padding);
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          box-sizing: border-box;
        }

        .header-logo {
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--primary-black) 0%, var(--gray-800) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .header-logo::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .header-logo:hover::before {
          left: 100%;
        }

        .header-logo:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-lg);
        }

        .logo-icon {
          color: var(--primary-white);
          font-weight: 700;
          font-size: var(--font-size-xl);
        }

        /* ИСПРАВЛЕНО: Кнопка каталога растягивается на всё место */
        .catalog-button {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md) var(--spacing-xl);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-xl);
          color: var(--text-secondary);
          font-size: var(--font-size-lg);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 0;
          box-shadow: var(--shadow-sm);
          position: relative;
          overflow: hidden;
        }

        .catalog-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
          transition: left 0.5s;
        }

        .catalog-button:hover::before {
          left: 100%;
        }

        .catalog-button:hover {
          background: var(--surface-elevated);
          border-color: var(--accent);
          color: var(--accent-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .catalog-button:active {
          transform: translateY(0);
          background: var(--accent-soft);
          color: var(--accent-hover);
        }

        .catalog-icon {
          flex-shrink: 0;
          font-size: var(--font-size-xl);
        }

        .catalog-text {
          flex: 1;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* НОВОЕ: Стрелка справа */
        .catalog-arrow {
          flex-shrink: 0;
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--accent);
          transition: all 0.3s ease;
        }

        .catalog-button:hover .catalog-arrow {
          transform: translateX(4px);
        }

        /* ИСПРАВЛЕННАЯ ТЕМНАЯ ТЕМА */
        :global(.theme-dark) .app-header {
          background: rgba(13, 17, 23, 0.95);
          border-bottom-color: rgba(240, 246, 252, 0.12);
        }

        :global(.theme-dark) .header-logo {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          box-shadow: 0 8px 32px rgba(167, 139, 250, 0.3);
        }

        :global(.theme-dark) .catalog-button {
          background: rgba(22, 27, 34, 0.8);
          border-color: rgba(240, 246, 252, 0.12);
          color: var(--text-secondary);
        }

        :global(.theme-dark) .catalog-button:hover {
          background: rgba(30, 39, 46, 0.9);
          border-color: var(--accent);
          color: var(--text-primary);
        }

        :global(.theme-dark) .catalog-button:active {
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-color: var(--accent);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .header-container {
            padding: 0 var(--spacing-md);
            gap: var(--spacing-md);
          }

          .catalog-text {
            font-size: var(--font-size-base);
          }

          .catalog-button {
            padding: var(--spacing-sm) var(--spacing-lg);
            gap: var(--spacing-sm);
          }
        }

        @media (max-width: 480px) {
          .app-header {
            padding: var(--spacing-sm) 0;
          }

          .header-logo {
            width: 44px;
            height: 44px;
          }

          .logo-icon {
            font-size: var(--font-size-lg);
          }

          .catalog-button {
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .catalog-text {
            font-size: var(--font-size-sm);
          }

          .catalog-icon {
            font-size: var(--font-size-lg);
          }

          .catalog-arrow {
            font-size: var(--font-size-base);
          }
        }

        /* Focus states */
        .catalog-button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </header>
  );
}