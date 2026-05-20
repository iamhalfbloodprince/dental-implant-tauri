use rusqlite::Connection;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

pub fn app_data_root(app: &AppHandle) -> Result<std::path::PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| e.to_string())?
    .join("dental-implant");
  fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("database")).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("files")).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("files/patients")).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("backups")).map_err(|e| e.to_string())?;
  fs::create_dir_all(dir.join("exports")).map_err(|e| e.to_string())?;
  Ok(dir)
}

pub fn db_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
  Ok(app_data_root(app)?.join("database").join("app.sqlite"))
}

pub fn connect_and_migrate(path: &Path) -> Result<Connection, String> {
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }
  let conn = Connection::open(path).map_err(|e| e.to_string())?;
  conn
    .execute_batch(include_str!("../migrations/001_initial.sql"))
    .map_err(|e| e.to_string())?;
  run_pending_migrations(&conn)?;
  seed_letter_templates(&conn)?;
  Ok(conn)
}

fn run_pending_migrations(conn: &Connection) -> Result<(), String> {
  let mut current: i64 = conn
    .query_row(
      "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);
  if current < 2 {
    conn
      .execute_batch(include_str!("../migrations/002_clinic_prd_fields.sql"))
      .map_err(|e| e.to_string())?;
    backfill_clinic_fee_items(conn)?;
    current = conn
      .query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0);
  }
  if current < 3 {
    conn
      .execute_batch(include_str!("../migrations/003_patient_workflow_assessment_json.sql"))
      .map_err(|e| e.to_string())?;
    current = conn
      .query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0);
  }
  if current < 4 {
    conn
      .execute_batch(include_str!("../migrations/004_prd_letters_files_logbook_patient.sql"))
      .map_err(|e| e.to_string())?;
  }
  if current < 5 {
    conn
      .execute_batch(include_str!("../migrations/005_security_questions.sql"))
      .map_err(|e| e.to_string())?;
  }
  if current < 6 {
    conn
      .execute_batch(include_str!("../migrations/006_backup_tracking.sql"))
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn backfill_clinic_fee_items(conn: &Connection) -> Result<(), String> {
  let n: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='clinic_fee_items'",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);
  if n == 0 {
    return Ok(());
  }
  let mut stmt = conn
    .prepare("SELECT id FROM clinics")
    .map_err(|e| e.to_string())?;
  let ids: Vec<i64> = {
    let rows = stmt
      .query_map([], |r| r.get(0))
      .map_err(|e| e.to_string())?;
    rows.map(|x| x.map_err(|e| e.to_string())).collect::<Result<_, _>>()?
  };
  for id in ids {
    seed_default_clinic_fee_items(conn, id)?;
  }
  Ok(())
}

/// Default fee rows for a clinic (PRD); no-op if items already exist or table missing.
pub(crate) fn seed_default_clinic_fee_items(
  conn: &Connection,
  clinic_id: i64,
) -> Result<(), String> {
  let n: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM clinic_fee_items WHERE clinic_id = ?1",
      [clinic_id],
      |r| r.get(0),
    )
    .unwrap_or(0);
  if n > 0 {
    return Ok(());
  }
  let now = now_iso();
  let rows: &[(&str, &str, i64)] = &[
    ("Implant consultation", "Consultation", 150_00),
    ("Diagnostic imaging (CBCT / radiographs)", "Imaging", 250_00),
    ("Single tooth implant placement", "Surgery", 2_500_00),
    ("Bone grafting / augmentation", "Surgery", 800_00),
    ("Sinus lift procedure", "Surgery", 1_200_00),
    ("Healing abutment / uncovering", "Prosthetics", 350_00),
    ("Implant crown (single unit)", "Prosthetics", 1_100_00),
    ("Full-arch provisional review", "Prosthetics", 450_00),
  ];
  for (i, (name, cat, cents)) in rows.iter().enumerate() {
    conn
      .execute(
        "INSERT INTO clinic_fee_items (clinic_id, item_name, category, price_cents, is_active, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6, ?7)",
        rusqlite::params![clinic_id, name, cat, cents, i as i64, &now, &now],
      )
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn seed_letter_templates(conn: &Connection) -> Result<(), String> {
  let n: i64 = conn
    .query_row("SELECT COUNT(*) FROM letter_templates", [], |r| r.get(0))
    .map_err(|e| e.to_string())?;
  if n > 0 {
    return Ok(());
  }
  let now = chrono::Utc::now().to_rfc3339();
  let templates: &[(&str, &str, &str)] = &[
    (
      "Patient treatment summary",
      "Patient treatment summary",
      "Dear Colleague,\n\nThis letter summarizes the implant treatment for {{patient_name}} (DOB {{patient_dob}}, ID {{patient_id}}) at {{clinic_name}}.\n\nDiagnosis: {{diagnosis}}\nTreatment plan: {{treatment_plan}}\nImplant sites: {{implant_sites}}\nRisk notes: {{risk_notes}}\n\nYours sincerely,\n{{doctor_name}}\n",
    ),
    (
      "Referral letter",
      "Referral letter",
      "Dear Doctor,\n\nI am referring {{patient_name}} for implant assessment.\n\nClinical summary: {{diagnosis}}\nRelevant medical notes: {{risk_notes}}\n\nThank you,\n{{doctor_name}}\n{{clinic_name}}\n{{clinic_phone}}\n",
    ),
    (
      "Custom",
      "Custom",
      "{{patient_name}}\n\n",
    ),
  ];
  for (name, letter_type, body) in templates {
    conn
      .execute(
        "INSERT INTO letter_templates (name, letter_type, body, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![name, letter_type, body, now, now],
      )
      .map_err(|e| e.to_string())?;
  }
  Ok(())
}

pub fn now_iso() -> String {
  chrono::Utc::now().to_rfc3339()
}

pub fn has_user_account(conn: &Connection) -> bool {
  conn
    .query_row("SELECT COUNT(*) FROM users WHERE id = 1", [], |r| r.get::<_, i64>(0))
    .unwrap_or(0)
    > 0
}

/// All clinical data commands must call this after account exists.
pub fn require_authenticated(conn: &Connection, authed: bool) -> Result<(), String> {
  if !has_user_account(conn) {
    return Err("Account not initialized".into());
  }
  if !authed {
    return Err("Not authenticated".into());
  }
  Ok(())
}
