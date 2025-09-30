# bot_run.py - ИСПРАВЛЕНО: поддержка файлов чеков и админ-панель
import asyncio
import logging
import os
import json
from datetime import datetime
from dotenv import load_dotenv
import aiohttp
from pathlib import Path

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = os.getenv("BOT_TOKEN")
BASE_URL = os.getenv("BASE_URL", "http://localhost:5175")
BACKEND_API = os.getenv("BACKEND_API", "http://localhost:8000")
ADMINS = [s.strip() for s in os.getenv("ADMINS", "").split(",") if s.strip()]

if not BOT_TOKEN:
    raise SystemExit("❌ BOT_TOKEN не найден в .env")

from aiogram import Bot, Dispatcher, Router, types, F
from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup, FSInputFile
from aiogram.filters import Command

bot = Bot(token=BOT_TOKEN, parse_mode="HTML")
dp = Dispatcher()
router = Router()


async def cmd_start(message: types.Message):
    """Команда /start"""
    webapp_url = BASE_URL.rstrip("/")

    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="🚀 Открыть Void Shop",
            web_app=WebAppInfo(url=webapp_url)
        )],
        [InlineKeyboardButton(
            text="💰 Баланс",
            callback_data="check_balance"
        )],
        [InlineKeyboardButton(
            text="📞 Поддержка",
            url="https://t.me/void_shop_support"
        )]
    ])

    await message.answer(f"""
🎉 <b>Добро пожаловать в Void Shop!</b>

👋 Привет, {message.from_user.first_name}!

🛍️ <b>Void Shop</b> — каталог товаров в Telegram

💳 <b>Пополнение баланса:</b>
• Банковские карты (без комиссии)  
• Обязательная загрузка чека
• Проверка администратором 5-15 минут

🔒 Все платежи проверяются модераторами

Нажмите кнопку ниже! 👇
""", reply_markup=kb)


async def cmd_balance(message: types.Message):
    """Показать баланс"""
    try:
        user_id = message.from_user.id
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_API}/api/user/{user_id}") as resp:
                if resp.status == 200:
                    user_data = await resp.json()
                    balance = user_data.get('balance', 0)
                    await message.answer(f"""
💰 <b>Ваш баланс</b>

💳 <b>Баланс:</b> ₽{balance:,.2f}
👤 <b>Пользователь:</b> {user_data.get('first_name', 'Неизвестно')}

💡 <i>Для пополнения откройте приложение → Профиль</i>
""")
                else:
                    await message.answer("❌ Пользователь не найден. Откройте приложение для регистрации.")
    except Exception as e:
        logger.error(f"Ошибка получения баланса: {e}")
        await message.answer("❌ Ошибка получения данных")


async def callback_check_balance(callback: types.CallbackQuery):
    """Проверить баланс"""
    await callback.message.delete()
    await cmd_balance(callback.message)
    await callback.answer()


# ИСПРАВЛЕНО: обработчик WebApp данных с поддержкой файлов
async def handle_webapp_data(message: types.Message):
    """Обработка данных из WebApp"""
    if not message.web_app_data:
        return

    try:
        raw_data = message.web_app_data.data
        logger.info(f"🔄 Получены данные от WebApp: {raw_data[:100]}...")

        data = json.loads(raw_data)
        logger.info(f"✅ Данные распарсены: type={data.get('type')}")

        if data.get('type') == 'payment_confirmation':
            await handle_payment_confirmation(message, data.get('data', {}))
        elif data.get('type') == 'new_order':
            await handle_new_order(message, data.get('data', {}))
        else:
            logger.warning(f"⚠️ Неизвестный тип данных: {data.get('type')}")

    except json.JSONDecodeError as e:
        logger.error(f"❌ Ошибка парсинга JSON: {e}")
        await message.answer("❌ Ошибка обработки данных")
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        await message.answer("❌ Произошла ошибка при обработке заявки")


