// frontend/src/services/api.js - ИСПРАВЛЕНО: полная интеграция с backend
const API_BASE = import.meta.env.VITE_API_BASE || '';

class APIError extends Error {
  constructor(message, status = 0, data = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

async function apiFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 15000);

  const config = {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    credentials: 'include',
    signal: controller.signal,
    ...options,
    headers: { ...options.headers }
  };

  console.log(`🔄 API: ${config.method} ${API_BASE}${url}`);

  try {
    let response;
    // Retry логика для сетевых ошибок
    for (let i = 0; i <= 2; i++) {
      try {
        response = await fetch(`${API_BASE}${url}`, config);
        if (response.ok || response.status < 500) break;
        if (i === 2) break;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      } catch (error) {
        if (i === 2 || error.name === 'AbortError') throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }

    console.log(`📡 API: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: `HTTP ${response.status}` };
      }
      throw new APIError(errorData.detail || `HTTP ${response.status}`, response.status, errorData);
    }

    const data = await response.json();
    console.log(`✅ API Data:`, data);
    return data;

  } catch (error) {
    if (error instanceof APIError) throw error;
    if (error.name === 'AbortError') {
      throw new APIError('Превышено время ожидания', 0, { type: 'timeout' });
    }
    throw new APIError('Ошибка сети', 0, { type: 'network' });
  } finally {
    clearTimeout(timeoutId);
  }
}

// USER API
export const userAPI = {
  async createOrUpdateUser(userData) {
    if (!userData?.id || userData.id < 1) {
      throw new APIError('Некорректный Telegram ID', 400);
    }

    return apiFetch('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        tg_id: Number(userData.id),
        username: userData.username || null,
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
        city: userData.city || 'Москва',
        photo_url: userData.photo_url || null,
        language_code: userData.language_code || 'ru',
        is_premium: userData.is_premium || false
      }),
      timeout: 10000
    });
  },

  async getUserByTgId(tgId) {
    return apiFetch(`/api/user/${tgId}`, { timeout: 8000 });
  },

  async getCities() {
    return apiFetch('/api/cities', { timeout: 5000 });
  }
};

// CAPTCHA API
export const captchaAPI = {
  async getCaptcha() {
    return apiFetch('/api/captcha', { timeout: 10000 });
  },

  async verifyCaptcha(token, answer) {
    return apiFetch('/api/verify_captcha', {
      method: 'POST',
      body: JSON.stringify({ token, answer: answer.trim() }),
      timeout: 8000
    });
  }
};

// STORES API
export const storesAPI = {
  async getStores(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.city) searchParams.append('city', params.city);
    if (params.featured !== undefined) searchParams.append('featured', params.featured);
    if (params.limit) searchParams.append('limit', Math.min(params.limit, 100));
    if (params.offset) searchParams.append('offset', params.offset);

    return apiFetch(`/api/stores?${searchParams}`, { timeout: 12000 });
  },

  async getCategories() {
    return apiFetch('/api/stores/categories/', { timeout: 8000 });
  },

  async searchProducts(query = '', params = {}) {
    const searchParams = new URLSearchParams();
    searchParams.append('query', query);
    if (params.category) searchParams.append('category', params.category);
    if (params.city) searchParams.append('city', params.city);
    if (params.limit) searchParams.append('limit', Math.min(params.limit, 100));
    if (params.offset) searchParams.append('offset', params.offset);

    return apiFetch(`/api/stores/search/?${searchParams}`, { timeout: 15000 });
  },

  async getProduct(productId) {
    return apiFetch(`/api/stores/product/${productId}`, { timeout: 8000 });
  },

  async getCategoryProducts(categorySlug, params = {}) {
    const searchParams = new URLSearchParams();
    if (params.city) searchParams.append('city', params.city);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.offset) searchParams.append('offset', params.offset);

    return apiFetch(`/api/stores/category/${categorySlug}?${searchParams}`, { timeout: 10000 });
  }
};

// BALANCE API - ИСПРАВЛЕНО: полная интеграция с backend
export const balanceAPI = {
  // Создание заявки на пополнение
  async createBalanceRequest(data) {
    if (!data.tg_id || data.tg_id < 1) {
      throw new APIError('Некорректный Telegram ID', 400);
    }

    console.log('💳 Создание заявки на пополнение:', data);

    return apiFetch('/api/balance/create', {
      method: 'POST',
      body: JSON.stringify({
        tg_id: Number(data.tg_id),
        amount: Number(data.amount),
        method: String(data.method)
      }),
      timeout: 10000
    });
  },

  // Подтверждение оплаты пользователем
  async confirmPayment(orderId) {
    console.log('✅ Подтверждение оплаты:', orderId);

    return apiFetch('/api/balance/confirm', {
      method: 'POST',
      body: JSON.stringify({
        order_id: String(orderId)
      }),
      timeout: 8000
    });
  },

  // Получение заявок пользователя
  async getUserBalanceRequests(tgId) {
    return apiFetch(`/api/balance/requests/${tgId}`, { timeout: 8000 });
  },

  // Получение способов пополнения
  async getPaymentMethods() {
    return apiFetch('/api/balance/methods', { timeout: 5000 });
  },

  // Обработка заявки администратором
  async processBalanceRequest(orderId, action, adminComment = null) {
    return apiFetch('/api/balance/process', {
      method: 'POST',
      body: JSON.stringify({
        order_id: String(orderId),
        action: String(action),
        admin_comment: adminComment
      }),
      timeout: 10000
    });
  },

  // Статистика для админов
  async getBalanceStats() {
    return apiFetch('/api/balance/stats', { timeout: 5000 });
  }
};

export { APIError };