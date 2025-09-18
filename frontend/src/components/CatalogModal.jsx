// frontend/src/components/CatalogModal.jsx - НАСТОЯЩИЙ КАТАЛОГ
import React, { useEffect, useState } from "react";
import { storesAPI } from "../services/api";

export default function CatalogModal({ city = "Москва", onClose, onCategoryClick }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await storesAPI.getCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      setError('Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  }

  const handleCategoryClick = (category) => {
    if (onCategoryClick) {
      onCategoryClick(category);
    }
    onClose?.();
  };

  // Закрытие по клавише Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="catalog-modal-backdrop" onClick={onClose}>
      <div className="catalog-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="catalog-header">
          <button className="close-btn" onClick={onClose} aria-label="Закрыть каталог">✕</button>
          <div className="catalog-title-section">
            <h2 className="catalog-title">Каталог товаров</h2>
            <p className="catalog-subtitle">Выберите категорию для просмотра товаров</p>
          </div>
        </div>

        {/* Content */}
        <div className="catalog-content">
          {loading ? (
            <div className="loading-section">
              <div className="loading-spinner"></div>
              <p>Загружаем категории...</p>
            </div>
          ) : error ? (
            <div className="error-section">
              <div className="error-icon">⚠️</div>
              <h3>Ошибка загрузки</h3>
              <p>{error}</p>
              <button onClick={loadCategories} className="retry-btn">
                Попробовать снова
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-section">
              <div className="empty-icon">📦</div>
              <h3>Пока нет категорий</h3>
              <p>Категории товаров появятся позже</p>
            </div>
          ) : (
            <div className="categories-grid">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="category-item"
                  onClick={() => handleCategoryClick(category)}
                >
                  <div className="category-icon">{category.icon || '📦'}</div>
                  <div className="category-info">
                    <h3 className="category-name">{category.name}</h3>
                    <p className="category-description">
                      {category.description || 'Товары этой категории'}
                    </p>
                    <div className="category-stats">
                      <span className="products-count">{category.products_count || 0} товаров</span>
                    </div>
                  </div>
                  <div className="category-arrow">→</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="catalog-footer">
          <div className="location-info">
            <span className="location-icon">📍</span>
            <span>Показаны категории для города {city}</span>
          </div>
        </div>
      </div>

      <style>{`
        .catalog-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          z-index: 1600;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg);
          animation: fadeIn 0.3s ease;
        }

        .catalog-modal {
          width: 100%;
          max-width: 800px;
          max-height: 85vh;
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border);
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .catalog-header {
          padding: var(--spacing-xl);
          border-bottom: 1px solid var(--border);
          position: relative;
          background: linear-gradient(135deg, var(--accent-soft), transparent);
          flex-shrink: 0;
        }

        .close-btn {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .close-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: scale(1.1);
        }

        .catalog-title-section {
          text-align: center;
          margin-right: 32px; /* Отступ для кнопки закрытия */
        }

        .catalog-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .catalog-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .catalog-content {
          flex: 1;
          padding: var(--spacing-xl);
          overflow-y: auto;
        }

        .loading-section, .error-section, .empty-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--spacing-2xl);
          color: var(--text-muted);
          min-height: 200px;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: var(--spacing-md);
        }

        .error-icon, .empty-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-lg);
          opacity: 0.6;
        }

        .error-section h3, .empty-section h3 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .error-section p, .empty-section p {
          margin: 0 0 var(--spacing-lg) 0;
          line-height: 1.5;
        }

        .retry-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--accent);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--spacing-md);
        }

        .category-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          padding: var(--spacing-xl);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .category-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
          transition: left 0.5s;
        }

        .category-item:hover::before {
          left: 100%;
        }

        .category-item:hover {
          border-color: var(--accent);
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }

        .category-icon {
          font-size: var(--font-size-3xl);
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .category-item:hover .category-icon {
          transform: scale(1.1);
          background: var(--accent);
          color: var(--primary-white);
        }

        .category-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .category-name {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
          line-height: 1.3;
        }

        .category-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .category-stats {
          margin-top: var(--spacing-xs);
        }

        .products-count {
          color: var(--accent);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .category-arrow {
          font-size: var(--font-size-xl);
          color: var(--accent);
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .category-item:hover .category-arrow {
          transform: translateX(4px);
        }

        .catalog-footer {
          padding: var(--spacing-lg) var(--spacing-xl);
          border-top: 1px solid var(--border);
          background: var(--surface);
          flex-shrink: 0;
        }

        .location-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .location-icon {
          font-size: var(--font-size-base);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(32px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .catalog-modal {
            margin: var(--spacing-sm);
            max-height: 90vh;
          }

          .catalog-header {
            padding: var(--spacing-lg);
          }

          .catalog-content {
            padding: var(--spacing-lg);
          }

          .categories-grid {
            grid-template-columns: 1fr;
            gap: var(--spacing-sm);
          }

          .category-item {
            padding: var(--spacing-lg);
            gap: var(--spacing-md);
          }

          .category-icon {
            width: 50px;
            height: 50px;
            font-size: var(--font-size-2xl);
          }
        }

        @media (max-width: 480px) {
          .catalog-modal {
            margin: var(--spacing-xs);
            max-height: 95vh;
          }

          .catalog-header {
            padding: var(--spacing-md);
          }

          .catalog-content {
            padding: var(--spacing-md);
          }

          .catalog-title {
            font-size: var(--font-size-xl);
          }

          .category-item {
            flex-direction: column;
            text-align: center;
            padding: var(--spacing-lg);
          }

          .category-arrow {
            display: none;
          }
        }

        /* Focus states для доступности */
        .category-item:focus-visible,
        .close-btn:focus-visible,
        .retry-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}