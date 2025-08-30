// src/components/StoreCard.jsx
import React from "react";
import "./storecard.css";

export default function StoreCard({ title = "Название магазина", rating = 0 }) {
  return (
    <div className="vs-store-card">
      <div className="vs-store-avatar-placeholder" aria-hidden="true">
        {/* квадратная заглушка, потом сюда загрузим аватар */}
      </div>
      <div className="vs-store-info">
        <div className="vs-store-title">{title}</div>
        <div className="vs-store-rating" aria-hidden="true">
          {/* рисую простые звезды-заглушки */}
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={`star ${i < rating ? "filled" : ""}`}>★</span>
          ))}
        </div>
      </div>
    </div>
  );
}
