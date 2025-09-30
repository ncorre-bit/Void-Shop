// frontend/src/components/BannerCarousel.jsx - НОВАЯ РАБОЧАЯ СИСТЕМА
import React, { useState, useEffect, useCallback, useRef } from "react";

const BANNERS = [
  {
    id: 1,
    title: "Добро пожаловать в Void Shop!",
    subtitle: "Лучшие товары от проверенных продавцов",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textColor: "#ffffff"
  },
  {
    id: 2,
    title: "Быстрая доставка по всей России",
    subtitle: "Получайте заказы в кратчайшие сроки",
    background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    textColor: "#ffffff"
  },
  {
    id: 3,
    title: "Безопасные платежи",
    subtitle: "Защищенные транзакции через Telegram",
    background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    textColor: "#ffffff"
  },
  {
    id: 4,
    title: "Поддержка 24/7",
    subtitle: "Всегда готовы помочь с выбором товара",
    background: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    textColor: "#2d3748"
  }
];

export default function BannerCarousel({ height = 180, autoplayMs = 4000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false);

  const containerRef = useRef(null);
  const autoplayRef = useRef(null);
  const transitionTimeoutRef = useRef(null);

  // Автоскролл
  const startAutoplay = useCallback(() => {
    if (BANNERS.length <= 1) return;

    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }

    autoplayRef.current = setInterval(() => {
      if (!isDragging && !isAutoplayPaused) {
        setCurrentIndex(prev => (prev + 1) % BANNERS.length);
      }
    }, autoplayMs);
  }, [autoplayMs, isDragging, isAutoplayPaused]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  // Запуск/остановка автоскролла
  useEffect(() => {
    startAutoplay();
    return stopAutoplay;
  }, [startAutoplay, stopAutoplay]);

  // Переход к слайду
  const goToSlide = useCallback((index) => {
    if (index < 0 || index >= BANNERS.length) return;
    setCurrentIndex(index);
    setIsAutoplayPaused(true);

    // Возобновляем автоскролл через 3 секунды
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setIsAutoplayPaused(false);
    }, 3000);
  }, []);

  // Touch события
  const handleTouchStart = useCallback((e) => {
    if (BANNERS.length <= 1) return;

    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setTranslateX(0);
    stopAutoplay();
  }, [stopAutoplay]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  }, [isDragging, startX]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // Определяем направление свайпа
    const threshold = 50;
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0) {
        // Свайп вправо - предыдущий слайд
        goToSlide(currentIndex === 0 ? BANNERS.length - 1 : currentIndex - 1);
      } else {
        // Свайп влево - следующий слайд
        goToSlide((currentIndex + 1) % BANNERS.length);
      }
    }

    setTranslateX(0);
    startAutoplay();
  }, [isDragging, translateX, currentIndex, goToSlide, startAutoplay]);

  // Mouse события для десктопа
  const handleMouseDown = useCallback((e) => {
    if (BANNERS.length <= 1) return;

    setIsDragging(true);
    setStartX(e.clientX);
    setTranslateX(0);
    stopAutoplay();
  }, [stopAutoplay]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const currentX = e.clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  }, [isDragging, startX]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    const threshold = 50;
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0) {
        goToSlide(currentIndex === 0 ? BANNERS.length - 1 : currentIndex - 1);
      } else {
        goToSlide((currentIndex + 1) % BANNERS.length);
      }
    }

    setTranslateX(0);
    startAutoplay();
  }, [isDragging, translateX, currentIndex, goToSlide, startAutoplay]);

  // Пауза на hover
  const handleMouseEnter = useCallback(() => {
    setIsAutoplayPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsAutoplayPaused(false);
    if (!isDragging) {
      startAutoplay();
    }
  }, [isDragging, startAutoplay]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopAutoplay();
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [stopAutoplay]);

  // Mouse events для документа
  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (BANNERS.length === 0) return null;

  const transform = isDragging
    ? `translateX(calc(-${currentIndex * 100}% + ${translateX}px))`
    : `translateX(-${currentIndex * 100}%)`;

  return (
    <div
      className="banner-carousel"
      style={{ height: `${height}px` }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={containerRef}
        className="banner-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div
          className="banner-track"
          style={{
            transform,
            transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {BANNERS.map((banner) => (
            <div
              key={banner.id}
              className="banner-slide"
              style={{
                background: banner.background,
                color: banner.textColor
              }}
            >
              <div className="banner-content">
                <h3 className="banner-title">{banner.title}</h3>
                <p className="banner-subtitle">{banner.subtitle}</p>
              </div>

              <div className="banner-overlay"></div>
            </div>
          ))}
        </div>

        {/* Точки навигации */}
        {BANNERS.length > 1 && (
          <div className="banner-dots">
            {BANNERS.map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Перейти к слайду ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        .banner-carousel {
          width: 100%;
          margin: var(--spacing-lg) 0;
          border-radius: var(--radius-2xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          position: relative;
          user-select: none;
          -webkit-user-select: none;
          background: var(--surface);
          animation: slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .banner-container {
          width: 100%;
          height: 100%;
          position: relative;
          cursor: grab;
          overflow: hidden;
        }

        .banner-container:active {
          cursor: grabbing;
        }

        .banner-track {
          display: flex;
          width: ${BANNERS.length * 100}%;
          height: 100%;
          will-change: transform;
        }

        .banner-slide {
          width: ${100 / BANNERS.length}%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .banner-content {
          text-align: center;
          z-index: 2;
          position: relative;
          padding: var(--spacing-xl);
          max-width: 400px;
        }

        .banner-title {
          margin: 0 0 var(--spacing-sm) 0;
          font-size: var(--font-size-xl);
          font-weight: 700;
          line-height: 1.2;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .banner-subtitle {
          margin: 0;
          font-size: var(--font-size-base);
          opacity: 0.9;
          line-height: 1.4;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
        }

        .banner-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(
            circle at 30% 30%,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(0, 0, 0, 0.1) 70%
          );
          pointer-events: none;
        }

        .banner-dots {
          position: absolute;
          bottom: var(--spacing-lg);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: var(--spacing-sm);
          z-index: 10;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          padding: var(--spacing-sm) var(--spacing-md);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.6);
          border: none;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dot.active {
          width: 24px;
          background: rgba(255, 255, 255, 1);
          border-radius: 4px;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.8);
        }

        .dot:hover:not(.active) {
          background: rgba(255, 255, 255, 0.8);
          transform: scale(1.2);
        }

        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .banner-content {
            padding: var(--spacing-lg);
            max-width: 300px;
          }

          .banner-title {
            font-size: var(--font-size-lg);
          }

          .banner-subtitle {
            font-size: var(--font-size-sm);
          }

          .banner-dots {
            bottom: var(--spacing-md);
            padding: var(--spacing-xs) var(--spacing-sm);
          }

          .dot {
            width: 6px;
            height: 6px;
          }

          .dot.active {
            width: 20px;
          }
        }

        @media (max-width: 480px) {
          .banner-content {
            padding: var(--spacing-md);
            max-width: 280px;
          }

          .banner-title {
            font-size: var(--font-size-base);
          }

          .banner-subtitle {
            font-size: var(--font-size-xs);
          }
        }

        /* Touch improvements */
        @media (hover: none) and (pointer: coarse) {
          .banner-container {
            cursor: default;
          }

          .banner-container:active {
            cursor: default;
          }
        }
      `}</style>
    </div>
  );
}