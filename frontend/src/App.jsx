// frontend/src/App.jsx - ИСПРАВЛЕНО: правильная Telegram интеграция
import React, { useEffect, useState } from "react";
import Captcha from "./pages/Captcha";
import CitySelector from "./components/CitySelector";
import Header from "./components/Header";
import Home from "./pages/Home";
import News from "./pages/News";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CategoryPage from "./pages/CategoryPage";
import ProductModal from "./components/ProductModal";
import CatalogModal from "./components/CatalogModal";
import BottomNav from "./components/BottomNav";
import { getTelegramUser, initTelegramWebApp } from "./utils/telegram";
import { userAPI } from "./services/api";
import "./styles/global.css";

function PageWrapper({ children }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const timer = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={`page-transition ${enter ? 'enter' : ''}`}
      style={{
        opacity: enter ? 1 : 0,
        transform: enter ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {children}
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState("loading");
  const [page, setPage] = useState("home");
  const [city, setCity] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [initError, setInitError] = useState(null);

  // Модальные состояния
  const [showCatalog, setShowCatalog] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      console.log('🚀 Инициализация Void Shop...');

      // ИСПРАВЛЕНО: Строгая проверка Telegram
      await initTelegramWebApp();
      const tgUser = await getTelegramUser();

      console.log('✅ Получены данные пользователя Telegram:', {
        id: tgUser.id,
        first_name: tgUser.first_name,
        username: tgUser.username
      });

      setTelegramUser(tgUser);

      // Восстанавливаем сохраненные настройки
      try {
        const savedTheme = localStorage.getItem("voidshop_theme");
        if (savedTheme && savedTheme !== "auto") {
          document.documentElement.className = savedTheme === "dark" ? "theme-dark" : "theme-light";
        }

        const savedCity = localStorage.getItem("voidshop_city");
        if (savedCity) {
          setCity(savedCity);
        }
      } catch (e) {
        console.warn('Не удалось загрузить настройки из localStorage:', e);
      }

      setAppState("captcha");

    } catch (error) {
      console.error("❌ Критическая ошибка инициализации:", error);
      setInitError(error.message);
      setAppState("error"); // НОВОЕ: показываем экран ошибки вместо капчи
    }
  }

  async function handleCaptchaPassed() {
    console.log("✅ Капча пройдена");

    // Если город уже сохранен, сразу переходим к приложению
    if (city) {
      await createOrUpdateUser(city);
    } else {
      setAppState("city");
    }
  }

  async function handleCitySelected(selectedCity) {
    console.log("🏙️ Выбран город:", selectedCity);
    setCity(selectedCity);
    localStorage.setItem("voidshop_city", selectedCity);

    await createOrUpdateUser(selectedCity);
  }

  async function createOrUpdateUser(selectedCity) {
    if (telegramUser) {
      try {
        console.log("👤 Создаем/обновляем пользователя...");

        const userData = await userAPI.createOrUpdateUser({
          ...telegramUser,
          city: selectedCity
        });

        console.log("✅ Пользователь создан/обновлен:", userData.id);
        setUser(userData);
        setAppState("app");

      } catch (error) {
        console.error("❌ Ошибка при работе с пользователем:", error);
        // Не блокируем приложение, просто предупреждаем
        console.warn('Приложение будет работать без синхронизации с сервером');
        setAppState("app");
      }
    } else {
      setAppState("app");
    }
  }

  // Навигация
  function handleNavigate(newPage) {
    if (newPage === page) return;
    console.log("📱 Навигация:", page, "->", newPage);
    setPage(newPage);
    setShowCatalog(false);
    setCurrentCategory(null);
    setCurrentProduct(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCatalogClick() {
    setShowCatalog(true);
  }

  function handleCategoryClick(category) {
    setCurrentCategory(category);
    setPage("category");
    setShowCatalog(false);
  }

  function handleProductClick(product) {
    setCurrentProduct(product);
  }

  function handleBackFromCategory() {
    setCurrentCategory(null);
    setPage("home");
  }

  function handleCloseProduct() {
    setCurrentProduct(null);
  }

  function handleCityChange(newCity) {
    setCity(newCity);
    localStorage.setItem("voidshop_city", newCity);

    if (user && telegramUser) {
      userAPI.createOrUpdateUser({ ...telegramUser, city: newCity })
        .catch(error => console.warn("Не удалось обновить город:", error));
    }
  }

  // НОВЫЙ: Экран ошибки для проблем с Telegram
  if (appState === "error") {
    return (
      <div className="error-screen">
        <div className="error-container">
          <div className="error-logo">⚠️</div>
          <h2>Ошибка запуска</h2>
          <p className="error-message">{initError}</p>
          <div className="error-instructions">
            <h3>Как исправить:</h3>
            <ul>
              <li>Убедитесь что открыли приложение через Telegram бота</li>
              <li>Не открывайте ссылку в браузере</li>
              <li>Перезапустите бота командой /start</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Попробовать снова
          </button>
        </div>

        <style>{`
          .error-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-xl);
            background: var(--bg);
            text-align: center;
          }

          .error-container {
            max-width: 400px;
            padding: var(--spacing-2xl);
            background: var(--surface);
            border-radius: var(--radius-2xl);
            box-shadow: var(--shadow-xl);
            border: 1px solid var(--border);
          }

          .error-logo {
            font-size: 64px;
            margin-bottom: var(--spacing-lg);
          }

          .error-container h2 {
            margin: 0 0 var(--spacing-lg) 0;
            color: var(--text-primary);
            font-size: var(--font-size-2xl);
            font-weight: 700;
          }

          .error-message {
            color: #ef4444;
            margin: 0 0 var(--spacing-xl) 0;
            padding: var(--spacing-md);
            background: rgba(239, 68, 68, 0.1);
            border-radius: var(--radius-md);
            font-weight: 500;
          }

          .error-instructions {
            text-align: left;
            margin: var(--spacing-xl) 0;
            padding: var(--spacing-lg);
            background: var(--surface-elevated);
            border-radius: var(--radius-md);
            border: 1px solid var(--border);
          }

          .error-instructions h3 {
            margin: 0 0 var(--spacing-md) 0;
            color: var(--text-primary);
            font-size: var(--font-size-lg);
            font-weight: 600;
          }

          .error-instructions ul {
            margin: 0;
            padding-left: var(--spacing-lg);
            color: var(--text-secondary);
            line-height: 1.6;
          }

          .retry-button {
            padding: var(--spacing-md) var(--spacing-xl);
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            color: var(--primary-white);
            border: none;
            border-radius: var(--radius-lg);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: var(--shadow-md);
          }

          .retry-button:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
          }
        `}</style>
      </div>
    );
  }

  // Состояние загрузки
  if (appState === "loading") {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="loading-container">
          <div className="loading-logo">V</div>
          <div className="loading-spinner"></div>
          <h3>Инициализация Void Shop...</h3>
          <p>Подключение к Telegram...</p>
        </div>

        <style>{`
          .loading-logo {
            width: 80px; height: 80px; border-radius: var(--radius-xl);
            background: linear-gradient(135deg, var(--accent), var(--accent-hover));
            display: flex; align-items: center; justify-content: center;
            font-size: var(--font-size-2xl); color: white; font-weight: 700;
            animation: logoFloat 3s ease-in-out infinite; box-shadow: var(--shadow-lg);
          }

          .loading-container {
            display: flex; flex-direction: column; align-items: center;
            gap: var(--spacing-lg); text-align: center; max-width: 300px;
            margin: 0 auto; padding: var(--spacing-2xl);
          }

          .loading-container h3 {
            margin: 0; color: var(--text-primary);
            font-size: var(--font-size-xl); font-weight: 700;
          }

          .loading-container p {
            margin: 0; color: var(--text-secondary);
            font-size: var(--font-size-base);
          }

          @keyframes logoFloat {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-8px) scale(1.05); }
          }
        `}</style>
      </div>
    );
  }

  if (appState === "captcha") {
    return <Captcha onOk={handleCaptchaPassed} />;
  }

  if (appState === "city") {
    return <CitySelector onSelect={handleCitySelected} defaultCity={city} />;
  }

  // Основное приложение
  return (
    <div className="app-container">
      <Header onCatalogClick={handleCatalogClick} />

      <main className="main-content">
        <div className="container">
          {page === "home" && (
            <PageWrapper key="home">
              <Home
                city={city || "Москва"}
                user={user}
                onNavigateToCategory={handleCategoryClick}
                onProductClick={handleProductClick}
              />
            </PageWrapper>
          )}

          {page === "news" && (
            <PageWrapper key="news">
              <News />
            </PageWrapper>
          )}

          {page === "profile" && (
            <PageWrapper key="profile">
              <Profile
                city={city || "Москва"}
                setCity={handleCityChange}
                user={user}
                telegramUser={telegramUser}
              />
            </PageWrapper>
          )}

          {page === "settings" && (
            <PageWrapper key="settings">
              <Settings />
            </PageWrapper>
          )}

          {page === "category" && currentCategory && (
            <PageWrapper key="category">
              <CategoryPage
                category={currentCategory}
                city={city || "Москва"}
                onBack={handleBackFromCategory}
                onProductClick={handleProductClick}
              />
            </PageWrapper>
          )}
        </div>
      </main>

      {/* Модальные окна */}
      {showCatalog && (
        <CatalogModal
          city={city || "Москва"}
          onClose={() => setShowCatalog(false)}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {currentProduct && (
        <ProductModal
          product={currentProduct}
          user={user}
          onClose={handleCloseProduct}
        />
      )}

      <BottomNav onNavigate={handleNavigate} active={page} />

      <style>{`
        .app-container {
          min-height: 100vh;
          background: var(--bg);
          padding-bottom: calc(var(--bottom-nav-height) + var(--bottom-nav-margin) * 2);
          transition: background-color 0.3s ease;
        }

        .main-content {
          position: relative;
          z-index: 1;
        }

        .container {
          width: 100%;
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 0 var(--container-padding);
        }

        .page-transition {
          opacity: 0;
          transform: translateY(12px);
        }

        .page-transition.enter {
          opacity: 1;
          transform: translateY(0);
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}