async def handle_payment_confirmation(message: types.Message, payment_data):
    """ИСПРАВЛЕНО: обработчик пополнения с отправкой чека"""
    try:
        order_id = payment_data.get('orderId', 'UNKNOWN')
        user_name = payment_data.get('userName', 'Пользователь')
        username = payment_data.get('username', '')
        amount = float(payment_data.get('amount', 0))
        method = payment_data.get('method', 'Банковская карта')
        user_id = int(payment_data.get('userId', message.from_user.id))

        logger.info(f"💰 Обрабатываем заявку: {order_id}, пользователь: {user_id}, сумма: {amount}")

        # НОВОЕ: Получаем чек из backend
        receipt_path = None
        try:
            async with aiohttp.ClientSession() as session:
                # Запрашиваем данные заявки для получения пути к чеку
                async with session.get(f"{BACKEND_API}/api/balance/requests/{user_id}") as resp:
                    if resp.status == 200:
                        requests = await resp.json()
                        current_request = next(
                            (r for r in requests if r.get('order_id') == order_id),
                            None
                        )
                        if current_request:
                            receipt_path = current_request.get('receipt_path')
        except Exception as e:
            logger.warning(f"Не удалось получить данные чека: {e}")

        # Форматируем сообщение админам
        admin_message = f"""
💰 <b>НОВАЯ ЗАЯВКА НА ПОПОЛНЕНИЕ</b>

📋 <b>Заявка №:</b> <code>{order_id}</code>
👤 <b>Пользователь:</b> {user_name}
🏷️ <b>Username:</b> @{username if username else 'не указан'}  
🆔 <b>Telegram ID:</b> <code>{user_id}</code>
💳 <b>Сумма:</b> ₽{amount:,.2f}
🏦 <b>Способ:</b> {method}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

⚡ <b>Статус:</b> Ожидает проверки администратора

💳 <b>Реквизиты для проверки:</b>
• Карта: <code>5536 9141 2345 6789</code>
• Получатель: VOID SHOP  
• Банк: Сбер Банк

🔍 <b>Проверьте поступление ₽{amount:,.2f} на карту</b>
📎 <b>Чек об оплате прикреплен ниже</b>
"""

        # Кнопки для админов
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text="✅ Подтвердить платеж",
                callback_data=f"approve_payment_{order_id}_{user_id}_{amount}"
            )],
            [InlineKeyboardButton(
                text="❌ Отклонить платеж",
                callback_data=f"reject_payment_{order_id}_{user_id}"
            )],
            [InlineKeyboardButton(
                text="👤 Профиль пользователя",
                callback_data=f"user_profile_{user_id}"
            )]
        ])

        # ИСПРАВЛЕНО: Отправка всем админам с чеком
        success_count = 0
        for admin_id in ADMINS:
            try:
                admin_id_int = int(admin_id)

                # НОВОЕ: Отправляем сообщение с чеком если есть
                if receipt_path and Path(receipt_path).exists():
                    try:
                        # Определяем тип файла для правильной отправки
                        file_path = Path(receipt_path)
                        if file_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                            # Отправляем как фото
                            await bot.send_photo(
                                chat_id=admin_id_int,
                                photo=FSInputFile(receipt_path),
                                caption=admin_message,
                                reply_markup=kb
                            )
                        else:
                            # Отправляем как документ (PDF и др.)
                            await bot.send_document(
                                chat_id=admin_id_int,
                                document=FSInputFile(receipt_path),
                                caption=admin_message,
                                reply_markup=kb
                            )
                    except Exception as file_error:
                        logger.error(f"Ошибка отправки файла админу {admin_id}: {file_error}")
                        # Fallback: отправляем без файла
                        await bot.send_message(
                            admin_id_int,
                            admin_message + "\n\n⚠️ <i>Чек не удалось загрузить</i>",
                            reply_markup=kb
                        )
                else:
                    # Отправляем без чека если файл не найден
                    await bot.send_message(
                        admin_id_int,
                        admin_message + "\n\n⚠️ <i>Чек не найден</i>",
                        reply_markup=kb
                    )

                success_count += 1
                logger.info(f"✅ Уведомление отправлено админу {admin_id}")

            except ValueError:
                logger.error(f"❌ Некорректный ID админа: {admin_id}")
            except Exception as e:
                logger.error(f"❌ Не удалось отправить админу {admin_id}: {e}")

        if success_count == 0:
            logger.error(f"❌ НИ ОДНОМУ АДМИНУ НЕ ОТПРАВЛЕНО! Список админов: {ADMINS}")
            await message.answer(f"""
⚠️ <b>Техническая проблема</b>

Ваша заявка #{order_id} создана, но произошла ошибка уведомления администраторов.

📞 <b>Обратитесь в поддержку:</b> @void_shop_support
📋 <b>Номер заявки:</b> <code>{order_id}</code>
💰 <b>Сумма:</b> ₽{amount:,.2f}
""")
            return

        # Подтверждение пользователю
        await message.answer(f"""
📝 <b>Заявка принята к рассмотрению!</b>

📋 <b>Номер заявки:</b> <code>{order_id}</code>
💰 <b>Сумма:</b> ₽{amount:,.2f}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

⏳ <b>Статус:</b> На проверке у администратора

💡 <b>Время проверки:</b> обычно 5-15 минут
🔔 Вы получите уведомление о результате
📎 <b>Чек получен и отправлен админам</b>

<i>Уведомлено {success_count} администраторов</i>

📞 <b>Поддержка:</b> @void_shop_support
""")

        logger.info(f"✅ Заявка {order_id} обработана, уведомлено {success_count}/{len(ADMINS)} админов")

    except Exception as e:
        logger.error(f"❌ Критическая ошибка обработки заявки: {e}")
        await message.answer(f"""
❌ <b>Ошибка обработки заявки</b>

Произошла техническая ошибка при обработке вашей заявки.

📞 <b>Обратитесь в поддержку:</b> @void_shop_support
🔧 <b>Укажите время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}
""")


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

