// frontend/src/components/ProductModal.jsx - НАСТОЯЩЕЕ МОДАЛЬНОЕ ОКНО ТОВАРА
import React, { useEffect, useState } from "react";

export default function ProductModal({ product, user, onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  // Обработка изображений товара
  const images = product.images ?
    product.images.split(',').map(img => img.trim()).filter(Boolean) :
    product.main_image ? [product.main_image] : [];

  const hasMultipleImages = images.length > 1;

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Навигация по изображениям
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Покупка товара
  const handlePurchase = async () => {
    if (!user) {
      alert("Для покупки необходимо авторизоваться");
      return;
    }

    const userBalance = user.balance || 0;
    if (userBalance < product.price) {
      alert(`Недостаточно средств на балансе.\nНужно: ₽${product.price.toLocaleString()}\nУ вас: ₽${userBalance.toLocaleString()}\n\nПополните баланс в профиле.`);
      return;
    }

    setShowPurchaseForm(true);
  };

  // Подтверждение покупки
  const confirmPurchase = async () => {
    setLoading(true);

    try {
      // Генерируем ID заказа
      const orderId = `VB${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

      // Создаем заказ (в реальном проекте это API запрос)
      const order = {
        id: orderId,
        userId: user.id,
        productId: product.id,
        productTitle: product.title,
        productPrice: product.price,
        storeName: product.store_name,
        storeId: product.store_id,
        quantity: 1,
        totalAmount: product.price,
        status: 'completed',
        createdAt: new Date().toISOString(),
        userInfo: {
          name: user.first_name || 'Покупатель',
          username: user.username,
          tgId: user.tg_id
        }
      };

      // Сохраняем в localStorage (временно)
      const savedOrders = JSON.parse(localStorage.getItem('voidshop_orders') || '[]');
      savedOrders.push(order);
      localStorage.setItem('voidshop_orders', JSON.stringify(savedOrders));

      // Показываем чек
      showReceipt(order);

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
            buyerUsername: order.userInfo.username,
            buyerTgId: order.userInfo.tgId,
            createdAt: order.createdAt
          }
        };

        window.Telegram.WebApp.sendData(JSON.stringify(adminNotification));
        console.log('📤 Уведомление о заказе отправлено админу:', adminNotification);
      }

    } catch (error) {
      console.error('Ошибка при создании заказа:', error);
      alert('Произошла ошибка при оформлении заказа. Попробуйте позже.');
    } finally {
      setLoading(false);
      setShowPurchaseForm(false);
    }
  };

  // Показ чека
  const showReceipt = (order) => {
    const receiptText = `
🧾 ЧЕК ОПЛАТЫ

📋 Заказ: ${order.id}
📦 Товар: ${order.productTitle}
🏪 Магазин: ${order.storeName}
💰 Сумма: ₽${order.totalAmount.toLocaleString()}
📅 Дата: ${new Date(order.createdAt).toLocaleString('ru-RU')}
👤 Покупатель: ${order.userInfo.name}

✅ Оплачено с баланса

📞 Для получения товара обратитесь:
• Telegram: @void_shop_support
• Или напишите в чат поддержки

Сохраните этот чек до получения товара!
    `;

    alert(receiptText);
    onClose?.();
  };

  const discount = product.old_price ?
    Math.round(((product.old_price - product.price) / product.old_price) * 100) : 0;

  return (
    <div className="product-modal-backdrop" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>

        {/* Close Button */}
        <button className="product-close-btn" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        {/* Image Gallery */}
        <div className="product-gallery">
          {images.length > 0 ? (
            <>
              <div className="main-image-container">
                <img
                  src={images[currentImageIndex]}
                  alt={product.title}
                  className="main-image"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiNmM2Y0ZjYiLz48cGF0aCBkPSJNMjAwIDEyMEM0MSAxMjAgMTIwIDIwMCAxMjAuNUMyMDAuNSAyMDAgMjAwIDEyMCAyMDBabTAgNDBjMjIuMSAwIDQwLTE3LjkgNDAtNDBzLTE3LjktNDAtNDAtNDBzLTQwIDE3LjktNDAgNDBzMTcuOSA0MCA0MCA0MFoiIGZpbGw9IiM5Y2EzYWYiLz48L3N2Zz4=';
                  }}
                />

                {discount > 0 && (
                  <div className="discount-badge">-{discount}%</div>
                )}

                {hasMultipleImages && (
                  <>
                    <button
                      className="image-nav prev"
                      onClick={prevImage}
                      aria-label="Предыдущее изображение"
                    >
                      ←
                    </button>
                    <button
                      className="image-nav next"
                      onClick={nextImage}
                      aria-label="Следующее изображение"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {hasMultipleImages && (
                <div className="image-thumbnails">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${index === currentImageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img src={image} alt={`${product.title} ${index + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-image-placeholder">
              <div className="placeholder-icon">📦</div>
              <div className="placeholder-text">Нет изображения</div>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-info">

          {/* Basic Info */}
          <div className="product-basic">
            <div className="product-category">{product.category || 'Товары'}</div>
            <h1 className="product-title">{product.title}</h1>

            <div className="product-pricing">
              <div className="price-main">₽{product.price.toLocaleString()}</div>
              {product.old_price && (
                <div className="price-old">₽{product.old_price.toLocaleString()}</div>
              )}
              {discount > 0 && (
                <div className="savings">Экономия ₽{(product.old_price - product.price).toLocaleString()}</div>
              )}
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span className="meta-label">Магазин:</span>
                <span className="meta-value">{product.store_name}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Просмотров:</span>
                <span className="meta-value">{product.views || 0}</span>
              </div>
              {product.quantity !== undefined && (
                <div className="meta-item">
                  <span className="meta-label">В наличии:</span>
                  <span className="meta-value">{product.quantity} шт.</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="product-description">
              <h3>Описание товара</h3>
              <div className="description-text">
                {product.description}
              </div>
            </div>
          )}

          {/* Purchase Section */}
          <div className="purchase-section">
            {user ? (
              <div className="purchase-info">
                <div className="balance-info">
                  <span className="balance-label">Ваш баланс:</span>
                  <span className={`balance-amount ${(user.balance || 0) >= product.price ? 'sufficient' : 'insufficient'}`}>
                    ₽{(user.balance || 0).toLocaleString()}
                  </span>
                </div>

                {(user.balance || 0) >= product.price ? (
                  <button
                    className="purchase-btn"
                    onClick={handlePurchase}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="button-spinner"></div>
                        Оформляем...
                      </>
                    ) : (
                      <>
                        <span className="btn-icon">🛒</span>
                        Купить за ₽{product.price.toLocaleString()}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="insufficient-funds">
                    <div className="insufficient-message">
                      Недостаточно средств на балансе
                    </div>
                    <div className="needed-amount">
                      Нужно пополнить: ₽{(product.price - (user.balance || 0)).toLocaleString()}
                    </div>
                    <button className="topup-btn" onClick={() => alert('Перейдите в профиль для пополнения баланса')}>
                      Пополнить баланс
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-required">
                <div className="auth-message">Для покупки необходима авторизация</div>
                <button className="auth-btn" onClick={() => alert('Перезапустите бота для авторизации')}>
                  Авторизоваться
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Purchase Confirmation Modal */}
        {showPurchaseForm && (
          <div className="purchase-modal">
            <div className="purchase-content">
              <h3>Подтверждение покупки</h3>

              <div className="purchase-summary">
                <div className="summary-item">
                  <span>Товар:</span>
                  <span>{product.title}</span>
                </div>
                <div className="summary-item">
                  <span>Цена:</span>
                  <span>₽{product.price.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span>Магазин:</span>
                  <span>{product.store_name}</span>
                </div>
                <div className="summary-item total">
                  <span>К оплате:</span>
                  <span>₽{product.price.toLocaleString()}</span>
                </div>
              </div>

              <div className="purchase-actions">
                <button
                  className="confirm-purchase-btn"
                  onClick={confirmPurchase}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="button-spinner"></div>
                      Покупаем...
                    </>
                  ) : (
                    'Подтвердить покупку'
                  )}
                </button>
                <button
                  className="cancel-purchase-btn"
                  onClick={() => setShowPurchaseForm(false)}
                  disabled={loading}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .product-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          z-index: 1800;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg);
          animation: fadeIn 0.3s ease;
        }

        .product-modal {
          width: 100%;
          max-width: 1000px;
          max-height: 90vh;
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border);
          overflow: hidden;
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
        }

        .product-close-btn {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md);
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--surface);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border);
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.2s ease;
          z-index: 20;
          box-shadow: var(--shadow-md);
        }

        .product-close-btn:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: scale(1.1);
        }

        .product-gallery {
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          background: var(--surface);
        }

        .main-image-container {
          position: relative;
          width: 100%;
          height: 350px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--surface-elevated);
          box-shadow: var(--shadow-md);
        }

        .main-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .main-image:hover {
          transform: scale(1.05);
        }

        .no-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
          color: var(--text-muted);
        }

        .theme-dark .no-image-placeholder {
          background: linear-gradient(135deg, var(--gray-800), var(--gray-700));
        }

        .placeholder-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-md);
          opacity: 0.6;
        }

        .placeholder-text {
          font-size: var(--font-size-base);
          font-weight: 500;
        }

        .discount-badge {
          position: absolute;
          top: var(--spacing-md);
          left: var(--spacing-md);
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-sm);
          font-weight: 700;
          box-shadow: var(--shadow-lg);
          z-index: 10;
        }

        .image-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 40px;
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border);
          border-radius: 50%;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--font-size-lg);
          font-weight: 700;
          transition: all 0.2s ease;
          z-index: 10;
          box-shadow: var(--shadow-md);
        }

        .image-nav:hover {
          background: var(--accent);
          color: var(--primary-white);
          transform: translateY(-50%) scale(1.1);
        }

        .image-nav.prev {
          left: var(--spacing-md);
        }

        .image-nav.next {
          right: var(--spacing-md);
        }

        .image-thumbnails {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: center;
          flex-wrap: wrap;
        }

        .thumbnail {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.2s ease;
          background: var(--surface-elevated);
        }

        .thumbnail.active {
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }

        .thumbnail:hover {
          transform: scale(1.1);
          box-shadow: var(--shadow-md);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-info {
          padding: var(--spacing-xl);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
          overflow-y: auto;
        }

        .product-basic {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .product-category {
          display: inline-block;
          padding: var(--spacing-xs) var(--spacing-md);
          background: var(--accent-soft);
          color: var(--accent-hover);
          border-radius: var(--radius-lg);
          font-size: var(--font-size-sm);
          font-weight: 600;
          align-self: flex-start;
        }

        .product-title {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
          line-height: 1.3;
        }

        .product-pricing {
          display: flex;
          align-items: baseline;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .price-main {
          font-size: var(--font-size-3xl);
          font-weight: 700;
          color: var(--accent);
        }

        .price-old {
          font-size: var(--font-size-lg);
          color: var(--text-muted);
          text-decoration: line-through;
        }

        .savings {
          padding: var(--spacing-xs) var(--spacing-sm);
          background: rgba(34, 197, 94, 0.1);
          color: #16a34a;
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .product-meta {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          padding: var(--spacing-lg);
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .meta-label {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
        }

        .meta-value {
          color: var(--text-primary);
          font-weight: 600;
        }

        .product-description {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .product-description h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 700;
          padding-bottom: var(--spacing-sm);
          border-bottom: 2px solid var(--border);
        }

        .description-text {
          color: var(--text-secondary);
          font-size: var(--font-size-base);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .purchase-section {
          margin-top: auto;
          padding-top: var(--spacing-lg);
          border-top: 2px solid var(--border);
        }

        .purchase-info {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .balance-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          background: var(--surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }

        .balance-label {
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .balance-amount {
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .balance-amount.sufficient {
          color: #16a34a;
        }

        .balance-amount.insufficient {
          color: #ef4444;
        }

        .purchase-btn {
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
          position: relative;
          overflow: hidden;
        }

        .purchase-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .purchase-btn:hover:not(:disabled)::before {
          left: 100%;
        }

        .purchase-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .purchase-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .insufficient-funds {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-lg);
        }

        .insufficient-message {
          color: #ef4444;
          font-weight: 600;
          text-align: center;
        }

        .needed-amount {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          text-align: center;
        }

        .topup-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .topup-btn:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .auth-required {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .auth-message {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .auth-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: var(--accent);
          color: var(--primary-white);
          border: none;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .auth-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        .purchase-modal {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .purchase-content {
          background: var(--surface-elevated);
          padding: var(--spacing-2xl);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          max-width: 400px;
          width: 90%;
          border: 1px solid var(--border);
        }

        .purchase-content h3 {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
          text-align: center;
        }

        .purchase-summary {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
          margin-bottom: var(--spacing-xl);
          padding: var(--spacing-lg);
          background: var(--surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: var(--spacing-sm);
          border-bottom: 1px solid var(--border-light);
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-item.total {
          border-top: 2px solid var(--accent);
          padding-top: var(--spacing-md);
          margin-top: var(--spacing-md);
          font-weight: 700;
          font-size: var(--font-size-lg);
          color: var(--accent);
        }

        .purchase-actions {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .confirm-purchase-btn {
          width: 100%;
          padding: var(--spacing-lg) var(--spacing-xl);
          background: linear-gradient(135deg, #16a34a, #15803d);
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

        .confirm-purchase-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .confirm-purchase-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .cancel-purchase-btn {
          padding: var(--spacing-md) var(--spacing-lg);
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .cancel-purchase-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .cancel-purchase-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .btn-icon {
          font-size: var(--font-size-lg);
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

        /* Responsive Design */
        @media (max-width: 768px) {
          .product-modal {
            grid-template-columns: 1fr;
            max-height: 95vh;
            margin: var(--spacing-sm);
          }

          .product-gallery {
            padding: var(--spacing-lg);
            order: 1;
          }

          .product-info {
            padding: var(--spacing-lg);
            order: 2;
          }

          .main-image-container {
            height: 280px;
          }

          .product-title {
            font-size: var(--font-size-xl);
          }

          .price-main {
            font-size: var(--font-size-2xl);
          }
        }

        @media (max-width: 480px) {
          .product-modal {
            margin: var(--spacing-xs);
            max-height: 98vh;
          }

          .product-gallery,
          .product-info {
            padding: var(--spacing-md);
          }

          .main-image-container {
            height: 240px;
          }

          .image-nav {
            width: 36px;
            height: 36px;
            font-size: var(--font-size-base);
          }

          .thumbnail {
            width: 50px;
            height: 50px;
          }

          .product-meta {
            padding: var(--spacing-md);
          }

          .purchase-content {
            padding: var(--spacing-lg);
          }
        }

        /* Focus states для доступности */
        .product-close-btn:focus-visible,
        .image-nav:focus-visible,
        .thumbnail:focus-visible,
        .purchase-btn:focus-visible,
        .topup-btn:focus-visible,
        .auth-btn:focus-visible,
        .confirm-purchase-btn:focus-visible,
        .cancel-purchase-btn:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}