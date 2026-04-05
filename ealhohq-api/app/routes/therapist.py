from datetime import datetime, UTC
from fastapi import APIRouter


router = APIRouter(prefix="/api/therapist", tags=["therapist"])


@router.get("/sessions/{session_id}")
async def therapist_session_detail(session_id: str):
    return {
        "success": True,
        "data": {"session_id": session_id},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }


@router.get("/clients/{client_id}")
async def therapist_client_detail(client_id: str):
    return {
        "success": True,
        "data": {"client_id": client_id, "sessions": []},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }
