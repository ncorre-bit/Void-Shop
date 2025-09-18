# backend/models.py - ИСПРАВЛЕНО: добавлена поддержка файлов чеков
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
    balance: float = Field(default=0.0)  # ИСПРАВЛЕНО: Основной баланс пользователя
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    telegram_data: Optional[str] = Field(default=None, max_length=1000)

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

    owner_id: int = Field(foreign_key="user.id")
    owner: Optional[User] = Relationship()

    city: str = Field(default="Москва", max_length=255)
    address: Optional[str] = Field(default=None, max_length=500)
    telegram_username: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    email: Optional[str] = Field(default=None, max_length=255)

    rating: float = Field(default=0.0)
    total_reviews: int = Field(default=0)
    total_sales: int = Field(default=0)

    status: StoreStatus = Field(default=StoreStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    is_featured: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    banner_url: Optional[str] = Field(default=None, max_length=500)

    products: List["Product"] = Relationship(back_populates="store")
    reviews: List["StoreReview"] = Relationship(back_populates="store")


class Product(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=2000)
    short_description: Optional[str] = Field(default=None, max_length=300)

    store_id: int = Field(foreign_key="store.id")
    store: Optional[Store] = Relationship(back_populates="products")

    price: float = Field(default=0.0)
    old_price: Optional[float] = Field(default=None)
    quantity: int = Field(default=0)

    category: Optional[str] = Field(default=None, max_length=100)
    tags: Optional[str] = Field(default=None, max_length=500)

    images: Optional[str] = Field(default=None, max_length=2000)
    main_image: Optional[str] = Field(default=None, max_length=500)

    status: ProductStatus = Field(default=ProductStatus.DRAFT)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    views: int = Field(default=0)
    favorites: int = Field(default=0)
    slug: Optional[str] = Field(default=None, max_length=255, index=True)

    reviews: List["ProductReview"] = Relationship(back_populates="product")


class StoreReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    store_id: int = Field(foreign_key="store.id")
    store: Optional[Store] = Relationship(back_populates="reviews")

    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship()

    rating: int = Field(ge=1, le=5)
    text: Optional[str] = Field(default=None, max_length=1000)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_verified: bool = Field(default=False)


class ProductReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    product_id: int = Field(foreign_key="product.id")
    product: Optional[Product] = Relationship(back_populates="reviews")

    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship()

    rating: int = Field(ge=1, le=5)
    text: Optional[str] = Field(default=None, max_length=1000)
    pros: Optional[str] = Field(default=None, max_length=500)
    cons: Optional[str] = Field(default=None, max_length=500)
    images: Optional[str] = Field(default=None, max_length=1000)

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

    parent: Optional["Category"] = Relationship(
        sa_relationship_kwargs={"remote_side": "Category.id"}
    )

    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ИСПРАВЛЕНО: Полная модель для пополнения баланса с файлами
class BalanceRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(unique=True, index=True)  # Уникальный номер заявки

    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    tg_id: Optional[int] = Field(default=None)

    amount: float = Field(gt=0)
    method: str = Field(max_length=50)  # card, crypto

    # КРИТИЧНО: Статусы заявки
    status: str = Field(default="pending", max_length=50)
    # pending -> receipt_uploaded -> waiting_admin -> approved/rejected

    # Информация о пользователе
    user_name: Optional[str] = Field(default=None, max_length=255)
    user_username: Optional[str] = Field(default=None, max_length=255)

    # НОВОЕ: Поддержка файлов чеков
    receipt_path: Optional[str] = Field(default=None, max_length=500)
    receipt_filename: Optional[str] = Field(default=None, max_length=255)
    receipt_mimetype: Optional[str] = Field(default=None, max_length=100)
    receipt_size: Optional[int] = Field(default=None)

    # Админская обработка
    admin_comment: Optional[str] = Field(default=None, max_length=500)
    admin_id: Optional[int] = Field(default=None)  # ID админа который обработал

    # Временные метки
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = Field(default=None)  # Когда админ обработал
    uploaded_at: Optional[datetime] = Field(default=None)  # Когда загружен чек

    user: Optional[User] = Relationship()


# НОВОЕ: Аудит операций с балансом
class BalanceAudit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: int = Field(foreign_key="user.id")
    balance_request_id: Optional[int] = Field(default=None, foreign_key="balancerequest.id")

    # Что произошло
    action: str = Field(max_length=100)  # created, uploaded_receipt, marked_paid, approved, rejected
    old_status: Optional[str] = Field(default=None, max_length=50)
    new_status: Optional[str] = Field(default=None, max_length=50)

    # Финансовые изменения
    old_balance: Optional[float] = Field(default=None)
    new_balance: Optional[float] = Field(default=None)
    amount_changed: Optional[float] = Field(default=None)

    # Кто сделал
    admin_id: Optional[int] = Field(default=None)
    admin_name: Optional[str] = Field(default=None, max_length=255)

    # Когда и комментарий
    created_at: datetime = Field(default_factory=datetime.utcnow)
    comment: Optional[str] = Field(default=None, max_length=500)

    # Связи
    user: Optional[User] = Relationship()
    balance_request: Optional[BalanceRequest] = Relationship()


# НОВОЕ: Настройки системы (для гибких реквизитов)
class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(max_length=100, unique=True, index=True)
    value: str = Field(max_length=2000)
    description: Optional[str] = Field(default=None, max_length=500)
    category: str = Field(default="general", max_length=50)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Для безопасности - только админы могут изменять
    is_protected: bool = Field(default=False)


# Модель для заказов
class Order(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(unique=True, index=True)

    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship()

    product_id: int = Field(foreign_key="product.id")
    product: Optional[Product] = Relationship()

    store_id: int = Field(foreign_key="store.id")
    store: Optional[Store] = Relationship()

    quantity: int = Field(default=1, gt=0)
    price: float = Field(gt=0)  # Цена на момент покупки
    total_amount: float = Field(gt=0)

    status: str = Field(default="pending", max_length=50)  # pending, completed, cancelled

    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None)

    # Дополнительная информация
    user_info: Optional[str] = Field(default=None, max_length=1000)  # JSON данные о покупателе