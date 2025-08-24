# create_test_data.py - ПОЛНЫЕ ТЕСТОВЫЕ ДАННЫЕ
import sys
import os
from datetime import datetime, timedelta
import random
from sqlmodel import select

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.db import get_session
from backend.models import *


def create_test_data():
    """Создает полные тестовые данные включая товары под все категории"""

    print("🚀 Создание тестовых данных...")

    with get_session() as session:
        # 1. СОЗДАНИЕ КАТЕГОРИЙ
        categories_data = [
            {"name": "Электроника", "slug": "electronics", "icon": "📱", "description": "Смартфоны, планшеты, наушники",
             "sort_order": 1},
            {"name": "Одежда", "slug": "clothing", "icon": "👕", "description": "Модная одежда для мужчин и женщин",
             "sort_order": 2},
            {"name": "Обувь", "slug": "shoes", "icon": "👟", "description": "Кроссовки, ботинки, туфли",
             "sort_order": 3},
            {"name": "Дом и сад", "slug": "home-garden", "icon": "🏠", "description": "Товары для дома и сада",
             "sort_order": 4},
            {"name": "Красота", "slug": "beauty", "icon": "💄", "description": "Косметика и уход", "sort_order": 5},
            {"name": "Спорт", "slug": "sports", "icon": "⚽", "description": "Спортивные товары и аксессуары",
             "sort_order": 6},
            {"name": "Книги", "slug": "books", "icon": "📚", "description": "Художественная и техническая литература",
             "sort_order": 7},
            {"name": "Игрушки", "slug": "toys", "icon": "🧸", "description": "Игрушки для детей всех возрастов",
             "sort_order": 8},
        ]

        categories = []
        for cat_data in categories_data:
            # Проверяем, существует ли категория
            existing = session.exec(select(Category).where(Category.slug == cat_data["slug"])).first()
            if not existing:
                category = Category(**cat_data)
                session.add(category)
                session.commit()
                session.refresh(category)
                categories.append(category)
                print(f"✅ Создана категория: {category.name}")
            else:
                categories.append(existing)
                print(f"ℹ️  Категория уже существует: {existing.name}")

        # 2. СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ
        users_data = [
            {
                "tg_id": 123456789,
                "username": "testowner",
                "first_name": "Тест",
                "last_name": "Владелец",
                "city": "Москва",
                "balance": 50000.0,
                "is_verified": True,
            },
            {
                "tg_id": 987654321,
                "username": "testbuyer",
                "first_name": "Покупатель",
                "last_name": "Тестовый",
                "city": "Санкт-Петербург",
                "balance": 10000.0,
                "is_verified": False,
            }
        ]

        users = []
        for user_data in users_data:
            existing = session.exec(select(User).where(User.tg_id == user_data["tg_id"])).first()
            if not existing:
                user = User(**user_data)
                session.add(user)
                session.commit()
                session.refresh(user)
                users.append(user)
                print(f"✅ Создан пользователь: {user.username}")
            else:
                users.append(existing)
                print(f"ℹ️  Пользователь уже существует: {existing.username}")

        # 3. СОЗДАНИЕ МАГАЗИНОВ
        stores_data = [
            {
                "name": "TechnoShop",
                "description": "Лучшие гаджеты и электроника по выгодным ценам",
                "short_description": "Электроника и гаджеты",
                "owner_id": users[0].id,
                "city": "Москва",
                "address": "ул. Тверская, 12",
                "telegram_username": "technoshop_bot",
                "phone": "+7 495 123-45-67",
                "email": "info@technoshop.ru",
                "rating": 4.8,
                "total_reviews": 156,
                "total_sales": 1200,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "Fashion World",
                "description": "Модная одежда от известных брендов с быстрой доставкой",
                "short_description": "Модная одежда и аксессуары",
                "owner_id": users[0].id,
                "city": "Москва",
                "address": "ул. Арбат, 25",
                "telegram_username": "fashion_world_bot",
                "phone": "+7 495 234-56-78",
                "rating": 4.6,
                "total_reviews": 89,
                "total_sales": 890,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "SportLife",
                "description": "Спортивные товары для активного образа жизни",
                "short_description": "Спорт и активный отдых",
                "owner_id": users[1].id,
                "city": "Санкт-Петербург",
                "address": "пр. Невский, 88",
                "telegram_username": "sportlife_spb",
                "rating": 4.7,
                "total_reviews": 124,
                "total_sales": 670,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "HomeComfort",
                "description": "Все для уюта в вашем доме",
                "short_description": "Товары для дома",
                "owner_id": users[0].id,
                "city": "Москва",
                "telegram_username": "homecomfort_moscow",
                "rating": 4.5,
                "total_reviews": 76,
                "total_sales": 450,
                "status": StoreStatus.ACTIVE,
                "is_featured": False,
            },
            {
                "name": "BeautyZone",
                "description": "Косметика и средства ухода от лучших брендов",
                "short_description": "Красота и уход",
                "owner_id": users[1].id,
                "city": "Казань",
                "telegram_username": "beautyzone_kzn",
                "rating": 4.9,
                "total_reviews": 201,
                "total_sales": 1100,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "BookLand",
                "description": "Книги на любой вкус - от классики до новинок",
                "short_description": "Книги и литература",
                "owner_id": users[0].id,
                "city": "Екатеринбург",
                "telegram_username": "bookland_ekb",
                "rating": 4.4,
                "total_reviews": 93,
                "total_sales": 320,
                "status": StoreStatus.ACTIVE,
                "is_featured": False,
            },
        ]

        stores = []
        for store_data in stores_data:
            existing = session.exec(select(Store).where(Store.name == store_data["name"])).first()
            if not existing:
                store = Store(**store_data)
                session.add(store)
                session.commit()
                session.refresh(store)
                stores.append(store)
                print(f"✅ Создан магазин: {store.name}")
            else:
                stores.append(existing)
                print(f"ℹ️  Магазин уже существует: {existing.name}")

        # 4. СОЗДАНИЕ ТОВАРОВ ПОД ВСЕ КАТЕГОРИИ
        products_by_category = {
            "electronics": [
                {
                    "title": "iPhone 15 Pro Max",
                    "description": "Новейший смартфон от Apple с камерой 48МП и чипом A17 Pro. Titanium корпус, 256GB памяти.",
                    "short_description": "Флагманский смартфон Apple",
                    "price": 129999.0,
                    "old_price": 149999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Samsung Galaxy S24 Ultra",
                    "description": "Топовый Android смартфон с S Pen и камерой 200МП. 12GB RAM, 512GB памяти.",
                    "short_description": "Android флагман с стилусом",
                    "price": 119999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "MacBook Air M3",
                    "description": "Ультрабук с чипом M3, 13.6 дисплей Liquid Retina, 16GB RAM, 512GB SSD.",
                    "short_description": "Легкий и мощный ноутбук",
                    "price": 159999.0,
                    "old_price": 179999.0,
                    "quantity": 5,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "AirPods Pro 3",
                    "description": "Беспроводные наушники с активным шумоподавлением и пространственным звуком.",
                    "short_description": "TWS наушники премиум",
                    "price": 29999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "clothing": [
                {
                    "title": "Футболка Nike Dri-FIT",
                    "description": "Спортивная футболка из влагоотводящей ткани. 100% полиэстер. Размеры S-XL.",
                    "short_description": "Спортивная футболка Nike",
                    "price": 2999.0,
                    "old_price": 3999.0,
                    "quantity": 50,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Джинсы Levi's 501",
                    "description": "Классические прямые джинсы из 100% хлопка. Оригинальная посадка и качество.",
                    "short_description": "Классические джинсы",
                    "price": 7999.0,
                    "quantity": 30,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Худи Adidas Originals",
                    "description": "Теплое худи с капюшоном и карманом-кенгуру. Логотип трилистник.",
                    "short_description": "Стильное худи Adidas",
                    "price": 5999.0,
                    "quantity": 20,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Платье ZARA",
                    "description": "Элегантное черное платье для особых случаев. Приталенный силуэт.",
                    "short_description": "Вечернее платье",
                    "price": 4999.0,
                    "old_price": 6999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "shoes": [
                {
                    "title": "Nike Air Max 270",
                    "description": "Стильные кроссовки с воздушной подушкой Max Air для комфорта на весь день.",
                    "short_description": "Кроссовки Nike Air Max",
                    "price": 12999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Adidas Ultraboost 22",
                    "description": "Беговые кроссовки с технологией Boost для максимального возврата энергии.",
                    "short_description": "Беговые кроссовки Adidas",
                    "price": 15999.0,
                    "old_price": 18999.0,
                    "quantity": 18,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Ботинки Dr. Martens",
                    "description": "Классические черные ботинки на шнуровке. Прочная кожа и фирменная подошва.",
                    "short_description": "Кожаные ботинки",
                    "price": 18999.0,
                    "quantity": 12,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "home-garden": [
                {
                    "title": "Робот-пылесос Xiaomi",
                    "description": "Умный робот-пылесос с лазерной навигацией и влажной уборкой. Управление через приложение.",
                    "short_description": "Умный пылесос",
                    "price": 34999.0,
                    "old_price": 42999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Набор кастрюль Tefal",
                    "description": "Набор из 5 кастрюль с антипригарным покрытием. Подходят для всех типов плит.",
                    "short_description": "Набор посуды",
                    "price": 8999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "LED лампа Philips Hue",
                    "description": "Умная лампочка с 16 миллионами цветов. Управление через телефон.",
                    "short_description": "Умная лампочка",
                    "price": 3999.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "beauty": [
                {
                    "title": "Тушь для ресниц Maybelline",
                    "description": "Объемная тушь с эффектом накладных ресниц. Водостойкая формула.",
                    "short_description": "Тушь для ресниц",
                    "price": 899.0,
                    "quantity": 100,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Крем для лица L'Oreal",
                    "description": "Увлажняющий крем с гиалуроновой кислотой. Для всех типов кожи.",
                    "short_description": "Увлажняющий крем",
                    "price": 1599.0,
                    "old_price": 1999.0,
                    "quantity": 60,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Палетка теней Urban Decay",
                    "description": "12 оттенков теней для век в нюдовой гамме. Высокая пигментация.",
                    "short_description": "Палетка теней",
                    "price": 4999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "sports": [
                {
                    "title": "Гантели разборные 20кг",
                    "description": "Набор разборных гантелей от 2.5 до 20 кг каждая. Хромированное покрытие.",
                    "short_description": "Разборные гантели",
                    "price": 7999.0,
                    "quantity": 10,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Йога-мат Premium",
                    "description": "Профессиональный коврик для йоги из натурального каучука. Толщина 6мм.",
                    "short_description": "Коврик для йоги",
                    "price": 2999.0,
                    "old_price": 3999.0,
                    "quantity": 40,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Велосипед горный Trek",
                    "description": "21-скоростной горный велосипед с алюминиевой рамой. Колеса 27.5.",
                    "short_description": "Горный велосипед",
                    "price": 45999.0,
                    "quantity": 5,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "books": [
                {
                    "title": "Война и мир - Толстой",
                    "description": "Классическое произведение русской литературы в подарочном издании.",
                    "short_description": "Классика русской литературы",
                    "price": 1999.0,
                    "quantity": 30,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Гарри Поттер и философский камень",
                    "description": "Первая книга о мальчике-волшебнике в новом переводе.",
                    "short_description": "Фэнтези для всех возрастов",
                    "price": 899.0,
                    "old_price": 1299.0,
                    "quantity": 50,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Python для чайников",
                    "description": "Самоучитель по программированию на Python с практическими примерами.",
                    "short_description": "Программирование Python",
                    "price": 2499.0,
                    "quantity": 20,
                    "status": ProductStatus.ACTIVE
                }
            ],

            "toys": [
                {
                    "title": "Конструктор LEGO City",
                    "description": "Набор из 500 деталей для строительства городских объектов. Возраст 6+.",
                    "short_description": "Конструктор LEGO",
                    "price": 4999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Кукла Barbie Fashion",
                    "description": "Модная кукла Барби с аксессуарами и сменными нарядами.",
                    "short_description": "Кукла с аксессуарами",
                    "price": 1999.0,
                    "old_price": 2499.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Машинка на р/у Mercedes",
                    "description": "Радиоуправляемая модель Mercedes G-Class в масштабе 1:14.",
                    "short_description": "Р/У машинка",
                    "price": 3999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                }
            ]
        }

        # Создаем товары
        all_products = []
        for category_slug, products_data in products_by_category.items():
            # Находим категорию
            category = next((c for c in categories if c.slug == category_slug), None)
            if not category:
                continue

            # Выбираем случайный магазин для товаров этой категории
            store = random.choice(stores)

            for product_data in products_data:
                product_data.update({
                    "store_id": store.id,
                    "category": category_slug,
                    "views": random.randint(10, 500),
                    "favorites": random.randint(1, 50)
                })

                # Проверяем, существует ли товар
                existing = session.exec(select(Product).where(
                    Product.title == product_data["title"],
                    Product.store_id == store.id
                )).first()

                if not existing:
                    product = Product(**product_data)
                    session.add(product)
                    session.commit()
                    session.refresh(product)
                    all_products.append(product)
                    print(f"✅ Создан товар: {product.title} в категории {category.name}")
                else:
                    all_products.append(existing)
                    print(f"ℹ️  Товар уже существует: {existing.title}")

        # 5. СОЗДАНИЕ ОТЗЫВОВ НА ТОВАРЫ
        sample_reviews = [
            {"rating": 5, "text": "Отличный товар! Рекомендую всем!"},
            {"rating": 4, "text": "Хорошее качество, быстрая доставка."},
            {"rating": 5, "text": "Превзошел все ожидания!"},
            {"rating": 4, "text": "Качественный продукт, стоит своих денег."},
            {"rating": 3, "text": "Нормально, но есть небольшие недочеты."},
        ]

        for product in all_products[:20]:  # Добавляем отзывы к первым 20 товарам
            for _ in range(random.randint(1, 4)):
                review_data = random.choice(sample_reviews)
                review = ProductReview(
                    product_id=product.id,
                    user_id=random.choice(users).id,
                    rating=review_data["rating"],
                    text=review_data["text"],
                    is_verified=True,
                    helpful_count=random.randint(0, 10)
                )
                session.add(review)

        session.commit()
        print(f"✅ Создано отзывов на товары")

        # 6. ОБНОВЛЕНИЕ СЧЕТЧИКОВ КАТЕГОРИЙ
        for category in categories:
            products_count = len(session.exec(select(Product).where(
                Product.category == category.slug,
                Product.status == ProductStatus.ACTIVE
            )).all())

            # Обновляем description с количеством товаров
            if products_count > 0:
                print(f"📊 Категория {category.name}: {products_count} товаров")

    print("\n🎉 Тестовые данные успешно созданы!")
    print("📊 Статистика:")
    print(f"   • Категорий: {len(categories_data)}")
    print(f"   • Пользователей: {len(users_data)}")
    print(f"   • Магазинов: {len(stores_data)}")
    print(f"   • Товаров: {sum(len(products) for products in products_by_category.values())}")


if __name__ == "__main__":
    create_test_data()