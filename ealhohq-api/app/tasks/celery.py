from celery import Celery
from celery.schedules import crontab


celery = Celery("ealhohq_api")
celery.conf.update(
    broker_url="redis://localhost:6379/0",
    result_backend="redis://localhost:6379/1",
)
celery.conf.beat_schedule = {
    "send-session-reminders-every-30-minutes": {
        "task": "app.tasks.reminder_tasks.send_session_reminders",
        "schedule": crontab(minute="*/30"),
    }
}
