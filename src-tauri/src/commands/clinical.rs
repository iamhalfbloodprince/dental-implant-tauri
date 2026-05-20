use crate::db;
use crate::models::{
  Assessment, AssessmentInput, DentalHistory, DentalHistoryInput, ImplantSiteInput, ImplantSiteRow,
  MedicalHistory, MedicalHistoryInput, TreatmentPlan, TreatmentPlanInput, TreatmentStageRow,
};
use crate::state::{AuthState, DbConn};
use rusqlite::OptionalExtension;
use tauri::State;

fn require(
  db: &State<'_, DbConn>,
  auth: &State<'_, AuthState>,
) -> Result<(), String> {
  let authed = auth
    .authenticated
    .lock()
    .map(|g| *g)
    .map_err(|_| "auth lock".to_string())?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  db::require_authenticated(&conn, authed)
}

// ——— Medical ———

#[tauri::command]
pub fn medical_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Option<MedicalHistory>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .query_row(
      "SELECT id, patient_id, diabetes_status, heart_disease, hypertension, bleeding_disorders, osteoporosis, bisphosphonate_use, radiotherapy_history, immunosuppression, allergies, current_medications, smoking_status, alcohol_use, pregnancy_status, asa_classification, medical_notes, flag_uncontrolled_diabetes, flag_heavy_smoking, flag_bisphosphonate, flag_radiotherapy, flag_bleeding_risk, flag_allergy, flag_immunosuppression, created_at, updated_at FROM medical_histories WHERE patient_id = ?1",
      [patient_id],
      |r| {
        Ok(MedicalHistory {
          id: r.get(0)?,
          patient_id: r.get(1)?,
          diabetes_status: r.get(2)?,
          heart_disease: r.get::<_, i64>(3)? != 0,
          hypertension: r.get::<_, i64>(4)? != 0,
          bleeding_disorders: r.get::<_, i64>(5)? != 0,
          osteoporosis: r.get::<_, i64>(6)? != 0,
          bisphosphonate_use: r.get::<_, i64>(7)? != 0,
          radiotherapy_history: r.get::<_, i64>(8)? != 0,
          immunosuppression: r.get::<_, i64>(9)? != 0,
          allergies: r.get(10)?,
          current_medications: r.get(11)?,
          smoking_status: r.get(12)?,
          alcohol_use: r.get(13)?,
          pregnancy_status: r.get(14)?,
          asa_classification: r.get(15)?,
          medical_notes: r.get(16)?,
          flag_uncontrolled_diabetes: r.get::<_, i64>(17)? != 0,
          flag_heavy_smoking: r.get::<_, i64>(18)? != 0,
          flag_bisphosphonate: r.get::<_, i64>(19)? != 0,
          flag_radiotherapy: r.get::<_, i64>(20)? != 0,
          flag_bleeding_risk: r.get::<_, i64>(21)? != 0,
          flag_allergy: r.get::<_, i64>(22)? != 0,
          flag_immunosuppression: r.get::<_, i64>(23)? != 0,
          created_at: r.get(24)?,
          updated_at: r.get(25)?,
        })
      },
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn medical_upsert(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
  input: MedicalHistoryInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  let exists: Option<i64> = conn
    .query_row(
      "SELECT id FROM medical_histories WHERE patient_id = ?1",
      [patient_id],
      |r| r.get(0),
    )
    .optional()
    .map_err(|e| e.to_string())?;
  if exists.is_none() {
    conn.execute(
      "INSERT INTO medical_histories (patient_id, diabetes_status, heart_disease, hypertension, bleeding_disorders, osteoporosis, bisphosphonate_use, radiotherapy_history, immunosuppression, allergies, current_medications, smoking_status, alcohol_use, pregnancy_status, asa_classification, medical_notes, flag_uncontrolled_diabetes, flag_heavy_smoking, flag_bisphosphonate, flag_radiotherapy, flag_bleeding_risk, flag_allergy, flag_immunosuppression, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26)",
      rusqlite::params![
        patient_id,
        input.diabetes_status,
        input.heart_disease as i32,
        input.hypertension as i32,
        input.bleeding_disorders as i32,
        input.osteoporosis as i32,
        input.bisphosphonate_use as i32,
        input.radiotherapy_history as i32,
        input.immunosuppression as i32,
        input.allergies,
        input.current_medications,
        input.smoking_status,
        input.alcohol_use,
        input.pregnancy_status,
        input.asa_classification,
        input.medical_notes,
        input.flag_uncontrolled_diabetes as i32,
        input.flag_heavy_smoking as i32,
        input.flag_bisphosphonate as i32,
        input.flag_radiotherapy as i32,
        input.flag_bleeding_risk as i32,
        input.flag_allergy as i32,
        input.flag_immunosuppression as i32,
        now,
        now,
      ],
    ).map_err(|e| e.to_string())?;
  } else {
    conn.execute(
      "UPDATE medical_histories SET diabetes_status=?1, heart_disease=?2, hypertension=?3, bleeding_disorders=?4, osteoporosis=?5, bisphosphonate_use=?6, radiotherapy_history=?7, immunosuppression=?8, allergies=?9, current_medications=?10, smoking_status=?11, alcohol_use=?12, pregnancy_status=?13, asa_classification=?14, medical_notes=?15, flag_uncontrolled_diabetes=?16, flag_heavy_smoking=?17, flag_bisphosphonate=?18, flag_radiotherapy=?19, flag_bleeding_risk=?20, flag_allergy=?21, flag_immunosuppression=?22, updated_at=?23 WHERE patient_id=?24",
      rusqlite::params![
        input.diabetes_status,
        input.heart_disease as i32,
        input.hypertension as i32,
        input.bleeding_disorders as i32,
        input.osteoporosis as i32,
        input.bisphosphonate_use as i32,
        input.radiotherapy_history as i32,
        input.immunosuppression as i32,
        input.allergies,
        input.current_medications,
        input.smoking_status,
        input.alcohol_use,
        input.pregnancy_status,
        input.asa_classification,
        input.medical_notes,
        input.flag_uncontrolled_diabetes as i32,
        input.flag_heavy_smoking as i32,
        input.flag_bisphosphonate as i32,
        input.flag_radiotherapy as i32,
        input.flag_bleeding_risk as i32,
        input.flag_allergy as i32,
        input.flag_immunosuppression as i32,
        now,
        patient_id,
      ],
    ).map_err(|e| e.to_string())?;
  }
  Ok(())
}

// ——— Dental ———

#[tauri::command]
pub fn dental_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Option<DentalHistory>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .query_row(
      "SELECT id, patient_id, chief_complaint, missing_teeth, previous_implants, periodontal_history, oral_hygiene, caries_risk, bruxism_parafunction, occlusion_notes, denture_history, previous_extractions, aesthetic_concerns, patient_expectations, dental_notes, created_at, updated_at FROM dental_histories WHERE patient_id = ?1",
      [patient_id],
      |r| {
        Ok(DentalHistory {
          id: r.get(0)?,
          patient_id: r.get(1)?,
          chief_complaint: r.get(2)?,
          missing_teeth: r.get(3)?,
          previous_implants: r.get(4)?,
          periodontal_history: r.get(5)?,
          oral_hygiene: r.get(6)?,
          caries_risk: r.get(7)?,
          bruxism_parafunction: r.get(8)?,
          occlusion_notes: r.get(9)?,
          denture_history: r.get(10)?,
          previous_extractions: r.get(11)?,
          aesthetic_concerns: r.get(12)?,
          patient_expectations: r.get(13)?,
          dental_notes: r.get(14)?,
          created_at: r.get(15)?,
          updated_at: r.get(16)?,
        })
      },
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn dental_upsert(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
  input: DentalHistoryInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  let exists = conn
    .query_row(
      "SELECT id FROM dental_histories WHERE patient_id = ?1",
      [patient_id],
      |r| r.get::<_, i64>(0),
    )
    .optional()
    .map_err(|e| e.to_string())?;
  if exists.is_none() {
    conn.execute(
      "INSERT INTO dental_histories (patient_id, chief_complaint, missing_teeth, previous_implants, periodontal_history, oral_hygiene, caries_risk, bruxism_parafunction, occlusion_notes, denture_history, previous_extractions, aesthetic_concerns, patient_expectations, dental_notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
      rusqlite::params![
        patient_id,
        input.chief_complaint,
        input.missing_teeth,
        input.previous_implants,
        input.periodontal_history,
        input.oral_hygiene,
        input.caries_risk,
        input.bruxism_parafunction,
        input.occlusion_notes,
        input.denture_history,
        input.previous_extractions,
        input.aesthetic_concerns,
        input.patient_expectations,
        input.dental_notes,
        now,
        now,
      ],
    ).map_err(|e| e.to_string())?;
  } else {
    conn.execute(
      "UPDATE dental_histories SET chief_complaint=?1, missing_teeth=?2, previous_implants=?3, periodontal_history=?4, oral_hygiene=?5, caries_risk=?6, bruxism_parafunction=?7, occlusion_notes=?8, denture_history=?9, previous_extractions=?10, aesthetic_concerns=?11, patient_expectations=?12, dental_notes=?13, updated_at=?14 WHERE patient_id=?15",
      rusqlite::params![
        input.chief_complaint,
        input.missing_teeth,
        input.previous_implants,
        input.periodontal_history,
        input.oral_hygiene,
        input.caries_risk,
        input.bruxism_parafunction,
        input.occlusion_notes,
        input.denture_history,
        input.previous_extractions,
        input.aesthetic_concerns,
        input.patient_expectations,
        input.dental_notes,
        now,
        patient_id,
      ],
    ).map_err(|e| e.to_string())?;
  }
  Ok(())
}

// ——— Assessments ———

fn map_assessment(r: &rusqlite::Row<'_>) -> rusqlite::Result<Assessment> {
  Ok(Assessment {
    id: r.get(0)?,
    patient_id: r.get(1)?,
    clinic_id: r.get(2)?,
    assessment_date: r.get(3)?,
    chief_complaint: r.get(4)?,
    medical_history_summary: r.get(5)?,
    dental_history_summary: r.get(6)?,
    clinical_examination: r.get(7)?,
    soft_tissue: r.get(8)?,
    hard_tissue: r.get(9)?,
    periodontal: r.get(10)?,
    occlusion: r.get(11)?,
    radiographic_findings: r.get(12)?,
    cbct_notes: r.get(13)?,
    implant_site_selection: r.get(14)?,
    bone_quality_notes: r.get(15)?,
    bone_quantity_notes: r.get(16)?,
    risk_assessment: r.get(17)?,
    diagnosis: r.get(18)?,
    treatment_options: r.get(19)?,
    recommended_treatment_summary: r.get(20)?,
    consent_notes: r.get(21)?,
    follow_up_plan: r.get(22)?,
    status: r.get(23)?,
    created_at: r.get(24)?,
    updated_at: r.get(25)?,
    sections_json: r.get::<_, Option<String>>(26)?,
    psychological_json: r.get::<_, Option<String>>(27)?,
    deep_pocket_json: r.get::<_, Option<String>>(28)?,
    consent_forms_json: r.get::<_, Option<String>>(29)?,
  })
}

#[tauri::command]
pub fn assessments_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Vec<Assessment>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, patient_id, clinic_id, assessment_date, chief_complaint, medical_history_summary, dental_history_summary, clinical_examination, soft_tissue, hard_tissue, periodontal, occlusion, radiographic_findings, cbct_notes, implant_site_selection, bone_quality_notes, bone_quantity_notes, risk_assessment, diagnosis, treatment_options, recommended_treatment_summary, consent_notes, follow_up_plan, status, created_at, updated_at, sections_json, psychological_json, deep_pocket_json, consent_forms_json FROM assessments WHERE patient_id = ?1 ORDER BY assessment_date DESC")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([patient_id], map_assessment)
    .map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

#[tauri::command]
pub fn assessments_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: AssessmentInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO assessments (patient_id, clinic_id, assessment_date, chief_complaint, medical_history_summary, dental_history_summary, clinical_examination, soft_tissue, hard_tissue, periodontal, occlusion, radiographic_findings, cbct_notes, implant_site_selection, bone_quality_notes, bone_quantity_notes, risk_assessment, diagnosis, treatment_options, recommended_treatment_summary, consent_notes, follow_up_plan, status, sections_json, psychological_json, deep_pocket_json, consent_forms_json, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29)",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.assessment_date,
      input.chief_complaint,
      input.medical_history_summary,
      input.dental_history_summary,
      input.clinical_examination,
      input.soft_tissue,
      input.hard_tissue,
      input.periodontal,
      input.occlusion,
      input.radiographic_findings,
      input.cbct_notes,
      input.implant_site_selection,
      input.bone_quality_notes,
      input.bone_quantity_notes,
      input.risk_assessment,
      input.diagnosis,
      input.treatment_options,
      input.recommended_treatment_summary,
      input.consent_notes,
      input.follow_up_plan,
      input.status,
      input.sections_json,
      input.psychological_json,
      input.deep_pocket_json,
      input.consent_forms_json,
      now,
      now,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(conn.last_insert_rowid())
}

#[tauri::command]
pub fn assessments_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: AssessmentInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "UPDATE assessments SET patient_id=?1, clinic_id=?2, assessment_date=?3, chief_complaint=?4, medical_history_summary=?5, dental_history_summary=?6, clinical_examination=?7, soft_tissue=?8, hard_tissue=?9, periodontal=?10, occlusion=?11, radiographic_findings=?12, cbct_notes=?13, implant_site_selection=?14, bone_quality_notes=?15, bone_quantity_notes=?16, risk_assessment=?17, diagnosis=?18, treatment_options=?19, recommended_treatment_summary=?20, consent_notes=?21, follow_up_plan=?22, status=?23, sections_json=?24, psychological_json=?25, deep_pocket_json=?26, consent_forms_json=?27, updated_at=?28 WHERE id=?29",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.assessment_date,
      input.chief_complaint,
      input.medical_history_summary,
      input.dental_history_summary,
      input.clinical_examination,
      input.soft_tissue,
      input.hard_tissue,
      input.periodontal,
      input.occlusion,
      input.radiographic_findings,
      input.cbct_notes,
      input.implant_site_selection,
      input.bone_quality_notes,
      input.bone_quantity_notes,
      input.risk_assessment,
      input.diagnosis,
      input.treatment_options,
      input.recommended_treatment_summary,
      input.consent_notes,
      input.follow_up_plan,
      input.status,
      input.sections_json,
      input.psychological_json,
      input.deep_pocket_json,
      input.consent_forms_json,
      now,
      id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn implant_sites_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  assessment_id: i64,
) -> Result<Vec<ImplantSiteRow>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, assessment_id, fdi_tooth, arch, quadrant, missing_tooth_status, planned_implant_site, planned_implant_count, notes FROM assessment_implant_sites WHERE assessment_id = ?1")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([assessment_id], |r| {
      Ok(ImplantSiteRow {
        id: r.get(0)?,
        assessment_id: r.get(1)?,
        fdi_tooth: r.get(2)?,
        arch: r.get(3)?,
        quadrant: r.get(4)?,
        missing_tooth_status: r.get(5)?,
        planned_implant_site: r.get::<_, i64>(6)? != 0,
        planned_implant_count: r.get(7)?,
        notes: r.get(8)?,
      })
    })
    .map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

