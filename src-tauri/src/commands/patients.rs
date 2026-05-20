use crate::db;
use crate::models::{Patient, PatientFilters, PatientInput};
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

const PT_SEL: &str = concat!(
  "SELECT id, clinic_id, clinic_record_number, first_name, last_name, gender, date_of_birth, phone, email, ",
  "address, emergency_contact, referral_source, referring_doctor, date_first_seen, case_status, cbct_obtained, ",
  "cbct_reported, notes, is_archived, referring_practice, failure_notes, treatment_plan_created, ",
  "treatment_plan_sent, consent_obtained, implant_system, implant_journey_notes, created_at, updated_at ",
  "FROM patients"
);

fn map_patient(r: &rusqlite::Row<'_>) -> rusqlite::Result<Patient> {
  Ok(Patient {
    id: r.get(0)?,
    clinic_id: r.get(1)?,
    clinic_record_number: r.get(2)?,
    first_name: r.get(3)?,
    last_name: r.get(4)?,
    gender: r.get(5)?,
    date_of_birth: r.get(6)?,
    phone: r.get(7)?,
    email: r.get(8)?,
    address: r.get(9)?,
    emergency_contact: r.get(10)?,
    referral_source: r.get(11)?,
    referring_doctor: r.get(12)?,
    date_first_seen: r.get(13)?,
    case_status: r.get(14)?,
    cbct_obtained: r.get::<_, i64>(15)? != 0,
    cbct_reported: r.get::<_, i64>(16)? != 0,
    notes: r.get(17)?,
    is_archived: r.get::<_, i64>(18)? != 0,
    referring_practice: r.get(19)?,
    failure_notes: r.get(20)?,
    treatment_plan_created: r.get::<_, i64>(21)? != 0,
    treatment_plan_sent: r.get::<_, i64>(22)? != 0,
    consent_obtained: r.get::<_, i64>(23)? != 0,
    implant_system: r.get(24)?,
    implant_journey_notes: r.get(25)?,
    created_at: r.get(26)?,
    updated_at: r.get(27)?,
  })
}

#[tauri::command]
pub fn patients_search(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  filters: PatientFilters,
) -> Result<Vec<Patient>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;

  let mut sql = format!("{PT_SEL} WHERE 1=1");
  if !filters.include_archived {
    sql.push_str(" AND is_archived = 0");
  }
  if filters.clinic_id.is_some() {
    sql.push_str(" AND clinic_id = ?");
  }
  if filters.status.is_some() {
    sql.push_str(" AND case_status = ?");
  }
  if filters.query.as_ref().map(|q| !q.trim().is_empty()).unwrap_or(false) {
    sql.push_str(
      " AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR CAST(id AS TEXT) LIKE ?
         OR COALESCE(clinic_record_number,'') LIKE ?)",
    );
  }
  sql.push_str(" ORDER BY last_name, first_name LIMIT 500");

  let qpat = filters.query.as_ref().map(|q| {
    let t = q.trim();
    format!("%{}%", t)
  });

  let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
  let map_row = |r: &rusqlite::Row<'_>| map_patient(r);

  let out: Result<Vec<_>, _> = match (
    filters.clinic_id,
    filters.status.clone(),
    qpat.clone(),
  ) {
    (Some(cid), Some(st), Some(q)) => stmt.query_map(rusqlite::params![cid, st, q, q, q, q, q], map_row),
    (Some(cid), Some(st), None) => stmt.query_map(rusqlite::params![cid, st], map_row),
    (Some(cid), None, Some(q)) => {
      stmt.query_map(rusqlite::params![cid, q, q, q, q, q], map_row)
    }
    (Some(cid), None, None) => stmt.query_map(rusqlite::params![cid], map_row),
    (None, Some(st), Some(q)) => stmt.query_map(rusqlite::params![st, q, q, q, q, q], map_row),
    (None, Some(st), None) => stmt.query_map(rusqlite::params![st], map_row),
    (None, None, Some(q)) => stmt.query_map(rusqlite::params![q, q, q, q, q], map_row),
    (None, None, None) => stmt.query_map([], map_row),
  }
  .map_err(|e| e.to_string())?
  .collect();
  out.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn patients_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
) -> Result<Option<Patient>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let q = format!("{PT_SEL} WHERE id = ?1");
  let row = conn
    .query_row(&q, [id], map_patient)
    .optional()
    .map_err(|e| e.to_string())?;
  Ok(row)
}

