-- PRD v3: letter↔assessment link, file↔assessment, treatment fee lines JSON,
-- patient journey fields, extended logbook, reports-friendly columns.
PRAGMA foreign_keys = ON;

ALTER TABLE letters ADD COLUMN assessment_id INTEGER REFERENCES assessments(id);

ALTER TABLE files ADD COLUMN assessment_id INTEGER REFERENCES assessments(id);

ALTER TABLE treatment_plans ADD COLUMN line_items_json TEXT;

ALTER TABLE patients ADD COLUMN referring_practice TEXT;
ALTER TABLE patients ADD COLUMN failure_notes TEXT;
ALTER TABLE patients ADD COLUMN treatment_plan_created INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN treatment_plan_sent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN consent_obtained INTEGER NOT NULL DEFAULT 0;
ALTER TABLE patients ADD COLUMN implant_system TEXT;
ALTER TABLE patients ADD COLUMN implant_journey_notes TEXT;

ALTER TABLE logbook_entries ADD COLUMN sac_classification TEXT;
ALTER TABLE logbook_entries ADD COLUMN cbct_status TEXT;
ALTER TABLE logbook_entries ADD COLUMN bone_site_classification TEXT;
ALTER TABLE logbook_entries ADD COLUMN protocol_matrix TEXT;
ALTER TABLE logbook_entries ADD COLUMN implant_make TEXT;
ALTER TABLE logbook_entries ADD COLUMN implant_type TEXT;
ALTER TABLE logbook_entries ADD COLUMN implant_lot_number TEXT;
ALTER TABLE logbook_entries ADD COLUMN graft_site TEXT;
ALTER TABLE logbook_entries ADD COLUMN graft_type TEXT;
ALTER TABLE logbook_entries ADD COLUMN graft_material TEXT;
ALTER TABLE logbook_entries ADD COLUMN graft_lot_number TEXT;
ALTER TABLE logbook_entries ADD COLUMN graft_timing TEXT;
ALTER TABLE logbook_entries ADD COLUMN membrane_type TEXT;
ALTER TABLE logbook_entries ADD COLUMN membrane_lot_number TEXT;
ALTER TABLE logbook_entries ADD COLUMN periodontal_pre_op_json TEXT;
ALTER TABLE logbook_entries ADD COLUMN complication_classification TEXT;
ALTER TABLE logbook_entries ADD COLUMN implant_failure INTEGER NOT NULL DEFAULT 0;
ALTER TABLE logbook_entries ADD COLUMN graft_failure INTEGER NOT NULL DEFAULT 0;
ALTER TABLE logbook_entries ADD COLUMN implant_status_remedial TEXT;
ALTER TABLE logbook_entries ADD COLUMN supervisor TEXT;
ALTER TABLE logbook_entries ADD COLUMN mentor_notes TEXT;
ALTER TABLE logbook_entries ADD COLUMN restoring_dentist TEXT;
ALTER TABLE logbook_entries ADD COLUMN lab_name TEXT;
ALTER TABLE logbook_entries ADD COLUMN restoration_date TEXT;
ALTER TABLE logbook_entries ADD COLUMN chosen_protocol TEXT;
ALTER TABLE logbook_entries ADD COLUMN options_available TEXT;
ALTER TABLE logbook_entries ADD COLUMN itemised_plan_notes TEXT;
ALTER TABLE logbook_entries ADD COLUMN component_order_notes TEXT;

INSERT INTO schema_migrations (version) VALUES (4);
