// frontend/src/components/BalanceSystem.jsx - ПОЛНОСТЬЮ ИСПРАВЛЕНО
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { sendDataToTelegramBot } from "../utils/telegram";
import { balanceAPI, fileUtils } from "../services/api";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// Notification component
const NotificationSystem = ({ notifications, onClose }) => (
  <div className="notifications-container">
    {notifications.map(notif => (
      <div key={notif.id} className={`notification notification-${notif.type}`}>
        <div className="notification-content">
          <span>{notif.message}</span>
          <button
            className="notification-close"
            onClick={() => onClose(notif.id)}
          >
            ×
          </button>
        </div>
      </div>
    ))}
  </div>
);

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

  // Состояния для файлов
  const [receiptFile, setReceiptFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedReceiptPreview, setUploadedReceiptPreview] = useState(null);

  const fileInputRef = useRef(null);
  const timersRef = useRef([]);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false); // ИСПРАВЛЕНО: предотвращаем повторную инициализацию

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

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

  const showNotification = useCallback((message, type = 'info') => {
    if (!mountedRef.current) return;

    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    }, 5000);

    timersRef.current.push(timer);
  }, []);

  const closeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ИСПРАВЛЕНО: Загрузка методов пополнения только один раз
  useEffect(() => {
    if (initializedRef.current) return; // Предотвращаем повторную инициализацию
    initializedRef.current = true;

    let cancelled = false;

    const loadPaymentMethods = async () => {
      try {
        console.log('🔄 Загружаем методы пополнения...');
        const methods = await balanceAPI.getPaymentMethods();

        if (!cancelled && mountedRef.current) {
          console.log('✅ Получены методы:', methods);

          // ИСПРАВЛЕНО: не фильтруем по enabled, показываем все методы
          setPaymentMethods(methods || []);

          // Выбираем первый доступный метод
          const enabledMethods = methods.filter(m => m.enabled);
          if (enabledMethods.length > 0) {
            setSelectedMethod(enabledMethods[0].id);
          } else if (methods.length > 0) {
            setSelectedMethod(methods[0].id);
          }
        }
      } catch (error) {
        if (!cancelled && mountedRef.current) {
          console.error('❌ Ошибка загрузки методов:', error);
          showNotification('Ошибка загрузки методов пополнения', 'error');

          // Fallback методы
          const fallbackMethods = [{
            id: 'card',
            name: 'Банковская карта',
            icon: '💳',
            description: 'Visa, MasterCard, МИР',
            min_amount: 100,
            max_amount: 100000,
            commission: 0,
            processing_time: '5-15 минут',
            enabled: true
          }];

          setPaymentMethods(fallbackMethods);
          setSelectedMethod('card');
        }
      }
    };

    const loadUserRequests = async () => {
      if (!user?.tg_id && !telegramUser?.id) return;

      try {
        console.log('🔄 Загружаем заявки для пользователя:', user?.tg_id || telegramUser?.id);
        const tgId = user?.tg_id || telegramUser?.id;
        const userRequests = await balanceAPI.getUserBalanceRequests(tgId);

        if (!cancelled && mountedRef.current) {
          console.log('✅ Загружены заявки:', userRequests);
          const sortedRequests = userRequests
            .filter(req => req && typeof req === 'object')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setRequests(sortedRequests);
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки заявок:', error);
      }
    };

    // Загружаем данные параллельно
    Promise.all([loadPaymentMethods(), loadUserRequests()]);

    return () => { cancelled = true; };
  }, []); // ИСПРАВЛЕНО: пустой массив зависимостей

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

  const validateFile = (file) => {
    const maxSize = 25 * 1024 * 1024;
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Неподдерживаемый тип файла. Разрешены: JPG, PNG, WebP, PDF, HEIC');
    }

    if (file.size > maxSize) {
      throw new Error(`Файл слишком большой. Максимум ${Math.round(maxSize / (1024 * 1024))} МБ`);
    }

    return true;
  };

  const handleFileSelect = useCallback(async (file) => {
    try {
      validateFile(file);
      setReceiptFile(file);

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

        // Обновляем список заявок
        const tgId = user?.tg_id || telegramUser?.id;
        try {
          const userRequests = await balanceAPI.getUserBalanceRequests(tgId);
          const sortedRequests = userRequests
            .filter(req => req && typeof req === 'object')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          setRequests(sortedRequests);
        } catch (e) {
          console.warn('Не удалось обновить список заявок:', e);
        }

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
  }, [isValidAmount, loading, user, telegramUser, numAmount, selectedMethod, showNotification]);

  const uploadReceipt = useCallback(async () => {
    if (!receiptFile || !paymentData) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await balanceAPI.uploadReceipt(paymentData.orderId, receiptFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (mountedRef.current) {
        setPaymentData(prev => ({ ...prev, status: 'receipt_uploaded' }));
        showNotification('Чек успешно загружен', 'success');

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

  const confirmPayment = useCallback(async () => {
    if (!paymentData) return;

    if (paymentData.status !== 'receipt_uploaded') {
      showNotification('Сначала загрузите чек об оплате', 'error');
      return;
    }

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
          receiptUploaded: true,
          paymentDetails: paymentData.paymentDetails
        }
      };

      const success = sendDataToTelegramBot(adminNotification);
      if (success) {
        console.log('📤 Уведомление админу отправлено');
      }

      setPaymentData(prev => ({ ...prev, status: 'waiting_admin' }));

      // Обновляем список заявок
      const tgId = user?.tg_id || telegramUser?.id;
      try {
        const userRequests = await balanceAPI.getUserBalanceRequests(tgId);
        const sortedRequests = userRequests
          .filter(req => req && typeof req === 'object')
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRequests(sortedRequests);
      } catch (e) {
        console.warn('Не удалось обновить список заявок:', e);
      }

      setStep('success');

    } catch (error) {
      showNotification(`Ошибка: ${error.message}`, 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [paymentData, user, telegramUser, currentMethod, showNotification]);

  const activeRequestsCount = useMemo(() =>
    requests.filter(r => r && ['pending', 'receipt_uploaded', 'waiting_admin'].includes(r.status)).length,
    [requests]
  );

  // DEBUG INFO
  console.log('🔍 BalanceSystem Debug:', {
    step,
    paymentMethods,
    paymentMethodsLength: paymentMethods.length,
    loading,
    selectedMethod,
    currentMethod: currentMethod ? currentMethod.name : 'null'
  });

  return (
    <div className="balance-system">
      <NotificationSystem notifications={notifications} onClose={closeNotification} />

      {/* HEADER */}
      <div className="card mb-xl">
        <button className="btn-secondary mb-lg" onClick={onBack}>← Назад</button>
        <div className="text-center">
          <div className="balance-icon">💰</div>
          <h1 className="page-title mb-sm">Пополнение баланса</h1>
          <div className="text-secondary">
            Текущий баланс: <span className="balance-amount">₽{(user?.balance || 0).toLocaleString()}</span>
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
                    className="request-item card-interactive"
                    onClick={() => {
                      setPaymentData({
                        orderId: req.order_id,
                        amount: req.amount,
                        method: req.method,
                        status: req.status,
                        createdAt: req.created_at,
                        paymentDetails: req.payment_details || {}
                      });
                      setStep('payment');
                    }}
                  >
                    <div className="request-header">
                      <div className="request-id">#{req.order_id}</div>
                      <div className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.icon} {statusInfo.text}
                        <span className="pulse-indicator">●</span>
                      </div>
                    </div>
                    <div className="request-details">
                      <div className="detail-item">
                        <span>Сумма:</span>
                        <span className="amount">₽{req.amount.toLocaleString()}</span>
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

            {paymentMethods.length === 0 ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Загружаем методы пополнения...</p>
              </div>
            ) : (
              <div className="payment-methods-grid">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`payment-method-card ${selectedMethod === method.id ? 'selected' : ''} ${!method.enabled ? 'disabled' : ''}`}
                    onClick={() => {
                      if (method.enabled) {
                        setSelectedMethod(method.id);
                        setStep('amount');
                      }
                    }}
                  >
                    <div className="payment-method-icon">{method.icon}</div>
                    <div className="payment-method-name">
                      {method.name}
                      {!method.enabled && <span className="text-warning ml-sm">(Скоро)</span>}
                    </div>
                    <div className="payment-method-description">{method.description}</div>
                    <div className="payment-method-details">
                      ₽{(method.min_amount || 100).toLocaleString()} - ₽{(method.max_amount || 100000).toLocaleString()} •
                      {method.commission > 0 ? ` Комиссия ${method.commission}%` : ' Без комиссии'} •
                      {method.processing_time || '5-15 минут'}
                    </div>
                    {method.enabled && <div className="text-accent text-xl">→</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: AMOUNT */}
        {step === 'amount' && currentMethod && (
          <div>
            <button className="btn-secondary mb-lg" onClick={() => setStep('methods')}>← Назад</button>
            <h2 className="text-2xl font-bold mb-sm">Сумма пополнения</h2>
            <div className="selected-method mb-xl">
              <span>{currentMethod.icon}</span>
              <span>{currentMethod.name}</span>
            </div>

            <div className="currency-input mb-lg">
              <span className="currency-symbol">₽</span>
              <input
                type="text"
                className="amount-input"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  if (value.split('.').length <= 2) {
                    setAmount(value);
                  }
                }}
                autoFocus
                autoComplete="off"
                inputMode="decimal"
              />
            </div>

            <div className="amount-info mb-lg">
              <div className="limits">
                Лимиты: ₽{(currentMethod.min_amount || 100).toLocaleString()} - ₽{(currentMethod.max_amount || 100000).toLocaleString()}
              </div>
              {numAmount > 0 && (
                <div className="amount-preview mb-sm">
                  К зачислению: ₽{numAmount.toLocaleString()}
                </div>
              )}
              <div className="processing-time">
                ⏱️ Время обработки: {currentMethod.processing_time || '5-15 минут'}
              </div>
            </div>

            <div className="quick-amounts mb-xl">
              <span className="quick-label">Быстрый выбор:</span>
              <div className="quick-buttons">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    className="btn-secondary quick-btn"
                    onClick={() => setAmount(value.toString())}
                  >
                    ₽{value.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`btn-primary w-full ${loading ? 'loading' : ''}`}
              onClick={createBalanceRequest}
              disabled={!isValidAmount || loading}
            >
              {loading ? (
                <>
                  <div className="button-spinner"></div>
                  Создаем заявку...
                </>
              ) : (
                'Создать заявку →'
              )}
            </button>
          </div>
        )}

        {/* STEP 3: PAYMENT */}
        {step === 'payment' && paymentData && (
          <div>
            <button className="btn-secondary mb-lg" onClick={() => setStep('methods')}>← В меню</button>
            <div className="text-center mb-xl">
              <h2 className="text-2xl font-bold mb-sm">Оплата заявки</h2>
              <div className="order-id">#{paymentData.orderId}</div>
            </div>

            {/* Order Info */}
            <div className="order-info mb-lg">
              <div className="info-row">
                <span>Создана:</span>
                <span>{formatDateTime(paymentData.createdAt)}</span>
              </div>
              <div className="info-row">
                <span>Статус:</span>
                <div className={`status-badge ${getStatusInfo(paymentData.status).class}`}>
                  {getStatusInfo(paymentData.status).text}
                </div>
              </div>
              <div className="info-row amount-row">
                <span>Сумма:</span>
                <button
                  className="copy-button"
                  onClick={() => copyWithFeedback(paymentData.amount.toString(), 'amount')}
                >
                  ₽{paymentData.amount.toLocaleString()}
                  {copiedField === 'amount' ? ' ✓' : ' 📋'}
                </button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="payment-details mb-lg">
              <h3 className="mb-lg">💳 Реквизиты для оплаты</h3>
              <div className="details-grid">
                <div className="detail-row">
                  <span>Номер карты:</span>
                  <button
                    className="copy-button"
                    onClick={() => copyWithFeedback('5536914123456789', 'card')}
                  >
                    5536 9141 2345 6789
                    {copiedField === 'card' ? ' ✓' : ' 📋'}
                  </button>
                </div>
                <div className="detail-row">
                  <span>Получатель:</span>
                  <span>VOID SHOP</span>
                </div>
                <div className="detail-row">
                  <span>Банк:</span>
                  <span>Сбер Банк</span>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="card mb-lg border-accent">
              <h3 className="mb-md">📎 Загрузка чека об оплате <span className="text-error">*</span></h3>

              {!receiptFile ? (
                <div
                  className={`file-upload-area ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">📎</div>
                  <div className="upload-text">Перетащите файл или нажмите для выбора</div>
                  <div className="upload-formats">Поддерживаемые форматы: JPG, PNG, WebP, PDF, HEIC</div>
                  <div className="upload-size">Максимальный размер: 25 МБ</div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.heic,.heif"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="file-uploaded">
                  <div className="file-info mb-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <span className="file-icon">📄</span>
                        <div>
                          <div className="file-name">{receiptFile.name}</div>
                          <div className="file-size">{fileUtils.formatFileSize(receiptFile.size)}</div>
                        </div>
                      </div>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setReceiptFile(null);
                          setUploadedReceiptPreview(null);
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>

                  {uploadedReceiptPreview && (
                    <div className="file-preview mb-md">
                      <img
                        src={uploadedReceiptPreview}
                        alt="Превью чека"
                        className="preview-image"
                      />
                    </div>
                  )}

                  {uploadProgress > 0 && (
                    <div className="upload-progress mb-md">
                      <div className="progress-text">
                        <span>Загрузка...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {paymentData.status === 'pending' && (
                    <button
                      className={`btn-primary w-full ${loading ? 'loading' : ''}`}
                      onClick={uploadReceipt}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="button-spinner"></div>
                          Загружаем...
                        </>
                      ) : (
                        'Загрузить чек'
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="instructions mb-lg">
              <h4>📋 Инструкция по оплате:</h4>
              <ol>
                <li>Скопируйте номер карты и сумму</li>
                <li>Откройте приложение банка</li>
                <li>Переведите <strong>точную сумму</strong> ₽{paymentData.amount.toLocaleString()}</li>
                <li>Сделайте скриншот чека об оплате</li>
                <li>Загрузите чек в форме выше</li>
                <li>Нажмите "Я оплатил"</li>
                <li>Ожидайте подтверждения администратора (5-15 минут)</li>
              </ol>
            </div>

            {/* Warning */}
            <div className="warning mb-xl">
              <span className="warning-icon">⚠️</span>
              <div>
                <strong>Важно:</strong> Переведите точную сумму ₽{paymentData.amount.toLocaleString()}.
                Обязательно приложите чек об оплате. Заявка будет проверена администратором в течение 5-15 минут.
                <br/><br/>
                <strong>Поддерживаемые форматы чеков:</strong> JPG, PNG, WebP, PDF, HEIC (iPhone)
              </div>
            </div>

            {/* Action Buttons */}
            <div className="payment-actions">
              <button
                className={`btn-primary confirm-btn ${loading ? 'loading' : ''}`}
                onClick={confirmPayment}
                disabled={loading || paymentData.status !== 'receipt_uploaded'}
              >
                {loading ? (
                  <>
                    <div className="button-spinner"></div>
                    Подтверждаем...
                  </>
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
                  className="btn-secondary cancel-btn"
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
          <div className="step-success">
            <div className="success-content">
              <div className="success-icon">✅</div>
              <h2 className="text-2xl font-bold mb-md">Заявка отправлена администратору</h2>
              <p className="text-secondary mb-lg">
                Заявка №{paymentData.orderId} на сумму ₽{paymentData.amount.toLocaleString()}
                принята к рассмотрению.
              </p>

              <div className={`status-badge ${getStatusInfo('waiting_admin').class} mb-xl`}>
                ⏳ На проверке у администратора
              </div>

              <div className="next-steps mb-xl">
                <h4>Что дальше?</h4>
                <ul>
                  <li>Администратор проверит ваш платеж (обычно 5-15 минут)</li>
                  <li>Вы получите уведомление в боте о результате проверки</li>
                  <li>При одобрении средства автоматически зачислятся на баланс</li>
                  <li>При отклонении вы можете создать новую заявку</li>
                </ul>
              </div>

              <div className="success-actions">
                <button className="btn-primary w-full" onClick={onBack}>
                  Вернуться в профиль
                </button>
                <button className="btn-secondary w-full" onClick={() => setStep('history')}>
                  Проверить статус заявки
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: HISTORY */}
        {step === 'history' && (
          <div>
            <button className="btn-secondary mb-lg" onClick={() => setStep('methods')}>← Назад</button>
            <h2 className="text-2xl font-bold mb-md">История операций</h2>
            <p className="text-secondary mb-xl">Все ваши заявки на пополнение баланса</p>

            {requests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">💳</div>
                <h3 className="text-xl font-bold mb-md">История пуста</h3>
                <p className="text-secondary mb-xl">Здесь будут отображаться ваши заявки на пополнение</p>
                <button className="btn-primary" onClick={() => setStep('methods')}>
                  Создать заявку
                </button>
              </div>
            ) : (
              <div className="requests-list">
                {requests.map((req) => {
                  if (!req || !req.amount) return null;

                  const statusInfo = getStatusInfo(req.status);
                  const isActive = ['pending', 'receipt_uploaded', 'waiting_admin'].includes(req.status);

                  return (
                    <div
                      key={req.order_id}
                      className={`request-item ${isActive ? 'card-interactive border-accent' : ''}`}
                      onClick={() => {
                        if (isActive) {
                          setPaymentData({
                            orderId: req.order_id,
                            amount: req.amount,
                            method: req.method,
                            status: req.status,
                            createdAt: req.created_at,
                            paymentDetails: req.payment_details || {}
                          });
                          setStep('payment');
                        }
                      }}
                      style={{ cursor: isActive ? 'pointer' : 'default' }}
                    >
                      <div className="request-header">
                        <div className="request-id">#{req.order_id}</div>
                        <div className={`status-badge ${statusInfo.class}`}>
                          {statusInfo.icon} {statusInfo.text}
                          {isActive && <span className="pulse-indicator">●</span>}
                        </div>
                      </div>

                      <div className="request-details">
                        <div className="detail-item">
                          <span>Сумма:</span>
                          <span className="amount">₽{req.amount.toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <span>Дата:</span>
                          <span>{formatDateTime(req.created_at)}</span>
                        </div>
                      </div>

                      <div className="request-footer">
                        {isActive ? (
                          <span className="action-hint">👆 Нажмите для продолжения оплаты</span>
                        ) : req.status === 'rejected' ? (
                          <span className="retry-hint">❌ Заявка отклонена - можете создать новую</span>
                        ) : req.status === 'approved' ? (
                          <span className="info-hint">✅ Средства успешно зачислены</span>
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
    </div>
  );
}