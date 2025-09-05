# bot_run.py - ИСПРАВЛЕНО: правильная обработка WebApp данных и уведомлений
import asyncio
import logging
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import aiohttp

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = os.getenv("BOT_TOKEN")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
BACKEND_API = os.getenv("BACKEND_API", "http://localhost:8000")
ADMINS = [s.strip() for s in os.getenv("ADMINS", "").split(",") if s.strip()]

if not BOT_TOKEN:
    raise SystemExit("❌ BOT_TOKEN не найден в .env")

from aiogram import Bot, Dispatcher, Router, types, F
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.filters import Command

bot = Bot(token=BOT_TOKEN, parse_mode="HTML")
dp = Dispatcher()
router = Router()


# === ОБРАБОТЧИКИ КОМАНД ===

async def cmd_start(message: types.Message):
    """Команда /start - показывает кнопку запуска WebApp"""
    webapp_url = BASE_URL.rstrip("/")

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🚀 Открыть Void Shop",
            web_app=WebAppInfo(url=webapp_url)
        )],
        [InlineKeyboardButton(
            text="ℹ️ Помощь",
            callback_data="help"
        )]
    ])

    welcome_text = f"""
🎉 <b>Добро пожаловать в Void Shop!</b>

👋 Привет, {message.from_user.first_name}!

<b>Void Shop</b> — это каталог товаров в Telegram.

🛍️ <b>Возможности:</b>
• Просмотр товаров по категориям
• Поиск нужных товаров  
• Пополнение баланса через карты
• Покупки с баланса

💳 <b>Пополнение баланса:</b>
• Банковские карты (без комиссии)
• Обработка 5-15 минут

🔒 Все платежи проверяются администратором

Нажмите кнопку ниже! 👇
"""

    await message.answer(welcome_text, reply_markup=kb)


async def cmd_balance(message: types.Message):
    """Команда /balance - показать баланс пользователя"""
    try:
        user_id = message.from_user.id

        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_API}/api/user/{user_id}") as resp:
                if resp.status == 200:
                    user_data = await resp.json()
                    balance = user_data.get('balance', 0)

                    await message.answer(f"""
💰 <b>Ваш баланс</b>

💳 <b>Текущий баланс:</b> ₽{balance:,.2f}
👤 <b>Пользователь:</b> {user_data.get('first_name', 'Неизвестно')}

💡 <i>Для пополнения откройте приложение</i>
""")
                else:
                    await message.answer("❌ Пользователь не найден. Откройте приложение для регистрации.")
    except Exception as e:
        logger.error(f"Ошибка получения баланса: {e}")
        await message.answer("❌ Ошибка получения данных. Попробуйте позже.")


# === ОБРАБОТЧИКИ CALLBACK ===

async def callback_help(callback: types.CallbackQuery):
    """Показать справку"""
    help_text = """
❓ <b>Справка по Void Shop</b>

🛍️ <b>Покупки:</b>
1. Откройте приложение
2. Найдите товар
3. Нажмите "Купить" 
4. Товар списывается с баланса

💳 <b>Пополнение баланса:</b>
1. Откройте Профиль
2. Нажмите "Пополнить баланс"
3. Выберите сумму и способ
4. Переведите деньги на реквизиты
5. Нажмите "Я оплатил"

⏱️ <b>Обработка:</b> 5-15 минут

🆘 <b>Поддержка:</b> @support_void_shop
"""

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Открыть магазин", web_app=WebAppInfo(url=BASE_URL))],
        [InlineKeyboardButton(text="◀️ Назад", callback_data="start_menu")]
    ])

    await callback.message.edit_text(help_text, reply_markup=kb)
    await callback.answer()


async def callback_start_menu(callback: types.CallbackQuery):
    """Вернуться в главное меню"""
    await callback.message.delete()
    await cmd_start(callback.message)
    await callback.answer()


# === ИСПРАВЛЕНО: ОБРАБОТЧИК WEBAPP DATA ===