#[tauri::command]
pub fn implant_sites_replace(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  assessment_id: i64,
  sites: Vec<ImplantSiteInput>,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn
    .execute(
      "DELETE FROM assessment_implant_sites WHERE assessment_id = ?1",
      [assessment_id],
    )
    .map_err(|e| e.to_string())?;
  for s in sites {
    conn.execute(
      "INSERT INTO assessment_implant_sites (assessment_id, fdi_tooth, arch, quadrant, missing_tooth_status, planned_implant_site, planned_implant_count, notes, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
      rusqlite::params![
        assessment_id,
        s.fdi_tooth,
        s.arch,
        s.quadrant,
        s.missing_tooth_status,
        if s.planned_implant_site { 1 } else { 0 },
        s.planned_implant_count,
        s.notes,
        now,
      ],
    ).map_err(|e| e.to_string())?;
  }
  Ok(())
}

// ——— Treatment plans ———

#[tauri::command]
pub fn treatment_plans_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  patient_id: i64,
) -> Result<Vec<TreatmentPlan>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare(
      "SELECT id, patient_id, clinic_id, assessment_id, treatment_objective, proposed_implant_sites, extraction_required, bone_graft_required, sinus_lift_required, soft_tissue_graft_required, guided_surgery_required, temporary_restoration_required, final_restoration_type, estimated_visits, estimated_timeline, cost_estimate, alternative_options, risks_limitations, notes, created_at, updated_at, line_items_json FROM treatment_plans WHERE patient_id = ?1 ORDER BY datetime(created_at) DESC",
    )
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([patient_id], |r| {
      Ok(TreatmentPlan {
        id: r.get(0)?,
        patient_id: r.get(1)?,
        clinic_id: r.get(2)?,
        assessment_id: r.get(3)?,
        treatment_objective: r.get(4)?,
        proposed_implant_sites: r.get(5)?,
        extraction_required: r.get::<_, i64>(6)? != 0,
        bone_graft_required: r.get::<_, i64>(7)? != 0,
        sinus_lift_required: r.get::<_, i64>(8)? != 0,
        soft_tissue_graft_required: r.get::<_, i64>(9)? != 0,
        guided_surgery_required: r.get::<_, i64>(10)? != 0,
        temporary_restoration_required: r.get::<_, i64>(11)? != 0,
        final_restoration_type: r.get(12)?,
        estimated_visits: r.get(13)?,
        estimated_timeline: r.get(14)?,
        cost_estimate: r.get(15)?,
        alternative_options: r.get(16)?,
        risks_limitations: r.get(17)?,
        notes: r.get(18)?,
        created_at: r.get(19)?,
        updated_at: r.get(20)?,
        line_items_json: r.get(21)?,
      })
    })
    .map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

