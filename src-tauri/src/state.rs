use rusqlite::Connection;
use std::sync::Mutex;

pub struct AuthState {
  pub authenticated: Mutex<bool>,
}

impl Default for AuthState {
  fn default() -> Self {
    Self {
      authenticated: Mutex::new(false),
    }
  }
}

pub struct DbConn {
  pub conn: Mutex<Connection>,
}
