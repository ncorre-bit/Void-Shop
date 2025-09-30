// frontend/src/App.jsx - ПОЛНАЯ ИНТЕГРАЦИЯ ВСЕХ КОМПОНЕНТОВ
import React, { useEffect, useState } from "react";
import Captcha from "./pages/Captcha";
import CitySelector from "./components/CitySelector";
import Header from "./components/Header";
import Home from "./pages/Home";
import News from "./pages/News";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage"; // НОВОЕ
import CheckoutPage from "./pages/CheckoutPage"; // НОВОЕ
import CatalogModal from "./components/CatalogModal";
import BalanceSystem from "./components/BalanceSystem";
import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner"; // <-- импорт общего компонента загрузки
import { getTelegramUser, initTelegramWebApp } from "./utils/telegram";
import { userAPI } from "./services/api";
import "./styles/global.css";

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
  const [showProductModal, setShowProductModal] = useState(false); // НОВОЕ
  const [showProductPage, setShowProductPage] = useState(false); // НОВОЕ
  const [checkoutData, setCheckoutData] = useState(null); // НОВОЕ

  // Состояние для системы баланса
  const [showBalanceSystem, setShowBalanceSystem] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  // Слушаем события навигации
  useEffect(() => {
    const handleNavigateToBalance = (event) => {
      console.log('🎯 Получено событие навигации к пополнению баланса:', event.detail);
      setShowBalanceSystem(true);
      setPage('profile');
      // Закрываем все модалки
      setShowProductModal(false);
      setShowProductPage(false);
      setCheckoutData(null);
    };

    const handleNavigateToCheckout = (event) => {
      console.log('🛒 Навигация к оформлению заказа:', event.detail);
      setCheckoutData(event.detail);
      setShowProductPage(false);
      setShowProductModal(false);
    };

    // Глобальные функции для совместимости
    window.navigateToBalance = () => {
      console.log('🎯 Вызвана глобальная функция navigateToBalance');
      setShowBalanceSystem(true);
      setPage('profile');
    };

    window.navigateToCheckout = (data) => {
      console.log('🛒 Вызвана глобальная функция navigateToCheckout');
      setCheckoutData(data);
    };

    window.addEventListener('navigate-to-balance', handleNavigateToBalance);
    window.addEventListener('navigate-to-checkout', handleNavigateToCheckout);

    return () => {
      window.removeEventListener('navigate-to-balance', handleNavigateToBalance);
      window.removeEventListener('navigate-to-checkout', handleNavigateToCheckout);
      delete window.navigateToBalance;
      delete window.navigateToCheckout;
    };
  }, []);

  async function initializeApp() {
    try {
      console.log('🚀 Инициализация Void Shop...');

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

      if (!telegramUser?.id || typeof telegramUser.id !== 'number' || telegramUser.id <= 0) {
        throw new Error('Некорректный Telegram ID пользователя');
      }

      const userData = await withTimeout(
        userAPI.createOrUpdateUser({
          ...telegramUser,
          city: selectedCity
        }),
        5000
      );

      console.log("✅ Пользователь создан/обновлен:", userData.id);
      setUser(userData);
      setIsOffline(false);
      setAppState("app");

    } catch (error) {
      console.error("❌ Ошибка при работе с пользователем:", error);
      console.warn('Backend недоступен, работаем в offline режиме');
      setIsOffline(true);

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

    if (newPage === 'profile' && showBalanceSystem) {
      // Система баланса уже должна показаться
    } else {
      setShowBalanceSystem(false);
    }

    setPage(newPage);
    setShowCatalog(false);
    setCurrentCategory(null);
    setCurrentProduct(null);
    setShowProductModal(false);
    setShowProductPage(false);
    setCheckoutData(null);
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

  // ОБНОВЛЕНО: Обработка клика по товару
  function handleProductClick(product, openAsPage = false) {
    setCurrentProduct(product);

    if (openAsPage) {
      // Открываем отдельную страницу товара
      setShowProductPage(true);
      setShowProductModal(false);
    } else {
      // Открываем модалку
      setShowProductModal(true);
      setShowProductPage(false);
    }
  }

  function handleBackFromCategory() {
    setCurrentCategory(null);
    setPage("home");
  }

  function handleCloseProduct() {
    setCurrentProduct(null);
    setShowProductModal(false);
    setShowProductPage(false);
  }

  function handleCityChange(newCity) {
    setCity(newCity);
    localStorage.setItem("voidshop_city", newCity);

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

  // НОВОЕ: Обработчики для оформления заказа
  const handleNavigateToBalance = () => {
    setShowBalanceSystem(true);
    setPage('profile');
    setShowProductPage(false);
    setShowProductModal(false);
    setCheckoutData(null);
  };

  const handleNavigateToCheckout = (orderData) => {
    setCheckoutData(orderData);
    setShowProductPage(false);
    setShowProductModal(false);
  };

  const handleOrderComplete = (order) => {
    console.log('✅ Заказ завершен:', order);
    alert(`Заказ ${order.id} успешно оформлен! Товар будет доставлен в ближайшее время.`);
    setCheckoutData(null);
    setCurrentProduct(null);
    handleNavigate('home');
  };

  // Экран ошибки
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

  // Состояние загрузки — заменено на общий компонент LoadingSpinner
  if (appState === "loading") {
    return (
      <div className="loading-state" style={{ minHeight: '100vh' }}>
        <div className="loading-container">
          <div className="loading-logo">V</div>
          <LoadingSpinner text="Инициализация Void Shop..." icon="🛸" size="large" />
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

  // Показ системы баланса
  if (showBalanceSystem && page === 'profile') {
    return (
      <ErrorBoundary>
        <div className="app-container">
          <BalanceSystem
            user={user}
            telegramUser={telegramUser}
            onBack={() => setShowBalanceSystem(false)}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // НОВОЕ: Показ страницы товара
  if (showProductPage && currentProduct) {
    return (
      <ErrorBoundary>
        <div className="app-container">
          <ProductPage
            product={currentProduct}
            user={user}
            onBack={handleCloseProduct}
            onNavigateToBalance={handleNavigateToBalance}
            onNavigateToCheckout={handleNavigateToCheckout}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // НОВОЕ: Показ страницы оформления заказа
  if (checkoutData) {
    return (
      <ErrorBoundary>
        <div className="app-container">
          <CheckoutPage
            orderData={checkoutData}
            onBack={() => setCheckoutData(null)}
            onOrderComplete={handleOrderComplete}
            onNavigateToBalance={handleNavigateToBalance}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // Основное приложение
  return (
    <ErrorBoundary>
      <div className="app-container">
        {/* Индикатор offline режима */}
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
                  onShowBalanceSystem={() => setShowBalanceSystem(true)}
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

        {showProductModal && currentProduct && (
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
