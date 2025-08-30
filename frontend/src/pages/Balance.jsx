// frontend/src/pages/Balance.jsx - ИСПРАВЛЕНО: Clipboard API и улучшенная система
import React, { useState, useEffect } from "react";

const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Банковская карта',
    icon: '💳',
    description: 'Visa, MasterCard, МИР',
    minAmount: 100,
    maxAmount: 100000,
    commission: 0,
    processingTime: "5-15 минут"
  },
  {
    id: 'crypto',
    name: 'Криптовалюта',
    icon: '₿',
    description: 'Bitcoin, USDT, Ethereum',
    minAmount: 500,
    maxAmount: 500000,
    commission: 2,
    processingTime: "15-60 минут",
    disabled: true // Пока отключено
  }
];

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Генерируем номер заявки
function generateOrderId() {
  return `VB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
}

export default function Balance({ user, telegramUser, onBack }) {
  const [step, setStep] = useState('methods'); // methods -> amount -> confirm -> payment -> success
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const currentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod);
  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = currentMethod && numAmount >= currentMethod.minAmount && numAmount <= currentMethod.maxAmount;
  const finalAmount = numAmount + (currentMethod?.commission ? Math.ceil(numAmount * currentMethod.commission / 100) : 0);

  // ИСПРАВЛЕННОЕ копирование в буфер обмена
  const copyToClipboard = async (text, field) => {
    try {
      // Сначала пробуем современный Clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(''), 2000);
        console.log('✅ Скопировано через Clipboard API:', text);
        return;
      }

      // Fallback для старых браузеров или небезопасных контекстов
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopiedField(field);
          setTimeout(() => setCopiedField(''), 2000);
          console.log('✅ Скопировано через execCommand:', text);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (err) {
        console.error('❌ Ошибка копирования:', err);
        // Показываем пользователю значение для ручного копирования
        prompt('Скопируйте значение:', text);
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('❌ Критическая ошибка копирования:', err);
      // Последний fallback - показываем prompt
      prompt('Скопируйте значение вручную:', text);
    }
  };

  // Обработка создания заявки на пополнение
  const handleCreatePayment = async () => {
    if (!currentMethod || !isValidAmount) return;

    setLoading(true);

    try {
      const orderId = generateOrderId();
      const payment = {
        orderId,
        userId: user?.id || null,
        tgId: telegramUser?.id || null,
        amount: numAmount,
        finalAmount: finalAmount,
        method: selectedMethod,
        methodName: currentMethod.name,
        commission: currentMethod.commission,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 часа
        userInfo: {
          name: user?.first_name || telegramUser?.first_name || 'Пользователь',
          username: user?.username || telegramUser?.username || null,
        },
        // Реквизиты для оплаты (в реальном проекте получать с сервера)
        paymentDetails: selectedMethod === 'card' ? {
          cardNumber: '5536 9141 2345 6789',
          cardHolder: 'VOID SHOP',
          bank: 'Сбер Банк'
        } : null
      };

      setPaymentData(payment);

      // Сохраняем заявку локально (в реальном проекте отправляем на сервер)
      const savedPayments = JSON.parse(localStorage.getItem('voidshop_payments') || '[]');
      savedPayments.push(payment);
      localStorage.setItem('voidshop_payments', JSON.stringify(savedPayments));

      setStep('payment');

    } catch (error) {
      console.error('Ошибка создания заявки:', error);
      alert('Ошибка создания заявки. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Подтверждение оплаты
  const handleConfirmPayment = async () => {
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
      const savedPayments = JSON.parse(localStorage.getItem('voidshop_payments') || '[]');
      const index = savedPayments.findIndex(p => p.orderId === paymentData.orderId);
      if (index !== -1) {
        savedPayments[index] = updatedPayment;
        localStorage.setItem('voidshop_payments', JSON.stringify(savedPayments));
      }

      // ИСПРАВЛЕНО: Отправляем уведомление админу через Telegram Bot
      if (window.Telegram?.WebApp?.sendData) {
        const adminNotification = {
          type: 'payment_confirmation',
          data: {
            orderId: updatedPayment.orderId,
            userId: updatedPayment.tgId,
            userName: updatedPayment.userInfo.name,
            username: updatedPayment.userInfo.username,
            amount: updatedPayment.amount,
            finalAmount: updatedPayment.finalAmount,
            method: updatedPayment.methodName,
            createdAt: updatedPayment.createdAt,
            paidAt: updatedPayment.paidAt,
            cardNumber: updatedPayment.paymentDetails?.cardNumber,
            message: `💰 Новая заявка на пополнение!\n\n📋 Заявка: ${updatedPayment.orderId}\n👤 Пользователь: ${updatedPayment.userInfo.name} (@${updatedPayment.userInfo.username})\n💳 Сумма: ₽${updatedPayment.finalAmount}\n🏦 Способ: ${updatedPayment.methodName}\n📅 Создана: ${new Date(updatedPayment.createdAt).toLocaleString('ru-RU')}\n💸 Оплачена: ${new Date(updatedPayment.paidAt).toLocaleString('ru-RU')}`
          }
        };

        window.Telegram.WebApp.sendData(JSON.stringify(adminNotification));
        console.log('📤 Уведомление админу отправлено:', adminNotification);
      }

      setPaymentData(updatedPayment);
      setStep('success');

    } catch (error) {
      console.error('Ошибка подтверждения:', error);
      alert('Ошибка. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="balance-page">
      {/* Header с кнопкой назад */}
      <div className="balance-header">
        <button className="back-button" onClick={onBack}>
          ← Назад
        </button>
        <div className="header-content">
          <div className="header-icon">💰</div>
          <h1 className="balance-title">Пополнение баланса</h1>
          {user && (
            <p className="current-balance">
              Текущий баланс: <span>₽{(user.balance || 0).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>

      <div className="balance-content">

        {/* Шаг 1: Выбор метода */}
        {step === 'methods' && (
          <div className="step-container">
            <div className="step-header">
              <h2>Выберите способ пополнения</h2>
              <p>Все операции защищены и проводятся в безопасном режиме</p>
            </div>

            <div className="payment-methods">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  className={`payment-method ${method.disabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (!method.disabled) {
                      setSelectedMethod(method.id);
                      setStep('amount');
                    }
                  }}
                  disabled={method.disabled}
                >
                  <div className="method-icon">{method.icon}</div>
                  <div className="method-info">
                    <div className="method-name">
                      {method.name}
                      {method.disabled && <span className="coming-soon">Скоро</span>}
                    </div>
                    <div className="method-description">{method.description}</div>
                    <div className="method-details">
                      <span className="method-limits">₽{method.minAmount.toLocaleString()} - ₽{method.maxAmount.toLocaleString()}</span>
                      <span className="method-commission">
                        {method.commission > 0 ? `Комиссия ${method.commission}%` : 'Без комиссии'}
                      </span>
                      <span className="method-time">{method.processingTime}</span>
                    </div>
                  </div>
                  {!method.disabled && <div className="method-arrow">→</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Шаг 2: Ввод суммы */}
        {step === 'amount' && currentMethod && (
          <div className="step-container">
            <div className="step-header">
              <button className="step-back-btn" onClick={() => setStep('methods')}>← Назад</button>
              <h2>Сумма пополнения</h2>
              <div className="selected-method-info">
                <span className="method-icon">{currentMethod.icon}</span>
                <span>{currentMethod.name}</span>
              </div>
            </div>

            <div className="amount-section">
              <div className="amount-input-container">
                <div className="currency-symbol">₽</div>
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
                <div className="amount-limits">
                  Лимиты: ₽{currentMethod.minAmount.toLocaleString()} - ₽{currentMethod.maxAmount.toLocaleString()}
                </div>
                {currentMethod.commission > 0 && numAmount > 0 && (
                  <div className="commission-info">
                    Комиссия {currentMethod.commission}%: +₽{Math.ceil(numAmount * currentMethod.commission / 100).toLocaleString()}
                  </div>
                )}
                {numAmount > 0 && (
                  <div className="final-amount">
                    К доплате: <strong>₽{finalAmount.toLocaleString()}</strong>
                  </div>
                )}
              </div>

              <div className="quick-amounts">
                <div className="quick-label">Быстрый выбор:</div>
                <div className="quick-buttons">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      className="quick-amount-btn"
                      onClick={() => setAmount(value.toString())}
                    >
                      ₽{value.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="continue-btn"
                onClick={() => setStep('confirm')}
                disabled={!isValidAmount}
              >
                Продолжить →
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: Подтверждение */}
        {step === 'confirm' && currentMethod && (
          <div className="step-container">
            <div className="step-header">
              <button className="step-back-btn" onClick={() => setStep('amount')}>← Назад</button>
              <h2>Подтверждение заявки</h2>
            </div>

            <div className="confirmation-details">
              <div className="confirm-card">
                <div className="confirm-row">
                  <span>Способ оплаты:</span>
                  <span>{currentMethod.icon} {currentMethod.name}</span>
                </div>
                <div className="confirm-row">
                  <span>Сумма к зачислению:</span>
                  <span className="amount-highlight">₽{numAmount.toLocaleString()}</span>
                </div>
                {currentMethod.commission > 0 && (
                  <div className="confirm-row">
                    <span>Комиссия ({currentMethod.commission}%):</span>
                    <span>+₽{Math.ceil(numAmount * currentMethod.commission / 100).toLocaleString()}</span>
                  </div>
                )}
                <div className="confirm-row total">
                  <span>Итого к оплате:</span>
                  <span className="total-amount">₽{finalAmount.toLocaleString()}</span>
                </div>
                <div className="confirm-row">
                  <span>Время обработки:</span>
                  <span>{currentMethod.processingTime}</span>
                </div>
              </div>

              <div className="payment-instructions">
                <div className="instruction-icon">ℹ️</div>
                <div className="instruction-content">
                  <h3>Как происходит пополнение:</h3>
                  <ol>
                    <li>Создается заявка на пополнение с уникальным номером</li>
                    <li>Вы получаете реквизиты для оплаты</li>
                    <li>Переводите точную сумму на указанные реквизиты</li>
                    <li>Подтверждаете оплату в боте</li>
                    <li>После проверки администратором баланс зачисляется</li>
                  </ol>
                </div>
              </div>

              <button
                className="create-payment-btn"
                onClick={handleCreatePayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="button-spinner"></div>
                    Создаем заявку...
                  </>
                ) : (
                  <>Создать заявку на оплату</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Шаг 4: Оплата */}
        {step === 'payment' && paymentData && (
          <div className="step-container">
            <div className="payment-info-header">
              <h2>Заявка создана</h2>
              <div className="order-id">Заявка #{paymentData.orderId}</div>
            </div>

            <div className="payment-details">
              <div className="payment-card">
                <div className="payment-row">
                  <span>Создана:</span>
                  <span>{formatTime(paymentData.createdAt)}</span>
                </div>
                <div className="payment-row">
                  <span>Способ оплаты:</span>
                  <span>{paymentData.methodName}</span>
                </div>
                <div className="payment-row">
                  <span>Ваш ID:</span>
                  <span>{paymentData.tgId}</span>
                </div>
                <div className="payment-row highlight">
                  <span>Сумма к оплате:</span>
                  <button
                    className="copy-amount-btn"
                    onClick={() => copyToClipboard(paymentData.finalAmount.toString(), 'amount')}
                  >
                    ₽{paymentData.finalAmount.toLocaleString()}
                    {copiedField === 'amount' ? ' ✓' : ' 📋'}
                  </button>
                </div>
              </div>

              {paymentData.paymentDetails && (
                <div className="requisites-card">
                  <h3>Реквизиты для оплаты</h3>
                  <div className="requisite-item">
                    <span>Номер карты:</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(paymentData.paymentDetails.cardNumber.replace(/\s/g, ''), 'card')}
                    >
                      {paymentData.paymentDetails.cardNumber}
                      {copiedField === 'card' ? ' ✓' : ' 📋'}
                    </button>
                  </div>
                  <div className="requisite-item">
                    <span>Получатель:</span>
                    <span>{paymentData.paymentDetails.cardHolder}</span>
                  </div>
                  <div className="requisite-item">
                    <span>Банк:</span>
                    <span>{paymentData.paymentDetails.bank}</span>
                  </div>
                </div>
              )}

              <div className="payment-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h4>Важно:</h4>
                  <ul>
                    <li>Переведите <strong>точную сумму</strong> ₽{paymentData.finalAmount.toLocaleString()}</li>
                    <li>Заявка действительна 24 часа</li>
                    <li>После оплаты обязательно нажмите "Я оплатил"</li>
                    <li>Не закрывайте приложение до подтверждения</li>
                  </ul>
                </div>
              </div>

              <div className="payment-actions">
                <button
                  className="paid-btn"
                  onClick={handleConfirmPayment}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="button-spinner"></div>
                      Подтверждаем...
                    </>
                  ) : (
                    <>✅ Я оплатил</>
                  )}
                </button>

                <button
                  className="cancel-btn"
                  onClick={() => setStep('methods')}
                >
                  Отменить заявку
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Шаг 5: Успешное создание */}
        {step === 'success' && paymentData && (
          <div className="step-container">
            <div className="success-content">
              <div className="success-icon">✅</div>
              <h2>Заявка отправлена на проверку</h2>
              <p className="success-description">
                Ваша заявка #{paymentData.orderId} на пополнение баланса
                на сумму ₽{paymentData.amount.toLocaleString()} принята к рассмотрению.
              </p>

              <div className="status-info">
                <div className="status-badge waiting">Ожидает подтверждения</div>
                <p>Платеж будет зачислен после проверки администратором</p>
              </div>

              <div className="next-steps">
                <h3>Что дальше:</h3>
                <ul>
                  <li>Администратор проверит поступление платежа</li>
                  <li>Вы получите уведомление о зачислении</li>
                  <li>Баланс автоматически обновится</li>
                </ul>
              </div>

              <div className="success-actions">
                <button className="back-to-profile-btn" onClick={onBack}>
                  Вернуться в профиль
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ИСПРАВЛЕННЫЕ CSS стили без мусора */}
      <style>{`
        .balance-page {
          min-height: calc(100vh - 200px);
          padding: var(--spacing-lg) 0;
        }

        .balance-header {
          background: var(--surface);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-xl);
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          margin-bottom: var(--spacing-xl);
          position: relative;
          overflow: hidden;
        }

        .balance-header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--accent), var(--accent-hover));
        }

        .back-button {
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

        .back-button:hover {
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

        .balance-title {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
        }

        .current-balance {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .current-balance span {
          color: var(--accent);
          font-weight: 700;
          font-size: var(--font-size-lg);
        }

        .balance-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .step-container {
          background: var(--surface);
          border-radius: var(--radius-xl);
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-md);
          border: 1px solid var(--border);
        }

        .step-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
          position: relative;
        }

        .step-back-btn {
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

        .step-back-btn:hover {
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
          font-size: var(--font-size-base);
        }

        .selected-method-info {
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

        .payment-method::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
          transition: left 0.5s;
        }

        .payment-method:not(.disabled):hover::before {
          left: 100%;
        }

        .method-icon {
          font-size: var(--font-size-3xl);
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .method-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        .method-name {
          font-weight: 700;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .coming-soon {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-sm);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }

        .method-description {
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .method-details {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-md);
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        .method-arrow {
          font-size: var(--font-size-xl);
          color: var(--accent);
          font-weight: 700;
        }

        .amount-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .amount-input-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md);
          margin: var(--spacing-xl) 0;
        }

        .currency-symbol {
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
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .amount-limits {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
        }

        .commission-info {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
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
        }

        .quick-label {
          display: block;
          margin-bottom: var(--spacing-md);
          font-size: var(--font-size-base);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .quick-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: var(--spacing-sm);
          justify-content: center;
        }

        .quick-amount-btn {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--surface-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 600;
        }

        .quick-amount-btn:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent-hover);
          transform: translateY(-1px);
        }

        .continue-btn, .create-payment-btn {
          width: 100%;
          padding: var(--spacing-lg) var(--spacing-xl);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          box-shadow: var(--shadow-md);
        }

        .continue-btn:hover:not(:disabled),
        .create-payment-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .continue-btn:disabled,
        .create-payment-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .confirmation-details {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .confirm-card {
          background: var(--surface-elevated);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          border: 1px solid var(--border);
        }

        .confirm-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md) 0;
          border-bottom: 1px solid var(--border-light);
        }

        .confirm-row:last-child {
          border-bottom: none;
        }

        .confirm-row.total {
          border-top: 2px solid var(--accent);
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-lg);
        }

        .amount-highlight {
          color: var(--accent) !important;
          font-weight: 700 !important;
          font-size: var(--font-size-lg) !important;
        }

        .total-amount {
          color: var(--accent) !important;
          font-weight: 700 !important;
          font-size: var(--font-size-xl) !important;
        }

        .payment-instructions {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
        }

        .instruction-icon {
          font-size: var(--font-size-xl);
          flex-shrink: 0;
        }

        .instruction-content h3 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
        }

        .instruction-content ol {
          margin: 0;
          padding-left: var(--spacing-lg);
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.5;
        }

        .payment-info-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .payment-info-header h2 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .order-id {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-lg);
          font-weight: 600;
          display: inline-block;
        }

        .payment-details {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .payment-card, .requisites-card {
          background: var(--surface-elevated);
          border-radius: var(--radius-lg);
          padding: var(--spacing-xl);
          border: 1px solid var(--border);
        }

        .payment-row, .requisite-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
          border-bottom: 1px solid var(--border-light);
        }

        .payment-row:last-child, .requisite-item:last-child {
          border-bottom: none;
        }

        .payment-row.highlight {
          background: var(--accent-soft);
          padding: var(--spacing-md);
          border-radius: var(--radius-md);
          border: none;
          margin: var(--spacing-sm) 0;
        }

        .copy-amount-btn, .copy-btn {
          background: transparent;
          border: none;
          color: var(--accent);
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: var(--spacing-xs) var(--spacing-sm);
          border-radius: var(--radius-sm);
        }

        .copy-amount-btn:hover, .copy-btn:hover {
          background: var(--accent-soft);
          transform: scale(1.05);
        }

        .requisites-card h3 {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
          text-align: center;
          padding-bottom: var(--spacing-md);
          border-bottom: 2px solid var(--border);
        }

        .payment-warning {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-lg);
        }

        .warning-icon {
          font-size: var(--font-size-xl);
          flex-shrink: 0;
        }

        .warning-content h4 {
          margin: 0 0 var(--spacing-sm) 0;
          color: var(--text-primary);
          font-size: var(--font-size-base);
          font-weight: 600;
        }

        .warning-content ul {
          margin: 0;
          padding-left: var(--spacing-lg);
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.5;
        }

        .payment-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .paid-btn {
          width: 100%;
          padding: var(--spacing-lg) var(--spacing-xl);
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          box-shadow: var(--shadow-md);
        }

        .paid-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .paid-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .cancel-btn:hover {
          background: rgba(245, 101, 101, 0.1);
          color: #ef4444;
          border-color: rgba(245, 101, 101, 0.3);
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

        .success-description {
          margin: 0 0 var(--spacing-xl) 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          line-height: 1.5;
        }

        .status-info {
          margin: var(--spacing-xl) 0;
        }

        .status-badge {
          display: inline-block;
          padding: var(--spacing-sm) var(--spacing-lg);
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-sm);
          margin-bottom: var(--spacing-md);
        }

        .status-badge.waiting {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .next-steps {
          text-align: left;
          max-width: 400px;
          margin: var(--spacing-xl) auto;
        }

        .next-steps h3 {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .next-steps ul {
          margin: 0;
          padding-left: var(--spacing-lg);
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          line-height: 1.6;
        }

        .success-actions {
          margin-top: var(--spacing-2xl);
        }

        .back-to-profile-btn {
          padding: var(--spacing-lg) var(--spacing-2xl);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: var(--font-size-lg);
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-md);
        }

        .back-to-profile-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
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

        @media (max-width: 768px) {
          .balance-page {
            padding: var(--spacing-md) 0;
          }

          .balance-header {
            padding: var(--spacing-lg);
          }

          .step-container {
            padding: var(--spacing-lg);
          }

          .payment-method {
            flex-direction: column;
            gap: var(--spacing-md);
            text-align: center;
            padding: var(--spacing-lg);
          }

          .method-details {
            justify-content: center;
          }

          .amount-input-container {
            flex-direction: column;
            gap: var(--spacing-sm);
          }

          .amount-input {
            width: 150px;
            font-size: var(--font-size-2xl);
          }

          .payment-actions {
            gap: var(--spacing-sm);
          }

          .quick-buttons {
            gap: var(--spacing-xs);
          }

          .quick-amount-btn {
            padding: var(--spacing-xs) var(--spacing-sm);
            font-size: var(--font-size-sm);
          }
        }

        @media (max-width: 480px) {
          .balance-header {
            padding: var(--spacing-md);
          }

          .back-button {
            position: static;
            margin-bottom: var(--spacing-md);
          }

          .header-content {
            padding-top: 0;
          }

          .balance-title {
            font-size: var(--font-size-2xl);
          }

          .step-container {
            padding: var(--spacing-md);
          }

          .step-back-btn {
            position: static;
            margin-bottom: var(--spacing-md);
          }

          .step-header {
            text-align: left;
          }

          .payment-row, .requisite-item {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--spacing-xs);
            padding: var(--spacing-md) 0;
          }
        }
      `}</style>
    </div>
  );
}