use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use chrono::Utc;

pub struct Logger {
  log_file: Mutex<Option<File>>,
  log_path: PathBuf,
}

impl Logger {
  pub fn new(log_dir: &PathBuf) -> Result<Self, String> {
    let log_path = log_dir.join("app.log");
    
    // Try to open or create log file
    let log_file = match OpenOptions::new()
      .create(true)
      .append(true)
      .open(&log_path)
    {
      Ok(file) => Some(file),
      Err(e) => {
        eprintln!("Failed to open log file: {}", e);
        None
      }
    };

    Ok(Logger {
      log_file: Mutex::new(log_file),
      log_path,
    })
  }

  pub fn log(&self, level: &str, message: &str) {
    let timestamp = Utc::now().to_rfc3339();
    let log_entry = format!("[{}] [{}] {}\n", timestamp, level, message);
    
    // Print to console
    print!("{}", log_entry);
    
    // Write to file if available
    if let Ok(mut file) = self.log_file.lock() {
      if let Some(ref mut f) = *file {
        let _ = f.write_all(log_entry.as_bytes());
        let _ = f.flush();
      }
    }
  }

  pub fn info(&self, message: &str) {
    self.log("INFO", message);
  }

  pub fn error(&self, message: &str) {
    self.log("ERROR", message);
  }

  pub fn warn(&self, message: &str) {
    self.log("WARN", message);
  }

  pub fn debug(&self, message: &str) {
    self.log("DEBUG", message);
  }

  pub fn get_log_path(&self) -> PathBuf {
    self.log_path.clone()
  }
}

// Global logger instance (will be initialized in app setup)
static mut GLOBAL_LOGGER: Option<Logger> = None;

pub fn init_logger(log_dir: &PathBuf) -> Result<(), String> {
  let logger = Logger::new(log_dir)?;
  unsafe {
    GLOBAL_LOGGER = Some(logger);
  }
  Ok(())
}

pub fn log_info(message: &str) {
  unsafe {
    if let Some(ref logger) = GLOBAL_LOGGER {
      logger.info(message);
    }
  }
}

pub fn log_error(message: &str) {
  unsafe {
    if let Some(ref logger) = GLOBAL_LOGGER {
      logger.error(message);
    }
  }
}

pub fn log_warn(message: &str) {
  unsafe {
    if let Some(ref logger) = GLOBAL_LOGGER {
      logger.warn(message);
    }
  }
}

pub fn log_debug(message: &str) {
  unsafe {
    if let Some(ref logger) = GLOBAL_LOGGER {
      logger.debug(message);
    }
  }
}