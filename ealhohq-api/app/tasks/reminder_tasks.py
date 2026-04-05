from datetime import datetime, timedelta, UTC

from app.tasks.celery import celery


@celery.task(name="app.tasks.reminder_tasks.send_session_reminders")
def send_session_reminders():
    now = datetime.now(UTC)
    in_24h = now + timedelta(hours=24, minutes=5)
    in_1h = now + timedelta(hours=1, minutes=5)

    # Query DB for sessions in [now, in_24h] where reminder24hSent=False.
    # Send WhatsApp + email, then set reminder24hSent=True.
    # Query DB for sessions in [now, in_1h] where reminder1hSent=False.
    # Send WhatsApp + email, then set reminder1hSent=True.
    return {
        "success": True,
        "data": {"processed_at": now.isoformat(), "window_24h": in_24h.isoformat(), "window_1h": in_1h.isoformat()},
        "error": None,
        "meta": {"timestamp": now.isoformat()},
    }
