# backend/routes/balance.py - ИСПРАВЛЕНО: включаем крипто-метод по умолчанию
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from pydantic import BaseModel, Field, validator
from sqlmodel import select
from backend.db import get_session
from backend.models import User, BalanceRequest, SystemSettings, ReferralStats
from datetime import datetime, timezone
from typing import List, Optional
import logging
import time
import random
import os
import json

router = APIRouter(prefix='/api/balance')
logger = logging.getLogger(__name__)

# Настройки файлов
UPLOAD_DIR = "uploads/receipts"
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf', '.webp', '.heic', '.heif'}
ALLOWED_MIMETYPES = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/heic', 'image/heif',
    'application/pdf'
}

# Создаем директорию если не существует
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CreateBalanceRequestIn(BaseModel):
    tg_id: int = Field(gt=0)
    amount: float = Field(gt=0, le=100000)
    method: str

    @validator('method')
    def validate_method(cls, v):
        allowed_methods = ['card', 'crypto']
        if v not in allowed_methods:
            raise ValueError(f'Метод должен быть одним из: {allowed_methods}')
        return v

    @validator('amount')
    def validate_amount(cls, v):
        if v < 100:
            raise ValueError('Минимальная сумма пополнения 100 рублей')
        if v > 100000:
            raise ValueError('Максимальная сумма пополнения 100,000 рублей')
        return round(v, 2)


class ProcessBalanceRequestIn(BaseModel):
    action: str  # approve или reject
    admin_id: Optional[int] = None
    admin_comment: Optional[str] = None

    @validator('action')
    def validate_action(cls, v):
        if v not in ['approve', 'reject']:
            raise ValueError('Action должен быть approve или reject')
        return v


class BalanceRequestOut(BaseModel):
    id: Optional[int]
    order_id: str
    tg_id: Optional[int]
    amount: float
    method: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime]
    user_name: Optional[str]
    user_username: Optional[str]
    admin_comment: Optional[str]
    receipt_path: Optional[str]
    receipt_filename: Optional[str]


def generate_order_id() -> str:
    """Генерирует уникальный ID заявки"""
    timestamp = int(time.time() * 1000)
    random_part = random.randint(100, 999)
    return f"VB{timestamp}{random_part}"


def validate_file(file: UploadFile) -> tuple[bool, str]:
    """Валидация загружаемого файла"""
    if not file.filename:
        return False, "Файл не выбран"

    # Проверяем размер
    if file.size and file.size > MAX_FILE_SIZE:
        return False, f"Файл слишком большой. Максимум {MAX_FILE_SIZE // (1024 * 1024)}MB"

    # Проверяем расширение
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False, f"Неподдерживаемый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"

    # Проверяем MIME тип
    if file.content_type not in ALLOWED_MIMETYPES:
        return False, f"Неподдерживаемый тип контента: {file.content_type}"

    return True, "OK"


