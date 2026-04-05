-- Enable RLS on all tables
ALTER TABLE shared_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_availability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_availability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_medical_history ENABLE ROW LEVEL SECURITY;

-- Prisma uses camelCase column names in PostgreSQL (quoted identifiers).

-- shared_profiles: users manage own profile
CREATE POLICY "users_own_profile" ON shared_profiles
  FOR ALL USING (auth.uid() = id);

-- therapy_therapists: public read approved, therapist writes own
CREATE POLICY "public_read_approved_therapists" ON therapy_therapists
  FOR SELECT USING (status = 'approved');

CREATE POLICY "therapist_manages_own" ON therapy_therapists
  FOR ALL USING (
    "profileId" = auth.uid()
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
  );

CREATE POLICY "admin_manages_all_therapists" ON therapy_therapists
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- therapy_patients: patient manages own
CREATE POLICY "patient_manages_own" ON therapy_patients
  FOR ALL USING ("profileId" = auth.uid());

CREATE POLICY "therapist_reads_own_patients" ON therapy_patients
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    AND id IN (
      SELECT "patientId" FROM therapy_bookings
      WHERE "therapistId" IN (
        SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
      )
    )
  );

-- therapy_bookings: therapist sees own, patient sees own
CREATE POLICY "therapist_sees_own_bookings" ON therapy_bookings
  FOR ALL USING (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  );

CREATE POLICY "patient_sees_own_bookings" ON therapy_bookings
  FOR SELECT USING ("patientId" IN (
    SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
  ));

-- therapy_session_notes: THERAPIST ONLY - patients have zero access
CREATE POLICY "therapist_only_notes" ON therapy_session_notes
  FOR ALL USING (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  );

-- therapy_availability_schedules: public read, therapist writes own
CREATE POLICY "public_read_availability" ON therapy_availability_schedules
  FOR SELECT USING (true);

CREATE POLICY "therapist_manages_own_availability" ON therapy_availability_schedules
  FOR ALL USING (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  );

-- therapy_availability_overrides: mirror schedules (public read, therapist writes own)
CREATE POLICY "public_read_availability_overrides" ON therapy_availability_overrides
  FOR SELECT USING (true);

CREATE POLICY "therapist_manages_own_overrides" ON therapy_availability_overrides
  FOR ALL USING (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  );

-- therapy_credits: patient sees own only
CREATE POLICY "patient_sees_own_credits" ON therapy_credits
  FOR ALL USING ("patientId" IN (
    SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
  ));

-- therapy_sessions: therapist full access to own; patient read own
CREATE POLICY "therapist_sees_own_sessions" ON therapy_sessions
  FOR ALL USING (
    "therapistId" IN (
      SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
    )
  );

CREATE POLICY "patient_sees_own_sessions" ON therapy_sessions
  FOR SELECT USING (
    "patientId" IN (
      SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
    )
  );

-- therapy_credit_transactions: patient sees own
CREATE POLICY "patient_sees_own_transactions" ON therapy_credit_transactions
  FOR ALL USING ("patientId" IN (
    SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
  ));

-- therapy_medical_history: patient owns; therapist read if they have booked
CREATE POLICY "patient_manages_own_medical_history" ON therapy_medical_history
  FOR ALL USING ("patientId" IN (
    SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
  ));

CREATE POLICY "therapist_reads_patient_medical_history" ON therapy_medical_history
  FOR SELECT USING (
    "patientId" IN (
      SELECT "patientId" FROM therapy_bookings
      WHERE "therapistId" IN (
        SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
      )
      AND "patientId" IS NOT NULL
    )
  );

-- therapy_feedback: patient inserts/select own; therapist sees for their sessions
CREATE POLICY "patient_feedback_own_sessions" ON therapy_feedback
  FOR ALL USING (
    "sessionId" IN (
      SELECT id FROM therapy_sessions
      WHERE "patientId" IN (
        SELECT id FROM therapy_patients WHERE "profileId" = auth.uid()
      )
    )
  );

CREATE POLICY "therapist_reads_session_feedback" ON therapy_feedback
  FOR SELECT USING (
    "sessionId" IN (
      SELECT id FROM therapy_sessions
      WHERE "therapistId" IN (
        SELECT id FROM therapy_therapists WHERE "profileId" = auth.uid()
      )
    )
  );
