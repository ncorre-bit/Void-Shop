// frontend/src/pages/CategoryPage.jsx - НОВАЯ СТРАНИЦА КАТЕГОРИИ
import React, { useEffect, useState, useCallback } from "react";
import { storesAPI } from "../services/api";

export default function CategoryPage({ category, city = "Москва", onBack, onProductClick }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadProducts = useCallback(async (pageNum = 0, append = false) => {
    try {
      if (!append) setLoading(true);

      const results = await storesAPI.searchProducts("", {
        category: category.slug,
        city,
        limit: 20,
        offset: pageNum * 20
      });

      if (results && results.length > 0) {
        setProducts(prev => append ? [...prev, ...results] : results);
        setHasMore(results.length === 20); // Если меньше 20, то больше нет
      } else {
        setHasMore(false);
        if (!append) setProducts([]);
      }
    } catch (err) {
      console.error('Ошибка загрузки товаров:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [category.slug, city]);

  useEffect(() => {
    loadProducts(0, false);
  }, [loadProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadProducts(nextPage, true);
  };

  const handleProductClick = (product) => {
    if (onProductClick) {
      onProductClick(product);
    } else {
      // Fallback
      alert(`${product.title}\n₽${product.price.toLocaleString()}\n${product.store_name}\n\n(Страница товара в разработке)`);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="category-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Загружаем товары...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="category-page">
      {/* Header категории */}
      <div className="category-header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>

        <div className="category-info">
          <div className="category-icon">{category.icon}</div>
          <div className="category-details">
            <h1 className="category-title">{category.name}</h1>
            <p className="category-description">{category.description}</p>
            <div className="category-stats">
              <span className="products-count">{products.length} товаров</span>
              <span className="separator">•</span>
              <span className="city-info">{city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Товары */}
      <div className="category-content">
        {error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Ошибка загрузки</h3>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => loadProducts(0, false)}>
              Попробовать снова
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Товаров пока нет</h3>
            <p>В категории "{category.name}" пока что нет товаров.<br/>Загляните позже!</p>
          </div>
        ) : (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="product-image">
                    {product.main_image ? (
                      <img src={product.main_image} alt={product.title} />
                    ) : (
                      <div className="product-placeholder">📦</div>
                    )}
                    {product.old_price && (
                      <div className="discount-badge">
                        -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}%
                      </div>
                    )}
                  </div>

                  <div className="product-info">
                    <h3 className="product-title">{product.title}</h3>
                    <p className="product-description">
                      {product.short_description || product.description?.substring(0, 100) + '...' || 'Отличный товар'}
                    </p>
                    <div className="product-price">
                      <span className="current-price">₽{product.price.toLocaleString()}</span>
                      {product.old_price && (
                        <span className="old-price">₽{product.old_price.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="product-footer">
                      <span className="store-name">{product.store_name}</span>
                      <span className="product-views">{product.views} просмотров</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Кнопка "Загрузить еще" */}
            {hasMore && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="button-spinner"></div>
                      Загружаем...
                    </>
                  ) : (
                    'Показать еще товары'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .category-page {
          min-height: calc(100vh - 200px);
          padding: var(--spacing-lg) 0;
        }

        .category-header {
          background: var(--surface);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          margin-bottom: var(--spacing-xl);
          position: relative;
          overflow: hidden;
        }

        .category-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
        }

        .back-button {
          position: absolute;
          top: var(--spacing-md);
          left: var(--spacing-md);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .back-button:hover {
          background: var(--accent-soft);
          color: var(--accent-hover);
          transform: translateX(-2px);
        }

        .category-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          padding-top: var(--spacing-lg);
        }

        .category-icon {
          font-size: 64px;
          width: 80px;
          height: 80px;
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-md);
          flex-shrink: 0;
        }

        .category-details {
          flex: 1;
          min-width: 0;
        }

        .category-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
          line-height: 1.2;
        }

        .category-description {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          line-height: 1.5;
        }

        .category-stats {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        .products-count {
          color: var(--accent);
          font-weight: 600;
        }

        .separator {
          opacity: 0.5;
        }

        .category-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .product-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .product-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          transition: left 0.4s ease;
        }

        .product-card:hover::before {
          left: 0;
        }

        .product-card:hover {
          transform: translateY(-6px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        .product-image {
          position: relative;
          width: 100%;
          height: 180px;
          border-radius: var(--radius-md);
          overflow: hidden;
          margin-bottom: var(--spacing-md);
          background: var(--surface-elevated);
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-3xl);
          color: var(--text-muted);
          background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
        }

        .theme-dark .product-placeholder {
          background: linear-gradient(135deg, var(--gray-800), var(--gray-700));
        }

        .discount-badge {
          position: absolute;
          top: var(--spacing-sm);
          right: var(--spacing-sm);
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 700;
          box-shadow: var(--shadow-md);
        }

        .product-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .product-title {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }

        .product-price {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-top: auto;
        }

        .current-price {
          color: var(--accent);
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .old-price {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
          text-decoration: line-through;
        }

        .product-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--border-light);
          font-size: var(--font-size-xs);
        }

        .store-name {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .product-views {
          color: var(--text-muted);
        }

        .load-more-container {
          text-align: center;
          margin-top: var(--spacing-xl);
        }

        .load-more-btn {
          padding: var(--spacing-md) var(--spacing-2xl);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-base);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          box-shadow: var(--shadow-md);
          margin: 0 auto;
        }

        .load-more-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .load-more-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: var(--spacing-2xl);
          color: var(--text-muted);
        }

        .loading-spinner, .button-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border-width: 2px;
        }

        .error-icon, .empty-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-lg);
          opacity: 0.6;
        }

        .error-state h3, .empty-state h3 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .error-state p, .empty-state p {
          margin: 0 0 var(--spacing-lg) 0;
          line-height: 1.5;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
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

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .category-info {
            flex-direction: column;
            text-align: center;
            gap: var(--spacing-md);
          }

          .category-icon {
            width: 64px;
            height: 64px;
            font-size: 48px;
          }

          .category-title {
            font-size: var(--font-size-2xl);
          }

          .back-button {
            position: static;
            margin-bottom: var(--spacing-md);
            align-self: flex-start;
          }
        }

        @media (max-width: 480px) {
          .category-page {
            padding: var(--spacing-md) 0;
          }

          .category-header {
            padding: var(--spacing-lg);
          }

          .products-grid {
            grid-template-columns: 1fr;
            gap: var(--spacing-md);
          }

          .product-image {
            height: 160px;
          }

          .category-stats {
            flex-direction: column;
            gap: var(--spacing-xs);
          }

          .separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}