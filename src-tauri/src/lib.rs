mod commands;
mod db;
mod models;
mod state;

use state::{AuthState, DbConn};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      let handle = app.handle().clone();
      let path = db::db_path(&handle)?;
      let conn = db::connect_and_migrate(&path)?;
      app.manage(DbConn {
        conn: Mutex::new(conn),
      });
      app.manage(AuthState::default());
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::auth::auth_status,
      commands::auth::auth_setup,
      commands::auth::auth_login,
      commands::auth::auth_logout,
      commands::auth::auth_change_password,
      commands::paths::get_app_paths,
      commands::clinics::clinics_list,
      commands::clinics::clinics_create,
      commands::clinics::clinics_update,
      commands::fee_items::clinic_fee_items_list,
      commands::fee_items::clinic_fee_items_create,
      commands::fee_items::clinic_fee_items_update,
      commands::fee_items::clinic_fee_items_delete,
      commands::clinics::doctor_profile_get,
      commands::clinics::doctor_profile_update,
      commands::patients::patients_search,
      commands::patients::patients_get,
      commands::patients::patients_create,
      commands::patients::patients_update,
      commands::patients::export_patients_csv,
      commands::reports::reports_csv_pending_cbct,
      commands::reports::reports_csv_failed_cases,
      commands::clinical::medical_get,
      commands::clinical::medical_upsert,
      commands::clinical::dental_get,
      commands::clinical::dental_upsert,
      commands::clinical::assessments_list,
      commands::clinical::assessments_get,
      commands::clinical::assessments_create,
      commands::clinical::assessments_update,
      commands::clinical::implant_sites_list,
      commands::clinical::implant_sites_replace,
      commands::clinical::treatment_plans_list,
      commands::clinical::treatment_plans_get,
      commands::clinical::treatment_plans_create,
      commands::clinical::treatment_plans_update,
      commands::clinical::treatment_stages_list,
      commands::clinical::treatment_stage_set,
      commands::letters::letter_templates_list,
      commands::letters::letter_template_update,
      commands::letters::letters_list_by_patient,
      commands::letters::letters_create,
      commands::letters::letters_update,
      commands::letters::letters_attach_pdf,
      commands::logbook::logbook_get,
      commands::logbook::logbook_list,
      commands::logbook::logbook_create,
      commands::logbook::logbook_update,
      commands::logbook::export_logbook_csv,
      commands::followups::follow_ups_list_patient,
      commands::followups::follow_ups_create,
      commands::followups::follow_ups_update,
      commands::followups::complications_list_patient,
      commands::followups::complications_create,
      commands::followups::complications_update,
      commands::followups::export_follow_ups_csv,
      commands::followups::export_complications_csv,
      commands::dashboard::dashboard_stats,
      commands::file_store::files_list_patient,
      commands::file_store::file_import_dialog,
      commands::file_store::file_open_path,
      commands::file_store::file_save_blob,
      commands::file_store::file_set_include_in_letter,
      commands::backup::backup_create,
      commands::backup::backup_restore,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
