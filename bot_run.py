# bot_run.py — более робастная версия с авто-перезапуском
import asyncio
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN")
BASE_URL = os.getenv("BASE_URL", "http://localhost:5175")
ADMINS = [s.strip() for s in os.getenv("ADMINS", "").split(",") if s.strip()]

if not BOT_TOKEN:
    raise SystemExit("BOT_TOKEN не найден в .env — добавь токен и перезапусти")

from aiogram import Bot, Dispatcher, Router, types
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.filters import Command

bot = Bot(token=BOT_TOKEN, parse_mode="HTML")
dp = Dispatcher()
router = Router()

# handlers
async def cmd_start(message: types.Message):
    webapp_url = BASE_URL.rstrip("/")
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Открыть Void Shop", web_app=WebAppInfo(url=webapp_url))]
    ])
    await message.answer("Привет! Нажми кнопку, чтобы открыть Void Shop.", reply_markup=kb)

async def cmd_ping(message: types.Message):
    await message.answer("pong")

router.message.register(cmd_start, Command(commands=["start"]))
router.message.register(cmd_ping, Command(commands=["ping"]))
dp.include_router(router)

async def notify_admins_start():
    for adm in ADMINS:
        try:
            await bot.send_message(int(adm), f"Void Shop bot запущен. WebApp: {BASE_URL}")
        except Exception:
            logger.exception("Не удалось уведомить админа %s", adm)

async def run_polling_with_retries():
    """
    Запуск polling с авто-перезапуском при ошибках.
    Экспоненциальный backoff: 1,2,4,8,.. до 60 сек.
    """
    backoff = 1.0
    max_backoff = 60.0
    while True:
        try:
            logger.info("Запуск polling...")
            await dp.start_polling(bot)
            # Если start_polling вернулся без исключения, перезапустим через небольшую паузу
            logger.info("dp.start_polling() завершился без исключения — перезапуск через 1s")
            await asyncio.sleep(1.0)
            backoff = 1.0
        except asyncio.CancelledError:
            logger.info("Получен CancelledError — выходим из цикла polling")
            raise
        except Exception as e:
            logger.exception("Ошибка в polling: %s", e)
            logger.warning("Спим %.1f сек и пробуем снова...", backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, max_backoff)

async def main():
    # уведомление админов при старте (не критично)
    try:
        await notify_admins_start()
    except Exception:
        logger.exception("Ошибка при уведомлении админов на старте")

    try:
        await run_polling_with_retries()
    finally:
        # корректно закрываем сессию
        try:
            await bot.session.close()
        except Exception:
            logger.exception("Ошибка при закрытии сессии бота")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Завершение работы бота (KeyboardInterrupt/SystemExit)")
