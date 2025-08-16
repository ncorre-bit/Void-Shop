// frontend/src/services/api.js
// Сервис для работы с API

const API_BASE = import.meta.env.VITE_API_BASE || '';

/**
 * Базовый fetch с обработкой ошибок
 */
async function apiFetch(url, options = {}) {
  const fullUrl = `${API_BASE}${url}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  console.log(`API Request: ${config.method || 'GET'} ${fullUrl}`, {
    body: config.body,
    headers: config.headers
  });

  try {
    const response = await fetch(fullUrl, config);

    // Логируем ответ
    console.log(`API Response: ${response.status} ${response.statusText}`, {
      url: fullUrl,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        detail: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new APIError(errorData.detail || errorData.message || 'API Error', response.status, errorData);
    }

    const data = await response.json();
    console.log(`API Data:`, data);
    return data;

  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    console.error('API Fetch Error:', error);
    throw new APIError('Ошибка сети или сервера недоступен', 0, { originalError: error.message });
  }
}

/**
 * Кастомный класс ошибок API
 */
class APIError extends Error {
  constructor(message, status = 0, data = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

/**
 * API для работы с пользователями
 */
export const userAPI = {
  /**
   * Создает или обновляет пользователя по данным из Telegram
   */
  async createOrUpdateUser(userData) {
    return apiFetch('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        tg_id: userData.id,
        username: userData.username || null,
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
      }),
    });
  },

  /**
   * Получает пользователя по Telegram ID
   */
  async getUserByTgId(tgId) {
    return apiFetch(`/api/user/${tgId}`);
  },

  /**
   * Получает список городов
   */
  async getCities() {
    return apiFetch('/api/cities');
  },
};

/**
 * API для работы с капчей
 */
export const captchaAPI = {
  /**
   * Получает новую капчу
   */
  async getCaptcha() {
    return apiFetch('/api/captcha');
  },

  /**
   * Проверяет капчу
   */
  async verifyCaptcha(token, answer) {
    return apiFetch('/api/verify_captcha', {
      method: 'POST',
      body: JSON.stringify({ token, answer }),
    });
  },
};

export { APIError };