#[tauri::command]
pub fn patients_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: PatientInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO patients (clinic_id, clinic_record_number, first_name, last_name, gender, date_of_birth, phone, email, address, emergency_contact, referral_source, referring_doctor, date_first_seen, case_status, cbct_obtained, cbct_reported, notes, is_archived, referring_practice, failure_notes, treatment_plan_created, treatment_plan_sent, consent_obtained, implant_system, implant_journey_notes, created_at, updated_at)\
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27)",
    rusqlite::params![
      input.clinic_id,
      input.clinic_record_number,
      input.first_name,
      input.last_name,
      input.gender,
      input.date_of_birth,
      input.phone,
      input.email,
      input.address,
      input.emergency_contact,
      input.referral_source,
      input.referring_doctor,
      input.date_first_seen,
      input.case_status,
      if input.cbct_obtained { 1 } else { 0 },
      if input.cbct_reported { 1 } else { 0 },
      input.notes,
      if input.is_archived { 1 } else { 0 },
      input.referring_practice,
      input.failure_notes,
      if input.treatment_plan_created { 1 } else { 0 },
      if input.treatment_plan_sent { 1 } else { 0 },
      if input.consent_obtained { 1 } else { 0 },
      input.implant_system,
      input.implant_journey_notes,
      now,
      now,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn patients_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: PatientInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "UPDATE patients SET clinic_id=?1, clinic_record_number=?2, first_name=?3, last_name=?4, gender=?5, date_of_birth=?6, phone=?7, email=?8, address=?9, emergency_contact=?10, referral_source=?11, referring_doctor=?12, date_first_seen=?13, case_status=?14, cbct_obtained=?15, cbct_reported=?16, notes=?17, is_archived=?18, referring_practice=?19, failure_notes=?20, treatment_plan_created=?21, treatment_plan_sent=?22, consent_obtained=?23, implant_system=?24, implant_journey_notes=?25, updated_at=?26 WHERE id=?27",
    rusqlite::params![
      input.clinic_id,
      input.clinic_record_number,
      input.first_name,
      input.last_name,
      input.gender,
      input.date_of_birth,
      input.phone,
      input.email,
      input.address,
      input.emergency_contact,
      input.referral_source,
      input.referring_doctor,
      input.date_first_seen,
      input.case_status,
      if input.cbct_obtained { 1 } else { 0 },
      if input.cbct_reported { 1 } else { 0 },
      input.notes,
      if input.is_archived { 1 } else { 0 },
      input.referring_practice,
      input.failure_notes,
      if input.treatment_plan_created { 1 } else { 0 },
      if input.treatment_plan_sent { 1 } else { 0 },
      if input.consent_obtained { 1 } else { 0 },
      input.implant_system,
      input.implant_journey_notes,
      now,
      id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn export_patients_csv(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<String, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let rows: Vec<(i64, String, String, i64, Option<String>, Option<String>, String, bool)> =
    if clinic_id < 0 {
      let mut stmt = conn
        .prepare("SELECT id, first_name, last_name, clinic_id, phone, email, case_status, is_archived FROM patients ORDER BY last_name")
        .map_err(|e| e.to_string())?;
      let q = stmt
        .query_map([], |r| {
          Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, i64>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, Option<String>>(5)?,
            r.get::<_, String>(6)?,
            r.get::<_, i64>(7)? != 0,
          ))
        })
        .map_err(|e| e.to_string())?;
      q.map(|x| x.map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, String>>()?
    } else {
      let mut stmt = conn
        .prepare("SELECT id, first_name, last_name, clinic_id, phone, email, case_status, is_archived FROM patients WHERE clinic_id = ?1 ORDER BY last_name")
        .map_err(|e| e.to_string())?;
      let q = stmt
        .query_map([clinic_id], |r| {
          Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, i64>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, Option<String>>(5)?,
            r.get::<_, String>(6)?,
            r.get::<_, i64>(7)? != 0,
          ))
        })
        .map_err(|e| e.to_string())?;
      q.map(|x| x.map_err(|e| e.to_string()))
        .collect::<Result<Vec<_>, String>>()?
    };
  let mut w = String::from("id,first_name,last_name,clinic_id,phone,email,case_status,archived\n");
  for (id, fn_, ln, cid, ph, em, st, ar) in rows {
    w.push_str(&format!(
      "{},{},{},{},{},{},{},{}\n",
      id,
      csv_esc(&fn_),
      csv_esc(&ln),
      cid,
      csv_cell_opt(&ph),
      csv_cell_opt(&em),
      csv_esc(&st),
      ar
    ));
  }
  Ok(w)
}

fn csv_cell_opt(s: &Option<String>) -> String {
  match s {
    None => String::new(),
    Some(v) => csv_esc(v),
  }
}

fn csv_esc(s: &str) -> String {
  if s.contains(',') || s.contains('"') {
    format!("\"{}\"", s.replace('\"', "\"\""))
  } else {
    s.to_string()
  }
}
