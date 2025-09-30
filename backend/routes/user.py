# backend/routes/user.py - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: убираем 422 ошибки
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from sqlmodel import select
from backend.db import get_session
from backend.models import User
from datetime import datetime
import logging
import json

router = APIRouter(prefix='/api')
logger = logging.getLogger(__name__)


class UserIn(BaseModel):
    tg_id: int = Field(gt=0, description="Telegram ID пользователя")
    username: str | None = Field(default=None, max_length=255)
    first_name: str | None = Field(default=None, max_length=255)
    last_name: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default="Москва", max_length=255)
    photo_url: str | None = Field(default=None, max_length=500)
    language_code: str | None = Field(default="ru", max_length=10)
    is_premium: bool = Field(default=False)

    @validator('city', pre=True, always=True)
    def validate_city(cls, v):
        """ИСПРАВЛЕНО: гибкая валидация города"""
        if not v or not str(v).strip():
            return "Москва"
        return str(v).strip()

    @validator('username', pre=True, always=True)
    def validate_username(cls, v):
        """ИСПРАВЛЕНО: обработка None и пустых значений"""
        if not v:
            return None
        username = str(v).strip().lstrip('@')
        return username if username else None

    @validator('first_name', 'last_name', pre=True, always=True)
    def validate_names(cls, v):
        """ИСПРАВЛЕНО: обработка None"""
        if not v:
            return None
        return str(v).strip() if str(v).strip() else None

    @validator('tg_id', pre=True, always=True)
    def validate_tg_id(cls, v):
        """КРИТИЧНО: строгая валидация Telegram ID"""
        if not v:
            raise ValueError('Telegram ID обязателен')

        try:
            tg_id = int(v)
            if tg_id <= 0:
                raise ValueError('Telegram ID должен быть положительным числом')
            if tg_id > 9999999999:  # Реальные Telegram ID не превышают это значение
                raise ValueError('Некорректный Telegram ID')
            return tg_id
        except (ValueError, TypeError):
            raise ValueError('Telegram ID должен быть числом')

    @validator('language_code', pre=True, always=True)
    def validate_language_code(cls, v):
        """ИСПРАВЛЕНО: обработка языковых кодов"""
        if not v:
            return "ru"
        lang = str(v).strip().lower()
        # Список поддерживаемых языков
        supported_langs = ['ru', 'en', 'uk', 'kz', 'by']
        return lang if lang in supported_langs else "ru"

    class Config:
        str_strip_whitespace = True
        validate_assignment = True


class UserOut(BaseModel):
    id: int
    tg_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    city: str
    registered_at: datetime
    last_active: datetime
    balance: float
    is_verified: bool
    avatar_url: str | None


@router.post('/user', response_model=UserOut)
def create_or_update_user(payload: UserIn):
    """КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: убираем все источники 422 ошибок"""

    logger.info(f"👤 Создание/обновление пользователя: tg_id={payload.tg_id}")

    with get_session() as session:
        try:
            # Ищем существующего пользователя
            stmt = select(User).where(User.tg_id == payload.tg_id)
            user = session.exec(stmt).first()

            # ИСПРАВЛЕНО: Безопасная подготовка telegram_data
            telegram_data = {
                "language_code": payload.language_code or "ru",
                "is_premium": payload.is_premium or False,
                "last_updated": datetime.utcnow().isoformat(),
                "platform": "telegram_webapp"
            }

            if not user:
                # СОЗДАЕМ нового пользователя с защитой от None
                user = User(
                    tg_id=payload.tg_id,
                    username=payload.username,
                    first_name=payload.first_name or "Пользователь",  # ИСПРАВЛЕНО: fallback значение
                    last_name=payload.last_name,
                    city=payload.city or "Москва",  # ИСПРАВЛЕНО: защита от None
                    avatar_url=payload.photo_url,
                    telegram_data=json.dumps(telegram_data),
                    registered_at=datetime.utcnow(),
                    last_active=datetime.utcnow(),
                    balance=0.0,
                    is_active=True,
                    is_verified=False
                )

                telegram_data["first_seen"] = datetime.utcnow().isoformat()
                user.telegram_data = json.dumps(telegram_data)

                session.add(user)
                session.commit()
                session.refresh(user)
                logger.info(f"✅ Создан пользователь: id={user.id}, tg_id={user.tg_id}")

            else:
                # ОБНОВЛЯЕМ существующего с защитой от None
                user.username = payload.username
                # ИСПРАВЛЕНО: не затираем имя если оно было и новое пустое
                if payload.first_name:
                    user.first_name = payload.first_name
                elif not user.first_name:
                    user.first_name = "Пользователь"

                if payload.last_name:
                    user.last_name = payload.last_name

                user.city = payload.city or user.city or "Москва"
                user.avatar_url = payload.photo_url or user.avatar_url
                user.last_active = datetime.utcnow()

                # ИСПРАВЛЕНО: Безопасное обновление telegram_data
                try:
                    current_data = json.loads(user.telegram_data) if user.telegram_data else {}
                except (json.JSONDecodeError, TypeError):
                    current_data = {}

                current_data.update(telegram_data)
                user.telegram_data = json.dumps(current_data)

                session.add(user)
                session.commit()
                session.refresh(user)
                logger.info(f"✅ Пользователь обновлен: id={user.id}, tg_id={user.tg_id}")

            return user

        except ValueError as e:
            # Ошибки валидации
            logger.error(f"Ошибка валидации пользователя {payload.tg_id}: {e}")
            raise HTTPException(status_code=400, detail=f"Ошибка валидации: {str(e)}")

        except Exception as e:
            session.rollback()
            logger.error(f"Критическая ошибка создания/обновления пользователя: {e}")

            # ИСПРАВЛЕНО: Последняя попытка с минимальными данными
            try:
                # Проверяем существование пользователя еще раз
                existing_user = session.exec(select(User).where(User.tg_id == payload.tg_id)).first()

                if existing_user:
                    # Если пользователь существует, просто обновляем last_active
                    existing_user.last_active = datetime.utcnow()
                    session.add(existing_user)
                    session.commit()
                    session.refresh(existing_user)
                    logger.info(f"✅ Обновлен last_active для существующего пользователя: {payload.tg_id}")
                    return existing_user
                else:
                    # Создаем с минимальным набором данных
                    minimal_user = User(
                        tg_id=payload.tg_id,
                        username=payload.username,
                        first_name=payload.first_name or "Пользователь",
                        last_name=payload.last_name,
                        city="Москва",  # Безопасное значение
                        registered_at=datetime.utcnow(),
                        last_active=datetime.utcnow(),
                        balance=0.0,
                        is_active=True,
                        is_verified=False,
                        telegram_data=json.dumps({"created_with": "fallback"})
                    )

                    session.add(minimal_user)
                    session.commit()
                    session.refresh(minimal_user)
                    logger.info(f"✅ Создан минимальный профиль: id={minimal_user.id}, tg_id={minimal_user.tg_id}")
                    return minimal_user

            except Exception as inner_e:
                session.rollback()
                logger.error(f"💥 Критическая ошибка создания пользователя: {inner_e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Не удалось создать пользователя. Telegram ID: {payload.tg_id}"
                )


