# backend/models.py (обновленный)
from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime, timedelta
import uuid


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