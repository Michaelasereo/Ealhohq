from datetime import datetime, UTC
from fastapi import APIRouter


router = APIRouter(prefix="/api/patient", tags=["patient"])


@router.get("/sessions")
async def patient_sessions():
    return {
        "success": True,
        "data": {"upcoming": [], "past": []},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }


@router.get("/history")
async def patient_history():
    return {
        "success": True,
        "data": {"items": [], "page": 1, "page_size": 10, "total": 0},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }


@router.post("/profile")
async def update_patient_profile():
    return {
        "success": True,
        "data": {"updated": True},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }
