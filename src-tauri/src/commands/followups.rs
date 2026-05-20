use crate::db;
use crate::models::{Complication, ComplicationInput, FollowUp, FollowUpInput};
use crate::state::{AuthState, DbConn};
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

fn map_follow(r: &rusqlite::Row<'_>) -> rusqlite::Result<FollowUp> {
  Ok(FollowUp {
    id: r.get(0)?,
    patient_id: r.get(1)?,
    clinic_id: r.get(2)?,
    follow_up_date: r.get(3)?,
    follow_up_type: r.get(4)?,
    clinical_findings: r.get(5)?,
    pain: r.get::<_, i64>(6)? != 0,
    swelling: r.get::<_, i64>(7)? != 0,
    bleeding: r.get::<_, i64>(8)? != 0,
    mobility: r.get::<_, i64>(9)? != 0,
    peri_implant_tissue: r.get(10)?,
    oral_hygiene: r.get(11)?,
    radiographic_notes: r.get(12)?,
    maintenance_advice: r.get(13)?,
    next_review_date: r.get(14)?,
    status: r.get(15)?,
    notes: r.get(16)?,
    created_at: r.get(17)?,
    updated_at: r.get(18)?,
  })
}

#[tauri::command]
pub fn follow_ups_list_patient(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Vec<FollowUp>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, patient_id, clinic_id, follow_up_date, follow_up_type, clinical_findings, pain, swelling, bleeding, mobility, peri_implant_tissue, oral_hygiene, radiographic_notes, maintenance_advice, next_review_date, status, notes, created_at, updated_at FROM follow_ups WHERE patient_id = ?1 ORDER BY datetime(follow_up_date) DESC")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([patient_id], map_follow)
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn follow_ups_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: FollowUpInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO follow_ups (patient_id, clinic_id, follow_up_date, follow_up_type, clinical_findings, pain, swelling, bleeding, mobility, peri_implant_tissue, oral_hygiene, radiographic_notes, maintenance_advice, next_review_date, status, notes, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.follow_up_date,
      input.follow_up_type,
      input.clinical_findings,
      input.pain as i32,
      input.swelling as i32,
      input.bleeding as i32,
      input.mobility as i32,
      input.peri_implant_tissue,
      input.oral_hygiene,
      input.radiographic_notes,
      input.maintenance_advice,
      input.next_review_date,
      input.status,
      input.notes,
      now,
      now,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn follow_ups_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: FollowUpInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "UPDATE follow_ups SET patient_id=?1, clinic_id=?2, follow_up_date=?3, follow_up_type=?4, clinical_findings=?5, pain=?6, swelling=?7, bleeding=?8, mobility=?9, peri_implant_tissue=?10, oral_hygiene=?11, radiographic_notes=?12, maintenance_advice=?13, next_review_date=?14, status=?15, notes=?16, updated_at=?17 WHERE id=?18",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.follow_up_date,
      input.follow_up_type,
      input.clinical_findings,
      input.pain as i32,
      input.swelling as i32,
      input.bleeding as i32,
      input.mobility as i32,
      input.peri_implant_tissue,
      input.oral_hygiene,
      input.radiographic_notes,
      input.maintenance_advice,
      input.next_review_date,
      input.status,
      input.notes,
      now,
      id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(())
}

fn map_comp(r: &rusqlite::Row<'_>) -> rusqlite::Result<Complication> {
  Ok(Complication {
    id: r.get(0)?,
    patient_id: r.get(1)?,
    clinic_id: r.get(2)?,
    logbook_entry_id: r.get(3)?,
    date_identified: r.get(4)?,
    severity: r.get(5)?,
    complication_type: r.get(6)?,
    description: r.get(7)?,
    action_taken: r.get(8)?,
    outcome: r.get(9)?,
    follow_up_required: r.get::<_, i64>(10)? != 0,
    resolved: r.get::<_, i64>(11)? != 0,
    created_at: r.get(12)?,
    updated_at: r.get(13)?,
  })
}

#[tauri::command]
pub fn complications_list_patient(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Vec<Complication>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, patient_id, clinic_id, logbook_entry_id, date_identified, severity, complication_type, description, action_taken, outcome, follow_up_required, resolved, created_at, updated_at FROM complications WHERE patient_id = ?1 ORDER BY datetime(date_identified) DESC")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([patient_id], map_comp)
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn complications_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: ComplicationInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO complications (patient_id, clinic_id, logbook_entry_id, date_identified, severity, complication_type, description, action_taken, outcome, follow_up_required, resolved, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.logbook_entry_id,
      input.date_identified,
      input.severity,
      input.complication_type,
      input.description,
      input.action_taken,
      input.outcome,
      input.follow_up_required as i32,
      input.resolved as i32,
      now,
      now,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

fn csv_follow_comp(v: &str) -> String {
  if v.contains(',') || v.contains('"') {
    format!("\"{}\"", v.replace('\"', "\"\""))
  } else {
    v.to_string()
  }
}

#[tauri::command]
pub fn export_follow_ups_csv(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<String, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let sql = if clinic_id < 0 {
    "SELECT fp.id, fp.patient_id, fp.clinic_id, fp.follow_up_date, fp.follow_up_type, fp.status, fp.next_review_date, fp.notes, p.first_name, p.last_name \
     FROM follow_ups fp JOIN patients p ON p.id = fp.patient_id \
     ORDER BY datetime(fp.follow_up_date) DESC LIMIT 5000"
  } else {
    "SELECT fp.id, fp.patient_id, fp.clinic_id, fp.follow_up_date, fp.follow_up_type, fp.status, fp.next_review_date, fp.notes, p.first_name, p.last_name \
     FROM follow_ups fp JOIN patients p ON p.id = fp.patient_id \
     WHERE fp.clinic_id = ?1 \
     ORDER BY datetime(fp.follow_up_date) DESC LIMIT 5000"
  };
  let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
  let rows: Vec<(i64, i64, i64, String, Option<String>, String, Option<String>, Option<String>, String, String)> =
    if clinic_id < 0 {
      stmt
        .query_map([], |r| {
          Ok((
            r.get(0)?,
            r.get(1)?,
            r.get(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, String>(5)?,
            r.get::<_, Option<String>>(6)?,
            r.get::<_, Option<String>>(7)?,
            r.get::<_, String>(8)?,
            r.get::<_, String>(9)?,
          ))
        })
        .map_err(|e| e.to_string())?
        .map(|x| x.map_err(|e| e.to_string()))
        .collect::<Result<_, String>>()?
    } else {
      stmt
        .query_map([clinic_id], |r| {
          Ok((
            r.get(0)?,
            r.get(1)?,
            r.get(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, String>(5)?,
            r.get::<_, Option<String>>(6)?,
            r.get::<_, Option<String>>(7)?,
            r.get::<_, String>(8)?,
            r.get::<_, String>(9)?,
          ))
        })
        .map_err(|e| e.to_string())?
        .map(|x| x.map_err(|e| e.to_string()))
        .collect::<Result<_, String>>()?
    };

  let mut out = String::from("id,patient_id,patient_name,clinic_id,follow_up_date,type,status,next_review,notes\n");
  for (id, pid, cid, dt, tp, st, nx, nt, pfn, pln) in rows {
    let name = csv_follow_comp(&format!("{} {}", pfn, pln));
    out.push_str(&format!(
      "{},{},{},{},{},{},{},{},{}\n",
      id,
      pid,
      name,
      cid,
      csv_follow_comp(&dt),
      tp.as_ref().map(|s| csv_follow_comp(s)).unwrap_or_default(),
      csv_follow_comp(&st),
      nx.as_ref().map(|s| csv_follow_comp(s)).unwrap_or_default(),
      nt.as_ref().map(|s| csv_follow_comp(s)).unwrap_or_default(),
    ));
  }
  Ok(out)
}

#[tauri::command]
pub fn export_complications_csv(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<String, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let sql = if clinic_id < 0 {
    "SELECT c.id, c.patient_id, c.clinic_id, c.date_identified, c.severity, c.complication_type, c.description, p.first_name, p.last_name \
     FROM complications c JOIN patients p ON p.id = c.patient_id \
     ORDER BY datetime(c.date_identified) DESC LIMIT 5000"
  } else {
    "SELECT c.id, c.patient_id, c.clinic_id, c.date_identified, c.severity, c.complication_type, c.description, p.first_name, p.last_name \
     FROM complications c JOIN patients p ON p.id = c.patient_id \
     WHERE c.clinic_id = ?1 \
     ORDER BY datetime(c.date_identified) DESC LIMIT 5000"
  };
  let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
  let rows: Vec<(i64, i64, i64, String, Option<String>, String, Option<String>, String, String)> =
    if clinic_id < 0 {
      stmt
        .query_map([], |r| {
          Ok((
            r.get(0)?,
            r.get(1)?,
            r.get(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, String>(5)?,
            r.get::<_, Option<String>>(6)?,
            r.get::<_, String>(7)?,
            r.get::<_, String>(8)?,
          ))
        })
        .map_err(|e| e.to_string())?
        .map(|x| x.map_err(|e| e.to_string()))
        .collect::<Result<_, String>>()?
    } else {
      stmt
        .query_map([clinic_id], |r| {
          Ok((
            r.get(0)?,
            r.get(1)?,
            r.get(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, String>(5)?,
            r.get::<_, Option<String>>(6)?,
            r.get::<_, String>(7)?,
            r.get::<_, String>(8)?,
          ))
        })
        .map_err(|e| e.to_string())?
        .map(|x| x.map_err(|e| e.to_string()))
        .collect::<Result<_, String>>()?
    };

  let mut out = String::from("id,patient_id,patient_name,clinic_id,date,severity,type,description\n");
  for (id, pid, cid, dt, sv, ctype, dsc, pfn, pln) in rows {
    let name = csv_follow_comp(&format!("{} {}", pfn, pln));
    out.push_str(&format!(
      "{},{},{},{},{},{},{},{}\n",
      id,
      pid,
      name,
      cid,
      csv_follow_comp(&dt),
      sv.as_ref().map(|s| csv_follow_comp(s)).unwrap_or_default(),
      csv_follow_comp(&ctype),
      dsc.as_ref().map(|s| csv_follow_comp(s)).unwrap_or_default(),
    ));
  }
  Ok(out)
}

#[tauri::command]
pub fn complications_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: ComplicationInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "UPDATE complications SET patient_id=?1, clinic_id=?2, logbook_entry_id=?3, date_identified=?4, severity=?5, complication_type=?6, description=?7, action_taken=?8, outcome=?9, follow_up_required=?10, resolved=?11, updated_at=?12 WHERE id=?13",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.logbook_entry_id,
      input.date_identified,
      input.severity,
      input.complication_type,
      input.description,
      input.action_taken,
      input.outcome,
      input.follow_up_required as i32,
      input.resolved as i32,
      now,
      id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(())
}
