use crate::db;
use crate::models::{Clinic, ClinicInput, DoctorProfile};
use crate::state::{AuthState, DbConn};
use rusqlite::OptionalExtension;
use tauri::State;

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
pub fn clinics_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  include_inactive: bool,
) -> Result<Vec<Clinic>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let sql = if include_inactive {
    "SELECT id, name, address, phone, email, website, logo_path, letter_header, letter_footer, signature_block, surgeon_name, registration_number, brand_color, is_active, created_at, updated_at FROM clinics ORDER BY name"
  } else {
    "SELECT id, name, address, phone, email, website, logo_path, letter_header, letter_footer, signature_block, surgeon_name, registration_number, brand_color, is_active, created_at, updated_at FROM clinics WHERE is_active = 1 ORDER BY name"
  };
  let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], |r| {
      Ok(Clinic {
        id: r.get(0)?,
        name: r.get(1)?,
        address: r.get(2)?,
        phone: r.get(3)?,
        email: r.get(4)?,
        website: r.get(5)?,
        logo_path: r.get(6)?,
        letter_header: r.get(7)?,
        letter_footer: r.get(8)?,
        signature_block: r.get(9)?,
        surgeon_name: r.get(10)?,
        registration_number: r.get(11)?,
        brand_color: r.get(12)?,
        is_active: r.get::<_, i64>(13)? != 0,
        created_at: r.get(14)?,
        updated_at: r.get(15)?,
      })
    })
    .map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

#[tauri::command]
pub fn clinics_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: ClinicInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO clinics (name, address, phone, email, website, logo_path, letter_header, letter_footer, signature_block, surgeon_name, registration_number, brand_color, is_active, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
    rusqlite::params![
      input.name,
      input.address,
      input.phone,
      input.email,
      input.website,
      input.logo_path,
      input.letter_header,
      input.letter_footer,
      input.signature_block,
      input.surgeon_name,
      input.registration_number,
      input.brand_color,
      if input.is_active { 1 } else { 0 },
      now,
      now,
    ],
  ).map_err(|e| e.to_string())?;
  let id = conn.last_insert_rowid();
  db::seed_default_clinic_fee_items(&conn, id)?;
  Ok(id)
}

#[tauri::command]
pub fn clinics_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: ClinicInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn
    .execute(
      "UPDATE clinics SET name=?1, address=?2, phone=?3, email=?4, website=?5, logo_path=?6, letter_header=?7, letter_footer=?8, signature_block=?9, surgeon_name=?10, registration_number=?11, brand_color=?12, is_active=?13, updated_at=?14 WHERE id=?15",
      rusqlite::params![
        input.name,
        input.address,
        input.phone,
        input.email,
        input.website,
        input.logo_path,
        input.letter_header,
        input.letter_footer,
        input.signature_block,
        input.surgeon_name,
        input.registration_number,
        input.brand_color,
        if input.is_active { 1 } else { 0 },
        now,
        id,
      ],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn doctor_profile_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
) -> Result<DoctorProfile, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let row = conn
    .query_row(
      "SELECT name, title, registration_number, signature_block, contact_phone, contact_email, default_clinic_id, backup_location, export_location, theme, auto_lock_minutes FROM doctor_profile WHERE id = 1",
      [],
      |r| {
        Ok(DoctorProfile {
          name: r.get(0)?,
          title: r.get(1)?,
          registration_number: r.get(2)?,
          signature_block: r.get(3)?,
          contact_phone: r.get(4)?,
          contact_email: r.get(5)?,
          default_clinic_id: r.get(6)?,
          backup_location: r.get(7)?,
          export_location: r.get(8)?,
          theme: r.get(9)?,
          auto_lock_minutes: r.get(10)?,
        })
      },
    )
    .optional()
    .map_err(|e| e.to_string())?;
  Ok(row.unwrap_or(DoctorProfile {
    name: String::new(),
    title: None,
    registration_number: None,
    signature_block: None,
    contact_phone: None,
    contact_email: None,
    default_clinic_id: None,
    backup_location: None,
    export_location: None,
    theme: None,
    auto_lock_minutes: None,
  }))
}

#[tauri::command]
pub fn doctor_profile_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  profile: DoctorProfile,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn
    .execute(
      "UPDATE doctor_profile SET name=?1, title=?2, registration_number=?3, signature_block=?4, contact_phone=?5, contact_email=?6, default_clinic_id=?7, backup_location=?8, export_location=?9, theme=?10, auto_lock_minutes=?11, updated_at=?12 WHERE id=1",
      rusqlite::params![
        profile.name,
        profile.title,
        profile.registration_number,
        profile.signature_block,
        profile.contact_phone,
        profile.contact_email,
        profile.default_clinic_id,
        profile.backup_location,
        profile.export_location,
        profile.theme,
        profile.auto_lock_minutes,
        now,
      ],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}
