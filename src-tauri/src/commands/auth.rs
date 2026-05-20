use crate::audit::{self, AuditEventType};
use crate::db::{self, has_user_account};
use crate::logging;
use crate::models::{AuthStatus, PasswordPayload, SecurityQuestion, SecurityQuestionPayload};
use crate::state::{AuthState, DbConn, RateLimiter};
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use password_hash::rand_core::OsRng;
use tauri::State;

fn validate_password(password: &str) -> Result<(), String> {
  // Length requirement
  if password.len() < 12 {
    return Err("Password must be at least 12 characters long".into());
  }
  
  // Complexity requirements
  let has_upper = password.chars().any(|c| c.is_uppercase());
  let has_lower = password.chars().any(|c| c.is_lowercase());
  let has_digit = password.chars().any(|c| c.is_ascii_digit());
  let has_special = password.chars().any(|c| "!@#$%^&*()_+-=[]{}|;:,.<>?".contains(c));
  
  if !has_upper {
    return Err("Password must contain at least one uppercase letter".into());
  }
  if !has_lower {
    return Err("Password must contain at least one lowercase letter".into());
  }
  if !has_digit {
    return Err("Password must contain at least one digit".into());
  }
  if !has_special {
    return Err("Password must contain at least one special character (!@#$%^&* etc.)".into());
  }
  
  // Common password check (basic list)
  let common_passwords = vec![
    "password", "123456", "12345678", "qwerty", "abc123",
    "letmein", "monkey", "dragon", "master", "hello"
  ];
  let password_lower = password.to_lowercase();
  if common_passwords.contains(&password_lower.as_str()) {
    return Err("Password is too common. Please choose a more secure password".into());
  }
  
  Ok(())
}

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
  
  let has_security_q: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM users WHERE security_question_id IS NOT NULL",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);
    
  Ok(AuthStatus {
    has_account: has_user_account(&conn),
    authenticated: is_authenticated(&auth)?,
    has_security_question: has_security_q > 0,
  })
}

#[tauri::command]
pub fn auth_setup(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  payload: SecurityQuestionPayload,
) -> Result<(), String> {
  validate_password(&payload.password)?;
  logging::log_info("Attempting to set up new account");
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
  
  // Hash security answer
  let answer_salt = SaltString::generate(&mut OsRng);
  let answer_hash = argon2
    .hash_password(payload.security_answer.as_bytes(), &answer_salt)
    .map_err(|e| e.to_string())?
    .to_string();
  
  let now = db::now_iso();
  conn
    .execute(
      "INSERT INTO users (id, password_hash, security_question_id, security_answer_hash, created_at, updated_at) VALUES (1, ?1, ?2, ?3, ?4, ?5)",
      rusqlite::params![hash, payload.security_question_id, answer_hash, now, now],
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
  rate_limiter: State<'_, RateLimiter>,
  payload: PasswordPayload,
) -> Result<(), String> {
  // Check rate limiting
  if rate_limiter.is_locked() {
    return Err("Account is temporarily locked due to too many failed attempts. Please try again later.".to_string());
  }
  
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
    .map_err(|_| {
      // Record failure before returning error
      let _ = rate_limiter.record_failure();
      audit::log_audit_event(AuditEventType::Login, Some("user"), "Failed login attempt - invalid password");
      "Invalid password".to_string()
    })?;
  if let Ok(mut g) = auth.authenticated.lock() {
    *g = true;
  }
  rate_limiter.record_success();
  audit::log_audit_event(AuditEventType::Login, Some("user"), "Successful login");
  Ok(())
}

#[tauri::command]
pub fn auth_logout(auth: State<'_, AuthState>) -> Result<(), String> {
  if let Ok(mut g) = auth.authenticated.lock() {
    *g = false;
  }
  audit::log_audit_event(AuditEventType::Logout, Some("user"), "User logged out");
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
  validate_password(&new_password)?;
  logging::log_info("Attempting to change password");
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

#[tauri::command]
pub fn security_questions_list(
  db: State<'_, DbConn>,
) -> Result<Vec<SecurityQuestion>, String> {
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, question FROM security_questions ORDER BY id")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([], |r| {
      Ok(SecurityQuestion {
        id: r.get(0)?,
        question: r.get(1)?,
      })
    })
    .map_err(|e| e.to_string())?;
  rows.map(|x| x.map_err(|e| e.to_string())).collect()
}

#[tauri::command]
pub fn auth_reset_password_with_security_question(
  db: State<'_, DbConn>,
  new_password: String,
  security_answer: String,
) -> Result<(), String> {
  validate_password(&new_password)?;
  logging::log_info("Attempting password reset with security question");
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  
  let (_question_id, stored_answer_hash): (i64, String) = conn
    .query_row(
      "SELECT security_question_id, security_answer_hash FROM users WHERE id = 1",
      [],
      |r| Ok((r.get(0)?, r.get(1)?)),
    )
    .map_err(|_| "Security question not set up".to_string())?;
  
  let parsed = PasswordHash::new(&stored_answer_hash).map_err(|e| e.to_string())?;
  Argon2::default()
    .verify_password(security_answer.as_bytes(), &parsed)
    .map_err(|_| "Security answer incorrect".to_string())?;
  
  audit::log_audit_event(AuditEventType::PasswordChange, Some("user"), "Password reset via security question");
  
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
  
  logging::log_info("Password reset successful via security question");
  Ok(())
}

#[tauri::command]
pub fn auth_setup_security_question(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  question_id: i64,
  security_answer: String,
) -> Result<(), String> {
  let is_auth = is_authenticated(&auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  db::require_authenticated(&conn, is_auth)?;
  
  logging::log_info("Setting up security question");
  
  // Hash security answer
  let answer_salt = SaltString::generate(&mut OsRng);
  let argon2 = Argon2::default();
  let answer_hash = argon2
    .hash_password(security_answer.as_bytes(), &answer_salt)
    .map_err(|e| e.to_string())?
    .to_string();
  
  let now = db::now_iso();
  conn
    .execute(
      "UPDATE users SET security_question_id = ?1, security_answer_hash = ?2, updated_at = ?3 WHERE id = 1",
      rusqlite::params![question_id, answer_hash, now],
    )
    .map_err(|e| e.to_string())?;
  
  audit::log_audit_event(AuditEventType::PasswordChange, Some("user"), "Security question set up");
  logging::log_info("Security question setup successful");
  Ok(())
}
