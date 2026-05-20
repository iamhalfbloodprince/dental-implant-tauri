use crate::db;
use crate::models::{LogbookEntry, LogbookFilters, LogbookInput};
use crate::state::{AuthState, DbConn};
use rusqlite::OptionalExtension;
use rusqlite::types::Value;
use rusqlite::params_from_iter;
use rusqlite::Connection;
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

fn map_logbook(r: &rusqlite::Row<'_>) -> rusqlite::Result<LogbookEntry> {
  Ok(LogbookEntry {
    id: r.get(0)?,
    patient_id: r.get(1)?,
    clinic_id: r.get(2)?,
    clinic_record_number: r.get(3)?,
    surgery_date: r.get(4)?,
    implant_site: r.get(5)?,
    implant_system: r.get(6)?,
    implant_dimensions: r.get(7)?,
    implant_count: r.get(8)?,
    bone_graft: r.get::<_, i64>(9)? != 0,
    sinus_lift: r.get::<_, i64>(10)? != 0,
    immediate_placement: r.get::<_, i64>(11)? != 0,
    immediate_loading: r.get::<_, i64>(12)? != 0,
    surgeon_name: r.get(13)?,
    restoration_type: r.get(14)?,
    complication_status: r.get::<_, i64>(15)? != 0,
    complication_type: r.get(16)?,
    outcome: r.get(17)?,
    follow_up_date: r.get(18)?,
    notes: r.get(19)?,
    created_at: r.get(20)?,
    updated_at: r.get(21)?,
    sac_classification: r.get(22)?,
    cbct_status: r.get(23)?,
    bone_site_classification: r.get(24)?,
    protocol_matrix: r.get(25)?,
    implant_make: r.get(26)?,
    implant_type: r.get(27)?,
    implant_lot_number: r.get(28)?,
    graft_site: r.get(29)?,
    graft_type: r.get(30)?,
    graft_material: r.get(31)?,
    graft_lot_number: r.get(32)?,
    graft_timing: r.get(33)?,
    membrane_type: r.get(34)?,
    membrane_lot_number: r.get(35)?,
    periodontal_pre_op_json: r.get(36)?,
    complication_classification: r.get(37)?,
    implant_failure: r.get::<_, i64>(38)? != 0,
    graft_failure: r.get::<_, i64>(39)? != 0,
    implant_status_remedial: r.get(40)?,
    supervisor: r.get(41)?,
    mentor_notes: r.get(42)?,
    restoring_dentist: r.get(43)?,
    lab_name: r.get(44)?,
    restoration_date: r.get(45)?,
    chosen_protocol: r.get(46)?,
    options_available: r.get(47)?,
    itemised_plan_notes: r.get(48)?,
    component_order_notes: r.get(49)?,
  })
}

/// SELECT column order matching `map_logbook` indices (SQLite physical order after migration 004).
const LB_SELECT: &str = "\
id, patient_id, clinic_id, clinic_record_number, surgery_date, implant_site, implant_system, implant_dimensions, implant_count, bone_graft, sinus_lift, immediate_placement, immediate_loading, surgeon_name, restoration_type, complication_status, complication_type, outcome, follow_up_date, notes, created_at, updated_at,\
 sac_classification, cbct_status, bone_site_classification, protocol_matrix, implant_make, implant_type, implant_lot_number,\
 graft_site, graft_type, graft_material, graft_lot_number, graft_timing, membrane_type, membrane_lot_number, periodontal_pre_op_json,\
 complication_classification, implant_failure, graft_failure, implant_status_remedial, supervisor, mentor_notes,\
 restoring_dentist, lab_name, restoration_date, chosen_protocol, options_available, itemised_plan_notes, component_order_notes";

