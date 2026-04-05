import os
import httpx


WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")


async def _send_whatsapp_message(phone: str, message: str) -> dict:
    url = f"https://graph.facebook.com/v20.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        return response.json()


async def send_session_reminder(
    phone: str,
    patient_name: str,
    therapist_name: str,
    session_date: str,
    session_time: str,
    session_link: str,
    hours_before: int,
):
    if hours_before == 24:
        message = f"""Hi {patient_name}! 👋

Reminder: You have a therapy session tomorrow.

🗓 Date: {session_date}
🕐 Time: {session_time} WAT
👨‍⚕️ Therapist: {therapist_name}

Join here: {session_link}

Reply HELP if you need to reschedule."""
    elif hours_before == 1:
        message = f"""Hi {patient_name}! Your session starts in 1 hour.

👨‍⚕️ Therapist: {therapist_name}
🕐 Time: {session_time} WAT

Join here: {session_link}

See you soon! 💙"""
    else:
        raise ValueError("hours_before must be 24 or 1")

    return await _send_whatsapp_message(phone=phone, message=message)
