// src/pages/CitySelect.jsx
import React from "react";
import "./cityselect.css";

export default function CitySelect({ open = false, cities = [], onClose = () => {}, onSelect = () => {} }) {
  if (!open) return null;

  function clickBg(e) {
    if (e.target.classList.contains("vs-city-backdrop")) onClose();
  }

  return (
    <div className="vs-city-backdrop" onClick={clickBg}>
      <div className="vs-city-modal" role="dialog" aria-modal="true">
        <h3>Выберите город</h3>
        <div className="vs-city-list">
          {cities.map((c) => (
            <button key={c} className="vs-city-item" onClick={() => onSelect(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="vs-city-actions">
          <button className="vs-city-cancel" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
