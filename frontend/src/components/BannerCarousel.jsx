// frontend/src/components/BannerCarousel.jsx - ИСПРАВЛЕНО: убран jsx warning
import React, { useEffect, useRef, useState } from "react";

const BANNERS = [
  {
    id: 1,
    title: "Летняя распродажа",
    subtitle: "Скидки до 50% на все товары",
    bg: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)"
  },
  {
    id: 2,
    title: "Новые поступления",
    subtitle: "Осенняя коллекция 2025",
    bg: "linear-gradient(135deg, #a29bfe 0%, #fd79a8 100%)"
  },
  {
    id: 3,
    title: "Топ магазинов",
    subtitle: "Лучшие предложения города",
    bg: "linear-gradient(135deg, #00cec9 0%, #55efc4 100%)"
  }
];

export default function BannerCarousel({ height = 180, autoMs = 4000 }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const trackRef = useRef(null);
  const containerRef = useRef(null);

  // Автопрокрутка
  useEffect(() => {
    if (!isAutoplay || isDragging || BANNERS.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % BANNERS.length);
    }, autoMs);

    return () => clearInterval(interval);
  }, [isAutoplay, isDragging, autoMs]);

  // Touch events
  const handleTouchStart = (e) => {
    if (BANNERS.length <= 1) return;
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setIsDragging(true);
    setIsAutoplay(false);
    if (trackRef.current) trackRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const diff = touch.clientX - startX;
    const containerWidth = containerRef.current?.offsetWidth || 1;
    const percentage = (diff / containerWidth) * 100;
    const translateX = -currentIndex * 100 + percentage;

    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${translateX}%)`;
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const touch = e.changedTouches[0];
    const diff = touch.clientX - startX;
    const threshold = containerRef.current?.offsetWidth * 0.25 || 100;

    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.3s ease';
    }

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        setCurrentIndex(prev => prev === 0 ? BANNERS.length - 1 : prev - 1);
      } else {
        setCurrentIndex(prev => (prev + 1) % BANNERS.length);
      }
    }

    setTimeout(() => setIsAutoplay(true), 2000);
  };

  // Применяем позицию
  useEffect(() => {
    if (trackRef.current && !isDragging) {
      trackRef.current.style.transform = `translateX(-${currentIndex * 100}%)`;
    }
  }, [currentIndex, isDragging]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoplay(false);
    setTimeout(() => setIsAutoplay(true), 2000);
  };

  if (BANNERS.length === 0) return null;

  return (
    <div className="banner-carousel" style={{ height: `${height}px` }}>
      <div
        ref={containerRef}
        className="banner-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => setIsAutoplay(false)}
        onMouseLeave={() => setIsAutoplay(true)}
      >
        <div ref={trackRef} className="banner-track">
          {BANNERS.map((banner) => (
            <div key={banner.id} className="banner-slide" style={{ background: banner.bg }}>
              <div className="banner-content">
                <h3 className="banner-title">{banner.title}</h3>
                <p className="banner-subtitle">{banner.subtitle}</p>
                <div className="banner-accent"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots только если больше 1 баннера */}
        {BANNERS.length > 1 && (
          <div className="banner-dots">
            {BANNERS.map((_, index) => (
              <button
                key={index}
                className={`banner-dot ${index === currentIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={`Баннер ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ИСПРАВЛЕНО: убран jsx атрибут */}
      <style>{`
        .banner-carousel {
          width: 100%;
          margin: var(--spacing-lg) 0;
          border-radius: var(--radius-2xl);
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .banner-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: grab;
        }
        .banner-container:active { cursor: grabbing; }

        .banner-track {
          display: flex;
          width: ${BANNERS.length * 100}%;
          height: 100%;
          transition: transform 0.3s ease;
        }

        .banner-slide {
          flex: 1;
          width: ${100 / BANNERS.length}%;
          height: 100%;
          display: flex;
          align-items: center;
          padding: var(--spacing-xl) var(--spacing-2xl);
          position: relative;
          color: white;
        }

        .banner-slide::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
        }

        .banner-content {
          position: relative;
          z-index: 2;
          max-width: 60%;
        }

        .banner-title {
          margin: 0 0 var(--spacing-sm) 0;
          font-size: var(--font-size-2xl);
          font-weight: 800;
          line-height: 1.2;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        .banner-subtitle {
          margin: 0 0 var(--spacing-md) 0;
          font-size: var(--font-size-base);
          font-weight: 500;
          opacity: 0.95;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .banner-accent {
          width: 40px;
          height: 3px;
          background: currentColor;
          border-radius: 2px;
          opacity: 0.8;
        }

        .banner-dots {
          position: absolute;
          bottom: var(--spacing-md);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: var(--spacing-sm);
          z-index: 10;
        }

        .banner-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.4);
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .banner-dot.active {
          background: rgba(255, 255, 255, 0.9);
          transform: scale(1.2);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
        }

        .banner-dot:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: scale(1.1);
        }

        @media (max-width: 768px) {
          .banner-slide { padding: var(--spacing-lg); }
          .banner-content { max-width: 70%; }
          .banner-title { font-size: var(--font-size-xl); }
          .banner-subtitle { font-size: var(--font-size-sm); }
        }

        @media (max-width: 480px) {
          .banner-slide { padding: var(--spacing-md); }
          .banner-content { max-width: 80%; }
          .banner-title { font-size: var(--font-size-lg); }
          .banner-subtitle { font-size: var(--font-size-xs); }
          .banner-dot { width: 6px; height: 6px; }
        }
      `}</style>
    </div>
  );
}