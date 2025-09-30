// frontend/src/hooks/usePullToRefresh.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useEffect, useRef, useState, useCallback } from 'react';

export function usePullToRefresh(onRefresh, threshold = 80, enabled = true) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showIndicator, setShowIndicator] = useState(false);
  const [canPull, setCanPull] = useState(false);

  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const refreshTriggered = useRef(false);

  // Мемоизируем функцию обновления
  const handleRefresh = useCallback(async () => {
    if (typeof onRefresh === 'function' && !refreshTriggered.current) {
      refreshTriggered.current = true;
      setIsRefreshing(true);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Ошибка при обновлении:', error);
      } finally {
        // Задержка для плавности
        setTimeout(() => {
          setIsRefreshing(false);
          resetState();
        }, 800);
      }
    }
  }, [onRefresh]);

  const resetState = useCallback(() => {
    isDragging.current = false;
    refreshTriggered.current = false;
    setCanPull(false);
    setPullDistance(0);
    setShowIndicator(false);
    startY.current = 0;
    currentY.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) {
      resetState();
      return;
    }

    let animationFrame = null;

    // Проверяем, можно ли тянуть
    const canStartPull = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      return scrollTop <= 5 && !isRefreshing;
    };

    // Применяем изменения плавно через RAF
    const applyPullDistance = (distance) => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        const dampened = Math.min(distance * 0.4, threshold * 1.5);
        setPullDistance(dampened);
        setShowIndicator(dampened > 20);
      });
    };

    // Touch события
    const handleTouchStart = (e) => {
      if (!canStartPull()) return;

      const touch = e.touches[0];
      startY.current = touch.clientY;
      currentY.current = touch.clientY;
      setCanPull(true);
      isDragging.current = false;
    };

    const handleTouchMove = (e) => {
      if (!canPull || isRefreshing || !e.touches[0]) return;

      const touch = e.touches[0];
      currentY.current = touch.clientY;
      const distance = currentY.current - startY.current;

      // Проверяем, что тянем вниз и все еще наверху
      if (distance > 0 && canStartPull()) {
        isDragging.current = true;
        e.preventDefault(); // Предотвращаем скролл

        applyPullDistance(distance);

        // Добавляем тактильную обратную связь
        if (distance >= threshold && !refreshTriggered.current) {
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      } else if (!canStartPull()) {
        resetState();
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging.current || !canPull) {
        resetState();
        return;
      }

      const distance = currentY.current - startY.current;
      const shouldRefresh = distance >= threshold && !isRefreshing;

      if (shouldRefresh) {
        // Фиксируем на пороговом значении
        setPullDistance(threshold);
        setShowIndicator(true);
        handleRefresh();
      } else {
        // Плавно убираем
        animateReset();
      }

      setCanPull(false);
      isDragging.current = false;
    };

    // Плавная анимация сброса
    const animateReset = () => {
      const startDistance = pullDistance;
      const startTime = performance.now();
      const duration = 400;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing функция
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentDistance = startDistance * (1 - easeOut);

        if (currentDistance <= 1) {
          resetState();
        } else {
          setPullDistance(currentDistance);
          setShowIndicator(currentDistance > 20);
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
    };

    // Сброс при скролле
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 10) {
        resetState();
      }
    };

    // Добавляем слушатели
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('scroll', handleScroll);

      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [enabled, threshold, isRefreshing, pullDistance, canPull, handleRefresh, resetState]);

  return {
    isRefreshing,
    pullDistance,
    showIndicator,
    isActive: isDragging.current && canPull
  };
}