async def handle_webapp_data(message: types.Message):
    """ИСПРАВЛЕНО: обработчик данных от WebApp"""
    if not message.web_app_data:
        return

    try:
        # Парсим JSON данные из WebApp
        data = json.loads(message.web_app_data.data)
        logger.info(f"🔄 Получены данные от WebApp: {data.get('type', 'unknown')}")

        # Обрабатываем разные типы данных
        if data.get('type') == 'payment_confirmation':
            await handle_payment_confirmation(message, data.get('data', {}))
        elif data.get('type') == 'new_order':
            await handle_new_order(message, data.get('data', {}))
        else:
            logger.warning(f"⚠️ Неизвестный тип данных: {data.get('type')}")

    except json.JSONDecodeError as e:
        logger.error(f"❌ Ошибка парсинга JSON от WebApp: {e}")
        await message.answer("❌ Ошибка обработки данных")
    except Exception as e:
        logger.error(f"❌ Ошибка обработки WebApp данных: {e}")


async def handle_payment_confirmation(message: types.Message, payment_data):
    """ИСПРАВЛЕНО: обработчик заявки на пополнение баланса"""
    try:
        order_id = payment_data.get('orderId', 'UNKNOWN')
        user_name = payment_data.get('userName', 'Пользователь')
        username = payment_data.get('username', '')
        amount = float(payment_data.get('amount', 0))
        method = payment_data.get('method', 'Банковская карта')
        user_id = int(payment_data.get('userId', 0))
        created_at = payment_data.get('createdAt', datetime.now().isoformat())
        paid_at = payment_data.get('paidAt', datetime.now().isoformat())

        # Форматируем дату
        try:
            created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            paid_date = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
            formatted_created = created_date.strftime('%d.%m.%Y %H:%M')
            formatted_paid = paid_date.strftime('%d.%m.%Y %H:%M')
        except:
            formatted_created = datetime.now().strftime('%d.%m.%Y %H:%M')
            formatted_paid = datetime.now().strftime('%d.%m.%Y %H:%M')

        # ИСПРАВЛЕНО: сообщение для админов с реквизитами
        admin_message = f"""
💰 <b>НОВАЯ ЗАЯВКА НА ПОПОЛНЕНИЕ</b>

📋 <b>Номер:</b> <code>{order_id}</code>
👤 <b>Пользователь:</b> {user_name}
🏷️ <b>Username:</b> @{username if username else 'не указан'}
🆔 <b>Telegram ID:</b> <code>{user_id}</code>
💳 <b>Сумма:</b> ₽{amount:,.2f}
🏦 <b>Способ:</b> {method}
📅 <b>Создана:</b> {formatted_created}
💸 <b>Оплачена:</b> {formatted_paid}

⚡ <b>Статус:</b> Ожидает подтверждения

💳 <b>Реквизиты для проверки:</b>
• Карта: <code>5536 9141 2345 6789</code>
• Получатель: VOID SHOP
• Банк: Сбер Банк

🔍 <b>Проверьте поступление платежа на сумму ₽{amount:,.2f}</b>
"""

        # Кнопки для админов
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="✅ Подтвердить платеж",
                callback_data=f"approve_{order_id}_{user_id}_{amount}"
            )],
            [InlineKeyboardButton(
                text="❌ Отклонить платеж",
                callback_data=f"reject_{order_id}_{user_id}"
            )]
        ])

        # Отправляем всем админам
        success_count = 0
        for admin_id in ADMINS:
            try:
                await bot.send_message(int(admin_id), admin_message, reply_markup=kb)
                success_count += 1
                logger.info(f"✅ Уведомление отправлено админу {admin_id}")
            except Exception as e:
                logger.error(f"❌ Не удалось отправить админу {admin_id}: {e}")

        # Подтверждение пользователю
        await message.answer(f"""
📝 <b>Заявка создана</b>

📋 <b>Номер:</b> <code>{order_id}</code>
💰 <b>Сумма:</b> ₽{amount:,.2f}
📅 <b>Время:</b> {formatted_paid}

⏳ <b>Статус:</b> На проверке у администратора

💡 Обычно проверка занимает 5-15 минут
🔔 Вы получите уведомление о результате

<i>Заявка отправлена {success_count} администраторам</i>
""")

        logger.info(f"✅ Заявка {order_id} обработана, уведомлено {success_count} админов")

    except Exception as e:
        logger.error(f"❌ Ошибка обработки заявки на пополнение: {e}")
        await message.answer("❌ Ошибка обработки заявки. Обратитесь в поддержку.")


