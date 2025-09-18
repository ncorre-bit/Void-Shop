// frontend/src/pages/Home.jsx - ИСПРАВЛЕНО: сетка 2 товара в строке + удалена кнопка "все категории"
import React, { useEffect, useState, useCallback, useMemo } from "react";
import BannerCarousel from "../components/BannerCarousel";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { storesAPI } from "../services/api";

// Кеш данных (оптимизация)
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
const ProductCard = React.memo(({ product, onClick }) => (
  <div className="product-card" onClick={() => onClick?.(product)}>
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
));

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

  // Поиск с debounce
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
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleProductClick = useCallback((product) => {
    if (onProductClick) {
      onProductClick(product);
    }
  }, [onProductClick]);

  const MemoizedBanner = useMemo(() => <BannerCarousel height={180} autoMs={5000} />, []);

  // Отображение результатов поиска или контента
  const showSearchResults = query.trim().length >= 2;
  const hasSearchResults = searchResults.length > 0;

  if (loading && !dataLoaded) {
    return (
      <div className="loading-state">
        <div className="loading-content">
          <div className="loading-logo">🏪</div>
          <div className="loading-spinner"></div>
          <h3>Загружаем каталог</h3>
          <p>Подготавливаем для вас лучшие товары...</p>
        </div>
      </div>
    );
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

      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="page-title">Каталог товаров</h1>
        <div className="location-badge">
          <span>📍</span>
          <span>{city}</span>
          {products.length > 0 && <span className="products-count">• {products.length}+ товаров</span>}
        </div>
      </div>

      {/* Search */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="search"
            placeholder="Поиск товаров..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">
            {isSearching ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Banner - показываем только если нет поиска */}
      {!showSearchResults && MemoizedBanner}

      {/* Error State */}
      {error && !showSearchResults && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h3>Ошибка загрузки</h3>
          <p>{error}</p>
          <button onClick={() => loadInitialData(true)} className="btn retry-btn">Попробовать снова</button>
        </div>
      )}

      {/* Content */}
      <div className="main-content">
        {showSearchResults ? (
          // Результаты поиска
          <div className="search-results">
            <div className="section-header">
              <h3 className="section-title">Результаты поиска "{query}"</h3>
              <p className="section-subtitle">
                {isSearching ? 'Ищем...' : hasSearchResults ? `${searchResults.length} товаров найдено` : 'Ничего не найдено'}
              </p>
            </div>

            {hasSearchResults ? (
              <div className="products-grid mobile-2-columns">
                {searchResults.map((product) => (
                  <ProductCard key={product.id} product={product} onClick={handleProductClick} />
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
            <div className="section-header">
              <h3 className="section-title">Популярные товары</h3>
              <p className="section-subtitle">Товары с высоким рейтингом в {city}</p>
            </div>

            {products.length > 0 ? (
              <>
                {/* ИСПРАВЛЕНО: Сетка 2 товара в строке на мобильных */}
                <div className="products-grid mobile-2-columns">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} onClick={handleProductClick} />
                  ))}
                </div>

                {/* ИСПРАВЛЕНО: Убрана кнопка "Все категории", только "Загрузить еще" */}
                <div className="section-actions">
                  {hasMoreProducts ? (
                    <button
                      className="btn primary load-more-btn"
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
                    <div className="all-loaded">
                      Все товары загружены
                    </div>
                  )}

                  <button
                    className="btn catalog-btn"
                    onClick={onCatalogClick}
                  >
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
    </div>
  );
}