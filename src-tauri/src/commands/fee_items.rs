use crate::db;
use crate::models::{ClinicFeeItem, ClinicFeeItemInput};
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
pub fn clinic_fee_items_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
) -> Result<Vec<ClinicFeeItem>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare(
      "SELECT id, clinic_id, item_name, category, price_cents, is_active, sort_order, created_at, updated_at FROM clinic_fee_items WHERE clinic_id = ?1 ORDER BY sort_order, item_name",
    )
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([clinic_id], |r| {
      Ok(ClinicFeeItem {
        id: r.get(0)?,
        clinic_id: r.get(1)?,
        item_name: r.get(2)?,
        category: r.get(3)?,
        price_cents: r.get(4)?,
        is_active: r.get::<_, i64>(5)? != 0,
        sort_order: r.get(6)?,
        created_at: r.get(7)?,
        updated_at: r.get(8)?,
      })
    })
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn clinic_fee_items_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  clinic_id: i64,
  input: ClinicFeeItemInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  let cat = input
    .category
    .unwrap_or_else(|| "General".to_string());
  let sort = input.sort_order.unwrap_or(0);
  conn
    .execute(
      "INSERT INTO clinic_fee_items (clinic_id, item_name, category, price_cents, is_active, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
      rusqlite::params![
        clinic_id,
        input.item_name,
        cat,
        input.price_cents,
        if input.is_active { 1 } else { 0 },
        sort,
        &now,
        &now,
      ],
    )
    .map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn clinic_fee_items_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: ClinicFeeItemInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  let cat = input
    .category
    .unwrap_or_else(|| "General".to_string());
  let sort = input.sort_order.unwrap_or(0);
  conn
    .execute(
      "UPDATE clinic_fee_items SET item_name=?1, category=?2, price_cents=?3, is_active=?4, sort_order=?5, updated_at=?6 WHERE id=?7",
      rusqlite::params![
        input.item_name,
        cat,
        input.price_cents,
        if input.is_active { 1 } else { 0 },
        sort,
        &now,
        id,
      ],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn clinic_fee_items_delete(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .execute("DELETE FROM clinic_fee_items WHERE id = ?1", [id])
    .map_err(|e| e.to_string())?;
  Ok(())
}
