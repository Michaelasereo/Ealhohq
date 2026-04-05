from fastapi import FastAPI

from app.routes.bookings import router as bookings_router
from app.routes.patient import router as patient_router
from app.routes.sessions import router as sessions_router
from app.routes.therapist import router as therapist_router


app = FastAPI(title="Ealho Therapy API")
app.include_router(bookings_router)
app.include_router(patient_router)
app.include_router(sessions_router)
app.include_router(therapist_router)
