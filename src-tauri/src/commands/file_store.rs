use crate::db;
use crate::models::{FileImportPayload, PatientFile, SavePdfFilePayload};
use crate::state::{AuthState, DbConn};
use base64::{engine::general_purpose, Engine as _};
use std::fs;
use std::path::{Path, PathBuf};
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

fn safe_category(cat: &str) -> String {
  cat.chars()
    .map(|c| {
      if c.is_alphanumeric() || c == '-' || c == '_' {
        c
      } else {
        '_'
      }
    })
    .collect()
}

fn guess_mime(path: &Path) -> Option<String> {
  let ext = path.extension()?.to_str()?.to_lowercase();
  Some(match ext.as_str() {
    "pdf" => "application/pdf",
    "jpg" | "jpeg" => "image/jpeg",
    "png" => "image/png",
    "doc" | "docx" => "application/msword",
    _ => return None,
  }
  .to_string())
}

#[tauri::command]
pub fn files_list_patient(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Vec<PatientFile>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare(
      "SELECT id, patient_id, clinic_id, original_name, stored_name, local_path, category, mime_type, file_size, notes, include_in_letter, assessment_id, created_at FROM files WHERE patient_id = ?1 ORDER BY datetime(created_at) DESC",
    )
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([patient_id], |r| {
      Ok(PatientFile {
        id: r.get(0)?,
        patient_id: r.get(1)?,
        clinic_id: r.get(2)?,
        original_name: r.get(3)?,
        stored_name: r.get(4)?,
        local_path: r.get(5)?,
        category: r.get(6)?,
        mime_type: r.get(7)?,
        file_size: r.get(8)?,
        notes: r.get(9)?,
        include_in_letter: r.get::<_, i64>(10)? != 0,
        assessment_id: r.get(11)?,
        created_at: r.get(12)?,
      })
    })
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn file_import_dialog(
  app: AppHandle,
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  payload: FileImportPayload,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let picked = rfd::FileDialog::new()
    .pick_file()
    .ok_or_else(|| "No file selected".to_string())?;
  let root = db::app_data_root(&app)?;
  let cat = safe_category(&payload.category);
  let dest_dir = root
    .join("files/patients")
    .join(payload.patient_id.to_string())
    .join(&cat);
  fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
  let orig = picked
    .file_name()
    .and_then(|s| s.to_str())
    .unwrap_or("upload");
  let orig_path = PathBuf::from(orig);
  let ext = orig_path
    .extension()
    .and_then(|e| e.to_str())
    .unwrap_or("");
  let stored = format!("{}_{}.{}", Uuid::new_v4(), chrono::Utc::now().timestamp(), ext);
  let dest = dest_dir.join(&stored);
  fs::copy(&picked, &dest).map_err(|e| e.to_string())?;
  let meta = fs::metadata(&dest).map_err(|e| e.to_string())?;
  let mime = guess_mime(&picked);

  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO files (patient_id, clinic_id, original_name, stored_name, local_path, category, mime_type, file_size, notes, include_in_letter, assessment_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    rusqlite::params![
      payload.patient_id,
      payload.clinic_id,
      orig,
      stored,
      dest.to_string_lossy(),
      payload.category,
      mime,
      meta.len() as i64,
      payload.notes,
      if payload.include_in_letter { 1 } else { 0 },
      payload.assessment_id,
      now,
    ],
  )
  .map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn file_open_path(path: String) -> Result<(), String> {
  open::that(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn file_save_blob(
  app: AppHandle,
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  payload: SavePdfFilePayload,
) -> Result<String, String> {
  require(&db, &auth)?;
  let root = db::app_data_root(&app)?;
  let cat = safe_category(&payload.category);
  let dest_dir = root
    .join("files/patients")
    .join(payload.patient_id.to_string())
    .join(&cat);
  fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;
  let stored = format!(
    "{}_{}",
    Uuid::new_v4(),
    payload
      .original_name
      .replace(|c: char| !c.is_alphanumeric() && c != '.', "_")
  );
  let dest = dest_dir.join(&stored);
  let bytes = general_purpose::STANDARD
    .decode(payload.base64.trim())
    .map_err(|e| e.to_string())?;
  fs::write(&dest, bytes).map_err(|e| e.to_string())?;
  let meta = fs::metadata(&dest).map_err(|e| e.to_string())?;
  let path_str = dest.to_string_lossy().into_owned();

  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn
    .execute(
      "INSERT INTO files (patient_id, clinic_id, original_name, stored_name, local_path, category, mime_type, file_size, notes, include_in_letter, assessment_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, 0, ?9, ?10)",
      rusqlite::params![
        payload.patient_id,
        payload.clinic_id,
        payload.original_name,
        stored,
        path_str.clone(),
        payload.category,
        "application/pdf",
        meta.len() as i64,
        payload.assessment_id,
        now,
      ],
    )
    .map_err(|e| e.to_string())?;
  Ok(path_str)
}

#[tauri::command]
pub fn file_set_include_in_letter(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  include_in_letter: bool,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .execute(
      "UPDATE files SET include_in_letter = ?1 WHERE id = ?2",
      rusqlite::params![if include_in_letter { 1 } else { 0 }, id],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}
