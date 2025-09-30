// frontend/src/pages/Home.jsx - ИСПРАВЛЕНО: убраны прямоугольники, исправлен поиск
import React, { useEffect, useState, useCallback, useMemo } from "react";
import BannerCarousel from "../components/BannerCarousel";
import LoadingSpinner from "../components/LoadingSpinner";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { storesAPI } from "../services/api";

// Кеш данных
const dataCache = {
  get: (key) => {
    try {
      const item = localStorage.getItem(`voidshop_cache_${key}`);
      if (!item) return null;
      const parsed = JSON.parse(item);
      return Date.now() > parsed.expires ? null : parsed.data;
    } catch { return null; }
  },
  set: (key, data, ttl = 300000) => {
    try {
      localStorage.setItem(`voidshop_cache_${key}`, JSON.stringify({
        data, expires: Date.now() + ttl
      }));
    } catch {}
  }
};

// Мемоизированный компонент товара
const ProductCard = React.memo(({ product, onProductClick }) => {
  const handleClick = useCallback(() => {
    onProductClick(product);
  }, [product, onProductClick]);

  return (
    <div className="product-card" onClick={handleClick}>
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
        <h4 className="product-title">{product.title}</h4>
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
  );
});

export default function Home({ city = "Москва", user, onNavigateToCategory, onProductClick, onCatalogClick }) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Загрузка данных
  const loadInitialData = useCallback(async (forceReload = false) => {
    const cacheKey = `home_data_${city}`;

    if (!forceReload) {
      const cachedData = dataCache.get(cacheKey);
      if (cachedData?.products) {
        setProducts(cachedData.products);
        setDataLoaded(true);
        setCurrentPage(Math.ceil(cachedData.products.length / 20));
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const productsData = await storesAPI.searchProducts("", { city, limit: 20 });
      const result = { products: productsData || [] };

      setProducts(result.products);
      setHasMoreProducts(result.products.length === 20);
      setCurrentPage(1);
      dataCache.set(cacheKey, result);
      setDataLoaded(true);

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [city]);

  // Загрузка дополнительных товаров
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMoreProducts) return;

    setLoadingMore(true);
    try {
      const offset = currentPage * 20;
      const moreProducts = await storesAPI.searchProducts("", {
        city,
        limit: 20,
        offset
      });

      if (moreProducts && moreProducts.length > 0) {
        setProducts(prev => [...prev, ...moreProducts]);
        setCurrentPage(prev => prev + 1);
        setHasMoreProducts(moreProducts.length === 20);

        // Обновляем кеш
        const cacheKey = `home_data_${city}`;
        const updatedData = { products: [...products, ...moreProducts] };
        dataCache.set(cacheKey, updatedData);
      } else {
        setHasMoreProducts(false);
      }
    } catch (error) {
      console.error('Ошибка загрузки дополнительных товаров:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [city, currentPage, products, loadingMore, hasMoreProducts]);

  // Pull-to-refresh
  const { isRefreshing, pullDistance, showIndicator } = usePullToRefresh(
    useCallback(async () => {
      await loadInitialData(true);
    }, [loadInitialData]),
    80
  );

  useEffect(() => {
    loadInitialData(false);
  }, [city, loadInitialData]);

  // ИСПРАВЛЕНО: Поиск с правильным debounce
  const handleSearch = useCallback(async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await storesAPI.searchProducts(trimmedQuery, { city, limit: 20 });
      setSearchResults(results || []);
    } catch (error) {
      console.error('Ошибка поиска:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [city]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== searchQuery) { // Избегаем повторных запросов
        handleSearch(query);
      }
    }, 500); // Увеличиваем debounce до 500ms

    return () => clearTimeout(timer);
  }, [query]);

  // ИСПРАВЛЕНО: Запоминаем последний поисковый запрос
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const handleProductClick = useCallback((product) => {
    if (onProductClick) {
      onProductClick(product);
    }
  }, [onProductClick]);

  // ИСПРАВЛЕНО: Очистка поискового запроса
  const clearSearch = useCallback(() => {
    setQuery("");
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // Отображение результатов поиска или контента
  const showSearchResults = query.trim().length >= 2;
  const hasSearchResults = searchResults.length > 0;

  if (loading && !dataLoaded) {
    return <LoadingSpinner text="Загружаем каталог" icon="🏪" />;
  }

  return (
    <div className="home-page">
      {/* Pull-to-refresh indicator */}
      {showIndicator && (
        <div className="pull-refresh-indicator">
          <div className="refresh-icon">
            {isRefreshing ? '🔄' : pullDistance > 70 ? '⬆️' : '⬇️'}
          </div>
          <span className="refresh-text">
            {isRefreshing ? 'Обновляем...' : pullDistance > 70 ? 'Отпустите для обновления' : 'Потяните для обновления'}
          </span>
        </div>
      )}

      {/* ИСПРАВЛЕНО: Welcome без фона */}
      <div className="welcome-section">
        <h1 className="main-title">Каталог товаров</h1>
        <div className="main-subtitle">
          <span>📍</span>
          <span>{city}</span>
          {products.length > 0 && <span>• {products.length}+ товаров</span>}
        </div>
      </div>

      {/* ИСПРАВЛЕНО: Поиск без прямоугольника + исправлен крестик */}
      <div className="search-section">
        <div className="search-container">
          <div className="search-icon">
            {isSearching ? (
              <div className="search-spinner"></div>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            )}
          </div>
          <input
            type="search"
            placeholder="Поиск товаров..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          {/* ИСПРАВЛЕНО: Крестик очистки поиска не наслаивается на лупу */}
          {query && (
            <button className="search-clear" onClick={clearSearch} type="button">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Banner - показываем только если нет поиска */}
      {!showSearchResults && <BannerCarousel height={180} autoplayMs={5000} />}

      {/* Error State */}
      {error && !showSearchResults && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button onClick={() => loadInitialData(true)} className="btn btn-primary">Повробовать снова</button>
        </div>
      )}

      {/* Content */}
      <div className="main-content">
        {showSearchResults ? (
          // Результаты поиска
          <div className="search-results">
            {/* ИСПРАВЛЕНО: Заголовок результатов без фона */}
            <div className="section-title">
              Результаты поиска "{query}"
              <div className="section-subtitle">
                {isSearching ? 'Ищем...' : hasSearchResults ? `${searchResults.length} товаров найдено` : 'Ничего не найдено'}
              </div>
            </div>

            {hasSearchResults ? (
              <div className="products-grid">
                {searchResults.map((product) => (
                  <ProductCard key={product.id} product={product} onProductClick={handleProductClick} />
                ))}
              </div>
            ) : !isSearching && (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>Ничего не найдено</h3>
                <p>Попробуйте изменить поисковый запрос или выберите другую категорию</p>
              </div>
            )}
          </div>
        ) : (
          // Основной контент
          <div className="products-section">
            {/* ИСПРАВЛЕНО: Заголовок раздела без фона, по центру */}
            <div className="section-title">
              Популярные товары
              <div className="section-subtitle">Товары с высоким рейтингом в {city}</div>
            </div>

            {products.length > 0 ? (
              <>
                <div className="products-grid">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onProductClick={handleProductClick} />
                  ))}
                </div>

                {/* Кнопки действий */}
                <div className="actions-section">
                  {hasMoreProducts ? (
                    <button
                      className={`btn-primary ${loadingMore ? 'loading' : ''}`}
                      onClick={loadMoreProducts}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <div className="button-spinner"></div>
                          Загружаем...
                        </>
                      ) : (
                        <>
                          <span>📦</span>
                          Загрузить еще товары
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="all-loaded">Все товары загружены</div>
                  )}

                  <button className="btn-secondary" onClick={onCatalogClick}>
                    <span>📂</span>
                    Показать каталог
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>Товары загружаются</h3>
                <p>Скоро здесь появятся популярные товары</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* СТИЛИ */}
      <style>{`
        .home-page {
          padding: var(--spacing-lg) 0;
        }

        /* ИСПРАВЛЕНО: Welcome секция без фона */
        .welcome-section {
          margin-bottom: var(--spacing-xl);
          text-align: center;
        }

        .main-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
        }

        .main-subtitle {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          color: var(--text-muted);
          font-size: var(--font-size-base);
        }

        /* ИСПРАВЛЕНО: Поиск без фона */
        .search-section {
          margin-bottom: var(--spacing-xl);
        }

        .search-container {
          position: relative;
          max-width: 400px;
          margin: 0 auto;
        }

        .search-input {
          width: 100%;
          padding: var(--spacing-md) var(--spacing-2xl) var(--spacing-md) 50px;
          border: 2px solid var(--border);
          border-radius: var(--radius-2xl);
          background: var(--surface);
          color: var(--text-primary);
          font-size: var(--font-size-base);
          transition: all 0.3s ease;
        }

        .search-input:focus {
          border-color: var(--accent);
          background: var(--surface-elevated);
          box-shadow: 0 0 0 4px var(--accent-soft);
        }

        .search-icon {
          position: absolute;
          left: var(--spacing-md);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 2;
        }

        .search-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-top: 2px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* ИСПРАВЛЕНО: Крестик очистки не наслаивается на лупу */
        .search-clear {
          position: absolute;
          right: var(--spacing-md);
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border: none;
          background: var(--text-muted);
          color: var(--primary-white);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          z-index: 3;
        }

        .search-clear:hover {
          background: var(--accent);
          transform: translateY(-50%) scale(1.1);
        }

        /* ИСПРАВЛЕНО: Заголовки секций без фона, по центру */
        .section-title {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .section-title {
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--spacing-sm);
        }

        .section-subtitle {
          color: var(--text-secondary);
          font-size: var(--font-size-base);
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
          height: 160px;
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

        .product-price {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
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
          margin-top: auto;
        }

        .store-name {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .product-views {
          color: var(--text-muted);
        }

        .actions-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-md);
        }

        .all-loaded {
          color: var(--text-muted);
          font-size: var(--font-size-sm);
          text-align: center;
        }

        .pull-refresh-indicator {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          background: var(--surface-elevated);
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          box-shadow: var(--shadow-md);
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 480px) {
          .products-grid {
            gap: var(--spacing-md);
          }

          .product-image {
            height: 140px;
          }

          .product-title {
            font-size: var(--font-size-sm);
          }

          .current-price {
            font-size: var(--font-size-base);
          }
        }
      `}</style>
    </div>
  );
}