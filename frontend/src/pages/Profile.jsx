// frontend/src/pages/Profile.jsx - ОБНОВЛЕНО: интеграция с Balance страницей
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CitySelector from "../components/CitySelector";
import Balance from "./Balance"; // НОВОЕ: импорт страницы Balance

export default function Profile({ city, setCity, user, telegramUser }) {
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showBalance, setShowBalance] = useState(false); // ИЗМЕНЕНО: вместо showBalanceModal
  const [localCity, setLocalCity] = useState(city || "Москва");

  useEffect(() => {
    setLocalCity(city);
  }, [city]);

  function handleCitySelect(selectedCity) {
    setLocalCity(selectedCity);
    setCity?.(selectedCity);
    setShowCitySelector(false);
  }

  // НОВОЕ: обработчик истории операций
  function handleOperationsHistory() {
    // Получаем сохраненные заявки на пополнение
    const savedPayments = JSON.parse(localStorage.getItem('voidshop_payments') || '[]');
    const userPayments = savedPayments.filter(p =>
      p.tgId === (user?.tg_id || telegramUser?.id)
    );

    if (userPayments.length === 0) {
      alert("История операций пуста\nЗаявки на пополнение баланса появятся здесь");
      return;
    }

    // Показываем краткую информацию
    const paymentInfo = userPayments.map(p =>
      `${p.orderId}: ₽${p.amount} - ${getStatusText(p.status)}`
    ).join('\n');

    alert(`История операций:\n\n${paymentInfo}\n\n(Подробная история в разработке)`);
  }

  // НОВОЕ: получение текста статуса
  function getStatusText(status) {
    const statusMap = {
      'pending': 'Ожидает оплаты',
      'waiting_confirmation': 'На проверке',
      'completed': 'Завершено',
      'cancelled': 'Отменено'
    };
    return statusMap[status] || status;
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

  // ИЗМЕНЕНО: если показываем Balance, рендерим страницу Balance
  if (showBalance) {
    return (
      <Balance
        user={user}
        telegramUser={telegramUser}
        onBack={() => setShowBalance(false)}
      />
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header с аватаром из Telegram */}
      <div className="profile-header">
        <div className="profile-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          {isVerified && (
            <div className="verified-badge" title="Верифицированный пользователь">✓</div>
          )}
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{fullName || displayName}</h2>
          {username && <p className="profile-username">@{username}</p>}
          <div className="profile-stats">
            <span className="level-badge">1 уровень</span>
            <span className="balance">₽ {balance.toLocaleString('ru-RU')}</span>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="profile-card">
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
              <button onClick={() => setShowCitySelector(true)} className="change-city-btn">
                Изменить
              </button>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-label">Telegram ID:</span>
            <span className="detail-value">{tgData.id || userData.tg_id || 'Не указан'}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Количество покупок:</span>
            <span className="detail-value">0</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Общая сумма покупок:</span>
            <span className="detail-value">0 ₽</span>
          </div>
        </div>
      </div>

      {/* ОБНОВЛЕННЫЕ Quick Actions - теперь кнопка пополнения открывает страницу */}
      <div className="profile-card">
        <h3 className="card-title">Управление аккаунтом</h3>
        <div className="quick-actions">
          <button className="action-btn primary" onClick={() => setShowBalance(true)}>
            <span className="action-icon">💳</span>
            <div className="action-content">
              <span className="action-title">Пополнить баланс</span>
              <span className="action-description">Карта или криптовалюта</span>
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
      <div className="profile-card">
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

      <style>{`
        .profile-page {
          padding: var(--spacing-lg) 0;
          min-height: calc(100vh - 200px);
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
          padding: var(--spacing-xl);
          background: var(--surface);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-lg);
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
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
            padding: var(--spacing-lg);
          }

          .avatar-image, .avatar-placeholder {
            width: 64px;
            height: 64px;
            font-size: var(--font-size-xl);
          }

          .profile-name {
            font-size: var(--font-size-xl);
          }

          .profile-stats {
            justify-content: center;
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
            padding: var(--spacing-sm) 0;
          }

          .detail-value-with-action {
            align-self: stretch;
            justify-content: space-between;
          }

          .action-icon {
            width: 40px;
            height: 40px;
            font-size: var(--font-size-xl);
          }

          .stats-grid {
            gap: var(--spacing-sm);
          }

          .stat-card {
            padding: var(--spacing-md);
          }

          .balance {
            font-size: var(--font-size-base);
            padding: var(--spacing-xs) var(--spacing-sm);
          }
        }

        .change-city-btn:focus-visible,
        .action-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}