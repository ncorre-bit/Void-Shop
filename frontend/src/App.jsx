// frontend/src/App.jsx - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ JSX WARNING
import React, { useEffect, useState } from "react";
import Captcha from "./pages/Captcha";
import CitySelector from "./components/CitySelector";
import Header from "./components/Header";
import Home from "./pages/Home";
import News from "./pages/News";
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
    <div className={`page-anim ${enter ? "enter" : ""}`} style={pageAnimStyles}>
      {children}
    </div>
  );
}

// ИСПРАВЛЕНО: стили вынесены в объект
const pageAnimStyles = {
  opacity: 0,
  transform: 'translateY(16px)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
};

export default function App() {
  const [appState, setAppState] = useState("loading"); // loading -> captcha -> city -> app
  const [page, setPage] = useState("home");
  const [city, setCity] = useState(null); // ИСПРАВЛЕНО: начальное значение null
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [initError, setInitError] = useState(null);

  // Инициализация приложения
  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      console.log('🚀 Инициализация приложения...');

      // Инициализируем Telegram WebApp
      initTelegramWebApp();

      // Получаем данные пользователя из Telegram
      const tgUser = getTelegramUser();

      if (!tgUser) {
        console.warn('⚠️ Не удалось получить данные из Telegram');
        setInitError('Не удалось получить данные пользователя');
      } else {
        console.log('✅ Получены данные пользователя:', {
          id: tgUser.id,
          first_name: tgUser.first_name,
          username: tgUser.username,
          has_photo: !!tgUser.photo_url
        });
        setTelegramUser(tgUser);
      }

      // ИСПРАВЛЕНО: проверяем сохраненные настройки более аккуратно
      try {
        const savedCity = localStorage.getItem("voidshop_city");
        const savedTheme = localStorage.getItem("voidshop_theme");

        // ИСПРАВЛЕНО: НЕ устанавливаем город автоматически, пусть пользователь выберет
        if (savedCity) {
          console.log('📍 Найден сохраненный город:', savedCity);
          // Не устанавливаем сразу, покажем в CitySelector как предложение
        }

        if (savedTheme) {
          const themeClass = savedTheme === "dark" ? "theme-dark" : "theme-light";
          document.documentElement.className = themeClass;
          console.log('🎨 Восстановлена тема:', savedTheme);
        }
      } catch (error) {
        console.warn('Ошибка при восстановлении настроек:', error);
      }

      // Переходим к капче
      setAppState("captcha");

    } catch (error) {
      console.error("❌ Критическая ошибка инициализации:", error);
      setInitError(error.message);
      setAppState("captcha");
    }
  }

  // Обработчик прохождения капчи
  async function handleCaptchaPassed() {
    console.log("✅ Капча пройдена, переходим к выбору города");

    // ИСПРАВЛЕНО: всегда показываем выбор города после капчи
    const savedCity = localStorage.getItem("voidshop_city");
    setAppState("city");

    // Если есть сохраненный город, передаем как предложение
    if (savedCity) {
      setCity(savedCity);
    }
  }

  // Обработчик выбора города
  async function handleCitySelected(selectedCity) {
    console.log("🏙️ Выбран город:", selectedCity);

    setCity(selectedCity);
    localStorage.setItem("voidshop_city", selectedCity);

    // Теперь обрабатываем пользователя
    if (telegramUser) {
      try {
        console.log("👤 Создаем/обновляем пользователя...");

        // Создаем или обновляем пользователя с выбранным городом
        const userData = await userAPI.createOrUpdateUser({
          ...telegramUser,
          city: selectedCity
        });

        console.log("✅ Пользователь обработан:", userData.id);
        setUser(userData);
        setAppState("app");

      } catch (error) {
        console.error("❌ Ошибка при работе с пользователем:", error);

        // Показываем ошибку пользователю
        if (error.status === 0) {
          alert("Проблема с подключением к серверу.\nПроверьте интернет-соединение и перезапустите приложение.");
        } else if (error.status === 500) {
          alert("Ошибка сервера. Возможно, нужно обновить базу данных.\nОбратитесь к администратору.");
        } else {
          alert(`Ошибка: ${error.message}\nПопробуйте позже.`);
        }

        // Все равно переходим в приложение, но без пользователя
        setAppState("app");
      }
    } else {
      // Если нет данных Telegram, переходим в приложение с гостевым доступом
      console.log("👤 Нет данных Telegram, гостевой режим");
      setAppState("app");
    }
  }

  // Навигация между страницами
  function handleNavigate(newPage) {
    if (newPage === page) return; // Избегаем лишних перерендеров

    console.log("📱 Навигация:", page, "->", newPage);
    setPage(newPage);

    // Плавный скролл наверх
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  // Обработчик каталога (будет реализован позже)
  function handleCatalogClick() {
    console.log("📦 Открытие каталога");
    alert("Каталог товаров - в разработке\nСкоро добавим полноценный поиск и фильтры!");
  }

  // Обновление города из профиля
  function handleCityChange(newCity) {
    console.log("🏙️ Изменение города на:", newCity);

    setCity(newCity);
    localStorage.setItem("voidshop_city", newCity);

    // Обновляем в базе данных
    if (user && telegramUser) {
      userAPI.createOrUpdateUser({
        ...telegramUser,
        city: newCity
      }).catch(error => {
        console.warn("Не удалось обновить город:", error);
      });
    }
  }

  // Рендер в зависимости от состояния приложения
  if (appState === "loading") {
    return (
      <div style={loadingContainerStyles}>
        <div style={loadingContentStyles}>
          <div style={loadingLogoStyles}>V</div>
          <div style={loadingSpinnerStyles}></div>
          <p style={loadingTextStyles}>Загрузка Void Shop...</p>
          {initError && (
            <p style={loadingErrorStyles}>⚠️ {initError}</p>
          )}
        </div>
      </div>
    );
  }

  if (appState === "captcha") {
    return <Captcha onOk={handleCaptchaPassed} />;
  }

  if (appState === "city") {
    return <CitySelector onSelect={handleCitySelected} defaultCity={city || "Москва"} />;
  }

  // Основное приложение
  return (
    <div style={appContainerStyles}>
      <Header onCatalogClick={handleCatalogClick} />

      <main style={appMainStyles} role="main" aria-live="polite">
        <div style={appContentStyles}>
          {page === "home" && (
            <PageWrapper key="home">
              <Home city={city || "Москва"} user={user} />
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
        </div>
      </main>

      <BottomNav onNavigate={handleNavigate} active={page} />
    </div>
  );
}

// ИСПРАВЛЕНО: все стили вынесены в объекты чтобы избежать JSX warning
const loadingContainerStyles = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg)',
  color: 'var(--text-primary)',
  padding: 'var(--spacing-lg)'
};

