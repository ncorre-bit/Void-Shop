// frontend/src/App.jsx (исправленный)
import React, { useEffect, useState } from "react";
import Captcha from "./pages/Captcha";
import CitySelector from "./components/CitySelector";
import Header from "./components/Header";
import Home from "./pages/Home";
import News from "./pages/News";
import Mail from "./pages/Mail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
import { getTelegramUser, initTelegramWebApp } from "./utils/telegram";
import { userAPI } from "./services/api";

/**
 * Page wrapper с плавными анимациями
 */
function PageWrapper({ children }) {
  const [enter, setEnter] = useState(false);

  useEffect(() => {
    const timer = requestAnimationFrame(() => setEnter(true));
    return () => {
      cancelAnimationFrame(timer);
      setEnter(false);
    };
  }, []);

  return (
    <div className={`page-anim ${enter ? "enter" : ""}`}>
      {children}
    </div>
  );
}

export default function App() {
  const [appState, setAppState] = useState("loading"); // loading -> captcha -> city -> app
  const [page, setPage] = useState("home");
  const [city, setCity] = useState("Москва");
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);

  // Инициализация приложения
  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Инициализируем Telegram WebApp
      initTelegramWebApp();

      // Получаем данные пользователя из Telegram
      const tgUser = getTelegramUser();
      setTelegramUser(tgUser);

      // Восстанавливаем сохраненные настройки
      const savedCity = localStorage.getItem("voidshop_city");
      const savedTheme = localStorage.getItem("voidshop_theme");

      // Применяем сохраненную тему
      if (savedTheme) {
        document.documentElement.className = savedTheme === "dark" ? "theme-dark" : "theme-light";
      }

      if (savedCity) {
        setCity(savedCity);
      }

      // ВАЖНО: Капча должна показываться при каждом входе
      // Убираем проверку localStorage для капчи
      setAppState("captcha");

    } catch (error) {
      console.error("Ошибка инициализации:", error);
      setAppState("captcha");
    }
  }

  // Обработчик прохождения капчи
  async function handleCaptchaPassed() {
    console.log("Капча пройдена, создаем/обновляем пользователя");

    if (telegramUser) {
      try {
        // Пытаемся получить существующего пользователя
        let userData;
        try {
          userData = await userAPI.getUserByTgId(telegramUser.id);
          console.log("Пользователь найден в базе:", userData);
        } catch (error) {
          // Если пользователя нет, создаем нового
          console.log("Пользователь не найден, создаем нового");
          userData = await userAPI.createOrUpdateUser(telegramUser);
        }

        setUser(userData);

        // Используем город из профиля пользователя или сохраненный
        const userCity = userData.city || localStorage.getItem("voidshop_city") || "Москва";
        setCity(userCity);

        // Если у пользователя нет города или он отличается от сохраненного, показываем выбор города
        const savedCity = localStorage.getItem("voidshop_city");
        if (!userData.city || (savedCity && savedCity !== userData.city)) {
          setAppState("city");
        } else {
          setAppState("app");
        }

      } catch (error) {
        console.error("Ошибка работы с пользователем:", error);
        // В случае ошибки все равно переходим к выбору города
        setAppState("city");
      }
    } else {
      // Если нет данных Telegram, переходим к выбору города
      setAppState("city");
    }
  }

  // Обработчик выбора города
  function handleCitySelected(selectedCity) {
    setCity(selectedCity);
    localStorage.setItem("voidshop_city", selectedCity);

    // Обновляем город в базе если есть пользователь
    if (user && telegramUser) {
      userAPI.createOrUpdateUser({
        ...telegramUser,
        city: selectedCity
      }).catch(console.error);
    }

    setAppState("app");
  }

  // Навигация между страницами
  function handleNavigate(newPage) {
    setPage(newPage);
    // Плавный скролл наверх
    if (window.scrollTo) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Обработчик каталога (заглушка)
  function handleCatalogClick() {
    console.log("Открываем каталог товаров");
    // TODO: реализовать каталог
    alert("Каталог товаров - в разработке");
  }

  // Обновление города из профиля
  function handleCityChange(newCity) {
    setCity(newCity);
    localStorage.setItem("voidshop_city", newCity);

    if (user && telegramUser) {
      userAPI.createOrUpdateUser({
        ...telegramUser,
        city: newCity
      }).catch(console.error);
    }
  }

  // Рендер в зависимости от состояния приложения
  if (appState === "loading") {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-logo">V</div>
          <div className="loading-spinner"></div>
          <p className="loading-text">Загрузка Void Shop...</p>
        </div>
        <style jsx>{`
          .app-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
            color: var(--text-muted);
          }

          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-lg);
            text-align: center;
          }

          .loading-logo {
            width: 80px;
            height: 80px;
            border-radius: var(--radius-lg);
            background: linear-gradient(135deg, var(--primary-black), var(--gray-800));
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: var(--font-size-2xl);
            font-weight: 700;
            color: var(--primary-white);
            box-shadow: var(--shadow-lg);
            animation: logoFloat 2s ease-in-out infinite;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid var(--border);
            border-top: 4px solid var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .loading-text {
            font-size: var(--font-size-base);
            font-weight: 500;
            margin: 0;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes logoFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
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

      <main className="app-main" role="main" aria-live="polite">
        <div className="app-content">
          {page === "home" && (
            <PageWrapper>
              <Home city={city} user={user} />
            </PageWrapper>
          )}
          {page === "news" && (
            <PageWrapper>
              <News />
            </PageWrapper>
          )}
          {page === "mail" && (
            <PageWrapper>
              <Mail user={user} />
            </PageWrapper>
          )}
          {page === "profile" && (
            <PageWrapper>
              <Profile
                city={city}
                setCity={handleCityChange}
                user={user}
                telegramUser={telegramUser}
              />
            </PageWrapper>
          )}
          {page === "settings" && (
            <PageWrapper>
              <Settings />
            </PageWrapper>
          )}
        </div>
      </main>

      <BottomNav onNavigate={handleNavigate} active={page} />

      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: var(--bg);
          position: relative;
          padding-bottom: calc(var(--bottom-nav-height) + var(--bottom-nav-margin) * 2);
          transition: background 0.3s ease;
        }

        .app-main {
          position: relative;
          z-index: 1;
        }

        .app-content {
          width: 100%;
          max-width: var(--container-max);
          margin: 0 auto;
          padding: 0 var(--container-padding);
        }

        @media (max-width: 768px) {
          .app-container {
            padding-bottom: calc(var(--bottom-nav-height) + var(--bottom-nav-margin) * 2 + 20px);
          }
        }
      `}</style>
    </div>
  );
}