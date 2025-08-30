# backend/routes/store.py - ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ БАГОВ
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select
from backend.db import get_session
from backend.models import Store, Product, Category, StoreStatus, ProductStatus
from datetime import datetime
from typing import List, Optional
import logging

router = APIRouter(prefix='/api/stores')
logger = logging.getLogger(__name__)


# Pydantic модели для API
class StoreOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    short_description: Optional[str]
    city: str
    rating: float
    total_reviews: int
    total_sales: int
    status: str
    is_featured: bool
    avatar_url: Optional[str]
    created_at: datetime
    telegram_username: Optional[str]


class StoreDetailOut(StoreOut):
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    banner_url: Optional[str]
    products_count: int


class ProductOut(BaseModel):
    id: int
    title: str
    short_description: Optional[str]
    description: Optional[str]
    price: float
    old_price: Optional[float]
    main_image: Optional[str]
    images: Optional[str]
    category: Optional[str]
    status: str
    store_name: str
    store_id: int
    quantity: int
    views: int


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    icon: Optional[str]
    description: Optional[str]
    products_count: int


@router.get('', response_model=List[StoreOut])
def get_stores(
        city: Optional[str] = Query(default="Москва", description="Город"),
        featured: Optional[bool] = Query(default=None, description="Только рекомендуемые"),
        category: Optional[str] = Query(default=None, description="Категория товаров"),
        search: Optional[str] = Query(default=None, description="Поиск по названию"),
        limit: int = Query(default=20, le=100, description="Количество результатов"),
        offset: int = Query(default=0, description="Смещение")
):
    """Получает список магазинов с фильтрацией"""

    logger.info(f"Запрос магазинов: city={city}, featured={featured}, search={search}")

    with get_session() as session:
        # Базовый запрос только активных магазинов
        stmt = select(Store).where(Store.status == StoreStatus.ACTIVE)

        # Показываем магазины из всех городов, но приоритет выбранному городу
        if city:
            stmt = stmt.order_by(
                (Store.city == city).desc(),  # Сначала из текущего города
                Store.is_featured.desc(),
                Store.rating.desc()
            )
        else:
            stmt = stmt.order_by(Store.is_featured.desc(), Store.rating.desc())

        # Только рекомендуемые
        if featured is True:
            stmt = stmt.where(Store.is_featured == True)

        # Поиск по названию
        if search:
            search_term = f"%{search.lower()}%"
            stmt = stmt.where(Store.name.ilike(search_term))

        # Фильтр по категории - находим магазины с товарами данной категории
        if category:
            # Подзапрос: магазины, у которых есть товары в данной категории
            subquery = select(Product.store_id).where(
                Product.category == category,
                Product.status == ProductStatus.ACTIVE
            ).distinct()
            stmt = stmt.where(Store.id.in_(subquery))

        # Пагинация
        stmt = stmt.offset(offset).limit(limit)

        stores = session.exec(stmt).all()
        logger.info(f"Найдено магазинов: {len(stores)}")

        return [
            StoreOut(
                id=store.id,
                name=store.name,
                description=store.description,
                short_description=store.short_description,
                city=store.city,
                rating=store.rating,
                total_reviews=store.total_reviews,
                total_sales=store.total_sales,
                status=store.status.value,
                is_featured=store.is_featured,
                avatar_url=store.avatar_url,
                created_at=store.created_at,
                telegram_username=store.telegram_username
            ) for store in stores
        ]


@router.get('/{store_id}', response_model=StoreDetailOut)
def get_store_detail(store_id: int):
    """Получает детальную информацию о магазине"""

    logger.info(f"Запрос деталей магазина: {store_id}")

    with get_session() as session:
        store = session.get(Store, store_id)

        if not store:
            raise HTTPException(status_code=404, detail='Магазин не найден')

        if store.status != StoreStatus.ACTIVE:
            raise HTTPException(status_code=403, detail='Магазин недоступен')

        # Считаем количество товаров
        products_count_stmt = select(Product).where(
            Product.store_id == store_id,
            Product.status == ProductStatus.ACTIVE
        )
        products_count = len(session.exec(products_count_stmt).all())

        return StoreDetailOut(
            id=store.id,
            name=store.name,
            description=store.description,
            short_description=store.short_description,
            city=store.city,
            address=store.address,
            phone=store.phone,
            email=store.email,
            rating=store.rating,
            total_reviews=store.total_reviews,
            total_sales=store.total_sales,
            status=store.status.value,
            is_featured=store.is_featured,
            avatar_url=store.avatar_url,
            banner_url=store.banner_url,
            created_at=store.created_at,
            telegram_username=store.telegram_username,
            products_count=products_count
        )