const STAGES: &[&str] = &[
  "Consultation",
  "Records and imaging",
  "Extraction if required",
  "Bone graft if required",
  "Implant placement",
  "Healing period",
  "Impression or scan",
  "Restoration",
  "Review",
  "Maintenance",
];

#[tauri::command]
pub fn treatment_plans_create(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  input: TreatmentPlanInput,
) -> Result<i64, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "INSERT INTO treatment_plans (patient_id, clinic_id, assessment_id, treatment_objective, proposed_implant_sites, extraction_required, bone_graft_required, sinus_lift_required, soft_tissue_graft_required, guided_surgery_required, temporary_restoration_required, final_restoration_type, estimated_visits, estimated_timeline, cost_estimate, alternative_options, risks_limitations, notes, created_at, updated_at, line_items_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.assessment_id,
      input.treatment_objective,
      input.proposed_implant_sites,
      input.extraction_required as i32,
      input.bone_graft_required as i32,
      input.sinus_lift_required as i32,
      input.soft_tissue_graft_required as i32,
      input.guided_surgery_required as i32,
      input.temporary_restoration_required as i32,
      input.final_restoration_type,
      input.estimated_visits,
      input.estimated_timeline,
      input.cost_estimate,
      input.alternative_options,
      input.risks_limitations,
      input.notes,
      now,
      now,
      input.line_items_json,
    ],
  ).map_err(|e| e.to_string())?;
  let id = conn.last_insert_rowid();
  for (i, st) in STAGES.iter().enumerate() {
    conn.execute(
      "INSERT INTO treatment_plan_stages (treatment_plan_id, stage, sort_order, completed, notes) VALUES (?1, ?2, ?3, 0, NULL)",
      rusqlite::params![id, st, i as i64],
    ).map_err(|e| e.to_string())?;
  }
  Ok(id)
}

