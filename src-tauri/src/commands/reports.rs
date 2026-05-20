use crate::db;
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

#[tauri::command]
pub fn reports_csv_pending_cbct(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<String, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut sql =
    String::from("SELECT id, last_name, first_name, clinic_id, case_status, phone, email FROM patients WHERE is_archived = 0 AND cbct_obtained = 0 AND case_status NOT IN ('completed','failed') ORDER BY last_name, first_name");
  let rows: Vec<(i64, String, String, i64, String, Option<String>, Option<String>)> = if clinic_id >= 0 {
    sql =
      String::from("SELECT id, last_name, first_name, clinic_id, case_status, phone, email FROM patients WHERE is_archived = 0 AND cbct_obtained = 0 AND case_status NOT IN ('completed','failed') AND clinic_id = ?1 ORDER BY last_name, first_name");
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let q = stmt
      .query_map([clinic_id], |r| {
        Ok((
          r.get(0)?,
          r.get(1)?,
          r.get(2)?,
          r.get(3)?,
          r.get(4)?,
          r.get(5)?,
          r.get(6)?,
        ))
      })
      .map_err(|e| e.to_string())?;
    q.map(|x| x.map_err(|e| e.to_string())).collect::<Result<_, _>>()?
  } else {
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let q = stmt
      .query_map([], |r| {
        Ok((
          r.get(0)?,
          r.get(1)?,
          r.get(2)?,
          r.get(3)?,
          r.get(4)?,
          r.get(5)?,
          r.get(6)?,
        ))
      })
      .map_err(|e| e.to_string())?;
    q.map(|x| x.map_err(|e| e.to_string())).collect::<Result<_, _>>()?
  };

  let mut out = String::from("id,last_name,first_name,clinic_id,workflow_status,phone,email\n");
  for (id, ln, fn_, cid, st, ph, em) in rows {
    out.push_str(&format!(
      "{},{},{},{},{},{},{}\n",
      id,
      csv_esc(&ln),
      csv_esc(&fn_),
      cid,
      csv_esc(&st),
      csv_cell_opt(&ph),
      csv_cell_opt(&em),
    ));
  }
  Ok(out)
}

#[tauri::command]
pub fn reports_csv_failed_cases(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<String, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let rows: Vec<(i64, String, String, i64, Option<String>)> = if clinic_id >= 0 {
    let mut stmt = conn
      .prepare(
        "SELECT id, last_name, first_name, clinic_id, failure_notes FROM patients WHERE case_status = 'failed' AND clinic_id = ?1 ORDER BY last_name",
      )
      .map_err(|e| e.to_string())?;
    let q = stmt
      .query_map([clinic_id], |r| {
        Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?))
      })
      .map_err(|e| e.to_string())?;
    q.map(|x| x.map_err(|e| e.to_string())).collect::<Result<_, _>>()?
  } else {
    let mut stmt = conn
      .prepare(
        "SELECT id, last_name, first_name, clinic_id, failure_notes FROM patients WHERE case_status = 'failed' ORDER BY last_name",
      )
      .map_err(|e| e.to_string())?;
    let q = stmt
      .query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)))
      .map_err(|e| e.to_string())?;
    q.map(|x| x.map_err(|e| e.to_string())).collect::<Result<_, _>>()?
  };
  let mut out = String::from("id,last_name,first_name,clinic_id,failure_notes\n");
  for (id, ln, fn_, cid, notes) in rows {
    out.push_str(&format!(
      "{},{},{},{},{}\n",
      id,
      csv_esc(&ln),
      csv_esc(&fn_),
      cid,
      csv_cell_opt(&notes),
    ));
  }
  Ok(out)
}

fn csv_esc(s: &str) -> String {
  if s.contains(',') || s.contains('"') {
    format!("\"{}\"", s.replace('\"', "\"\""))
  } else {
    s.to_string()
  }
}

fn csv_cell_opt(s: &Option<String>) -> String {
  match s {
    None => String::new(),
    Some(v) => csv_esc(v),
  }
}
