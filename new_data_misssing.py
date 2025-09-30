# init_payment_settings.py - Запустите ОДИН РАЗ для инициализации настроек
import sqlite3
from datetime import datetime


def init_payment_settings():
    conn = sqlite3.connect('voidshop.db')
    cursor = conn.cursor()

    # Проверяем есть ли уже настройки
    cursor.execute("SELECT COUNT(*) FROM systemsettings WHERE category = 'payment'")
    count = cursor.fetchone()[0]

    if count > 0:
        print("⚠️ Настройки уже существуют. Обновляем...")

    settings = [
        ('payment_card_number', '5536 9141 2345 6789', 'Номер карты для пополнения', 'payment'),
        ('payment_card_holder', 'VOID SHOP', 'Держатель карты', 'payment'),
        ('payment_bank_name', 'Сбер Банк', 'Название банка', 'payment'),
        ('payment_btc_wallet', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Bitcoin кошелек', 'payment'),
        ('payment_usdt_wallet', 'TQRRm4Pg5wKTZJhP5QiCEkT3JzRzJ3qS4F', 'USDT кошелек', 'payment'),
        ('payment_min_amount', '100', 'Минимальная сумма пополнения', 'payment'),
        ('payment_max_amount', '100000', 'Максимальная сумма пополнения', 'payment'),
        ('payment_commission_card', '0', 'Комиссия для карт (%)', 'payment'),
        ('payment_commission_crypto', '2.5', 'Комиссия для крипто (%)', 'payment'),
        ('payment_processing_time_card', '5-15 минут', 'Время обработки карты', 'payment'),
        ('payment_processing_time_crypto', '10-30 минут', 'Время обработки крипто', 'payment'),
        ('referral_commission_rate', '5', 'Процент реферальной комиссии', 'referral'),
        ('referral_enabled', 'true', 'Реферальная система включена', 'referral')
    ]

    for key, value, description, category in settings:
        cursor.execute("""
            INSERT OR REPLACE INTO systemsettings 
            (key, value, description, category, created_at, updated_at, is_protected)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (key, value, description, category, datetime.now(), datetime.now(), False))

    conn.commit()

    # Проверяем результат
    cursor.execute("SELECT key, value FROM systemsettings WHERE category = 'payment'")
    results = cursor.fetchall()

    print("✅ Настройки платежей инициализированы:")
    for key, value in results:
        print(f"  - {key}: {value}")

    conn.close()

    # Создаем папку для чеков
    import os
    os.makedirs('uploads/receipts', exist_ok=True)
    print("✅ Папка для чеков создана: uploads/receipts")


if __name__ == "__main__":
    init_payment_settings()
    print("\n✅ Все настройки успешно добавлены в БД!")