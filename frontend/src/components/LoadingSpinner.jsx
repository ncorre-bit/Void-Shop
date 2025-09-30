// frontend/src/components/LoadingSpinner.jsx - ЕДИНАЯ СИСТЕМА ЗАГРУЗКИ
import React from "react";

export default function LoadingSpinner({
  text = "Загружается...",
  icon = "⏳",
  size = "normal",
  inline = false
}) {
  const sizeClasses = {
    small: "loading-small",
    normal: "loading-normal",
    large: "loading-large"
  };

  return (
    <div className={`loading-container ${inline ? 'loading-inline' : ''} ${sizeClasses[size]}`}>
      <div className="loading-content">
        <div className="loading-icon">{icon}</div>
        <div className="loading-spinner"></div>
        <p className="loading-text">{text}</p>
      </div>

      <style>{`
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          padding: var(--spacing-xl);
        }

        .loading-inline {
          min-height: auto;
          padding: var(--spacing-md);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-lg);
          text-align: center;
          animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .loading-icon {
          font-size: 48px;
          animation: bounce 2s infinite;
          filter: drop-shadow(0 4px 8px rgba(139, 92, 246, 0.3));
        }

        .loading-small .loading-icon { font-size: 32px; }
        .loading-large .loading-icon { font-size: 64px; }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(139, 92, 246, 0.2);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .loading-small .loading-spinner {
          width: 24px;
          height: 24px;
          border-width: 2px;
        }

        .loading-large .loading-spinner {
          width: 56px;
          height: 56px;
          border-width: 4px;
        }

        .loading-text {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          font-weight: 500;
          opacity: 0.8;
        }

        .loading-small .loading-text {
          font-size: var(--font-size-sm);
        }

        .loading-large .loading-text {
          font-size: var(--font-size-lg);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translate3d(0,0,0);
          }
          40%, 43% {
            transform: translate3d(0, -8px, 0);
          }
          70% {
            transform: translate3d(0, -4px, 0);
          }
          90% {
            transform: translate3d(0, -2px, 0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Темная тема */
        :global(.theme-dark) .loading-spinner {
          border-color: rgba(167, 139, 250, 0.2);
          border-top-color: var(--accent);
          box-shadow: 0 4px 12px rgba(167, 139, 250, 0.4);
        }

        :global(.theme-dark) .loading-icon {
          filter: drop-shadow(0 4px 8px rgba(167, 139, 250, 0.4));
        }
      `}</style>
    </div>
  );
}