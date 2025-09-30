# backend/app.py - ОБНОВЛЕНО: подключаем новые роуты
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from backend.db import create_db_and_tables
import logging

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

app = FastAPI(title="VoidShop API", version="1.0.0")

# CORS настройки
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5175").strip()
origins = [o.strip() for o in FRONTEND_ORIGINS.split(",") if o.strip()]

# Добавляем localhost варианты для разработки
development_origins = ["http://localhost:5175", "http://127.0.0.1:5175"]
for dev_origin in development_origins:
    if dev_origin not in origins:
        origins.append(dev_origin)

DEV_ALLOW_ALL = os.getenv("DEV_ALLOW_ALL_ORIGINS", "").strip() == "1"
if DEV_ALLOW_ALL:
    logger.warning("DEV_ALLOW_ALL_ORIGINS=1 — разрешаю все origin'ы (не для продакшена)")
    cors_origins = ["*"]
    allow_credentials = False
else:
    cors_origins = origins
    allow_credentials = True

logger.info("CORS origins: %s", cors_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Подключаем роутеры
try:
    from backend.routes.captcha import router as captcha_router
    from backend.routes.user import router as user_router
    from backend.routes.store import router as store_router
    from backend.routes.balance import router as balance_router  # НОВЫЙ РОУТЕР

    app.include_router(captcha_router)
    app.include_router(user_router)
    app.include_router(store_router)
    app.include_router(balance_router)  # ПОДКЛЮЧАЕМ

    logger.info("Все роутеры успешно подключены")

except Exception as e:
    logger.exception("Ошибка при подключении роутеров: %s", e)


@app.on_event("startup")
def on_startup():
    try:
        create_db_and_tables()
        logger.info("DB: База данных инициализирована")
    except Exception as e:
        logger.exception("Ошибка инициализации БД: %s", e)


@app.get("/health")
def health():
    """Проверка работоспособности API"""
    return {
        "status": "ok",
        "service": "VoidShop API",
        "version": "1.0.0"
    }


@app.get("/")
def root():
    """Корневой эндпоинт"""
    return {
        "message": "VoidShop API работает",
        "docs": "/docs",
        "health": "/health"
    }