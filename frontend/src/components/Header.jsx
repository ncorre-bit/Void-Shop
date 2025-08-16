// frontend/src/components/Header.jsx (исправленный)
import React from "react";

export default function Header({ onCatalogClick }) {
  return (
    <header className="app-header">
      <div className="header-container">
        {/* Logo */}
        <div className="header-logo" aria-label="Void Shop">
          <span className="logo-icon">V</span>
        </div>

        {/* Catalog Button */}
        <button
          className="catalog-button"
          onClick={onCatalogClick}
          type="button"
        >
          <span className="catalog-icon">📦</span>
          <span className="catalog-text">Каталог товаров</span>
        </button>

        {/* Menu Button */}
        <button className="menu-button" type="button" aria-label="Меню">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" x2="20" y1="6" y2="6"/>
            <line x1="4" x2="20" y1="12" y2="12"/>
            <line x1="4" x2="20" y1="18" y2="18"/>
          </svg>
        </button>
      </div>

      <style jsx>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--surface-elevated);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: var(--spacing-md) 0;
        }

        .header-container {
          width: 100%;
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 0 var(--container-padding);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          box-sizing: border-box;
        }

        .header-logo {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--primary-black) 0%, var(--gray-800) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
        }

        .header-logo:hover {
          transform: scale(1.05);
          box-shadow: var(--shadow-lg);
        }

        .logo-icon {
          color: var(--primary-white);
          font-weight: 700;
          font-size: var(--font-size-lg);
        }

        .catalog-button {
          flex: 1;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 0;
          box-shadow: var(--shadow-sm);
        }

        .catalog-button:hover {
          background: var(--primary-white);
          border-color: var(--accent);
          color: var(--text-primary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .catalog-button:active {
          transform: translateY(0);
        }

        .catalog-icon {
          flex-shrink: 0;
          font-size: var(--font-size-base);
        }

        .catalog-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-button {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-lg);
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .menu-button:hover {
          background: var(--primary-white);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .menu-button:active {
          transform: translateY(0);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .header-container {
            padding: 0 var(--spacing-md);
          }

          .catalog-text {
            font-size: var(--font-size-sm);
          }
        }

        @media (max-width: 480px) {
          .app-header {
            padding: var(--spacing-sm) 0;
          }

          .header-logo,
          .menu-button {
            width: 40px;
            height: 40px;
          }

          .logo-icon {
            font-size: var(--font-size-base);
          }

          .catalog-button {
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .catalog-text {
            font-size: 13px;
          }
        }

        /* Focus states */
        .catalog-button:focus-visible,
        .menu-button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        /* Dark theme adjustments */
        :global(.theme-dark) .app-header {
          background: rgba(31, 41, 55, 0.95);
          border-bottom-color: rgba(255, 255, 255, 0.1);
        }

        :global(.theme-dark) .catalog-button:hover {
          background: rgba(55, 65, 81, 0.8);
        }

        :global(.theme-dark) .menu-button:hover {
          background: rgba(55, 65, 81, 0.8);
        }
      `}</style>
    </header>
  );
}