// frontend/src/components/BannerCarousel.jsx
import React, { useEffect, useRef, useState } from "react";

/*
 Reliable, simple carousel:
 - supports mouse drag and touch
 - auto-advance
 - manual arrows + clickable side zones
 - indicator knob moves
*/

const BANNERS = [
  { id: 1, title: "Летняя распродажа", subtitle: "Скидки до 50%", bg: "linear-gradient(120deg,#ff9a9e,#fecfef)" },
  { id: 2, title: "Новые поступления", subtitle: "Осень 2025", bg: "linear-gradient(120deg,#a18cd1,#fbc2eb)" },
  { id: 3, title: "Топ магазинов", subtitle: "Лучшие предложения", bg: "linear-gradient(120deg,#f6d365,#fda085)" },
];

export default function BannerCarousel({ height = 160, autoMs = 3500 }) {
  const [index, setIndex] = useState(0);
  const track = useRef(null);
  const container = useRef(null);
  const autoRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, currentX: 0 });

  useEffect(() => { goTo(index, false); startAuto(); return () => clearAuto(); /* eslint-disable-next-line */ }, []);
  useEffect(() => goTo(index, true), [index]); // animate on index change

  function startAuto() {
    clearAuto();
    autoRef.current = setInterval(() => {
      if (!drag.current.active) setIndex((s) => (s + 1) % BANNERS.length);
    }, autoMs);
  }
  function clearAuto() { if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; } }

  function goTo(i, animate = true) {
    const n = ((i % BANNERS.length) + BANNERS.length) % BANNERS.length;
    const el = track.current;
    if (!el) return;
    el.style.transition = animate ? "transform 520ms cubic-bezier(.2,.8,.2,1)" : "none";
    el.style.transform = `translateX(-${n * 100}%)`;
  }

  // pointer handlers using pointer events (most robust)
  function onPointerDown(e) {
    drag.current.active = true;
    drag.current.startX = e.clientX;
    drag.current.currentX = e.clientX;
    const el = track.current;
    if (el) el.style.transition = "none";
    clearAuto();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }
  function onPointerMove(e) {
    if (!drag.current.active) return;
    drag.current.currentX = e.clientX;
    applyDrag();
  }
  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    const dx = drag.current.currentX - drag.current.startX;
    finishDrag(dx);
    window.removeEventListener("pointermove", onPointerMove);
    setTimeout(startAuto, 600);
  }

  // touch fallback (should be covered by pointer events, but keep safe)
  function onTouchStart(e) { if (e.touches && e.touches[0]) onPointerDown({ clientX: e.touches[0].clientX }); }
  function onTouchMove(e) { if (e.touches && e.touches[0]) onPointerMove({ clientX: e.touches[0].clientX }); }
  function onTouchEnd() { onPointerUp(); }

  function applyDrag() {
    const el = track.current;
    if (!el || !container.current) return;
    const dx = drag.current.currentX - drag.current.startX;
    const w = container.current.clientWidth || 1;
    const percent = (dx / w) * 100;
    el.style.transform = `translateX(calc(-${index * 100}% + ${percent}%))`;
  }

  function finishDrag(dx) {
    const w = container.current.clientWidth || 1;
    const threshold = w * 0.15;
    if (Math.abs(dx) > threshold) {
      setIndex((s) => (dx > 0 ? (s - 1 + BANNERS.length) % BANNERS.length : (s + 1) % BANNERS.length));
    } else {
      goTo(index, true);
    }
  }

  function prev() { setIndex((s) => (s - 1 + BANNERS.length) % BANNERS.length); restartAuto(); }
  function next() { setIndex((s) => (s + 1) % BANNERS.length); restartAuto(); }
  function restartAuto() { clearAuto(); setTimeout(startAuto, 800); }

  const knobPct = BANNERS.length > 1 ? (index / (BANNERS.length - 1)) * 100 : 0;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        ref={container}
        className="banner-outer"
        style={{ height }}
        onPointerDown={onPointerDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseEnter={() => clearAuto()}
        onMouseLeave={() => startAuto()}
      >
        <div ref={track} className="banner-track">
          {BANNERS.map((b) => (
            <div key={b.id} className="banner-slide" style={{ background: b.bg }}>
              <div style={{ color: "#111" }}>
                <div className="title">{b.title}</div>
                <div className="subtitle">{b.subtitle}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="click-zone-left" onClick={(e) => { e.stopPropagation(); prev(); }} />
        <div className="click-zone-right" onClick={(e) => { e.stopPropagation(); next(); }} />

        <div className="banner-indicator" aria-hidden>
          <div className="bar">
            <div className="knob" style={{ left: `${knobPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
