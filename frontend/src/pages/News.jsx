// frontend/src/pages/News.jsx - ПОЛНАЯ ЗАМЕНА
import React from "react";

export default function News() {
  const newsItems = [
    {
      id: 1,
      title: "Обновление интерфейса",
      content: "Визуальная часть Void Shop — пока заглушка. Работаем над адаптацией и добавлением реальных баннеров и ссылок.",
      date: "2 часа назад",
      category: "Обновления"
    },
    {
      id: 2,
      title: "Запуск тестового слоя",
      content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      date: "1 день назад",
      category: "Система"
    },
    {
      id: 3,
      title: "Планы по развитию",
      content: "Интеграция платежей, учет баланса и система магазинов — в ближайших задачах.",
      date: "3 дня назад",
      category: "Планы"
    }
  ];

  return (
    <div className="news-page">
      <div className="news-header">
        <h2 className="news-title">Новости</h2>
        <p className="news-subtitle">Последние обновления и события в Void Shop</p>
      </div>

      <div className="news-list">
        {newsItems.map((item) => (
          <article key={item.id} className="news-card">
            <div className="news-card-header">
              <span className="news-category">{item.category}</span>
              <span className="news-date">{item.date}</span>
            </div>

            <h3 className="news-card-title">{item.title}</h3>
            <p className="news-card-content">{item.content}</p>

            <div className="news-card-footer">
              <button className="read-more-btn">
                Читать далее →
              </button>
            </div>
          </article>
        ))}
      </div>

      <style>{`
        .news-page {
          padding: var(--spacing-lg) 0;
          min-height: calc(100vh - 200px);
        }

        .news-header {
          margin-bottom: var(--spacing-xl);
          text-align: center;
        }

        .news-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
        }

        .news-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .news-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .news-card {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .news-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          transition: left 0.4s ease;
        }

        .news-card:hover::before {
          left: 0;
        }

        .news-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        .news-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-md);
        }

        .news-category {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .news-date {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .news-card-title {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
          line-height: 1.3;
        }

        .news-card-content {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          line-height: 1.6;
        }

        .news-card-footer {
          display: flex;
          justify-content: flex-end;
        }

        .read-more-btn {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border: 1px solid var(--accent);
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .read-more-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: translateX(4px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .news-card {
            padding: var(--spacing-lg);
          }

          .news-card-header {
            flex-direction: column;
            gap: var(--spacing-xs);
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}