fn fetch_logbook(conn: &Connection, filters: &LogbookFilters) -> Result<Vec<LogbookEntry>, String> {
  let cid = filters.clinic_id.unwrap_or(-1);
  let pid = filters.patient_id.unwrap_or(-1);
  let df = filters.date_from.clone().unwrap_or_default();
  let dt = filters.date_to.clone().unwrap_or_default();
  let cbct_trim = filters
    .cbct_status
    .as_ref()
    .map(|s| s.trim().to_string())
    .unwrap_or_default();
  let sac_trim = filters
    .sac_classification
    .as_ref()
    .map(|s| s.trim().to_string())
    .unwrap_or_default();
  let fail_flag: i64 = if filters.implant_failure_only.unwrap_or(false) {
    1
  } else {
    0
  };

  let sql = format!(
    "SELECT {LB_SELECT} FROM logbook_entries WHERE (?1 < 0 OR clinic_id = ?1) AND (?2 < 0 OR patient_id = ?2) AND (?3 = '' OR surgery_date >= ?3) AND (?4 = '' OR surgery_date <= ?4)\
     AND (?5 = '' OR COALESCE(cbct_status,'') = ?5)\
     AND (?6 = '' OR COALESCE(sac_classification,'') = ?6)\
     AND (?7 = 0 OR implant_failure = 1)\
     ORDER BY surgery_date DESC LIMIT 2000"
  );

  let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map(
      rusqlite::params![cid, pid, df, dt, cbct_trim, sac_trim, fail_flag],
      map_logbook,
    )
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn logbook_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  filters: LogbookFilters,
) -> Result<Vec<LogbookEntry>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  fetch_logbook(&conn, &filters)
}

#[tauri::command]
pub fn logbook_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
) -> Result<Option<LogbookEntry>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let q = format!("SELECT {LB_SELECT} FROM logbook_entries WHERE id = ?1");
  conn
    .query_row(&q, [id], map_logbook)
    .optional()
    .map_err(|e| e.to_string())
}

fn sql_opt_str(s: &Option<String>) -> Value {
  match s {
    None => Value::Null,
    Some(t) => Value::Text(t.clone()),
  }
}

/// 49 positional values for INSERT (`?1` … `?49`).
fn logbook_insert_params(input: &LogbookInput, now: &str) -> Vec<Value> {
  vec![
    Value::Integer(input.patient_id),
    Value::Integer(input.clinic_id),
    sql_opt_str(&input.clinic_record_number),
    Value::Text(input.surgery_date.clone()),
    sql_opt_str(&input.implant_site),
    sql_opt_str(&input.implant_system),
    sql_opt_str(&input.implant_dimensions),
    Value::Integer(input.implant_count),
    Value::Integer(i64::from(input.bone_graft)),
    Value::Integer(i64::from(input.sinus_lift)),
    Value::Integer(i64::from(input.immediate_placement)),
    Value::Integer(i64::from(input.immediate_loading)),
    sql_opt_str(&input.surgeon_name),
    sql_opt_str(&input.restoration_type),
    Value::Integer(i64::from(input.complication_status)),
    sql_opt_str(&input.complication_type),
    sql_opt_str(&input.outcome),
    sql_opt_str(&input.follow_up_date),
    sql_opt_str(&input.notes),
    Value::Text(now.to_string()),
    Value::Text(now.to_string()),
    sql_opt_str(&input.sac_classification),
    sql_opt_str(&input.cbct_status),
    sql_opt_str(&input.bone_site_classification),
    sql_opt_str(&input.protocol_matrix),
    sql_opt_str(&input.implant_make),
    sql_opt_str(&input.implant_type),
    sql_opt_str(&input.implant_lot_number),
    sql_opt_str(&input.graft_site),
    sql_opt_str(&input.graft_type),
    sql_opt_str(&input.graft_material),
    sql_opt_str(&input.graft_lot_number),
    sql_opt_str(&input.graft_timing),
    sql_opt_str(&input.membrane_type),
    sql_opt_str(&input.membrane_lot_number),
    sql_opt_str(&input.periodontal_pre_op_json),
    sql_opt_str(&input.complication_classification),
    Value::Integer(i64::from(input.implant_failure)),
    Value::Integer(i64::from(input.graft_failure)),
    sql_opt_str(&input.implant_status_remedial),
    sql_opt_str(&input.supervisor),
    sql_opt_str(&input.mentor_notes),
    sql_opt_str(&input.restoring_dentist),
    sql_opt_str(&input.lab_name),
    sql_opt_str(&input.restoration_date),
    sql_opt_str(&input.chosen_protocol),
    sql_opt_str(&input.options_available),
    sql_opt_str(&input.itemised_plan_notes),
    sql_opt_str(&input.component_order_notes),
  ]
}

