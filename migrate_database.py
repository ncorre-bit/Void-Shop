# migrate_database.py - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ БД
"""
ВНИМАНИЕ! Этот скрипт пересоздаст базу данных с нуля.
Запускать ТОЛЬКО если не жалко потерять существующие данные!
"""
import os
import sys
import sqlite3
import shutil
from datetime import datetime

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Импортируем модели после добавления пути
from backend.db import create_db_and_tables
from backend.models import *


def backup_existing_db():
    """Создаем бэкап существующей БД"""
    db_path = 'voidshop.db'
    if os.path.exists(db_path):
        backup_name = f'voidshop_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.db'
        shutil.copy2(db_path, backup_name)
        print(f"✅ Бэкап создан: {backup_name}")
        return backup_name
    return None


def drop_old_db():
    """Удаляем старую БД"""
    db_path = 'voidshop.db'
    if os.path.exists(db_path):
        os.remove(db_path)
        print("🗑️  Старая БД удалена")


def create_new_db():
    """Создаем новую БД с корректной схемой"""
    print("🔄 Создаем новую БД...")
    create_db_and_tables()
    print("✅ Новая БД создана успешно!")


def verify_db_structure():
    """Проверяем структуру новой БД"""
    print("🔍 Проверяем структуру БД...")

    conn = sqlite3.connect('voidshop.db')
    cursor = conn.cursor()

    # Проверяем таблицу user
    cursor.execute("PRAGMA table_info(user)")
    columns = cursor.fetchall()

    required_columns = [
        'avatar_url', 'telegram_data', 'tg_id', 'username',
        'first_name', 'last_name', 'city', 'balance'
    ]

    existing_columns = [col[1] for col in columns]

    print("📋 Колонки таблицы user:")
    for col in existing_columns:
        status = "✅" if col in required_columns else "ℹ️"
        print(f"  {status} {col}")

    missing = set(required_columns) - set(existing_columns)
    if missing:
        print(f"❌ Отсутствующие колонки: {missing}")
        return False

    print("✅ Структура БД корректна!")
    conn.close()
    return True


def add_sample_data():
    """Добавляем тестовые данные"""
    print("🔄 Добавляем тестовые данные...")

    try:
        # Запускаем скрипт создания тестовых данных
        import create_test_data
        create_test_data.create_test_data()
        print("✅ Тестовые данные добавлены!")
    except Exception as e:
        print(f"⚠️  Ошибка добавления тестовых данных: {e}")
        print("Можно запустить create_test_data.py отдельно")


def main():
    print("🚨 МИГРАЦИЯ БАЗЫ ДАННЫХ VOID SHOP")
    print("=" * 50)

    # Предупреждение
    response = input("⚠️  ВНИМАНИЕ! Это удалит существующую БД. Продолжить? (yes/no): ")
    if response.lower() not in ['yes', 'y', 'да']:
        print("Операция отменена")
        return

    try:
        # 1. Создаем бэкап
        backup_file = backup_existing_db()

        # 2. Удаляем старую БД
        drop_old_db()

        # 3. Создаем новую БД
        create_new_db()

        # 4. Проверяем структуру
        if verify_db_structure():
            # 5. Добавляем тестовые данные
            add_sample_data()

            print("\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
            print("📂 Структура БД обновлена")
            print("🧪 Тестовые данные загружены")
            if backup_file:
                print(f"💾 Бэкап сохранен: {backup_file}")
            print("\n🚀 Теперь можно запускать сервер!")

        else:
            print("❌ Ошибка в структуре БД")
            return False

    except Exception as e:
        print(f"❌ Критическая ошибка миграции: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)