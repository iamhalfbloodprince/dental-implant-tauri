use crate::db;
use crate::models::{Letter, LetterInput, LetterPdfPayload, LetterTemplate, LetterTemplateInput};
use crate::state::{AuthState, DbConn};
use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use uuid::Uuid;

fn require(
  db: &State<'_, DbConn>,
  auth: &State<'_, AuthState>,
) -> Result<(), String> {
  let authed = auth
    .authenticated
    .lock()
    .map(|g| *g)
    .map_err(|_| "auth lock".to_string())?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  db::require_authenticated(&conn, authed)
}

#[tauri::command]
pub fn letter_templates_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
) -> Result<Vec<LetterTemplate>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, name, letter_type, body, created_at, updated_at FROM letter_templates ORDER BY name")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], |r| {
      Ok(LetterTemplate {
        id: r.get(0)?,
        name: r.get(1)?,
        letter_type: r.get(2)?,
        body: r.get(3)?,
        created_at: r.get(4)?,
        updated_at: r.get(5)?,
      })
    })
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn letter_template_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: LetterTemplateInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn
    .execute(
      "UPDATE letter_templates SET name=?1, letter_type=?2, body=?3, updated_at=?4 WHERE id=?5",
      rusqlite::params![input.name, input.letter_type, input.body, now, id],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn letters_list_by_patient(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Vec<Letter>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare(
      "SELECT id, patient_id, clinic_id, template_id, letter_type, title, body, pdf_path, created_at, updated_at, assessment_id FROM letters WHERE patient_id = ?1 ORDER BY datetime(updated_at) DESC",
    )
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([patient_id], |r| {
      Ok(Letter {
        id: r.get(0)?,
        patient_id: r.get(1)?,
        clinic_id: r.get(2)?,
        template_id: r.get(3)?,
        letter_type: r.get(4)?,
        title: r.get(5)?,
        body: r.get(6)?,
        pdf_path: r.get(7)?,
        created_at: r.get(8)?,
        updated_at: r.get(9)?,
        assessment_id: r.get(10)?,
      })
    })
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn letters_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: LetterInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO letters (patient_id, clinic_id, template_id, letter_type, title, body, pdf_path, created_at, updated_at, assessment_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9)",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.template_id,
      input.letter_type,
      input.title,
      input.body,
      now,
      now,
      input.assessment_id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn letters_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: LetterInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "UPDATE letters SET patient_id=?1, clinic_id=?2, template_id=?3, letter_type=?4, title=?5, body=?6, updated_at=?7, assessment_id=?8 WHERE id=?9",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.template_id,
      input.letter_type,
      input.title,
      input.body,
      now,
      input.assessment_id,
      id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn letters_attach_pdf(
  app: AppHandle,
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  payload: LetterPdfPayload,
) -> Result<String, String> {
  require(&db, &auth)?;
  let root = crate::db::app_data_root(&app)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let (patient_id, clinic_id, letter_assessment_id): (i64, i64, Option<i64>) =
    conn
      .query_row(
        "SELECT patient_id, clinic_id, assessment_id FROM letters WHERE id = ?1",
        [payload.letter_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
      )
      .map_err(|e| e.to_string())?;
  drop(conn);

  let patient_dir = root
    .join("files/patients")
    .join(patient_id.to_string())
    .join("generated-pdfs");
  fs::create_dir_all(&patient_dir).map_err(|e| e.to_string())?;
  let safe_name = sanitize_filename(&payload.file_name);
  let dest: PathBuf = patient_dir.join(&safe_name);
  let bytes = general_purpose::STANDARD
    .decode(payload.pdf_base64.trim())
    .map_err(|e| e.to_string())?;
  fs::write(&dest, bytes).map_err(|e| e.to_string())?;
  let meta = fs::metadata(&dest).map_err(|e| e.to_string())?;

  let path_str = dest.to_string_lossy().into_owned();
  let stored_display = safe_name.clone();
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn
    .execute(
      "UPDATE letters SET pdf_path = ?1, updated_at = ?2 WHERE id = ?3",
      rusqlite::params![path_str, now, payload.letter_id],
    )
    .map_err(|e| e.to_string())?;
  conn
    .execute(
      "INSERT INTO files (patient_id, clinic_id, original_name, stored_name, local_path, category, mime_type, file_size, notes, include_in_letter, assessment_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, ?11)",
      rusqlite::params![
        patient_id,
        clinic_id,
        payload.file_name,
        stored_display,
        path_str,
        "Generated letters",
        "application/pdf",
        meta.len() as i64,
        Some(format!("letter_id:{}", payload.letter_id)),
        letter_assessment_id,
        now,
      ],
    )
    .map_err(|e| e.to_string())?;
  Ok(path_str)
}

fn sanitize_filename(name: &str) -> String {
  let base = PathBuf::from(name)
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("letter.pdf")
    .to_string();
  let safe: String = base
    .chars()
    .map(|c| {
      if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
        c
      } else {
        '_'
      }
    })
    .collect();
  if safe.is_empty() {
    format!("{}.pdf", Uuid::new_v4())
  } else {
    safe
  }
}
