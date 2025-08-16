# backend/app.py — исправленные CORS настройки
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from backend.db import create_db_and_tables
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend")

app = FastAPI(title="VoidShop API (dev)")

# ИСПРАВЛЕННЫЕ CORS НАСТРОЙКИ
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5175").strip()
origins = [o.strip() for o in FRONTEND_ORIGINS.split(",") if o.strip()]

# Добавляем localhost для локальной разработки
if "http://localhost:5175" not in origins:
    origins.append("http://localhost:5175")

DEV_ALLOW_ALL = os.getenv("DEV_ALLOW_ALL_ORIGINS", "").strip() == "1"
if DEV_ALLOW_ALL:
    logger.warning("DEV_ALLOW_ALL_ORIGINS=1 — разрешаю все origin'ы (не для продакшена).")
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

# --- подключаем роутеры ---
try:
    from backend.routes.captcha import router as captcha_router
    from backend.routes.user import router as user_router

    app.include_router(captcha_router)
    app.include_router(user_router)
    logger.info("Роутеры captcha и user успешно подключены.")
except Exception as e:
    logger.exception("Ошибка при подключении роутеров: %s", e)

@app.on_event("startup")
def on_startup():
    try:
        create_db_and_tables()
        logger.info("DB: create_db_and_tables() выполнено.")
    except Exception:
        logger.exception("Ошибка при create_db_and_tables()")

@app.get("/health")
def health():
    return {"ok": True}