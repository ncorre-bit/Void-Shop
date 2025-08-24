# backend/models.py - ОПТИМИЗИРОВАННЫЕ МОДЕЛИ
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
from enum import Enum


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tg_id: Optional[int] = Field(default=None, index=True, unique=True)
    username: Optional[str] = Field(default=None, max_length=255)
    first_name: Optional[str] = Field(default=None, max_length=255)
    last_name: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default="Москва", max_length=255)
    registered_at: datetime = Field(default_factory=datetime.utcnow)
    last_active: datetime = Field(default_factory=datetime.utcnow)
    balance: float = Field(default=0.0)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    # НОВЫЕ ПОЛЯ для интеграции с Telegram
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    telegram_data: Optional[str] = Field(default=None, max_length=1000)  # JSON данные

    def full_name(self) -> str:
        """Возвращает полное имя пользователя"""
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) or self.username or f"User{self.tg_id}"


class CaptchaRequest(SQLModel, table=True):
    token: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    answer_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(minutes=6))

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at


# Enum для статусов
class StoreStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BLOCKED = "blocked"


class ProductStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    OUT_OF_STOCK = "out_of_stock"
    ARCHIVED = "archived"


class Store(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=1000)
    short_description: Optional[str] = Field(default=None, max_length=200)

    # Владелец магазина
    owner_id: int = Field(foreign_key="user.id")
    owner: Optional[User] = Relationship()

    # Локация
    city: str = Field(default="Москва", max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)

    # Контакты
    telegram_username: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=255)

    # Статистика
    rating: float = Field(default=0.0)
    total_reviews: int = Field(default=0)
    total_sales: int = Field(default=0)

    # Статус и даты
    status: StoreStatus = Field(default=StoreStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Настройки
    is_featured: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    banner_url: Optional[str] = Field(default=None, max_length=500)

    # Связи
    products: List["Product"] = Relationship(back_populates="store")
    reviews: List["StoreReview"] = Relationship(back_populates="store")


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=2000)
    short_description: Optional[str] = Field(default=None, max_length=300)

    # Связь с магазином
    store_id: int = Field(foreign_key="store.id")
    store: Optional[Store] = Relationship(back_populates="products")

    # Цена и наличие
    price: float = Field(default=0.0)
    old_price: Optional[float] = Field(default=None)
    quantity: int = Field(default=0)

    # Категоризация
    category: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[str] = Field(default=None, max_length=500)

    # Медиа
    images: Optional[str] = Field(default=None, max_length=2000)
    main_image: Optional[str] = Field(default=None, max_length=500)

    # Статус и даты
    status: ProductStatus = Field(default=ProductStatus.DRAFT)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Статистика
    views: int = Field(default=0)
    favorites: int = Field(default=0)

    # SEO
    slug: Optional[str] = Field(default=None, max_length=255, index=True)

    # Связи
    reviews: List["ProductReview"] = Relationship(back_populates="product")


class StoreReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Связи
    store_id: int = Field(foreign_key="store.id")
    store: Optional[Store] = Relationship(back_populates="reviews")

    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship()

    # Контент
    rating: int = Field(ge=1, le=5)
    text: Optional[str] = Field(default=None, max_length=1000)

    # Метаданные
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = Field(default=False)


class ProductReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # Связи
    product_id: int = Field(foreign_key="product.id")
    product: Optional[Product] = Relationship(back_populates="reviews")

    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship()

    # Контент
    rating: int = Field(ge=1, le=5)
    text: Optional[str] = Field(default=None, max_length=1000)
    pros: Optional[str] = Field(default=None, max_length=500)
    cons: Optional[str] = Field(default=None, max_length=500)

    # Медиа
    images: Optional[str] = Field(default=None, max_length=1000)

    # Метаданные
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = Field(default=False)
    helpful_count: int = Field(default=0)


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    slug: str = Field(max_length=100, unique=True, index=True)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: Optional[str] = Field(default=None, max_length=100)
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")

    # Иерархия категорий
    parent: Optional["Category"] = Relationship(
        sa_relationship_kwargs={"remote_side": "Category.id"}
    )

    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# НОВАЯ МОДЕЛЬ для заявок на пополнение баланса
class BalanceRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    tg_id: Optional[int] = Field(default=None)  # Дублируем для удобства
    amount: float = Field(gt=0)  # Сумма пополнения
    method: str = Field(max_length=50)  # card, crypto
    status: str = Field(default="pending", max_length=50)  # pending, approved, rejected

    # Дополнительные данные
    user_name: Optional[str] = Field(default=None, max_length=255)
    user_username: Optional[str] = Field(default=None, max_length=255)
    admin_comment: Optional[str] = Field(default=None, max_length=500)

    # Даты
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = Field(default=None)

    # Связь с пользователем
    user: Optional[User] = Relationship()