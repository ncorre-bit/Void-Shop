// frontend/src/components/BalanceSystem.jsx - ФИНАЛЬНАЯ РАБОЧАЯ СИСТЕМА
import React, { useState, useEffect, useCallback } from "react";
import { sendDataToTelegramBot } from "../utils/telegram";

const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Банковская карта',
    icon: '💳',
    description: 'Visa, MasterCard, МИР',
    minAmount: 100,
    maxAmount: 100000,
    commission: 0,
    processingTime: "5-15 минут",
    enabled: true
  },
  {
    id: 'crypto',
    name: 'Криптовалюта',
    icon: '₿',
    description: 'Bitcoin, USDT',
    minAmount: 500,
    maxAmount: 500000,
    commission: 2,
    processingTime: "15-60 минут",
    enabled: false // Пока отключено
  }
];

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Генерация ID заявки
const generateOrderId = () => `VB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

// Копирование в буфер обмена
const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (error) {
    console.error('Ошибка копирования:', error);
    return false;
  }
};

export default function BalanceSystem({ user, telegramUser, onBack }) {
  const [step, setStep] = useState('methods');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [requests, setRequests] = useState([]);

  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = currentMethod && numAmount >= currentMethod.minAmount && numAmount <= currentMethod.maxAmount;

  // Загрузка заявок пользователя
  const loadUserRequests = useCallback(() => {
    try {
      const saved = localStorage.getItem('voidshop_balance_requests');
      const allRequests = saved ? JSON.parse(saved) : [];
      const userRequests = allRequests.filter(r =>
        r.tgId === (user?.tg_id || telegramUser?.id)
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(userRequests);
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    }
  }, [user?.tg_id, telegramUser?.id]);

  useEffect(() => {
    loadUserRequests();
  }, [loadUserRequests]);

  // Копирование с анимацией
  const copyWithAnimation = async (text, field) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    }
  };

  // Создание заявки на пополнение
  const createBalanceRequest = async () => {
    if (!currentMethod || !isValidAmount) return;

    setLoading(true);
    try {
      const orderId = generateOrderId();
      const request = {
        orderId,
        userId: user?.id || null,
        tgId: telegramUser?.id || user?.tg_id,
        amount: numAmount,
        method: selectedMethod,
        methodName: currentMethod.name,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        userInfo: {
          name: user?.first_name || telegramUser?.first_name || 'Пользователь',
          username: user?.username || telegramUser?.username || null,
        },
        paymentDetails: {
          cardNumber: '5536 9141 2345 6789',
          cardHolder: 'VOID SHOP',
          bank: 'Сбер Банк'
        }
      };

      // Сохраняем заявку
      const saved = localStorage.getItem('voidshop_balance_requests');
      const allRequests = saved ? JSON.parse(saved) : [];
      allRequests.push(request);
      localStorage.setItem('voidshop_balance_requests', JSON.stringify(allRequests));

      setPaymentData(request);
      loadUserRequests();
      setStep('payment');

    } catch (error) {
      console.error('Ошибка создания заявки:', error);
    } finally {
      setLoading(false);
    }
  };

  // Подтверждение оплаты
  const confirmPayment = async () => {
    if (!paymentData) return;

    setLoading(true);
    try {
      // Обновляем статус заявки
      const updatedPayment = {
        ...paymentData,
        status: 'waiting_confirmation',
        paidAt: new Date().toISOString()
      };

      // Обновляем в localStorage
      const saved = localStorage.getItem('voidshop_balance_requests');
      const allRequests = saved ? JSON.parse(saved) : [];
      const index = allRequests.findIndex(p => p.orderId === paymentData.orderId);
      if (index !== -1) {
        allRequests[index] = updatedPayment;
        localStorage.setItem('voidshop_balance_requests', JSON.stringify(allRequests));
      }

      // ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ АДМИНУ
      const adminNotification = {
        type: 'payment_confirmation',
        data: {
          orderId: updatedPayment.orderId,
          userId: updatedPayment.tgId,
          userName: updatedPayment.userInfo.name,
          username: updatedPayment.userInfo.username,
          amount: updatedPayment.amount,
          method: updatedPayment.methodName,
          createdAt: updatedPayment.createdAt,
          paidAt: updatedPayment.paidAt
        }
      };

      const success = sendDataToTelegramBot(adminNotification);
      if (success) {
        console.log('📤 Уведомление админу отправлено');
      }

      setPaymentData(updatedPayment);
      loadUserRequests();
      setStep('success');

    } catch (error) {
      console.error('Ошибка подтверждения:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'Ожидает оплаты',
      'waiting_confirmation': 'На проверке',
      'approved': 'Зачислено',
      'rejected': 'Отклонено'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'pending',
      'waiting_confirmation': 'processing',
      'approved': 'success',
      'rejected': 'error'
    };
    return classMap[status] || 'pending';
  };

  return (
    <div className="balance-system">
      {/* Header */}
      <div className="balance-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <div className="header-content">
          <div className="header-icon">💰</div>
          <h1>Пополнение баланса</h1>
          {user && (
            <p className="current-balance">
              Текущий баланс: <span>₽{(user.balance || 0).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>

      {/* История заявок - показываем только если есть */}
      {requests.length > 0 && step === 'methods' && (
        <div className="requests-history">
          <h3>Ваши заявки</h3>
          <div className="requests-list">
            {requests.slice(0, 3).map((req) => (
              <div key={req.orderId} className="request-item">
                <div className="request-info">
                  <span className="order-id">#{req.orderId}</span>
                  <span className="request-amount">₽{req.amount.toLocaleString()}</span>
                </div>
                <div className={`request-status ${getStatusClass(req.status)}`}>
                  {getStatusText(req.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="balance-content">

        {/* Шаг 1: Выбор способа */}
        {step === 'methods' && (
          <div className="step-content">
            <div className="step-header">
              <h2>Выберите способ пополнения</h2>
              <p>Все операции проводятся безопасно</p>
            </div>

            <div className="payment-methods">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  className={`payment-method ${method.enabled ? '' : 'disabled'}`}
                  onClick={() => {
                    if (method.enabled) {
                      setSelectedMethod(method.id);
                      setStep('amount');
                    }
                  }}
                  disabled={!method.enabled}
                >
                  <div className="method-icon">{method.icon}</div>
                  <div className="method-info">
                    <div className="method-name">
                      {method.name}
                      {!method.enabled && <span className="coming-soon">Скоро</span>}
                    </div>
                    <div className="method-desc">{method.description}</div>
                    <div className="method-details">
                      <span>₽{method.minAmount.toLocaleString()} - ₽{method.maxAmount.toLocaleString()}</span>
                      <span>{method.commission > 0 ? `Комиссия ${method.commission}%` : 'Без комиссии'}</span>
                    </div>
                  </div>
                  {method.enabled && <div className="method-arrow">→</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Шаг 2: Ввод суммы */}
        {step === 'amount' && currentMethod && (
          <div className="step-content">
            <div className="step-header">
              <button className="back-step-btn" onClick={() => setStep('methods')}>← Назад</button>
              <h2>Сумма пополнения</h2>
              <div className="selected-method">
                {currentMethod.icon} {currentMethod.name}
              </div>
            </div>

            <div className="amount-section">
              <div className="amount-input-container">
                <span className="currency">₽</span>
                <input
                  type="text"
                  className="amount-input"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    if (value.split('.').length <= 2) setAmount(value);
                  }}
                  autoFocus
                />
              </div>

              <div className="amount-info">
                <div className="limits">
                  Лимиты: ₽{currentMethod.minAmount.toLocaleString()} - ₽{currentMethod.maxAmount.toLocaleString()}
                </div>
                {numAmount > 0 && (
                  <div className="final-amount">
                    К зачислению: <strong>₽{numAmount.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              <div className="quick-amounts">
                <div className="quick-label">Быстрый выбор:</div>
                <div className="quick-buttons">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      className="quick-btn"
                      onClick={() => setAmount(value.toString())}
                    >
                      ₽{value.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="continue-btn"
                onClick={createBalanceRequest}
                disabled={!isValidAmount || loading}
              >
                {loading ? 'Создаем...' : 'Продолжить →'}
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: Оплата */}
        {step === 'payment' && paymentData && (
          <div className="step-content">
            <div className="step-header">
              <h2>Заявка создана</h2>
              <div className="order-info">#{paymentData.orderId}</div>
            </div>

            <div className="payment-details">
              <div className="payment-info">
                <div className="info-row">
                  <span>Создана:</span>
                  <span>{formatTime(paymentData.createdAt)}</span>
                </div>
                <div className="info-row highlight">
                  <span>Сумма к оплате:</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyWithAnimation(paymentData.amount.toString(), 'amount')}
                  >
                    ₽{paymentData.amount.toLocaleString()}
                    {copiedField === 'amount' ? ' ✓' : ' 📋'}
                  </button>
                </div>
              </div>

              <div className="requisites">
                <h3>Реквизиты для оплаты</h3>
                <div className="req-item">
                  <span>Номер карты:</span>
                  <button
                    className="copy-btn"
                    onClick={() => copyWithAnimation('5536914123456789', 'card')}
                  >
                    5536 9141 2345 6789
                    {copiedField === 'card' ? ' ✓' : ' 📋'}
                  </button>
                </div>
                <div className="req-item">
                  <span>Получатель:</span>
                  <span>VOID SHOP</span>
                </div>
                <div className="req-item">
                  <span>Банк:</span>
                  <span>Сбер Банк</span>
                </div>
              </div>

              <div className="payment-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <strong>Важно:</strong> Переведите точную сумму ₽{paymentData.amount.toLocaleString()},
                  затем нажмите "Я оплатил"
                </div>
              </div>

              <div className="payment-actions">
                <button
                  className="paid-btn"
                  onClick={confirmPayment}
                  disabled={loading}
                >
                  {loading ? 'Подтверждаем...' : '✅ Я оплатил'}
                </button>
                <button className="cancel-btn" onClick={() => setStep('methods')}>
                  Отменить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Шаг 4: Успех */}
        {step === 'success' && paymentData && (
          <div className="step-content">
            <div className="success-content">
              <div className="success-icon">✅</div>
              <h2>Заявка отправлена</h2>
              <p>
                Заявка #{paymentData.orderId} на сумму ₽{paymentData.amount.toLocaleString()}
                принята к рассмотрению.
              </p>
              <div className="status-badge processing">Ожидает подтверждения</div>
              <button className="back-to-profile-btn" onClick={onBack}>
                Вернуться в профиль
              </button>
            </div>
          </div>
        )}

      </div>

      <style>{`
        .balance-system {
          min-height: calc(100vh - 200px);
          padding: var(--spacing-lg) 0;
        }

        .balance-header {
          background: var(--surface);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          margin-bottom: var(--spacing-lg);
          position: relative;
        }

        .balance-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
          border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        }

        .back-btn {
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

        .back-btn:hover {
          background: var(--accent-soft);
          color: var(--accent-hover);
          transform: translateX(-2px);
        }

        .header-content {
          text-align: center;
          padding-top: var(--spacing-lg);
        }

        .header-icon {
          font-size: 48px;
          margin-bottom: var(--spacing-md);
        }

        .balance-header h1 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
        }

        .current-balance {
          margin: 0;
          color: var(--text-secondary);
        }

        .current-balance span {
          color: var(--accent);
          font-weight: 700;
          font-size: var(--font-size-lg);
        }

        .requests-history {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
          border: 1px solid var(--border);
        }

        .requests-history h3 {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .request-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--surface-elevated);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }

        .request-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .order-id {
          font-family: monospace;
          color: var(--text-muted);
          font-size: var(--font-size-sm);
        }

        .request-amount {
          font-weight: 600;
          color: var(--text-primary);
        }

        .request-status {
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .request-status.pending {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }

        .request-status.processing {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
        }

        .request-status.success {
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
        }

        .request-status.error {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }

        .balance-content {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
        }

        .step-content {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .step-header {
          text-align: center;
          position: relative;
        }

        .back-step-btn {
          position: absolute;
          left: 0;
          top: 0;
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .back-step-btn:hover {
          background: var(--accent-soft);
          color: var(--accent-hover);
        }

        .step-header h2 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .step-header p {
          margin: 0;
          color: var(--text-secondary);
        }

        .selected-method {
          display: inline-flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-lg);
          font-weight: 600;
          margin-top: var(--spacing-md);
        }

        .payment-methods {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .payment-method {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          padding: var(--spacing-xl);
          background: var(--surface-elevated);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
          position: relative;
          overflow: hidden;
        }

        .payment-method.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .payment-method:not(.disabled):hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .method-icon {
          font-size: var(--font-size-3xl);
          flex-shrink: 0;
        }

        .method-info {
          flex: 1;
        }

        .method-name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          margin-bottom: var(--spacing-xs);
        }

        .coming-soon {
          margin-left: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .method-desc {
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .method-details {
          display: flex;
          gap: var(--spacing-md);
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        .method-arrow {
          font-size: var(--font-size-xl);
          color: var(--accent);
          font-weight: 700;
        }

        .amount-input-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          margin: var(--spacing-xl) 0;
        }

        .currency {
          font-size: var(--font-size-3xl);
          font-weight: 700;
          color: var(--accent);
        }

        .amount-input {
          font-size: var(--font-size-3xl);
          font-weight: 700;
          text-align: center;
          border: none;
          background: transparent;
          color: var(--text-primary);
          outline: none;
          width: 200px;
          border-bottom: 3px solid var(--border);
          transition: all 0.3s ease;
        }

        .amount-input:focus {
          border-bottom-color: var(--accent);
        }

        .amount-info {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }

        .limits {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
          margin-bottom: var(--spacing-sm);
        }

        .final-amount {
          font-size: var(--font-size-lg);
          color: var(--accent);
          padding: var(--spacing-sm);
          background: var(--accent-soft);
          border-radius: var(--radius-md);
        }

        .quick-amounts {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .quick-label {
          display: block;
          margin-bottom: var(--spacing-md);
          font-weight: 600;
          color: var(--text-secondary);
        }

        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          justify-content: center;
        }

        .quick-btn {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
        }

        .quick-btn:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-hover);
        }

        .continue-btn, .paid-btn, .back-to-profile-btn {
          width: 100%;
          padding: var(--spacing-lg);
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-md);
        }

        .continue-btn:hover:not(:disabled),
        .paid-btn:hover:not(:disabled),
        .back-to-profile-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .continue-btn:disabled,
        .paid-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .order-info {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-lg);
          font-weight: 600;
          display: inline-block;
          margin-top: var(--spacing-md);
        }

        .payment-info, .requisites {
          background: var(--surface-elevated);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          border: 1px solid var(--border);
          margin-bottom: var(--spacing-lg);
        }

        .requisites h3 {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-weight: 600;
          text-align: center;
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--border);
        }

        .info-row, .req-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
        }

        .info-row.highlight {
          background: var(--accent-soft);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
        }

        .copy-btn {
          background: transparent;
          border: none;
          color: var(--accent);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: var(--spacing-xs);
          border-radius: var(--radius-sm);
        }

        .copy-btn:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }

        .payment-warning {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-lg);
        }

        .warning-icon {
          font-size: var(--font-size-xl);
          flex-shrink: 0;
        }

        .payment-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .cancel-btn {
          padding: var(--spacing-md);
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .success-content {
          text-align: center;
          padding: var(--spacing-xl) 0;
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-lg);
        }

        .success-content h2 {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .success-content p {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .status-badge {
          display: inline-block;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-sm);
          margin-bottom: var(--spacing-xl);
        }

        .status-badge.processing {
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
          border: 1px solid rgba(59, 130, 246, 0.3);
        }

        @media (max-width: 768px) {
          .balance-system { padding: var(--spacing-md) 0; }
          .balance-header, .balance-content { padding: var(--spacing-lg); }
          .payment-method { flex-direction: column; text-align: center; }
          .amount-input { width: 150px; font-size: var(--font-size-2xl); }
          .quick-buttons { gap: var(--spacing-xs); }
        }
      `}</style>
    </div>
  );
}