/// 49 positional values for UPDATE (`?1` … `?48` set, `?49` row id).
fn logbook_update_params(input: &LogbookInput, now: &str, row_id: i64) -> Vec<Value> {
  vec![
    Value::Integer(input.patient_id),
    Value::Integer(input.clinic_id),
    sql_opt_str(&input.clinic_record_number),
    Value::Text(input.surgery_date.clone()),
    sql_opt_str(&input.implant_site),
    sql_opt_str(&input.implant_system),
    sql_opt_str(&input.implant_dimensions),
    Value::Integer(input.implant_count),
    Value::Integer(i64::from(input.bone_graft)),
    Value::Integer(i64::from(input.sinus_lift)),
    Value::Integer(i64::from(input.immediate_placement)),
    Value::Integer(i64::from(input.immediate_loading)),
    sql_opt_str(&input.surgeon_name),
    sql_opt_str(&input.restoration_type),
    Value::Integer(i64::from(input.complication_status)),
    sql_opt_str(&input.complication_type),
    sql_opt_str(&input.outcome),
    sql_opt_str(&input.follow_up_date),
    sql_opt_str(&input.notes),
    Value::Text(now.to_string()),
    sql_opt_str(&input.sac_classification),
    sql_opt_str(&input.cbct_status),
    sql_opt_str(&input.bone_site_classification),
    sql_opt_str(&input.protocol_matrix),
    sql_opt_str(&input.implant_make),
    sql_opt_str(&input.implant_type),
    sql_opt_str(&input.implant_lot_number),
    sql_opt_str(&input.graft_site),
    sql_opt_str(&input.graft_type),
    sql_opt_str(&input.graft_material),
    sql_opt_str(&input.graft_lot_number),
    sql_opt_str(&input.graft_timing),
    sql_opt_str(&input.membrane_type),
    sql_opt_str(&input.membrane_lot_number),
    sql_opt_str(&input.periodontal_pre_op_json),
    sql_opt_str(&input.complication_classification),
    Value::Integer(i64::from(input.implant_failure)),
    Value::Integer(i64::from(input.graft_failure)),
    sql_opt_str(&input.implant_status_remedial),
    sql_opt_str(&input.supervisor),
    sql_opt_str(&input.mentor_notes),
    sql_opt_str(&input.restoring_dentist),
    sql_opt_str(&input.lab_name),
    sql_opt_str(&input.restoration_date),
    sql_opt_str(&input.chosen_protocol),
    sql_opt_str(&input.options_available),
    sql_opt_str(&input.itemised_plan_notes),
    sql_opt_str(&input.component_order_notes),
    Value::Integer(row_id),
  ]
}

