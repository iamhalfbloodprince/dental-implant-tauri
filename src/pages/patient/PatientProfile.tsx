import * as api from "@/api/commands";
import type {
  Clinic,
  DoctorProfile,
  LetterTemplate,
  Letter,
  Patient,
  PatientFile,
} from "@/types/domain";
import { mergeLetterPlaceholders } from "@/lib/letterMerge";
import {
  buildPsychologicalTable,
  type HouseMarquitClass,
} from "@/lib/psychologicalOffline";
import { workflowLabel } from "@/constants/workflowStatus";
import { textBodyToPdfBase64 } from "@/services/pdfExport";
import { Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { FdiMouthChart } from "@/components/dental/FdiMouthChart";
import { fdiArchLabel, fdiQuadrantLabel } from "@/lib/fdi";
import { formatInvokeError } from "@/lib/invokeError";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const COMP_TYPES = [
  "Infection",
  "Pain",
  "Swelling",
  "Bleeding",
  "Implant mobility",
  "Failed osseointegration",
  "Peri-implant mucositis",
  "Peri-implantitis",
  "Screw loosening",
  "Prosthetic complication",
  "Nerve-related symptoms",
  "Sinus-related issue",
  "Other",
];

const FU_STATUS = [
  "Stable",
  "Needs review",
  "Complication suspected",
  "Urgent attention",
] as const;

const FILE_CATS = [
  "X-rays",
  "CBCT screenshots",
  "Clinical photos",
  "Referral documents",
  "Consent files",
  "Lab files",
  "Generated letters",
  "Other documents",
];

type TabId =
  | "summary"
  | "medical"
  | "dental"
  | "assessments"
  | "treatment"
  | "letters"
  | "files"
  | "logbook"
  | "followups"
  | "complications";

function ageFromDob(dob?: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob.slice(0, 10));
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return String(age);
}

