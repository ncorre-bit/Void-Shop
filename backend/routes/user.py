# backend/routes/user.py (обновленный)
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from backend.db import get_session
from backend.models import User
from datetime import datetime
import logging

router = APIRouter(prefix='/api')
logger = logging.getLogger(__name__)


class UserIn(BaseModel):
    tg_id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    city: str | None = None


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


@router.post('/user', response_model=UserOut)
def create_or_update_user(payload: UserIn):
    """Создает нового пользователя или обновляет существующего по tg_id"""
    logger.info(f"Создание/обновление пользователя: tg_id={payload.tg_id}, username={payload.username}")

    with get_session() as session:
        # Ищем существующего пользователя по tg_id
        stmt = select(User).where(User.tg_id == payload.tg_id)
        user = session.exec(stmt).first()

        if not user:
            # Создаем нового пользователя
            user = User(
                tg_id=payload.tg_id,
                username=payload.username,
                first_name=payload.first_name,
                last_name=payload.last_name,
                city=payload.city or 'Москва',
                registered_at=datetime.utcnow(),
                last_active=datetime.utcnow()
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            logger.info(f"Создан новый пользователь: id={user.id}, tg_id={user.tg_id}")
        else:
            # Обновляем существующего пользователя
            updated = False

            if payload.username and payload.username != user.username:
                user.username = payload.username
                updated = True

            if payload.first_name and payload.first_name != user.first_name:
                user.first_name = payload.first_name
                updated = True

            if payload.last_name and payload.last_name != user.last_name:
                user.last_name = payload.last_name
                updated = True

            if payload.city and payload.city != user.city:
                user.city = payload.city
                updated = True

            # Всегда обновляем время последней активности
            user.last_active = datetime.utcnow()
            updated = True

            if updated:
                session.add(user)
                session.commit()
                session.refresh(user)
                logger.info(f"Обновлен пользователь: id={user.id}, tg_id={user.tg_id}")

        return user


@router.get('/user/{tg_id}', response_model=UserOut)
def get_user(tg_id: int):
    """Получает пользователя по Telegram ID"""
    logger.info(f"Запрос пользователя: tg_id={tg_id}")

    with get_session() as session:
        stmt = select(User).where(User.tg_id == tg_id)
        user = session.exec(stmt).first()

        if not user:
            logger.warning(f"Пользователь не найден: tg_id={tg_id}")
            raise HTTPException(status_code=404, detail='Пользователь не найден')

        # Обновляем время последней активности
        user.last_active = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)

        return user


@router.get('/cities')
def get_cities():
    """Возвращает список доступных городов"""
    cities = [
        'Москва', 'Санкт-Петербург', 'Новосибирск',
        'Екатеринбург', 'Казань', 'Нижний Новгород',
        'Челябинск', 'Красноярск', 'Самара', 'Уфа',
        'Ростов-на-Дону', 'Омск', 'Краснодар', 'Воронеж',
        'Пермь', 'Волгоград', 'Минск', 'Алматы'
    ]
    return {'cities': cities}