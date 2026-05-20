use rusqlite::Connection;
use std::sync::Mutex;
use std::time::{Duration, Instant};

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

pub struct RateLimiter {
  failed_attempts: Mutex<u32>,
  lock_until: Mutex<Option<Instant>>,
  max_attempts: u32,
  lock_duration: Duration,
}

impl RateLimiter {
  pub fn new(max_attempts: u32, lock_duration_secs: u64) -> Self {
    Self {
      failed_attempts: Mutex::new(0),
      lock_until: Mutex::new(None),
      max_attempts,
      lock_duration: Duration::from_secs(lock_duration_secs),
    }
  }

  pub fn record_failure(&self) -> Result<(), String> {
    // Check if currently locked
    if let Some(lock_until) = *self.lock_until.lock().unwrap() {
      if Instant::now() < lock_until {
        let remaining = (lock_until - Instant::now()).as_secs();
        return Err(format!("Too many failed attempts. Account locked for {} seconds.", remaining));
      }
    }

    // Increment failure count
    let mut attempts = self.failed_attempts.lock().unwrap();
    *attempts += 1;

    if *attempts >= self.max_attempts {
      // Lock the account
      let lock_time = Instant::now() + self.lock_duration;
      *self.lock_until.lock().unwrap() = Some(lock_time);
      *attempts = 0; // Reset after lock
      return Err(format!("Too many failed attempts. Account locked for {} seconds.", self.lock_duration.as_secs()));
    }

    Ok(())
  }

  pub fn record_success(&self) {
    *self.failed_attempts.lock().unwrap() = 0;
    *self.lock_until.lock().unwrap() = None;
  }

  pub fn is_locked(&self) -> bool {
    if let Some(lock_until) = *self.lock_until.lock().unwrap() {
      if Instant::now() < lock_until {
        return true;
      }
    }
    false
  }
}

impl Default for RateLimiter {
  fn default() -> Self {
    Self::new(5, 900) // 5 attempts, 15 minute lockout
  }
}
