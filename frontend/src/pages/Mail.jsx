// frontend/src/pages/Mail.jsx (БЕЗ FAB КНОПКИ)
import React, { useState } from "react";

const sampleMessages = [
  {
    id: 1,
    title: "Добро пожаловать в Void Shop!",
    preview: "Спасибо за регистрацию. Изучите наш каталог товаров и найдите то, что ищете...",
    time: "2 часа назад",
    unread: true,
    from: "Система"
  },
  {
    id: 2,
    title: "Новые поступления в каталоге",
    preview: "Обновления каталога: электроника, одежда, аксессуары и многое другое уже доступно...",
    time: "1 день назад",
    unread: false,
    from: "Void Shop"
  },
  {
    id: 3,
    title: "Специальное предложение для вас",
    preview: "Персональная скидка 15% на первую покупку. Промокод действует до конца месяца...",
    time: "2 дня назад",
    unread: false,
    from: "Маркетинг"
  }
];

export default function Mail({ user }) {
  const [messages] = useState(sampleMessages);

  function handleMessageClick(messageId) {
    console.log("Открываем сообщение:", messageId);
    alert("Просмотр сообщений - в разработке");
  }

  return (
    <div className="mail-page">
      <div className="mail-header">
        <div className="header-content">
          <h2 className="mail-title">Сообщения</h2>
          <p className="mail-subtitle">
            {user ? `Привет, ${user.first_name || user.username || 'пользователь'}!` : 'Ваши личные сообщения'}
          </p>
        </div>

        <div className="mail-stats">
          <div className="stat-item">
            <span className="stat-value">{messages.filter(m => m.unread).length}</span>
            <span className="stat-label">Непрочитанных</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{messages.length}</span>
            <span className="stat-label">Всего</span>
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📬</div>
            <h3 className="empty-title">Пока нет сообщений</h3>
            <p className="empty-description">Когда вам придут сообщения, они появятся здесь</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-item ${message.unread ? 'unread' : ''}`}
                onClick={() => handleMessageClick(message.id)}
              >
                <div className="message-content">
                  <div className="message-header">
                    <div className="message-meta">
                      <h4 className="message-title">{message.title}</h4>
                      <span className="message-from">от {message.from}</span>
                    </div>
                    <span className="message-time">{message.time}</span>
                  </div>
                  <p className="message-preview">{message.preview}</p>
                  {message.unread && <div className="unread-indicator"></div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .mail-page {
          min-height: calc(100vh - 200px);
          padding: var(--spacing-lg) 0;
        }

        .mail-header {
          margin-bottom: var(--spacing-xl);
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-lg);
          position: relative;
          overflow: hidden;
        }

        .mail-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
        }

        .header-content {
          flex: 1;
        }

        .mail-title {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .mail-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          line-height: 1.5;
        }

        .mail-stats {
          display: flex;
          gap: var(--spacing-lg);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          min-width: 80px;
        }

        .stat-value {
          font-size: var(--font-size-xl);
          font-weight: 700;
          color: var(--accent);
        }

        .stat-label {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          margin-top: var(--spacing-xs);
        }

        .messages-container {
          min-height: 400px;
        }

        .empty-state {
          text-align: center;
          padding: var(--spacing-2xl);
          color: var(--text-muted);
        }

        .empty-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-lg);
          opacity: 0.6;
        }

        .empty-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .empty-description {
          margin: 0;
          font-size: var(--font-size-base);
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }

        .messages-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .message-item {
          position: relative;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
        }

        .message-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          transition: left 0.4s ease;
        }

        .message-item:hover::before {
          left: 0;
        }

        .message-item:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        .message-item.unread {
          background: linear-gradient(135deg,
            rgba(139, 92, 246, 0.05),
            rgba(124, 58, 237, 0.02)
          );
          border-color: rgba(139, 92, 246, 0.2);
        }

        .message-content {
          position: relative;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-sm);
        }

        .message-meta {
          flex: 1;
          min-width: 0;
        }

        .message-title {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
          line-height: 1.4;
        }

        .message-from {
          color: var(--text-muted);
          font-size: var(--font-size-xs);
          font-weight: 500;
        }

        .message-time {
          color: var(--text-muted);
          font-size: var(--font-size-xs);
          font-weight: 500;
          white-space: nowrap;
        }

        .message-preview {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .unread-indicator {
          position: absolute;
          top: var(--spacing-lg);
          right: var(--spacing-lg);
          width: 8px;
          height: 8px;
          background: var(--accent);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .mail-page {
            padding: var(--spacing-md) 0;
          }

          .mail-header {
            flex-direction: column;
            gap: var(--spacing-md);
          }

          .mail-stats {
            align-self: stretch;
            justify-content: center;
          }

          .message-item {
            padding: var(--spacing-md);
          }

          .message-header {
            flex-direction: column;
            gap: var(--spacing-xs);
            align-items: flex-start;
          }

          .message-time {
            align-self: flex-end;
          }
        }

        @media (max-width: 480px) {
          .mail-page {
            padding: var(--spacing-sm) 0;
          }
        }

        /* Focus states */
        .message-item:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}