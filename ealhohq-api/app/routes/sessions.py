from datetime import datetime, UTC
from fastapi import APIRouter


router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/{session_id}/cancel")
async def cancel_session(session_id: str):
    return {
        "success": True,
        "data": {"session_id": session_id, "status": "cancelled"},
        "error": None,
        "meta": {"timestamp": datetime.now(UTC).isoformat()},
    }
