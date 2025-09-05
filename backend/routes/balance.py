# backend/routes/balance.py - ИСПРАВЛЕНО: рабочая система пополнения
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select
from backend.db import get_session
from backend.models import User, BalanceRequest
from datetime import datetime, timedelta
from typing import List, Optional
import logging
import time
import random

router = APIRouter(prefix='/api/balance')
logger = logging.getLogger(__name__)


# ИСПРАВЛЕННЫЕ модели
class CreateBalanceRequestIn(BaseModel):
    tg_id: int = Field(gt=0, description="Telegram ID пользователя")
    amount: float = Field(gt=0, le=100000, description="Сумма пополнения")
    method: str = Field(description="Способ пополнения: card или crypto")


class BalanceRequestOut(BaseModel):
    id: int
    order_id: str  # ИСПРАВЛЕНО: добавляем order_id в ответ
    tg_id: Optional[int]
    amount: float
    method: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime]
    user_name: Optional[str]
    user_username: Optional[str]
    admin_comment: Optional[str]


class ProcessBalanceRequestIn(BaseModel):
    order_id: str
    action: str = Field(pattern="^(approve|reject)$")
    admin_comment: Optional[str] = None


# ИСПРАВЛЕНО: правильная генерация order_id
def generate_order_id() -> str:
    timestamp = int(time.time() * 1000)  # миллисекунды
    random_part = random.randint(100, 999)
    return f"VB{timestamp}{random_part}"