📋 <b>Заказ №:</b> <code>{order_id}</code>
📦 <b>Товар:</b> {product_title}
🏪 <b>Магазин:</b> {store_name}
💰 <b>Сумма:</b> ₽{amount:,.2f}

👤 <b>Покупатель:</b>
• Имя: {buyer_name}
• Username: @{buyer_username if buyer_username else 'не указан'}
• ID: <code>{buyer_tg_id}</code>

📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

✅ <b>Статус:</b> Оплачен с баланса
💡 <b>Действие:</b> Свяжитесь с покупателем
"""

        # Отправляем админам
        for admin_id in ADMINS:
            try:
                await bot.send_message(int(admin_id), admin_message)
            except Exception as e:
                logger.error(f"Ошибка отправки заказа админу {admin_id}: {e}")

    except Exception as e:
        logger.error(f"Ошибка обработки заказа: {e}")


# АДМИН ПАНЕЛЬ
async def handle_admin_callback(callback_query: types.CallbackQuery):
    """Админские кнопки"""
    data = callback_query.data
    admin_id = callback_query.from_user.id

    if str(admin_id) not in ADMINS:
        await callback_query.answer("❌ У вас нет прав администратора", show_alert=True)
        return

    try:
        if data.startswith("approve_payment_"):
            await handle_payment_approval(callback_query)
        elif data.startswith("reject_payment_"):
            await handle_payment_rejection(callback_query)
        elif data.startswith("user_profile_"):
            await show_user_profile(callback_query)
    except Exception as e:
        logger.error(f"Ошибка админского callback: {e}")
        await callback_query.answer("❌ Произошла ошибка", show_alert=True)


async def handle_payment_approval(callback_query: types.CallbackQuery):
    """КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Подтверждение платежа с реальным зачислением"""
    parts = callback_query.data.split("_")
    order_id = parts[2]
    user_id = int(parts[3])
    amount = float(parts[4])

    try:
        # ИСПРАВЛЕНО: Обрабатываем заявку через backend API
        async with aiohttp.ClientSession() as session:
            process_data = {
                "action": "approve",
                "admin_id": callback_query.from_user.id,
                "admin_comment": f"Подтверждено {callback_query.from_user.first_name}"
            }

            async with session.post(
                    f"{BACKEND_API}/api/balance/process/{order_id}",
                    json=process_data,
                    headers={"Content-Type": "application/json"}
            ) as resp:

                if resp.status == 200:
                    result = await resp.json()
                    new_balance = result.get('new_balance', 0)
                    old_balance = result.get('old_balance', 0)

                    # Обновляем сообщение
                    await callback_query.message.edit_text(f"""
