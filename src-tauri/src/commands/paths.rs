use crate::db;
use crate::models::AppPaths;
use tauri::AppHandle;

#[tauri::command]
pub fn get_app_paths(app: AppHandle) -> Result<AppPaths, String> {
  let root = db::app_data_root(&app)?;
  Ok(AppPaths {
    root: root.to_string_lossy().into_owned(),
    database: root.join("database").to_string_lossy().into_owned(),
    files: root.join("files").to_string_lossy().into_owned(),
    backups: root.join("backups").to_string_lossy().into_owned(),
    exports: root.join("exports").to_string_lossy().into_owned(),
  })
}
