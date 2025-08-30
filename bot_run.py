# bot_run.py — более робастная версия с авто-перезапуском
import asyncio
import logging
import os
import json
from datetime import datetime
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

async def handle_webapp_data(message: types.Message):
    """Обработчик данных от WebApp"""
    if not message.web_app_data:
        return

    try:
        data = json.loads(message.web_app_data.data)

        if data.get('type') == 'payment_confirmation':
            await handle_payment_confirmation(message, data['data'])
        else:
            await message.answer(f"Получены данные от WebApp: {data}")

    except Exception as e:
        logger.error("Ошибка обработки WebApp данных: %s", e)
        await message.answer("Ошибка обработки данных")

async def handle_payment_confirmation(message: types.Message, payment_data):
    """Обработчик заявки на пополнение баланса"""
    order_id = payment_data.get('orderId', 'Неизвестно')
    user_name = payment_data.get('userName', 'Пользователь')
    username = payment_data.get('username', '')
    amount = payment_data.get('finalAmount', 0)
    method = payment_data.get('method', 'Карта')
    user_id = payment_data.get('userId', 0)

    # Форматируем сообщение для админа
    admin_message = f"""
💰 <b>НОВАЯ ЗАЯВКА НА ПОПОЛНЕНИЕ</b>

📋 <b>Номер заявки:</b> <code>{order_id}</code>
👤 <b>Пользователь:</b> {user_name}
🔗 <b>Username:</b> @{username} (ID: {user_id})
💳 <b>Сумма:</b> ₽{amount:,}
🏦 <b>Способ:</b> {method}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

❓ <b>Подтвердить зачисление?</b>
"""

    # Кнопки для админа
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text="✅ Подтвердить",
                callback_data=f"payment_approve_{order_id}_{user_id}_{amount}"
            ),
            InlineKeyboardButton(
                text="❌ Отклонить",
                callback_data=f"payment_reject_{order_id}_{user_id}"
            )
        ]
    ])

    # Отправляем всем админам
    for admin_id in ADMINS:
        try:
            await bot.send_message(
                int(admin_id),
                admin_message,
                reply_markup=kb,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось отправить админу %s: %s", admin_id, e)

async def handle_admin_callback(callback_query: types.CallbackQuery):
    """Обработчик кнопок админа"""
    data = callback_query.data

    if data.startswith("payment_approve_"):
        parts = data.split("_")
        order_id = parts[2]
        user_id = int(parts[3])
        amount = float(parts[4])

        # TODO: Здесь обновляем баланс пользователя в базе данных
        # Пока что просто уведомляем

        await callback_query.message.edit_text(
            f"✅ <b>ПЛАТЕЖ ПОДТВЕРЖДЕН</b>\n\n"
            f"📋 Заявка: <code>{order_id}</code>\n"
            f"💰 Сумма: ₽{amount:,} зачислена\n"
            f"👤 Пользователь ID: {user_id}",
            parse_mode="HTML"
        )

        # Отправляем уведомление пользователю (если нужно)
        try:
            await bot.send_message(
                user_id,
                f"✅ <b>Баланс пополнен!</b>\n\n"
                f"💰 Зачислено: ₽{amount:,}\n"
                f"📋 Заявка: {order_id}",
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось уведомить пользователя %s: %s", user_id, e)

    elif data.startswith("payment_reject_"):
        parts = data.split("_")
        order_id = parts[2]
        user_id = int(parts[3])

        await callback_query.message.edit_text(
            f"❌ <b>ПЛАТЕЖ ОТКЛОНЕН</b>\n\n"
            f"📋 Заявка: <code>{order_id}</code>\n"
            f"👤 Пользователь ID: {user_id}",
            parse_mode="HTML"
        )

        # Уведомляем пользователя
        try:
            await bot.send_message(
                user_id,
                f"❌ <b>Заявка отклонена</b>\n\n"
                f"📋 Заявка: {order_id}\n"
                f"💬 Обратитесь в поддержку для уточнения",
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось уведомить пользователя %s: %s", user_id, e)

    await callback_query.answer()

# Регистрация обработчиков
router.message.register(cmd_start, Command(commands=["start"]))
router.message.register(cmd_ping, Command(commands=["ping"]))
router.message.register(handle_webapp_data, lambda msg: msg.web_app_data is not None)
router.callback_query.register(handle_admin_callback, lambda cb: cb.data.startswith(("payment_approve_", "payment_reject_")))

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