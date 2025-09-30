# create_test_data.py - УЛУЧШЕННАЯ ВЕРСИЯ: товары под ВСЕ категории
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
    """Создает ПОЛНЫЕ тестовые данные с товарами под ВСЕ категории"""

    print("🚀 Создание тестовых данных с ПОЛНЫМ каталогом...")

    with get_session() as session:
        # 1. СОЗДАНИЕ КАТЕГОРИЙ
        categories_data = [
            {"name": "Электроника", "slug": "electronics", "icon": "📱",
             "description": "Смартфоны, планшеты, наушники, ПК", "sort_order": 1},
            {"name": "Одежда", "slug": "clothing", "icon": "👕",
             "description": "Модная одежда для мужчин и женщин", "sort_order": 2},
            {"name": "Обувь", "slug": "shoes", "icon": "👟",
             "description": "Кроссовки, ботинки, туфли", "sort_order": 3},
            {"name": "Дом и сад", "slug": "home-garden", "icon": "🏠",
             "description": "Товары для дома и сада", "sort_order": 4},
            {"name": "Красота", "slug": "beauty", "icon": "💄",
             "description": "Косметика и уход", "sort_order": 5},
            {"name": "Спорт", "slug": "sports", "icon": "⚽",
             "description": "Спортивные товары и аксессуары", "sort_order": 6},
            {"name": "Книги", "slug": "books", "icon": "📚",
             "description": "Художественная и техническая литература", "sort_order": 7},
            {"name": "Игрушки", "slug": "toys", "icon": "🧸",
             "description": "Игрушки для детей всех возрастов", "sort_order": 8},
            {"name": "Авто", "slug": "auto", "icon": "🚗",
             "description": "Автотовары и аксессуары", "sort_order": 9},
        ]

        categories = []
        for cat_data in categories_data:
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
                "first_name": "Владимир",
                "last_name": "Владелец",
                "city": "Москва",
                "balance": 50000.0,
                "is_verified": True,
                "avatar_url": None,
                "telegram_data": '{"language_code": "ru", "is_premium": false, "platform": "telegram_webapp"}'
            },
            {
                "tg_id": 987654321,
                "username": "buyer_test",
                "first_name": "Покупатель",
                "last_name": "Тестовый",
                "city": "Санкт-Петербург",
                "balance": 15000.0,
                "is_verified": True,
                "telegram_data": '{"language_code": "ru", "is_premium": true, "platform": "telegram_webapp"}'
            },
            {
                "tg_id": 555666777,
                "username": "shop_owner",
                "first_name": "Анна",
                "last_name": "Магазинова",
                "city": "Казань",
                "balance": 25000.0,
                "is_verified": True,
                "telegram_data": '{"language_code": "ru", "is_premium": false, "platform": "telegram_webapp"}'
            },
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
                "name": "TechnoWorld",
                "description": "Ведущий магазин электроники с огромным выбором гаджетов, компьютерной техники и аксессуаров",
                "short_description": "Электроника и гаджеты №1",
                "owner_id": users[0].id,
                "city": "Москва",
                "address": "ул. Тверская, 12, ТЦ Технопарк",
                "telegram_username": "technoworld_moscow",
                "phone": "+7 495 123-45-67",
                "email": "info@technoworld.ru",
                "rating": 4.9,
                "total_reviews": 256,
                "total_sales": 1850,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "Fashion Central",
                "description": "Модная одежда от мировых брендов. Стиль, качество и доступные цены в одном месте",
                "short_description": "Модная одежда и стиль",
                "owner_id": users[1].id,
                "city": "Санкт-Петербург",
                "address": "Невский пр., 88, ТРК Галерея",
                "telegram_username": "fashion_central_spb",
                "phone": "+7 812 234-56-78",
                "rating": 4.7,
                "total_reviews": 189,
                "total_sales": 1240,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "SportLife Pro",
                "description": "Профессиональные спортивные товары для активного образа жизни и достижения целей",
                "short_description": "Спорт и активный отдых",
                "owner_id": users[2].id,
                "city": "Казань",
                "address": "ул. Баумана, 45, СК Олимп",
                "telegram_username": "sportlife_kazan",
                "rating": 4.8,
                "total_reviews": 167,
                "total_sales": 890,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "HomeComfort Studio",
                "description": "Создаем уют в вашем доме. Мебель, декор, текстиль и все для комфортной жизни",
                "short_description": "Товары для дома и уюта",
                "owner_id": users[0].id,
                "city": "Москва",
                "telegram_username": "homecomfort_moscow",
                "rating": 4.6,
                "total_reviews": 134,
                "total_sales": 560,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "Beauty Zone",
                "description": "Премиальная косметика и средства ухода от лучших мировых брендов",
                "short_description": "Красота и уход премиум",
                "owner_id": users[1].id,
                "city": "Екатеринбург",
                "telegram_username": "beautyzone_ekb",
                "rating": 4.9,
                "total_reviews": 298,
                "total_sales": 1560,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
            },
            {
                "name": "KidsWorld",
                "description": "Мир детских товаров: игрушки, одежда, обувь и все необходимое для развития ребенка",
                "short_description": "Детские товары и игрушки",
                "owner_id": users[2].id,
                "city": "Новосибирск",
                "telegram_username": "kidsworld_nsk",
                "rating": 4.8,
                "total_reviews": 156,
                "total_sales": 720,
                "status": StoreStatus.ACTIVE,
                "is_featured": True,
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

        # 4. СОЗДАНИЕ ТОВАРОВ ПОД ВСЕ КАТЕГОРИИ (РАСШИРЕННЫЙ КАТАЛОГ)
        products_by_category = {
            "electronics": [
                # Смартфоны
                {
                    "title": "iPhone 15 Pro Max 256GB",
                    "description": "Революционный смартфон с титановым корпусом, чипом A17 Pro, камерой 48МП с 5x зумом. Поддержка USB-C, Always-On дисплей, Face ID.",
                    "short_description": "Флагманский iPhone с 5x зумом",
                    "price": 134999.0,
                    "old_price": 149999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Samsung Galaxy S24 Ultra 512GB",
                    "description": "Топовый Android с S Pen, камерой 200МП, ИИ-функциями Galaxy AI. Экран 6.8 Dynamic AMOLED 2X, Snapdragon 8 Gen 3.",
                    "short_description": "Android флагман с ИИ",
                    "price": 119999.0,
                    "quantity": 18,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Google Pixel 8 Pro",
                    "description": "Чистый Android с лучшими камерами от Google. Magic Eraser, Night Sight, 7 лет обновлений безопасности.",
                    "short_description": "Google смартфон с ИИ камерой",
                    "price": 89999.0,
                    "old_price": 99999.0,
                    "quantity": 22,
                    "status": ProductStatus.ACTIVE
                },
                # Ноутбуки
                {
                    "title": "MacBook Air M3 13\" 16GB/512GB",
                    "description": "Ультратонкий ноутбук с чипом M3, 18 часов работы, экран Liquid Retina 13.6, Touch ID, MagSafe зарядка.",
                    "short_description": "Мощный и легкий MacBook",
                    "price": 159999.0,
                    "old_price": 179999.0,
                    "quantity": 12,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Lenovo ThinkPad X1 Carbon Gen 11",
                    "description": "Бизнес-ноутбук премиум класса. Intel Core i7-1365U, 32GB RAM, 1TB SSD, экран 14 2.8K OLED.",
                    "short_description": "Премиальный бизнес ноутбук",
                    "price": 189999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
                # Наушники
                {
                    "title": "AirPods Pro 3 с USB-C",
                    "description": "Беспроводные наушники с адаптивным шумоподавлением, пространственным звуком, до 30 часов прослушивания.",
                    "short_description": "TWS наушники Apple",
                    "price": 32999.0,
                    "quantity": 45,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Sony WH-1000XM5",
                    "description": "Полноразмерные наушники с лучшим в классе шумоподавлением, звуком Hi-Res Audio, 30 часов работы.",
                    "short_description": "Студийное качество звука",
                    "price": 29999.0,
                    "old_price": 34999.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                },
                # Планшеты
                {
                    "title": "iPad Pro M4 11\" 256GB",
                    "description": "Профессиональный планшет с M4 чипом, Liquid Retina XDR дисплей, поддержка Apple Pencil Pro, Magic Keyboard.",
                    "short_description": "Планшет для профессионалов",
                    "price": 94999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "clothing": [
                # Мужская одежда
                {
                    "title": "Nike Dri-FIT футболка Premium",
                    "description": "Спортивная футболка из влагоотводящей ткани с антибактериальной обработкой. Стильный крой, 100% полиэстер.",
                    "short_description": "Премиальная спортивная футболка",
                    "price": 3999.0,
                    "old_price": 4999.0,
                    "quantity": 85,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Levi's 511 Slim Jeans",
                    "description": "Классические зауженные джинсы из эластичного денима. Удобная посадка, качественная фурнитура, размеры 28-38.",
                    "short_description": "Стильные зауженные джинсы",
                    "price": 8999.0,
                    "quantity": 60,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Adidas Originals Hoodie",
                    "description": "Культовое худи с логотипом трилистник. Мягкий хлопковый флис, удобный капюшон, карман-кенгуру.",
                    "short_description": "Классическое худи Adidas",
                    "price": 6999.0,
                    "quantity": 45,
                    "status": ProductStatus.ACTIVE
                },
                # Женская одежда
                {
                    "title": "ZARA Платье-миди черное",
                    "description": "Элегантное черное платье с приталенным силуэтом. Идеально для офиса и вечерних мероприятий. Размеры XS-XL.",
                    "short_description": "Элегантное офисное платье",
                    "price": 5999.0,
                    "old_price": 7999.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "H&M Кардиган оверсайз",
                    "description": "Уютный кардиган свободного кроя из мягкой пряжи. Идеален для создания многослойных образов.",
                    "short_description": "Модный оверсайз кардиган",
                    "price": 4999.0,
                    "quantity": 40,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Uniqlo Пуховик Ultra Light Down",
                    "description": "Ультралегкий пуховик, который помещается в сумочку. Водоотталкивающая ткань, гусиный пух премиум качества.",
                    "short_description": "Ультралегкий пуховик",
                    "price": 12999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "shoes": [
                # Кроссовки
                {
                    "title": "Nike Air Max 270 React",
                    "description": "Революционные кроссовки с максимальной амортизацией Air Max и пеной React. Для комфорта на весь день.",
                    "short_description": "Кроссовки с технологией React",
                    "price": 14999.0,
                    "quantity": 50,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Adidas Ultraboost 23",
                    "description": "Беговые кроссовки с возвратом энергии Boost, верхом из Primeknit+, подошвой Continental для любых поверхностей.",
                    "short_description": "Профессиональные беговые кроссовки",
                    "price": 17999.0,
                    "old_price": 19999.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "New Balance 990v6 'Grey'",
                    "description": "Легендарные кроссовки Made in USA. Премиальные материалы, технология ENCAP, вечная классика стиля.",
                    "short_description": "Культовые кроссовки NB",
                    "price": 23999.0,
                    "quantity": 20,
                    "status": ProductStatus.ACTIVE
                },
                # Ботинки
                {
                    "title": "Dr. Martens 1460 Original",
                    "description": "Оригинальные ботинки Dr. Martens из натуральной кожи. Фирменная подошва AirWair, 8 люверсов, желтая прошивка.",
                    "short_description": "Культовые кожаные ботинки",
                    "price": 19999.0,
                    "quantity": 28,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Timberland 6-Inch Premium Boots",
                    "description": "Классические рабочие ботинки из водостойкой кожи нубук. Усиленный мыс, антибактериальная стелька.",
                    "short_description": "Водонепроницаемые ботинки",
                    "price": 16999.0,
                    "quantity": 32,
                    "status": ProductStatus.ACTIVE
                },
                # Женская обувь
                {
                    "title": "Christian Louboutin So Kate 120",
                    "description": "Элегантные туфли-лодочки на каблуке 12 см из натуральной кожи. Культовая красная подошва, размеры 35-41.",
                    "short_description": "Дизайнерские туфли на каблуке",
                    "price": 89999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "home-garden": [
                # Техника для дома
                {
                    "title": "Xiaomi Robot Vacuum S10+",
                    "description": "Умный робот-пылесос с самоочисткой, лазерной навигацией LDS, влажной уборкой. Работа до 180 минут.",
                    "short_description": "Умный пылесос с автоочисткой",
                    "price": 42999.0,
                    "old_price": 49999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Dyson V15 Detect Absolute",
                    "description": "Беспроводной пылесос с лазерным обнаружением пыли, ЖК-экраном, 5 насадок. До 60 минут работы.",
                    "short_description": "Премиум беспроводной пылесос",
                    "price": 54999.0,
                    "quantity": 12,
                    "status": ProductStatus.ACTIVE
                },
                # Кухня
                {
                    "title": "Tefal Ingenio Набор посуды 10 предметов",
                    "description": "Набор сковородок и кастрюль со съемными ручками. Антипригарное покрытие, совместимость с индукцией.",
                    "short_description": "Универсальный набор посуды",
                    "price": 12999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "KitchenAid Artisan Миксер планетарный",
                    "description": "Профессиональный миксер мощностью 325 Вт, чаша 4.8л, 10 скоростей, 3 насадки в комплекте.",
                    "short_description": "Планетарный миксер премиум",
                    "price": 45999.0,
                    "old_price": 52999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
                # Освещение
                {
                    "title": "Philips Hue Smart лампочки E27 набор 3шт",
                    "description": "Умные LED лампочки с 16 миллионами цветов, управление через приложение, совместимость с Алисой.",
                    "short_description": "Умные цветные лампочки",
                    "price": 8999.0,
                    "quantity": 40,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "beauty": [
                # Уход за кожей
                {
                    "title": "The Ordinary Ретинол 0.5% в сквалане",
                    "description": "Антиэйджинг сыворотка с ретинолом для борьбы с морщинами и пигментацией. Подходит для вечернего ухода.",
                    "short_description": "Антиэйджинг сыворотка",
                    "price": 2999.0,
                    "quantity": 120,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "CeraVe Увлажняющий крем для лица",
                    "description": "Гипоаллергенный крем с церамидами и гиалуроновой кислотой. Восстанавливает защитный барьер кожи.",
                    "short_description": "Восстанавливающий крем",
                    "price": 1899.0,
                    "old_price": 2299.0,
                    "quantity": 85,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "La Roche-Posay Anthelios SPF 50+",
                    "description": "Солнцезащитный крем широкого спектра с антиоксидантами. Водостойкий, не оставляет белых следов.",
                    "short_description": "Солнцезащитный крем SPF50+",
                    "price": 2499.0,
                    "quantity": 95,
                    "status": ProductStatus.ACTIVE
                },
                # Декоративная косметика
                {
                    "title": "Fenty Beauty Fenty Icon Тональная основа",
                    "description": "Полнопокрывная тональная основа от Рианны. 50 оттенков, держится до 24 часов, не окисляется.",
                    "short_description": "Тональная основа Fenty Beauty",
                    "price": 4299.0,
                    "quantity": 60,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Charlotte Tilbury Pillow Talk помада",
                    "description": "Культовая помада в оттенке Pillow Talk. Увлажняющая формула, сатиновый финиш, комфорт на 8 часов.",
                    "short_description": "Культовая помада Charlotte Tilbury",
                    "price": 3799.0,
                    "old_price": 4199.0,
                    "quantity": 45,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Urban Decay Naked Heat палетка теней",
                    "description": "12 оттенков в теплой гамме: от нюдовых до насыщенных. Высокопигментированные, стойкие до 12 часов.",
                    "short_description": "Палетка теней в теплых тонах",
                    "price": 5999.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "sports": [
                # Фитнес оборудование
                {
                    "title": "Bowflex Гантели регулируемые 2-24кг",
                    "description": "Инновационные гантели с быстрой регулировкой веса. Заменяют 15 пар обычных гантелей, экономят место.",
                    "short_description": "Умные регулируемые гантели",
                    "price": 15999.0,
                    "old_price": 18999.0,
                    "quantity": 20,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Lululemon Йога-мат The Mat 5мм",
                    "description": "Профессиональный коврик из натурального каучука. Отличное сцепление, долговечность, экологичность.",
                    "short_description": "Премиальный коврик для йоги",
                    "price": 8999.0,
                    "quantity": 50,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "TRX Suspension Trainer HOME2",
                    "description": "Тренажер функционального тренинга. Работа с собственным весом, более 300 упражнений, компактное хранение.",
                    "short_description": "Функциональный тренажер TRX",
                    "price": 12999.0,
                    "quantity": 30,
                    "status": ProductStatus.ACTIVE
                },
                # Велоспорт
                {
                    "title": "Trek Domane AL 2 шоссейный велосипед",
                    "description": "Шоссейный велосипед с алюминиевой рамой, компонентами Shimano Claris, 16 скоростей. Размеры 54-58см.",
                    "short_description": "Шоссейный велосипед Trek",
                    "price": 65999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Specialized Turbo Como 3.0 электровелосипед",
                    "description": "Комфортный электровелосипед с мотором 250W, запас хода до 80км, интегрированные фары, багажник.",
                    "short_description": "Городской электровелосипед",
                    "price": 159999.0,
                    "quantity": 5,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "books": [
                # Художественная литература
                {
                    "title": "Война и мир - Лев Толстой (подарочное издание)",
                    "description": "Классическое произведение в элитном подарочном издании. Кожаный переплет, золотое тиснение, ляссе.",
                    "short_description": "Классика в подарочном издании",
                    "price": 4999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Гарри Поттер. Полное собрание 7 книг",
                    "description": "Полная серия о мальчике-волшебнике в новом переводе. Коллекционный бокс-сет с иллюстрациями.",
                    "short_description": "Полная серия о Гарри Поттере",
                    "price": 8999.0,
                    "old_price": 11999.0,
                    "quantity": 40,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Дюна - Фрэнк Герберт",
                    "description": "Культовая научно-фантастическая сага. Новое издание с эксклюзивной обложкой по мотивам фильма Дени Вильнёва.",
                    "short_description": "Культовая фантастическая сага",
                    "price": 1999.0,
                    "quantity": 60,
                    "status": ProductStatus.ACTIVE
                },
                # Техническая литература
                {
                    "title": "Чистый код - Роберт Мартин",
                    "description": "Руководство по написанию читаемого и поддерживаемого кода. Обязательна к прочтению каждому разработчику.",
                    "short_description": "Руководство по программированию",
                    "price": 2999.0,
                    "quantity": 45,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Python для сложных задач - Дж. ВанДер Плас",
                    "description": "Глубокое изучение Python для анализа данных, машинного обучения и научных вычислений.",
                    "short_description": "Python для профессионалов",
                    "price": 3499.0,
                    "quantity": 30,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "toys": [
                # Конструкторы
                {
                    "title": "LEGO Creator Expert Модульная библиотека",
                    "description": "Детальный конструктор из 2504 деталей. Трехэтажное здание с интерьером, минифигурки. Возраст 16+.",
                    "short_description": "Архитектурный конструктор LEGO",
                    "price": 16999.0,
                    "quantity": 15,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "LEGO Technic Liebherr Экскаватор R 9800",
                    "description": "Масштабная модель экскаватора с 4108 деталей. Функциональные элементы, моторы, приложение для управления.",
                    "short_description": "Техничный экскаватор LEGO",
                    "price": 49999.0,
                    "quantity": 8,
                    "status": ProductStatus.ACTIVE
                },
                # Куклы
                {
                    "title": "Barbie Extra Doll #1 в розовой шубе",
                    "description": "Модная кукла Barbie с роскошными волосами, стильным нарядом и 15+ аксессуарами. Лимитированная серия.",
                    "short_description": "Коллекционная кукла Barbie",
                    "price": 3999.0,
                    "old_price": 4999.0,
                    "quantity": 35,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "LOL Surprise OMG House of Surprises",
                    "description": "Трехэтажный кукольный дом с 85+ сюрпризами. Лифт, бассейн, мебель, световые и звуковые эффекты.",
                    "short_description": "Интерактивный кукольный дом",
                    "price": 24999.0,
                    "quantity": 12,
                    "status": ProductStatus.ACTIVE
                },
                # Развивающие игрушки
                {
                    "title": "VTech KidiZoom Creator Cam HD",
                    "description": "Детская видеокамера HD с зеленым экраном, спецэффектами, играми. Развивает креативность и техническое мышление.",
                    "short_description": "Детская HD видеокамера",
                    "price": 8999.0,
                    "quantity": 25,
                    "status": ProductStatus.ACTIVE
                },
            ],

            "auto": [
                # Аксессуары для авто
                {
                    "title": "Xiaomi 70mai Dash Cam Pro Plus+ A500S",
                    "description": "Видеорегистратор 2.7K с GPS, Wi-Fi, голосовым управлением. Режим парковки, экстренная запись.",
                    "short_description": "Умный видеорегистратор 2.7K",
                    "price": 12999.0,
                    "old_price": 15999.0,
                    "quantity": 30,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Michelin CrossClimate 2 205/55 R16",
                    "description": "Всесезонные шины премиум-класса с технологией 3D самоблокирующихся ламелей. Комплект из 4 шин.",
                    "short_description": "Всесезонные шины Michelin",
                    "price": 28999.0,
                    "quantity": 20,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Bosch Icon Щетки стеклоочистителя 26\"/19\"",
                    "description": "Бескаркасные щетки с технологией PowerProtect. Тихая работа, равномерная очистка, долгий срок службы.",
                    "short_description": "Премиальные щетки стеклоочистителя",
                    "price": 3499.0,
                    "quantity": 50,
                    "status": ProductStatus.ACTIVE
                },
                # Автохимия
                {
                    "title": "Chemical Guys Mr. Pink Шампунь для авто",
                    "description": "Концентрированный автошампунь с pH-сбалансированной формулой. Бережная очистка, не смывает воск.",
                    "short_description": "Профессиональный автошампунь",
                    "price": 1999.0,
                    "quantity": 75,
                    "status": ProductStatus.ACTIVE
                },
                {
                    "title": "Meguiar's Ultimate Liquid Wax",
                    "description": "Синтетический воск для кузова с защитой до 12 месяцев. Глубокий блеск, гидрофобное покрытие.",
                    "short_description": "Долгосрочный воск для авто",
                    "price": 2799.0,
                    "quantity": 40,
                    "status": ProductStatus.ACTIVE
                },
            ],
        }

        # СОЗДАНИЕ ТОВАРОВ С РАСПРЕДЕЛЕНИЕМ ПО МАГАЗИНАМ
        all_products = []
        category_store_mapping = {
            "electronics": [stores[0]],  # TechnoWorld
            "clothing": [stores[1]],  # Fashion Central
            "shoes": [stores[1]],  # Fashion Central
            "home-garden": [stores[3]],  # HomeComfort Studio
            "beauty": [stores[4]],  # Beauty Zone
            "sports": [stores[2]],  # SportLife Pro
            "books": [stores[0], stores[3]],  # TechnoWorld, HomeComfort Studio
            "toys": [stores[5]],  # KidsWorld
            "auto": [stores[0], stores[2]],  # TechnoWorld, SportLife Pro
        }

        for category_slug, products_data in products_by_category.items():
            category = next((c for c in categories if c.slug == category_slug), None)
            if not category:
                continue

            # Получаем магазины для данной категории
            category_stores = category_store_mapping.get(category_slug, [stores[0]])

            for product_data in products_data:
                # Выбираем случайный магазин из подходящих для категории
                store = random.choice(category_stores)

                product_data.update({
                    "store_id": store.id,
                    "category": category_slug,
                    "views": random.randint(25, 800),
                    "favorites": random.randint(3, 120)
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
                    print(f"✅ {category.name}: {product.title} -> {store.name}")
                else:
                    all_products.append(existing)
                    print(f"ℹ️  Товар уже существует: {existing.title}")

        # 5. СОЗДАНИЕ ОТЗЫВОВ НА ТОВАРЫ
        sample_reviews = [
            {"rating": 5, "text": "Превосходное качество! Рекомендую всем без исключения!",
             "pros": "Отличное качество, быстрая доставка", "cons": "Не найдено"},
            {"rating": 5, "text": "Именно то, что искал! Превзошло все ожидания.",
             "pros": "Соответствует описанию, премиум качество", "cons": "Цена"},
            {"rating": 4, "text": "Очень довольна покупкой. Качество на высоте!", "pros": "Качественные материалы",
             "cons": "Долгая доставка"},
            {"rating": 4, "text": "Хороший товар, стоит своих денег.", "pros": "Функциональность, дизайн",
             "cons": "Инструкция на английском"},
            {"rating": 3, "text": "В целом неплохо, но есть нюансы.", "pros": "Доступная цена",
             "cons": "Некоторые детали выглядят дешево"},
            {"rating": 5, "text": "Потрясающий товар! Буду заказывать еще!", "pros": "Невероятное качество",
             "cons": "Нет"},
            {"rating": 4, "text": "Качественно сделано, пользуюсь каждый день.", "pros": "Надежность, удобство",
             "cons": "Мало цветовых вариантов"},
        ]

        # Добавляем отзывы к 70% товаров
        products_with_reviews = random.sample(all_products, int(len(all_products) * 0.7))
        for product in products_with_reviews:
            # 1-5 отзывов на товар
            num_reviews = random.randint(1, 5)
            for _ in range(num_reviews):
                review_data = random.choice(sample_reviews)
                review = ProductReview(
                    product_id=product.id,
                    user_id=random.choice(users).id,
                    rating=review_data["rating"],
                    text=review_data["text"],
                    pros=review_data.get("pros"),
                    cons=review_data.get("cons"),
                    is_verified=random.choice([True, True, False]),  # 67% верифицированных
                    helpful_count=random.randint(0, 25),
                    created_at=datetime.utcnow() - timedelta(days=random.randint(1, 120))
                )
                session.add(review)

        session.commit()
        print(f"✅ Создано отзывов на товары")

        # 6. ОБНОВЛЯЕМ СТАТИСТИКУ КАТЕГОРИЙ
        for category in categories:
            products_count = len(session.exec(select(Product).where(
                Product.category == category.slug,
                Product.status == ProductStatus.ACTIVE
            )).all())

            print(f"📊 {category.name}: {products_count} товаров")

        print(f"\n🎉 ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ УСПЕШНО!")
        print(f"📊 Итоговая статистика:")
        print(f"   • Категорий: {len(categories_data)}")
        print(f"   • Пользователей: {len(users_data)}")
        print(f"   • Магазинов: {len(stores_data)}")
        print(f"   • Товаров ВСЕГО: {sum(len(products) for products in products_by_category.values())}")
        print(f"   • В каждой категории ЕСТЬ товары!")
        print(f"   • Отзывов добавлено к 70% товаров")


if __name__ == "__main__":
    create_test_data()