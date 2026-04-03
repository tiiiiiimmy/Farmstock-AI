"""
Pydantic v2 models for all FarmStock AI entities.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, EmailStr

VALID_CATEGORIES = {"feed", "fertiliser", "veterinary", "chemical", "equipment"}
VALID_FARM_TYPES = {"dairy", "beef", "sheep", "mixed"}


def _validate_iso_date(value: str) -> str:
    datetime.strptime(value, "%Y-%m-%d")
    return value


def _clean_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    return value or None


class Farm(BaseModel):
    id: str
    name: str
    region: Optional[str] = None
    farm_type: Optional[str] = None
    herd_size: Optional[int] = None
    land_area_ha: Optional[float] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class FarmUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    region: Optional[str] = Field(default=None, min_length=2, max_length=80)
    farm_type: Optional[str] = None
    herd_size: Optional[int] = Field(default=None, ge=1, le=100000)
    land_area_ha: Optional[float] = Field(default=None, gt=0, le=1000000)
    whatsapp_number: Optional[str] = Field(default=None, min_length=8, max_length=25)
    email: Optional[str] = Field(default=None, min_length=5, max_length=255)

    @field_validator("name", "region", "whatsapp_number", "email", mode="before")
    @classmethod
    def clean_optional_fields(cls, value):
        return _clean_optional_text(value)

    @field_validator("farm_type")
    @classmethod
    def validate_farm_type(cls, value):
        if value is None:
            return value
        if value not in VALID_FARM_TYPES:
            raise ValueError("Farm type must be dairy, beef, sheep, or mixed")
        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        if value is None:
            return value
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return value


class Supplier(BaseModel):
    id: str
    farm_id: str
    name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    categories: Optional[List[str]] = None


class SupplierCreate(BaseModel):
    name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    categories: Optional[List[str]] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    categories: Optional[List[str]] = None


class SupplierProductsRequest(BaseModel):
    product_ids: List[str]


class Order(BaseModel):
    id: str
    farm_id: str
    date: str
    product_name: str
    category: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    supplier_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class OrderCreate(BaseModel):
    date: str
    product_name: str = Field(min_length=2, max_length=160)
    category: str
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=20)
    unit_price: Optional[float] = Field(default=None, ge=0)
    total_price: Optional[float] = Field(default=None, ge=0)
    supplier_id: Optional[str] = Field(default=None, min_length=3, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("date")
    @classmethod
    def validate_date(cls, value):
        return _validate_iso_date(value)

    @field_validator("product_name", "unit", "supplier_id", "notes", mode="before")
    @classmethod
    def clean_text_fields(cls, value):
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("product_name", "unit")
    @classmethod
    def validate_required_text(cls, value):
        if not value:
            raise ValueError("This field is required")
        return value

    @field_validator("category")
    @classmethod
    def validate_category(cls, value):
        if value not in VALID_CATEGORIES:
            raise ValueError("Category must be feed, fertiliser, veterinary, chemical, or equipment")
        return value


class OrderUpdate(BaseModel):
    date: Optional[str] = None
    product_name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    category: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=20)
    unit_price: Optional[float] = Field(default=None, ge=0)
    total_price: Optional[float] = Field(default=None, ge=0)
    supplier_id: Optional[str] = Field(default=None, min_length=3, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("date")
    @classmethod
    def validate_optional_date(cls, value):
        if value is None:
            return value
        return _validate_iso_date(value)

    @field_validator("product_name", "unit", "supplier_id", "notes", mode="before")
    @classmethod
    def clean_optional_order_text(cls, value):
        return _clean_optional_text(value)

    @field_validator("category")
    @classmethod
    def validate_optional_category(cls, value):
        if value is None:
            return value
        if value not in VALID_CATEGORIES:
            raise ValueError("Category must be feed, fertiliser, veterinary, chemical, or equipment")
        return value


class Product(BaseModel):
    id: str
    name: str
    category: str
    shelf_life_days: int
    shelf_life_zone: str
    storage_requirements: Optional[str] = None
    max_stock_factor: float
    typical_unit: str
    description: Optional[str] = None


class Alert(BaseModel):
    id: str
    farm_id: str
    type: str
    title: str
    message: str
    product_id: Optional[str] = None
    status: str
    created_at: Optional[str] = None


class PlaceOrderRequest(BaseModel):
    farm_id: str
    supplier_id: str
    items: List[dict]  # [{product_name, quantity, unit, unit_price}]


class DraftOrderEmailRequest(BaseModel):
    product_name: str
    quantity: float
    unit: str
    supplier_name: str
    supplier_contact: Optional[str] = None


class SendSupplierEmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    farm_name: str
    farm_email: Optional[str] = None


class ChatMessage(BaseModel):
    farm_id: Optional[str] = None  # Deprecated: farm resolved from JWT
    message: str
    conversation_history: Optional[List[dict]] = []


# ── Auth & User models ──────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    subscription_status: str
    trial_ends_at: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