#[tauri::command]
pub fn treatment_plans_update(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
  input: TreatmentPlanInput,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let now = db::now_iso();
  conn.execute(
    "UPDATE treatment_plans SET patient_id=?1, clinic_id=?2, assessment_id=?3, treatment_objective=?4, proposed_implant_sites=?5, extraction_required=?6, bone_graft_required=?7, sinus_lift_required=?8, soft_tissue_graft_required=?9, guided_surgery_required=?10, temporary_restoration_required=?11, final_restoration_type=?12, estimated_visits=?13, estimated_timeline=?14, cost_estimate=?15, alternative_options=?16, risks_limitations=?17, notes=?18, line_items_json=?19, updated_at=?20 WHERE id=?21",
    rusqlite::params![
      input.patient_id,
      input.clinic_id,
      input.assessment_id,
      input.treatment_objective,
      input.proposed_implant_sites,
      input.extraction_required as i32,
      input.bone_graft_required as i32,
      input.sinus_lift_required as i32,
      input.soft_tissue_graft_required as i32,
      input.guided_surgery_required as i32,
      input.temporary_restoration_required as i32,
      input.final_restoration_type,
      input.estimated_visits,
      input.estimated_timeline,
      input.cost_estimate,
      input.alternative_options,
      input.risks_limitations,
      input.notes,
      input.line_items_json,
      now,
      id,
    ],
  ).map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn treatment_stages_list(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  treatment_plan_id: i64,
) -> Result<Vec<TreatmentStageRow>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  let mut stmt = conn
    .prepare("SELECT id, treatment_plan_id, stage, sort_order, completed, notes FROM treatment_plan_stages WHERE treatment_plan_id = ?1 ORDER BY sort_order")
    .map_err(|e| e.to_string())?;
  let rows = stmt
    .query_map([treatment_plan_id], |r| {
      Ok(TreatmentStageRow {
        id: r.get(0)?,
        treatment_plan_id: r.get(1)?,
        stage: r.get(2)?,
        sort_order: r.get(3)?,
        completed: r.get::<_, i64>(4)? != 0,
        notes: r.get(5)?,
      })
    })
    .map_err(|e| e.to_string())?;
  let mut out = Vec::new();
  for row in rows {
    out.push(row.map_err(|e| e.to_string())?);
  }
  Ok(out)
}

