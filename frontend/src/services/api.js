// frontend/src/services/api.js - ИСПРАВЛЕНО: полная поддержка файлов
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
    headers: {
      'Accept': 'application/json',
      ...(options.headers || {})
    },
    credentials: 'include',
    signal: controller.signal,
    ...options
  };

  // Не устанавливаем Content-Type для FormData (multipart/form-data)
  if (!(options.body instanceof FormData) && config.method !== 'GET') {
    config.headers['Content-Type'] = 'application/json';
  }

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

// USER API - ИСПРАВЛЕНО: убираем источники 422 ошибки
export const userAPI = {
  async createOrUpdateUser(userData) {
    // КРИТИЧНО: Строгая валидация перед отправкой
    if (!userData?.id || typeof userData.id !== 'number' || userData.id <= 0) {
      throw new APIError('Некорректный Telegram ID', 400);
    }

    // ИСПРАВЛЕНО: Очищаем и валидируем все поля
    const cleanData = {
      tg_id: Number(userData.id),
      username: userData.username ? String(userData.username).trim() : null,
      first_name: userData.first_name ? String(userData.first_name).trim() : null,
      last_name: userData.last_name ? String(userData.last_name).trim() : null,
      city: userData.city ? String(userData.city).trim() : 'Москва',
      photo_url: userData.photo_url ? String(userData.photo_url).trim() : null,
      language_code: userData.language_code ? String(userData.language_code).trim() : 'ru',
      is_premium: Boolean(userData.is_premium)
    };

    // Убираем пустые строки - заменяем на null
    Object.keys(cleanData).forEach(key => {
      if (typeof cleanData[key] === 'string' && cleanData[key] === '') {
        cleanData[key] = null;
      }
    });

    console.log('👤 Отправляем данные пользователя:', cleanData);

    return apiFetch('/api/user', {
      method: 'POST',
      body: JSON.stringify(cleanData),
      timeout: 10000
    });
  },

  async getUserByTgId(tgId) {
    if (!tgId || tgId <= 0) {
      throw new APIError('Некорректный Telegram ID', 400);
    }
    return apiFetch(`/api/user/${tgId}`, { timeout: 8000 });
  },

  async getCities() {
    return apiFetch('/api/cities', { timeout: 5000 });
  },

  async getUserStats(tgId) {
    if (!tgId || tgId <= 0) {
      throw new APIError('Некорректный Telegram ID', 400);
    }
    return apiFetch(`/api/user/${tgId}/stats`, { timeout: 5000 });
  }
};

// CAPTCHA API
export const captchaAPI = {
  async getCaptcha() {
    return apiFetch('/api/captcha', { timeout: 10000 });
  },

  async verifyCaptcha(token, answer) {
    if (!token || !answer) {
      throw new APIError('Токен и ответ обязательны', 400);
    }
    return apiFetch('/api/verify_captcha', {
      method: 'POST',
      body: JSON.stringify({ token, answer: String(answer).trim() }),
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
    if (!productId) {
      throw new APIError('ID товара обязателен', 400);
    }
    return apiFetch(`/api/stores/product/${productId}`, { timeout: 8000 });
  },

  async getCategoryProducts(categorySlug, params = {}) {
    if (!categorySlug) {
      throw new APIError('Категория обязательна', 400);
    }

    const searchParams = new URLSearchParams();
    if (params.city) searchParams.append('city', params.city);
    if (params.limit) searchParams.append('limit', params.limit);
    if (params.offset) searchParams.append('offset', params.offset);

    return apiFetch(`/api/stores/category/${categorySlug}?${searchParams}`, { timeout: 10000 });
  }
};

// BALANCE API - ИСПРАВЛЕНО: полная поддержка файлов
export const balanceAPI = {
  // Создание заявки на пополнение
  async createBalanceRequest(data) {
    if (!data.tg_id || data.tg_id <= 0) {
      throw new APIError('Некорректный Telegram ID', 400);
    }

    if (!data.amount || data.amount <= 0) {
      throw new APIError('Некорректная сумма', 400);
    }

    const requestData = {
      tg_id: Number(data.tg_id),
      amount: Number(data.amount),
      method: String(data.method || 'card')
    };

    console.log('💳 Создание заявки на пополнение:', requestData);

    return apiFetch('/api/balance/create', {
      method: 'POST',
      body: JSON.stringify(requestData),
      timeout: 10000
    });
  },

  // НОВОЕ: Загрузка чека
  async uploadReceipt(orderId, file) {
    if (!orderId) {
      throw new APIError('Номер заявки обязателен', 400);
    }

    if (!file) {
      throw new APIError('Файл чека обязателен', 400);
    }

    // Валидация файла на клиенте
    const maxSize = 25 * 1024 * 1024; // 25MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      throw new APIError('Неподдерживаемый тип файла. Разрешены: JPG, PNG, WebP, PDF', 400);
    }

    if (file.size > maxSize) {
      throw new APIError(`Файл слишком большой. Максимум ${Math.round(maxSize / (1024 * 1024))} МБ`, 400);
    }

    const formData = new FormData();
    formData.append('file', file);

    console.log(`📎 Загрузка чека для заявки ${orderId}: ${file.name} (${file.size} bytes)`);

    return apiFetch(`/api/balance/upload-receipt/${orderId}`, {
      method: 'POST',
      body: formData, // FormData автоматически устанавливает multipart/form-data
      timeout: 30000 // Увеличиваем timeout для загрузки файлов
    });
  },

  // ИСПРАВЛЕНО: Отметка об оплате
  async markPaid(orderId) {
    if (!orderId) {
      throw new APIError('Номер заявки обязателен', 400);
    }

    console.log('✅ Отметка об оплате:', orderId);

    return apiFetch(`/api/balance/mark-paid/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({}),
      timeout: 8000
    });
  },

  // Получение заявок пользователя
  async getUserBalanceRequests(tgId) {
    if (!tgId || tgId <= 0) {
      throw new APIError('Некорректный Telegram ID', 400);
    }
    return apiFetch(`/api/balance/requests/${tgId}`, { timeout: 8000 });
  },

  // Получение способов пополнения
  async getPaymentMethods() {
    return apiFetch('/api/balance/methods', { timeout: 5000 });
  },

  // Обработка заявки администратором
  async processBalanceRequest(orderId, action, adminComment = null) {
    if (!orderId || !action) {
      throw new APIError('Параметры orderId и action обязательны', 400);
    }

    if (!['approve', 'reject'].includes(action)) {
      throw new APIError('Действие должно быть approve или reject', 400);
    }

    return apiFetch(`/api/balance/process/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({
        action: String(action),
        admin_comment: adminComment ? String(adminComment) : null
      }),
      timeout: 10000
    });
  }
};

// Утилиты для работы с файлами
export const fileUtils = {
  /**
   * Проверка типа файла
   */
  isValidFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    return allowedTypes.includes(file.type);
  },

  /**
   * Проверка размера файла
   */
  isValidFileSize(file, maxSizeMB = 25) {
    return file.size <= maxSizeMB * 1024 * 1024;
  },

  /**
   * Форматирование размера файла
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Получение расширения файла
   */
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
  },

  /**
   * Проверка что файл - изображение
   */
  isImage(file) {
    return file.type.startsWith('image/');
  },

  /**
   * Создание preview изображения
   */
  async createImagePreview(file) {
    if (!this.isImage(file)) return null;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
};

export { APIError };