const loadingContentStyles = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--spacing-lg)',
  textAlign: 'center',
  maxWidth: '400px'
};

const loadingLogoStyles = {
  width: '80px',
  height: '80px',
  borderRadius: 'var(--radius-xl)',
  background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'var(--font-size-2xl)',
  fontWeight: '700',
  color: 'var(--primary-white)',
  boxShadow: 'var(--shadow-lg)',
  animation: 'logoFloat 2s ease-in-out infinite'
};

const loadingSpinnerStyles = {
  width: '40px',
  height: '40px',
  border: '4px solid var(--border)',
  borderTop: '4px solid var(--accent)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};

const loadingTextStyles = {
  fontSize: 'var(--font-size-base)',
  fontWeight: '500',
  margin: '0',
  color: 'var(--text-secondary)'
};

const loadingErrorStyles = {
  fontSize: 'var(--font-size-sm)',
  color: '#ef4444',
  margin: '0',
  padding: 'var(--spacing-sm)',
  background: 'rgba(239, 68, 68, 0.1)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(239, 68, 68, 0.2)'
};

const appContainerStyles = {
  minHeight: '100vh',
  background: 'var(--bg)',
  position: 'relative',
  paddingBottom: 'calc(var(--bottom-nav-height) + var(--bottom-nav-margin) * 2)',
  transition: 'background-color 0.3s ease'
};

const appMainStyles = {
  position: 'relative',
  zIndex: 1
};

const appContentStyles = {
  width: '100%',
  maxWidth: 'var(--container-max)',
  margin: '0 auto',
  padding: '0 var(--container-padding)'
};