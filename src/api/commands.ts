import { invoke } from "@tauri-apps/api/core";
import type {
  AuthStatus,
  Clinic,
  ClinicFeeItem,
  DashboardStats,
  DoctorProfile,
  Letter,
  LetterTemplate,
  LogbookEntry,
  LogbookFilters,
  Patient,
  PatientFile,
  TreatmentPlan,
} from "@/types/domain";

export async function authStatus(): Promise<AuthStatus> {
  return invoke("auth_status");
}

export async function authSetup(password: string): Promise<void> {
  return invoke("auth_setup", { payload: { password } });
}

export async function authLogin(password: string): Promise<void> {
  return invoke("auth_login", { payload: { password } });
}

export async function authLogout(): Promise<void> {
  return invoke("auth_logout");
}

export async function authChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return invoke("auth_change_password", {
    currentPassword,
    newPassword,
  });
}

export async function getAppPaths(): Promise<{
  root: string;
  database: string;
  files: string;
  backups: string;
  exports: string;
}> {
  return invoke("get_app_paths");
}

export async function clinicsList(includeInactive: boolean): Promise<Clinic[]> {
  return invoke("clinics_list", { includeInactive });
}

export async function clinicsCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("clinics_create", { input });
}

export async function clinicsUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("clinics_update", { id, input });
}

export async function clinicFeeItemsList(
  clinicId: number,
): Promise<ClinicFeeItem[]> {
  return invoke("clinic_fee_items_list", { clinicId });
}

export async function clinicFeeItemsCreate(
  clinicId: number,
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("clinic_fee_items_create", { clinicId, input });
}

export async function clinicFeeItemsUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("clinic_fee_items_update", { id, input });
}

export async function clinicFeeItemsDelete(id: number): Promise<void> {
  return invoke("clinic_fee_items_delete", { id });
}

export async function doctorProfileGet(): Promise<DoctorProfile> {
  return invoke("doctor_profile_get");
}

export async function doctorProfileUpdate(
  profile: DoctorProfile,
): Promise<void> {
  return invoke("doctor_profile_update", { profile });
}

export async function patientsSearch(
  filters: Record<string, unknown>,
): Promise<Patient[]> {
  return invoke("patients_search", { filters });
}

export async function patientsGet(id: number): Promise<Patient | null> {
  return invoke("patients_get", { id });
}

export async function patientsCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("patients_create", { input });
}

export async function patientsUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("patients_update", { id, input });
}

export async function dashboardStats(
  clinicId: number,
): Promise<DashboardStats> {
  return invoke("dashboard_stats", { clinicId });
}

export async function exportPatientsCsv(clinicId: number): Promise<string> {
  return invoke("export_patients_csv", { clinicId });
}

export async function exportLogbookCsv(filters: LogbookFilters): Promise<string> {
  return invoke("export_logbook_csv", { filters });
}

export async function backupCreate(): Promise<string> {
  return invoke("backup_create");
}

export async function backupRestore(): Promise<void> {
  return invoke("backup_restore");
}

export async function letterTemplatesList(): Promise<LetterTemplate[]> {
  return invoke("letter_templates_list");
}

export async function logbookList(
  filters: LogbookFilters,
): Promise<LogbookEntry[]> {
  return invoke("logbook_list", { filters });
}

export async function logbookCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("logbook_create", { input });
}

export async function medicalGet(patientId: number): Promise<unknown> {
  return invoke("medical_get", { patientId });
}

export async function medicalUpsert(
  patientId: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("medical_upsert", { patientId, input });
}

export async function dentalGet(patientId: number): Promise<unknown> {
  return invoke("dental_get", { patientId });
}

export async function dentalUpsert(
  patientId: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("dental_upsert", { patientId, input });
}

export async function assessmentsList(patientId: number): Promise<unknown[]> {
  return invoke("assessments_list", { patientId });
}

export async function assessmentsCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("assessments_create", { input });
}

export async function treatmentPlansList(
  patientId: number,
): Promise<TreatmentPlan[]> {
  return invoke("treatment_plans_list", { patientId });
}

export async function treatmentPlansCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("treatment_plans_create", { input });
}

