// frontend/src/pages/Profile.jsx (ПОЛНАЯ ВЕРСИЯ С ИСПРАВЛЕННЫМ БАЛАНСОМ)
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CitySelector from "../components/CitySelector";

export default function Profile({ city, setCity, user, telegramUser }) {
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [localCity, setLocalCity] = useState(city || "Москва");

  useEffect(() => {
    setLocalCity(city);
  }, [city]);

  function handleCitySelect(selectedCity) {
    setLocalCity(selectedCity);
    setCity?.(selectedCity);
    setShowCitySelector(false);
  }

  const userData = user || {};
  const tgData = telegramUser || {};

  const displayName = userData.first_name || tgData.first_name || userData.username || tgData.username || 'Пользователь';
  const fullName = `${userData.first_name || tgData.first_name || ''} ${userData.last_name || tgData.last_name || ''}`.trim();
  const username = userData.username || tgData.username;
  const registrationDate = userData.registered_at ? new Date(userData.registered_at).toLocaleDateString('ru-RU') : 'Недавно';
  const balance = userData.balance || 0;
  const isVerified = userData.is_verified || false;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-placeholder">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {isVerified && (
            <div className="verified-badge" title="Верифицированный пользователь">
              ✓
            </div>
          )}
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{fullName || displayName}</h2>
          {username && (
            <p className="profile-username">@{username}</p>
          )}
          <div className="profile-stats">
            <span className="level-badge">1 уровень</span>
            <span className="balance">₽ {balance.toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <h3 className="card-title">Мой профиль</h3>
        <div className="profile-details">
          <div className="detail-item">
            <span className="detail-label">Регистрация:</span>
            <span className="detail-value">{registrationDate}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Город:</span>
            <div className="detail-value-with-action">
              <span className="detail-value">{localCity}</span>
              <button onClick={() => setShowCitySelector(true)} className="change-city-btn">
                Изменить
              </button>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-label">Количество сделок:</span>
            <span className="detail-value">0</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Средний чек:</span>
            <span className="detail-value">0 ₽</span>
          </div>
        </div>
      </div>

      <div className="profile-card">
        <h3 className="card-title">Быстрые действия</h3>
        <div className="quick-actions">
          <button className="action-btn primary">
            <span className="action-icon">💳</span>
            <span>Пополнить баланс</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📋</span>
            <span>История операций</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">⭐</span>
            <span>Мои отзывы</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">🎰</span>
            <span>Рулетка</span>
          </button>
        </div>
      </div>

      {showCitySelector && createPortal(
        <CitySelector onSelect={handleCitySelect} defaultCity={localCity} />,
        document.body
      )}

      <style jsx>{`
        .profile-page {
          padding: var(--spacing-lg) 0;
          min-height: calc(100vh - 200px);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          padding: var(--spacing-lg);
          background: var(--surface);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }

        .profile-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
        }

        .profile-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-2xl);
          font-weight: 700;
          color: var(--primary-white);
          box-shadow: var(--shadow-lg);
        }

        .verified-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          box-shadow: var(--shadow-md);
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .profile-username {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .profile-stats {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
        }

        .level-badge {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        /* ИСПРАВЛЕННЫЙ БАЛАНС ДЛЯ ТЕМНОЙ ТЕМЫ */
        .balance {
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-sm);
          font-weight: 700;
          border: 1px solid var(--border);
          transition: all 0.3s ease;
          /* Светлая тема */
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          color: #1f2937;
        }

        /* Темная тема - ИСПРАВЛЕНО */
        :global(html.theme-dark) .balance {
          background: linear-gradient(135deg, #374151, #4b5563);
          color: #f9fafb;
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .profile-card {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
          margin-bottom: var(--spacing-lg);
          transition: all 0.3s ease;
        }

        .profile-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .card-title {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .profile-details {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-light);
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-label {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          font-weight: 500;
        }

        .detail-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .detail-value-with-action {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .change-city-btn {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border: 1px solid var(--accent);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .change-city-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: translateY(-1px);
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-md);
        }

        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-lg);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          position: relative;
          overflow: hidden;
        }

        .action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
          transition: left 0.5s;
        }

        .action-btn:hover::before {
          left: 100%;
        }

        .action-btn:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
          color: var(--text-primary);
        }

        .action-btn.primary {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border-color: transparent;
          box-shadow: var(--shadow-md);
        }

        .action-btn.primary:hover {
          box-shadow: var(--shadow-xl);
          transform: translateY(-6px);
        }

        .action-icon {
          font-size: var(--font-size-xl);
          margin-bottom: var(--spacing-xs);
        }

        .action-btn span:last-child {
          font-size: var(--font-size-sm);
          text-align: center;
          line-height: 1.2;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            text-align: center;
            gap: var(--spacing-md);
          }

          .avatar-placeholder {
            width: 64px;
            height: 64px;
            font-size: var(--font-size-xl);
          }

          .profile-stats {
            justify-content: center;
          }

          .quick-actions {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .profile-page {
            padding: var(--spacing-md) 0;
          }

          .profile-card {
            padding: var(--spacing-lg);
          }

          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
          }

          .detail-value-with-action {
            align-self: stretch;
            justify-content: space-between;
          }
        }

        /* Focus states */
        .change-city-btn:focus-visible,
        .action-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}