// frontend/src/pages/CheckoutPage.jsx - Страница оформления заказа
import React, { useState, useCallback } from "react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function CheckoutPage({
  orderData,
  onBack,
  onOrderComplete,
  onNavigateToBalance
}) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(orderData?.quantity || 1);

  // Если нет данных заказа - показываем загрузку
  if (!orderData?.product) {
    return <LoadingSpinner text="Подготавливаем заказ" icon="🛒" />;
  }

  const { product, user } = orderData;
  const totalPrice = product.price * quantity;
  const userBalance = user?.balance || 0;
  const hasEnoughBalance = userBalance >= totalPrice;

  // Подтверждение заказа
  const handleConfirmOrder = useCallback(async () => {
    if (!hasEnoughBalance) {
      alert("Недостаточно средств на балансе");
      return;
    }

    const confirmText = `Подтвердите покупку:

📦 Товар: ${product.title}
🏪 Магазин: ${product.store_name}
🔢 Количество: ${quantity} шт.
💰 Сумма: ₽${totalPrice.toLocaleString()}

Деньги будут списаны с баланса.
Продолжить?`;

    if (!confirm(confirmText)) {
      return;
    }

    setLoading(true);

    try {
      // Генерируем ID заказа
      const orderId = `VB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      const order = {
        id: orderId,
        userId: user.id,
        userTgId: user.tg_id,
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price,
        storeName: product.store_name,
        storeId: product.store_id,
        quantity: quantity,
        totalAmount: totalPrice,
        status: 'paid',
        createdAt: new Date().toISOString(),
        userInfo: {
          name: user.first_name || user.username || 'Покупатель',
          username: user.username,
          tgId: user.tg_id,
          firstName: user.first_name,
          lastName: user.last_name
        }
      };

      // Сохраняем заказ в localStorage (временное решение)
      const savedOrders = JSON.parse(localStorage.getItem('voidshop_orders') || '[]');
      savedOrders.push(order);
      localStorage.setItem('voidshop_orders', JSON.stringify(savedOrders));

      // Уведомляем админа через Telegram Bot
      if (window.Telegram?.WebApp?.sendData) {
        const adminNotification = {
          type: 'new_order',
          data: {
            orderId: order.id,
            productTitle: order.productTitle,
            amount: order.totalAmount,
            storeName: order.storeName,
            buyer: order.userInfo.name,
            buyerUsername: order.userInfo.username || 'без username',
            buyerTgId: order.userInfo.tgId,
            buyerFirstName: order.userInfo.firstName || '',
            buyerLastName: order.userInfo.lastName || '',
            quantity: order.quantity,
            productPrice: order.productPrice,
            createdAt: order.createdAt
          }
        };

        window.Telegram.WebApp.sendData(JSON.stringify(adminNotification));
        console.log('📤 Уведомление о заказе отправлено админу');
      }

      // Переходим к успешному завершению
      onOrderComplete?.(order);

    } catch (error) {
      console.error('Ошибка создания заказа:', error);
      alert('Произошла ошибка при оформлении заказа. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [hasEnoughBalance, product, quantity, totalPrice, user, onOrderComplete]);

  return (
    <div className="checkout-page">
      {/* Header */}
      <div className="checkout-header">
        <button className="back-btn" onClick={onBack}>
          ← Назад
        </button>
        <h1>Оформление заказа</h1>
      </div>

      <div className="checkout-container">
        {/* Информация о товаре */}
        <div className="product-summary card">
          <h2>Ваш заказ</h2>

          <div className="product-info">
            <div className="product-image">
              {product.main_image ? (
                <img src={product.main_image} alt={product.title} />
              ) : (
                <div className="product-placeholder">📦</div>
              )}
            </div>

            <div className="product-details">
              <h3 className="product-title">{product.title}</h3>
              <div className="product-store">Магазин: {product.store_name}</div>
              <div className="product-price">₽{product.price.toLocaleString()} за шт.</div>
            </div>
          </div>

          {/* Выбор количества */}
          <div className="quantity-section">
            <label className="quantity-label">Количество:</label>
            <div className="quantity-controls">
              <button
                className="quantity-btn"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || loading}
              >
                -
              </button>
              <input
                type="number"
                className="quantity-input"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="99"
                disabled={loading}
              />
              <button
                className="quantity-btn"
                onClick={() => setQuantity(Math.min(99, quantity + 1))}
                disabled={quantity >= 99 || loading}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Информация об оплате */}
        <div className="payment-summary card">
          <h2>К оплате</h2>

          <div className="payment-details">
            <div className="payment-row">
              <span>Товар:</span>
              <span>₽{(product.price * quantity).toLocaleString()}</span>
            </div>
            <div className="payment-row">
              <span>Количество:</span>
              <span>{quantity} шт.</span>
            </div>
            <div className="payment-row total">
              <span>Итого:</span>
              <span className="total-price">₽{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Баланс пользователя */}
          <div className="balance-section">
            <div className="balance-info">
              <span>Ваш баланс:</span>
              <span className={hasEnoughBalance ? 'balance-sufficient' : 'balance-insufficient'}>
                ₽{userBalance.toLocaleString()}
              </span>
            </div>

            {!hasEnoughBalance && (
              <div className="balance-warning">
                <span className="warning-icon">⚠️</span>
                <span>Недостаточно средств. Нужно пополнить: ₽{(totalPrice - userBalance).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="checkout-actions">
            {hasEnoughBalance ? (
              <button
                className={`btn-primary confirm-btn ${loading ? 'loading' : ''}`}
                onClick={handleConfirmOrder}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="button-spinner"></div>
                    Оформляем заказ...
                  </>
                ) : (
                  <>
                    ✅ Подтвердить и оплатить
                  </>
                )}
              </button>
            ) : (
              <button
                className="btn-primary topup-btn"
                onClick={onNavigateToBalance}
              >
                💳 Пополнить баланс
              </button>
            )}

            <button
              className="btn-secondary cancel-btn"
              onClick={onBack}
              disabled={loading}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      {/* Стили страницы */}
      <style>{`
        .checkout-page {
          min-height: 100vh;
          background: var(--bg);
        }

        .checkout-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--surface-elevated);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: var(--spacing-md) var(--container-padding);
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .back-btn {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: var(--spacing-sm) var(--spacing-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s ease;
          font-weight: 500;
        }

        .back-btn:hover {
          background: var(--accent-soft);
          color: var(--accent-hover);
          transform: translateX(-2px);
        }

        .checkout-header h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 600;
        }

        .checkout-container {
          max-width: 600px;
          margin: 0 auto;
          padding: var(--spacing-xl) var(--container-padding);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .product-summary h2,
        .payment-summary h2 {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 600;
        }

        .product-info {
          display: flex;
          gap: var(--spacing-lg);
          margin-bottom: var(--spacing-xl);
        }

        .product-image {
          width: 100px;
          height: 100px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--surface);
          flex-shrink: 0;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
        }

        .theme-dark .product-placeholder {
          background: linear-gradient(135deg, var(--gray-800), var(--gray-700));
        }

        .product-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .product-title {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 600;
          line-height: 1.3;
        }

        .product-store {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
        }

        .product-price {
          color: var(--accent);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .quantity-section {
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--border-light);
        }

        .quantity-label {
          display: block;
          color: var(--text-primary);
          font-weight: 600;
          margin-bottom: var(--spacing-md);
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .quantity-btn {
          width: 40px;
          height: 40px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-weight: 700;
          font-size: var(--font-size-lg);
          transition: all 0.3s ease;
        }

        .quantity-btn:hover:not(:disabled) {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent);
        }

        .quantity-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quantity-input {
          width: 80px;
          height: 40px;
          text-align: center;
          border: 1px solid var(--border);
          background: var(--surface-elevated);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: var(--font-size-base);
        }

        .payment-details {
          margin-bottom: var(--spacing-xl);
        }

        .payment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-sm) 0;
          color: var(--text-secondary);
        }

        .payment-row.total {
          margin-top: var(--spacing-md);
          padding-top: var(--spacing-md);
          border-top: 2px solid var(--border);
          font-weight: 700;
          font-size: var(--font-size-lg);
          color: var(--text-primary);
        }

        .total-price {
          color: var(--accent);
          font-size: var(--font-size-xl);
        }

        .balance-section {
          padding: var(--spacing-lg);
          background: var(--surface);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-xl);
        }

        .balance-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: var(--font-size-lg);
        }

        .balance-sufficient {
          color: #10b981;
          font-weight: 700;
        }

        .balance-insufficient {
          color: #ef4444;
          font-weight: 700;
        }

        .balance-warning {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-top: var(--spacing-md);
          padding: var(--spacing-md);
          background: rgba(239, 68, 68, 0.1);
          border-radius: var(--radius-md);
          color: #dc2626;
          font-size: var(--font-size-sm);
        }

        .warning-icon {
          font-size: var(--font-size-lg);
        }

        .checkout-actions {
          display: grid;
          gap: var(--spacing-md);
        }

        .confirm-btn {
          padding: var(--spacing-lg);
          font-size: var(--font-size-lg);
          font-weight: 600;
          background: linear-gradient(135deg, #10b981, #059669);
        }

        .topup-btn {
          padding: var(--spacing-lg);
          font-size: var(--font-size-lg);
          font-weight: 600;
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }

        .cancel-btn {
          padding: var(--spacing-lg);
          font-size: var(--font-size-base);
        }

        @media (max-width: 480px) {
          .checkout-header {
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .product-info {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .product-image {
            width: 120px;
            height: 120px;
          }

          .quantity-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}