#[tauri::command]
pub fn logbook_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: LogbookInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  const LOGBOOK_INSERT_SQL: &str = concat!(
    "INSERT INTO logbook_entries (",
    "patient_id, clinic_id, clinic_record_number, surgery_date, implant_site, implant_system, implant_dimensions, implant_count, ",
    "bone_graft, sinus_lift, immediate_placement, immediate_loading, surgeon_name, restoration_type, complication_status, complication_type, ",
    "outcome, follow_up_date, notes, created_at, updated_at, ",
    "sac_classification, cbct_status, bone_site_classification, protocol_matrix, implant_make, implant_type, implant_lot_number, ",
    "graft_site, graft_type, graft_material, graft_lot_number, graft_timing, membrane_type, membrane_lot_number, periodontal_pre_op_json, ",
    "complication_classification, implant_failure, graft_failure, implant_status_remedial, supervisor, mentor_notes, ",
    "restoring_dentist, lab_name, restoration_date, chosen_protocol, options_available, itemised_plan_notes, component_order_notes",
    ") VALUES (",
    "?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,",
    "?22,?23,?24,?25,?26,?27,?28,?29,?30,?31,?32,?33,?34,?35,?36,?37,?38,?39,?40,?41,?42,?43,?44,?45,?46,?47,?48,?49)",
  );

  conn
    .execute(LOGBOOK_INSERT_SQL, params_from_iter(logbook_insert_params(&input, &now)))
    .map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

fn run_logbook_update(conn: &Connection, row_pk: i64, input: &LogbookInput) -> Result<(), String> {
  let now = db::now_iso();
  let vals = logbook_update_params(input, now.as_str(), row_pk);

  const LOGBOOK_UPDATE_SQL: &str = concat!(
    "UPDATE logbook_entries SET ",
    "patient_id=?1, clinic_id=?2, clinic_record_number=?3, surgery_date=?4, implant_site=?5, implant_system=?6, implant_dimensions=?7, implant_count=?8, ",
    "bone_graft=?9, sinus_lift=?10, immediate_placement=?11, immediate_loading=?12, surgeon_name=?13, restoration_type=?14, complication_status=?15, complication_type=?16, ",
    "outcome=?17, follow_up_date=?18, notes=?19, updated_at=?20, ",
    "sac_classification=?21, cbct_status=?22, bone_site_classification=?23, protocol_matrix=?24, implant_make=?25, implant_type=?26, implant_lot_number=?27, ",
    "graft_site=?28, graft_type=?29, graft_material=?30, graft_lot_number=?31, graft_timing=?32, membrane_type=?33, membrane_lot_number=?34, periodontal_pre_op_json=?35, ",
    "complication_classification=?36, implant_failure=?37, graft_failure=?38, implant_status_remedial=?39, supervisor=?40, mentor_notes=?41, ",
    "restoring_dentist=?42, lab_name=?43, restoration_date=?44, chosen_protocol=?45, options_available=?46, itemised_plan_notes=?47, component_order_notes=?48 ",
    "WHERE id=?49",
  );

  conn
    .execute(LOGBOOK_UPDATE_SQL, params_from_iter(vals))
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn logbook_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: LogbookInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  run_logbook_update(&conn, id, &input)
}

#[tauri::command]
pub fn export_logbook_csv(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  filters: LogbookFilters,
) -> Result<String, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let rows = fetch_logbook(&conn, &filters)?;
  let mut w = String::from(
    "id,patient_id,clinic_id,surgery_date,implant_site,implant_system,implant_count,sac_classification,cbct_status,implant_failure,graft_failure,outcome\n",
  );
  for r in rows {
    w.push_str(&format!(
      "{},{},{},{},{},{},{},{},{},{},{},{}\n",
      r.id,
      r.patient_id,
      r.clinic_id,
      r.surgery_date,
      csv_cell(&r.implant_site),
      csv_cell(&r.implant_system),
      r.implant_count,
      csv_cell(&r.sac_classification),
      csv_cell(&r.cbct_status),
      if r.implant_failure { 1 } else { 0 },
      if r.graft_failure { 1 } else { 0 },
      csv_cell(&r.outcome),
    ));
  }
  Ok(w)
}

fn csv_cell(s: &Option<String>) -> String {
  match s {
    None => String::new(),
    Some(v) => {
      if v.contains(',') || v.contains('"') || v.contains('\n') {
        format!("\"{}\"", v.replace('\"', "\"\""))
      } else {
        v.clone()
      }
    }
  }
}
