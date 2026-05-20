use crate::db;
use crate::models::{
  DashboardClinicRow, DashboardRecentLetter, DashboardRecentPatient, DashboardStats,
};
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

fn clinic_rows(conn: &rusqlite::Connection, sql: &str) -> Result<Vec<DashboardClinicRow>, String> {
  let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], |r| {
      Ok(DashboardClinicRow {
        clinic_id: r.get(0)?,
        clinic_name: r.get(1)?,
        count: r.get(2)?,
      })
    })
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

/// clinic_id: -1 means all clinics
#[tauri::command]
pub fn dashboard_stats(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<DashboardStats, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let cid = clinic_id;

  let total_patients: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let active_cases: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND case_status NOT IN ('completed','failed')",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1 AND case_status NOT IN ('completed','failed')",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let completed_cases: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE case_status = 'completed'",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE clinic_id = ?1 AND case_status = 'completed'",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let pending_cbct: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND cbct_obtained = 0 AND case_status NOT IN ('completed','failed')",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND cbct_obtained = 0 AND clinic_id = ?1 AND case_status NOT IN ('completed','failed')",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let failed_cases: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND case_status = 'failed'",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1 AND case_status = 'failed'",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let surgery_scheduled_k: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND case_status = 'surgery_scheduled'",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1 AND case_status = 'surgery_scheduled'",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let surgery_completed_k: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND case_status = 'surgery_done'",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1 AND case_status = 'surgery_done'",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let restoration_phase: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND case_status IN ('osseointegration','restoration')",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1 AND case_status IN ('osseointegration','restoration')",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let on_hold: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND case_status = 'on_hold'",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM patients WHERE is_archived = 0 AND clinic_id = ?1 AND case_status = 'on_hold'",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let follow_ups_due: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COUNT(*) FROM follow_ups WHERE next_review_date IS NOT NULL AND date(next_review_date) <= date('now')",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM follow_ups WHERE clinic_id = ?1 AND next_review_date IS NOT NULL AND date(next_review_date) <= date('now')",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let total_implants: i64 = if cid < 0 {
    conn
      .query_row(
        "SELECT COALESCE(SUM(implant_count), 0) FROM logbook_entries",
        [],
        |r| r.get(0),
      )
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COALESCE(SUM(implant_count), 0) FROM logbook_entries WHERE clinic_id = ?1",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let complications: i64 = if cid < 0 {
    conn
      .query_row("SELECT COUNT(*) FROM complications", [], |r| r.get(0))
      .unwrap_or(0)
  } else {
    conn
      .query_row(
        "SELECT COUNT(*) FROM complications WHERE clinic_id = ?1",
        [cid],
        |r| r.get(0),
      )
      .unwrap_or(0)
  };

  let scope = if cid < 0 { None } else { Some(cid) };

  let mut patients_per_clinic: Vec<DashboardClinicRow> = Vec::new();
  let mut implants_per_clinic: Vec<DashboardClinicRow> = Vec::new();
  let mut complications_per_clinic: Vec<DashboardClinicRow> = Vec::new();

  if scope.is_none() {
    patients_per_clinic = clinic_rows(
      &conn,
      "SELECT c.id, c.name, COUNT(p.id) FROM clinics c \
       LEFT JOIN patients p ON p.clinic_id = c.id AND p.is_archived = 0 \
       GROUP BY c.id ORDER BY c.name",
    )?;

    implants_per_clinic = clinic_rows(
      &conn,
      "SELECT c.id, c.name, COALESCE(SUM(l.implant_count), 0) \
       FROM clinics c \
       LEFT JOIN logbook_entries l ON l.clinic_id = c.id \
       GROUP BY c.id ORDER BY c.name",
    )?;

    complications_per_clinic = clinic_rows(
      &conn,
      "SELECT c.id, c.name, COUNT(x.id) \
       FROM clinics c \
       LEFT JOIN complications x ON x.clinic_id = c.id \
       GROUP BY c.id ORDER BY c.name",
    )?;
  }

  let recent_patients: Vec<DashboardRecentPatient> = if cid < 0 {
    let mut rp_stmt = conn
      .prepare(
        "SELECT p.id, p.first_name, p.last_name, p.clinic_id, c.name AS cn \
       FROM patients p JOIN clinics c ON c.id = p.clinic_id \
       WHERE p.is_archived = 0 \
       ORDER BY datetime(p.updated_at) DESC LIMIT 8",
      )
      .map_err(|e| e.to_string())?;
    let rp_rows = rp_stmt
      .query_map([], |r| {
        Ok(DashboardRecentPatient {
          id: r.get(0)?,
          first_name: r.get(1)?,
          last_name: r.get(2)?,
          clinic_id: r.get(3)?,
          clinic_name: r.get(4)?,
        })
      })
      .map_err(|e| e.to_string())?;
    rp_rows
      .map(|x| x.map_err(|e| e.to_string()))
      .collect::<Result<_, String>>()?
  } else {
    let mut rp_stmt = conn
      .prepare(
        "SELECT p.id, p.first_name, p.last_name, p.clinic_id, c.name AS cn \
       FROM patients p JOIN clinics c ON c.id = p.clinic_id \
       WHERE p.is_archived = 0 AND p.clinic_id = ?1 \
       ORDER BY datetime(p.updated_at) DESC LIMIT 8",
      )
      .map_err(|e| e.to_string())?;
    let rp_rows = rp_stmt
      .query_map([cid], |r| {
        Ok(DashboardRecentPatient {
          id: r.get(0)?,
          first_name: r.get(1)?,
          last_name: r.get(2)?,
          clinic_id: r.get(3)?,
          clinic_name: r.get(4)?,
        })
      })
      .map_err(|e| e.to_string())?;
    rp_rows
      .map(|x| x.map_err(|e| e.to_string()))
      .collect::<Result<_, String>>()?
  };

  let recent_letters: Vec<DashboardRecentLetter> = if cid < 0 {
    let mut rl_stmt = conn
      .prepare(
        "SELECT l.id, l.title, l.letter_type, l.updated_at, l.patient_id, \
       p.first_name, p.last_name \
     FROM letters l JOIN patients p ON p.id = l.patient_id \
     ORDER BY datetime(l.updated_at) DESC LIMIT 8",
      )
      .map_err(|e| e.to_string())?;
    let rl_rows = rl_stmt
      .query_map([], |r| {
        Ok(DashboardRecentLetter {
          id: r.get(0)?,
          title: r.get(1)?,
          letter_type: r.get(2)?,
          updated_at: r.get(3)?,
          patient_id: r.get(4)?,
          patient_first_name: r.get(5)?,
          patient_last_name: r.get(6)?,
        })
      })
      .map_err(|e| e.to_string())?;
    rl_rows
      .map(|x| x.map_err(|e| e.to_string()))
      .collect::<Result<_, String>>()?
  } else {
    let mut rl_stmt = conn
      .prepare(
        "SELECT l.id, l.title, l.letter_type, l.updated_at, l.patient_id, \
       p.first_name, p.last_name \
     FROM letters l JOIN patients p ON p.id = l.patient_id \
     WHERE l.clinic_id = ?1 ORDER BY datetime(l.updated_at) DESC LIMIT 8",
      )
      .map_err(|e| e.to_string())?;
    let rl_rows = rl_stmt
      .query_map([cid], |r| {
        Ok(DashboardRecentLetter {
          id: r.get(0)?,
          title: r.get(1)?,
          letter_type: r.get(2)?,
          updated_at: r.get(3)?,
          patient_id: r.get(4)?,
          patient_first_name: r.get(5)?,
          patient_last_name: r.get(6)?,
        })
      })
      .map_err(|e| e.to_string())?;
    rl_rows
      .map(|x| x.map_err(|e| e.to_string()))
      .collect::<Result<_, String>>()?
  };

  Ok(DashboardStats {
    total_patients,
    active_cases,
    completed_cases,
    pending_cbct,
    failed_cases,
    surgery_scheduled: surgery_scheduled_k,
    surgery_completed: surgery_completed_k,
    restoration_phase,
    on_hold,
    follow_ups_due,
    total_implants,
    complications,
    patients_per_clinic,
    implants_per_clinic,
    complications_per_clinic,
    recent_patients,
    recent_letters,
  })
}