async def handle_new_order(message: types.Message, order_data):
    """Обработчик нового заказа"""
    try:
        order_id = order_data.get('orderId', 'UNKNOWN')
        product_title = order_data.get('productTitle', 'Товар')
        amount = float(order_data.get('amount', 0))
        store_name = order_data.get('storeName', 'Магазин')
        buyer_name = order_data.get('buyer', 'Покупатель')
        buyer_username = order_data.get('buyerUsername', '')
        buyer_tg_id = order_data.get('buyerTgId', 0)

        admin_message = f"""
🛒 <b>НОВЫЙ ЗАКАЗ</b>

📋 <b>Номер:</b> <code>{order_id}</code>
📦 <b>Товар:</b> {product_title}
🏪 <b>Магазин:</b> {store_name}
💰 <b>Сумма:</b> ₽{amount:,.2f}

👤 <b>Покупатель:</b> {buyer_name}
🏷️ <b>Username:</b> @{buyer_username if buyer_username else 'не указан'}
🆔 <b>Telegram ID:</b> <code>{buyer_tg_id}</code>

📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}
"""

        # Отправляем админам
        for admin_id in ADMINS:
            try:
                await bot.send_message(int(admin_id), admin_message)
            except Exception as e:
                logger.error(f"Не удалось отправить уведомление о заказе админу {admin_id}: {e}")

    except Exception as e:
        logger.error(f"Ошибка обработки нового заказа: {e}")


# === АДМИН ОБРАБОТЧИКИ ===

async def handle_admin_callback(callback_query: types.CallbackQuery):
    """ИСПРАВЛЕНО: обработчик админских кнопок"""
    data = callback_query.data
    admin_id = callback_query.from_user.id

    if str(admin_id) not in ADMINS:
        await callback_query.answer("❌ У вас нет прав администратора", show_alert=True)
        return

    try:
        if data.startswith("approve_"):
            await handle_payment_approval(callback_query)
        elif data.startswith("reject_"):
            await handle_payment_rejection(callback_query)
    except Exception as e:
        logger.error(f"Ошибка админского callback: {e}")
        await callback_query.answer("❌ Произошла ошибка", show_alert=True)


async def handle_payment_approval(callback_query: types.CallbackQuery):
    """ИСПРАВЛЕНО: подтверждение платежа через API"""
    parts = callback_query.data.split("_")
    order_id = parts[1]
    user_id = int(parts[2])
    amount = float(parts[3])

    try:
        # ИСПРАВЛЕНО: используем API для обновления баланса
        async with aiohttp.ClientSession() as session:
            # Сначала обновляем баланс пользователя
            balance_data = {
                "amount": amount,
                "description": f"Пополнение баланса (заявка {order_id})"
            }

            async with session.put(f"{BACKEND_API}/api/user/{user_id}/balance", json=balance_data) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    new_balance = result.get('new_balance', 0)

                    # Обновляем сообщение админа
                    await callback_query.message.edit_text(f"""
✅ <b>ПЛАТЕЖ ПОДТВЕРЖДЕН</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
💰 <b>Сумма:</b> ₽{amount:,.2f}
👤 <b>Пользователь:</b> {user_id}
👨‍💼 <b>Подтвердил:</b> {callback_query.from_user.first_name}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

💳 <b>Новый баланс пользователя:</b> ₽{new_balance:,.2f}
""")

                    # Уведомляем пользователя
                    try:
                        await bot.send_message(user_id, f"""
✅ <b>Баланс пополнен!</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
💰 <b>Зачислено:</b> ₽{amount:,.2f}
💳 <b>Новый баланс:</b> ₽{new_balance:,.2f}

🎉 Средства зачислены! Можете совершать покупки.

🚀 Откройте приложение для просмотра товаров.
""")
                    except Exception as e:
                        logger.error(f"Не удалось уведомить пользователя {user_id}: {e}")

                    await callback_query.answer("✅ Платеж подтвержден")
                    logger.info(f"✅ Подтвержден платеж {order_id} на ₽{amount} для пользователя {user_id}")

                else:
                    error_text = await resp.text()
                    logger.error(f"Ошибка API при подтверждении: {resp.status} - {error_text}")
                    await callback_query.answer("❌ Ошибка обновления баланса", show_alert=True)

    except Exception as e:
        logger.error(f"Ошибка подтверждения платежа: {e}")
        await callback_query.answer("❌ Произошла ошибка", show_alert=True)


