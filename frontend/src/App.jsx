// frontend/src/App.jsx - ИСПРАВЛЕНО: критический баг с telegramUser.id
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
import ErrorBoundary from "./components/ErrorBoundary";
import { getTelegramUser, initTelegramWebApp } from "./utils/telegram";
import { userAPI } from "./services/api";
import "./styles/global.css";

// НОВОЕ: Timeout wrapper для предотвращения блокировок
const withTimeout = (promise, ms = 3000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
};

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
  const [isOffline, setIsOffline] = useState(false);

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

      // ИСПРАВЛЕНО: Строгая проверка Telegram с timeout
      await withTimeout(initTelegramWebApp(), 5000);
      const tgUser = await withTimeout(getTelegramUser(), 3000);

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
      setAppState("error");
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
    if (!telegramUser) {
      console.warn('Нет данных Telegram пользователя, переходим в приложение');
      setAppState("app");
      return;
    }

    try {
      console.log("👤 Создаем/обновляем пользователя...");

      // ИСПРАВЛЕНО КРИТИЧЕСКИ: Проверяем telegramUser.id вместо userData.id
      if (!telegramUser?.id || typeof telegramUser.id !== 'number' || telegramUser.id <= 0) {
        throw new Error('Некорректный Telegram ID пользователя');
      }

      // ИСПРАВЛЕНО: Timeout для предотвращения блокировки UI
      const userData = await withTimeout(
        userAPI.createOrUpdateUser({
          ...telegramUser,
          city: selectedCity
        }),
        5000 // 5 секунд timeout
      );

      console.log("✅ Пользователь создан/обновлен:", userData.id);
      setUser(userData);
      setIsOffline(false);
      setAppState("app");

    } catch (error) {
      console.error("❌ Ошибка при работе с пользователем:", error);

      // ИСПРАВЛЕНО: НЕ блокируем приложение при ошибке API
      console.warn('Backend недоступен, работаем в offline режиме');
      setIsOffline(true);

      // Создаем минимальный пользовательский объект из Telegram данных
      const offlineUser = {
        id: null,
        tg_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        city: selectedCity,
        balance: 0,
        registered_at: new Date(),
        last_active: new Date(),
        is_verified: false,
        avatar_url: telegramUser.photo_url
      };

      setUser(offlineUser);
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

    // ИСПРАВЛЕНО: Не блокируем UI при обновлении города
    if (user && telegramUser && !isOffline) {
      withTimeout(
        userAPI.createOrUpdateUser({ ...telegramUser, city: newCity }),
        3000
      ).catch(error => {
        console.warn("Не удалось обновить город на сервере:", error);
        setIsOffline(true);
      });
    }
  }

  // УЛУЧШЕННЫЙ: Экран ошибки
  if (appState === "error") {
    return (
      <ErrorBoundary>
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
        </div>
      </ErrorBoundary>
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
      </div>
    );
  }

  if (appState === "captcha") {
    return (
      <ErrorBoundary>
        <Captcha onOk={handleCaptchaPassed} />
      </ErrorBoundary>
    );
  }

  if (appState === "city") {
    return (
      <ErrorBoundary>
        <CitySelector onSelect={handleCitySelected} defaultCity={city} />
      </ErrorBoundary>
    );
  }

  // Основное приложение
  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* НОВОЕ: Индикатор offline режима */}
        {isOffline && (
          <div className="offline-banner">
            <span className="offline-icon">📡</span>
            <span>Offline режим - некоторые функции недоступны</span>
          </div>
        )}

        <Header onCatalogClick={handleCatalogClick} />

        <main className="main-content">
          <div className="container">
            {page === "home" && (
              <PageWrapper key="home">
                <Home
                  city={city || "Москва"}
                  user={user}
                  isOffline={isOffline}
                  onNavigateToCategory={handleCategoryClick}
                  onProductClick={handleProductClick}
                  onCatalogClick={handleCatalogClick}
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
                  isOffline={isOffline}
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
                  isOffline={isOffline}
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
            isOffline={isOffline}
            onClose={() => setShowCatalog(false)}
            onCategoryClick={handleCategoryClick}
          />
        )}

        {currentProduct && (
          <ProductModal
            product={currentProduct}
            user={user}
            isOffline={isOffline}
            onClose={handleCloseProduct}
          />
        )}

        <BottomNav onNavigate={handleNavigate} active={page} />
      </div>
    </ErrorBoundary>
  );
}