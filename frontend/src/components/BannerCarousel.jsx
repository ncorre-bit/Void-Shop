// frontend/src/components/BannerCarousel.jsx - ИСПРАВЛЕНО: правильный автоскролл + картинки
import React, { useEffect, useRef, useState, useCallback } from "react";

// ИСПРАВЛЕНО: Обновленные баннеры под реальные картинки
const BANNERS = [
  {
    id: 1,
    title: "Летняя распродажа",
    subtitle: "Скидки до 50% на все товары",
    image: null, // Здесь будут реальные изображения
    bg: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
    action: () => console.log('Переход к летним товарам')
  },
  {
    id: 2,
    title: "Новые поступления",
    subtitle: "Осенняя коллекция 2025",
    image: null,
    bg: "linear-gradient(135deg, #a29bfe 0%, #fd79a8 100%)",
    action: () => console.log('Переход к новинкам')
  },
  {
    id: 3,
    title: "Топ магазинов",
    subtitle: "Лучшие предложения города",
    image: null,
    bg: "linear-gradient(135deg, #00cec9 0%, #55efc4 100%)",
    action: () => console.log('Переход к топ магазинам')
  }
];

export default function BannerCarousel({ height = 180, autoMs = 5000 }) { // ИСПРАВЛЕНО: увеличили интервал
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, time: 0 });
  const [dragOffset, setDragOffset] = useState(0);

  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const autoplayRef = useRef(null);
  const touchStartRef = useRef({ x: 0, time: 0 });
  const isTransitioningRef = useRef(false);

  // ИСПРАВЛЕНО: Стабильный автоскролл без дублирования
  const startAutoplay = useCallback(() => {
    if (BANNERS.length <= 1 || !isAutoplay || isDragging) return;

    // Очищаем предыдущий интервал
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }

    autoplayRef.current = setInterval(() => {
      // ИСПРАВЛЕНО: проверяем что не в процессе перехода
      if (!isTransitioningRef.current && !isDragging) {
        setCurrentIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % BANNERS.length;
          console.log(`Автоскролл: ${prevIndex} -> ${nextIndex}`);
          return nextIndex;
        });
      }
    }, autoMs);

    console.log(`Автоскролл запущен с интервалом ${autoMs}ms`);
  }, [isAutoplay, autoMs, isDragging]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
      console.log('Автоскролл остановлен');
    }
  }, []);

  // ИСПРАВЛЕНО: Правильное управление автоскроллом
  useEffect(() => {
    if (isAutoplay && !isDragging && BANNERS.length > 1) {
      // Запускаем с задержкой после монтирования
      const timer = setTimeout(() => {
        startAutoplay();
      }, 1000);

      return () => {
        clearTimeout(timer);
        stopAutoplay();
      };
    } else {
      stopAutoplay();
    }

    return stopAutoplay;
  }, [isAutoplay, isDragging, startAutoplay, stopAutoplay]);

  // ИСПРАВЛЕНО: Плавное позиционирование с правильными переходами
  useEffect(() => {
    if (!trackRef.current) return;

    const track = trackRef.current;
    const translateX = -currentIndex * 100;

    if (isDragging) {
      // Во время перетаскивания - без анимации
      track.style.transition = 'none';
      track.style.transform = `translateX(${translateX}%)`;
    } else {
      // ИСПРАВЛЕНО: Контролируем переходы
      isTransitioningRef.current = true;
      track.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
      track.style.transform = `translateX(${translateX}%)`;

      // Сбрасываем флаг после завершения анимации
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, isDragging]);

  // ИСПРАВЛЕНО: Touch события с правильной чувствительностью
  const handleTouchStart = useCallback((e) => {
    if (BANNERS.length <= 1) return;

    const touch = e.touches[0];
    const startData = {
      x: touch.clientX,
      time: Date.now()
    };

    setDragStart(startData);
    touchStartRef.current = startData;
    setIsDragging(true);
    setIsAutoplay(false); // Останавливаем автоскролл
    setDragOffset(0);

    console.log('Touch start:', startData);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || BANNERS.length <= 1) return;

    // ИСПРАВЛЕНО: Предотвращаем скролл страницы только при горизонтальном движении
    const touch = e.touches[0];
    const diff = touch.clientX - touchStartRef.current.x;

    // Если движение более горизонтальное чем вертикальное - блокируем скролл
    if (Math.abs(diff) > 10) {
      e.preventDefault();
    }

    const containerWidth = containerRef.current?.offsetWidth || 1;

    // ИСПРАВЛЕНО: Снижаем чувствительность и ограничиваем смещение
    const maxDrag = containerWidth * 0.25; // 25% вместо 30%
    const limitedOffset = Math.max(-maxDrag, Math.min(maxDrag, diff));

    setDragOffset(limitedOffset);
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || BANNERS.length <= 1) return;

    console.log('Touch end, offset:', dragOffset);

    const endTime = Date.now();
    const duration = endTime - touchStartRef.current.time;
    const distance = dragOffset;
    const velocity = Math.abs(distance) / Math.max(duration, 1); // Избегаем деления на 0
    const containerWidth = containerRef.current?.offsetWidth || 1;

    // ИСПРАВЛЕНО: Более строгие пороги для свайпа
    const threshold = containerWidth * 0.15; // 15% вместо 20%
    const fastSwipe = velocity > 0.3; // Снижено с 0.4

    const shouldSwipe = Math.abs(distance) > threshold || fastSwipe;

    console.log('Touch end decision:', { distance, threshold, velocity, shouldSwipe });

    if (shouldSwipe) {
      if (distance > 0) {
        // Свайп вправо - предыдущий слайд
        const newIndex = currentIndex === 0 ? BANNERS.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
        console.log('Свайп вправо:', currentIndex, '->', newIndex);
      } else {
        // Свайп влево - следующий слайд
        const newIndex = (currentIndex + 1) % BANNERS.length;
        setCurrentIndex(newIndex);
        console.log('Свайп влево:', currentIndex, '->', newIndex);
      }
    }

    // Сбрасываем состояния
    setIsDragging(false);
    setDragOffset(0);

    // ИСПРАВЛЕНО: Возобновляем автоскролл через большую задержку
    setTimeout(() => {
      setIsAutoplay(true);
    }, 5000); // Увеличено до 5 секунд
  }, [isDragging, dragOffset, currentIndex]);

  // Mouse события для десктопа
  const handleMouseEnter = useCallback(() => {
    console.log('Mouse enter - останавливаем автоскролл');
    setIsAutoplay(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      console.log('Mouse leave - возобновляем автоскролл');
      setIsAutoplay(true);
    }
  }, [isDragging]);

  // Переход к конкретному слайду
  const goToSlide = useCallback((index) => {
    if (index === currentIndex || isDragging || isTransitioningRef.current) return;

    console.log('Manual slide:', currentIndex, '->', index);
    setCurrentIndex(index);
    setIsAutoplay(false);

    // Возобновляем через задержку
    setTimeout(() => {
      setIsAutoplay(true);
    }, 3000);
  }, [currentIndex, isDragging]);

  // Клик по баннеру
  const handleBannerClick = useCallback((banner) => {
    if (!isDragging && banner.action) {
      banner.action();
    }
  }, [isDragging]);

  if (BANNERS.length === 0) return null;

  return (
    <div className="banner-carousel" style={{ height: `${height}px` }}>
      <div
        ref={containerRef}
        className="banner-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={trackRef}
          className="banner-track"
          style={{
            display: 'flex',
            width: `${BANNERS.length * 100}%`,
            height: '100%',
            willChange: 'transform'
          }}
        >
          {BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className="banner-slide"
              onClick={() => handleBannerClick(banner)}
              style={{
                flex: '0 0 auto',
                width: `${100 / BANNERS.length}%`,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: 'var(--spacing-xl) var(--spacing-2xl)',
                position: 'relative',
                color: 'white',
                overflow: 'hidden',
                background: banner.image ? `url(${banner.image})` : banner.bg,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: banner.action ? 'pointer' : 'default'
              }}
            >
              {/* ИСПРАВЛЕНО: Лучший оверлей для читаемости */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: banner.image
                  ? 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.4) 100%)'
                  : 'radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)',
                pointerEvents: 'none'
              }} />

              <div style={{
                position: 'relative',
                zIndex: 3,
                maxWidth: '60%'
              }}>
                <h3 style={{
                  margin: '0 0 var(--spacing-sm) 0',
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  textShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
                  letterSpacing: '-0.025em'
                }}>
                  {banner.title}
                </h3>
                <p style={{
                  margin: '0 0 var(--spacing-md) 0',
                  fontSize: 'var(--font-size-base)',
                  fontWeight: 500,
                  opacity: 0.95,
                  textShadow: '0 1px 6px rgba(0, 0, 0, 0.4)',
                  lineHeight: 1.4
                }}>
                  {banner.subtitle}
                </p>
                <div style={{
                  width: 50,
                  height: 4,
                  background: 'currentColor',
                  borderRadius: 2,
                  opacity: 0.9,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
                }} />
              </div>

              {/* Декоративные элементы */}
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: '40%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2
              }}>
                <div style={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  top: '10%',
                  right: '10%',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(2px)',
                  animation: 'float 6s ease-in-out infinite'
                }} />
                <div style={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  top: '60%',
                  right: '30%',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(2px)',
                  animation: 'float 8s ease-in-out infinite reverse'
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* УЛУЧШЕННАЯ: Dots навигация */}
        {BANNERS.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: 'var(--spacing-lg)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 'var(--spacing-sm)',
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(12px)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {BANNERS.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                aria-label={`Перейти к баннеру ${index + 1}`}
                disabled={isTransitioningRef.current}
                style={{
                  width: index === currentIndex ? 20 : 10,
                  height: 10,
                  borderRadius: index === currentIndex ? 5 : '50%',
                  background: index === currentIndex
                    ? 'rgba(255, 255, 255, 1)'
                    : 'rgba(255, 255, 255, 0.5)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: index === currentIndex ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: index === currentIndex ? '0 0 16px rgba(255, 255, 255, 0.8)' : 'none',
                  opacity: isTransitioningRef.current ? 0.5 : 1
                }}
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
        }

        .banner-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: grab;
          touch-action: pan-y;
        }

        .banner-container:active {
          cursor: grabbing;
        }

        .banner-slide {
          transition: filter 0.3s ease;
        }

        .banner-slide:hover {
          filter: brightness(1.05);
        }

        .banner-slide:active {
          filter: brightness(0.95);
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .banner-slide {
            padding: var(--spacing-lg) !important;
          }

          .banner-slide > div:first-of-type {
            max-width: 75% !important;
          }

          .banner-slide h3 {
            font-size: var(--font-size-xl) !important;
          }

          .banner-slide p {
            font-size: var(--font-size-sm) !important;
          }
        }

        @media (max-width: 480px) {
          .banner-slide {
            padding: var(--spacing-md) !important;
          }

          .banner-slide > div:first-of-type {
            max-width: 85% !important;
          }

          .banner-slide h3 {
            font-size: var(--font-size-lg) !important;
          }

          .banner-slide p {
            font-size: var(--font-size-xs) !important;
            margin-bottom: var(--spacing-sm) !important;
          }
        }

        /* НОВОЕ: Плавная анимация для переходов */
        .banner-track {
          backface-visibility: hidden;
          perspective: 1000px;
        }

        /* Улучшенная анимация для touch */
        .banner-container.dragging .banner-track {
          transition: none !important;
        }
      `}</style>
    </div>
  );
}