async def handle_payment_rejection(callback_query: types.CallbackQuery):
    """Отклонение платежа"""
    parts = callback_query.data.split("_")
    order_id = parts[1]
    user_id = int(parts[2])

    try:
        # Обновляем сообщение админа
        await callback_query.message.edit_text(f"""
❌ <b>ПЛАТЕЖ ОТКЛОНЕН</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
👤 <b>Пользователь:</b> {user_id}
👨‍💼 <b>Отклонил:</b> {callback_query.from_user.first_name}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

💬 <b>Причина:</b> Платеж не поступил или неверная сумма
""")

        # Уведомляем пользователя
        try:
            await bot.send_message(user_id, f"""
❌ <b>Заявка отклонена</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

🔍 <b>Возможные причины:</b>
• Платеж не поступил на реквизиты
• Неверная сумма перевода  
• Технические неполадки

💬 <b>Что делать:</b>
• Проверьте правильность реквизитов
• Обратитесь в поддержку: @support_void_shop

Можете создать новую заявку в приложении.
""")
        except Exception as e:
            logger.error(f"Не удалось уведомить пользователя {user_id}: {e}")

        await callback_query.answer("❌ Платеж отклонен")
        logger.info(f"❌ Отклонен платеж {order_id} для пользователя {user_id}")

    except Exception as e:
        logger.error(f"Ошибка отклонения платежа: {e}")
        await callback_query.answer("❌ Произошла ошибка", show_alert=True)


# === РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ ===

router.message.register(cmd_start, Command(commands=["start"]))
router.message.register(cmd_balance, Command(commands=["balance", "bal"]))
router.message.register(handle_webapp_data, F.web_app_data)  # ИСПРАВЛЕНО: правильная регистрация

router.callback_query.register(callback_help, F.data == "help")
router.callback_query.register(callback_start_menu, F.data == "start_menu")
router.callback_query.register(
    handle_admin_callback,
    F.data.startswith(("approve_", "reject_"))
)

dp.include_router(router)


# === ЗАПУСК ===

async def notify_admins_start():
    """Уведомить админов о запуске"""
    message = f"""
🚀 <b>Void Shop Bot запущен!</b>

📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}
🌐 <b>WebApp:</b> {BASE_URL}
🔧 <b>API:</b> {BACKEND_API}
👥 <b>Админов:</b> {len(ADMINS)}

✅ Готов к приему заявок на пополнение
🔔 WebApp данные будут обрабатываться автоматически

<b>Функции:</b>
• Обработка заявок на пополнение баланса
• Подтверждение/отклонение платежей
• Уведомления о новых заказах
"""

    success = 0
    for admin_id in ADMINS:
        try:
            await bot.send_message(int(admin_id), message)
            success += 1
        except Exception as e:
            logger.error(f"Не удалось уведомить админа {admin_id}: {e}")

    logger.info(f"✅ Уведомлено {success}/{len(ADMINS)} админов о запуске")


async def main():
    """Основная функция"""
    logger.info("🚀 Запуск Void Shop Bot...")

    try:
        await notify_admins_start()
    except Exception as e:
        logger.exception(f"Ошибка уведомления: {e}")

    try:
        logger.info("🔄 Запуск polling...")
        await dp.start_polling(bot)
    except KeyboardInterrupt:
        logger.info("⏹️ Остановка по Ctrl+C")
    except Exception as e:
        logger.exception(f"❌ Ошибка polling: {e}")
    finally:
        try:
            await bot.session.close()
        except:
            pass
        logger.info("👋 Завершение работы")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("👋 Завершение работы бота")
    except Exception as e:
        logger.exception(f"💥 Критическая ошибка: {e}")
        exit(1)