export async function lettersListByPatient(patientId: number): Promise<Letter[]> {
  return invoke("letters_list_by_patient", { patientId });
}

export async function lettersCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("letters_create", { input });
}

export async function lettersUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("letters_update", { id, input });
}

export async function lettersAttachPdf(payload: {
  letterId: number;
  pdfBase64: string;
  fileName: string;
}): Promise<string> {
  return invoke("letters_attach_pdf", {
    payload: {
      letterId: payload.letterId,
      pdfBase64: payload.pdfBase64,
      fileName: payload.fileName,
    },
  });
}

export async function followUpsListPatient(
  patientId: number,
): Promise<unknown[]> {
  return invoke("follow_ups_list_patient", { patientId });
}

export async function followUpsCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("follow_ups_create", { input });
}

export async function complicationsListPatient(
  patientId: number,
): Promise<unknown[]> {
  return invoke("complications_list_patient", { patientId });
}

export async function complicationsCreate(
  input: Record<string, unknown>,
): Promise<number> {
  return invoke("complications_create", { input });
}

export async function filesListPatient(
  patientId: number,
): Promise<PatientFile[]> {
  return invoke("files_list_patient", { patientId });
}

export async function fileImportDialog(
  payload: Record<string, unknown>,
): Promise<number> {
  return invoke("file_import_dialog", { payload });
}

export async function fileOpenPath(path: string): Promise<void> {
  return invoke("file_open_path", { path });
}

export async function fileSaveBlob(payload: {
  patientId: number;
  clinicId: number;
  base64: string;
  originalName: string;
  category: string;
  assessmentId?: number | null;
}): Promise<string> {
  return invoke("file_save_blob", { payload });
}

export async function reportsCsvPendingCbct(clinicId: number): Promise<string> {
  return invoke("reports_csv_pending_cbct", { clinicId });
}

export async function reportsCsvFailedCases(clinicId: number): Promise<string> {
  return invoke("reports_csv_failed_cases", { clinicId });
}

export async function fileSetIncludeInLetter(
  id: number,
  includeInLetter: boolean,
): Promise<void> {
  return invoke("file_set_include_in_letter", { id, includeInLetter });
}

export async function logbookGet(id: number): Promise<LogbookEntry | null> {
  return invoke("logbook_get", { id });
}

export async function logbookUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("logbook_update", { id, input });
}

export async function assessmentsGet(id: number): Promise<unknown | null> {
  return invoke("assessments_get", { id });
}

export async function assessmentsUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("assessments_update", { id, input });
}

export async function implantSitesList(
  assessmentId: number,
): Promise<unknown[]> {
  return invoke("implant_sites_list", { assessmentId });
}

export async function implantSitesReplace(
  assessmentId: number,
  sites: Record<string, unknown>[],
): Promise<void> {
  return invoke("implant_sites_replace", { assessmentId, sites });
}

export async function treatmentPlansGet(
  id: number,
): Promise<TreatmentPlan | null> {
  return invoke("treatment_plans_get", { id });
}

export async function treatmentPlansUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("treatment_plans_update", { id, input });
}

export async function treatmentStagesList(
  treatmentPlanId: number,
): Promise<unknown[]> {
  return invoke("treatment_stages_list", { treatmentPlanId });
}

export async function treatmentStageSet(
  stageId: number,
  completed: boolean,
  notes: string | null,
): Promise<void> {
  return invoke("treatment_stage_set", { stageId, completed, notes });
}

export async function followUpsUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("follow_ups_update", { id, input });
}

export async function complicationsUpdate(
  id: number,
  input: Record<string, unknown>,
): Promise<void> {
  return invoke("complications_update", { id, input });
}

export async function letterTemplateUpdate(
  id: number,
  input: { name: string; letterType: string; body: string },
): Promise<void> {
  return invoke("letter_template_update", { id, input });
}

export async function exportFollowUpsCsv(clinicId: number): Promise<string> {
  return invoke("export_follow_ups_csv", { clinicId });
}

export async function exportComplicationsCsv(clinicId: number): Promise<string> {
  return invoke("export_complications_csv", { clinicId });
}
