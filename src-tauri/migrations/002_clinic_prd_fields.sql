-- PRD v3 clinic fields, per-clinic fee schedule, file letter flag
PRAGMA foreign_keys = ON;

ALTER TABLE clinics ADD COLUMN surgeon_name TEXT;
ALTER TABLE clinics ADD COLUMN registration_number TEXT;
ALTER TABLE clinics ADD COLUMN brand_color TEXT;

ALTER TABLE files ADD COLUMN include_in_letter INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS clinic_fee_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clinic_fee_items_clinic ON clinic_fee_items(clinic_id);

INSERT INTO schema_migrations (version) VALUES (2);
