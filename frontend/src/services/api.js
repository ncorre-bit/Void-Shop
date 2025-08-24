// frontend/src/services/api.js - УЛУЧШЕННАЯ ВЕРСИЯ
// Сервис для работы с API с retry логикой и timeout

const API_BASE = import.meta.env.VITE_API_BASE || '';

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

  get isNetworkError() {
    return this.status === 0;
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }

  get isServerError() {
    return this.status >= 500;
  }
}

/**
 * Retry логика с экспоненциальным backoff
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  let lastError;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);

      // Если ответ успешен, возвращаем его
      if (response.ok || response.status < 500) {
        return response;
      }

      // 5xx ошибки - можно повторить
      if (i === retries) {
        return response; // Последняя попытка, возвращаем как есть
      }

      throw new Error(`Server error: ${response.status}`);

    } catch (error) {
      lastError = error;

      // Не повторяем для клиентских ошибок
      if (error.name === 'AbortError') {
        throw error; // Timeout - не повторяем
      }

      // Последняя попытка
      if (i === retries) {
        throw error;
      }

      // Экспоненциальная задержка: 1s, 2s, 4s
      const delay = Math.min(1000 * Math.pow(2, i), 5000);
      console.warn(`API retry ${i + 1}/${retries} через ${delay}ms:`, error.message);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Базовый fetch с обработкой ошибок, retry и timeout
 */
async function apiFetch(url, options = {}) {
  const fullUrl = `${API_BASE}${url}`;

  // Timeout controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, options.timeout || 15000); // 15 секунд по умолчанию

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    credentials: 'include',
    signal: controller.signal,
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  console.log(`🔄 API Request: ${config.method || 'GET'} ${fullUrl}`, {
    body: config.body,
    headers: Object.fromEntries(
      Object.entries(config.headers).filter(([key]) =>
        !key.toLowerCase().includes('authorization')
      )
    )
  });

  try {
    // Используем retry логику
    const response = await fetchWithRetry(fullUrl, config, 2);

    // Логируем ответ
    console.log(`📡 API Response: ${response.status} ${response.statusText}`, {
      url: fullUrl,
      ok: response.ok,
      headers: Object.fromEntries([...response.headers.entries()])
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          detail: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      throw new APIError(
        errorData.detail || errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    console.log(`✅ API Data:`, data);
    return data;

  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      console.error('❌ API Timeout:', fullUrl);
      throw new APIError('Превышено время ожидания ответа от сервера', 0, {
        type: 'timeout',
        url: fullUrl
      });
    }

    console.error('❌ API Network Error:', error);
    throw new APIError('Ошибка сети или сервер недоступен', 0, {
      originalError: error.message,
      type: 'network',
      url: fullUrl
    });

  } finally {
    clearTimeout(timeoutId);
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
    // Валидация данных перед отправкой
    if (!userData || !userData.id) {
      throw new APIError('Некорректные данные пользователя', 400);
    }

    return apiFetch('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        tg_id: Number(userData.id), // Обязательно число
        username: userData.username ? String(userData.username).trim() : null,
        first_name: userData.first_name ? String(userData.first_name).trim() : null,
        last_name: userData.last_name ? String(userData.last_name).trim() : null,
        city: userData.city ? String(userData.city).trim() : null,
      }),
      timeout: 10000, // 10 секунд для создания пользователя
    });
  },

  /**
   * Получает пользователя по Telegram ID
   */
  async getUserByTgId(tgId) {
    if (!tgId || tgId < 1) {
      throw new APIError('Некорректный Telegram ID', 400);
    }

    return apiFetch(`/api/user/${tgId}`, {
      timeout: 8000
    });
  },

  /**
   * Получает список городов
   */
  async getCities() {
    return apiFetch('/api/cities', {
      timeout: 5000
    });
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
    return apiFetch('/api/captcha', {
      timeout: 10000 // Капча может генерироваться долго
    });
  },

  /**
   * Проверяет капчу
   */
  async verifyCaptcha(token, answer) {
    if (!token || !answer) {
      throw new APIError('Токен и ответ обязательны', 400);
    }

    return apiFetch('/api/verify_captcha', {
      method: 'POST',
      body: JSON.stringify({
        token: String(token),
        answer: String(answer).trim()
      }),
      timeout: 8000
    });
  },
};

/**
 * API для работы с магазинами
 */
