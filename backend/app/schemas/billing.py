from typing import List, Optional

from pydantic import BaseModel


class PlanOut(BaseModel):
    id: str
    name: str
    price: int
    credits: int
    features: List[str]
    purchasable: bool
    highlight: bool


class PlansResponse(BaseModel):
    plans: List[PlanOut]
    currency: str = "IDR"
    provider: str = "simulate"


class CheckoutRequest(BaseModel):
    plan: str


class CheckoutResponse(BaseModel):
    orderId: str
    redirectUrl: str
    provider: str
    simulate: bool = False
    token: str = ""


class OrderOut(BaseModel):
    orderId: str
    plan: str
    amount: int
    currency: str
    status: str
    creditsGranted: int
    createdAt: Optional[str] = None
    paidAt: Optional[str] = None


class OrdersResponse(BaseModel):
    orders: List[OrderOut]
