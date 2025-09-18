// frontend/src/components/BalanceSystem.jsx - ИСПРАВЛЕНО: убрано дублирование API
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sendDataToTelegramBot } from "../utils/telegram";
import { balanceAPI, fileUtils } from "../services/api"; // ИСПРАВЛЕНО: используем централизованный API

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Notification component
const NotificationSystem = ({ notifications }) => (
  <div className="notifications-container">
    {notifications.map(notif => (
      <div key={notif.id} className={`notification notification-${notif.type}`}>
        {notif.message}
      </div>
    ))}
  </div>
);

// Helper функции
const formatDateTime = (dateStr) => {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
};

const getStatusInfo = (status) => {
  const statusMap = {
    'pending': { text: 'Создана', class: 'pending', icon: '⏳' },
    'receipt_uploaded': { text: 'Чек загружен', class: 'processing', icon: '📎' },
    'waiting_admin': { text: 'На проверке', class: 'processing', icon: '🔍' },
    'approved': { text: 'Зачислено', class: 'success', icon: '✅' },
    'rejected': { text: 'Отклонено', class: 'error', icon: '❌' }
  };
  return statusMap[status] || { text: status, class: 'pending', icon: '❓' };
};

export default function BalanceSystem({ user, telegramUser, onBack }) {
  const [step, setStep] = useState('methods');
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [requests, setRequests] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // НОВОЕ: состояния для файлов
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedReceiptPreview, setUploadedReceiptPreview] = useState(null);

  const fileInputRef = useRef(null);
  const timersRef = useRef([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  // Мемоизированные значения
  const currentMethod = useMemo(() =>
    paymentMethods.find(m => m.id === selectedMethod) || null,
    [paymentMethods, selectedMethod]
  );

  const numAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const isValidAmount = useMemo(() => {
    if (!currentMethod || numAmount <= 0) return false;
    const minAmount = currentMethod.min_amount || 100;
    const maxAmount = currentMethod.max_amount || 100000;
    return numAmount >= minAmount && numAmount <= maxAmount;
  }, [currentMethod, numAmount]);

  // Уведомления
  const showNotification = useCallback((message, type = 'info') => {
    if (!mountedRef.current) return;

    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    }, 4000);

    timersRef.current.push(timer);
  }, []);


  // ИСПРАВЛЕНО: Загрузка методов через централизованный API
  useEffect(() => {
    let cancelled = false;

    const loadPaymentMethods = async () => {
      try {
        const methods = await balanceAPI.getPaymentMethods();
        if (!cancelled && mountedRef.current) {
          const enabledMethods = methods.filter(m => m.enabled);
          setPaymentMethods(enabledMethods);
          if (enabledMethods.length > 0) {
            setSelectedMethod(enabledMethods[0].id);
          }
        }
      } catch (error) {
        if (!cancelled && mountedRef.current) {
          console.error('Ошибка загрузки методов:', error);
          // Fallback методы
          setPaymentMethods([{
            id: 'card',
            name: 'Банковская карта',
            icon: '💳',
            description: 'Visa, MasterCard, МИР',
            min_amount: 100,
            max_amount: 100000,
            enabled: true
          }]);
          setSelectedMethod('card');
        }
      }
    };

    loadPaymentMethods();
    return () => { cancelled = true; };
  }, []);

  // ИСПРАВЛЕНО: Загрузка заявок через централизованный API
  const loadUserRequests = useCallback(async () => {
    if (!user?.tg_id && !telegramUser?.id) return;

    try {
      const tgId = user?.tg_id || telegramUser?.id;
      const userRequests = await balanceAPI.getUserBalanceRequests(tgId);

      if (mountedRef.current) {
        const sortedRequests = userRequests
          .filter(req => req && typeof req === 'object')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRequests(sortedRequests);
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    }
  }, [user?.tg_id, telegramUser?.id]);

  useEffect(() => {
    loadUserRequests();
  }, [loadUserRequests]);

  // Копирование с уведомлением
  const copyWithFeedback = useCallback(async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);

      if (mountedRef.current) {
        setCopiedField(field);
        showNotification(`Скопировано: ${text}`, 'success');

        const timer = setTimeout(() => {
          if (mountedRef.current) setCopiedField('');
        }, 2000);
        timersRef.current.push(timer);
      }
    } catch (error) {
      showNotification(`Не удалось скопировать`, 'error');
    }
  }, [showNotification]);

  // УЛУЧШЕННАЯ: Обработка файлов с поддержкой HEIC
  const validateFile = (file) => {
    const maxSize = 25 * 1024 * 1024; // 25MB
    // ИСПРАВЛЕНО: Добавлена поддержка HEIC для iPhone
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', // iPhone форматы
      'application/pdf'
    ];

    if (!fileUtils.isValidFileType(file) && !allowedTypes.includes(file.type)) {
      throw new Error('Неподдерживаемый тип файла. Разрешены: JPG, PNG, WebP, PDF, HEIC');
    }

    if (!fileUtils.isValidFileSize(file, 25)) {
      throw new Error(`Файл слишком большой. Максимум ${fileUtils.formatFileSize(maxSize)}`);
    }

    return true;
  };

  const handleFileSelect = useCallback(async (file) => {
    try {
      validateFile(file);
      setReceiptFile(file);

      // НОВОЕ: Создаем превью для изображений
      if (fileUtils.isImage(file)) {
        const preview = await fileUtils.createImagePreview(file);
        setUploadedReceiptPreview(preview);
      } else {
        setUploadedReceiptPreview(null);
      }

      showNotification(`Файл выбран: ${file.name}`, 'success');
    } catch (error) {
      showNotification(error.message, 'error');
      setReceiptFile(null);
      setUploadedReceiptPreview(null);
    }
  }, [showNotification]);

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // Drag & Drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ИСПРАВЛЕНО: Создание заявки через централизованный API
  const createBalanceRequest = useCallback(async () => {
    if (!isValidAmount || loading) return;

    const tgId = user?.tg_id || telegramUser?.id;
    if (!tgId) {
      showNotification('Ошибка: не найден Telegram ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await balanceAPI.createBalanceRequest({
        tg_id: tgId,
        amount: numAmount,
        method: selectedMethod
      });

      if (mountedRef.current) {
        setPaymentData({
          orderId: response.order_id,
          amount: response.amount,
          method: response.method,
          status: response.status,
          createdAt: response.created_at,
          paymentDetails: response.payment_details,
          userInfo: response.user_info
        });

        await loadUserRequests();
        setStep('payment');
        showNotification(`Заявка №${response.order_id} создана`, 'success');
      }
    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [isValidAmount, loading, user, telegramUser, numAmount, selectedMethod, loadUserRequests, showNotification]);

  // ИСПРАВЛЕНО: Загрузка чека через централизованный API
  const uploadReceipt = useCallback(async () => {
    if (!receiptFile || !paymentData) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      // Симуляция прогресса для UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await balanceAPI.uploadReceipt(paymentData.orderId, receiptFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (mountedRef.current) {
        setPaymentData(prev => ({ ...prev, status: 'receipt_uploaded' }));
        showNotification('Чек успешно загружен', 'success');

        // Сбрасываем через секунду
        setTimeout(() => {
          if (mountedRef.current) {
            setUploadProgress(0);
          }
        }, 1000);
      }
    } catch (error) {
      setUploadProgress(0);
      showNotification(`Ошибка загрузки: ${error.message}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [receiptFile, paymentData, showNotification]);

  // ИСПРАВЛЕНО: Подтверждение оплаты через централизованный API
  const confirmPayment = useCallback(async () => {
    if (!paymentData) return;

    // КРИТИЧНО: Проверяем что чек загружен
    if (paymentData.status !== 'receipt_uploaded') {
      showNotification('Сначала загрузите чек об оплате', 'error');
      return;
    }

    // НОВОЕ: Подтверждение от пользователя
    const confirmText = `Вы уверены что:
• Перевели точную сумму ₽${paymentData.amount.toLocaleString()}
• Приложили правильный чек об оплате
• Готовы отправить заявку администратору?

После отправки изменить ничего будет нельзя.`;

    if (!confirm(confirmText)) {
      return;
    }

    setLoading(true);
    try {
      await balanceAPI.markPaid(paymentData.orderId);

      // УЛУЧШЕНО: Отправляем полные данные админу
      const adminNotification = {
        type: 'payment_confirmation',
        data: {
          orderId: paymentData.orderId,
          userId: user?.tg_id || telegramUser?.id,
          userName: paymentData.userInfo?.name || user?.first_name || telegramUser?.first_name || 'Пользователь',
          username: paymentData.userInfo?.username || user?.username || telegramUser?.username || null,
          amount: paymentData.amount,
          method: currentMethod?.name || 'Банковская карта',
          createdAt: paymentData.createdAt,
          paidAt: new Date().toISOString(),
          // НОВОЕ: Дополнительная информация
          receiptUploaded: true,
          paymentDetails: paymentData.paymentDetails
        }
      };

      const success = sendDataToTelegramBot(adminNotification);
      if (success) {
        console.log('📤 Уведомление админу отправлено');
      }

      setPaymentData(prev => ({ ...prev, status: 'waiting_admin' }));
      await loadUserRequests();
      setStep('success');

    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [paymentData, user, telegramUser, currentMethod, loadUserRequests, showNotification]);

  const activeRequestsCount = useMemo(() =>
    requests.filter(r => r && ['pending', 'receipt_uploaded', 'waiting_admin'].includes(r.status)).length,
    [requests]
  );

  // УЛУЧШЕННАЯ: Функция получения реквизитов
  const getPaymentDetails = useCallback((method, amount) => {
    if (method === 'card') {
      return {
        type: "card",
        card_number: "5536 9141 2345 6789",
        card_holder: "VOID SHOP",
        bank: "Сбер Банк",
        amount: amount,
        instructions: [
          `Переведите точную сумму ₽${amount.toLocaleString()} на карту`,
          "Сделайте скриншот чека об оплате",
          "Загрузите чек в приложении",
          "Нажмите 'Я оплатил'",
          "Ожидайте подтверждения (5-15 минут)"
        ]
      };
    } else if (method === 'crypto') {
      return {
        type: "crypto",
        wallet_btc: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        wallet_usdt: "TQRRm4Pg5wKTZJhP5QiCEkT3JzRzJ3qS4F",
        amount: amount,
        instructions: [
          `Отправьте криптовалюту эквивалентную ₽${amount.toLocaleString()}`,
          "Сделайте скриншот транзакции",
          "Загрузите скриншот в приложении",
          "Нажмите 'Я оплатил'"
        ]
      };
    }
    return {};
  }, []);

  return (
    <div className="balance-system">
      <NotificationSystem notifications={notifications} />

      {/* HEADER */}
      <div className="card mb-xl">
        <button className="btn-secondary mb-lg" onClick={onBack}>← Назад</button>
        <div className="text-center">
          <div className="text-4xl mb-md">💰</div>
          <h1 className="text-3xl font-bold text-primary mb-sm">Пополнение баланса</h1>
          <div className="text-secondary">
            Текущий баланс: <span className="text-accent font-bold">₽{(user?.balance || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ACTIVE REQUESTS */}
      {activeRequestsCount > 0 && step === 'methods' && (
        <div className="card mb-xl">
          <div className="flex justify-between items-center mb-lg">
            <h3 className="text-lg font-semibold">Активные заявки ({activeRequestsCount})</h3>
            <button className="btn-secondary" onClick={() => setStep('history')}>Все →</button>
          </div>
          <div className="grid gap-md">
            {requests
              .filter(r => r && ['pending', 'receipt_uploaded', 'waiting_admin'].includes(r.status))
              .slice(0, 2)
              .map((req) => {
                const statusInfo = getStatusInfo(req.status);
                return (
                  <div
                    key={req.order_id}
                    className="card-interactive p-lg"
                    onClick={() => {
                      setPaymentData({
                        orderId: req.order_id,
                        amount: req.amount,
                        method: req.method,
                        status: req.status,
                        createdAt: req.created_at,
                        paymentDetails: getPaymentDetails(req.method, req.amount)
                      });
                      setStep('payment');
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm text-muted">#{req.order_id}</div>
                        <div className="text-xl font-bold text-accent">₽{req.amount.toLocaleString()}</div>
                      </div>
                      <div className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.icon} {statusInfo.text}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="card">
        {/* STEP 1: METHODS */}
        {step === 'methods' && (
          <div>
            <h2 className="text-2xl font-bold mb-md">Способы пополнения</h2>
            <p className="text-secondary mb-xl">Выберите удобный способ пополнения баланса</p>

            <div className="grid gap-lg">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  className={`card-interactive p-xl text-left ${selectedMethod === method.id ? 'border-accent' : ''} ${!method.enabled ? 'opacity-50' : ''}`}
                  onClick={() => {
                    if (method.enabled) {
                      setSelectedMethod(method.id);
                      setStep('amount');
                    }
                  }}
                  disabled={!method.enabled}
                >
                  <div className="flex items-center gap-lg">
                    <div className="text-3xl">{method.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">
                        {method.name}
                        {!method.enabled && <span className="text-warning ml-sm">(Скоро)</span>}
                      </div>
                      <div className="text-secondary text-sm">{method.description}</div>
                      <div className="text-xs text-muted mt-xs">
                        ₽{(method.min_amount || 100).toLocaleString()} - ₽{(method.max_amount || 100000).toLocaleString()} •
                        {method.commission > 0 ? ` Комиссия ${method.commission}%` : ' Без комиссии'} •
                        {method.processing_time || '5-15 минут'}
                      </div>
                    </div>
                    {method.enabled && <div className="text-accent text-xl">→</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: AMOUNT - ИСПРАВЛЕНО поле ввода */}
        {step === 'amount' && currentMethod && (
          <div>
            <button className="btn-secondary mb-lg" onClick={() => setStep('methods')}>← Назад</button>
            <h2 className="text-2xl font-bold mb-sm">Сумма пополнения</h2>
            <div className="flex items-center gap-sm mb-xl text-secondary">
              <span>{currentMethod.icon}</span>
              <span>{currentMethod.name}</span>
            </div>

            <div className="form-group mb-lg">
              <div className="flex items-center border border-gray-300 rounded-lg px-lg py-md focus-within:border-accent">
                <span className="text-xl font-bold text-accent mr-sm">₽</span>
                <input
                  type="text"
                  className="flex-1 text-xl font-bold bg-transparent outline-none"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    if (value.split('.').length <= 2) {
                      setAmount(value);
                    }
                  }}
                  autoFocus // ИСПРАВЛЕНО: автофокус для ПК
                  autoComplete="off"
                  inputMode="decimal" // УЛУЧШЕНО: правильная клавиатура на мобильных
                />
              </div>
              <div className="text-sm text-secondary mt-sm">
                Лимиты: ₽{(currentMethod.min_amount || 100).toLocaleString()} - ₽{(currentMethod.max_amount || 100000).toLocaleString()}
              </div>
            </div>

            {numAmount > 0 && (
              <div className="text-center mb-lg">
                <div className="text-lg">К зачислению: <span className="font-bold text-accent">₽{numAmount.toLocaleString()}</span></div>
                <div className="text-sm text-secondary">⏱️ Время обработки: {currentMethod.processing_time || '5-15 минут'}</div>
              </div>
            )}

            <div className="mb-xl">
              <div className="text-sm text-secondary mb-sm">Быстрый выбор:</div>
              <div className="flex gap-sm flex-wrap">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    className="btn-secondary px-md py-sm text-sm"
                    onClick={() => setAmount(value.toString())}
                  >
                    ₽{value.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`btn-primary w-full ${loading ? 'btn-loading' : ''}`}
              onClick={createBalanceRequest}
              disabled={!isValidAmount || loading}
            >
              {loading ? 'Создаем заявку...' : 'Создать заявку →'}
            </button>
          </div>
        )}

        {/* STEP 3: PAYMENT - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ */}
        {step === 'payment' && paymentData && (
          <div>
            <button className="btn-secondary mb-lg" onClick={() => setStep('methods')}>← В меню</button>
            <div className="text-center mb-xl">
              <h2 className="text-2xl font-bold mb-sm">Оплата заявки</h2>
              <div className="text-muted font-mono">#{paymentData.orderId}</div>
            </div>

            {/* Order Info */}
            <div className="bg-gray-50 rounded-lg p-lg mb-lg">
              <div className="grid gap-sm text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Создана:</span>
                  <span>{formatDateTime(paymentData.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Статус:</span>
                  <div className={`status-badge ${getStatusInfo(paymentData.status).class}`}>
                    {getStatusInfo(paymentData.status).text}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Сумма:</span>
                  <button
                    className="font-bold text-lg text-accent"
                    onClick={() => copyWithFeedback(paymentData.amount.toString(), 'amount')}
                  >
                    ₽{paymentData.amount.toLocaleString()}
                    {copiedField === 'amount' ? ' ✔' : ' 📋'}
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border border-success rounded-lg p-lg mb-lg">
              <h3 className="font-bold mb-lg flex items-center gap-sm">
                <span>💳</span>
                Реквизиты для оплаты
              </h3>
              <div className="grid gap-md text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Номер карты:</span>
                  <button
                    className="font-mono font-bold text-accent"
                    onClick={() => copyWithFeedback('5536914123456789', 'card')}
                  >
                    5536 9141 2345 6789
                    {copiedField === 'card' ? ' ✔' : ' 📋'}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Получатель:</span>
                  <span className="font-bold">VOID SHOP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Банк:</span>
                  <span>Сбер Банк</span>
                </div>
              </div>
            </div>

            {/* УЛУЧШЕННАЯ: File Upload Section */}
            <div className="border border-accent rounded-lg p-lg mb-lg">
              <h3 className="font-bold mb-md flex items-center gap-sm">
                <span>📎</span>
                Загрузка чека об оплате
                <span className="text-error">*</span>
              </h3>

              {!receiptFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-xl text-center transition-all cursor-pointer ${
                    dragOver ? 'border-accent bg-accent-soft' : 'border-gray-300 hover:border-accent hover:bg-accent-soft'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-4xl mb-md">📎</div>
                  <div className="font-semibold mb-sm">Перетащите файл или нажмите для выбора</div>
                  <div className="text-sm text-secondary mb-sm">
                    Поддерживаемые форматы: JPG, PNG, WebP, PDF, HEIC
                  </div>
                  <div className="text-xs text-muted">Максимальный размер: 25 МБ</div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.heic,.heif"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-success-soft border border-success rounded-lg p-lg">
                  <div className="flex items-center justify-between mb-md">
                    <div className="flex items-center gap-md">
                      <span className="text-2xl">📄</span>
                      <div>
                        <div className="font-semibold">{receiptFile.name}</div>
                        <div className="text-sm text-secondary">{fileUtils.formatFileSize(receiptFile.size)}</div>
                      </div>
                    </div>
                    <button
                      className="btn-secondary px-md py-sm text-sm"
                      onClick={() => {
                        setReceiptFile(null);
                        setUploadedReceiptPreview(null);
                      }}
                    >
                      Удалить
                    </button>
                  </div>

                  {/* НОВОЕ: Превью загруженного изображения */}
                  {uploadedReceiptPreview && (
                    <div className="mb-md">
                      <img
                        src={uploadedReceiptPreview}
                        alt="Превью чека"
                        className="max-w-full h-auto max-h-48 rounded-md border"
                      />
                    </div>
                  )}

                  {uploadProgress > 0 && (
                    <div className="mb-md">
                      <div className="flex justify-between text-sm mb-xs">
                        <span>Загрузка...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {paymentData.status === 'pending' && (
                    <button
                      className={`btn-primary w-full ${loading ? 'btn-loading' : ''}`}
                      onClick={uploadReceipt}
                      disabled={loading}
                    >
                      {loading ? 'Загружаем...' : 'Загрузить чек'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* УЛУЧШЕННАЯ: Instructions */}
            <div className="bg-info-soft border border-info rounded-lg p-lg mb-lg">
              <h4 className="font-bold mb-md">📋 Инструкция по оплате:</h4>
              <ol className="text-sm space-y-1 ml-lg">
                <li>1. Скопируйте номер карты и сумму</li>
                <li>2. Откройте приложение банка</li>
                <li>3. Переведите <strong>точную сумму</strong> ₽{paymentData.amount.toLocaleString()}</li>
                <li>4. Сделайте скриншот чека об оплате</li>
                <li>5. Загрузите чек в форме выше</li>
                <li>6. Нажмите "Я оплатил"</li>
                <li>7. Ожидайте подтверждения администратора (5-15 минут)</li>
              </ol>
            </div>

            {/* УЛУЧШЕННАЯ: Warning */}
            <div className="bg-warning-soft border border-warning rounded-lg p-lg mb-xl">
              <div className="flex gap-md">
                <span className="text-warning text-xl">⚠️</span>
                <div className="text-sm">
                  <strong>Важно:</strong> Переведите точную сумму ₽{paymentData.amount.toLocaleString()}.
                  Обязательно приложите чек об оплате. Заявка будет проверена администратором в течение 5-15 минут.
                  <br/><br/>
                  <strong>Поддерживаемые форматы чеков:</strong> JPG, PNG, WebP, PDF, HEIC (iPhone)
                </div>
              </div>
            </div>

            {/* ИСПРАВЛЕННЫЕ: Action Buttons */}
            <div className="flex flex-col gap-md">
              <button
                className={`btn-primary w-full ${loading ? 'btn-loading' : ''}`}
                onClick={confirmPayment}
                disabled={loading || paymentData.status !== 'receipt_uploaded'}
              >
                {loading ? (
                  'Подтверждаем...'
                ) : paymentData.status === 'waiting_admin' ? (
                  <>⏳ На проверке у администратора</>
                ) : paymentData.status !== 'receipt_uploaded' ? (
                  <>📎 Сначала загрузите чек</>
                ) : (
                  <>✅ Я оплатил</>
                )}
              </button>

              {paymentData.status === 'pending' && (
                <button
                  className="btn-secondary w-full"
                  onClick={() => setStep('methods')}
                >
                  Отменить заявку
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && paymentData && (
          <div className="text-center">
            <div className="text-6xl mb-lg">✅</div>
            <h2 className="text-2xl font-bold mb-md">Заявка отправлена администратору</h2>
            <p className="text-secondary mb-lg">
              Заявка №{paymentData.orderId} на сумму ₽{paymentData.amount.toLocaleString()}
              принята к рассмотрению.
            </p>

            <div className={`status-badge ${getStatusInfo('waiting_admin').class} mb-xl`}>
              ⏳ На проверке у администратора
            </div>

            <div className="bg-info-soft border border-info rounded-lg p-lg mb-xl text-left">
              <h4 className="font-bold mb-md">Что дальше?</h4>
              <ul className="text-sm space-y-1 ml-lg">
                <li>• Администратор проверит ваш платеж (обычно 5-15 минут)</li>
                <li>• Вы получите уведомление в боте о результате проверки</li>
                <li>• При одобрении средства автоматически зачислятся на баланс</li>
                <li>• При отклонении вы можете создать новую заявку</li>
              </ul>
            </div>

            <div className="flex flex-col gap-md">
              <button className="btn-primary w-full" onClick={onBack}>
                Вернуться в профиль
              </button>
              <button className="btn-secondary w-full" onClick={() => setStep('history')}>
                Проверить статус заявки
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: HISTORY - УЛУЧШЕННАЯ */}
        {step === 'history' && (
          <div>
            <button className="btn-secondary mb-lg" onClick={() => setStep('methods')}>← Назад</button>
            <h2 className="text-2xl font-bold mb-md">История операций</h2>
            <p className="text-secondary mb-xl">Все ваши заявки на пополнение баланса</p>

            {requests.length === 0 ? (
              <div className="text-center py-2xl">
                <div className="text-6xl mb-lg">💳</div>
                <h3 className="text-xl font-bold mb-md">История пуста</h3>
                <p className="text-secondary mb-xl">Здесь будут отображаться ваши заявки на пополнение</p>
                <button className="btn-primary" onClick={() => setStep('methods')}>
                  Создать заявку
                </button>
              </div>
            ) : (
              <div className="grid gap-lg">
                {requests.map((req) => {
                  if (!req || !req.amount) return null;

                  const statusInfo = getStatusInfo(req.status);
                  const isActive = ['pending', 'receipt_uploaded', 'waiting_admin'].includes(req.status);

                  return (
                    <div
                      key={req.order_id}
                      className={`card p-lg ${isActive ? 'card-interactive border-accent' : ''}`}
                      onClick={() => {
                        if (isActive) {
                          setPaymentData({
                            orderId: req.order_id,
                            amount: req.amount,
                            method: req.method,
                            status: req.status,
                            createdAt: req.created_at,
                            paymentDetails: getPaymentDetails(req.method, req.amount)
                          });
                          setStep('payment');
                        }
                      }}
                      style={{ cursor: isActive ? 'pointer' : 'default' }}
                    >
                      <div className="flex justify-between items-center mb-md">
                        <div className="text-sm text-muted font-mono">#{req.order_id}</div>
                        <div className={`status-badge ${statusInfo.class}`}>
                          {statusInfo.icon} {statusInfo.text}
                          {isActive && <span className="ml-xs animate-pulse">●</span>}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-sm">
                        <div className="text-xl font-bold text-accent">₽{req.amount.toLocaleString()}</div>
                        <div className="text-sm text-secondary">
                          {formatDateTime(req.created_at)}
                        </div>
                      </div>

                      <div className="text-xs text-muted pt-sm border-t border-gray-100">
                        {isActive ? (
                          <span>👆 Нажмите для продолжения оплаты</span>
                        ) : req.status === 'rejected' ? (
                          <span>❌ Заявка отклонена - можете создать новую</span>
                        ) : req.status === 'approved' ? (
                          <span>✅ Средства успешно зачислены</span>
                        ) : (
                          <span>Завершенная операция</span>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* НОВЫЕ: Стили уведомлений */}
      <style>{`
        .notifications-container {
          position: fixed;
          top: var(--spacing-lg);
          right: var(--spacing-lg);
          z-index: 2000;
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          max-width: 350px;
        }

        .notification {
          padding: var(--spacing-md) var(--spacing-lg);
          border-radius: var(--radius-lg);
          font-weight: 500;
          box-shadow: var(--shadow-lg);
          border: 1px solid transparent;
          animation: slideIn 0.3s ease;
          backdrop-filter: blur(8px);
        }

        .notification-success {
          background: linear-gradient(135deg, #d4edda, #c3e6cb);
          color: #155724;
          border-color: #c3e6cb;
        }

        .notification-error {
          background: linear-gradient(135deg, #f8d7da, #f5c6cb);
          color: #721c24;
          border-color: #f5c6cb;
        }

        .notification-info {
          background: linear-gradient(135deg, #d1ecf1, #bee5eb);
          color: #0c5460;
          border-color: #bee5eb;
        }

        .theme-dark .notification-success {
          background: linear-gradient(135deg, rgba(72, 187, 120, 0.2), rgba(72, 187, 120, 0.1));
          color: #9ae6b4;
          border-color: rgba(72, 187, 120, 0.3);
        }

        .theme-dark .notification-error {
          background: linear-gradient(135deg, rgba(245, 101, 101, 0.2), rgba(245, 101, 101, 0.1));
          color: #fed7d7;
          border-color: rgba(245, 101, 101, 0.3);
        }

        .theme-dark .notification-info {
          background: linear-gradient(135deg, rgba(99, 179, 237, 0.2), rgba(99, 179, 237, 0.1));
          color: #bee3f8;
          border-color: rgba(99, 179, 237, 0.3);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .notifications-container {
            left: var(--spacing-sm);
            right: var(--spacing-sm);
            top: var(--spacing-sm);
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}