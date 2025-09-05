// frontend/src/pages/Profile.jsx - ОБНОВЛЕНО: интеграция с BalanceSystem
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CitySelector from "../components/CitySelector";
import BalanceSystem from "../components/BalanceSystem"; // НОВОЕ

export default function Profile({ city, setCity, user, telegramUser }) {
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showBalanceSystem, setShowBalanceSystem] = useState(false); // НОВОЕ
  const [localCity, setLocalCity] = useState(city || "Москва");

  useEffect(() => {
    setLocalCity(city);
  }, [city]);

  function handleCitySelect(selectedCity) {
    setLocalCity(selectedCity);
    setCity?.(selectedCity);
    setShowCitySelector(false);
  }

  // НОВОЕ: история операций
  function handleOperationsHistory() {
    const savedRequests = JSON.parse(localStorage.getItem('voidshop_balance_requests') || '[]');
    const userRequests = savedRequests.filter(p =>
      p.tgId === (user?.tg_id || telegramUser?.id)
    );

    if (userRequests.length === 0) {
      alert("История операций пуста\nЗаявки на пополнение появятся здесь после создания");
      return;
    }

    const requestInfo = userRequests.slice(0, 5).map(p => {
      const status = {
        'pending': 'Ожидает оплаты',
        'waiting_confirmation': 'На проверке',
        'approved': 'Зачислено',
        'rejected': 'Отклонено'
      }[p.status] || p.status;

      const date = new Date(p.createdAt).toLocaleDateString('ru-RU');
      return `${p.orderId}: ₽${p.amount} - ${status} (${date})`;
    }).join('\n');

    alert(`История операций (последние 5):\n\n${requestInfo}\n\n(Детальная история в разработке)`);
  }

  function handleMyReviews() {
    alert("Мои отзывы - в разработке\nЗдесь будут показаны все ваши отзывы о товарах и магазинах");
  }

  const userData = user || {};
  const tgData = telegramUser || {};

  const displayName = userData.first_name || tgData.first_name || userData.username || tgData.username || 'Пользователь';
  const fullName = `${userData.first_name || tgData.first_name || ''} ${userData.last_name || tgData.last_name || ''}`.trim();
  const username = userData.username || tgData.username;
  const registrationDate = userData.registered_at ? new Date(userData.registered_at).toLocaleDateString('ru-RU') : 'Недавно';
  const balance = userData.balance || 0;
  const isVerified = userData.is_verified || false;
  const avatarUrl = tgData.photo_url || userData.avatar_url;

  // НОВОЕ: если показываем систему баланса
  if (showBalanceSystem) {
    return (
      <BalanceSystem
        user={user}
        telegramUser={telegramUser}
        onBack={() => setShowBalanceSystem(false)}
      />
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header card">
        <div className="profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {isVerified && <div className="verified-badge" title="Верифицированный пользователь">✓</div>}
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{fullName || displayName}</h2>
          {username && <p className="profile-username">@{username}</p>}
          <div className="profile-stats">
            <span className="level-badge">1 уровень</span>
            <span className="balance">₽{balance.toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="profile-card card">
        <h3 className="card-title">Информация о профиле</h3>
        <div className="profile-details">
          <div className="detail-item">
            <span className="detail-label">Регистрация:</span>
            <span className="detail-value">{registrationDate}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Город:</span>
            <div className="detail-value-with-action">
              <span className="detail-value">{localCity}</span>
              <button onClick={() => setShowCitySelector(true)} className="btn">Изменить</button>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-label">Telegram ID:</span>
            <span className="detail-value">{tgData.id || userData.tg_id || 'Не указан'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Покупок:</span>
            <span className="detail-value">0</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Общая сумма:</span>
            <span className="detail-value">0 ₽</span>
          </div>
        </div>
      </div>

      {/* ОБНОВЛЕННЫЕ Quick Actions */}
      <div className="profile-card card">
        <h3 className="card-title">Управление аккаунтом</h3>
        <div className="quick-actions">
          <button className="action-btn primary" onClick={() => setShowBalanceSystem(true)}>
            <span className="action-icon">💳</span>
            <div className="action-content">
              <span className="action-title">Пополнить баланс</span>
              <span className="action-description">Банковские карты, без комиссии</span>
            </div>
          </button>

          <button className="action-btn" onClick={handleOperationsHistory}>
            <span className="action-icon">📋</span>
            <div className="action-content">
              <span className="action-title">История операций</span>
              <span className="action-description">Покупки и пополнения</span>
            </div>
          </button>

          <button className="action-btn" onClick={handleMyReviews}>
            <span className="action-icon">⭐</span>
            <div className="action-content">
              <span className="action-title">Мои отзывы</span>
              <span className="action-description">Отзывы о товарах</span>
            </div>
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="profile-card card">
        <h3 className="card-title">Статистика активности</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <div className="stat-info">
              <div className="stat-value">0</div>
              <div className="stat-label">Покупок</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <div className="stat-value">0</div>
              <div className="stat-label">Отзывов</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-value">₽{balance.toLocaleString()}</div>
              <div className="stat-label">Баланс</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
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
        }

        .profile-avatar {
          position: relative;
          flex-shrink: 0;
        }

        .avatar-image {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          object-fit: cover;
          box-shadow: var(--shadow-lg);
          border: 3px solid var(--primary-white);
        }

        .theme-dark .avatar-image {
          border-color: var(--surface-elevated);
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
          border: 2px solid var(--primary-white);
        }

        .theme-dark .verified-badge {
          border-color: var(--surface-elevated);
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
          line-height: 1.2;
        }

        .profile-username {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--accent);
          font-size: var(--font-size-base);
          font-weight: 500;
        }

        .profile-stats {
          display: flex;
          gap: var(--spacing-md);
          align-items: center;
        }

        .level-badge {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .balance {
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-lg);
          font-weight: 700;
          border: 2px solid var(--accent);
          background: linear-gradient(135deg, var(--accent-soft), rgba(139, 92, 246, 0.1));
          color: var(--accent-hover);
        }

        .profile-card {
          margin-bottom: var(--spacing-lg);
        }

        .card-title {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
          padding-bottom: var(--spacing-sm);
          border-bottom: 2px solid var(--border-light);
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

        .quick-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--spacing-md);
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          padding: var(--spacing-xl);
          background: var(--surface-elevated);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
          position: relative;
          overflow: hidden;
          text-align: left;
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
          font-size: var(--font-size-2xl);
          flex-shrink: 0;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:not(.primary) .action-icon {
          background: var(--accent-soft);
        }

        .action-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .action-title {
          font-size: var(--font-size-base);
          font-weight: 600;
          line-height: 1.2;
        }

        .action-description {
          font-size: var(--font-size-sm);
          font-weight: 400;
          opacity: 0.8;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--spacing-md);
        }

        .stat-card {
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          transition: left 0.4s ease;
        }

        .stat-card:hover::before {
          left: 0;
        }

        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }

        .stat-icon {
          font-size: var(--font-size-2xl);
          margin-bottom: var(--spacing-sm);
        }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .stat-value {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-label {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            text-align: center;
            gap: var(--spacing-md);
          }

          .avatar-image, .avatar-placeholder {
            width: 64px;
            height: 64px;
            font-size: var(--font-size-xl);
          }

          .profile-name {
            font-size: var(--font-size-xl);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .action-btn {
            padding: var(--spacing-lg);
            gap: var(--spacing-md);
          }
        }

        @media (max-width: 480px) {
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
      `}</style>
    </div>
  );
}