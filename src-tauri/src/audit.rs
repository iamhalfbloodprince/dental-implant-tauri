use crate::logging;
use chrono::Utc;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

pub enum AuditEventType {
  Login,
  Logout,
  PasswordChange,
  PatientCreate,
  PatientUpdate,
  PatientDelete,
  PatientView,
  FileUpload,
  FileDelete,
  BackupCreate,
  BackupRestore,
  SystemError,
}

impl AuditEventType {
  fn as_str(&self) -> &'static str {
    match self {
      AuditEventType::Login => "LOGIN",
      AuditEventType::Logout => "LOGOUT",
      AuditEventType::PasswordChange => "PASSWORD_CHANGE",
      AuditEventType::PatientCreate => "PATIENT_CREATE",
      AuditEventType::PatientUpdate => "PATIENT_UPDATE",
      AuditEventType::PatientDelete => "PATIENT_DELETE",
      AuditEventType::PatientView => "PATIENT_VIEW",
      AuditEventType::FileUpload => "FILE_UPLOAD",
      AuditEventType::FileDelete => "FILE_DELETE",
      AuditEventType::BackupCreate => "BACKUP_CREATE",
      AuditEventType::BackupRestore => "BACKUP_RESTORE",
      AuditEventType::SystemError => "SYSTEM_ERROR",
    }
  }
}

pub struct AuditLogger {
  audit_file: Mutex<Option<File>>,
  audit_path: PathBuf,
}

impl AuditLogger {
  pub fn new(audit_dir: &PathBuf) -> Result<Self, String> {
    let audit_path = audit_dir.join("audit.log");
    
    let audit_file = match OpenOptions::new()
      .create(true)
      .append(true)
      .open(&audit_path)
    {
      Ok(file) => Some(file),
      Err(e) => {
        eprintln!("Failed to open audit file: {}", e);
        None
      }
    };

    Ok(AuditLogger {
      audit_file: Mutex::new(audit_file),
      audit_path,
    })
  }

  pub fn log_audit(&self, event_type: AuditEventType, user: Option<&str>, details: &str) {
    let timestamp = Utc::now().to_rfc3339();
    let user_str = user.unwrap_or("system");
    let event_str = event_type.as_str();
    let audit_entry = format!("[{}] [{}] [USER:{}] {}\n", timestamp, event_str, user_str, details);
    
    // Log to main logging system
    logging::log_info(&format!("AUDIT: {} {}", event_str, details));
    
    // Write to audit file
    if let Ok(mut file) = self.audit_file.lock() {
      if let Some(ref mut f) = *file {
        let _ = f.write_all(audit_entry.as_bytes());
        let _ = f.flush();
      }
    }
  }

  pub fn get_audit_path(&self) -> PathBuf {
    self.audit_path.clone()
  }
}

// Global audit logger instance
static mut GLOBAL_AUDIT_LOGGER: Option<AuditLogger> = None;

pub fn init_audit_logger(audit_dir: &PathBuf) -> Result<(), String> {
  let audit_logger = AuditLogger::new(audit_dir)?;
  unsafe {
    GLOBAL_AUDIT_LOGGER = Some(audit_logger);
  }
  Ok(())
}

pub fn log_audit_event(event_type: AuditEventType, user: Option<&str>, details: &str) {
  unsafe {
    if let Some(ref logger) = GLOBAL_AUDIT_LOGGER {
      logger.log_audit(event_type, user, details);
    }
  }
}