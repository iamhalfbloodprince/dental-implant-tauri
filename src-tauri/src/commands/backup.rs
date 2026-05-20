use crate::db;
use crate::state::DbConn;
use rusqlite::Connection;
use std::fs::{self, File};
use std::io::{BufReader, BufWriter, Read, Write};
use std::path::Path;
use tauri::{AppHandle, State};
use uuid::Uuid;
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::CompressionMethod;
use zip::{ZipArchive, ZipWriter};

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
  fs::create_dir_all(dst).map_err(|e| e.to_string())?;
  for entry in WalkDir::new(src).min_depth(1).into_iter().filter_map(|e| e.ok()) {
    let p = entry.path();
    if p.is_dir() {
      continue;
    }
    let rel = p.strip_prefix(src).map_err(|e| e.to_string())?;
    let out = dst.join(rel);
    if let Some(parent) = out.parent() {
      fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::copy(p, &out).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
pub fn backup_create(app: AppHandle) -> Result<String, String> {
  let root = db::app_data_root(&app)?;
  let save_path = rfd::FileDialog::new()
    .set_file_name("dental-implant-backup.zip")
    .save_file()
    .ok_or_else(|| "No destination selected".to_string())?;

  let f = File::create(&save_path).map_err(|e| e.to_string())?;
  let mut zip = ZipWriter::new(BufWriter::new(f));
  let opts = FileOptions::default().compression_method(CompressionMethod::Deflated);

  let db_file = root.join("database").join("app.sqlite");
  if db_file.exists() {
    zip
      .start_file("dental-implant/database/app.sqlite", opts)
      .map_err(|e| e.to_string())?;
    let bytes = fs::read(&db_file).map_err(|e| e.to_string())?;
    zip.write_all(&bytes).map_err(|e| e.to_string())?;
  }

  let files_root = root.join("files");
  if files_root.exists() {
    for entry in WalkDir::new(&files_root).into_iter().filter_map(|e| e.ok()) {
      let p = entry.path();
      if !p.is_file() {
        continue;
      }
      let rel = p.strip_prefix(&root).map_err(|e| e.to_string())?;
      let name = rel.to_string_lossy().replace('\\', "/");
      zip.start_file(name.as_str(), opts).map_err(|e| e.to_string())?;
      let mut data = Vec::new();
      File::open(p)
        .map_err(|e| e.to_string())?
        .read_to_end(&mut data)
        .map_err(|e| e.to_string())?;
      zip.write_all(&data).map_err(|e| e.to_string())?;
    }
  }

  zip.finish().map_err(|e| e.to_string())?;

  let save_path_str = save_path.to_string_lossy().into_owned();
  
  // Record this backup in tracking
  let _ = backup_record_backup_internal_and_log(&save_path_str);
  
  Ok(save_path_str)
}

fn backup_record_backup_internal_and_log(save_path: &str) -> Result<(), String> {
  // This is a simplified version since we don't have DB access here
  // The actual recording is done in the backup_record_backup command
  crate::logging::log_info(&format!("Backup created at {}", save_path));
  Ok(())
}

#[tauri::command]
pub fn backup_restore(app: AppHandle, db: State<'_, DbConn>) -> Result<(), String> {
  let zip_path = rfd::FileDialog::new()
    .pick_file()
    .ok_or_else(|| "No backup file selected".to_string())?;

  let temp = std::env::temp_dir().join(format!("dental-restore-{}", Uuid::new_v4()));
  fs::create_dir_all(&temp).map_err(|e| e.to_string())?;

  let zf = File::open(&zip_path).map_err(|e| e.to_string())?;
  let mut archive = ZipArchive::new(BufReader::new(zf)).map_err(|e| e.to_string())?;
  for i in 0..archive.len() {
    let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
    let outpath = temp.join(file.name());
    if file.name().ends_with('/') {
      fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
      continue;
    }
    if let Some(p) = outpath.parent() {
      fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }
    let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
    std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
  }

  let extracted_db = temp.join("dental-implant/database/app.sqlite");
  if !extracted_db.is_file() {
    return Err("Invalid backup: missing dental-implant/database/app.sqlite".into());
  }

  let data_dir = db::app_data_root(&app)?;
  let db_path = db::db_path(&app)?;

  {
    let mut guard = db.conn.lock().map_err(|_| "database lock".to_string())?;
    let mem = Connection::open_in_memory().map_err(|e| e.to_string())?;
    let _old = std::mem::replace(&mut *guard, mem);
  }

  fs::copy(&extracted_db, &db_path).map_err(|e| e.to_string())?;

  let files_src = temp.join("dental-implant/files");
  let files_dst = data_dir.join("files");
  if files_src.is_dir() {
    if files_dst.exists() {
      fs::remove_dir_all(&files_dst).map_err(|e| e.to_string())?;
    }
    copy_dir_all(&files_src, &files_dst)?;
  }

  {
    let mut guard = db.conn.lock().map_err(|_| "database lock".to_string())?;
    *guard = db::connect_and_migrate(&db_path).map_err(|e| e.to_string())?;
  }

  let _ = fs::remove_dir_all(&temp);
  Ok(())
}

#[tauri::command]
pub fn backup_tracking_status(
  db: State<'_, DbConn>,
) -> Result<Option<crate::models::BackupTracking>, String> {
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  
  let (last_backup, backup_count): (Option<String>, i64) = conn
    .query_row(
      "SELECT last_backup_time, backup_count FROM backup_tracking WHERE id = 1",
      [],
      |r| Ok((r.get(0)?, r.get(1)?)),
    )
    .map_err(|e| e.to_string())?;
  
  let days_since = if let Some(last_backup_time) = last_backup.as_ref() {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(last_backup_time) {
      let now = chrono::Utc::now();
      let duration = now.signed_duration_since(dt);
      duration.num_days()
    } else {
      999 // Invalid date
    }
  } else {
    999 // Never backed up
  };
  
  Ok(Some(crate::models::BackupTracking {
    last_backup_time: last_backup,
    backup_count,
    days_since_last_backup: days_since,
  }))
}

#[tauri::command]
pub fn backup_record_backup(
  db: State<'_, DbConn>,
) -> Result<(), String> {
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  
  conn
    .execute(
      "UPDATE backup_tracking SET last_backup_time = ?1, backup_count = backup_count + 1, updated_at = ?2 WHERE id = 1",
      rusqlite::params![now, now],
    )
    .map_err(|e| e.to_string())?;
  
  crate::logging::log_info("Backup recorded successfully");
  Ok(())
}
