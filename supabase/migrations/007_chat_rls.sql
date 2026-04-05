-- Chat RLS (Prisma uses quoted camelCase columns). Run after Prisma migration applied.
-- Enables Supabase Realtime + direct client access with user JWT.

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_consents ENABLE ROW LEVEL SECURITY;

-- chat_threads: patient
CREATE POLICY "chat_threads_patient_all" ON chat_threads
  FOR ALL
  USING (
    "patientId" IN (
      SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
    )
  )
  WITH CHECK (
    "patientId" IN (
      SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
    )
  );

-- chat_threads: therapist
CREATE POLICY "chat_threads_therapist_all" ON chat_threads
  FOR ALL
  USING (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  )
  WITH CHECK (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  );

-- chat_messages: patient (participant threads only)
CREATE POLICY "chat_messages_patient_all" ON chat_messages
  FOR ALL
  USING (
    "threadId" IN (
      SELECT id FROM chat_threads
      WHERE "patientId" IN (
        SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
      )
    )
  )
  WITH CHECK (
    "threadId" IN (
      SELECT id FROM chat_threads
      WHERE "patientId" IN (
        SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
      )
    )
  );

-- chat_messages: therapist
CREATE POLICY "chat_messages_therapist_all" ON chat_messages
  FOR ALL
  USING (
    "threadId" IN (
      SELECT id FROM chat_threads
      WHERE "therapistId" IN (
        SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
      )
    )
  )
  WITH CHECK (
    "threadId" IN (
      SELECT id FROM chat_threads
      WHERE "therapistId" IN (
        SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
      )
    )
  );

-- No admin policies on chat_messages (metadata dashboards use service role / Prisma server-side).

-- chat_consents: patient only
CREATE POLICY "chat_consents_patient_all" ON chat_consents
  FOR ALL
  USING (
    "patientId" IN (
      SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
    )
  )
  WITH CHECK (
    "patientId" IN (
      SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
    )
  );

-- chat_audit_logs: no client policies (API uses Prisma / service role)