export function PatientProfilePage() {
  const { id } = useParams();
  const pid = id === undefined || id === "" ? NaN : Number(id);
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("summary");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "ready" | "invalid" | "not_found" | "error"
  >(() =>
    Number.isFinite(Number(id)) && Number(id) > 0 ? "loading" : "invalid",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);

  const loadPatient = useCallback(
    (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (!Number.isFinite(pid) || pid <= 0) {
        setPatient(null);
        setLoadError(null);
        setLoadState("invalid");
        return;
      }
      if (!silent) {
        setLoadState("loading");
        setLoadError(null);
      }
      api.patientsGet(pid)
        .then((p) => {
          if (p) {
            setPatient(p);
            setLoadState("ready");
          } else {
            setPatient(null);
            setLoadState("not_found");
          }
        })
        .catch((e) => {
          console.error(e);
          if (!silent) {
            setPatient(null);
            setLoadError(formatInvokeError(e));
            setLoadState("error");
          }
        });
    },
    [pid],
  );

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  useEffect(() => {
    api.clinicsList(true).then(setClinics).catch(console.error);
    api.doctorProfileGet().then(setDoctor).catch(console.error);
  }, []);

  const clinicName = useMemo(() => {
    if (!patient) return "";
    return clinics.find((c) => c.id === patient.clinicId)?.name ?? "";
  }, [patient, clinics]);

  if (loadState === "loading") {
    return <p className="text-sm">Loading…</p>;
  }

  if (loadState === "invalid") {
    return (
      <Card className="max-w-lg space-y-2 p-4">
        <p className="text-sm">Invalid patient link.</p>
        <Link to="/patients" className="text-sm text-[oklch(0.45_0.12_250)] underline">
          Back to patients
        </Link>
      </Card>
    );
  }

  if (loadState === "not_found") {
    return (
      <Card className="max-w-lg space-y-2 p-4">
        <p className="text-sm">Patient not found (it may have been removed).</p>
        <Link to="/patients" className="text-sm text-[oklch(0.45_0.12_250)] underline">
          Back to patients
        </Link>
      </Card>
    );
  }

  if (loadState === "error") {
    return (
      <Card className="max-w-lg space-y-2 p-4">
        <p className="text-sm font-medium">Could not load patient</p>
        <p className="text-xs whitespace-pre-wrap text-[oklch(0.4_0.02_260)]">
          {loadError ?? "Unknown error"}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => loadPatient()}>
            Retry
          </Button>
          <Link to="/patients">
            <Button type="button" variant="ghost">
              Back to patients
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card className="max-w-lg space-y-2 p-4">
        <p className="text-sm">Could not display this patient.</p>
        <Button type="button" variant="ghost" onClick={() => loadPatient()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">
          {patient.lastName}, {patient.firstName}{" "}
          <span className="text-base font-normal text-[oklch(0.45_0.02_260)]">
            #{patient.id}
          </span>
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link to={`/patients/${id}/edit`}>
            <Button type="button" variant="ghost">
              Edit demographics
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(`/logbook/new?patientId=${pid}&clinicId=${patient.clinicId}`)
            }
          >
            New logbook entry
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b text-sm">
        {(
          [
            "summary",
            "medical",
            "dental",
            "assessments",
            "treatment",
            "letters",
            "files",
            "logbook",
            "followups",
            "complications",
          ] as TabId[]
        ).map((t) => (
          <button
            key={t}
            type="button"
            className={`rounded-t border-b-2 px-2 py-1 capitalize ${
              tab === t
                ? "border-[oklch(0.45_0.12_250)]"
                : "border-transparent text-[oklch(0.45_0.02_260)]"
            }`}
            onClick={() => setTab(t)}
          >
            {t.replace("followups", "follow-ups")}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <Card>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                Clinic
              </dt>
              <dd>{clinicName || patient.clinicId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                Workflow
              </dt>
              <dd>
                {workflowLabel(patient.caseStatus)}{" "}
                {patient.isArchived ? "(archived)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                CBCT
              </dt>
              <dd>
                {patient.cbctObtained ? "Obtained" : "Not obtained"}
                {" · "}
                {patient.cbctReported ? "Reported" : "Not reported"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                DOB / age
              </dt>
              <dd>
                {patient.dateOfBirth ?? "—"} · {ageFromDob(patient.dateOfBirth)}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                Phone / email
              </dt>
              <dd>
                {patient.phone ?? "—"} / {patient.email ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                Address
              </dt>
              <dd className="whitespace-pre-wrap">{patient.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                Plan & consent flags
              </dt>
              <dd>
                {patient.treatmentPlanCreated ? "Plan created · " : "No plan on file · "}
                {patient.treatmentPlanSent ? "Plan sent · " : "Plan not sent · "}
                {patient.consentObtained ? "Consent cleared" : "Consent pending"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
                Notes
              </dt>
              <dd className="whitespace-pre-wrap">{patient.notes ?? "—"}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {tab === "medical" ? (
        <MedicalTab pid={pid} />
      ) : null}
      {tab === "dental" ? (
        <DentalTab pid={pid} />
      ) : null}
      {tab === "assessments" ? (
        <AssessmentsTab
          pid={pid}
          clinicId={patient.clinicId}
          onChanged={() => loadPatient({ silent: true })}
        />
      ) : null}
      {tab === "treatment" ? (
        <TreatmentTab pid={pid} clinicId={patient.clinicId} />
      ) : null}
      {tab === "letters" ? (
        <LettersTab
          pid={pid}
          clinicId={patient.clinicId}
          patient={patient}
          clinicName={clinicName}
          doctor={doctor}
        />
      ) : null}
      {tab === "files" ? (
        <FilesTab pid={pid} clinicId={patient.clinicId} />
      ) : null}
      {tab === "logbook" ? (
        <LogbookInlineTab pid={pid} />
      ) : null}
      {tab === "followups" ? (
        <FollowUpsTab pid={pid} clinicId={patient.clinicId} />
      ) : null}
      {tab === "complications" ? (
        <ComplicationsTab pid={pid} clinicId={patient.clinicId} />
      ) : null}
    </div>
  );
}

function MedicalTab({ pid }: { pid: number }) {
  type M = Record<string, unknown>;
  const [row, setRow] = useState<M | null>(null);
  const [form, setForm] = useState<M>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const m = (await api.medicalGet(pid)) as M | null;
    setRow(m);
    if (!m) {
      setForm({
        diabetesStatus: "",
        heartDisease: false,
        hypertension: false,
        bleedingDisorders: false,
        osteoporosis: false,
        bisphosphonateUse: false,
        radiotherapyHistory: false,
        immunosuppression: false,
        allergies: "",
        currentMedications: "",
        smokingStatus: "",
        alcoholUse: "",
        pregnancyStatus: "",
        asaClassification: "",
        medicalNotes: "",
        flagUncontrolledDiabetes: false,
        flagHeavySmoking: false,
        flagBisphosphonate: false,
        flagRadiotherapy: false,
        flagBleedingRisk: false,
        flagAllergy: false,
        flagImmunosuppression: false,
      });
      return;
    }
    const bool = (v: unknown) => Boolean(v);
    setForm({
      diabetesStatus: m.diabetesStatus ?? "",
      heartDisease: bool(m.heartDisease),
      hypertension: bool(m.hypertension),
      bleedingDisorders: bool(m.bleedingDisorders),
      osteoporosis: bool(m.osteoporosis),
      bisphosphonateUse: bool(m.bisphosphonateUse),
      radiotherapyHistory: bool(m.radiotherapyHistory),
      immunosuppression: bool(m.immunosuppression),
      allergies: m.allergies ?? "",
      currentMedications: m.currentMedications ?? "",
      smokingStatus: m.smokingStatus ?? "",
      alcoholUse: m.alcoholUse ?? "",
      pregnancyStatus: m.pregnancyStatus ?? "",
      asaClassification: m.asaClassification ?? "",
      medicalNotes: m.medicalNotes ?? "",
      flagUncontrolledDiabetes: bool(m.flagUncontrolledDiabetes),
      flagHeavySmoking: bool(m.flagHeavySmoking),
      flagBisphosphonate: bool(m.flagBisphosphonate),
      flagRadiotherapy: bool(m.flagRadiotherapy),
      flagBleedingRisk: bool(m.flagBleedingRisk),
      flagAllergy: bool(m.flagAllergy),
      flagImmunosuppression: bool(m.flagImmunosuppression),
    });
  }

  useEffect(() => {
    load().catch(console.error);
  }, [pid]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      ...form,
      diabetesStatus: normStr(form.diabetesStatus),
      allergies: normStr(form.allergies),
      currentMedications: normStr(form.currentMedications),
      smokingStatus: normStr(form.smokingStatus),
      alcoholUse: normStr(form.alcoholUse),
      pregnancyStatus: normStr(form.pregnancyStatus),
      asaClassification: normStr(form.asaClassification),
      medicalNotes: normStr(form.medicalNotes),
    };
    await api.medicalUpsert(pid, input);
    setMsg("Saved.");
    await load();
    setTimeout(() => setMsg(""), 2500);
  }

  function flagBadge(label: string, on: boolean) {
    return on ? (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950">
        {label}
      </span>
    ) : null;
  }

  const riskOn = Boolean(
    form.flagUncontrolledDiabetes ||
      form.flagHeavySmoking ||
      form.flagBisphosphonate ||
      form.flagRadiotherapy ||
      form.flagBleedingRisk ||
      form.flagAllergy ||
      form.flagImmunosuppression,
  );

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-medium">Medical history</h2>
        {riskOn ? (
          <span className="text-xs uppercase text-red-700">Risk flags on</span>
        ) : null}
      </div>
      <form onSubmit={save} className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-2">
          {flagBadge("Diabetes concern", !!form.flagUncontrolledDiabetes)}
          {flagBadge("Heavy smoking", !!form.flagHeavySmoking)}
          {flagBadge("Bisphosphonate", !!form.flagBisphosphonate)}
          {flagBadge("Radiotherapy", !!form.flagRadiotherapy)}
          {flagBadge("Bleeding risk", !!form.flagBleedingRisk)}
          {flagBadge("Allergies", !!form.flagAllergy)}
          {flagBadge("Immunosuppression", !!form.flagImmunosuppression)}
        </div>
        <details className="rounded border border-[oklch(0.92_0_0)] p-2">
          <summary className="cursor-pointer font-medium">
            Toggle risk flags
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              ["flagUncontrolledDiabetes", "Uncontrolled diabetes"],
              ["flagHeavySmoking", "Heavy smoking"],
              ["flagBisphosphonate", "Bisphosphonate use"],
              ["flagRadiotherapy", "Radiotherapy history"],
              ["flagBleedingRisk", "Bleeding risk"],
              ["flagAllergy", "Allergy concerns"],
              ["flagImmunosuppression", "Immunosuppression"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(form[k])}
                  onChange={(e) =>
                    setForm({ ...form, [k]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </details>
        <Input
          label="Diabetes status"
          value={String(form.diabetesStatus ?? "")}
          onChange={(e) =>
            setForm({ ...form, diabetesStatus: e.target.value })
          }
        />
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["heartDisease", "Heart disease"],
            ["hypertension", "Hypertension"],
            ["bleedingDisorders", "Bleeding disorders"],
            ["osteoporosis", "Osteoporosis"],
            ["bisphosphonateUse", "Bisphosphonate use (history)"],
            ["radiotherapyHistory", "Radiotherapy history"],
            ["immunosuppression", "Immunosuppression"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(form[k])}
                onChange={(e) =>
                  setForm({ ...form, [k]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <Textarea
          label="Allergies"
          value={String(form.allergies ?? "")}
          onChange={(e) => setForm({ ...form, allergies: e.target.value })}
        />
        <Textarea
          label="Current medications"
          value={String(form.currentMedications ?? "")}
          onChange={(e) =>
            setForm({ ...form, currentMedications: e.target.value })
          }
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label="Smoking status"
            value={String(form.smokingStatus ?? "")}
            onChange={(e) =>
              setForm({ ...form, smokingStatus: e.target.value })
            }
          />
          <Input
            label="Alcohol use"
            value={String(form.alcoholUse ?? "")}
            onChange={(e) => setForm({ ...form, alcoholUse: e.target.value })}
          />
          <Input
            label="Pregnancy status"
            value={String(form.pregnancyStatus ?? "")}
            onChange={(e) =>
              setForm({ ...form, pregnancyStatus: e.target.value })
            }
          />
          <Input
            label="ASA classification"
            value={String(form.asaClassification ?? "")}
            onChange={(e) =>
              setForm({ ...form, asaClassification: e.target.value })
            }
          />
        </div>
        <Textarea
          label="Medical notes"
          value={String(form.medicalNotes ?? "")}
          onChange={(e) =>
            setForm({ ...form, medicalNotes: e.target.value })
          }
        />
        <Button type="submit">Save medical history</Button>
        {row ? (
          <p className="text-xs text-[oklch(0.45_0.02_260)]">
            Record id {String(row.id)} · updated {String(row.updatedAt)}
          </p>
        ) : null}
        {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      </form>
    </Card>
  );
}

function DentalTab({ pid }: { pid: number }) {
  type D = Record<string, unknown>;
  const [row, setRow] = useState<D | null>(null);
  const [form, setForm] = useState<D>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const m = (await api.dentalGet(pid)) as D | null;
    setRow(m);
    const blank = "";
    const from = (v: unknown) => (typeof v === "string" ? v : v ?? "");
    if (!m) {
      setForm({
        chiefComplaint: blank,
        missingTeeth: blank,
        previousImplants: blank,
        periodontalHistory: blank,
        oralHygiene: blank,
        cariesRisk: blank,
        bruxismParafunction: blank,
        occlusionNotes: blank,
        dentureHistory: blank,
        previousExtractions: blank,
        aestheticConcerns: blank,
        patientExpectations: blank,
        dentalNotes: blank,
      });
      return;
    }
    setForm({
      chiefComplaint: from(m.chiefComplaint),
      missingTeeth: from(m.missingTeeth),
      previousImplants: from(m.previousImplants),
      periodontalHistory: from(m.periodontalHistory),
      oralHygiene: from(m.oralHygiene),
      cariesRisk: from(m.cariesRisk),
      bruxismParafunction: from(m.bruxismParafunction),
      occlusionNotes: from(m.occlusionNotes),
      dentureHistory: from(m.dentureHistory),
      previousExtractions: from(m.previousExtractions),
      aestheticConcerns: from(m.aestheticConcerns),
      patientExpectations: from(m.patientExpectations),
      dentalNotes: from(m.dentalNotes),
    });
  }

  useEffect(() => {
    load().catch(console.error);
  }, [pid]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const input: Record<string, unknown> = {};
    const keys = Object.keys(form);
    for (const k of keys) {
      input[k] = normStr(form[k]) ?? "";
    }
    await api.dentalUpsert(pid, input);
    setMsg("Saved.");
    await load();
    setTimeout(() => setMsg(""), 2500);
  }

  const fields: [string, string][] = [
    ["chiefComplaint", "Chief complaint"],
    ["missingTeeth", "Missing teeth"],
    ["previousImplants", "Previous implants"],
    ["periodontalHistory", "Periodontal history"],
    ["oralHygiene", "Oral hygiene status"],
    ["cariesRisk", "Caries risk"],
    ["bruxismParafunction", "Bruxism / parafunction"],
    ["occlusionNotes", "Occlusion notes"],
    ["dentureHistory", "Denture history"],
    ["previousExtractions", "Previous extractions"],
    ["aestheticConcerns", "Aesthetic concerns"],
    ["patientExpectations", "Patient expectations"],
    ["dentalNotes", "Dental notes"],
  ];

  return (
    <Card className="space-y-3">
      <h2 className="font-medium">Dental history</h2>
      <form onSubmit={save} className="space-y-3 text-sm">
        {fields.map(([k, label]) => (
          <Textarea
            key={k}
            label={label}
            className="min-h-[70px]"
            value={String(form[k] ?? "")}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        ))}
        <Button type="submit">Save dental history</Button>
        {row ? (
          <p className="text-xs text-[oklch(0.45_0.02_260)]">
            Record id {String(row.id)}
          </p>
        ) : null}
        {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      </form>
    </Card>
  );
}

function AssessmentsTab({
  pid,
  clinicId,
  onChanged,
}: {
  pid: number;
  clinicId: number;
  onChanged: () => void;
}) {
  type A = Record<string, unknown>;
  const [rows, setRows] = useState<A[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [sites, setSites] = useState<A[]>([]);
  /** Implant rows before an assessment exists (applied on Create assessment). */
  const [pendingSites, setPendingSites] = useState<A[]>([]);
  const [sitesMsg, setSitesMsg] = useState<
    | { ok: true; text: string }
    | { ok: false; text: string }
    | null
  >(null);
  const [draft, setDraft] = useState<A>(emptyAssessment(pid, clinicId));

  async function reload() {
    const list = (await api.assessmentsList(pid)) as A[];
    setRows(list);
    onChanged();
  }

  useEffect(() => {
    reload().catch(console.error);
  }, [pid]);

  useEffect(() => {
    if (!sel) {
      setSites([]);
      return;
    }
    api.implantSitesList(sel).then((s) => setSites(s as A[])).catch(console.error);
    api
      .assessmentsGet(sel)
      .then((a) => {
        if (a) setAssessmentFormFromRow(a as A);
      })
      .catch(console.error);
  }, [sel]);

  const displaySites = sel ? sites : pendingSites;

  function applySites(updater: React.SetStateAction<A[]>) {
    if (sel) setSites(updater);
    else setPendingSites(updater);
  }

  function patchWorkingSite(idx: number, patch: Record<string, unknown>) {
    applySites((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  function mapSitesForReplace(rows: A[]) {
    return rows
      .map((s) => ({
        fdiTooth: String(s.fdiTooth ?? "").trim(),
        arch: normStr(s.arch),
        quadrant: normStr(s.quadrant),
        missingToothStatus: normStr(s.missingToothStatus),
        plannedImplantSite: Boolean(s.plannedImplantSite),
        plannedImplantCount: Number(s.plannedImplantCount ?? 1),
        notes: normStr(s.notes),
      }))
      .filter((x) => x.fdiTooth.length > 0);
  }

  const chartSelectedFdis = useMemo(() => {
    const out: number[] = [];
    for (const s of displaySites) {
      const n = parseInt(String(s.fdiTooth ?? "").trim(), 10);
      if (!Number.isNaN(n)) out.push(n);
    }
    return out;
  }, [displaySites]);

  function toggleFdiTooth(fdi: number) {
    if (sel) setSitesMsg(null);
    applySites((prev) => {
      const key = String(fdi);
      const i = prev.findIndex((r) => String(r.fdiTooth ?? "").trim() === key);
      if (i >= 0) return prev.filter((_, j) => j !== i);
      return [
        ...prev,
        {
          fdiTooth: key,
          arch: fdiArchLabel(fdi),
          quadrant: fdiQuadrantLabel(fdi),
          missingToothStatus: "",
          plannedImplantSite: true,
          plannedImplantCount: 1,
          notes: "",
        },
      ];
    });
  }

  function setAssessmentFormFromRow(a: A) {
    const str = (k: string) => String(a[k] ?? "");
    setDraft({
      patientId: pid,
      clinicId,
      assessmentDate: str("assessmentDate").slice(0, 10) || isoToday(),
      status: String(a.status ?? "draft"),
      chiefComplaint: str("chiefComplaint"),
      medicalHistorySummary: str("medicalHistorySummary"),
      dentalHistorySummary: str("dentalHistorySummary"),
      clinicalExamination: str("clinicalExamination"),
      softTissue: str("softTissue"),
      hardTissue: str("hardTissue"),
      periodontal: str("periodontal"),
      occlusion: str("occlusion"),
      radiographicFindings: str("radiographicFindings"),
      cbctNotes: str("cbctNotes"),
      implantSiteSelection: str("implantSiteSelection"),
      boneQualityNotes: str("boneQualityNotes"),
      boneQuantityNotes: str("boneQuantityNotes"),
      riskAssessment: str("riskAssessment"),
      diagnosis: str("diagnosis"),
      treatmentOptions: str("treatmentOptions"),
      recommendedTreatmentSummary: str("recommendedTreatmentSummary"),
      consentNotes: str("consentNotes"),
      followUpPlan: str("followUpPlan"),
      sectionsJson: str("sectionsJson"),
      psychologicalJson: str("psychologicalJson"),
      deepPocketJson: str("deepPocketJson"),
      consentFormsJson: str("consentFormsJson"),
    });
  }

  async function createNew() {
    const id = await api.assessmentsCreate(draft);
    const mapped = mapSitesForReplace(pendingSites);
    await api.implantSitesReplace(Number(id), mapped);
    setPendingSites([]);
    setSitesMsg(null);
    setSel(Number(id));
    setDraft(emptyAssessment(pid, clinicId));
    await reload();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!sel) return;
    await api.assessmentsUpdate(sel, draft);
    await reload();
  }

  async function saveSites() {
    if (!sel) return;
    setSitesMsg(null);
    try {
      const mapped = mapSitesForReplace(sites);
      await api.implantSitesReplace(sel, mapped);
      const s = await api.implantSitesList(sel);
      setSites(s as A[]);
      setSitesMsg({ ok: true, text: "Sites saved." });
    } catch (e) {
      console.error(e);
      setSitesMsg({ ok: false, text: "Could not save sites. Try again." });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-medium">Assessments</h2>
        <ul className="divide-y text-sm">
          {rows.map((r) => (
            <li key={String(r.id)} className="flex flex-wrap items-center gap-2 py-2">
              <button
                type="button"
                className={
                  sel === Number(r.id) ? "font-semibold" : "text-blue-800"
                }
                onClick={() => setSel(Number(r.id))}
              >
                {String(r.assessmentDate)} · {String(r.status)}
              </button>
              <span className="text-[oklch(0.45_0.02_260)]">
                {String(r.diagnosis ?? "").slice(0, 60)}
              </span>
            </li>
          ))}
        </ul>
        {rows.length === 0 ? (
          <p className="text-sm text-[oklch(0.45_0.02_260)]">None yet.</p>
        ) : null}
      </Card>

      <Card className="space-y-3 text-sm">
        <h3 className="font-medium">
          {sel ? `Edit assessment #${sel}` : "New assessment"}
        </h3>
        <form id="assessment-fields" className="space-y-3" onSubmit={saveEdit}>
          <AssessmentFields draft={draft} setDraft={setDraft} />
          <AssessmentJsonBlock draft={draft} setDraft={setDraft} />
        </form>
        <div className="flex flex-wrap gap-2">
          {sel ? (
            <Button type="submit" form="assessment-fields">
              Save assessment
            </Button>
          ) : (
            <Button type="button" onClick={() => createNew().catch(console.error)}>
              Create assessment
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSel(null);
              setPendingSites([]);
              setSitesMsg(null);
              setDraft(emptyAssessment(pid, clinicId));
            }}
          >
            Clear / new
          </Button>
        </div>
      </Card>

      <Card className="space-y-2">
        <h3 className="font-medium">FDI implant sites</h3>
        {!sel ? (
          <p className="text-xs text-[oklch(0.48_0.03_260)]">
            Diagram works before saving the assessment: pick teeth here, then click{" "}
            <span className="font-medium">Create assessment</span> — selected teeth save with it.
            After that, use <span className="font-medium">Save sites</span> when you change them.
          </p>
        ) : null}
        <FdiMouthChart
          selectedFdis={chartSelectedFdis}
          onToggle={toggleFdiTooth}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase">
                <th className="py-1 pr-2">FDI</th>
                <th className="py-1 pr-2">Arch</th>
                <th className="py-1 pr-2">Quad</th>
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Planned site</th>
                <th className="py-1 pr-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {displaySites.map((s, i) => (
                <tr key={`${sel ?? "draft"}-${String(s.id ?? i)}`}>
                  <td className="border-b border-[oklch(0.96_0_0)] py-1 pr-1">
                    <input
                      className="w-full rounded border px-1"
                      value={String(s.fdiTooth ?? "")}
                      onChange={(e) =>
                        patchWorkingSite(i, {
                          fdiTooth: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-[oklch(0.96_0_0)] py-1 pr-1">
                    <input
                      className="w-full rounded border px-1"
                      value={String(s.arch ?? "")}
                      onChange={(e) =>
                        patchWorkingSite(i, { arch: e.target.value })
                      }
                    />
                  </td>
                  <td className="border-b border-[oklch(0.96_0_0)] py-1 pr-1">
                    <input
                      className="w-full rounded border px-1"
                      value={String(s.quadrant ?? "")}
                      onChange={(e) =>
                        patchWorkingSite(i, {
                          quadrant: e.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-[oklch(0.96_0_0)] py-1 pr-1">
                    <input
                      type="number"
                      className="w-16 rounded border px-1"
                      min={1}
                      value={Number(s.plannedImplantCount ?? 1)}
                      onChange={(e) =>
                        patchWorkingSite(i, {
                          plannedImplantCount: Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-[oklch(0.96_0_0)] py-1 pr-1">
                    <input
                      type="checkbox"
                      checked={Boolean(s.plannedImplantSite)}
                      onChange={(e) =>
                        patchWorkingSite(i, {
                          plannedImplantSite: e.target.checked,
                        })
                      }
                    />
                  </td>
                  <td className="border-b border-[oklch(0.96_0_0)] py-1 pr-1">
                    <input
                      className="w-full rounded border px-1"
                      value={String(s.notes ?? "")}
                      onChange={(e) =>
                        patchWorkingSite(i, { notes: e.target.value })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              applySites([
                ...displaySites,
                {
                  fdiTooth: "",
                  arch: "",
                  quadrant: "",
                  missingToothStatus: "",
                  plannedImplantSite: true,
                  plannedImplantCount: 1,
                  notes: "",
                },
              ])
            }
          >
            Add site row
          </Button>
          <Button
            type="button"
            disabled={!sel}
            title={
              sel ? undefined : "Select or create an assessment first"
            }
            onClick={() => saveSites().catch(console.error)}
          >
            Save sites
          </Button>
        </div>
        {sitesMsg ? (
          <p
            role="status"
            className={
              sitesMsg.ok
                ? "text-sm text-green-700"
                : "text-sm text-red-700"
            }
          >
            {sitesMsg.text}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function emptyAssessment(pid: number, cid: number): Record<string, unknown> {
  return {
    patientId: pid,
    clinicId: cid,
    assessmentDate: isoToday(),
    status: "draft",
    chiefComplaint: "",
    medicalHistorySummary: "",
    dentalHistorySummary: "",
    clinicalExamination: "",
    softTissue: "",
    hardTissue: "",
    periodontal: "",
    occlusion: "",
    radiographicFindings: "",
    cbctNotes: "",
    implantSiteSelection: "",
    boneQualityNotes: "",
    boneQuantityNotes: "",
    riskAssessment: "",
    diagnosis: "",
    treatmentOptions: "",
    recommendedTreatmentSummary: "",
    consentNotes: "",
    followUpPlan: "",
    sectionsJson: "",
    psychologicalJson: "",
    deepPocketJson: "",
    consentFormsJson: "",
  };
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

/** Template for structured `sectionsJson` — 24 clinical headings to annotate. */
const ASSESSMENT_SECTION_HEADINGS = [
  "Presenting complaint & expectations",
  "Past medical history (summarised)",
  "Medications, allergies & anticoagulants",
  "Social habits (tobacco/alcohol)",
  "Dental & implant-specific history",
  "Extraoral examination",
  "Intraoral soft tissue examination",
  "Hard tissue / dentition status",
  "Periodontal assessment notes",
  "Occlusion / inter-arch relationship",
  "Diagnostic imaging — intraoral films",
  "Panoramic / tomographic overview",
  "CBCT synthesis & airway notes",
  "Implant receptor site morphology",
  "Bone quality–quantity classification / SAC framing",
  "Neighbour anatomy & safety distances",
  "Surgical feasibility & staging plan",
  "Prosthodontic plan — provisional",
  "Prosthodontic plan — definitive",
  "Alternative treatments discussed",
  "Risk–benefit & prognosis discussion",
  "Informed consent process",
  "Preoperative instructions discussed",
  "Recall, maintenance & medico‑legal notes",
] as const;

function defaultSectionsJson(): string {
  const rows = ASSESSMENT_SECTION_HEADINGS.map((title, i) => ({
    id: i + 1,
    title,
    findings: "",
    completed: false,
  }));
  return JSON.stringify(rows, null, 2);
}

function AssessmentJsonBlock({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const [psychClass, setPsychClass] =
    useState<HouseMarquitClass>("philosophical");
  const [psychCues, setPsychCues] = useState("");

  function jsonTa(k: string, label: string) {
    return (
      <div key={k} className="md:col-span-2">
        <Textarea
          label={label}
          className="min-h-[100px] font-mono text-xs"
          value={String(draft[k] ?? "")}
          onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
          spellCheck={false}
        />
      </div>
    );
  }

  function seedPsych() {
    const bundle = buildPsychologicalTable(psychClass, psychCues || undefined);
    setDraft((prev) => ({
      ...prev,
      psychologicalJson: JSON.stringify(bundle, null, 2),
    }));
  }

  function seedSections() {
    setDraft((prev) => ({
      ...prev,
      sectionsJson: defaultSectionsJson(),
    }));
  }

  function seedConsentChecklist() {
    const checklist = [
      {
        topic: "Implant surgery — material risks explained",
        patientQuestions: "",
        clinicianNotes: "",
        signed: false,
        date: "",
      },
      {
        topic: "CBCT / supplemental imaging consent",
        patientQuestions: "",
        clinicianNotes: "",
        signed: false,
        date: "",
      },
      {
        topic: "Alternatives including dentures / bridgework / no treatment",
        patientQuestions: "",
        clinicianNotes: "",
        signed: false,
        date: "",
      },
      {
        topic: "Sedation / GA referral pathway (if applicable)",
        patientQuestions: "",
        clinicianNotes: "",
        signed: false,
        date: "",
      },
      {
        topic: "Costs, staged payments & cancellations",
        patientQuestions: "",
        clinicianNotes: "",
        signed: false,
        date: "",
      },
    ];
    setDraft((prev) => ({
      ...prev,
      consentFormsJson: JSON.stringify(checklist, null, 2),
    }));
  }

  function seedDeepPocketGrid() {
    const positions = ["MB", "B", "DB", "M", "D", "ML", "L", "DL"];
    const sites = positions.map((positionCode) => ({
      positionCode,
      probingMm: "",
      bleedingOnProbing: false,
      suppuration: false,
      mobilityMiller: "",
    }));
    const row = {
      toothFdi: "",
      quadrantNotes: "",
      sites,
      generalNotes: "",
    };
    setDraft((prev) => ({
      ...prev,
      deepPocketJson: JSON.stringify({ teeth: [row] }, null, 2),
    }));
  }

  return (
    <details className="rounded border border-[oklch(0.92_0_0)] p-2 md:col-span-2">
      <summary className="cursor-pointer text-sm font-medium">
        Structured JSON blobs (sections, psychology, pockets, consent)
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {jsonTa("sectionsJson", "Sections JSON")}
        {jsonTa("psychologicalJson", "Psychological summary JSON")}
        {jsonTa("deepPocketJson", "Deep pocket chart JSON")}
        {jsonTa("consentFormsJson", "Consent forms checklist JSON")}
        <div className="md:col-span-2 space-y-2 rounded bg-[oklch(0.98_0_0)] p-3 text-sm">
          <p className="text-xs text-[oklch(0.45_0.02_260)]">
            Seed a deterministic House–Marquit–style psychology table into{" "}
            <span className="font-mono">psychologicalJson</span> — edit before
            saving.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs">
              Classification
              <select
                className="mt-1 block rounded border px-2 py-1 text-sm"
                value={psychClass}
                onChange={(e) =>
                  setPsychClass(e.target.value as HouseMarquitClass)
                }
              >
                <option value="philosophical">Philosophical</option>
                <option value="exacting">Exacting</option>
                <option value="indifferent">Indifferent</option>
                <option value="hysterical">Hysterical</option>
              </select>
            </label>
          </div>
          <Textarea
            label="Clinician note cues (optional, refines wording)"
            className="min-h-[56px]"
            value={psychCues}
            onChange={(e) => setPsychCues(e.target.value)}
          />
          <Button type="button" variant="ghost" className="text-xs" onClick={seedPsych}>
            Fill psychological JSON
          </Button>
          <div className="md:col-span-2 mt-3 flex flex-wrap gap-2 border-t border-[oklch(0.92_0_0)] pt-3">
            <Button type="button" variant="ghost" className="text-xs" onClick={seedSections}>
              Seed 24-section outline
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={seedDeepPocketGrid}
            >
              Seed pocket chart scaffold
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={seedConsentChecklist}
            >
              Seed consent checklist JSON
            </Button>
          </div>
        </div>
      </div>
    </details>
  );
}

function AssessmentFields({
  draft,
  setDraft,
}: {
  draft: Record<string, unknown>;
  setDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
}) {
  const ta = (
    k: string,
    label: string,
    minH = "min-h-[72px]",
  ) => (
    <Textarea
      key={k}
      label={label}
      className={minH}
      value={String(draft[k] ?? "")}
      onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
    />
  );
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <Input
        label="Assessment date"
        type="date"
        value={String(draft.assessmentDate ?? "").slice(0, 10)}
        onChange={(e) =>
          setDraft({ ...draft, assessmentDate: e.target.value })
        }
      />
      <label className="block text-sm">
        Draft / final
        <select
          className="mt-1 w-full rounded border px-2 py-1"
          value={String(draft.status)}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          <option value="draft">Draft</option>
          <option value="final">Final</option>
        </select>
      </label>
      {ta("chiefComplaint", "Chief complaint")}
      {ta("medicalHistorySummary", "Medical summary")}
      {ta("dentalHistorySummary", "Dental summary")}
      {ta("clinicalExamination", "Clinical examination")}
      {ta("softTissue", "Soft tissue")}
      {ta("hardTissue", "Hard tissue")}
      {ta("periodontal", "Periodontal")}
      {ta("occlusion", "Occlusion")}
      {ta("radiographicFindings", "Radiographic findings")}
      {ta("cbctNotes", "CBCT notes")}
      {ta("implantSiteSelection", "Implant site selection (notes)")}
      {ta("boneQualityNotes", "Bone quality")}
      {ta("boneQuantityNotes", "Bone quantity")}
      {ta("riskAssessment", "Risk assessment")}
      {ta("diagnosis", "Diagnosis")}
      {ta("treatmentOptions", "Treatment options")}
      {ta("recommendedTreatmentSummary", "Recommended treatment summary")}
      {ta("consentNotes", "Consent discussion")}
      {ta("followUpPlan", "Follow-up plan")}
    </div>
  );
}

function TreatmentTab({
  pid,
  clinicId,
}: {
  pid: number;
  clinicId: number;
}) {
  type T = Record<string, unknown>;
  const [plans, setPlans] = useState<T[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [stages, setStages] = useState<T[]>([]);
  const [draft, setDraft] = useState<T>(emptyTreatment(pid, clinicId));

  async function reload() {
    const list = (await api.treatmentPlansList(pid)) as T[];
    setPlans(list);
  }

  useEffect(() => {
    reload().catch(console.error);
  }, [pid]);

  useEffect(() => {
    if (!sel) {
      setStages([]);
      return;
    }
    api
      .treatmentPlansGet(sel)
      .then((r) => {
        if (!r) return;
        treatmentFormFromRow(r as T);
      })
      .catch(console.error);
    api
      .treatmentStagesList(sel)
      .then((s) => setStages(s as T[]))
      .catch(console.error);
  }, [sel]);

  function treatmentFormFromRow(a: T) {
    const b = (k: string) => Boolean(a[k]);
    setDraft({
      patientId: pid,
      clinicId,
      assessmentId: a.assessmentId ?? null,
      treatmentObjective: String(a.treatmentObjective ?? ""),
      proposedImplantSites: String(a.proposedImplantSites ?? ""),
      extractionRequired: b("extractionRequired"),
      boneGraftRequired: b("boneGraftRequired"),
      sinusLiftRequired: b("sinusLiftRequired"),
      softTissueGraftRequired: b("softTissueGraftRequired"),
      guidedSurgeryRequired: b("guidedSurgeryRequired"),
      temporaryRestorationRequired: b("temporaryRestorationRequired"),
      finalRestorationType: String(a.finalRestorationType ?? ""),
      estimatedVisits: a.estimatedVisits ?? null,
      estimatedTimeline: String(a.estimatedTimeline ?? ""),
      costEstimate: String(a.costEstimate ?? ""),
      alternativeOptions: String(a.alternativeOptions ?? ""),
      risksLimitations: String(a.risksLimitations ?? ""),
      notes: String(a.notes ?? ""),
      lineItemsJson: String(
        (a as Record<string, unknown>).lineItemsJson ??
          (a as Record<string, unknown>).line_items_json ??
          "",
      ),
    });
  }

  async function createPlan() {
    const id = await api.treatmentPlansCreate(draft);
    setSel(Number(id));
    setDraft(emptyTreatment(pid, clinicId));
    reload().catch(console.error);
  }

  async function savePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!sel) return;
    await api.treatmentPlansUpdate(sel, draft);
    reload().catch(console.error);
  }

  const boolRows: [string, string][] = [
    ["extractionRequired", "Extraction required"],
    ["boneGraftRequired", "Bone graft"],
    ["sinusLiftRequired", "Sinus lift"],
    ["softTissueGraftRequired", "Soft tissue graft"],
    ["guidedSurgeryRequired", "Guided surgery"],
    ["temporaryRestorationRequired", "Temporary restoration"],
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h2 className="font-medium">Treatment plans</h2>
        <ul className="divide-y text-sm">
          {plans.map((p) => (
            <li key={String(p.id)} className="py-2">
              <button
                type="button"
                className={sel === Number(p.id) ? "font-semibold" : ""}
                onClick={() => setSel(Number(p.id))}
              >
                Plan #{String(p.id)} · visits {String(p.estimatedVisits ?? "—")}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-3 text-sm">
        <h3 className="font-medium">{sel ? `Edit plan #${sel}` : "New plan"}</h3>
        <form id="treatment-fields" className="space-y-3" onSubmit={savePlan}>
          <div className="grid gap-2 md:grid-cols-2">
          <Input
            label="Linked assessment ID (optional)"
            type="number"
            value={draft.assessmentId != null ? String(draft.assessmentId) : ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                assessmentId: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
          <Input
            label="Estimated visits"
            type="number"
            value={draft.estimatedVisits != null ? String(draft.estimatedVisits) : ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                estimatedVisits: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
          {boolRows.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(draft[k])}
                onChange={(ev) =>
                  setDraft({ ...draft, [k]: ev.target.checked })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <Textarea
          label="Treatment objective"
          value={String(draft.treatmentObjective ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, treatmentObjective: e.target.value })
          }
        />
        <Textarea
          label="Proposed implant sites"
          value={String(draft.proposedImplantSites ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, proposedImplantSites: e.target.value })
          }
        />
        <Input
          label="Final restoration type"
          value={String(draft.finalRestorationType ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, finalRestorationType: e.target.value })
          }
        />
        <Textarea
          label="Estimated timeline"
          value={String(draft.estimatedTimeline ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, estimatedTimeline: e.target.value })
          }
        />
        <Textarea
          label="Cost estimate"
          value={String(draft.costEstimate ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, costEstimate: e.target.value })
          }
        />
        <Textarea
          label="Fee line items (JSON array of { code, description, quantity, unitPriceCents })"
          className="min-h-[100px] font-mono text-xs"
          spellCheck={false}
          value={String(draft.lineItemsJson ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, lineItemsJson: e.target.value })
          }
        />
        <Textarea
          label="Alternatives"
          value={String(draft.alternativeOptions ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, alternativeOptions: e.target.value })
          }
        />
        <Textarea
          label="Risks & limitations"
          value={String(draft.risksLimitations ?? "")}
          onChange={(e) =>
            setDraft({ ...draft, risksLimitations: e.target.value })
          }
        />
        <Textarea
          label="Notes"
          value={String(draft.notes ?? "")}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        </form>
        <div className="flex flex-wrap gap-2">
          {sel ? (
            <Button type="submit" form="treatment-fields">
              Save plan
            </Button>
          ) : (
            <Button type="button" onClick={() => createPlan().catch(console.error)}>
              Create plan
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSel(null);
              setDraft(emptyTreatment(pid, clinicId));
            }}
          >
            Clear
          </Button>
        </div>
      </Card>
      {sel ? (
        <Card className="space-y-2 text-sm">
          <h3 className="font-medium">Stages</h3>
          <ul className="space-y-2">
            {stages.map((s) => (
              <li key={String(s.id)} className="flex flex-wrap gap-2 border-b border-[oklch(0.96_0_0)] py-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(s.completed)}
                    onChange={(ev) =>
                      api
                        .treatmentStageSet(Number(s.id), ev.target.checked, null)
                        .then(() =>
                          api
                            .treatmentStagesList(sel)
                            .then((list) => setStages(list as T[])),
                        )
                    }
                  />
                  <span className="font-medium">{String(s.stage)}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function emptyTreatment(pid: number, cid: number): Record<string, unknown> {
  return {
    patientId: pid,
    clinicId: cid,
    assessmentId: null,
    treatmentObjective: "",
    proposedImplantSites: "",
    extractionRequired: false,
    boneGraftRequired: false,
    sinusLiftRequired: false,
    softTissueGraftRequired: false,
    guidedSurgeryRequired: false,
    temporaryRestorationRequired: false,
    finalRestorationType: "",
    estimatedVisits: null,
    estimatedTimeline: "",
    costEstimate: "",
    alternativeOptions: "",
    risksLimitations: "",
    notes: "",
    lineItemsJson: "",
  };
}

function LettersTab({
  pid,
  clinicId,
  patient,
  clinicName,
  doctor,
}: {
  pid: number;
  clinicId: number;
  patient: Patient;
  clinicName: string;
  doctor: DoctorProfile | null;
}) {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [assessRows, setAssessRows] = useState<{ id: number; label: string }[]>(
    [],
  );
  const [linkedAssessmentId, setLinkedAssessmentId] = useState<number | null>(
    null,
  );
  const [title, setTitle] = useState("Letter");
  const [tplId, setTplId] = useState<number | "">("");
  const [body, setBody] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function reload() {
    const [t, l] = await Promise.all([
      api.letterTemplatesList(),
      api.lettersListByPatient(pid),
    ]);
    setTemplates(t);
    setLetters(l);

    api
      .assessmentsList(pid)
      .then((raw) => {
        const rows = raw as Record<string, unknown>[];
        setAssessRows(
          rows.map((a) => ({
            id: Number(a.id),
            label: `Assessment #${String(a.id)} (${String(a.assessmentDate ?? "").slice(0, 10)})`,
          })),
        );
      })
      .catch(console.error);
  }

  useEffect(() => {
    reload().catch(console.error);
  }, [pid]);

  function varsForMerger(extra: Record<string, string>) {
    return {
      patient_name: `${patient.firstName} ${patient.lastName}`.trim(),
      patient_age: ageFromDob(patient.dateOfBirth),
      patient_dob: patient.dateOfBirth ?? "",
      patient_id: String(patient.id),
      clinic_name: clinicName || String(clinicId),
      clinic_address: "",
      clinic_phone: "",
      clinic_email: "",
      doctor_name: doctor?.name ?? "",
      assessment_date: "",
      diagnosis: extra.diagnosis ?? "",
      treatment_plan: extra.treatment_plan ?? "",
      implant_sites: extra.implant_sites ?? "",
      risk_notes: extra.risk_notes ?? "",
      consent_notes: extra.consent_notes ?? "",
      next_steps: extra.next_steps ?? "",
    };
  }

  function applyTemplate() {
    const t =
      tplId !== "" ? templates.find((x) => x.id === tplId) : templates[0];
    if (!t) return;
    const merged = mergeLetterPlaceholders(t.body, varsForMerger({}));
    setBody(merged);
    setTitle(`${t.name} — ${patient.lastName}`);
  }

  async function mergeFromLinkedAssessment() {
    if (!linkedAssessmentId) {
      setMsg("Choose a linked assessment first.");
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    const a = await api.assessmentsGet(linkedAssessmentId);
    if (!a || typeof a !== "object") return;
    const rec = a as Record<string, unknown>;
    const extra = {
      diagnosis: String(rec.diagnosis ?? ""),
      treatment_plan: String(rec.recommendedTreatmentSummary ?? ""),
      implant_sites: String(rec.implantSiteSelection ?? ""),
      risk_notes: String(rec.riskAssessment ?? ""),
      consent_notes: String(rec.consentNotes ?? ""),
      next_steps: String(rec.followUpPlan ?? ""),
    };
    const merged = mergeLetterPlaceholders(body, varsForMerger(extra));
    const appendix = [
      "",
      "--- Clinical record appendix ---",
      `Assessment date: ${String(rec.assessmentDate ?? "").slice(0, 10)}`,
      "",
      "Recommended plan:",
      String(rec.recommendedTreatmentSummary ?? ""),
      "",
      "Consent discussion:",
      String(rec.consentNotes ?? ""),
    ].join("\n");
    setBody(`${merged}\n${appendix}`);
    setMsg("Merged from assessment.");
    setTimeout(() => setMsg(""), 2500);
  }

  async function saveLetter(createNew: boolean) {
    const input = {
      patientId: pid,
      clinicId,
      templateId: tplId !== "" ? tplId : null,
      assessmentId: linkedAssessmentId,
      letterType:
        tplId !== ""
          ? templates.find((x) => x.id === tplId)?.letterType ?? "Custom"
          : "Custom",
      title,
      body,
    };
    if (createNew || !editId) {
      const id = await api.lettersCreate(input);
      setEditId(Number(id));
    } else {
      await api.lettersUpdate(editId, input);
    }
    setMsg("Saved.");
    reload().catch(console.error);
    setTimeout(() => setMsg(""), 2000);
  }

  async function exportPdfToPatient() {
    const input = {
      patientId: pid,
      clinicId,
      templateId: tplId !== "" ? tplId : null,
      assessmentId: linkedAssessmentId,
      letterType:
        tplId !== ""
          ? templates.find((x) => x.id === tplId)?.letterType ?? "Custom"
          : "Custom",
      title,
      body,
    };
    let letterId = editId;
    if (!letterId) {
      letterId = Number(await api.lettersCreate(input));
      setEditId(letterId);
    } else {
      await api.lettersUpdate(letterId, input);
    }
    const b64 = textBodyToPdfBase64(body);
    const safe = `${title.replace(/\W+/g, "_")}_${letterId}`;
    await api.lettersAttachPdf({
      letterId,
      pdfBase64: b64,
      fileName: `${safe}.pdf`,
    });
    setMsg("PDF saved under patient files (Generated letters).");
    reload().catch(console.error);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="space-y-2 text-sm lg:col-span-1">
        <h2 className="font-medium">Saved letters</h2>
        <ul className="max-h-[320px] space-y-1 overflow-auto">
          {letters.map((l) => (
            <li key={String(l.id)}>
              <button
                type="button"
                className={`text-left underline ${editId === Number(l.id) ? "font-semibold" : ""}`}
                onClick={() => {
                  setEditId(Number(l.id));
                  setTitle(String(l.title ?? ""));
                  setBody(String(l.body ?? ""));
                  setTplId(
                    typeof l.templateId === "number" ? l.templateId : "",
                  );
                  setLinkedAssessmentId(
                    typeof l.assessmentId === "number"
                      ? l.assessmentId
                      : null,
                  );
                }}
              >
                {String(l.title)}{" "}
                <span className="text-xs text-[oklch(0.45_0.02_260)]">
                  {String(l.updatedAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-3 text-sm lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2">
            Template
            <select
              className="rounded border px-2 py-1"
              value={tplId === "" ? "" : tplId}
              onChange={(e) =>
                setTplId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">—</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={applyTemplate}
          >
            Merge template vars
          </Button>
          <label className="flex flex-wrap items-center gap-2">
            <select
              className="rounded border px-2 py-1"
              value={linkedAssessmentId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setLinkedAssessmentId(v ? Number(v) : null);
              }}
            >
              <option value="">— None —</option>
              {assessRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => mergeFromLinkedAssessment().catch(console.error)}
          >
            Merge + appendix from linked assessment
          </Button>
        </div>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea label="Letter body" className="min-h-[240px]" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => saveLetter(false).catch(console.error)}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={() => saveLetter(true).catch(console.error)}>
            Save as new
          </Button>
          <Button type="button" variant="ghost" onClick={() => exportPdfToPatient().catch(console.error)}>
            Save PDF + file record
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditId(null);
              setTitle("Letter");
              setBody("");
              setLinkedAssessmentId(null);
            }}
          >
            New draft
          </Button>
        </div>
        {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
        <p className="text-xs text-[oklch(0.45_0.02_260)]">
          Clinic header/footer for print can be pasted into the letter body from
          Settings → clinics.
        </p>
      </Card>
    </div>
  );
}



function FilesTab({ pid, clinicId }: { pid: number; clinicId: number }) {
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [cat, setCat] = useState(FILE_CATS[0]);
  const [importAssessmentId, setImportAssessmentId] = useState<number | null>(
    null,
  );
  const [assessRows, setAssessRows] = useState<{ id: number; label: string }[]>(
    [],
  );

  async function load() {
    const f = await api.filesListPatient(pid);
    setFiles(f);
  }
  useEffect(() => {
    load().catch(console.error);
    api
      .assessmentsList(pid)
      .then((raw) => {
        const rows = raw as Record<string, unknown>[];
        setAssessRows(
          rows.map((a) => ({
            id: Number(a.id),
            label: `Assessment #${String(a.id)} (${String(a.assessmentDate ?? "").slice(0, 10)})`,
          })),
        );
      })
      .catch(console.error);
  }, [pid]);
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          className="rounded border px-2 py-1"
          value={cat}
          onChange={(e) => setCat(e.target.value)}
        >
          {FILE_CATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex flex-wrap items-center gap-2">
          Linked assessment (optional)
          <select
            className="rounded border px-2 py-1"
            value={importAssessmentId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setImportAssessmentId(v ? Number(v) : null);
            }}
          >
            <option value="">— None —</option>
            {assessRows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          onClick={async () => {
            await api.fileImportDialog({
              patientId: pid,
              clinicId,
              category: cat,
              notes: null,
              assessmentId: importAssessmentId,
            });
            await load();
          }}
        >
          Import file…
        </Button>
      </div>
      <ul className="divide-y text-sm">
        {files.map((f) => (
          <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              {f.originalName}{" "}
              <span className="text-xs text-[oklch(0.45_0.02_260)]">
                ({f.category})
                {f.assessmentId != null
                  ? ` · assessment #${f.assessmentId}`
                  : ""}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={f.includeInLetter}
                  onChange={async (e) => {
                    await api.fileSetIncludeInLetter(f.id, e.target.checked);
                    await load();
                  }}
                />
                Include in letter
              </label>
              <Button
                variant="ghost"
                type="button"
                className="text-xs"
                onClick={() => api.fileOpenPath(f.localPath)}
              >
                Open
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function LogbookInlineTab({ pid }: { pid: number }) {
  type R = Record<string, unknown>;
  const [rows, setRows] = useState<R[]>([]);
  async function load() {
    const list = await api.logbookList({
      clinicId: null,
      patientId: pid,
      dateFrom: null,
      dateTo: null,
    });
    setRows(list as R[]);
  }
  useEffect(() => {
    load().catch(console.error);
  }, [pid]);
  return (
    <Card className="space-y-2 text-sm">
      <div className="flex justify-between gap-2">
        <span className="font-medium">Logbook entries for this patient</span>
      </div>
      <table className="w-full text-left">
        <thead className="text-xs uppercase text-[oklch(0.45_0.02_260)]">
          <tr>
            <th className="py-1 pr-2">Date</th>
            <th className="py-1 pr-2">Site</th>
            <th className="py-1 pr-2">#</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t border-[oklch(0.96_0_0)]">
              <td className="py-1 pr-2">{String(r.surgeryDate)}</td>
              <td className="py-1 pr-2">{String(r.implantSite ?? "—")}</td>
              <td className="py-1 pr-2">
                <Link className="underline" to={`/logbook/edit/${String(r.id)}`}>
                  Edit #{String(r.id)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function FollowUpsTab({
  pid,
  clinicId,
}: {
  pid: number;
  clinicId: number;
}) {
  type R = Record<string, unknown>;
  const [rows, setRows] = useState<R[]>([]);
  const [form, setForm] = useState<{
    followUpDate: string;
    followUpType: string;
    status: (typeof FU_STATUS)[number];
    nextReviewDate: string;
    clinicalFindings: string;
    notes: string;
    pain: boolean;
    swelling: boolean;
    bleeding: boolean;
    mobility: boolean;
  }>({
    followUpDate: isoToday(),
    followUpType: "",
    status: FU_STATUS[0],
    nextReviewDate: "",
    clinicalFindings: "",
    notes: "",
    pain: false,
    swelling: false,
    bleeding: false,
    mobility: false,
  });

  async function load() {
    const list = await api.followUpsListPatient(pid);
    setRows(list as R[]);
  }
  useEffect(() => {
    load().catch(console.error);
  }, [pid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.followUpsCreate({
      patientId: pid,
      clinicId,
      followUpDate: form.followUpDate,
      followUpType: form.followUpType || null,
      clinicalFindings: form.clinicalFindings || null,
      pain: form.pain,
      swelling: form.swelling,
      bleeding: form.bleeding,
      mobility: form.mobility,
      periImplantTissue: null,
      oralHygiene: null,
      radiographicNotes: null,
      maintenanceAdvice: null,
      nextReviewDate: form.nextReviewDate || null,
      status: form.status,
      notes: form.notes || null,
    });
    await load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-2 text-sm">
        <h3 className="font-medium">History</h3>
        <ul className="max-h-[380px] space-y-2 overflow-auto">
          {rows.map((r) => (
            <li key={String(r.id)} className="border-b border-[oklch(0.96_0_0)] pb-2">
              <div className="font-medium">{String(r.followUpDate)}</div>
              <div>{String(r.status)}</div>
              <div className="text-[oklch(0.45_0.02_260)] text-xs">{String(r.notes ?? "")}</div>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-medium text-sm">New follow-up</h3>
        <form onSubmit={submit} className="space-y-2 text-sm">
          <Input
            label="Visit date"
            type="date"
            value={form.followUpDate}
            onChange={(e) =>
              setForm({ ...form, followUpDate: e.target.value })
            }
          />
          <label className="block text-sm">
            Status
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as (typeof FU_STATUS)[number],
                })
              }
            >
              {FU_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Type"
            value={form.followUpType}
            onChange={(e) =>
              setForm({ ...form, followUpType: e.target.value })
            }
          />
          <Input
            label="Next review date"
            type="date"
            value={form.nextReviewDate}
            onChange={(e) =>
              setForm({ ...form, nextReviewDate: e.target.value })
            }
          />
          <Textarea
            label="Clinical findings"
            value={form.clinicalFindings}
            onChange={(e) =>
              setForm({ ...form, clinicalFindings: e.target.value })
            }
          />
          <div className="flex flex-wrap gap-2">
            {(["pain", "swelling", "bleeding", "mobility"] as const).map(
              (k) => (
                <label key={k} className="flex items-center gap-1 capitalize">
                  <input
                    type="checkbox"
                    checked={Boolean(form[k])}
                    onChange={(e) =>
                      setForm({ ...form, [k]: e.target.checked })
                    }
                  />
                  {k}
                </label>
              ),
            )}
          </div>
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <Button type="submit">Add follow-up</Button>
        </form>
      </Card>
    </div>
  );
}

function ComplicationsTab({
  pid,
  clinicId,
}: {
  pid: number;
  clinicId: number;
}) {
  type R = Record<string, unknown>;
  const [rows, setRows] = useState<R[]>([]);
  const [form, setForm] = useState({
    dateIdentified: isoToday(),
    complicationType: COMP_TYPES[0],
    severity: "",
    description: "",
    actionTaken: "",
    outcome: "",
    followUpRequired: false,
    resolved: false,
  });

  async function load() {
    const list = await api.complicationsListPatient(pid);
    setRows(list as R[]);
  }
  useEffect(() => {
    load().catch(console.error);
  }, [pid]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await api.complicationsCreate({
      patientId: pid,
      clinicId,
      logbookEntryId: null,
      dateIdentified: form.dateIdentified,
      severity: form.severity || null,
      complicationType: form.complicationType,
      description: form.description || null,
      actionTaken: form.actionTaken || null,
      outcome: form.outcome || null,
      followUpRequired: form.followUpRequired,
      resolved: form.resolved,
    });
    await load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-2 text-sm">
        <h3 className="font-medium">History</h3>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={String(r.id)} className="border-b border-[oklch(0.96_0_0)] pb-2">
              <div className="font-medium">{String(r.dateIdentified)}</div>
              <div>{String(r.complicationType)} · {String(r.severity ?? "—")}</div>
              <div className="text-xs">{String(r.description ?? "")}</div>
              {Boolean(r.resolved) ? (
                <span className="text-xs text-green-700">Resolved</span>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-medium text-sm">Log complication</h3>
        <form onSubmit={submit} className="space-y-2 text-sm">
          <Input
            label="Date identified"
            type="date"
            value={form.dateIdentified}
            onChange={(e) =>
              setForm({ ...form, dateIdentified: e.target.value })
            }
          />
          <label className="block text-sm">
            Type
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={form.complicationType}
              onChange={(e) =>
                setForm({ ...form, complicationType: e.target.value })
              }
            >
              {COMP_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Severity"
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <Textarea
            label="Action taken"
            value={form.actionTaken}
            onChange={(e) =>
              setForm({ ...form, actionTaken: e.target.value })
            }
          />
          <Textarea
            label="Outcome"
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.followUpRequired}
              onChange={(e) =>
                setForm({ ...form, followUpRequired: e.target.checked })
              }
            />
            Follow-up required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.resolved}
              onChange={(e) =>
                setForm({ ...form, resolved: e.target.checked })
              }
            />
            Resolved
          </label>
          <Button type="submit">Save complication</Button>
        </form>
      </Card>
    </div>
  );
}

function normStr(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
  return s.length ? s : null;
}