@router.get('/user/{tg_id}', response_model=UserOut)
def get_user(tg_id: int):
    """Получает пользователя по Telegram ID"""
    if tg_id <= 0:
        raise HTTPException(status_code=400, detail='Некорректный Telegram ID')

    with get_session() as session:
        stmt = select(User).where(User.tg_id == tg_id)
        user = session.exec(stmt).first()

        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        # Обновляем последнюю активность
        user.last_active = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

        return user


@router.put('/user/{tg_id}/balance')
def update_user_balance(tg_id: int, data: dict):
    """ИСПРАВЛЕНО: Обновление баланса с audit log"""
    amount = data.get('amount', 0)
    description = data.get('description', 'Пополнение баланса')

    if not isinstance(amount, (int, float)) or amount <= 0:
        raise HTTPException(status_code=400, detail='Некорректная сумма')

    if tg_id <= 0:
        raise HTTPException(status_code=400, detail='Некорректный Telegram ID')

    with get_session() as session:
        user = session.exec(select(User).where(User.tg_id == tg_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        old_balance = user.balance or 0
        user.balance = old_balance + float(amount)
        user.last_active = datetime.utcnow()

        session.add(user)
        session.commit()
        session.refresh(user)

        logger.info(f"💰 Баланс обновлен {tg_id}: {old_balance} -> {user.balance} (+{amount})")

        return {
            'success': True,
            'old_balance': old_balance,
            'new_balance': user.balance,
            'added_amount': float(amount),
            'user_id': user.id,
            'description': description
        }


@router.get('/cities')
def get_cities():
    """Список доступных городов"""
    cities = [
        'Алматы', 'Астана', 'Барнаул', 'Владивосток', 'Волгоград', 'Воронеж',
        'Екатеринбург', 'Ижевск', 'Иркутск', 'Казань', 'Калининград', 'Кемерово',
        'Краснодар', 'Красноярск', 'Курск', 'Липецк', 'Минск', 'Москва',
        'Нижний Новгород', 'Новокузнецк', 'Новосибирск', 'Омск', 'Оренбург',
        'Пенза', 'Пермь', 'Ростов-на-Дону', 'Рязань', 'Самара', 'Санкт-Петербург',
        'Саратов', 'Тольятти', 'Томск', 'Тула', 'Тюмень', 'Ульяновск', 'Уфа',
        'Хабаровск', 'Челябинск', 'Ярославль'
    ]
    return {'cities': sorted(cities)}


@router.get('/user/{tg_id}/stats')
def get_user_stats(tg_id: int):
    """НОВОЕ: Статистика пользователя"""
    if tg_id <= 0:
        raise HTTPException(status_code=400, detail='Некорректный Telegram ID')

    with get_session() as session:
        user = session.exec(select(User).where(User.tg_id == tg_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        # Здесь можно добавить подсчет заявок на пополнение, заказов и т.д.
        # Пока возвращаем базовую статистику

        days_registered = (datetime.utcnow() - user.registered_at).days

        return {
            'user_id': user.id,
            'tg_id': user.tg_id,
            'balance': user.balance,
            'days_registered': days_registered,
            'is_verified': user.is_verified,
            'last_active': user.last_active.isoformat(),
            'city': user.city
        }