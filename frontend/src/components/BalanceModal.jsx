// frontend/src/components/BalanceModal.jsx
import React, { useState } from "react";
import { createPortal } from "react-dom";

const PAYMENT_METHODS = [
  { id: 'card', name: 'Банковская карта', icon: '💳', description: 'Visa, MasterCard, МИР', minAmount: 100, maxAmount: 100000 },
  { id: 'crypto', name: 'Криптовалюта', icon: '₿', description: 'Bitcoin, USDT, Ethereum', minAmount: 500, maxAmount: 500000 }
];

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

export default function BalanceModal({ isOpen, onClose, user, telegramUser }) {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('method');

  if (!isOpen) return null;

  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount >= currentMethod?.minAmount && numAmount <= currentMethod?.maxAmount;

  const handleAmountChange = (value) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    if (cleanValue.split('.').length <= 2) setAmount(cleanValue);
  };

  const handleSubmit = async () => {
    if (!currentMethod || !isValidAmount) return;

    setLoading(true);
    try {
      const requestData = {
        user_id: user?.id || null,
        tg_id: telegramUser?.id || null,
        amount: numAmount,
        method: selectedMethod,
        timestamp: new Date().toISOString(),
        user_info: {
          name: user?.first_name || telegramUser?.first_name || 'Пользователь',
          username: user?.username || telegramUser?.username || null,
        }
      };

      if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(JSON.stringify({
          type: 'balance_request',
          data: requestData
        }));
      }

      console.log('💰 Заявка на пополнение:', requestData);
      setStep('success');

      setTimeout(() => {
        onClose();
        setTimeout(() => {
          setStep('method');
          setAmount('');
          setSelectedMethod('card');
        }, 500);
      }, 3000);

    } catch (error) {
      console.error('Ошибка заявки:', error);
      alert('Ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="balance-modal-backdrop" onClick={onClose}>
      <div className="balance-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="balance-modal-header">
          <button className="balance-close-btn" onClick={onClose}>✕</button>
          <div className="balance-header-content">
            <div className="balance-logo">💰</div>
            <h2 className="balance-title">Пополнение баланса</h2>
            <p className="balance-subtitle">
              Текущий баланс: <span className="current-balance">₽{(user?.balance || 0).toLocaleString()}</span>
            </p>
          </div>
        </div>

        <div className="balance-modal-content">

          {/* Step 1: Method Selection */}
          {step === 'method' && (
            <>
              <h3 className="step-title">Выберите способ пополнения</h3>
              <div className="payment-methods">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    className={`payment-method ${selectedMethod === method.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedMethod(method.id);
                      setStep('amount');
                    }}
                  >
                    <div className="method-icon">{method.icon}</div>
                    <div className="method-info">
                      <div className="method-name">{method.name}</div>
                      <div className="method-description">{method.description}</div>
                      <div className="method-limits">₽{method.minAmount.toLocaleString()} - ₽{method.maxAmount.toLocaleString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Amount Input */}
          {step === 'amount' && currentMethod && (
            <>
              <div className="step-header">
                <button className="back-btn" onClick={() => setStep('method')}>← Назад</button>
                <h3 className="step-title">Сумма пополнения</h3>
              </div>

              <div className="selected-method">
                <span className="method-icon">{currentMethod.icon}</span>
                <span>{currentMethod.name}</span>
              </div>

              <div className="amount-input-section">
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">₽</span>
                  <input
                    type="text"
                    className="amount-input"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="amount-limits">
                  Мин: ₽{currentMethod.minAmount.toLocaleString()} • Макс: ₽{currentMethod.maxAmount.toLocaleString()}
                </div>
              </div>

              <div className="quick-amounts">
                <span className="quick-label">Быстрый выбор:</span>
                <div className="quick-buttons">
                  {QUICK_AMOUNTS.map((value) => (
                    <button key={value} className="quick-amount-btn" onClick={() => setAmount(value.toString())}>
                      ₽{value.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="amount-actions">
                <button className="continue-btn" onClick={() => setStep('confirm')} disabled={!isValidAmount}>
                  Продолжить →
                </button>
              </div>
            </>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && currentMethod && (
            <>
              <div className="step-header">
                <button className="back-btn" onClick={() => setStep('amount')}>← Назад</button>
                <h3 className="step-title">Подтверждение</h3>
              </div>

              <div className="confirmation-card">
                <div className="confirm-row">
                  <span className="confirm-label">Способ оплаты:</span>
                  <span className="confirm-value">{currentMethod.icon} {currentMethod.name}</span>
                </div>
                <div className="confirm-row">
                  <span className="confirm-label">Сумма пополнения:</span>
                  <span className="confirm-value amount-highlight">₽{numAmount.toLocaleString()}</span>
                </div>
                <div className="confirm-row">
                  <span className="confirm-label">Баланс после пополнения:</span>
                  <span className="confirm-value">₽{((user?.balance || 0) + numAmount).toLocaleString()}</span>
                </div>
              </div>

              <div className="payment-notice">
                <div className="notice-icon">ℹ️</div>
                <div className="notice-text">
                  <p><strong>Как происходит пополнение:</strong></p>
                  <p>1. Ваша заявка будет отправлена администратору</p>
                  <p>2. Вы получите реквизиты для оплаты</p>
                  <p>3. После подтверждения платежа баланс будет зачислен</p>
                </div>
              </div>

              <div className="confirm-actions">
                <button className="submit-btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <div className="button-spinner"></div>
                      Отправляем заявку...
                    </>
                  ) : 'Отправить заявку'}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="success-step">
              <div className="success-icon">✅</div>
              <h3 className="success-title">Заявка отправлена!</h3>
              <p className="success-description">
                Ваша заявка на пополнение баланса на сумму <strong>₽{numAmount.toLocaleString()}</strong> успешно отправлена администратору.
              </p>
              <p className="success-instruction">В ближайшее время с вами свяжутся для подтверждения платежа.</p>
              <div className="success-actions">
                <button className="success-btn" onClick={onClose}>Понятно</button>
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        .balance-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(12px);
          z-index: 1800;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg);
          animation: fadeIn 0.3s ease;
        }

        .balance-modal {
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border);
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }

        .balance-modal-header {
          padding: var(--spacing-xl);
          border-bottom: 1px solid var(--border);
          position: relative;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent);
        }

        .balance-close-btn {
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

        .balance-close-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: scale(1.1);
        }

        .balance-header-content {
          text-align: center;
        }

        .balance-logo {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--accent), var(--accent-hover));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-2xl);
          margin: 0 auto var(--spacing-md) auto;
          box-shadow: var(--shadow-lg);
        }

        .balance-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .balance-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .current-balance {
          color: var(--accent);
          font-weight: 700;
        }

        .balance-modal-content {
          flex: 1;
          padding: var(--spacing-xl);
          overflow-y: auto;
        }

        .step-title {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
          text-align: center;
        }

        .step-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-lg);
        }

        .back-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .back-btn:hover {
          background: var(--surface-elevated);
          color: var(--text-primary);
        }

        .payment-methods {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .payment-method {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .payment-method:hover {
          border-color: var(--accent);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .payment-method.active {
          border-color: var(--accent);
          background: var(--accent-soft);
        }

        .method-icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-lg);
          background: var(--accent-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-xl);
        }

        .method-info {
          flex: 1;
        }

        .method-name {
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .method-description {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          margin-bottom: var(--spacing-xs);
        }

        .method-limits {
          font-size: var(--font-size-xs);
          color: var(--text-muted);
        }

        .selected-method {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md);
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-lg);
          justify-content: center;
          font-weight: 600;
          color: var(--accent-hover);
        }

        .amount-input-section {
          text-align: center;
          margin-bottom: var(--spacing-lg);
        }

        .amount-input-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .currency-symbol {
          font-size: var(--font-size-2xl);
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

        .amount-limits {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        .quick-amounts {
          margin-bottom: var(--spacing-lg);
        }

        .quick-label {
          display: block;
          margin-bottom: var(--spacing-sm);
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          font-weight: 600;
          text-align: center;
        }

        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          justify-content: center;
        }

        .quick-amount-btn {
          padding: var(--spacing-sm) var(--spacing-md);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .quick-amount-btn:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-hover);
        }

        .amount-actions, .confirm-actions, .success-actions {
          display: flex;
          justify-content: center;
        }

        .continue-btn, .submit-btn, .success-btn {
          padding: var(--spacing-md) var(--spacing-xl);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-base);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          min-width: 180px;
          justify-content: center;
        }

        .continue-btn:hover:not(:disabled),
        .submit-btn:hover:not(:disabled),
        .success-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .continue-btn:disabled, .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .confirmation-card {
          background: var(--surface);
          border-radius: var(--radius-lg);
          padding: var(--spacing-lg);
          margin-bottom: var(--spacing-lg);
          border: 1px solid var(--border);
        }

        .confirm-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-light);
        }

        .confirm-row:last-child {
          border-bottom: none;
        }

        .confirm-label {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .confirm-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .amount-highlight {
          color: var(--accent) !important;
          font-size: var(--font-size-lg);
        }

        .payment-notice {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-lg);
        }

        .notice-icon {
          font-size: var(--font-size-xl);
          flex-shrink: 0;
        }

        .notice-text p {
          margin: 0 0 var(--spacing-xs) 0;
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .notice-text p:last-child {
          margin-bottom: 0;
        }

        .success-step {
          text-align: center;
          padding: var(--spacing-lg) 0;
        }

        .success-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-lg);
        }

        .success-title {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .success-description, .success-instruction {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .success-instruction {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        .success-actions {
          margin-top: var(--spacing-xl);
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

        @media (max-width: 480px) {
          .balance-modal {
            margin: var(--spacing-md);
          }

          .balance-modal-content {
            padding: var(--spacing-lg);
          }

          .amount-input {
            width: 150px;
            font-size: var(--font-size-2xl);
          }

          .quick-buttons {
            gap: var(--spacing-xs);
          }

          .quick-amount-btn {
            padding: var(--spacing-xs) var(--spacing-sm);
            font-size: var(--font-size-xs);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}