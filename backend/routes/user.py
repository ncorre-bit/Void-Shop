# backend/routes/user.py - ИСПРАВЛЕННАЯ ВЕРСИЯ с сохранением данных Telegram
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.db import get_session
from backend.models import User
from datetime import datetime
import logging
import json

router = APIRouter(prefix='/api')
logger = logging.getLogger(__name__)


class UserIn(BaseModel):
    tg_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    city: str | None = None
    # НОВЫЕ ПОЛЯ для Telegram данных
    photo_url: str | None = None
    language_code: str | None = None
    is_premium: bool | None = None


class UserOut(BaseModel):
    id: int
    tg_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    city: str | None
    registered_at: datetime
    last_active: datetime
    balance: float
    is_verified: bool
    # НОВЫЕ ПОЛЯ
    avatar_url: str | None


@router.post('/user', response_model=UserOut)
def create_or_update_user(payload: UserIn):
    """Создает нового пользователя или обновляет существующего по tg_id"""

    # ВАЛИДАЦИЯ данных
    if not payload.tg_id or payload.tg_id < 1:
        raise HTTPException(status_code=400, detail="Некорректный Telegram ID")

    logger.info(f"Создание/обновление пользователя: tg_id={payload.tg_id}, username={payload.username}")

    with get_session() as session:
        # Ищем существующего пользователя по tg_id
        stmt = select(User).where(User.tg_id == payload.tg_id)
        user = session.exec(stmt).first()

        if not user:
            # СОЗДАЕМ нового пользователя
            logger.info(f"Создаем нового пользователя: tg_id={payload.tg_id}")

            # Подготавливаем Telegram данные
            telegram_data = {
                "language_code": payload.language_code or "ru",
                "is_premium": payload.is_premium or False,
                "first_seen": datetime.utcnow().isoformat(),
                "platform": "telegram_webapp"
            }

            user = User(
                tg_id=payload.tg_id,
                username=payload.username.strip() if payload.username else None,
                first_name=payload.first_name.strip() if payload.first_name else None,
                last_name=payload.last_name.strip() if payload.last_name else None,
                city=payload.city.strip() if payload.city else 'Москва',
                avatar_url=payload.photo_url,  # Сохраняем аватар из Telegram
                telegram_data=json.dumps(telegram_data),  # JSON данные как строка
                registered_at=datetime.utcnow(),
                last_active=datetime.utcnow(),
                balance=0.0,  # Начальный баланс
                is_active=True,
                is_verified=False
            )

            session.add(user)
            session.commit()
            session.refresh(user)

            logger.info(f"✅ Создан новый пользователь: id={user.id}, tg_id={user.tg_id}")
        else:
            # ОБНОВЛЯЕМ существующего пользователя
            logger.info(f"Обновляем существующего пользователя: id={user.id}, tg_id={user.tg_id}")

            updated = False
            changes = []

            # Обновляем основные поля если они изменились
            if payload.username and payload.username.strip() != user.username:
                old_username = user.username
                user.username = payload.username.strip()
                changes.append(f"username: {old_username} -> {user.username}")
                updated = True

            if payload.first_name and payload.first_name.strip() != user.first_name:
                old_first_name = user.first_name
                user.first_name = payload.first_name.strip()
                changes.append(f"first_name: {old_first_name} -> {user.first_name}")
                updated = True

            if payload.last_name and payload.last_name.strip() != user.last_name:
                old_last_name = user.last_name
                user.last_name = payload.last_name.strip()
                changes.append(f"last_name: {old_last_name} -> {user.last_name}")
                updated = True

            if payload.city and payload.city.strip() != user.city:
                old_city = user.city
                user.city = payload.city.strip()
                changes.append(f"city: {old_city} -> {user.city}")
                updated = True

            # ОБНОВЛЯЕМ аватар если изменился
            if payload.photo_url and payload.photo_url != user.avatar_url:
                old_avatar = user.avatar_url
                user.avatar_url = payload.photo_url
                changes.append(f"avatar updated: {bool(old_avatar)} -> True")
                updated = True

            # Обновляем Telegram данные
            try:
                current_tg_data = json.loads(user.telegram_data) if user.telegram_data else {}
            except (json.JSONDecodeError, TypeError):
                current_tg_data = {}

            # Обновляем Telegram метаданные
            if payload.language_code and current_tg_data.get("language_code") != payload.language_code:
                current_tg_data["language_code"] = payload.language_code
                changes.append(f"language_code -> {payload.language_code}")
                updated = True

            if payload.is_premium is not None and current_tg_data.get("is_premium") != payload.is_premium:
                current_tg_data["is_premium"] = payload.is_premium
                changes.append(f"premium_status -> {payload.is_premium}")
                updated = True

            # Добавляем метку последнего обновления
            current_tg_data["last_updated"] = datetime.utcnow().isoformat()
            user.telegram_data = json.dumps(current_tg_data)

            # Всегда обновляем время последней активности
            user.last_active = datetime.utcnow()
            updated = True

            if updated:
                session.add(user)
                session.commit()
                session.refresh(user)

                if changes:
                    logger.info(f"✅ Обновлен пользователь: id={user.id}, изменения: {', '.join(changes)}")
                else:
                    logger.info(f"✅ Обновлена активность пользователя: id={user.id}")

        return user


