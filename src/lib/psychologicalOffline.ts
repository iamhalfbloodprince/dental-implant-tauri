/**
 * Offline rule-based House & Marquit–style psychological summary (PRD §7.6 MVP).
 * Not legal/clinical advice — editable documentation for internal records only.
 */

export type HouseMarquitClass =
  | "philosophical"
  | "exacting"
  | "indifferent"
  | "hysterical";

export type PsychologicalTableRow = {
  type: string;
  behaviour: string;
  keyRisk: string;
  compliance: string;
  expectations: string;
  medLegal: string;
  strategy: string;
  flag: string;
};

export type PsychologicalBundle = {
  classification: HouseMarquitClass;
  clinicianNotes?: string;
  rows: PsychologicalTableRow[];
};

const ROW = (
  classification: HouseMarquitClass,
  partial: Omit<PsychologicalTableRow, "type">,
): PsychologicalTableRow => ({
  type: classification,
  ...partial,
});

/** Deterministic narrative row for the classification + optional clinician notes cues. */
export function buildPsychologicalTable(
  classification: HouseMarquitClass,
  clinicianNotes?: string,
): PsychologicalBundle {
  const n = (clinicianNotes ?? "").toLowerCase();

  const rows: PsychologicalTableRow[] = (() => {
    switch (classification) {
      case "philosophical":
        return [
          ROW(classification, {
            behaviour:
              "Generally pragmatic; tends to weigh risks and benefits calmly.",
            keyRisk:
              "May delay elective treatment if perceived benefit unclear.",
            compliance: "Usually good once expectations are aligned.",
            expectations:
              "Often realistic when educated with balanced information.",
            medLegal:
              "Lower than average dispute risk if consent and records are thorough.",
            strategy:
              "Collaborative shared decision-making; clear written summaries.",
            flag: "Proceed with routine documentation.",
          }),
        ];
      case "exacting": {
        const exactingFromNotes =
          /\b(high|acute|severe|pain|dissatisfied)\b/.test(n) ||
          n.length > 120;
        return [
          ROW(classification, {
            behaviour:
              "Detail-focused; questions precision, aesthetics and sequencing.",
            keyRisk:
              "Dissatisfaction risk if nuances or timelines are ambiguous.",
            compliance: exactingFromNotes ? "Needs reinforced recall." : "Good if processes are meticulous.",
            expectations:
              "High — may expect perfection; reinforce limits of dentistry.",
            medLegal:
              exactingFromNotes
                ? "Moderate elevation — corroborate discussions in notes."
                : "Moderate — document nuances and contingency plans.",
            strategy:
              "Written treatment plans; staged consent; photographic records.",
            flag: exactingFromNotes
              ? "Caution — extended informed consent checklist."
              : "Caution — maintain explicit scope documentation.",
          }),
        ];
      }
      case "indifferent":
        return [
          ROW(classification, {
            behaviour:
              "Lower engagement or variable interest in preventive advice.",
            keyRisk:
              "Oral hygiene / follow-up lapse; underestimated post-op demands.",
            compliance: "Variable; reinforce motivation and reminders.",
            expectations:
              "May underestimate time and visits required for implants.",
            medLegal:
              "Moderate if outcomes attributed to poor adherence without audit trail.",
            strategy:
              "Short written aftercare; emphasise contractual review intervals.",
            flag: "Monitor compliance indicators at each visit.",
          }),
        ];
      case "hysterical":
        return [
          ROW(classification, {
            behaviour:
              "Strong emotional reactions; urgency or catastrophic framing possible.",
            keyRisk:
              "Volatile rapport; escalation if pain or aesthetics disappoint.",
            compliance: "Unpredictable; may seek multiple opinions abruptly.",
            expectations:
              "Often inflated or rapidly shifting expectations.",
            medLegal:
              "High — internal documentation essential; suitability review.",
            strategy:
              "Calm phased care; psychologists referral if clinically appropriate.",
            flag: "Consider declining high-complexity or medico-legally fragile cases.",
          }),
        ];
    }
  })();

  return {
    classification,
    clinicianNotes,
    rows,
  };
}
