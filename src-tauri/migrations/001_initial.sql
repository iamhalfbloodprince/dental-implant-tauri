-- Dental Implant Case Management — initial schema (PRD v2.0)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_path TEXT,
  letter_header TEXT,
  letter_footer TEXT,
  signature_block TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  title TEXT,
  registration_number TEXT,
  signature_block TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  default_clinic_id INTEGER REFERENCES clinics(id),
  backup_location TEXT,
  export_location TEXT,
  theme TEXT,
  auto_lock_minutes INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
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
  case_status TEXT NOT NULL DEFAULT 'New' CHECK (case_status IN (
    'New','Assessment pending','Treatment planned','Surgery completed','Restoration completed','Under maintenance','Closed','Archived'
  )),
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_archived ON patients(is_archived);

CREATE TABLE IF NOT EXISTS medical_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  diabetes_status TEXT,
  heart_disease INTEGER NOT NULL DEFAULT 0,
  hypertension INTEGER NOT NULL DEFAULT 0,
  bleeding_disorders INTEGER NOT NULL DEFAULT 0,
  osteoporosis INTEGER NOT NULL DEFAULT 0,
  bisphosphonate_use INTEGER NOT NULL DEFAULT 0,
  radiotherapy_history INTEGER NOT NULL DEFAULT 0,
  immunosuppression INTEGER NOT NULL DEFAULT 0,
  allergies TEXT,
  current_medications TEXT,
  smoking_status TEXT,
  alcohol_use TEXT,
  pregnancy_status TEXT,
  asa_classification TEXT,
  medical_notes TEXT,
  flag_uncontrolled_diabetes INTEGER NOT NULL DEFAULT 0,
  flag_heavy_smoking INTEGER NOT NULL DEFAULT 0,
  flag_bisphosphonate INTEGER NOT NULL DEFAULT 0,
  flag_radiotherapy INTEGER NOT NULL DEFAULT 0,
  flag_bleeding_risk INTEGER NOT NULL DEFAULT 0,
  flag_allergy INTEGER NOT NULL DEFAULT 0,
  flag_immunosuppression INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dental_histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  chief_complaint TEXT,
  missing_teeth TEXT,
  previous_implants TEXT,
  periodontal_history TEXT,
  oral_hygiene TEXT,
  caries_risk TEXT,
  bruxism_parafunction TEXT,
  occlusion_notes TEXT,
  denture_history TEXT,
  previous_extractions TEXT,
  aesthetic_concerns TEXT,
  patient_expectations TEXT,
  dental_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  assessment_date TEXT NOT NULL,
  chief_complaint TEXT,
  medical_history_summary TEXT,
  dental_history_summary TEXT,
  clinical_examination TEXT,
  soft_tissue TEXT,
  hard_tissue TEXT,
  periodontal TEXT,
  occlusion TEXT,
  radiographic_findings TEXT,
  cbct_notes TEXT,
  implant_site_selection TEXT,
  bone_quality_notes TEXT,
  bone_quantity_notes TEXT,
  risk_assessment TEXT,
  diagnosis TEXT,
  treatment_options TEXT,
  recommended_treatment_summary TEXT,
  consent_notes TEXT,
  follow_up_plan TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patient_id);

CREATE TABLE IF NOT EXISTS assessment_implant_sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  fdi_tooth TEXT NOT NULL,
  arch TEXT,
  quadrant TEXT,
  missing_tooth_status TEXT,
  planned_implant_site INTEGER NOT NULL DEFAULT 0,
  planned_implant_count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  assessment_id INTEGER REFERENCES assessments(id),
  treatment_objective TEXT,
  proposed_implant_sites TEXT,
  extraction_required INTEGER NOT NULL DEFAULT 0,
  bone_graft_required INTEGER NOT NULL DEFAULT 0,
  sinus_lift_required INTEGER NOT NULL DEFAULT 0,
  soft_tissue_graft_required INTEGER NOT NULL DEFAULT 0,
  guided_surgery_required INTEGER NOT NULL DEFAULT 0,
  temporary_restoration_required INTEGER NOT NULL DEFAULT 0,
  final_restoration_type TEXT,
  estimated_visits INTEGER,
  estimated_timeline TEXT,
  cost_estimate TEXT,
  alternative_options TEXT,
  risks_limitations TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatment_plan_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  treatment_plan_id INTEGER NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN (
    'Consultation','Records and imaging','Extraction if required','Bone graft if required','Implant placement',
    'Healing period','Impression or scan','Restoration','Review','Maintenance'
  )),
  sort_order INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS letter_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  letter_type TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS letters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  template_id INTEGER REFERENCES letter_templates(id),
  letter_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pdf_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_letters_patient ON letters(patient_id);

CREATE TABLE IF NOT EXISTS logbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  clinic_record_number TEXT,
  surgery_date TEXT NOT NULL,
  implant_site TEXT,
  implant_system TEXT,
  implant_dimensions TEXT,
  implant_count INTEGER NOT NULL DEFAULT 1,
  bone_graft INTEGER NOT NULL DEFAULT 0,
  sinus_lift INTEGER NOT NULL DEFAULT 0,
  immediate_placement INTEGER NOT NULL DEFAULT 0,
  immediate_loading INTEGER NOT NULL DEFAULT 0,
  surgeon_name TEXT,
  restoration_type TEXT,
  complication_status INTEGER NOT NULL DEFAULT 0,
  complication_type TEXT,
  outcome TEXT,
  follow_up_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_logbook_clinic ON logbook_entries(clinic_id);
CREATE INDEX IF NOT EXISTS idx_logbook_date ON logbook_entries(surgery_date);

CREATE TABLE IF NOT EXISTS follow_ups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  follow_up_date TEXT NOT NULL,
  follow_up_type TEXT,
  clinical_findings TEXT,
  pain INTEGER NOT NULL DEFAULT 0,
  swelling INTEGER NOT NULL DEFAULT 0,
  bleeding INTEGER NOT NULL DEFAULT 0,
  mobility INTEGER NOT NULL DEFAULT 0,
  peri_implant_tissue TEXT,
  oral_hygiene TEXT,
  radiographic_notes TEXT,
  maintenance_advice TEXT,
  next_review_date TEXT,
  status TEXT NOT NULL DEFAULT 'Stable' CHECK (status IN (
    'Stable','Needs review','Complication suspected','Urgent attention'
  )),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_followups_next ON follow_ups(next_review_date);

CREATE TABLE IF NOT EXISTS complications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  logbook_entry_id INTEGER REFERENCES logbook_entries(id),
  date_identified TEXT NOT NULL,
  severity TEXT,
  complication_type TEXT NOT NULL,
  description TEXT,
  action_taken TEXT,
  outcome TEXT,
  follow_up_required INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id),
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  category TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_files_patient ON files(patient_id);

CREATE TABLE IF NOT EXISTS backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  created_at TEXT NOT NULL,
  size_bytes INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);

INSERT OR IGNORE INTO schema_migrations (version) VALUES (1);
