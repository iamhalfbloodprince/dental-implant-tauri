import * as api from "@/api/commands";
import type { Clinic, Patient } from "@/types/domain";
import { WORKFLOW_OPTIONS } from "@/constants/workflowStatus";
import { Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { formatInvokeError } from "@/lib/invokeError";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";

const EMPTY_PATIENT: Partial<Patient> = {
  firstName: "",
  lastName: "",
  clinicId: 0,
  caseStatus: "enquiry",
  isArchived: false,
  cbctObtained: false,
  cbctReported: false,
  treatmentPlanCreated: false,
  treatmentPlanSent: false,
  consentObtained: false,
};

export function PatientFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNew = location.pathname.endsWith("/new");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editPhase, setEditPhase] = useState<
    "loading" | "ready" | "not_found" | "error"
  >(() => (isNew ? "ready" : "loading"));
  const [patient, setPatient] = useState<Partial<Patient>>(() => ({
    ...EMPTY_PATIENT,
  }));

  useEffect(() => {
    api.clinicsList(false).then(setClinics).catch(console.error);
  }, []);

  useEffect(() => {
    if (isNew) {
      setEditPhase("ready");
      setFormError(null);
      setPatient({ ...EMPTY_PATIENT });
      return;
    }
    if (!id) {
      setEditPhase("error");
      setFormError("Missing patient id.");
      return;
    }
    const numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      setEditPhase("error");
      setFormError("Invalid patient link.");
      return;
    }
    setEditPhase("loading");
    api
      .patientsGet(numId)
      .then((p) => {
        if (p) {
          setPatient(p);
          setEditPhase("ready");
        } else {
          setEditPhase("not_found");
        }
      })
      .catch((e) => {
        setFormError(formatInvokeError(e));
        setEditPhase("error");
      });
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew) return;
    if (clinics.length !== 1) return;
    setPatient((p) =>
      p.clinicId ? p : { ...p, clinicId: clinics[0].id },
    );
  }, [isNew, clinics]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (
      !patient.firstName?.trim() ||
      !patient.lastName?.trim() ||
      !patient.clinicId
    ) {
      const missing: string[] = [];
      if (!patient.clinicId) missing.push("clinic");
      if (!patient.firstName?.trim()) missing.push("first name");
      if (!patient.lastName?.trim()) missing.push("last name");
      setFormError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }
    const payload = {
      clinicId: patient.clinicId,
      clinicRecordNumber: patient.clinicRecordNumber ?? null,
      firstName: patient.firstName.trim(),
      lastName: patient.lastName.trim(),
      gender: patient.gender ?? null,
      dateOfBirth: patient.dateOfBirth ?? null,
      phone: patient.phone ?? null,
      email: patient.email ?? null,
      address: patient.address ?? null,
      emergencyContact: patient.emergencyContact ?? null,
      referralSource: patient.referralSource ?? null,
      referringDoctor: patient.referringDoctor ?? null,
      referringPractice: patient.referringPractice ?? null,
      dateFirstSeen: patient.dateFirstSeen ?? null,
      caseStatus: patient.caseStatus ?? "enquiry",
      notes: patient.notes ?? null,
      isArchived: patient.isArchived ?? false,
      cbctObtained: patient.cbctObtained ?? false,
      cbctReported: patient.cbctReported ?? false,
      failureNotes: patient.failureNotes ?? null,
      treatmentPlanCreated: patient.treatmentPlanCreated ?? false,
      treatmentPlanSent: patient.treatmentPlanSent ?? false,
      consentObtained: patient.consentObtained ?? false,
      implantSystem: patient.implantSystem ?? null,
      implantJourneyNotes: patient.implantJourneyNotes ?? null,
    };
    setSaving(true);
    try {
      if (isNew) {
        const newId = await api.patientsCreate(payload);
        navigate(`/patients/${newId}`);
      } else if (id) {
        await api.patientsUpdate(Number(id), payload);
        navigate(`/patients/${id}`);
      }
    } catch (err) {
      setFormError(formatInvokeError(err) || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && editPhase === "loading") {
    return (
      <Card className="mx-auto max-w-3xl space-y-3 p-4">
        <p className="text-sm">Loading…</p>
      </Card>
    );
  }

  if (!isNew && editPhase === "not_found") {
    return (
      <Card className="mx-auto max-w-3xl space-y-3 p-4">
        <p className="text-sm">Patient not found (it may have been removed).</p>
        <Link to="/patients" className="text-sm text-[oklch(0.45_0.12_250)] underline">
          Back to patients
        </Link>
      </Card>
    );
  }

  if (!isNew && editPhase === "error") {
    return (
      <Card className="mx-auto max-w-3xl space-y-2 p-4">
        <p className="text-sm font-medium">Could not load patient for editing</p>
        {formError ? (
          <p className="text-xs whitespace-pre-wrap text-[oklch(0.4_0.02_260)]">
            {formError}
          </p>
        ) : null}
        <Link to="/patients" className="text-sm text-[oklch(0.45_0.12_250)] underline">
          Back to patients
        </Link>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-lg font-semibold">
        {isNew ? "New patient" : "Edit patient"}
      </h1>
      {formError ? (
        <p
          className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-900"
          role="alert"
        >
          {formError}
        </p>
      ) : null}
      {clinics.length === 0 ? (
        <p className="text-sm text-[oklch(0.42_0.05_30)]">
          No clinics yet — add a clinic under{" "}
          <Link to="/clinics" className="underline">
            Clinics
          </Link>{" "}
          before you can save a patient.
        </p>
      ) : null}
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          Clinic
          <select
            required
            className="mt-1 w-full rounded border px-2 py-1"
            value={patient.clinicId || ""}
            onChange={(e) =>
              setPatient({ ...patient, clinicId: Number(e.target.value) })
            }
          >
            <option value="">Select…</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Clinic record #"
          value={patient.clinicRecordNumber ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, clinicRecordNumber: e.target.value || null })
          }
        />
        <Input
          label="First name"
          required
          value={patient.firstName ?? ""}
          onChange={(e) => setPatient({ ...patient, firstName: e.target.value })}
        />
        <Input
          label="Last name"
          required
          value={patient.lastName ?? ""}
          onChange={(e) => setPatient({ ...patient, lastName: e.target.value })}
        />
        <label className="block text-sm">
          Gender
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={patient.gender ?? ""}
            onChange={(e) =>
              setPatient({ ...patient, gender: e.target.value || null })
            }
          >
            <option value="">—</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <Input
          label="Date of birth (ISO)"
          type="date"
          value={(patient.dateOfBirth ?? "").slice(0, 10)}
          onChange={(e) =>
            setPatient({ ...patient, dateOfBirth: e.target.value || null })
          }
        />
        <Input
          label="Phone"
          value={patient.phone ?? ""}
          onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          value={patient.email ?? ""}
          onChange={(e) => setPatient({ ...patient, email: e.target.value })}
        />
        <Textarea
          label="Address"
          className="min-h-[72px]"
          value={patient.address ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, address: e.target.value || null })
          }
        />
        <Textarea
          label="Emergency contact"
          className="min-h-[72px]"
          value={patient.emergencyContact ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, emergencyContact: e.target.value || null })
          }
        />
        <Input
          label="Referral source"
          value={patient.referralSource ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, referralSource: e.target.value || null })
          }
        />
        <Input
          label="Referring doctor"
          value={patient.referringDoctor ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, referringDoctor: e.target.value || null })
          }
        />
        <Input
          label="Referring practice"
          value={patient.referringPractice ?? ""}
          onChange={(e) =>
            setPatient({
              ...patient,
              referringPractice: e.target.value || null,
            })
          }
        />
        <Input
          label="Date first seen"
          type="date"
          value={(patient.dateFirstSeen ?? "").slice(0, 10)}
          onChange={(e) =>
            setPatient({ ...patient, dateFirstSeen: e.target.value || null })
          }
        />
        <label className="block text-sm sm:col-span-2">
          Case workflow (PRD)
          <select
            className="mt-1 w-full rounded border px-2 py-1"
            value={
              WORKFLOW_OPTIONS.some((o) => o.value === patient.caseStatus)
                ? patient.caseStatus
                : patient.caseStatus || "enquiry"
            }
            onChange={(e) =>
              setPatient({ ...patient, caseStatus: e.target.value })
            }
          >
            {patient.caseStatus &&
            !WORKFLOW_OPTIONS.some((o) => o.value === patient.caseStatus) ? (
              <option value={patient.caseStatus}>
                Legacy: {patient.caseStatus}
              </option>
            ) : null}
            {WORKFLOW_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={patient.cbctObtained ?? false}
            onChange={(e) =>
              setPatient({ ...patient, cbctObtained: e.target.checked })
            }
          />
          CBCT obtained
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={patient.cbctReported ?? false}
            onChange={(e) =>
              setPatient({ ...patient, cbctReported: e.target.checked })
            }
          />
          CBCT reported / interpreted
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={patient.treatmentPlanCreated ?? false}
            onChange={(e) =>
              setPatient({
                ...patient,
                treatmentPlanCreated: e.target.checked,
              })
            }
          />
          Treatment plan created
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={patient.treatmentPlanSent ?? false}
            onChange={(e) =>
              setPatient({ ...patient, treatmentPlanSent: e.target.checked })
            }
          />
          Treatment plan sent
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={patient.consentObtained ?? false}
            onChange={(e) =>
              setPatient({ ...patient, consentObtained: e.target.checked })
            }
          />
          Consent obtained
        </label>
        <Input
          label="Preferred implant system (case)"
          className="sm:col-span-2"
          value={patient.implantSystem ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, implantSystem: e.target.value || null })
          }
        />
        <Textarea
          label="Failure notes"
          className="min-h-[72px] sm:col-span-2"
          value={patient.failureNotes ?? ""}
          onChange={(e) =>
            setPatient({ ...patient, failureNotes: e.target.value || null })
          }
        />
        <Textarea
          label="Implant journey notes"
          className="min-h-[80px] sm:col-span-2"
          value={patient.implantJourneyNotes ?? ""}
          onChange={(e) =>
            setPatient({
              ...patient,
              implantJourneyNotes: e.target.value || null,
            })
          }
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={patient.isArchived ?? false}
            onChange={(e) =>
              setPatient({ ...patient, isArchived: e.target.checked })
            }
          />
          Archived (hidden from default lists)
        </label>
        <Textarea
          label="Notes"
          className="sm:col-span-2"
          value={patient.notes ?? ""}
          onChange={(e) => setPatient({ ...patient, notes: e.target.value })}
        />
        <div className="flex gap-2 pt-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Link to={isNew ? "/patients" : `/patients/${id}`}>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </Card>
  );
}