def get_payment_details_from_settings(method: str, amount: float):
    """Получает реквизиты из настроек базы данных"""
    with get_session() as session:
        try:
            if method == 'card':
                # Получаем реквизиты карты из настроек
                card_number = session.exec(
                    select(SystemSettings).where(SystemSettings.key == "payment_card_number")
                ).first()
                card_holder = session.exec(
                    select(SystemSettings).where(SystemSettings.key == "payment_card_holder")
                ).first()
                bank_name = session.exec(
                    select(SystemSettings).where(SystemSettings.key == "payment_bank_name")
                ).first()

                return {
                    "type": "card",
                    "card_number": card_number.value if card_number else "5536 9141 2345 6789",
                    "card_holder": card_holder.value if card_holder else "VOID SHOP",
                    "bank": bank_name.value if bank_name else "Сбер Банк",
                    "amount": amount,
                    "instructions": [
                        f"Переведите точную сумму ₽{amount:,.2f} на карту",
                        "Сделайте скриншот чека об оплате",
                        "Загрузите чек в приложении",
                        "Нажмите 'Я оплатил'",
                        "Ожидайте подтверждения (5-15 минут)"
                    ]
                }
            elif method == 'crypto':
                btc_wallet = session.exec(
                    select(SystemSettings).where(SystemSettings.key == "payment_btc_wallet")
                ).first()
                usdt_wallet = session.exec(
                    select(SystemSettings).where(SystemSettings.key == "payment_usdt_wallet")
                ).first()

                return {
                    "type": "crypto",
                    "wallet_btc": btc_wallet.value if btc_wallet else "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                    "wallet_usdt": usdt_wallet.value if usdt_wallet else "TQRRm4Pg5wKTZJhP5QiCEkT3JzRzJ3qS4F",
                    "amount": amount,
                    "instructions": [
                        f"Отправьте криптовалюту эквивалентную ₽{amount:,.2f}",
                        "Сделайте скриншот транзакции",
                        "Загрузите скриншот в приложении",
                        "Нажмите 'Я оплатил'"
                    ]
                }
        except Exception as e:
            logger.error(f"Ошибка получения реквизитов: {e}")
            # Fallback реквизиты
            if method == 'card':
                return {
                    "type": "card",
                    "card_number": "5536 9141 2345 6789",
                    "card_holder": "VOID SHOP",
                    "bank": "Сбер Банк",
                    "amount": amount,
                    "instructions": [
                        f"Переведите точную сумму ₽{amount:,.2f} на карту",
                        "Сделайте скриншот чека об оплате",
                        "Загрузите чек в приложении",
                        "Нажмите 'Я оплатил'",
                        "Ожидайте подтверждения (5-15 минут)"
                    ]
                }
            else:
                return {
                    "type": "crypto",
                    "wallet_btc": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
                    "wallet_usdt": "TQRRm4Pg5wKTZJhP5QiCEkT3JzRzJ3qS4F",
                    "amount": amount,
                    "instructions": [
                        f"Отправьте криптовалюту эквивалентную ₽{amount:,.2f}",
                        "Сделайте скриншот транзакции",
                        "Загрузите скриншот в приложении",
                        "Нажмите 'Я оплатил'"
                    ]
                }


@router.post('/create', response_model=dict)
def create_balance_request(data: CreateBalanceRequestIn):
    """Создание заявки на пополнение"""
    logger.info(f"💳 Создание заявки: tg_id={data.tg_id}, amount={data.amount}, method={data.method}")

    with get_session() as session:
        try:
            # Находим пользователя
            user = session.exec(
                select(User).where(User.tg_id == data.tg_id)
            ).first()

            if not user:
                raise HTTPException(status_code=404, detail='Пользователь не найден')

            # Генерируем уникальный order_id
            order_id = None
            for _ in range(10):
                potential_id = generate_order_id()
                existing = session.exec(
                    select(BalanceRequest).where(BalanceRequest.order_id == potential_id)
                ).first()
                if not existing:
                    order_id = potential_id
                    break

            if not order_id:
                raise HTTPException(status_code=500, detail='Не удалось сгенерировать ID')

            # Создаем заявку
            balance_request = BalanceRequest(
                order_id=order_id,
                user_id=user.id,
                tg_id=data.tg_id,
                amount=data.amount,
                method=data.method,
                status='pending',
                user_name=f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username or 'Пользователь',
                user_username=user.username,
                created_at=datetime.now(timezone.utc)
            )

            session.add(balance_request)
            session.commit()
            session.refresh(balance_request)

            # Получаем реквизиты для оплаты
            payment_details = get_payment_details_from_settings(data.method, data.amount)

            response = {
                "success": True,
                "order_id": order_id,
                "amount": data.amount,
                "method": data.method,
                "status": "pending",
                "created_at": balance_request.created_at.isoformat(),
                "payment_details": payment_details,
                "user_info": {
                    "tg_id": user.tg_id,
                    "name": balance_request.user_name,
                    "username": balance_request.user_username
                }
            }

            logger.info(f"✅ Заявка создана: {order_id}")
            return response

        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Ошибка создания заявки: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


