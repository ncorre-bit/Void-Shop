// frontend/src/components/CatalogModal.jsx - НОВЫЙ КОМПОНЕНТ
import React, { useEffect, useState } from "react";
import { storesAPI } from "../services/api";

export default function CatalogModal({ city = "Москва", onClose, onCategoryClick, isOffline }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Блокировка скролла заднего интерфейса
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    loadCategories();

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const loadCategories = async () => {
    if (isOffline) {
      // Fallback категории для offline режима
      setCategories([
        { id: 1, name: 'Электроника', slug: 'electronics', icon: '📱', products_count: 25 },
        { id: 2, name: 'Одежда', slug: 'clothing', icon: '👕', products_count: 18 },
        { id: 3, name: 'Дом и сад', slug: 'home', icon: '🏠', products_count: 12 },
        { id: 4, name: 'Спорт', slug: 'sports', icon: '⚽', products_count: 8 },
        { id: 5, name: 'Красота', slug: 'beauty', icon: '💄', products_count: 15 },
        { id: 6, name: 'Авто', slug: 'auto', icon: '🚗', products_count: 6 }
      ]);
      setLoading(false);
      return;
    }

    try {
      const categoriesData = await storesAPI.getCategories();
      setCategories(categoriesData || []);
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      setError('Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    onCategoryClick?.(category);
    onClose?.();
  };

  const totalProducts = categories.reduce((sum, cat) => sum + (cat.products_count || 0), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal catalog-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close Button */}
        <button className="modal-close" onClick={onClose} aria-label="Закрыть каталог">
          ✕
        </button>

        <div className="modal-header">
          <div className="catalog-header-icon">📂</div>
          <h2 className="text-2xl font-bold">Каталог товаров</h2>
          <p className="text-secondary">
            {isOffline ? 'Offline режим' : `${totalProducts} товаров в ${city}`}
          </p>
        </div>

        <div className="modal-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Загружаем категории...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <span className="error-icon">⚠️</span>
              <h3>Ошибка загрузки</h3>
              <p>{error}</p>
              <button onClick={loadCategories} className="btn btn-primary">
                Повторить
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>Категории не найдены</h3>
              <p>Пока что нет доступных категорий товаров</p>
            </div>
          ) : (
            <>
              <div className="categories-grid">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className="category-card card card-interactive"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <div className="category-icon">{category.icon}</div>
                    <div className="category-info">
                      <h3 className="category-name">{category.name}</h3>
                      <div className="category-count">
                        {category.products_count || 0} товаров
                      </div>
                    </div>
                    <div className="category-arrow">→</div>
                  </button>
                ))}
              </div>

              {/* Stats Footer */}
              <div className="catalog-footer">
                <div className="catalog-stats">
                  <div className="stat-item">
                    <span className="stat-value">{categories.length}</span>
                    <span className="stat-label">категорий</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{totalProducts}</span>
                    <span className="stat-label">товаров</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{city}</span>
                    <span className="stat-label">город</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <style>{`
          .catalog-modal {
            width: 95vw;
            max-width: 800px;
            max-height: 90vh;
          }

          .catalog-header-icon {
            width: 64px;
            height: 64px;
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--font-size-2xl);
            margin: 0 auto var(--spacing-md);
            box-shadow: var(--shadow-lg);
          }

          .categories-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-2xl);
          }

          .category-card {
            display: flex;
            align-items: center;
            gap: var(--spacing-lg);
            padding: var(--spacing-xl);
            text-align: left;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid var(--border);
            background: var(--surface);
            position: relative;
            overflow: hidden;
          }

          .category-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 3px;
            background: linear-gradient(90deg, var(--accent), var(--accent-hover));
            transition: left 0.4s ease;
          }

          .category-card:hover::before {
            left: 0;
          }

          .category-card:hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-lg);
            border-color: var(--accent);
          }

          .category-icon {
            width: 60px;
            height: 60px;
            border-radius: var(--radius-lg);
            background: var(--accent-soft);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--font-size-2xl);
            flex-shrink: 0;
            box-shadow: var(--shadow-md);
          }

          .category-info {
            flex: 1;
            min-width: 0;
          }

          .category-name {
            margin: 0 0 var(--spacing-xs) 0;
            color: var(--text-primary);
            font-size: var(--font-size-lg);
            font-weight: 700;
          }

          .category-count {
            color: var(--text-secondary);
            font-size: var(--font-size-sm);
            font-weight: 500;
          }

          .category-arrow {
            color: var(--accent);
            font-size: var(--font-size-xl);
            font-weight: 700;
            transition: all 0.3s ease;
            flex-shrink: 0;
          }

          .category-card:hover .category-arrow {
            transform: translateX(4px);
          }

          .catalog-footer {
            padding-top: var(--spacing-xl);
            border-top: 2px solid var(--border-light);
          }

          .catalog-stats {
            display: flex;
            justify-content: space-around;
            align-items: center;
            background: var(--surface-elevated);
            padding: var(--spacing-lg);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-md);
            border: 1px solid var(--border);
          }

          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stat-value {
            color: var(--accent);
            font-size: var(--font-size-xl);
            font-weight: 700;
            line-height: 1;
          }

          .stat-label {
            color: var(--text-secondary);
            font-size: var(--font-size-xs);
            margin-top: var(--spacing-xs);
            font-weight: 500;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .categories-grid {
              gap: var(--spacing-md);
            }

            .category-card {
              padding: var(--spacing-lg);
              gap: var(--spacing-md);
            }

            .category-icon {
              width: 48px;
              height: 48px;
              font-size: var(--font-size-xl);
            }

            .category-name {
              font-size: var(--font-size-base);
            }

            .catalog-stats {
              padding: var(--spacing-md);
            }

            .stat-value {
              font-size: var(--font-size-lg);
            }
          }

          @media (max-width: 480px) {
            .catalog-modal {
              width: 100vw;
              max-width: none;
              height: 100vh;
              max-height: none;
              border-radius: 0;
            }

            .categories-grid {
              gap: var(--spacing-sm);
            }

            .category-card {
              padding: var(--spacing-md);
              gap: var(--spacing-sm);
            }

            .category-icon {
              width: 40px;
              height: 40px;
              font-size: var(--font-size-lg);
            }

            .catalog-footer {
              padding-top: var(--spacing-lg);
            }
          }

          /* Анимация появления */
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

          .modal-backdrop {
            animation: fadeIn 0.3s ease;
          }

          .catalog-modal {
            animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Dark theme improvements */
          :global(.theme-dark) .category-card {
            background: rgba(22, 27, 34, 0.8);
            border-color: rgba(240, 246, 252, 0.12);
          }

          :global(.theme-dark) .category-card:hover {
            background: rgba(30, 39, 46, 0.9);
            border-color: var(--accent);
          }

          :global(.theme-dark) .catalog-stats {
            background: rgba(13, 17, 23, 0.9);
            border-color: rgba(240, 246, 252, 0.12);
          }
        `}</style>
      </div>
    </div>
  );
}