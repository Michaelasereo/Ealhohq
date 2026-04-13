-- Performance: common dashboard and list queries filter by therapist, patient, or date.

CREATE INDEX IF NOT EXISTS "therapy_bookings_therapistId_idx" ON "therapy_bookings"("therapistId");
CREATE INDEX IF NOT EXISTS "therapy_bookings_patientId_idx" ON "therapy_bookings"("patientId");
CREATE INDEX IF NOT EXISTS "therapy_bookings_date_idx" ON "therapy_bookings"("date");

CREATE INDEX IF NOT EXISTS "therapy_sessions_therapistId_idx" ON "therapy_sessions"("therapistId");
CREATE INDEX IF NOT EXISTS "therapy_sessions_patientId_idx" ON "therapy_sessions"("patientId");