@router.post('/create', response_model=dict)
def create_balance_request(data: CreateBalanceRequestIn):
    """ИСПРАВЛЕНО: Создание заявки на пополнение баланса"""

    logger.info(f"Создание заявки на пополнение: tg_id={data.tg_id}, amount={data.amount}")

    # Валидация метода
    if data.method not in ['card', 'crypto']:
        raise HTTPException(status_code=400, detail='Неподдерживаемый способ оплаты')

    with get_session() as session:
        # Ищем пользователя
        user = session.exec(select(User).where(User.tg_id == data.tg_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        # ИСПРАВЛЕНО: Генерируем уникальный order_id
        order_id = generate_order_id()

        # Проверяем что order_id уникален
        existing = session.exec(select(BalanceRequest).where(BalanceRequest.order_id == order_id)).first()
        while existing:
            order_id = generate_order_id()
            existing = session.exec(select(BalanceRequest).where(BalanceRequest.order_id == order_id)).first()

        # ИСПРАВЛЕНО: Создаем заявку с order_id
        balance_request = BalanceRequest(
            order_id=order_id,  # ИСПРАВЛЕНО: сохраняем order_id
            user_id=user.id,
            tg_id=data.tg_id,
            amount=data.amount,
            method=data.method,
            status='pending',
            user_name=f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username,
            user_username=user.username,
            created_at=datetime.utcnow()
        )

        session.add(balance_request)
        session.commit()
        session.refresh(balance_request)

        # ИСПРАВЛЕНО: Возвращаем полные данные для фронтенда
        response = {
            "success": True,
            "order_id": order_id,
            "amount": data.amount,
            "method": data.method,
            "status": "pending",
            "created_at": balance_request.created_at.isoformat(),
            "expires_at": (balance_request.created_at + timedelta(hours=24)).isoformat(),
            "payment_details": get_payment_details(data.method, data.amount),
            "user_info": {
                "tg_id": user.tg_id,
                "name": balance_request.user_name,
                "username": balance_request.user_username
            }
        }

        logger.info(f"✅ Создана заявка: {order_id}, пользователь: {data.tg_id}")
        return response


@router.get('/requests/{tg_id}', response_model=List[BalanceRequestOut])
def get_user_balance_requests(tg_id: int):
    """Получение заявок пользователя"""

    with get_session() as session:
        requests = session.exec(
            select(BalanceRequest).where(BalanceRequest.tg_id == tg_id)
            .order_by(BalanceRequest.created_at.desc())
        ).all()

        return requests


@router.post('/confirm', response_model=dict)
def confirm_payment(data: dict):
    """ИСПРАВЛЕНО: Подтверждение оплаты пользователем"""

    order_id = data.get('order_id')
    if not order_id:
        raise HTTPException(status_code=400, detail='Не указан номер заявки')

    logger.info(f"Подтверждение оплаты заявки: {order_id}")

    with get_session() as session:
        # Ищем заявку
        balance_request = session.exec(
            select(BalanceRequest).where(BalanceRequest.order_id == order_id)
        ).first()

        if not balance_request:
            raise HTTPException(status_code=404, detail='Заявка не найдена')

        if balance_request.status != 'pending':
            raise HTTPException(status_code=400, detail='Заявка уже обработана')

        # ИСПРАВЛЕНО: Меняем статус на ожидание подтверждения
        balance_request.status = 'waiting_confirmation'
        balance_request.processed_at = datetime.utcnow()

        session.add(balance_request)
        session.commit()

        logger.info(f"✅ Заявка {order_id} отправлена на проверку администратору")

        return {
            "success": True,
            "message": "Заявка отправлена на проверку",
            "order_id": order_id,
            "status": "waiting_confirmation"
        }


@router.post('/process', response_model=dict)
def process_balance_request(data: ProcessBalanceRequestIn):
    """Обработка заявки администратором"""

    logger.info(f"Обработка заявки {data.order_id} администратором: {data.action}")

    with get_session() as session:
        # Находим заявку
        balance_request = session.exec(
            select(BalanceRequest).where(BalanceRequest.order_id == data.order_id)
        ).first()

        if not balance_request:
            raise HTTPException(status_code=404, detail='Заявка не найдена')

        if balance_request.status not in ['pending', 'waiting_confirmation']:
            raise HTTPException(status_code=400, detail='Заявка уже обработана')

        # Находим пользователя
        user = session.exec(select(User).where(User.tg_id == balance_request.tg_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        old_balance = user.balance

        if data.action == 'approve':
            # ИСПРАВЛЕНО: Зачисляем баланс
            user.balance = (user.balance or 0) + balance_request.amount
            balance_request.status = 'approved'

            logger.info(f"✅ Баланс пользователя {user.tg_id}: {old_balance} -> {user.balance}")

        else:  # reject
            balance_request.status = 'rejected'
            logger.info(f"❌ Заявка {data.order_id} отклонена")

        balance_request.processed_at = datetime.utcnow()
        balance_request.admin_comment = data.admin_comment

        session.add(user)
        session.add(balance_request)
        session.commit()
        session.refresh(user)

        return {
            "success": True,
            "action": data.action,
            "order_id": data.order_id,
            "old_balance": old_balance,
            "new_balance": user.balance,
            "amount": balance_request.amount,
            "user_tg_id": user.tg_id,
            "user_name": balance_request.user_name
        }


def get_payment_details(method: str, amount: float) -> dict:
    """ИСПРАВЛЕНО: Реквизиты для оплаты"""

    if method == 'card':
        return {
            "type": "card",
            "card_number": "5536 9141 2345 6789",
            "card_holder": "VOID SHOP",
            "bank": "Сбер Банк",
            "amount": amount,
            "instructions": [
                "Переведите точную сумму на указанную карту",
                "Сохраните чек об оплате",
                "Нажмите 'Я оплатил' в приложении",
                "Ожидайте подтверждения администратора"
            ]
        }
    elif method == 'crypto':
        return {
            "type": "crypto",
            "wallet_btc": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "wallet_usdt": "TQRRm4Pg5wKTZJhP5QiCEkT3JzRzJ3qS4F",
            "amount": amount,
            "instructions": [
                "Отправьте криптовалюту на указанный кошелек",
                "Подождите подтверждения транзакции",
                "Нажмите 'Я оплатил' в приложении"
            ]
        }

    return {}


@router.get('/methods', response_model=List[dict])
def get_payment_methods():
    """ИСПРАВЛЕНО: Доступные способы пополнения"""

    return [
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
            "max_amount": 500000,
            "commission": 2,
            "processing_time": "15-60 минут",
            "enabled": False  # Пока отключено
        }
    ]


@router.get('/stats', response_model=dict)
def get_balance_stats():
    """ИСПРАВЛЕНО: Статистика для админов"""

    with get_session() as session:
        # Общая статистика заявок
        total_requests = len(session.exec(select(BalanceRequest)).all())
        pending_requests = len(session.exec(select(BalanceRequest).where(BalanceRequest.status == 'pending')).all())
        waiting_requests = len(
            session.exec(select(BalanceRequest).where(BalanceRequest.status == 'waiting_confirmation')).all())
        approved_requests = len(session.exec(select(BalanceRequest).where(BalanceRequest.status == 'approved')).all())

        # Сумма пополнений
        approved = session.exec(select(BalanceRequest).where(BalanceRequest.status == 'approved')).all()
        total_amount = sum(req.amount for req in approved)

        return {
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "waiting_requests": waiting_requests,
            "approved_requests": approved_requests,
            "total_amount": total_amount,
            "timestamp": datetime.utcnow().isoformat()
        }