✅ <b>ПЛАТЕЖ ПОДТВЕРЖДЕН</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
💰 <b>Сумма:</b> ₽{amount:,.2f}
👤 <b>Пользователь:</b> <code>{user_id}</code>
👨‍💼 <b>Подтвердил:</b> {callback_query.from_user.first_name}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

💳 <b>Баланс пользователя:</b>
• Было: ₽{old_balance:,.2f}
• Стало: ₽{new_balance:,.2f}

✅ <b>Средства успешно зачислены!</b>
""")

                    # Уведомляем пользователя
                    try:
                        await bot.send_message(user_id, f"""
🎉 <b>Баланс пополнен!</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
💰 <b>Зачислено:</b> ₽{amount:,.2f}
💳 <b>Новый баланс:</b> ₽{new_balance:,.2f}

✅ <b>Средства зачислены успешно!</b>
🛍️ Теперь можете совершать покупки

🚀 Откройте приложение для просмотра товаров
""")
                    except Exception as e:
                        logger.error(f"Не удалось уведомить пользователя {user_id}: {e}")

                    await callback_query.answer("✅ Платеж подтвержден")
                    logger.info(f"✅ Подтвержден платеж {order_id} на ₽{amount} для пользователя {user_id}")

                elif resp.status == 409:
                    # Заявка уже обработана
                    error_data = await resp.json()
                    await callback_query.answer(
                        f"⚠️ Заявка уже обработана: {error_data.get('current_status', 'неизвестно')}",
                        show_alert=True
                    )
                else:
                    error_data = await resp.json()
                    await callback_query.answer(
                        f"❌ Ошибка: {error_data.get('detail', 'неизвестная ошибка')}",
                        show_alert=True
                    )

    except Exception as e:
        logger.error(f"Ошибка подтверждения платежа: {e}")
        await callback_query.answer("❌ Произошла ошибка", show_alert=True)


async def handle_payment_rejection(callback_query: types.CallbackQuery):
    """Отклонение платежа"""
    parts = callback_query.data.split("_")
    order_id = parts[2]
    user_id = int(parts[3])

    try:
        # Обрабатываем заявку через backend API
        async with aiohttp.ClientSession() as session:
            process_data = {
                "action": "reject",
                "admin_id": callback_query.from_user.id,
                "admin_comment": f"Отклонено {callback_query.from_user.first_name}"
            }

            async with session.post(
                    f"{BACKEND_API}/api/balance/process/{order_id}",
                    json=process_data,
                    headers={"Content-Type": "application/json"}
            ) as resp:

                if resp.status == 200:
                    await callback_query.message.edit_text(f"""
❌ <b>ПЛАТЕЖ ОТКЛОНЕН</b>

📋 <b>Заявка:</b> <code>{order_id}</code>
👤 <b>Пользователь:</b> <code>{user_id}</code>
👨‍💼 <b>Отклонил:</b> {callback_query.from_user.first_name}
📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M')}

❌ <b>Статус:</b> Заявка отклонена
""")

                    # Уведомляем пользователя
                    try:
                        await bot.send_message(user_id, f"""
❌ <b>Заявка отклонена</b>

📋 <b>Заявка:</b> <code>{order_id}</code>

🔍 <b>Возможные причины:</b>
• Платеж не поступил на реквизиты
• Неверная сумма
• Некорректный чек
• Технические неполадки

💬 <b>Что делать:</b>
• Обратитесь в поддержку: @void_shop_support
• Создайте новую заявку в приложении
• Укажите номер отклоненной заявки: <code>{order_id}</code>

