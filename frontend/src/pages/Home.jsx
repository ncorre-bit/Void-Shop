// frontend/src/pages/Home.jsx (исправленный)
import React, { useRef, useState } from "react";
import BannerCarousel from "../components/BannerCarousel";

export default function Home({ city = "Москва", user }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const stores = [
    { id: 1, name: "Электроника Plus", description: "Смартфоны, ноутбуки, аксессуары", rating: 4.8 },
    { id: 2, name: "Fashion Store", description: "Модная одежда и обувь", rating: 4.6 },
    { id: 3, name: "Дом и сад", description: "Товары для дома и дачи", rating: 4.7 },
    { id: 4, name: "Спорт-центр", description: "Спортивные товары и экипировка", rating: 4.5 },
    { id: 5, name: "Книжный мир", description: "Книги, канцтовары, подарки", rating: 4.9 },
    { id: 6, name: "Авто-запчасти", description: "Запчасти и аксессуары для авто", rating: 4.4 },
  ];

  function onSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    const text = (query || "").trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    // TODO: реальный поиск — пока заглушка
    console.log(`Поиск: ${text}`);
    alert(`Ищем: "${text}"\n(Функция поиска в разработке)`);
    inputRef.current?.focus();
  }

  function handleStoreClick(store) {
    console.log("Открываем магазин:", store);
    alert(`Открываем магазин "${store.name}"\n(Страница магазина в разработке)`);
  }

  return (
    <div className="home-page">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="page-title">Каталог магазинов</h1>
        <div className="location-info">
          <span className="location-icon">📍</span>
          <span className="location-text">{city}</span>
        </div>
      </div>

      {/* Search Section */}
      <div className="search-section">
        <form onSubmit={onSearch} className="search-form">
          <div className="search-container">
            <input
              ref={inputRef}
              type="search"
              placeholder="Поиск магазина..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <span className="search-text">Найти</span>
            </button>
          </div>
        </form>
      </div>

      {/* Banner Carousel */}
      <BannerCarousel height={180} autoMs={4000} />

      {/* Category Buttons */}
      <div className="category-section">
        <div className="category-buttons">
          <button className="category-btn primary">
            <span className="category-icon">🔥</span>
            <span>ТОПовые магазины</span>
          </button>
          <button className="category-btn secondary">
            <span className="category-icon">✨</span>
            <span>Новые</span>
          </button>
          <button className="category-btn secondary">
            <span className="category-icon">💎</span>
            <span>Премиум</span>
          </button>
        </div>
      </div>

      {/* Stores Grid */}
      <div className="stores-section">
        <div className="section-header">
          <h3 className="section-title">Популярные магазины</h3>
          <p className="section-subtitle">Проверенные продавцы с высоким рейтингом</p>
        </div>

        <div className="stores-grid">
          {stores.map((store) => (
            <div
              key={store.id}
              className="store-card"
              onClick={() => handleStoreClick(store)}
              role="button"
              tabIndex="0"
              aria-label={`Открыть магазин ${store.name}`}
            >
              <div className="store-media">
                <div className="store-avatar">
                  {store.name.charAt(0)}
                </div>
                <div className="store-rating">
                  <span className="rating-star">⭐</span>
                  <span className="rating-value">{store.rating}</span>
                </div>
              </div>

              <div className="store-info">
                <h4 className="store-name">{store.name}</h4>
                <p className="store-description">{store.description}</p>
              </div>

              <div className="store-actions">
                <button className="store-action-btn">
                  Перейти →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .home-page {
          padding: var(--spacing-md) 0;
          min-height: calc(100vh - 200px);
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

        .location-icon {
          font-size: var(--font-size-base);
        }

        .search-section {
          margin-bottom: var(--spacing-lg);
        }

        .search-form {
          width: 100%;
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
          font-size: var(--font-size-base);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
          white-space: nowrap;
        }

        .search-button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .search-button:active {
          transform: translateY(0);
        }

        .search-text {
          font-family: var(--font-family-system);
        }

        .category-section {
          margin-bottom: var(--spacing-xl);
        }

        .category-buttons {
          display: flex;
          gap: var(--spacing-md);
          justify-content: center;
          flex-wrap: wrap;
        }

        .category-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-xl);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          font-size: var(--font-size-sm);
        }

        .category-btn.primary {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          box-shadow: var(--shadow-md);
        }

        .category-btn.primary:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
        }

        .category-btn.secondary {
          background: var(--surface);
          color: var(--text-secondary);
          border-color: var(--border);
          box-shadow: var(--shadow-sm);
        }

        .category-btn.secondary:hover {
          background: var(--surface-elevated);
          color: var(--text-primary);
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .category-icon {
          font-size: var(--font-size-base);
        }

        .stores-section {
          margin-bottom: var(--spacing-xl);
        }

        .section-header {
          margin-bottom: var(--spacing-xl);
          text-align: center;
        }

        .section-title {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .section-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--spacing-lg);
        }

        .store-card {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          box-shadow: var(--shadow-sm);
          border: 1px solid var(--border);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .store-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          transition: left 0.4s ease;
        }

        .store-card:hover::before {
          left: 0;
        }

        .store-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-xl);
          border-color: var(--accent);
        }

        .store-media {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-md);
        }

        .store-avatar {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--primary-white);
          box-shadow: var(--shadow-md);
        }

        .store-rating {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-soft);
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--accent-hover);
        }

        .rating-star {
          font-size: var(--font-size-sm);
        }

        .store-info {
          margin-bottom: var(--spacing-lg);
        }

        .store-name {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .store-description {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.4;
        }

        .store-actions {
          display: flex;
          justify-content: flex-end;
        }

        .store-action-btn {
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

        .store-action-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: translateX(4px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .search-container {
            flex-direction: column;
            gap: var(--spacing-sm);
          }

          .search-button {
            justify-content: center;
          }

          .stores-grid {
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: var(--spacing-md);
          }

          .category-buttons {
            flex-direction: column;
            align-items: stretch;
          }

          .category-btn {
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .home-page {
            padding: var(--spacing-sm) 0;
          }

          .page-title {
            font-size: var(--font-size-2xl);
          }

          .stores-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Focus states */
        .search-input:focus-visible,
        .search-button:focus-visible,
        .category-btn:focus-visible,
        .store-card:focus-visible,
        .store-action-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}