@router.get('/{store_id}/products', response_model=List[ProductOut])
def get_store_products(
        store_id: int,
        category: Optional[str] = Query(default=None, description="Категория"),
        limit: int = Query(default=20, le=50),
        offset: int = Query(default=0)
):
    """Получает товары конкретного магазина"""

    with get_session() as session:
        # Проверяем существование магазина
        store = session.get(Store, store_id)
        if not store or store.status != StoreStatus.ACTIVE:
            raise HTTPException(status_code=404, detail='Магазин не найден')

        # Запрос товаров
        stmt = select(Product).where(
            Product.store_id == store_id,
            Product.status == ProductStatus.ACTIVE
        )

        if category:
            stmt = stmt.where(Product.category == category)

        stmt = stmt.order_by(Product.created_at.desc())
        stmt = stmt.offset(offset).limit(limit)

        products = session.exec(stmt).all()

        return [
            ProductOut(
                id=product.id,
                title=product.title,
                short_description=product.short_description,
                description=product.description,
                price=product.price,
                old_price=product.old_price,
                main_image=product.main_image,
                images=product.images,
                category=product.category,
                status=product.status.value,
                store_name=store.name,
                store_id=store.id,
                quantity=product.quantity,
                views=product.views
            ) for product in products
        ]


@router.get('/categories/', response_model=List[CategoryOut])
def get_categories():
    """Получает список категорий с количеством товаров"""

    with get_session() as session:
        # Берем только активные категории
        categories_stmt = select(Category).where(Category.is_active == True)
        categories_stmt = categories_stmt.order_by(Category.sort_order, Category.name)
        categories = session.exec(categories_stmt).all()

        result = []
        for category in categories:
            # Считаем количество активных товаров в категории
            products_stmt = select(Product).where(
                Product.category == category.slug,
                Product.status == ProductStatus.ACTIVE
            )
            products_count = len(session.exec(products_stmt).all())

            result.append(CategoryOut(
                id=category.id,
                name=category.name,
                slug=category.slug,
                icon=category.icon,
                description=category.description,
                products_count=products_count
            ))

        return result


@router.get('/featured/', response_model=List[StoreOut])
def get_featured_stores(limit: int = Query(default=6, le=12)):
    """Получает рекомендуемые магазины"""

    with get_session() as session:
        stmt = select(Store).where(
            Store.status == StoreStatus.ACTIVE,
            Store.is_featured == True
        ).order_by(Store.rating.desc()).limit(limit)

        stores = session.exec(stmt).all()

        return [
            StoreOut(
                id=store.id,
                name=store.name,
                description=store.description,
                short_description=store.short_description,
                city=store.city,
                rating=store.rating,
                total_reviews=store.total_reviews,
                total_sales=store.total_sales,
                status=store.status.value,
                is_featured=store.is_featured,
                avatar_url=store.avatar_url,
                created_at=store.created_at,
                telegram_username=store.telegram_username
            ) for store in stores
        ]