#[tauri::command]
pub fn treatment_stage_set(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  stage_id: i64,
  completed: bool,
  notes: Option<String>,
) -> Result<(), String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .execute(
      "UPDATE treatment_plan_stages SET completed = ?1, notes = ?2 WHERE id = ?3",
      rusqlite::params![completed as i32, notes, stage_id],
    )
    .map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
pub fn assessments_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
) -> Result<Option<Assessment>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .query_row(
      "SELECT id, patient_id, clinic_id, assessment_date, chief_complaint, medical_history_summary, dental_history_summary, clinical_examination, soft_tissue, hard_tissue, periodontal, occlusion, radiographic_findings, cbct_notes, implant_site_selection, bone_quality_notes, bone_quantity_notes, risk_assessment, diagnosis, treatment_options, recommended_treatment_summary, consent_notes, follow_up_plan, status, created_at, updated_at, sections_json, psychological_json, deep_pocket_json, consent_forms_json FROM assessments WHERE id = ?1",
      [id],
      map_assessment,
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn treatment_plans_get(
  db: State<'_, DbConn>,
  auth: State<'_, AuthState>,
  id: i64,
) -> Result<Option<TreatmentPlan>, String> {
  require(&db, &auth)?;
  let conn = db.conn.lock().map_err(|_| "database lock".to_string())?;
  conn
    .query_row(
      "SELECT id, patient_id, clinic_id, assessment_id, treatment_objective, proposed_implant_sites, extraction_required, bone_graft_required, sinus_lift_required, soft_tissue_graft_required, guided_surgery_required, temporary_restoration_required, final_restoration_type, estimated_visits, estimated_timeline, cost_estimate, alternative_options, risks_limitations, notes, created_at, updated_at, line_items_json FROM treatment_plans WHERE id = ?1",
      [id],
      |r| {
        Ok(TreatmentPlan {
          id: r.get(0)?,
          patient_id: r.get(1)?,
          clinic_id: r.get(2)?,
          assessment_id: r.get(3)?,
          treatment_objective: r.get(4)?,
          proposed_implant_sites: r.get(5)?,
          extraction_required: r.get::<_, i64>(6)? != 0,
          bone_graft_required: r.get::<_, i64>(7)? != 0,
          sinus_lift_required: r.get::<_, i64>(8)? != 0,
          soft_tissue_graft_required: r.get::<_, i64>(9)? != 0,
          guided_surgery_required: r.get::<_, i64>(10)? != 0,
          temporary_restoration_required: r.get::<_, i64>(11)? != 0,
          final_restoration_type: r.get(12)?,
          estimated_visits: r.get(13)?,
          estimated_timeline: r.get(14)?,
          cost_estimate: r.get(15)?,
          alternative_options: r.get(16)?,
          risks_limitations: r.get(17)?,
          notes: r.get(18)?,
          created_at: r.get(19)?,
          updated_at: r.get(20)?,
          line_items_json: r.get(21)?,
        })
      },
    )
    .optional()
    .map_err(|e| e.to_string())
}