🔄 Можете попробовать еще раз
""")
                    except Exception as e:
                        logger.error(f"Не удалось уведомить пользователя {user_id}: {e}")

                    await callback_query.answer("❌ Платеж отклонен")

                else:
                    error_data = await resp.json()
                    await callback_query.answer(
                        f"❌ Ошибка: {error_data.get('detail', 'неизвестная ошибка')}",
                        show_alert=True
                    )

    except Exception as e:
        logger.error(f"Ошибка отклонения платежа: {e}")
        await callback_query.answer("❌ Произошла ошибка", show_alert=True)


async def show_user_profile(callback_query: types.CallbackQuery):
    """Профиль пользователя"""
    user_id = int(callback_query.data.split("_")[2])

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{BACKEND_API}/api/user/{user_id}") as resp:
                if resp.status == 200:
                    user_data = await resp.json()

                    await callback_query.message.reply(f"""
👤 <b>ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ</b>

🆔 <b>ID:</b> <code>{user_data.get('tg_id')}</code>
👤 <b>Имя:</b> {user_data.get('first_name', '')} {user_data.get('last_name', '')}
🏷️ <b>Username:</b> @{user_data.get('username', 'не указан')}
🏙️ <b>Город:</b> {user_data.get('city', 'Не указан')}
💰 <b>Баланс:</b> ₽{user_data.get('balance', 0):,.2f}
📅 <b>Регистрация:</b> {user_data.get('registered_at', '')[:10]}
⭐ <b>Статус:</b> {'Верифицирован' if user_data.get('is_verified') else 'Обычный'}

🔗 <b>Ссылка:</b> <a href="tg://user?id={user_id}">Открыть в Telegram</a>
""")
                else:
                    await callback_query.message.reply("❌ Пользователь не найден")

    except Exception as e:
        logger.error(f"Ошибка профиля: {e}")
        await callback_query.message.reply("❌ Ошибка получения профиля")

    await callback_query.answer()


# ИСПРАВЛЕНО: Убираем webhook - будем использовать только WebApp данные
# Webhook не нужен, так как уведомления идут через WebApp данные


# РЕГИСТРАЦИЯ ОБРАБОТЧИКОВ
router.message.register(cmd_start, Command(commands=["start"]))
router.message.register(cmd_balance, Command(commands=["balance", "bal"]))
router.message.register(handle_webapp_data, F.web_app_data)

router.callback_query.register(callback_check_balance, F.data == "check_balance")
router.callback_query.register(
    handle_admin_callback,
    F.data.startswith(("approve_payment_", "reject_payment_", "user_profile_"))
)

dp.include_router(router)


async def notify_admins_start():
    """Уведомление о запуске"""
    message = f"""
🚀 <b>Void Shop Bot запущен!</b>

📅 <b>Время:</b> {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}
🌐 <b>WebApp:</b> {BASE_URL}
🔧 <b>Backend:</b> {BACKEND_API}
👥 <b>Админы:</b> {', '.join(ADMINS)}

✅ <b>Готово к работе!</b>
🔄 WebApp уведомления включены
📎 <b>Поддержка файлов чеков активна</b>
📞 <b>Поддержка:</b> @void_shop_support

<i>Все заявки на пополнение с чеками будут приходить сюда</i>
"""

    success = 0
    for admin_id in ADMINS:
        try:
            await bot.send_message(int(admin_id), message)
            success += 1
        except Exception as e:
            logger.error(f"Не удалось уведомить админа {admin_id}: {e}")

    logger.info(f"✅ Уведомлено {success}/{len(ADMINS)} админов")


async def main():
    logger.info("🚀 Запуск Void Shop Bot...")
    logger.info(f"📋 Админы: {ADMINS}")

    try:
        await notify_admins_start()
    except Exception as e:
        logger.exception(f"Ошибка уведомления: {e}")

    try:
        logger.info("🔄 Запуск polling...")
        await dp.start_polling(bot)
    except KeyboardInterrupt:
        logger.info("⏹️ Остановка")
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
        logger.info("👋 Завершение")
    except Exception as e:
        logger.exception(f"💥 Критическая ошибка: {e}")
        exit(1)