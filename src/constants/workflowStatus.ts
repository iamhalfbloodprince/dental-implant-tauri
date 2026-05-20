/** PRD §7.3 patient pipeline (snake_case values stored on patient.caseStatus). */

export type WorkflowStatus = (typeof WORKFLOW_OPTIONS)[number]["value"];

export const WORKFLOW_OPTIONS: { value: string; label: string }[] = [
  { value: "enquiry", label: "Enquiry" },
  { value: "consultation", label: "Consultation" },
  { value: "planning", label: "Planning" },
  { value: "surgery_scheduled", label: "Surgery scheduled" },
  { value: "surgery_done", label: "Surgery completed" },
  { value: "osseointegration", label: "Osseointegration / healing" },
  { value: "restoration", label: "Restoration" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "on_hold", label: "On hold" },
];

export function workflowLabel(value: string): string {
  return WORKFLOW_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
