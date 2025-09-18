// frontend/src/pages/Profile.jsx - ИСПРАВЛЕНО: стили кнопок + CitySelector
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BalanceSystem from "../components/BalanceSystem";

// ИСПРАВЛЕННЫЙ CitySelector как модальное окно
const CitySelectorModal = ({ isOpen, onClose, onSelect, defaultCity }) => {
  const [cities, setCities] = useState([
    'Алматы', 'Воронеж', 'Екатеринбург', 'Казань', 'Краснодар', 'Красноярск',
    'Минск', 'Москва', 'Нижний Новгород', 'Новосибирск', 'Омск', 'Пермь',
    'Ростов-на-Дону', 'Самара', 'Санкт-Петербург', 'Уфа', 'Челябинск', 'Волгоград'
  ].sort());

  const [selectedCity, setSelectedCity] = useState(defaultCity);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedCity) {
      onSelect(selectedCity);
      onClose();
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <div className="city-selector-logo">📍</div>
          <h2>Выберите ваш город</h2>
          <p>Это поможет показывать актуальную информацию о магазинах</p>
        </div>

        <div className="modal-content">
          {/* Search */}
          <div className="city-search-container">
            <input
              type="search"
              placeholder="Найти город..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="city-search-input"
              autoFocus
            />
          </div>

          {/* Cities Grid */}
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
          <div className="city-actions">
            <button
              onClick={handleSelect}
              disabled={!selectedCity}
              className="btn primary w-full"
            >
              {selectedCity ? `Выбрать ${selectedCity}` : 'Выберите город'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Модальное окно истории транзакций
const TransactionHistoryModal = ({ isOpen, onClose, requests, onContinuePayment }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>История транзакций</h2>
          <p>Все ваши заявки на пополнение баланса</p>
        </div>

        <div className="modal-content">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💳</div>
              <h3>История пуста</h3>
              <p>Заявки на пополнение появятся здесь после создания</p>
            </div>
          ) : (
            <div className="transactions-list">
              {requests.slice(0, 10).map((req) => {
                const isActive = req.status === 'pending' || req.status === 'waiting_confirmation';
                const statusInfo = {
                  'pending': { text: 'Ожидает оплаты', class: 'pending', icon: '⏳' },
                  'waiting_confirmation': { text: 'На проверке', class: 'processing', icon: '🔍' },
                  'approved': { text: 'Зачислено', class: 'success', icon: '✅' },
                  'rejected': { text: 'Отклонено', class: 'error', icon: '❌' }
                }[req.status] || { text: req.status, class: 'pending', icon: '❓' };

                return (
                  <div
                    key={req.orderId}
                    className={`transaction-item ${isActive ? 'active' : 'completed'}`}
                    onClick={() => {
                      if (isActive && onContinuePayment) {
                        onContinuePayment(req);
                        onClose();
                      }
                    }}
                    style={{ cursor: isActive ? 'pointer' : 'default' }}
                  >
                    <div className="transaction-header">
                      <div className="transaction-id">#{req.orderId}</div>
                      <div className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.icon} {statusInfo.text}
                        {isActive && <span className="pulse-dot">●</span>}
                      </div>
                    </div>

                    <div className="transaction-details">
                      <div className="transaction-amount">₽{req.amount.toLocaleString()}</div>
                      <div className="transaction-date">
                        {new Date(req.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div className="transaction-footer">
                      {isActive ? (
                        <span className="action-hint">👆 Продолжить оплату</span>
                      ) : req.status === 'rejected' ? (
                        <span className="retry-hint">Заявка отклонена</span>
                      ) : (
                        <span className="success-hint">Операция завершена</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function Profile({ city, setCity, user, telegramUser }) {
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showBalanceSystem, setShowBalanceSystem] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [localCity, setLocalCity] = useState(city || "Москва");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [transactionRequests, setTransactionRequests] = useState([]);

  useEffect(() => {
    setLocalCity(city);
  }, [city]);

  // Подсчет активных заявок для индикатора
  useEffect(() => {
    const loadTransactionHistory = () => {
      try {
        const saved = localStorage.getItem('voidshop_balance_requests');
        const allRequests = saved ? JSON.parse(saved) : [];
        const userRequests = allRequests.filter(r =>
          r.tgId === (user?.tg_id || telegramUser?.id)
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setTransactionRequests(userRequests);

        const activeCount = userRequests.filter(r =>
          r.status === 'pending' || r.status === 'waiting_confirmation'
        ).length;
        setPendingRequestsCount(activeCount);
      } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        setPendingRequestsCount(0);
        setTransactionRequests([]);
      }
    };

    loadTransactionHistory();
    const interval = setInterval(loadTransactionHistory, 30000);
    return () => clearInterval(interval);
  }, [user?.tg_id, telegramUser?.id]);

  function handleCitySelect(selectedCity) {
    setLocalCity(selectedCity);
    setCity?.(selectedCity);
    setShowCitySelector(false);
  }

  function handleTransactionHistory() {
    setShowTransactionHistory(true);
  }

  function handleContinuePayment(request) {
    setShowBalanceSystem(true);
  }

  function handleTechSupport() {
    const supportUrl = 'https://t.me/void_shop_support';

    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(supportUrl);
    } else if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(supportUrl);
    } else {
      window.open(supportUrl, '_blank');
    }
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

  // Если показываем систему баланса
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
      <div className="profile-header">
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
            <span className="level-badge">Пользователь</span>
            <span className="balance">₽{balance.toLocaleString('ru-RU')}</span>
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
              <span className="detail-value city-value">{localCity}</span>
              <button onClick={() => setShowCitySelector(true)} className="btn secondary">Изменить</button>
            </div>
          </div>
          <div className="detail-item">
            <span className="detail-label">Telegram ID:</span>
            <span className="detail-value">{tgData.id || userData.tg_id || 'Не указан'}</span>
          </div>
        </div>
      </div>

      {/* ИСПРАВЛЕННЫЕ Quick Actions */}
      <div className="profile-card">
        <h3 className="card-title">Управление аккаунтом</h3>
        <div className="quick-actions">
          <button className="action-btn balance-btn" onClick={() => setShowBalanceSystem(true)}>
            <span className="action-icon">💳</span>
            <div className="action-content">
              <span className="action-title">Пополнить баланс</span>
              <span className="action-description">Банковские карты, быстрая проверка</span>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button className="action-btn history-btn" onClick={handleTransactionHistory}>
            <span className="action-icon">📋</span>
            <div className="action-content">
              <span className="action-title">
                История операций
                {pendingRequestsCount > 0 && (
                  <span className="pending-indicator">{pendingRequestsCount}</span>
                )}
              </span>
              <span className="action-description">
                {pendingRequestsCount > 0 ?
                  `${pendingRequestsCount} активных заявок` :
                  'Покупки и пополнения'
                }
              </span>
            </div>
            <div className="action-arrow">→</div>
          </button>

          <button className="action-btn support-btn" onClick={handleTechSupport}>
            <span className="action-icon">📞</span>
            <div className="action-content">
              <span className="action-title">Техническая поддержка</span>
              <span className="action-description">Помощь и консультации 24/7</span>
            </div>
            <div className="action-arrow">→</div>
          </button>
        </div>
      </div>

      {/* Modals */}
      <CitySelectorModal
        isOpen={showCitySelector}
        onClose={() => setShowCitySelector(false)}
        onSelect={handleCitySelect}
        defaultCity={localCity}
      />

      <TransactionHistoryModal
        isOpen={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
        requests={transactionRequests}
        onContinuePayment={handleContinuePayment}
      />

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
          background: var(--surface);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-xl);
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
          margin-bottom: var(--spacing-lg);
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
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

        /* ИСПРАВЛЕНО: Текст города больше и заметнее */
        .city-value {
          color: var(--accent-hover);
          font-size: var(--font-size-base);
          font-weight: 700;
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

        /* ИСПРАВЛЕНО: Правильные стили кнопок */
        .action-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          padding: var(--spacing-xl);
          background: var(--surface-elevated);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          position: relative;
          overflow: hidden;
          text-align: left;
          font-family: var(--font-family-system);
          color: var(--text-primary);
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
        }

        /* ИСПРАВЛЕНО: Кнопка пополнения баланса */
        .balance-btn {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border-color: transparent;
          box-shadow: var(--shadow-md);
        }

        .balance-btn:hover {
          box-shadow: var(--shadow-xl);
          transform: translateY(-6px);
        }

        .balance-btn .action-title,
        .balance-btn .action-description {
          color: var(--primary-white);
        }

        .balance-btn .action-arrow {
          color: var(--primary-white);
        }

        /* ИСПРАВЛЕНО: Кнопка истории операций */
        .history-btn {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .history-btn:hover {
          border-color: var(--accent-hover);
          background: rgba(139, 92, 246, 0.2);
        }

        /* ИСПРАВЛЕНО: Кнопка поддержки */
        .support-btn {
          border-color: #10b981;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05));
        }

        .support-btn:hover {
          border-color: #059669;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
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

        .history-btn .action-icon {
          background: var(--accent-soft);
        }

        .support-btn .action-icon {
          background: rgba(16, 185, 129, 0.2);
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
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .action-description {
          font-size: var(--font-size-sm);
          font-weight: 400;
          opacity: 0.8;
        }

        .action-arrow {
          font-size: var(--font-size-xl);
          color: var(--accent);
          font-weight: 700;
          transition: all 0.3s ease;
        }

        .action-btn:hover .action-arrow {
          transform: translateX(4px);
        }

        /* Индикатор активных заявок */
        .pending-indicator {
          position: relative;
          top: -2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          margin-left: var(--spacing-sm);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 4px 16px rgba(239, 68, 68, 0.6);
          }
        }

        /* Модальные стили */
        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          max-height: 60vh;
          overflow-y: auto;
        }

        .transaction-item {
          padding: var(--spacing-lg);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          transition: all 0.3s ease;
        }

        .transaction-item.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .transaction-item.active:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          cursor: pointer;
        }

        .transaction-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-sm);
        }

        .transaction-id {
          font-family: monospace;
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .transaction-details {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: var(--spacing-sm) 0;
        }

        .transaction-amount {
          font-size: var(--font-size-lg);
          font-weight: 700;
          color: var(--accent);
        }

        .transaction-date {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
        }

        .transaction-footer {
          margin-top: var(--spacing-sm);
          padding-top: var(--spacing-sm);
          border-top: 1px solid var(--border-light);
          font-size: var(--font-size-xs);
          color: var(--text-muted);
          font-style: italic;
        }

        .pulse-dot {
          color: var(--accent);
          animation: pulse 2s infinite;
          margin-left: var(--spacing-xs);
        }

        /* Responsive */
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

          .action-btn {
            padding: var(--spacing-lg);
            gap: var(--spacing-md);
          }

          .profile-stats {
            flex-wrap: wrap;
            justify-content: center;
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

          .action-btn {
            padding: var(--spacing-lg);
            text-align: center;
          }

          .action-content {
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}