# ИСПРАВЛЕНО: убираем обязательность query параметра
@router.get('/search/', response_model=List[ProductOut])
def search_products(
        query: str = Query(default="", description="Поисковый запрос"),  # ИСПРАВЛЕНО: убрали обязательность
        category: Optional[str] = Query(default=None),
        city: Optional[str] = Query(default="Москва"),
        limit: int = Query(default=50, le=100),
        offset: int = Query(default=0)
):
    """Глобальный поиск товаров по всем магазинам"""

    # ИСПРАВЛЕНО: логируем все параметры
    logger.info(f"Поиск товаров: query='{query}', category={category}, city={city}")

    with get_session() as session:
        # Базовый запрос активных товаров из активных магазинов
        stmt = select(Product, Store).join(Store).where(
            Product.status == ProductStatus.ACTIVE,
            Store.status == StoreStatus.ACTIVE
        )

        # ИСПРАВЛЕНО: если есть запрос - ищем по названию
        if query and query.strip():
            search_term = f"%{query.lower()}%"
            stmt = stmt.where(Product.title.ilike(search_term))

        # Фильтр по категории
        if category:
            stmt = stmt.where(Product.category == category)

        # Приоритет товарам из выбранного города
        if city:
            stmt = stmt.order_by(
                (Store.city == city).desc(),
                Product.views.desc(),
                Product.created_at.desc()
            )
        else:
            stmt = stmt.order_by(Product.views.desc(), Product.created_at.desc())

        stmt = stmt.offset(offset).limit(limit)
        results = session.exec(stmt).all()

        logger.info(f"Найдено товаров: {len(results)}")

        return [
            ProductOut(
                id=product.id,
                title=product.title,
                short_description=product.short_description,
                description=product.description,
                price=product.price,
                old_price=product.old_price,
                main_image=product.main_image,
                images=product.images,
                category=product.category,
                status=product.status.value,
                store_name=store.name,
                store_id=store.id,
                quantity=product.quantity,
                views=product.views
            ) for product, store in results
        ]


@router.get('/product/{product_id}', response_model=ProductOut)
def get_product_detail(product_id: int):
    """Получает детальную информацию о товаре"""

    logger.info(f"Запрос товара: {product_id}")

    with get_session() as session:
        # Получаем товар с информацией о магазине
        stmt = select(Product, Store).join(Store).where(
            Product.id == product_id,
            Product.status == ProductStatus.ACTIVE,
            Store.status == StoreStatus.ACTIVE
        )
        result = session.exec(stmt).first()

        if not result:
            raise HTTPException(status_code=404, detail='Товар не найден или недоступен')

        product, store = result

        # Увеличиваем счетчик просмотров
        try:
            product.views += 1
            session.add(product)
            session.commit()
        except Exception as e:
            logger.warning(f"Не удалось увеличить счетчик просмотров: {e}")

        return ProductOut(
            id=product.id,
            title=product.title,
            short_description=product.short_description,
            description=product.description,
            price=product.price,
            old_price=product.old_price,
            main_image=product.main_image,
            images=product.images,
            category=product.category,
            status=product.status.value,
            store_name=store.name,
            store_id=store.id,
            quantity=product.quantity,
            views=product.views
        )


@router.get('/category/{category_slug}', response_model=List[ProductOut])
def get_category_products(
        category_slug: str,
        city: Optional[str] = Query(default="Москва"),
        limit: int = Query(default=50, le=100),
        offset: int = Query(default=0)
):
    """Получает товары конкретной категории"""

    logger.info(f"Запрос товаров категории: {category_slug}, city={city}")

    with get_session() as session:
        # Проверяем существование категории
        category = session.exec(select(Category).where(
            Category.slug == category_slug,
            Category.is_active == True
        )).first()

        if not category:
            raise HTTPException(status_code=404, detail='Категория не найдена')

        # Получаем товары категории
        stmt = select(Product, Store).join(Store).where(
            Product.category == category_slug,
            Product.status == ProductStatus.ACTIVE,
            Store.status == StoreStatus.ACTIVE
        )

        # Приоритет товарам из выбранного города
        if city:
            stmt = stmt.order_by(
                (Store.city == city).desc(),
                Product.views.desc(),
                Product.created_at.desc()
            )
        else:
            stmt = stmt.order_by(Product.views.desc(), Product.created_at.desc())

        stmt = stmt.offset(offset).limit(limit)
        results = session.exec(stmt).all()

        logger.info(f"Найдено товаров в категории {category_slug}: {len(results)}")

        return [
            ProductOut(
                id=product.id,
                title=product.title,
                short_description=product.short_description,
                description=product.description,
                price=product.price,
                old_price=product.old_price,
                main_image=product.main_image,
                images=product.images,
                category=product.category,
                status=product.status.value,
                store_name=store.name,
                store_id=store.id,
                quantity=product.quantity,
                views=product.views
            ) for product, store in results
        ]