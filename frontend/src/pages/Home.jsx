// frontend/src/pages/Home.jsx - ИСПРАВЛЕНО: окно поиска по центру, без заглушек
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import BannerCarousel from "../components/BannerCarousel";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { storesAPI } from "../services/api";

// Кеш данных для оптимизации
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

export default function Home({ city = "Москва", user, onNavigateToCategory, onProductClick }) {
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const inputRef = useRef(null);

  // Загрузка начальных данных
  const loadInitialData = useCallback(async (forceReload = false) => {
    const cacheKey = `home_data_${city}`;

    if (!forceReload) {
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        setStores(cachedData.stores || []);
        setCategories(cachedData.categories || []);
        setDataLoaded(true);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const [categoriesData, storesData] = await Promise.all([
        storesAPI.getCategories(),
        storesAPI.getStores({ city, limit: 20 })
      ]);

      const result = {
        categories: categoriesData || [],
        stores: storesData || []
      };

      setCategories(result.categories);
      setStores(result.stores);
      dataCache.set(cacheKey, result);
      setDataLoaded(true);

    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError('Не удалось загрузить данные');

      // Пробуем взять из кеша
      const cachedData = dataCache.get(cacheKey);
      if (cachedData) {
        setStores(cachedData.stores || []);
        setCategories(cachedData.categories || []);
        setDataLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [city]);

  const { isRefreshing, pullDistance, showIndicator } = usePullToRefresh(
    useCallback(async () => {
      await loadInitialData(true);
    }, [loadInitialData]),
    80
  );

  useEffect(() => {
    loadInitialData(false);
  }, [city, loadInitialData]);

  // ИСПРАВЛЕННЫЙ поиск товаров
  const handleSearch = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const searchQuery = (query || "").trim();
    if (!searchQuery) {
      inputRef.current?.focus();
      return;
    }

    if (searchQuery.length < 2) {
      console.warn("Минимум 2 символа для поиска");
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Выполняем поиск:', searchQuery);

      const results = await storesAPI.searchProducts(searchQuery, {
        city,
        limit: 50
      });

      console.log('📦 Результаты поиска:', results);

      setSearchResults({
        query: searchQuery,
        products: results || [],
        isEmpty: !results || results.length === 0
      });
      setShowSearchResults(true);

    } catch (error) {
      console.error('❌ Ошибка поиска:', error);
      setSearchResults({
        query: searchQuery,
        products: [],
        isEmpty: true,
        error: error.message
      });
      setShowSearchResults(true);
    } finally {
      setLoading(false);
    }
  }, [query, city]);

  // Клик по товару - БЕЗ ALERT заглушек
  const handleProductClick = useCallback((product) => {
    if (onProductClick) {
      onProductClick(product);
    }
  }, [onProductClick]);

  // Клик по категории - БЕЗ ALERT заглушек
  const handleCategoryClick = useCallback((category) => {
    console.log("📂 Переход к категории:", category.slug);
    if (onNavigateToCategory) {
      onNavigateToCategory(category);
    }
  }, [onNavigateToCategory]);

  const MemoizedBanner = useMemo(() => <BannerCarousel height={180} autoMs={4000} />, []);

  // Состояние загрузки
  if (loading && !dataLoaded) {
    return (
      <div className="home-page">
        <div className="loading-state">
          <div className="loading-container">
            <div className="loading-logo">🏪</div>
            <div className="loading-spinner-modern"></div>
            <h3 className="loading-title">Загружаем каталог</h3>
            <p className="loading-subtitle">Подготавливаем для вас лучшие товары...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* ИСПРАВЛЕННЫЙ Pull-to-refresh indicator */}
      {showIndicator && (
        <div
          className="pull-to-refresh-indicator"
          style={{
            transform: `translateX(-50%) translateY(${Math.min(pullDistance * 0.8, 64)}px)`,
            opacity: Math.min(pullDistance / 40, 1)
          }}
        >
          <div className={`refresh-spinner ${isRefreshing ? 'spinning' : ''}`}>
            {isRefreshing ? '🔄' : pullDistance > 70 ? '⬆️' : '⬇️'}
          </div>
          <span className="refresh-text">
            {isRefreshing ? 'Обновляем...' : pullDistance > 70 ? 'Отпустите для обновления' : 'Потяните для обновления'}
          </span>
        </div>
      )}

      {/* ИСПРАВЛЕННОЕ Search Modal - теперь СТРОГО по центру экрана */}
      {showSearchResults && searchResults && (
        <div className="search-modal-backdrop" onClick={() => setShowSearchResults(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <button className="search-close-btn" onClick={() => setShowSearchResults(false)}>✕</button>
              <div className="search-info">
                <h2 className="search-title">Результаты поиска</h2>
                <p className="search-query">«{searchResults.query}»</p>
                <p className="search-stats">
                  {searchResults.isEmpty ? 'Ничего не найдено' : `Найдено товаров: ${searchResults.products.length}`}
                </p>
              </div>
            </div>

            <div className="search-results">
              {searchResults.isEmpty ? (
                <div className="empty-search">
                  <div className="empty-icon">🔍</div>
                  <h3>Ничего не найдено</h3>
                  <p>
                    {searchResults.error ?
                      `Произошла ошибка: ${searchResults.error}` :
                      'Попробуйте изменить поисковый запрос или выберите другую категорию'
                    }
                  </p>
                  <button className="try-again-btn" onClick={() => setShowSearchResults(false)}>
                    Попробовать снова
                  </button>
                </div>
              ) : (
                <div className="search-products-grid">
                  {searchResults.products.map((product) => (
                    <div key={product.id} className="search-product-card" onClick={() => handleProductClick(product)}>
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
                        <p className="product-description">
                          {product.short_description || product.description?.substring(0, 100) + '...' || 'Качественный товар'}
                        </p>
                        <div className="product-price">
                          <span className="current-price">₽{product.price.toLocaleString()}</span>
                          {product.old_price && (
                            <span className="old-price">₽{product.old_price.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="product-meta">
                          <span className="store-name">{product.store_name}</span>
                          <span className="product-views">{product.views} просмотров</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="page-title">Каталог товаров</h1>
        <div className="location-info">
          <span className="location-icon">📍</span>
          <span className="location-text">{city}</span>
          {categories.length > 0 && (
            <span className="stores-count">• {categories.length} категорий</span>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-container">
            <input
              ref={inputRef}
              type="search"
              placeholder="Поиск товаров..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
              disabled={loading}
            />
            <button type="submit" disabled={loading} className="search-button">
              {loading ? (
                <div className="button-spinner"></div>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              )}
              <span className="search-text">Найти</span>
            </button>
          </div>
        </form>
      </div>

      {/* Banner */}
      {MemoizedBanner}

      {/* Error State */}
      {error && (
        <div className="error-section">
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <h3>Ошибка загрузки</h3>
            <p>{error}</p>
            <button onClick={() => loadInitialData(true)} className="retry-btn">
              Попробовать снова
            </button>
          </div>
        </div>
      )}

      {/* Популярные категории */}
      <div className="categories-section">
        <div className="section-header">
          <h3 className="section-title">Популярные категории</h3>
          <p className="section-subtitle">Выберите категорию для просмотра товаров</p>
        </div>

        {categories.length === 0 && !loading ? (
          <div className="empty-categories">
            <div className="empty-icon">📦</div>
            <h3>Пока нет категорий</h3>
            <p>Категории товаров появятся позже</p>
          </div>
        ) : (
          <div className="categories-grid">
            {categories.map((category) => (
              <div
                key={category.id}
                className="category-card"
                onClick={() => handleCategoryClick(category)}
              >
                <div className="category-icon">{category.icon || '📦'}</div>
                <div className="category-info">
                  <h4 className="category-name">{category.name}</h4>
                  <p className="category-count">{category.products_count} товаров</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .home-page {
          padding: var(--spacing-md) 0;
          min-height: calc(100vh - 200px);
          position: relative;
        }

        /* ИСПРАВЛЕННЫЙ Pull-to-refresh indicator */
        .pull-to-refresh-indicator {
          position: fixed;
          top: 0;
          left: 50%;
          z-index: 1500;
          padding: var(--spacing-md) var(--spacing-xl);
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          border: 1px solid var(--border);
          border-top: none;
          min-width: 240px;
          justify-content: center;
          transform: translateX(-50%);
        }

        /* ИСПРАВЛЕННОЕ Search Modal - СТРОГО ПО ЦЕНТРУ */
        .search-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          z-index: 1700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg);
          animation: fadeIn 0.3s ease;
        }

        .search-modal {
          width: 100%;
          max-width: 900px;
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
          transform: translateX(0) translateY(0); /* ПРИНУДИТЕЛЬНОЕ ЦЕНТРИРОВАНИЕ */
        }

        .search-modal-header {
          padding: var(--spacing-xl);
          border-bottom: 1px solid var(--border);
          position: relative;
          background: linear-gradient(135deg, var(--accent-soft), transparent);
          flex-shrink: 0;
        }

        .search-close-btn {
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

        .search-close-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: scale(1.1);
        }

        .search-info {
          text-align: center;
        }

        .search-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .search-query {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--accent);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .search-stats {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .search-results {
          flex: 1;
          padding: var(--spacing-xl);
          overflow-y: auto;
        }

        .empty-search, .empty-categories {
          text-align: center;
          padding: var(--spacing-2xl);
          color: var(--text-muted);
        }

        .empty-search .empty-icon, .empty-categories .empty-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-lg);
          opacity: 0.6;
        }

        .empty-search h3 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .empty-search p {
          margin: 0 0 var(--spacing-lg) 0;
          line-height: 1.5;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .try-again-btn, .retry-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--accent);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .try-again-btn:hover, .retry-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .search-products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--spacing-lg);
        }

        .search-product-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          cursor: pointer;
          overflow: hidden;
          position: relative;
        }

        .search-product-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        .search-product-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          transition: left 0.4s ease;
        }

        .search-product-card:hover::before {
          left: 0;
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

        .product-meta {
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

        .welcome-section {
          margin-bottom: var(--spacing-xl);
          text-align: center;
        }

        .page-title {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
          background: linear-gradient(135deg, var(--text-primary), var(--accent));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .location-info {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-xl);
          font-weight: 600;
          font-size: var(--font-size-sm);
        }

        .stores-count {
          color: var(--text-muted);
          font-weight: 500;
        }

        .search-section {
          margin-bottom: var(--spacing-lg);
        }

        .search-container {
          display: flex;
          gap: var(--spacing-md);
          align-items: stretch;
          max-width: 600px;
          margin: 0 auto;
        }

        .search-input {
          flex: 1;
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-xl);
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          font-size: var(--font-size-base);
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }

        .search-input:focus {
          border-color: var(--accent);
          background: var(--surface-elevated);
          box-shadow: 0 0 0 4px var(--accent-soft);
          transform: translateY(-1px);
        }

        .search-button {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-xl);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-xl);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-md);
        }

        .search-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .search-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-section {
          margin: var(--spacing-xl) 0;
        }

        .error-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          text-align: center;
          border: 1px solid rgba(245, 101, 101, 0.2);
          box-shadow: var(--shadow-md);
        }

        .categories-section {
          margin-bottom: var(--spacing-xl);
        }

        .section-header {
          margin-bottom: var(--spacing-xl);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .section-title {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .section-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--spacing-md);
        }

        .category-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          cursor: pointer;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .category-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
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
          font-size: var(--font-size-3xl);
          margin-bottom: var(--spacing-md);
          display: block;
        }

        .category-name {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
        }

        .category-count {
          margin: 0;
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .refresh-spinner {
          font-size: var(--font-size-xl);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
        }

        .refresh-spinner.spinning {
          animation: smoothSpin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .refresh-text {
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
          white-space: nowrap;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          padding: var(--spacing-2xl);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-lg);
          text-align: center;
          max-width: 400px;
        }

        .loading-logo {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-xl);
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-2xl);
          animation: logoFloat 3s ease-in-out infinite;
          box-shadow: var(--shadow-lg);
          position: relative;
        }

        .loading-spinner-modern {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        .loading-title {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .loading-subtitle {
          margin: 0;
          color: var(--text-muted);
          font-size: var(--font-size-base);
          line-height: 1.5;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes smoothSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
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

        @keyframes logoFloat {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          33% {
            transform: translateY(-8px) scale(1.02);
          }
          66% {
            transform: translateY(4px) scale(0.98);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .search-container {
            flex-direction: column;
            gap: var(--spacing-sm);
          }

          .search-products-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          }

          .search-modal {
            margin: var(--spacing-sm);
            max-height: 95vh;
          }

          .search-modal-header {
            padding: var(--spacing-lg);
          }

          .search-results {
            padding: var(--spacing-lg);
          }

          .categories-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          }
        }

        @media (max-width: 480px) {
          .home-page {
            padding: var(--spacing-sm) 0;
          }

          .page-title {
            font-size: var(--font-size-2xl);
          }

          .search-products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-md);
          }

          .search-product-card {
            padding: var(--spacing-sm);
          }

          .product-image {
            height: 140px;
          }

          .categories-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .category-card {
            padding: var(--spacing-md);
          }

          .category-icon {
            font-size: var(--font-size-2xl);
          }

          .pull-to-refresh-indicator {
            min-width: 200px;
          }
        }
      `}</style>
    </div>
  );
}