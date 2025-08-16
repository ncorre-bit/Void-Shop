// frontend/src/components/CitySelector.jsx - УЛУЧШЕННАЯ ВЕРСИЯ
import React, { useEffect, useState } from "react";
import { userAPI } from "../services/api";

const DEFAULT_CITIES = [
  'Алматы', 'Воронеж', 'Екатеринбург', 'Казань', 'Краснодар', 'Красноярск',
  'Минск', 'Москва', 'Нижний Новгород', 'Новосибирск', 'Омск', 'Пермь',
  'Ростов-на-Дону', 'Самара', 'Санкт-Петербург', 'Уфа', 'Челябинск', 'Волгоград'
].sort(); // Сортируем по алфавиту

export default function CitySelector({ onSelect, defaultCity = "Москва" }) {
  const [cities, setCities] = useState(DEFAULT_CITIES);
  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadCities();
  }, []);

  async function loadCities() {
    try {
      const response = await userAPI.getCities();
      if (response.cities && Array.isArray(response.cities)) {
        // Сортируем города по алфавиту
        const sortedCities = response.cities.sort((a, b) => a.localeCompare(b, 'ru'));
        setCities(sortedCities);
      }
    } catch (error) {
      console.error('Ошибка загрузки городов:', error);
      // Используем дефолтный отсортированный список
    }
  }

  function handleSelect() {
    if (!selectedCity) return;
    setLoading(true);

    // Имитируем небольшую задержку для плавности
    setTimeout(() => {
      onSelect?.(selectedCity);
    }, 300);
  }

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => a.localeCompare(b, 'ru')); // Дополнительная сортировка отфильтрованных

  return (
    <div className="city-selector-backdrop">
      <div className="city-selector-card">
        {/* Header */}
        <div className="city-selector-header">
          <div className="city-selector-logo">📍</div>
          <h2 className="city-selector-title">Выберите ваш город</h2>
          <p className="city-selector-subtitle">
            Это поможет показывать актуальную информацию о магазинах в вашем регионе
          </p>
        </div>

        {/* Search */}
        <div className="city-search-container">
          <input
            type="search"
            placeholder="Найти город..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="city-search-input"
          />
        </div>

        {/* Cities Grid - показываем ВСЕ города */}
        <div className="cities-grid">
          {filteredCities.map((city) => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`city-item ${selectedCity === city ? 'selected' : ''}`}
            >
              <span className="city-name">{city}</span>
              {selectedCity === city && <span className="city-check">✓</span>}
            </button>
          ))}
        </div>

        {filteredCities.length === 0 && (
          <div className="no-cities">
            <span>🔍</span>
            <p>Город не найден</p>
          </div>
        )}

        {/* Actions */}
        <div className="city-selector-actions">
          <button
            onClick={handleSelect}
            disabled={!selectedCity || loading}
            className="city-continue-btn"
          >
            {loading ? (
              <>
                <div className="button-spinner"></div>
                Подождите...
              </>
            ) : (
              <>
                <span>→</span>
                Продолжить
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .city-selector-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1500;
          animation: fadeIn 0.3s ease;
          padding: var(--spacing-lg);
        }

        .city-selector-card {
          width: 100%;
          max-width: 520px;
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border);
          animation: slideUp 0.4s ease;
          max-height: 90vh;
          overflow-y: auto;
        }

        .city-selector-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .city-selector-logo {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-2xl);
          margin: 0 auto var(--spacing-md) auto;
          box-shadow: var(--shadow-lg);
        }

        .city-selector-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .city-selector-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          line-height: 1.5;
        }

        .city-search-container {
          margin-bottom: var(--spacing-lg);
        }

        .city-search-input {
          width: 100%;
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-lg);
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          font-size: var(--font-size-base);
          transition: all 0.3s ease;
        }

        .city-search-input:focus {
          border-color: var(--accent);
          background: var(--primary-white);
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
        }

        :global(.theme-dark) .city-search-input:focus {
          background: var(--surface-elevated);
        }

        .cities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-xl);
          max-height: 350px;
          overflow-y: auto;
          padding: var(--spacing-xs);
        }

        .city-item {
          position: relative;
          padding: var(--spacing-md);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          color: var(--text-primary);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
          font-weight: 500;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-xs);
          min-height: 60px;
          justify-content: center;
        }

        .city-item:hover {
          border-color: var(--accent);
          background: rgba(139, 92, 246, 0.05);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .city-item.selected {
          border-color: var(--accent);
          background: linear-gradient(135deg,
            rgba(139, 92, 246, 0.15),
            rgba(124, 58, 237, 0.1)
          );
          color: var(--accent-hover);
          font-weight: 600;
        }

        .city-name {
          font-size: var(--font-size-sm);
        }

        .city-check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent);
          color: var(--primary-white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }

        .no-cities {
          text-align: center;
          color: var(--text-muted);
          padding: var(--spacing-2xl);
        }

        .no-cities span {
          font-size: var(--font-size-2xl);
          display: block;
          margin-bottom: var(--spacing-sm);
          opacity: 0.6;
        }

        .city-selector-actions {
          display: flex;
          justify-content: center;
        }

        .city-continue-btn {
          width: 100%;
          padding: var(--spacing-md) var(--spacing-xl);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border-radius: var(--radius-lg);
          border: none;
          font-weight: 600;
          font-size: var(--font-size-lg);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          transition: all 0.3s ease;
          box-shadow: var(--shadow-md);
        }

        .city-continue-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .city-continue-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .city-continue-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
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

        @media (max-width: 480px) {
          .cities-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .city-selector-card {
            padding: var(--spacing-lg);
            max-height: 85vh;
          }

          .city-item {
            min-height: 50px;
            padding: var(--spacing-sm);
          }

          .city-name {
            font-size: var(--font-size-xs);
          }
        }
      `}</style>
    </div>
  );
}