@router.post('/upload-receipt/{order_id}', response_model=dict)
async def upload_receipt(
        order_id: str,
        file: UploadFile = File(...),
        session=Depends(get_session)
):
    """Загрузка чека к заявке"""
    logger.info(f"📎 Загрузка чека для заявки {order_id}: {file.filename}")

    try:
        # Находим заявку
        balance_request = session.exec(
            select(BalanceRequest).where(BalanceRequest.order_id == order_id)
        ).first()

        if not balance_request:
            raise HTTPException(status_code=404, detail='Заявка не найдена')

        if balance_request.status not in ['pending']:
            raise HTTPException(status_code=400, detail='Заявка уже обработана')

        # Валидация файла
        is_valid, error_msg = validate_file(file)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        # Читаем файл
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Файл слишком большой")

        # Генерируем имя файла
        file_ext = os.path.splitext(file.filename)[1].lower()
        safe_filename = f"{order_id}_{int(time.time())}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        # Сохраняем файл
        with open(file_path, 'wb') as f:
            f.write(content)

        # Обновляем заявку
        balance_request.receipt_path = file_path
        balance_request.receipt_filename = file.filename
        balance_request.receipt_mimetype = file.content_type
        balance_request.receipt_size = len(content)
        balance_request.status = 'receipt_uploaded'
        balance_request.uploaded_at = datetime.now(timezone.utc)

        session.add(balance_request)
        session.commit()

        logger.info(f"✅ Чек сохранен: {file_path}")

        return {
            "success": True,
            "order_id": order_id,
            "status": "receipt_uploaded",
            "message": "Чек успешно загружен",
            "file_path": file_path,
            "file_name": file.filename
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка загрузки чека: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {str(e)}")


@router.post('/mark-paid/{order_id}', response_model=dict)
def mark_paid(order_id: str):
    """Отметка об оплате - готово к проверке админом"""
    logger.info(f"💰 Отметка об оплате: {order_id}")

    with get_session() as session:
        try:
            balance_request = session.exec(
                select(BalanceRequest).where(BalanceRequest.order_id == order_id)
            ).first()

            if not balance_request:
                raise HTTPException(status_code=404, detail='Заявка не найдена')

            # Проверяем что чек загружен
            if balance_request.status != 'receipt_uploaded':
                raise HTTPException(
                    status_code=400,
                    detail='Сначала загрузите чек об оплате'
                )

            # Обновляем заявку
            balance_request.status = 'waiting_admin'
            balance_request.processed_at = datetime.now(timezone.utc)

            session.add(balance_request)
            session.commit()

            logger.info(f"✅ Заявка {order_id} готова к отправке админам")

            return {
                "success": True,
                "order_id": order_id,
                "status": "waiting_admin",
                "message": "Заявка отправлена на проверку администратору"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ошибка mark_paid: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


@router.post('/process/{order_id}', response_model=dict)
def process_balance_request(order_id: str, data: ProcessBalanceRequestIn):
    """Обработка заявки администратором"""
    logger.info(f"🔧 Админ обработка {order_id}: {data.action}")

    with get_session() as session:
        try:
            balance_request = session.exec(
                select(BalanceRequest).where(BalanceRequest.order_id == order_id)
            ).first()

            if not balance_request:
                raise HTTPException(status_code=404, detail='Заявка не найдена')

            if balance_request.status not in ['waiting_admin']:
                return {
                    "success": False,
                    "message": "Заявка уже обработана",
                    "current_status": balance_request.status
                }

            # Находим пользователя
            user = session.exec(
                select(User).where(User.id == balance_request.user_id)
            ).first()

            if not user:
                raise HTTPException(status_code=404, detail='Пользователь не найден')

            old_balance = user.balance or 0

            if data.action == 'approve':
                # КРИТИЧЕСКОЕ: Реально зачисляем деньги!
                user.balance = old_balance + balance_request.amount
                user.total_deposits = (user.total_deposits or 0) + balance_request.amount
                balance_request.status = 'approved'
                session.add(user)

                # Реферальная система - начисляем комиссию
                if user.referred_by:
                    referrer = session.exec(
                        select(User).where(User.id == user.referred_by)
                    ).first()
                    if referrer:
                        commission = balance_request.amount * 0.05  # 5% комиссия
                        referrer.balance += commission
                        referrer.total_referral_earnings = (referrer.total_referral_earnings or 0) + commission
                        session.add(referrer)

                        # Обновляем статистику рефералов
                        ref_stats = session.exec(
                            select(ReferralStats)
                            .where(ReferralStats.referrer_id == referrer.id)
                            .where(ReferralStats.referred_id == user.id)
                        ).first()

                        if not ref_stats:
                            ref_stats = ReferralStats(
                                referrer_id=referrer.id,
                                referred_id=user.id,
                                total_deposits=0,
                                total_orders=0,
                                commission_earned=0,
                                created_at=datetime.now(timezone.utc),
                                last_activity=datetime.now(timezone.utc),
                                is_active=True
                            )

                        ref_stats.total_deposits += balance_request.amount
                        ref_stats.commission_earned += commission
                        ref_stats.last_activity = datetime.now(timezone.utc)
                        session.add(ref_stats)

                        logger.info(f"💰 Реферальная комиссия: {commission} для пользователя {referrer.tg_id}")

                logger.info(f"💰 БАЛАНС ОБНОВЛЕН! {user.tg_id}: {old_balance} → {user.balance}")
            else:
                balance_request.status = 'rejected'
                logger.info(f"❌ Заявка отклонена: {order_id}")

            balance_request.processed_at = datetime.now(timezone.utc)
            balance_request.admin_comment = data.admin_comment
            balance_request.admin_id = data.admin_id

            session.add(balance_request)
            session.commit()
            session.refresh(user)
            session.refresh(balance_request)

            return {
                "success": True,
                "action": data.action,
                "order_id": order_id,
                "old_balance": old_balance,
                "new_balance": user.balance,
                "amount": balance_request.amount,
                "user_tg_id": user.tg_id,
                "user_name": balance_request.user_name,
                "status": balance_request.status
            }

        except HTTPException:
            raise
        except Exception as e:
            session.rollback()
            logger.error(f"Критическая ошибка process: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


@router.get('/requests/{tg_id}', response_model=List[BalanceRequestOut])
def get_user_balance_requests(tg_id: int):
    """Получение заявок пользователя"""
    with get_session() as session:
        try:
            requests = session.exec(
                select(BalanceRequest).where(BalanceRequest.tg_id == tg_id)
                .order_by(BalanceRequest.created_at.desc())
            ).all()

            return list(requests)

        except Exception as e:
            logger.error(f"Ошибка загрузки заявок: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


@router.get('/methods', response_model=List[dict])
def get_payment_methods():
    """Доступные способы пополнения"""
    logger.info("📋 Запрос методов пополнения")

    methods = [
        {
            "id": "card",
            "name": "Банковская карта",
            "icon": "💳",
            "description": "Visa, MasterCard, МИР",
            "min_amount": 100,
            "max_amount": 100000,
            "commission": 0,
            "processing_time": "5-15 минут",
            "enabled": True
        },
        {
            "id": "crypto",
            "name": "Криптовалюта",
            "icon": "₿",
            "description": "Bitcoin, USDT",
            "min_amount": 500,
            "max_amount": 50000,
            "commission": 2.5,
            "processing_time": "10-30 минут",
            "enabled": True  # ИСПРАВЛЕНО: включаем криптовалюты
        }
    ]

    logger.info(f"✅ Возвращаем {len(methods)} методов")
    return methods


@router.get('/receipt/{order_id}')
async def get_receipt(order_id: str):
    """Получение файла чека"""
    from fastapi.responses import FileResponse

    with get_session() as session:
        balance_request = session.exec(
            select(BalanceRequest).where(BalanceRequest.order_id == order_id)
        ).first()

        if not balance_request:
            raise HTTPException(status_code=404, detail='Заявка не найдена')

        if not balance_request.receipt_path:
            raise HTTPException(status_code=404, detail='Чек не найден')

        if not os.path.exists(balance_request.receipt_path):
            raise HTTPException(status_code=404, detail='Файл чека не найден')

        return FileResponse(
            balance_request.receipt_path,
            media_type=balance_request.receipt_mimetype or 'application/octet-stream',
            filename=balance_request.receipt_filename or 'receipt'
        )


@router.get('/referral/stats/{tg_id}')
def get_referral_stats(tg_id: int):
    """Получение реферальной статистики пользователя"""
    with get_session() as session:
        try:
            # Находим пользователя
            user = session.exec(
                select(User).where(User.tg_id == tg_id)
            ).first()

            if not user:
                raise HTTPException(status_code=404, detail='Пользователь не найден')

            # Генерируем реферальный код если его нет
            if not user.referral_code:
                user.referral_code = f"REF{user.id}{random.randint(100, 999)}"
                session.add(user)
                session.commit()
                session.refresh(user)

            # Получаем статистику по рефералам
            ref_stats = session.exec(
                select(ReferralStats)
                .where(ReferralStats.referrer_id == user.id)
            ).all()

            # Получаем список рефералов
            referrals = session.exec(
                select(User).where(User.referred_by == user.id)
            ).all()

            total_referrals = len(referrals)
            active_referrals = len([r for r in referrals if r.total_deposits > 0])
            total_deposits_from_refs = sum(stat.total_deposits for stat in ref_stats)
            total_commission = user.total_referral_earnings or 0

            # Детали по каждому рефералу
            referral_details = []
            for referral in referrals:
                stat = next((s for s in ref_stats if s.referred_id == referral.id), None)
                referral_details.append({
                    "tg_id": referral.tg_id,
                    "username": referral.username,
                    "first_name": referral.first_name,
                    "registered_at": referral.registered_at.isoformat(),
                    "total_deposits": stat.total_deposits if stat else 0,
                    "commission_earned": stat.commission_earned if stat else 0,
                    "is_active": referral.total_deposits > 0
                })

            return {
                "referral_code": user.referral_code,
                "referral_link": f"https://t.me/voidshop_bot?start={user.referral_code}",
                "total_referrals": total_referrals,
                "active_referrals": active_referrals,
                "total_deposits_from_refs": total_deposits_from_refs,
                "total_commission": total_commission,
                "commission_rate": 5,  # 5% комиссия
                "referral_details": referral_details
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Ошибка получения реферальной статистики: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка: {str(e)}")


def init_default_payment_settings():
    """Инициализация дефолтных настроек при запуске"""
    default_settings = [
        {
            "key": "payment_card_number",
            "value": "5536 9141 2345 6789",
            "description": "Номер карты для пополнения",
            "category": "payment"
        },
        {
            "key": "payment_card_holder",
            "value": "VOID SHOP",
            "description": "Держатель карты",
            "category": "payment"
        },
        {
            "key": "payment_bank_name",
            "value": "Сбер Банк",
            "description": "Название банка",
            "category": "payment"
        },
        {
            "key": "payment_btc_wallet",
            "value": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "description": "Bitcoin кошелек",
            "category": "payment"
        },
        {
            "key": "payment_usdt_wallet",
            "value": "TQRRm4Pg5wKTZJhP5QiCEkT3JzRzJ3qS4F",
            "description": "USDT кошелек",
            "category": "payment"
        }
    ]

    with get_session() as session:
        for setting_data in default_settings:
            existing = session.exec(
                select(SystemSettings).where(SystemSettings.key == setting_data["key"])
            ).first()

            if not existing:
                setting = SystemSettings(
                    key=setting_data["key"],
                    value=setting_data["value"],
                    description=setting_data["description"],
                    category=setting_data["category"],
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                session.add(setting)

        session.commit()
        logger.info("✅ Дефолтные настройки платежей инициализированы")