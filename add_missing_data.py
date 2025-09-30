# create_missing_columns.py - КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ БД
import sqlite3
import os
from pathlib import Path

# Путь к базе данных
DB_PATH = Path("voidshop.db")


def check_column_exists(cursor, table_name, column_name):
    """Проверяем существование колонки в таблице"""
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [column[1] for column in cursor.fetchall()]
        return column_name in columns
    except Exception as e:
        print(f"Ошибка проверки колонки {column_name}: {e}")
        return False


def migrate_database():
    """Добавляем недостающие колонки в базу данных"""
    if not DB_PATH.exists():
        print(f"❌ База данных {DB_PATH} не найдена!")
        return False

    print(f"🔄 Начинаем миграцию базы данных: {DB_PATH}")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Проверяем и добавляем недостающие колонки в таблицу user
        missing_columns = [
            ("referral_code", "VARCHAR(10)", "NULL"),
            ("referred_by", "INTEGER", "NULL"),
            ("total_referral_earnings", "REAL", "0.0"),
            ("total_deposits", "REAL", "0.0"),
        ]

        print("🔍 Проверяем таблицу user...")

        for column_name, column_type, default_value in missing_columns:
            if not check_column_exists(cursor, "user", column_name):
                print(f"➕ Добавляем колонку: user.{column_name}")
                cursor.execute(f"ALTER TABLE user ADD COLUMN {column_name} {column_type} DEFAULT {default_value}")
            else:
                print(f"✅ Колонка user.{column_name} уже существует")

        # Проверяем существование других необходимых таблиц
        tables_to_check = ["balancerequest", "store", "product", "category"]

        for table in tables_to_check:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if cursor.fetchone():
                print(f"✅ Таблица {table} существует")
            else:
                print(f"⚠️  Таблица {table} отсутствует")

        # Создаем индексы для оптимизации
        indexes = [
            ("idx_user_referral_code", "CREATE INDEX IF NOT EXISTS idx_user_referral_code ON user(referral_code)"),
            ("idx_user_referred_by", "CREATE INDEX IF NOT EXISTS idx_user_referred_by ON user(referred_by)"),
            ("idx_user_tg_id", "CREATE INDEX IF NOT EXISTS idx_user_tg_id ON user(tg_id)"),
        ]

        print("🔧 Создаем индексы...")
        for index_name, query in indexes:
            try:
                cursor.execute(query)
                print(f"✅ Индекс {index_name} создан")
            except Exception as e:
                print(f"⚠️  Индекс {index_name}: {e}")

        # Сохраняем изменения
        conn.commit()
        print("✅ Миграция завершена успешно!")

        # Показываем итоговую структуру таблицы user
        print("\n📋 Итоговая структура таблицы user:")
        cursor.execute("PRAGMA table_info(user)")
        for row in cursor.fetchall():
            print(f"  - {row[1]}: {row[2]} {'(PK)' if row[5] else ''}")

        return True

    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА миграции: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


def backup_database():
    """Создаем резервную копию базы данных"""
    if DB_PATH.exists():
        backup_path = DB_PATH.with_suffix('.db.backup')
        try:
            import shutil
            shutil.copy2(DB_PATH, backup_path)
            print(f"💾 Резервная копия создана: {backup_path}")
            return True
        except Exception as e:
            print(f"❌ Не удалось создать резервную копию: {e}")
            return False
    return False


if __name__ == "__main__":
    print("🚀 МИГРАЦИЯ БД VOID SHOP")
    print("=" * 50)

    # Создаем резервную копию
    backup_database()

    # Выполняем миграцию
    success = migrate_database()

    if success:
        print("\n🎉 МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
        print("Теперь можно запускать backend без ошибок.")
    else:
        print("\n💥 МИГРАЦИЯ ПРОВАЛИЛАСЬ!")
        print("Проверьте логи ошибок выше.")

    print("=" * 50)