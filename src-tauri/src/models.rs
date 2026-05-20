use serde::{Deserialize, Serialize};

// ——— Auth ———

#[derive(Deserialize)]
pub struct PasswordPayload {
  pub password: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
  pub has_account: bool,
  pub authenticated: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
  pub root: String,
  pub database: String,
  pub files: String,
  pub backups: String,
  pub exports: String,
}

// ——— Clinics ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Clinic {
  pub id: i64,
  pub name: String,
  pub address: Option<String>,
  pub phone: Option<String>,
  pub email: Option<String>,
  pub website: Option<String>,
  pub logo_path: Option<String>,
  pub letter_header: Option<String>,
  pub letter_footer: Option<String>,
  pub signature_block: Option<String>,
  pub surgeon_name: Option<String>,
  pub registration_number: Option<String>,
  pub brand_color: Option<String>,
  pub is_active: bool,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClinicInput {
  pub name: String,
  pub address: Option<String>,
  pub phone: Option<String>,
  pub email: Option<String>,
  pub website: Option<String>,
  pub logo_path: Option<String>,
  pub letter_header: Option<String>,
  pub letter_footer: Option<String>,
  pub signature_block: Option<String>,
  pub surgeon_name: Option<String>,
  pub registration_number: Option<String>,
  pub brand_color: Option<String>,
  pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClinicFeeItem {
  pub id: i64,
  pub clinic_id: i64,
  pub item_name: String,
  pub category: String,
  pub price_cents: i64,
  pub is_active: bool,
  pub sort_order: i64,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClinicFeeItemInput {
  pub item_name: String,
  pub category: Option<String>,
  pub price_cents: i64,
  pub is_active: bool,
  pub sort_order: Option<i64>,
}

// ——— Doctor profile ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DoctorProfile {
  pub name: String,
  pub title: Option<String>,
  pub registration_number: Option<String>,
  pub signature_block: Option<String>,
  pub contact_phone: Option<String>,
  pub contact_email: Option<String>,
  pub default_clinic_id: Option<i64>,
  pub backup_location: Option<String>,
  pub export_location: Option<String>,
  pub theme: Option<String>,
  pub auto_lock_minutes: Option<i64>,
}

// ——— Patients ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Patient {
  pub id: i64,
  pub clinic_id: i64,
  pub clinic_record_number: Option<String>,
  pub first_name: String,
  pub last_name: String,
  pub gender: Option<String>,
  pub date_of_birth: Option<String>,
  pub phone: Option<String>,
  pub email: Option<String>,
  pub address: Option<String>,
  pub emergency_contact: Option<String>,
  pub referral_source: Option<String>,
  pub referring_doctor: Option<String>,
  pub date_first_seen: Option<String>,
  pub case_status: String,
  pub cbct_obtained: bool,
  pub cbct_reported: bool,
  pub notes: Option<String>,
  pub is_archived: bool,
  pub referring_practice: Option<String>,
  pub failure_notes: Option<String>,
  pub treatment_plan_created: bool,
  pub treatment_plan_sent: bool,
  pub consent_obtained: bool,
  pub implant_system: Option<String>,
  pub implant_journey_notes: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientInput {
  pub clinic_id: i64,
  pub clinic_record_number: Option<String>,
  pub first_name: String,
  pub last_name: String,
  pub gender: Option<String>,
  pub date_of_birth: Option<String>,
  pub phone: Option<String>,
  pub email: Option<String>,
  pub address: Option<String>,
  pub emergency_contact: Option<String>,
  pub referral_source: Option<String>,
  pub referring_doctor: Option<String>,
  pub date_first_seen: Option<String>,
  pub case_status: String,
  #[serde(default)]
  pub cbct_obtained: bool,
  #[serde(default)]
  pub cbct_reported: bool,
  #[serde(default)]
  pub referring_practice: Option<String>,
  #[serde(default)]
  pub failure_notes: Option<String>,
  #[serde(default)]
  pub treatment_plan_created: bool,
  #[serde(default)]
  pub treatment_plan_sent: bool,
  #[serde(default)]
  pub consent_obtained: bool,
  #[serde(default)]
  pub implant_system: Option<String>,
  #[serde(default)]
  pub implant_journey_notes: Option<String>,
  pub notes: Option<String>,
  pub is_archived: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientFilters {
  pub clinic_id: Option<i64>,
  pub status: Option<String>,
  pub include_archived: bool,
  pub query: Option<String>,
}

// ——— Medical / Dental ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MedicalHistory {
  pub id: i64,
  pub patient_id: i64,
  pub diabetes_status: Option<String>,
  pub heart_disease: bool,
  pub hypertension: bool,
  pub bleeding_disorders: bool,
  pub osteoporosis: bool,
  pub bisphosphonate_use: bool,
  pub radiotherapy_history: bool,
  pub immunosuppression: bool,
  pub allergies: Option<String>,
  pub current_medications: Option<String>,
  pub smoking_status: Option<String>,
  pub alcohol_use: Option<String>,
  pub pregnancy_status: Option<String>,
  pub asa_classification: Option<String>,
  pub medical_notes: Option<String>,
  pub flag_uncontrolled_diabetes: bool,
  pub flag_heavy_smoking: bool,
  pub flag_bisphosphonate: bool,
  pub flag_radiotherapy: bool,
  pub flag_bleeding_risk: bool,
  pub flag_allergy: bool,
  pub flag_immunosuppression: bool,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MedicalHistoryInput {
  pub diabetes_status: Option<String>,
  pub heart_disease: bool,
  pub hypertension: bool,
  pub bleeding_disorders: bool,
  pub osteoporosis: bool,
  pub bisphosphonate_use: bool,
  pub radiotherapy_history: bool,
  pub immunosuppression: bool,
  pub allergies: Option<String>,
  pub current_medications: Option<String>,
  pub smoking_status: Option<String>,
  pub alcohol_use: Option<String>,
  pub pregnancy_status: Option<String>,
  pub asa_classification: Option<String>,
  pub medical_notes: Option<String>,
  pub flag_uncontrolled_diabetes: bool,
  pub flag_heavy_smoking: bool,
  pub flag_bisphosphonate: bool,
  pub flag_radiotherapy: bool,
  pub flag_bleeding_risk: bool,
  pub flag_allergy: bool,
  pub flag_immunosuppression: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DentalHistory {
  pub id: i64,
  pub patient_id: i64,
  pub chief_complaint: Option<String>,
  pub missing_teeth: Option<String>,
  pub previous_implants: Option<String>,
  pub periodontal_history: Option<String>,
  pub oral_hygiene: Option<String>,
  pub caries_risk: Option<String>,
  pub bruxism_parafunction: Option<String>,
  pub occlusion_notes: Option<String>,
  pub denture_history: Option<String>,
  pub previous_extractions: Option<String>,
  pub aesthetic_concerns: Option<String>,
  pub patient_expectations: Option<String>,
  pub dental_notes: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DentalHistoryInput {
  pub chief_complaint: Option<String>,
  pub missing_teeth: Option<String>,
  pub previous_implants: Option<String>,
  pub periodontal_history: Option<String>,
  pub oral_hygiene: Option<String>,
  pub caries_risk: Option<String>,
  pub bruxism_parafunction: Option<String>,
  pub occlusion_notes: Option<String>,
  pub denture_history: Option<String>,
  pub previous_extractions: Option<String>,
  pub aesthetic_concerns: Option<String>,
  pub patient_expectations: Option<String>,
  pub dental_notes: Option<String>,
}

// ——— Assessments ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Assessment {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub assessment_date: String,
  pub chief_complaint: Option<String>,
  pub medical_history_summary: Option<String>,
  pub dental_history_summary: Option<String>,
  pub clinical_examination: Option<String>,
  pub soft_tissue: Option<String>,
  pub hard_tissue: Option<String>,
  pub periodontal: Option<String>,
  pub occlusion: Option<String>,
  pub radiographic_findings: Option<String>,
  pub cbct_notes: Option<String>,
  pub implant_site_selection: Option<String>,
  pub bone_quality_notes: Option<String>,
  pub bone_quantity_notes: Option<String>,
  pub risk_assessment: Option<String>,
  pub diagnosis: Option<String>,
  pub treatment_options: Option<String>,
  pub recommended_treatment_summary: Option<String>,
  pub consent_notes: Option<String>,
  pub follow_up_plan: Option<String>,
  pub status: String,
  pub sections_json: Option<String>,
  pub psychological_json: Option<String>,
  pub deep_pocket_json: Option<String>,
  pub consent_forms_json: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssessmentInput {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub assessment_date: String,
  pub chief_complaint: Option<String>,
  pub medical_history_summary: Option<String>,
  pub dental_history_summary: Option<String>,
  pub clinical_examination: Option<String>,
  pub soft_tissue: Option<String>,
  pub hard_tissue: Option<String>,
  pub periodontal: Option<String>,
  pub occlusion: Option<String>,
  pub radiographic_findings: Option<String>,
  pub cbct_notes: Option<String>,
  pub implant_site_selection: Option<String>,
  pub bone_quality_notes: Option<String>,
  pub bone_quantity_notes: Option<String>,
  pub risk_assessment: Option<String>,
  pub diagnosis: Option<String>,
  pub treatment_options: Option<String>,
  pub recommended_treatment_summary: Option<String>,
  pub consent_notes: Option<String>,
  pub follow_up_plan: Option<String>,
  pub status: String,
  #[serde(default)]
  pub sections_json: Option<String>,
  #[serde(default)]
  pub psychological_json: Option<String>,
  #[serde(default)]
  pub deep_pocket_json: Option<String>,
  #[serde(default)]
  pub consent_forms_json: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImplantSiteRow {
  pub id: i64,
  pub assessment_id: i64,
  pub fdi_tooth: String,
  pub arch: Option<String>,
  pub quadrant: Option<String>,
  pub missing_tooth_status: Option<String>,
  pub planned_implant_site: bool,
  pub planned_implant_count: i64,
  pub notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImplantSiteInput {
  pub fdi_tooth: String,
  pub arch: Option<String>,
  pub quadrant: Option<String>,
  pub missing_tooth_status: Option<String>,
  pub planned_implant_site: bool,
  pub planned_implant_count: i64,
  pub notes: Option<String>,
}

// ——— Treatment plans ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreatmentPlan {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub assessment_id: Option<i64>,
  pub treatment_objective: Option<String>,
  pub proposed_implant_sites: Option<String>,
  pub extraction_required: bool,
  pub bone_graft_required: bool,
  pub sinus_lift_required: bool,
  pub soft_tissue_graft_required: bool,
  pub guided_surgery_required: bool,
  pub temporary_restoration_required: bool,
  pub final_restoration_type: Option<String>,
  pub estimated_visits: Option<i64>,
  pub estimated_timeline: Option<String>,
  pub cost_estimate: Option<String>,
  pub alternative_options: Option<String>,
  pub risks_limitations: Option<String>,
  pub notes: Option<String>,
  #[serde(default)]
  pub line_items_json: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreatmentPlanInput {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub assessment_id: Option<i64>,
  pub treatment_objective: Option<String>,
  pub proposed_implant_sites: Option<String>,
  pub extraction_required: bool,
  pub bone_graft_required: bool,
  pub sinus_lift_required: bool,
  pub soft_tissue_graft_required: bool,
  pub guided_surgery_required: bool,
  pub temporary_restoration_required: bool,
  pub final_restoration_type: Option<String>,
  pub estimated_visits: Option<i64>,
  pub estimated_timeline: Option<String>,
  pub cost_estimate: Option<String>,
  pub alternative_options: Option<String>,
  pub risks_limitations: Option<String>,
  pub notes: Option<String>,
  #[serde(default)]
  pub line_items_json: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TreatmentStageRow {
  pub id: i64,
  pub treatment_plan_id: i64,
  pub stage: String,
  pub sort_order: i64,
  pub completed: bool,
  pub notes: Option<String>,
}

// ——— Letters ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LetterTemplate {
  pub id: i64,
  pub name: String,
  pub letter_type: String,
  pub body: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Letter {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub template_id: Option<i64>,
  pub letter_type: String,
  pub title: String,
  pub body: String,
  pub pdf_path: Option<String>,
  pub created_at: String,
  pub updated_at: String,
  pub assessment_id: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LetterInput {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub template_id: Option<i64>,
  #[serde(default)]
  pub assessment_id: Option<i64>,
  pub letter_type: String,
  pub title: String,
  pub body: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LetterPdfPayload {
  pub letter_id: i64,
  pub pdf_base64: String,
  pub file_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LetterTemplateInput {
  pub name: String,
  pub letter_type: String,
  pub body: String,
}

// ——— Logbook ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogbookEntry {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub clinic_record_number: Option<String>,
  pub surgery_date: String,
  pub implant_site: Option<String>,
  pub implant_system: Option<String>,
  pub implant_dimensions: Option<String>,
  pub implant_count: i64,
  pub bone_graft: bool,
  pub sinus_lift: bool,
  pub immediate_placement: bool,
  pub immediate_loading: bool,
  pub surgeon_name: Option<String>,
  pub restoration_type: Option<String>,
  pub complication_status: bool,
  pub complication_type: Option<String>,
  pub outcome: Option<String>,
  pub follow_up_date: Option<String>,
  pub notes: Option<String>,
  pub sac_classification: Option<String>,
  pub cbct_status: Option<String>,
  pub bone_site_classification: Option<String>,
  pub protocol_matrix: Option<String>,
  pub implant_make: Option<String>,
  pub implant_type: Option<String>,
  pub implant_lot_number: Option<String>,
  pub graft_site: Option<String>,
  pub graft_type: Option<String>,
  pub graft_material: Option<String>,
  pub graft_lot_number: Option<String>,
  pub graft_timing: Option<String>,
  pub membrane_type: Option<String>,
  pub membrane_lot_number: Option<String>,
  pub periodontal_pre_op_json: Option<String>,
  pub complication_classification: Option<String>,
  pub implant_failure: bool,
  pub graft_failure: bool,
  pub implant_status_remedial: Option<String>,
  pub supervisor: Option<String>,
  pub mentor_notes: Option<String>,
  pub restoring_dentist: Option<String>,
  pub lab_name: Option<String>,
  pub restoration_date: Option<String>,
  pub chosen_protocol: Option<String>,
  pub options_available: Option<String>,
  pub itemised_plan_notes: Option<String>,
  pub component_order_notes: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogbookInput {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub clinic_record_number: Option<String>,
  pub surgery_date: String,
  pub implant_site: Option<String>,
  pub implant_system: Option<String>,
  pub implant_dimensions: Option<String>,
  pub implant_count: i64,
  pub bone_graft: bool,
  pub sinus_lift: bool,
  pub immediate_placement: bool,
  pub immediate_loading: bool,
  pub surgeon_name: Option<String>,
  pub restoration_type: Option<String>,
  pub complication_status: bool,
  pub complication_type: Option<String>,
  pub outcome: Option<String>,
  pub follow_up_date: Option<String>,
  pub notes: Option<String>,
  #[serde(default)]
  pub sac_classification: Option<String>,
  #[serde(default)]
  pub cbct_status: Option<String>,
  #[serde(default)]
  pub bone_site_classification: Option<String>,
  #[serde(default)]
  pub protocol_matrix: Option<String>,
  #[serde(default)]
  pub implant_make: Option<String>,
  #[serde(default)]
  pub implant_type: Option<String>,
  #[serde(default)]
  pub implant_lot_number: Option<String>,
  #[serde(default)]
  pub graft_site: Option<String>,
  #[serde(default)]
  pub graft_type: Option<String>,
  #[serde(default)]
  pub graft_material: Option<String>,
  #[serde(default)]
  pub graft_lot_number: Option<String>,
  #[serde(default)]
  pub graft_timing: Option<String>,
  #[serde(default)]
  pub membrane_type: Option<String>,
  #[serde(default)]
  pub membrane_lot_number: Option<String>,
  #[serde(default)]
  pub periodontal_pre_op_json: Option<String>,
  #[serde(default)]
  pub complication_classification: Option<String>,
  #[serde(default)]
  pub implant_failure: bool,
  #[serde(default)]
  pub graft_failure: bool,
  #[serde(default)]
  pub implant_status_remedial: Option<String>,
  #[serde(default)]
  pub supervisor: Option<String>,
  #[serde(default)]
  pub mentor_notes: Option<String>,
  #[serde(default)]
  pub restoring_dentist: Option<String>,
  #[serde(default)]
  pub lab_name: Option<String>,
  #[serde(default)]
  pub restoration_date: Option<String>,
  #[serde(default)]
  pub chosen_protocol: Option<String>,
  #[serde(default)]
  pub options_available: Option<String>,
  #[serde(default)]
  pub itemised_plan_notes: Option<String>,
  #[serde(default)]
  pub component_order_notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogbookFilters {
  pub clinic_id: Option<i64>,
  pub date_from: Option<String>,
  pub date_to: Option<String>,
  pub patient_id: Option<i64>,
  #[serde(default)]
  pub cbct_status: Option<String>,
  #[serde(default)]
  pub sac_classification: Option<String>,
  #[serde(default)]
  pub implant_failure_only: Option<bool>,
}

// ——— Follow-ups ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FollowUp {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub follow_up_date: String,
  pub follow_up_type: Option<String>,
  pub clinical_findings: Option<String>,
  pub pain: bool,
  pub swelling: bool,
  pub bleeding: bool,
  pub mobility: bool,
  pub peri_implant_tissue: Option<String>,
  pub oral_hygiene: Option<String>,
  pub radiographic_notes: Option<String>,
  pub maintenance_advice: Option<String>,
  pub next_review_date: Option<String>,
  pub status: String,
  pub notes: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowUpInput {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub follow_up_date: String,
  pub follow_up_type: Option<String>,
  pub clinical_findings: Option<String>,
  pub pain: bool,
  pub swelling: bool,
  pub bleeding: bool,
  pub mobility: bool,
  pub peri_implant_tissue: Option<String>,
  pub oral_hygiene: Option<String>,
  pub radiographic_notes: Option<String>,
  pub maintenance_advice: Option<String>,
  pub next_review_date: Option<String>,
  pub status: String,
  pub notes: Option<String>,
}

// ——— Complications ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Complication {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub logbook_entry_id: Option<i64>,
  pub date_identified: String,
  pub severity: Option<String>,
  pub complication_type: String,
  pub description: Option<String>,
  pub action_taken: Option<String>,
  pub outcome: Option<String>,
  pub follow_up_required: bool,
  pub resolved: bool,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComplicationInput {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub logbook_entry_id: Option<i64>,
  pub date_identified: String,
  pub severity: Option<String>,
  pub complication_type: String,
  pub description: Option<String>,
  pub action_taken: Option<String>,
  pub outcome: Option<String>,
  pub follow_up_required: bool,
  pub resolved: bool,
}

// ——— Files ———

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PatientFile {
  pub id: i64,
  pub patient_id: i64,
  pub clinic_id: i64,
  pub original_name: String,
  pub stored_name: String,
  pub local_path: String,
  pub category: String,
  pub mime_type: Option<String>,
  pub file_size: i64,
  pub notes: Option<String>,
  pub include_in_letter: bool,
  pub assessment_id: Option<i64>,
  pub created_at: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileImportPayload {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub category: String,
  pub notes: Option<String>,
  #[serde(default)]
  pub include_in_letter: bool,
  #[serde(default)]
  pub assessment_id: Option<i64>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavePdfFilePayload {
  pub patient_id: i64,
  pub clinic_id: i64,
  pub base64: String,
  pub original_name: String,
  pub category: String,
  #[serde(default)]
  pub assessment_id: Option<i64>,
}

// ——— Dashboard ———

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardClinicRow {
  pub clinic_id: i64,
  pub clinic_name: String,
  pub count: i64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardRecentPatient {
  pub id: i64,
  pub first_name: String,
  pub last_name: String,
  pub clinic_id: i64,
  pub clinic_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardRecentLetter {
  pub id: i64,
  pub title: String,
  pub letter_type: String,
  pub updated_at: String,
  pub patient_id: i64,
  pub patient_first_name: String,
  pub patient_last_name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
  pub total_patients: i64,
  pub active_cases: i64,
  pub completed_cases: i64,
  pub pending_cbct: i64,
  pub failed_cases: i64,
  pub surgery_scheduled: i64,
  pub surgery_completed: i64,
  pub restoration_phase: i64,
  pub on_hold: i64,
  pub follow_ups_due: i64,
  pub total_implants: i64,
  pub complications: i64,
  #[serde(skip_serializing_if = "Vec::is_empty")]
  pub patients_per_clinic: Vec<DashboardClinicRow>,
  #[serde(skip_serializing_if = "Vec::is_empty")]
  pub implants_per_clinic: Vec<DashboardClinicRow>,
  #[serde(skip_serializing_if = "Vec::is_empty")]
  pub complications_per_clinic: Vec<DashboardClinicRow>,
  pub recent_patients: Vec<DashboardRecentPatient>,
  pub recent_letters: Vec<DashboardRecentLetter>,
}

// ——— Backup ———

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
  pub id: i64,
  pub file_path: String,
  pub created_at: String,
  pub size_bytes: Option<i64>,
}
