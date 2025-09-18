# backend/routes/balance.py - ИСПРАВЛЕНО: включены методы пополнения
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel, Field, validator
from sqlmodel import select
from backend.db import get_session
from backend.models import User, BalanceRequest
from datetime import datetime
from typing import List, Optional
import logging
import time
import random
import os
import uuid
import mimetypes

router = APIRouter(prefix='/api/balance')
logger = logging.getLogger(__name__)

# Настройки файлов
UPLOAD_DIR = "uploads/receipts"
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf', '.webp', '.heic', '.heif'}
ALLOWED_MIMETYPES = {
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'image/heic', 'image/heif',  # iPhone форматы
    'application/pdf'
}

# Создаем директорию если не существует
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CreateBalanceRequestIn(BaseModel):
    tg_id: int = Field(gt=0, description="Telegram ID пользователя")
    amount: float = Field(gt=0, le=100000, description="Сумма пополнения")
    method: str = Field(description="Способ пополнения")

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


class BalanceRequestOut(BaseModel):
    id: int
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


@router.post('/create', response_model=dict)
def create_balance_request(data: CreateBalanceRequestIn):
    """Создание заявки на пополнение"""
    logger.info(f"Создание заявки: tg_id={data.tg_id}, amount={data.amount}")

    with get_session() as session:
        try:
            # Находим пользователя
            user_stmt = select(User).where(User.tg_id == data.tg_id)
            user = session.exec(user_stmt).first()
            if not user:
                raise HTTPException(status_code=404, detail='Пользователь не найден')

            # Генерируем уникальный order_id
            max_attempts = 10
            order_id = None
            for _ in range(max_attempts):
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
                created_at=datetime.utcnow()
            )

            session.add(balance_request)
            session.commit()
            session.refresh(balance_request)

            response = {
                "success": True,
                "order_id": order_id,
                "amount": data.amount,
                "method": data.method,
                "status": "pending",
                "created_at": balance_request.created_at.isoformat(),
                "payment_details": get_payment_details(data.method, data.amount),
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
        balance_request.uploaded_at = datetime.utcnow()

        session.add(balance_request)
        session.commit()

        logger.info(f"✅ Чек сохранен: {file_path}")

        return {
            "success": True,
            "order_id": order_id,
            "status": "receipt_uploaded",
            "message": "Чек успешно загружен"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка загрузки чека: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {str(e)}")


@router.post('/mark-paid/{order_id}', response_model=dict)
def mark_paid(order_id: str):
    """Отметка об оплате"""
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
            balance_request.processed_at = datetime.utcnow()

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
def process_balance_request(order_id: str, data: dict):
    """Обработка заявки администратором"""
    action = data.get('action')  # approve/reject
    admin_id = data.get('admin_id')
    admin_comment = data.get('admin_comment', '')

    if action not in ['approve', 'reject']:
        raise HTTPException(status_code=400, detail='Некорректное действие')

    logger.info(f"🔧 Админ обработка {order_id}: {action}")

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

            if action == 'approve':
                # КРИТИЧЕСКОЕ: Реально зачисляем деньги!
                user.balance = old_balance + balance_request.amount
                balance_request.status = 'approved'
                session.add(user)
                logger.info(f"💰 БАЛАНС ОБНОВЛЕН! {user.tg_id}: {old_balance} → {user.balance}")
            else:
                balance_request.status = 'rejected'
                logger.info(f"❌ Заявка отклонена: {order_id}")

            balance_request.processed_at = datetime.utcnow()
            balance_request.admin_comment = admin_comment
            balance_request.admin_id = admin_id

            session.add(balance_request)
            session.commit()
            session.refresh(user)
            session.refresh(balance_request)

            return {
                "success": True,
                "action": action,
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


def get_payment_details(method: str, amount: float) -> dict:
    """Получает реквизиты для оплаты"""
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
    elif method == 'crypto':
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
    return {}


@router.get('/methods', response_model=List[dict])
def get_payment_methods():
    """ИСПРАВЛЕНО: Доступные способы пополнения - ВКЛЮЧЕНЫ"""
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
            "enabled": True  # ИСПРАВЛЕНО: включено
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
            "enabled": False  # Временно отключена
        }
    ]

    logger.info(f"✅ Возвращаем {len(methods)} методов")
    return methods