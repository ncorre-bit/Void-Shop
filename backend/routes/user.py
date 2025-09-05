# backend/routes/user.py - ИСПРАВЛЕНО: правильная валидация
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
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
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    city: str | None = None
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
    avatar_url: str | None


@router.post('/user', response_model=UserOut)
def create_or_update_user(payload: UserIn):
    """ИСПРАВЛЕНО: Создает нового пользователя или обновляет существующего"""

    # ИСПРАВЛЕНА валидация
    if not payload.tg_id or payload.tg_id < 1:
        raise HTTPException(status_code=400, detail="Некорректный Telegram ID")

    logger.info(f"Создание/обновление пользователя: tg_id={payload.tg_id}")

    with get_session() as session:
        # Ищем существующего пользователя
        stmt = select(User).where(User.tg_id == payload.tg_id)
        user = session.exec(stmt).first()

        if not user:
            # СОЗДАЕМ нового пользователя
            logger.info(f"Создаем нового пользователя: tg_id={payload.tg_id}")

            # ИСПРАВЛЕНО: правильное создание telegram_data
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
                avatar_url=payload.photo_url,
                telegram_data=json.dumps(telegram_data),
                registered_at=datetime.utcnow(),
                last_active=datetime.utcnow(),
                balance=0.0,
                is_active=True,
                is_verified=False
            )

            session.add(user)
            session.commit()
            session.refresh(user)

            logger.info(f"✅ Создан новый пользователь: id={user.id}, tg_id={user.tg_id}")

        else:
            # ОБНОВЛЯЕМ существующего пользователя
            logger.info(f"Обновляем пользователя: id={user.id}, tg_id={user.tg_id}")

            updated = False

            # Обновляем основные поля если изменились
            if payload.username and payload.username.strip() != user.username:
                user.username = payload.username.strip()
                updated = True

            if payload.first_name and payload.first_name.strip() != user.first_name:
                user.first_name = payload.first_name.strip()
                updated = True

            if payload.last_name and payload.last_name.strip() != user.last_name:
                user.last_name = payload.last_name.strip()
                updated = True

            if payload.city and payload.city.strip() != user.city:
                user.city = payload.city.strip()
                updated = True

            # Обновляем аватар
            if payload.photo_url and payload.photo_url != user.avatar_url:
                user.avatar_url = payload.photo_url
                updated = True

            # Обновляем Telegram данные
            try:
                current_tg_data = json.loads(user.telegram_data) if user.telegram_data else {}
            except (json.JSONDecodeError, TypeError):
                current_tg_data = {}

            if payload.language_code and current_tg_data.get("language_code") != payload.language_code:
                current_tg_data["language_code"] = payload.language_code
                updated = True

            if payload.is_premium is not None and current_tg_data.get("is_premium") != payload.is_premium:
                current_tg_data["is_premium"] = payload.is_premium
                updated = True

            current_tg_data["last_updated"] = datetime.utcnow().isoformat()
            user.telegram_data = json.dumps(current_tg_data)

            # Всегда обновляем время активности
            user.last_active = datetime.utcnow()

            if updated:
                session.add(user)
                session.commit()
                session.refresh(user)
                logger.info(f"✅ Пользователь обновлен: id={user.id}")

        return user


@router.get('/user/{tg_id}', response_model=UserOut)
def get_user(tg_id: int):
    """Получает пользователя по Telegram ID"""

    if not tg_id or tg_id < 1:
        raise HTTPException(status_code=400, detail="Некорректный Telegram ID")

    with get_session() as session:
        stmt = select(User).where(User.tg_id == tg_id)
        user = session.exec(stmt).first()

        if not user:
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