@router.get('/user/{tg_id}', response_model=UserOut)
def get_user(tg_id: int):
    """Получает пользователя по Telegram ID"""

    if not tg_id or tg_id < 1:
        raise HTTPException(status_code=400, detail="Некорректный Telegram ID")

    logger.info(f"Запрос пользователя: tg_id={tg_id}")

    with get_session() as session:
        stmt = select(User).where(User.tg_id == tg_id)
        user = session.exec(stmt).first()

        if not user:
            logger.warning(f"Пользователь не найден: tg_id={tg_id}")
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        # Обновляем время последней активности
        try:
            user.last_active = datetime.utcnow()
            session.add(user)
            session.commit()
            session.refresh(user)
        except Exception as e:
            logger.warning(f"Не удалось обновить время активности: {e}")

        return user


@router.get('/user/{tg_id}/profile')
def get_user_profile(tg_id: int):
    """Получает расширенный профиль пользователя с Telegram данными"""

    if not tg_id or tg_id < 1:
        raise HTTPException(status_code=400, detail="Некорректный Telegram ID")

    logger.info(f"Запрос профиля пользователя: tg_id={tg_id}")

    with get_session() as session:
        stmt = select(User).where(User.tg_id == tg_id)
        user = session.exec(stmt).first()

        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        # Парсим Telegram данные
        try:
            telegram_data = json.loads(user.telegram_data) if user.telegram_data else {}
        except (json.JSONDecodeError, TypeError):
            telegram_data = {}

        # Подсчитываем статистику пользователя
        profile_data = {
            "id": user.id,
            "tg_id": user.tg_id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.full_name(),
            "city": user.city,
            "avatar_url": user.avatar_url,
            "balance": user.balance,
            "is_verified": user.is_verified,
            "registered_at": user.registered_at,
            "last_active": user.last_active,

            # Telegram данные
            "telegram": {
                "language_code": telegram_data.get("language_code", "ru"),
                "is_premium": telegram_data.get("is_premium", False),
                "first_seen": telegram_data.get("first_seen"),
                "last_updated": telegram_data.get("last_updated"),
                "platform": telegram_data.get("platform", "telegram_webapp")
            },

            # Статистика (заглушки пока)
            "stats": {
                "orders_count": 0,
                "total_spent": 0.0,
                "reviews_count": 0,
                "favorite_stores_count": 0
            }
        }

        return profile_data


@router.put('/user/{tg_id}/balance')
def update_user_balance(tg_id: int, amount: float, description: str = "Пополнение баланса"):
    """Обновляет баланс пользователя (только для админов)"""

    if not tg_id or tg_id < 1:
        raise HTTPException(status_code=400, detail="Некорректный Telegram ID")

    if amount == 0:
        raise HTTPException(status_code=400, detail="Сумма не может быть нулевой")

    logger.info(f"Изменение баланса пользователя: tg_id={tg_id}, amount={amount}")

    with get_session() as session:
        stmt = select(User).where(User.tg_id == tg_id)
        user = session.exec(stmt).first()

        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        old_balance = user.balance
        user.balance = max(0, user.balance + amount)  # Баланс не может быть отрицательным
        user.last_active = datetime.utcnow()

        # Обновляем Telegram данные с записью об изменении баланса
        try:
            telegram_data = json.loads(user.telegram_data) if user.telegram_data else {}
        except (json.JSONDecodeError, TypeError):
            telegram_data = {}

        # Добавляем запись о последнем изменении баланса
        telegram_data["last_balance_change"] = {
            "amount": amount,
            "old_balance": old_balance,
            "new_balance": user.balance,
            "description": description,
            "timestamp": datetime.utcnow().isoformat()
        }

        user.telegram_data = json.dumps(telegram_data)

        session.add(user)
        session.commit()
        session.refresh(user)

        logger.info(f"✅ Обновлен баланс пользователя: id={user.id}, {old_balance} -> {user.balance}")

        return {
            "success": True,
            "old_balance": old_balance,
            "new_balance": user.balance,
            "change": amount,
            "description": description
        }


@router.get('/cities')
def get_cities():
    """Возвращает список доступных городов"""
    cities = [
        'Алматы', 'Воронеж', 'Екатеринбург', 'Казань', 'Краснодар', 'Красноярск',
        'Минск', 'Москва', 'Нижний Новгород', 'Новосибирск', 'Омск', 'Пермь',
        'Ростов-на-Дону', 'Самара', 'Санкт-Петербург', 'Уфа', 'Челябинск', 'Волгоград',
        'Тюмень', 'Барнаул', 'Иркутск', 'Ульяновск', 'Владивосток', 'Ярославль',
        'Хабаровск', 'Оренбург', 'Новокузнецк', 'Рязань', 'Тула', 'Пенза'
    ]
    return {'cities': sorted(cities)}


@router.get('/users/stats')
def get_users_stats():
    """Получает общую статистику пользователей (для админов)"""

    with get_session() as session:
        total_users = len(session.exec(select(User)).all())
        active_users = len(session.exec(select(User).where(User.is_active == True)).all())
        verified_users = len(session.exec(select(User).where(User.is_verified == True)).all())

        # Пользователи за последние 24 часа
        yesterday = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        recent_users = len(session.exec(select(User).where(User.last_active >= yesterday)).all())

        return {
            "total_users": total_users,
            "active_users": active_users,
            "verified_users": verified_users,
            "recent_active_users": recent_users,
            "timestamp": datetime.utcnow().isoformat()
        }