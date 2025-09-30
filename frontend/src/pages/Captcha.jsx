import React, { useEffect, useRef, useState } from "react";

export default function Captcha({ onOk }) {
  const [token, setToken] = useState(null);
  const [image, setImage] = useState(null);
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(false);
  const inputRef = useRef(null);

  // ИСПРАВЛЕНО: правильная переменная окружения
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    loadCaptcha();
  }, []);

  useEffect(() => {
    if (image && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [image]);

  async function loadCaptcha() {
    setLoading(true);
    setMsg("");
    setValue("");

    try {
      console.log('Загружаем капчу с URL:', `${API_BASE}/api/captcha`);

      const res = await fetch(`${API_BASE}/api/captcha`, {
        method: 'GET',
        credentials: "include",
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error("Captcha load failed:", res.status, txt);
        setMsg(`Ошибка загрузки: ${res.status}`);
        setImage(null);
        setToken(null);
        // Повторяем попытку через 3 секунды
        setTimeout(() => {
          if (mountedRef.current) loadCaptcha();
        }, 3000);
      } else {
        const j = await res.json();
        console.log('Капча загружена:', { token: j.token, hasImage: !!j.image });
        setToken(j.token);
        setImage(j.image);
        setMsg("");
      }
    } catch (e) {
      console.error("Captcha fetch error:", e);
      setMsg("Проблема с подключением");
      setImage(null);
      setToken(null);
      // Повторяем попытку через 5 секунд
      setTimeout(() => {
        if (mountedRef.current) loadCaptcha();
      }, 5000);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!value.trim()) {
      setMsg("Введите текст с картинки");
      inputRef.current?.focus();
      return;
    }
    if (!token) {
      setMsg("Капча не готова, ожидайте...");
      await loadCaptcha();
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      console.log('Проверяем капчу:', { token, answer: value });

      const res = await fetch(`${API_BASE}/api/verify_captcha`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ token, answer: value }),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: 'Неизвестная ошибка' }));
        console.error("Verify failed:", res.status, errorData);
        setMsg(`Ошибка проверки: ${errorData.detail || 'попробуйте позже'}`);
        setTimeout(() => loadCaptcha(), 2000);
      } else {
        const j = await res.json();
        console.log('Результат проверки:', j);

        if (j.ok) {
          setMsg("🎉 Проверка пройдена!");
          setTimeout(() => onOk?.(), 800);
        } else {
          if (j.reason === "wrong") {
            setMsg("❌ Неправильно, попробуйте еще раз");
            setTimeout(() => loadCaptcha(), 1500);
          } else if (j.reason === "expired") {
            setMsg("⏰ Время истекло, загружаем новую");
            setTimeout(() => loadCaptcha(), 1000);
          } else {
            setMsg(`Ошибка: ${j.reason || 'неизвестная'}`);
            setTimeout(() => loadCaptcha(), 2000);
          }
        }
      }
    } catch (e) {
      console.error("Verify error:", e);
      setMsg("🌐 Проблема с сетью");
      setTimeout(() => loadCaptcha(), 3000);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !loading && image) {
      submit();
    }
  }

  return (
    <div className="captcha-container">
      <div className="captcha-card">
        {/* Header */}
        <div className="captcha-header">
          <div className="captcha-logo">V</div>
          <h1 className="captcha-title">Void Shop</h1>
          <p className="captcha-subtitle">Подтвердите, что вы человек</p>
        </div>

        {/* Captcha Image */}
        <div className="captcha-image-container">
          {image ? (
            <img
              src={image}
              alt="captcha"
              className="captcha-image"
            />
          ) : (
            <div className="captcha-placeholder">
              {loading ? (
                <div className="captcha-loading">
                  <div className="loading-spinner"></div>
                  <div>Загрузка капчи...</div>
                </div>
              ) : (
                <div className="captcha-error">
                  <div className="error-icon">🔄</div>
                  <div>Загружаем капчу...</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Введите текст с картинки"
          disabled={loading || !image}
          className="captcha-input"
        />

        {/* Message */}
        {msg && (
          <div className={`captcha-message ${msg.includes("🎉") ? "success" : msg.includes("❌") ? "error" : "info"}`}>
            {msg}
          </div>
        )}

        {/* Submit Button */}
        <button
          disabled={loading || !image || !value.trim()}
          onClick={submit}
          className="captcha-submit"
        >
          {loading ? (
            <>
              <div className="button-spinner"></div>
              Проверяем...
            </>
          ) : (
            <>
              <span>✔</span>
              Подтвердить
            </>
          )}
        </button>
      </div>

      <style>{`
        .captcha-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-lg);
          background: linear-gradient(
            135deg,
            rgba(139, 92, 246, 0.08) 0%,
            rgba(124, 58, 237, 0.04) 50%,
            rgba(0, 0, 0, 0.01) 100%
          );
          position: relative;
        }

        .captcha-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(124, 58, 237, 0.08) 0%, transparent 50%);
        }

        :global(.theme-dark) .captcha-container::before {
          background-image:
            radial-gradient(circle at 25% 25%, rgba(167, 139, 250, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(139, 92, 246, 0.12) 0%, transparent 50%);
        }

        .captcha-card {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 480px;
          background: var(--surface-elevated);
          backdrop-filter: blur(24px);
          border-radius: var(--radius-2xl);
          padding: var(--spacing-2xl);
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border);
          animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .captcha-header {
          text-align: center;
          margin-bottom: var(--spacing-xl);
        }

        .captcha-logo {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--primary-black) 0%, var(--gray-800) 100%);
          color: var(--primary-white);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--font-size-xl);
          margin: 0 auto var(--spacing-md) auto;
          box-shadow: var(--shadow-lg);
          transition: all 0.3s ease;
        }

        :global(.theme-dark) .captcha-logo {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          box-shadow: 0 8px 32px rgba(167, 139, 250, 0.3);
        }

        .captcha-title {
          margin: 0 0 var(--spacing-xs) 0;
          color: var(--text-primary);
          font-size: var(--font-size-2xl);
          font-weight: 700;
        }

        .captcha-subtitle {
          margin: 0;
          color: var(--text-secondary);
          font-size: var(--font-size-base);
        }

        .captcha-image-container {
          display: flex;
          justify-content: center;
          margin-bottom: var(--spacing-lg);
          min-height: 140px;
          border: 2px dashed var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          position: relative;
          overflow: hidden;
        }

        .captcha-image {
          width: 100%;
          max-width: 420px;
          height: 140px;
          object-fit: contain;
          border-radius: var(--radius-md);
        }

        .captcha-placeholder {
          width: 100%;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .captcha-loading,
        .captcha-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .error-icon {
          font-size: 24px;
          opacity: 0.6;
        }

        .captcha-input {
          width: 100%;
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-lg);
          border: 2px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          font-size: var(--font-size-lg);
          font-weight: 500;
          text-align: center;
          letter-spacing: 2px;
          transition: all 0.3s ease;
          margin-bottom: var(--spacing-md);
          box-shadow: var(--shadow-sm);
        }

        .captcha-input:focus {
          border-color: var(--accent);
          background: var(--surface-elevated);
          box-shadow: 0 0 0 4px var(--accent-soft);
          transform: scale(1.02);
        }

        .captcha-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .captcha-message {
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-md);
          font-weight: 500;
          text-align: center;
          animation: slideDown 0.3s ease;
          border: 1px solid transparent;
        }

        .captcha-message.success {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
          border-color: #c3e6cb;
        }

        .captcha-message.error {
          background: linear-gradient(135deg, #f8d7da, #f5c6cb);
          color: #721c24;
          border-color: #f5c6cb;
        }

        .captcha-message.info {
          background: linear-gradient(135deg, #d1ecf1, #bee5eb);
          color: #0c5460;
          border-color: #bee5eb;
        }

        .captcha-submit {
          width: 100%;
          padding: var(--spacing-md) var(--spacing-lg);
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
          color: var(--primary-white);
          border-radius: var(--radius-lg);
          border: none;
          font-weight: 600;
          font-size: var(--font-size-lg);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
          position: relative;
          overflow: hidden;
        }

        .captcha-submit::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .captcha-submit:hover:not(:disabled)::before {
          left: 100%;
        }

        .captcha-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        .captcha-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .captcha-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .button-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-10px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
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

        @media (max-width: 480px) {
          .captcha-card {
            padding: var(--spacing-lg);
            margin: var(--spacing-md);
          }

          .captcha-image-container {
            min-height: 120px;
          }

          .captcha-image {
            height: 120px;
          }
        }
      `}</style>
    </div>
  );
}