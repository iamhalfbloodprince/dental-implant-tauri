use crate::db::{self, has_user_account};
use crate::models::{AuthStatus, PasswordPayload};
use crate::state::{AuthState, DbConn};
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use password_hash::rand_core::OsRng;
use tauri::State;

fn is_authenticated(auth: &AuthState) -> Result<bool, String> {
  auth
    .authenticated
    .lock()
    .map(|g| *g)
    .map_err(|_| "auth lock".into())
}

#[tauri::command]
pub fn auth_status(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
) -> Result<AuthStatus, String> {
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  Ok(AuthStatus {
    has_account: has_user_account(&conn),
    authenticated: is_authenticated(&auth)?,
  })
}

#[tauri::command]
pub fn auth_setup(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  payload: PasswordPayload,
) -> Result<(), String> {
  if payload.password.len() < 8 {
    return Err("Password must be at least 8 characters".into());
  }
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  if has_user_account(&conn) {
    return Err("Account already exists".into());
  }
  let salt = SaltString::generate(&mut OsRng);
  let argon2 = Argon2::default();
  let hash = argon2
    .hash_password(payload.password.as_bytes(), &salt)
    .map_err(|e| e.to_string())?
    .to_string();
  let now = db::now_iso();
  conn
    .execute(
      "INSERT INTO users (id, password_hash, created_at, updated_at) VALUES (1, ?1, ?2, ?3)",
      rusqlite::params![hash, now, now],
    )
    .map_err(|e| e.to_string())?;
  conn
    .execute(
      "INSERT INTO doctor_profile (id, name, created_at, updated_at) VALUES (1, '', ?1, ?2)",
      rusqlite::params![now, now],
    )
    .map_err(|e| e.to_string())?;
  if let Ok(mut g) = auth.authenticated.lock() {
    *g = true;
  }
  Ok(())
}

#[tauri::command]
pub fn auth_login(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  payload: PasswordPayload,
) -> Result<(), String> {
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let hash_str: String = conn
    .query_row(
      "SELECT password_hash FROM users WHERE id = 1",
      [],
      |r| r.get(0),
    )
    .map_err(|_| "No account".to_string())?;
  let parsed = PasswordHash::new(&hash_str).map_err(|e| e.to_string())?;
  Argon2::default()
    .verify_password(payload.password.as_bytes(), &parsed)
    .map_err(|_| "Invalid password".to_string())?;
  if let Ok(mut g) = auth.authenticated.lock() {
    *g = true;
  }
  Ok(())
}

#[tauri::command]
pub fn auth_logout(auth: State<'_, AuthState>) -> Result<(), String> {
  if let Ok(mut g) = auth.authenticated.lock() {
    *g = false;
  }
  Ok(())
}

#[tauri::command]
pub fn auth_change_password(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  current_password: String,
  new_password: String,
) -> Result<(), String> {
  let is_auth = is_authenticated(&auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  db::require_authenticated(&conn, is_auth)?;
  if new_password.len() < 8 {
    return Err("New password must be at least 8 characters".into());
  }
  let hash_str: String = conn
    .query_row(
      "SELECT password_hash FROM users WHERE id = 1",
      [],
      |r| r.get(0),
    )
    .map_err(|e| e.to_string())?;
  let parsed = PasswordHash::new(&hash_str).map_err(|e| e.to_string())?;
  Argon2::default()
    .verify_password(current_password.as_bytes(), &parsed)
    .map_err(|_| "Current password incorrect".to_string())?;
  let salt = SaltString::generate(&mut OsRng);
  let argon2 = Argon2::default();
  let new_hash = argon2
    .hash_password(new_password.as_bytes(), &salt)
    .map_err(|e| e.to_string())?
    .to_string();
  let now = db::now_iso();
  conn
    .execute(
      "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = 1",
      rusqlite::params![new_hash, now],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}
