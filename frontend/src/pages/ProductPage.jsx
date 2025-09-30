// frontend/src/pages/ProductPage.jsx - НОВАЯ отдельная страница товара
import React, { useState, useCallback, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProductPage({
  product,
  user,
  onBack,
  onNavigateToBalance,
  onNavigateToCheckout
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // ИСПРАВЛЕНО: Парсинг множественных изображений
  const images = product?.images ?
    (typeof product.images === 'string' ?
      (() => {
        try {
          return JSON.parse(product.images).filter(Boolean);
        } catch {
          return [product.images].filter(Boolean);
        }
      })() :
      Array.isArray(product.images) ? product.images.filter(Boolean) : []
    ) :
    product?.main_image ? [product.main_image] : [];

  // Если нет товара - показываем загрузку
  if (!product) {
    return <LoadingSpinner text="Загружаем товар" icon="📦" />;
  }

  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex] || null;

  // Навигация по изображениям
  const nextImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Открытие изображения в модальном окне
  const openImageModal = useCallback(() => {
    if (currentImage) {
      setShowImageModal(true);
      // Блокируем скролл
      document.body.style.overflow = 'hidden';
    }
  }, [currentImage]);

  const closeImageModal = useCallback(() => {
    setShowImageModal(false);
    document.body.style.overflow = 'auto';
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showImageModal) {
        closeImageModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showImageModal, closeImageModal]);

  // Расчет скидки
  const discount = product.old_price ?
    Math.round(((product.old_price - product.price) / product.old_price) * 100) : 0;

  // Обработчик покупки
  const handlePurchase = useCallback(() => {
    if (!user) {
      alert("Для покупки необходима авторизация");
      return;
    }

    const userBalance = user.balance || 0;
    const totalPrice = product.price * quantity;

    if (userBalance < totalPrice) {
      const needAmount = totalPrice - userBalance;
      if (confirm(`Недостаточно средств на балансе.\n\nНужно: ₽${totalPrice.toLocaleString()}\nУ вас: ₽${userBalance.toLocaleString()}\nНедостает: ₽${needAmount.toLocaleString()}\n\nПерейти к пополнению баланса?`)) {
        onNavigateToBalance?.();
      }
      return;
    }

    // Переходим к оформлению заказа
    onNavigateToCheckout?.({
      product,
      quantity,
      totalPrice,
      user
    });
  }, [user, product, quantity, onNavigateToBalance, onNavigateToCheckout]);

  const totalPrice = product.price * quantity;
  const userBalance = user?.balance || 0;
  const hasEnoughBalance = userBalance >= totalPrice;

  return (
    <div className="product-page">
      {/* Header с кнопкой назад */}
      <div className="product-header">
        <button className="back-btn" onClick={onBack}>
          ← Назад
        </button>
        <h1>Товар</h1>
      </div>

      <div className="product-container">
        {/* Галерея изображений */}
        <div className="product-gallery">
          {images.length > 0 ? (
            <>
              <div className="main-image-container" onClick={openImageModal}>
                <img
                  src={currentImage}
                  alt={product.title}
                  className="main-product-image"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk5ldCBpem9icmF6aGVuaXlhPC90ZXh0Pjwvc3ZnPg==';
                  }}
                />

                {/* Значок увеличения */}
                <div className="zoom-icon">🔍</div>

                {/* Скидка */}
                {discount > 0 && (
                  <div className="discount-badge">-{discount}%</div>
                )}

                {/* Навигация по изображениям */}
                {hasMultipleImages && (
                  <>
                    <button className="image-nav prev" onClick={prevImage}>
                      ←
                    </button>
                    <button className="image-nav next" onClick={nextImage}>
                      →
                    </button>
                  </>
                )}
              </div>

              {/* Миниатюры */}
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

        {/* Информация о товаре */}
        <div className="product-details">
          {/* Основная информация */}
          <div className="product-basic-info">
            <div className="product-category">{product.category || 'Товары'}</div>
            <h2 className="product-title">{product.title}</h2>

            {/* Цена */}
            <div className="product-pricing">
              <div className="price-main">₽{product.price.toLocaleString()}</div>
              {product.old_price && (
                <>
                  <div className="price-old">₽{product.old_price.toLocaleString()}</div>
                  <div className="savings">
                    Экономия ₽{(product.old_price - product.price).toLocaleString()}
                  </div>
                </>
              )}
            </div>

            {/* Метаинформация */}
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

          {/* Описание */}
          {product.description && (
            <div className="product-description">
              <h3>Описание товара</h3>
              <div className="description-text">
                {product.description}
              </div>
            </div>
          )}

          {/* Выбор количества и покупка */}
          <div className="purchase-section">
            {user ? (
              <>
                {/* Информация о балансе */}
                <div className="balance-info">
                  <span className="balance-label">Ваш баланс:</span>
                  <span className={`balance-amount ${hasEnoughBalance ? 'sufficient' : 'insufficient'}`}>
                    ₽{userBalance.toLocaleString()}
                  </span>
                </div>

                {/* Выбор количества */}
                <div className="quantity-section">
                  <div className="quantity-label">Количество:</div>
                  <div className="quantity-controls">
                    <button
                      className="quantity-btn"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
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
                    />
                    <button
                      className="quantity-btn"
                      onClick={() => setQuantity(Math.min(99, quantity + 1))}
                      disabled={quantity >= 99}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Итоговая сумма */}
                <div className="total-section">
                  <div className="total-label">Итого:</div>
                  <div className="total-price">₽{totalPrice.toLocaleString()}</div>
                </div>

                {/* Кнопка покупки */}
                {hasEnoughBalance ? (
                  <button
                    className={`btn-primary purchase-btn ${loading ? 'loading' : ''}`}
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
                        🛒 Купить за ₽{totalPrice.toLocaleString()}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="insufficient-funds">
                    <div className="insufficient-message">
                      Недостаточно средств на балансе
                    </div>
                    <div className="needed-amount">
                      Нужно пополнить: ₽{(totalPrice - userBalance).toLocaleString()}
                    </div>
                    <button className="btn-primary topup-btn" onClick={onNavigateToBalance}>
                      💳 Пополнить баланс
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="auth-required">
                <div className="auth-message">Для покупки необходима авторизация</div>
                <button className="btn-primary" onClick={() => alert('Перезапустите бота для авторизации')}>
                  Войти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно увеличенного изображения */}
      {showImageModal && currentImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>
              ✕
            </button>
            <img src={currentImage} alt={product.title} className="modal-image" />

            {hasMultipleImages && (
              <>
                <button className="modal-nav prev" onClick={prevImage}>←</button>
                <button className="modal-nav next" onClick={nextImage}>→</button>
                <div className="modal-counter">
                  {currentImageIndex + 1} из {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* СТИЛИ */}
      <style>{`
        .product-page {
          min-height: 100vh;
          background: var(--bg);
        }

        .product-header {
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
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }

        .back-btn:hover {
          background: var(--accent-soft);
          color: var(--accent-hover);
          transform: translateX(-2px);
        }

        .product-header h1 {
          margin: 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 600;
        }

        .product-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-xl) var(--container-padding);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-2xl);
        }

        /* Галерея изображений */
        .product-gallery {
          position: sticky;
          top: calc(80px + var(--spacing-lg));
          height: fit-content;
        }

        .main-image-container {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background: var(--surface);
          margin-bottom: var(--spacing-lg);
          cursor: pointer;
          border: 2px solid var(--border);
          transition: all 0.3s ease;
        }

        .main-image-container:hover {
          border-color: var(--accent);
          transform: scale(1.02);
        }

        .main-product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .zoom-icon {
          position: absolute;
          bottom: var(--spacing-md);
          right: var(--spacing-md);
          width: 40px;
          height: 40px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .main-image-container:hover .zoom-icon {
          opacity: 1;
        }

        .discount-badge {
          position: absolute;
          top: var(--spacing-md);
          right: var(--spacing-md);
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-lg);
          font-weight: 700;
          font-size: var(--font-size-sm);
          box-shadow: var(--shadow-lg);
        }

        .image-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          font-size: var(--font-size-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          z-index: 2;
        }

        .image-nav:hover {
          background: rgba(0, 0, 0, 0.9);
          transform: translateY(-50%) scale(1.1);
        }

        .image-nav.prev { left: var(--spacing-md); }
        .image-nav.next { right: var(--spacing-md); }

        .image-thumbnails {
          display: flex;
          gap: var(--spacing-sm);
          overflow-x: auto;
          padding: var(--spacing-sm);
        }

        .thumbnail {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 2px solid var(--border);
          cursor: pointer;
          transition: all 0.3s ease;
          background: var(--surface);
        }

        .thumbnail:hover,
        .thumbnail.active {
          border-color: var(--accent);
          transform: scale(1.05);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image-placeholder {
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--gray-100), var(--gray-200));
          color: var(--text-muted);
          text-align: center;
          border-radius: var(--radius-xl);
        }

        .theme-dark .no-image-placeholder {
          background: linear-gradient(135deg, var(--gray-800), var(--gray-700));
        }

        .placeholder-icon {
          font-size: 64px;
          margin-bottom: var(--spacing-md);
        }

        .placeholder-text {
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        /* Детали товара */
        .product-details {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .product-category {
          color: var(--accent);
          font-size: var(--font-size-sm);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .product-title {
          margin: 0 0 var(--spacing-lg) 0;
          color: var(--text-primary);
          font-size: var(--font-size-3xl);
          font-weight: 700;
          line-height: 1.3;
        }

        .product-pricing {
          display: flex;
          align-items: center;
          gap: var(--spacing-lg);
          flex-wrap: wrap;
          margin-bottom: var(--spacing-lg);
        }

        .price-main {
          font-size: 2.5rem;
          font-weight: 700;
          color: var(--accent);
        }

        .price-old {
          font-size: var(--font-size-xl);
          color: var(--text-muted);
          text-decoration: line-through;
        }

        .savings {
          padding: var(--spacing-sm) var(--spacing-md);
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
          font-weight: 600;
        }

        .product-meta {
          display: grid;
          gap: var(--spacing-md);
          padding: var(--spacing-xl);
          background: var(--surface);
          border-radius: var(--radius-xl);
          border: 1px solid var(--border);
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .meta-label {
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .meta-value {
          color: var(--text-primary);
          font-weight: 600;
          font-size: var(--font-size-base);
        }

        .product-description {
          padding: var(--spacing-xl);
          background: var(--surface);
          border-radius: var(--radius-xl);
          border: 1px solid var(--border);
        }

        .product-description h3 {
          margin: 0 0 var(--spacing-md) 0;
          color: var(--text-primary);
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .description-text {
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-wrap;
          font-size: var(--font-size-base);
        }

        /* Секция покупки */
        .purchase-section {
          padding: var(--spacing-xl);
          background: var(--surface-elevated);
          border-radius: var(--radius-2xl);
          border: 2px solid var(--border);
          position: sticky;
          bottom: var(--spacing-lg);
        }

        .balance-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-lg);
          padding: var(--spacing-md);
          background: var(--surface);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
        }

        .balance-label {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
        }

        .balance-amount {
          font-weight: 700;
          font-size: var(--font-size-lg);
        }

        .balance-amount.sufficient {
          color: #10b981;
        }

        .balance-amount.insufficient {
          color: #ef4444;
        }

        .quantity-section {
          margin-bottom: var(--spacing-lg);
        }

        .quantity-label {
          color: var(--text-primary);
          font-weight: 600;
          margin-bottom: var(--spacing-sm);
        }

        .quantity-controls {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
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
          width: 60px;
          height: 40px;
          text-align: center;
          border: 1px solid var(--border);
          background: var(--surface-elevated);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: var(--font-size-base);
        }

        .quantity-input:focus {
          border-color: var(--accent);
          outline: none;
        }

        .total-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
          padding: var(--spacing-md);
          background: var(--accent-soft);
          border-radius: var(--radius-lg);
        }

        .total-label {
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 600;
        }

        .total-price {
          color: var(--accent-hover);
          font-size: var(--font-size-xl);
          font-weight: 700;
        }

        .purchase-btn {
          width: 100%;
          padding: var(--spacing-lg);
          font-size: var(--font-size-lg);
          font-weight: 700;
        }

        .insufficient-funds {
          text-align: center;
        }

        .insufficient-message {
          color: var(--text-secondary);
          margin-bottom: var(--spacing-sm);
        }

        .needed-amount {
          color: #ef4444;
          font-weight: 600;
          font-size: var(--font-size-lg);
          margin-bottom: var(--spacing-lg);
        }

        .topup-btn {
          width: 100%;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          font-weight: 700;
          padding: var(--spacing-lg);
          font-size: var(--font-size-lg);
        }

        .auth-required {
          text-align: center;
        }

        .auth-message {
          color: var(--text-secondary);
          margin-bottom: var(--spacing-lg);
        }

        /* Модальное окно изображения */
        .image-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease;
          padding: var(--spacing-lg);
        }

        .image-modal-container {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }

        .modal-image {
          max-width: 100%;
          max-height: 100%;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
        }

        .image-modal-close {
          position: absolute;
          top: -40px;
          right: 0;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .image-modal-close:hover {
          background: var(--accent);
          transform: scale(1.1);
        }

        .modal-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: none;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .modal-nav:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-50%) scale(1.1);
        }

        .modal-nav.prev { left: -60px; }
        .modal-nav.next { right: -60px; }

        .modal-counter {
          position: absolute;
          bottom: -40px;
          left: 50%;
          transform: translateX(-50%);
          color: white;
          background: rgba(0, 0, 0, 0.5);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-md);
          font-size: var(--font-size-sm);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .product-container {
            grid-template-columns: 1fr;
            gap: var(--spacing-lg);
            padding: var(--spacing-lg) var(--container-padding);
          }

          .product-gallery {
            position: static;
          }

          .product-title {
            font-size: var(--font-size-2xl);
          }

          .price-main {
            font-size: 2rem;
          }

          .modal-nav.prev { left: 10px; }
          .modal-nav.next { right: 10px; }

          .image-modal-close {
            top: 10px;
            right: 10px;
          }
        }

        @media (max-width: 480px) {
          .product-header {
            padding: var(--spacing-sm) var(--spacing-md);
          }

          .quantity-controls {
            justify-content: center;
          }

          .modal-counter {
            bottom: 10px;
          }
        }
      `}</style>
    </div>
  );
}