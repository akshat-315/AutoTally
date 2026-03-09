from datetime import datetime, date, timezone
from typing import Optional

from sqlalchemy import String, Integer, Float, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    vpa: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    primary_merchant_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("merchants.id"), nullable=True
    )
    is_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    times_confirmed: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str] = mapped_column(String, default="pending")
    first_seen: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
    last_seen: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    sms_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    direction: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    bank: Mapped[str] = mapped_column(String, nullable=False)
    merchant_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("merchants.id"), nullable=True
    )
    merchant_raw: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    account_last4: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    vpa: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    upi_ref: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    transaction_date: Mapped[date] = mapped_column(nullable=False)
    category_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("categories.id"), nullable=True
    )
    raw_sms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sms_sender: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sms_received_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(timezone.utc))
