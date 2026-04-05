from datetime import datetime, UTC
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix="/api", tags=["bookings"])


class CreditsPurchaseBody(BaseModel):
    package: Literal["bronze", "silver", "gold", "platinum"]


class CreditsConfirmBody(BaseModel):
    reference: str


PACKAGE_MAP = {
    "bronze": {"credits": 2, "amount": 28000},
    "silver": {"credits": 4, "amount": 54000},
    "gold": {"credits": 8, "amount": 100000},
    "platinum": {"credits": 12, "amount": 144000},
}


@router.post("/credits/purchase")
async def purchase_credits(body: CreditsPurchaseBody):
    config = PACKAGE_MAP[body.package]
    return {
        "success": True,
        "data": {
            "reference": f"psk_ref_{int(datetime.now(UTC).timestamp())}",
            "metadata": {
                "product": "therapy",
                "type": "credit_purchase",
                "package": body.package,
                "patient_id": "jwt_patient_id",
                "credits": config["credits"],
            },
            "amount": config["amount"],
        },
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/credits/confirm")
async def confirm_credits(body: CreditsConfirmBody):
    return {
        "success": True,
        "data": {"reference": body.reference, "status": "confirmed"},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }


@router.get("/credits/balance")
async def credit_balance():
    return {
        "success": True,
        "data": {
            "balance": 4,
            "tier": "Silver",
            "transactions": [],
        },
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/credits/use")
async def use_credit():
    return {
        "success": True,
        "data": {"balance": 3},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }
