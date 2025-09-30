// frontend/src/components/ErrorBoundary.jsx - КРИТИЧЕСКИ ИСПРАВЛЕНО
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Логируем ошибку
    console.error('ErrorBoundary поймал ошибку:', error, errorInfo);

    // В production можно отправлять в Sentry
    if (window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      } catch (e) {
        console.warn('Не удалось вызвать haptic feedback:', e);
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-container">
            <div className="error-icon">⚠️</div>
            <h2>Что-то пошло не так</h2>
            <p>Произошла неожиданная ошибка в приложении</p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Детали ошибки (только для разработки)</summary>
                <pre className="error-stack">
                  {/* ИСПРАВЛЕНО: Безопасная проверка наличия данных */}
                  {this.state.error ? this.state.error.toString() : 'Неизвестная ошибка'}
                  {this.state.errorInfo?.componentStack ? this.state.errorInfo.componentStack : ''}
                </pre>
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleRetry} className="retry-btn">
                Попробовать снова
              </button>
              <button onClick={this.handleReload} className="reload-btn">
                Перезагрузить приложение
              </button>
            </div>
          </div>

          <style>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: var(--spacing-xl);
              background: var(--bg);
              text-align: center;
            }

            .error-boundary-container {
              max-width: 500px;
              padding: var(--spacing-2xl);
              background: var(--surface-elevated);
              border-radius: var(--radius-2xl);
              box-shadow: var(--shadow-xl);
              border: 1px solid var(--border);
            }

            .error-icon {
              font-size: 64px;
              margin-bottom: var(--spacing-lg);
            }

            .error-boundary-container h2 {
              margin: 0 0 var(--spacing-lg) 0;
              color: var(--text-primary);
              font-size: var(--font-size-2xl);
              font-weight: 700;
            }

            .error-boundary-container p {
              margin: 0 0 var(--spacing-xl) 0;
              color: var(--text-secondary);
              font-size: var(--font-size-base);
              line-height: 1.6;
            }

            .error-details {
              margin: var(--spacing-lg) 0;
              padding: var(--spacing-md);
              background: var(--surface);
              border-radius: var(--radius-md);
              border: 1px solid var(--border);
              text-align: left;
            }

            .error-details summary {
              cursor: pointer;
              font-weight: 600;
              color: var(--text-primary);
              margin-bottom: var(--spacing-sm);
            }

            .error-stack {
              margin: var(--spacing-sm) 0 0 0;
              padding: var(--spacing-md);
              background: var(--gray-100);
              border-radius: var(--radius-sm);
              font-size: var(--font-size-sm);
              color: var(--gray-800);
              white-space: pre-wrap;
              overflow-x: auto;
              font-family: 'Courier New', monospace;
              line-height: 1.4;
            }

            :global(.theme-dark) .error-stack {
              background: var(--gray-800);
              color: var(--gray-200);
            }

            .error-actions {
              display: flex;
              flex-direction: column;
              gap: var(--spacing-md);
            }

            .retry-btn, .reload-btn {
              padding: var(--spacing-md) var(--spacing-xl);
              border-radius: var(--radius-lg);
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              border: none;
              font-family: var(--font-family-system);
              font-size: var(--font-size-base);
            }

            .retry-btn {
              background: linear-gradient(135deg, var(--accent), var(--accent-hover));
              color: var(--primary-white);
              box-shadow: var(--shadow-md);
            }

            .retry-btn:hover {
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
            }

            .reload-btn {
              background: var(--surface);
              color: var(--text-secondary);
              border: 1px solid var(--border);
            }

            .reload-btn:hover {
              background: var(--surface-elevated);
              color: var(--text-primary);
              border-color: var(--accent);
              transform: translateY(-1px);
            }

            /* Responsive */
            @media (max-width: 480px) {
              .error-boundary {
                padding: var(--spacing-lg);
              }

              .error-boundary-container {
                padding: var(--spacing-lg);
              }

              .error-icon {
                font-size: 48px;
              }

              .error-boundary-container h2 {
                font-size: var(--font-size-xl);
              }

              .error-actions {
                gap: var(--spacing-sm);
              }

              .retry-btn, .reload-btn {
                padding: var(--spacing-sm) var(--spacing-lg);
              }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}