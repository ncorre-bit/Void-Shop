# backend/models.py - ИСПРАВЛЕНО: все datetime теперь timezone-aware
from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
from enum import Enum


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tg_id: Optional[int] = Field(default=None, index=True, unique=True)
    username: Optional[str] = Field(default=None, max_length=255)
    first_name: Optional[str] = Field(default=None, max_length=255)
    last_name: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default="Москва", max_length=255)
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_active: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    balance: float = Field(default=0.0)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    telegram_data: Optional[str] = Field(default=None, max_length=1000)

    # Реферальная система
    referral_code: Optional[str] = Field(default=None, max_length=10, unique=True)
    referred_by: Optional[int] = Field(default=None, foreign_key="user.id")
    total_referral_earnings: float = Field(default=0.0)
    total_deposits: float = Field(default=0.0)

    def full_name(self) -> str:
        parts = []
        if self.first_name:
            parts.append(self.first_name)
        if self.last_name:
            parts.append(self.last_name)
        return " ".join(parts) or self.username or f"User{self.tg_id}"


class CaptchaRequest(SQLModel, table=True):
    token: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    answer_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(minutes=6))

    def is_expired(self) -> bool:
        # ИСПРАВЛЕНО: убеждаемся что оба datetime timezone-aware
        now = datetime.now(timezone.utc)
        expires = self.expires_at

        # Если expires_at по какой-то причине naive, делаем его aware
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

        return now > expires


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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    views: int = Field(default=0)
    favorites: int = Field(default=0)
    slug: Optional[str] = Field(default=None, max_length=255, index=True)

    reviews: List["ProductReview"] = Relationship(back_populates="product")


class BalanceRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(unique=True, index=True)

    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    tg_id: Optional[int] = Field(default=None)

    amount: float = Field(gt=0)
    method: str = Field(max_length=50)

    status: str = Field(default="pending", max_length=50)

    user_name: Optional[str] = Field(default=None, max_length=255)
    user_username: Optional[str] = Field(default=None, max_length=255)

    receipt_path: Optional[str] = Field(default=None, max_length=500)
    receipt_filename: Optional[str] = Field(default=None, max_length=255)
    receipt_mimetype: Optional[str] = Field(default=None, max_length=100)
    receipt_size: Optional[int] = Field(default=None)

    admin_comment: Optional[str] = Field(default=None, max_length=500)
    admin_id: Optional[int] = Field(default=None)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = Field(default=None)
    uploaded_at: Optional[datetime] = Field(default=None)

    user: Optional[User] = Relationship()


class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(max_length=100, unique=True, index=True)
    value: str = Field(max_length=2000)
    description: Optional[str] = Field(default=None, max_length=500)
    category: str = Field(default="general", max_length=50)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    is_protected: bool = Field(default=False)


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
    price: float = Field(gt=0)
    total_amount: float = Field(gt=0)

    status: str = Field(default="pending", max_length=50)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = Field(default=None)

    user_info: Optional[str] = Field(default=None, max_length=1000)


# ИСПРАВЛЕНО: Убрал проблемные Relationship с foreign_keys - упростил структуру
class ReferralStats(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    referrer_id: int = Field(foreign_key="user.id")
    referred_id: int = Field(foreign_key="user.id")

    # Статистика по рефералу
    total_deposits: float = Field(default=0.0)
    total_orders: int = Field(default=0)
    commission_earned: float = Field(default=0.0)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    is_active: bool = Field(default=True)


# Дополнительные модели
class StoreReview(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    store_id: int = Field(foreign_key="store.id")
    store: Optional[Store] = Relationship(back_populates="reviews")
    user_id: int = Field(foreign_key="user.id")
    user: Optional[User] = Relationship()
    rating: int = Field(ge=1, le=5)
    text: Optional[str] = Field(default=None, max_length=1000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_verified: bool = Field(default=False)
    helpful_count: int = Field(default=0)


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True)
    slug: str = Field(max_length=100, unique=True, index=True)
    description: Optional[str] = Field(default=None, max_length=500)
    icon: Optional[str] = Field(default=None, max_length=100)
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id")
    parent: Optional["Category"] = Relationship(sa_relationship_kwargs={"remote_side": "Category.id"})
    is_active: bool = Field(default=True)
    sort_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))