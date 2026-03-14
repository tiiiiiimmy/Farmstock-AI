"""
Pydantic v2 models for all FarmStock AI entities.
"""
from pydantic import BaseModel
from typing import Optional, List


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
    name: Optional[str] = None
    region: Optional[str] = None
    farm_type: Optional[str] = None
    herd_size: Optional[int] = None
    land_area_ha: Optional[float] = None
    whatsapp_number: Optional[str] = None
    email: Optional[str] = None


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
    product_name: str
    category: str
    quantity: float
    unit: str
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    supplier_id: Optional[str] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    date: Optional[str] = None
    product_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    supplier_id: Optional[str] = None
    notes: Optional[str] = None


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


class ChatMessage(BaseModel):
    farm_id: str
    message: str
    conversation_history: Optional[List[dict]] = []