export const storesAPI = {
  /**
   * Получает список магазинов с кешированием
   */
  async getStores(params = {}) {
    const searchParams = new URLSearchParams();

    // Валидируем и очищаем параметры
    if (params.city && typeof params.city === 'string') {
      searchParams.append('city', params.city.trim());
    }
    if (params.featured !== undefined) {
      searchParams.append('featured', Boolean(params.featured));
    }
    if (params.category && typeof params.category === 'string') {
      searchParams.append('category', params.category.trim());
    }
    if (params.search && typeof params.search === 'string') {
      searchParams.append('search', params.search.trim());
    }
    if (params.limit && Number.isInteger(params.limit) && params.limit > 0) {
      searchParams.append('limit', Math.min(params.limit, 100)); // Максимум 100
    }
    if (params.offset && Number.isInteger(params.offset) && params.offset >= 0) {
      searchParams.append('offset', params.offset);
    }

    const url = `/api/stores?${searchParams.toString()}`;
    return apiFetch(url, {
      timeout: 12000
    });
  },

  /**
   * Получает детальную информацию о магазине
   */
  async getStoreDetail(storeId) {
    if (!storeId || !Number.isInteger(Number(storeId)) || storeId < 1) {
      throw new APIError('Некорректный ID магазина', 400);
    }

    return apiFetch(`/api/stores/${storeId}`, {
      timeout: 8000
    });
  },

  /**
   * Получает товары магазина
   */
  async getStoreProducts(storeId, params = {}) {
    if (!storeId || !Number.isInteger(Number(storeId)) || storeId < 1) {
      throw new APIError('Некорректный ID магазина', 400);
    }

    const searchParams = new URLSearchParams();

    if (params.category && typeof params.category === 'string') {
      searchParams.append('category', params.category.trim());
    }
    if (params.limit && Number.isInteger(params.limit) && params.limit > 0) {
      searchParams.append('limit', Math.min(params.limit, 50));
    }
    if (params.offset && Number.isInteger(params.offset) && params.offset >= 0) {
      searchParams.append('offset', params.offset);
    }

    const url = `/api/stores/${storeId}/products?${searchParams.toString()}`;
    return apiFetch(url, {
      timeout: 10000
    });
  },

  /**
   * Получает список категорий
   */
  async getCategories() {
    return apiFetch('/api/stores/categories/', {
      timeout: 8000
    });
  },

  /**
   * Получает рекомендуемые магазины
   */
  async getFeaturedStores(limit = 6) {
    const validLimit = Math.min(Math.max(1, Number(limit) || 6), 20);

    return apiFetch(`/api/stores/featured/?limit=${validLimit}`, {
      timeout: 10000
    });
  },

  /**
   * Поиск товаров с валидацией
   */
  async searchProducts(query, params = {}) {
    // Разрешаем пустой запрос для получения всех товаров категории
    const searchParams = new URLSearchParams();

    if (query && typeof query === 'string') {
      const cleanQuery = query.trim();
      if (cleanQuery.length > 100) {
        throw new APIError('Поисковый запрос слишком длинный', 400);
      }
      searchParams.append('query', cleanQuery);
    } else {
      searchParams.append('query', ''); // Пустой запрос
    }

    if (params.category && typeof params.category === 'string') {
      searchParams.append('category', params.category.trim());
    }
    if (params.city && typeof params.city === 'string') {
      searchParams.append('city', params.city.trim());
    }
    if (params.limit && Number.isInteger(params.limit) && params.limit > 0) {
      searchParams.append('limit', Math.min(params.limit, 100));
    }
    if (params.offset && Number.isInteger(params.offset) && params.offset >= 0) {
      searchParams.append('offset', params.offset);
    }

    const url = `/api/stores/search/?${searchParams.toString()}`;
    return apiFetch(url, {
      timeout: 15000 // Поиск может быть медленным
    });
  }
};

/**
 * Утилита для отмены запросов
 */
export class RequestCanceller {
  constructor() {
    this.controllers = new Set();
  }

  createController() {
    const controller = new AbortController();
    this.controllers.add(controller);
    return controller;
  }

  cancelAll() {
    this.controllers.forEach(controller => {
      try {
        controller.abort();
      } catch {}
    });
    this.controllers.clear();
  }

  remove(controller) {
    this.controllers.delete(controller);
  }
}

/**
 * Проверка состояния API
 */
export const healthAPI = {
  async checkHealth() {
    return apiFetch('/health', {
      timeout: 5000
    });
  }
};

export { APIError };