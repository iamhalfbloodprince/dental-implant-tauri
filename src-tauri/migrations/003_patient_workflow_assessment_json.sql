-- PRD v3 patient workflow statuses, CBCT flags, structured assessment JSON
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS patients_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  clinic_record_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact TEXT,
  referral_source TEXT,
  referring_doctor TEXT,
  date_first_seen TEXT,
  case_status TEXT NOT NULL DEFAULT 'enquiry',
  cbct_obtained INTEGER NOT NULL DEFAULT 0,
  cbct_reported INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO patients_new (
  id,
  clinic_id,
  clinic_record_number,
  first_name,
  last_name,
  gender,
  date_of_birth,
  phone,
  email,
  address,
  emergency_contact,
  referral_source,
  referring_doctor,
  date_first_seen,
  case_status,
  cbct_obtained,
  cbct_reported,
  notes,
  is_archived,
  created_at,
  updated_at
)
SELECT
  id,
  clinic_id,
  clinic_record_number,
  first_name,
  last_name,
  gender,
  date_of_birth,
  phone,
  email,
  address,
  emergency_contact,
  referral_source,
  referring_doctor,
  date_first_seen,
  CASE trim(case_status)
    WHEN 'New' THEN 'enquiry'
    WHEN 'Assessment pending' THEN 'consultation'
    WHEN 'Treatment planned' THEN 'planning'
    WHEN 'Surgery completed' THEN 'surgery_done'
    WHEN 'Restoration completed' THEN 'restoration'
    WHEN 'Under maintenance' THEN 'osseointegration'
    WHEN 'Closed' THEN 'completed'
    WHEN 'Archived' THEN 'completed'
    ELSE CASE
      WHEN trim(case_status) IN (
        'enquiry',
        'consultation',
        'planning',
        'surgery_scheduled',
        'surgery_done',
        'osseointegration',
        'restoration',
        'completed',
        'failed',
        'on_hold'
      ) THEN trim(case_status)
      ELSE 'enquiry'
    END
  END,
  0,
  0,
  notes,
  is_archived,
  created_at,
  updated_at
FROM patients;

DROP TABLE patients;

ALTER TABLE patients_new RENAME TO patients;

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_archived ON patients(is_archived);

ALTER TABLE assessments ADD COLUMN sections_json TEXT;
ALTER TABLE assessments ADD COLUMN psychological_json TEXT;
ALTER TABLE assessments ADD COLUMN deep_pocket_json TEXT;
ALTER TABLE assessments ADD COLUMN consent_forms_json TEXT;

INSERT INTO schema_migrations (version) VALUES (3);

COMMIT;
PRAGMA foreign_keys = ON;
