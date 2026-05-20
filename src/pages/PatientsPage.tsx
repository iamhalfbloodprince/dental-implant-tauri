import * as api from "@/api/commands";
import type { Clinic, Patient } from "@/types/domain";
import { WORKFLOW_OPTIONS, workflowLabel } from "@/constants/workflowStatus";
import { Button, Card, Input } from "@/components/ui/primitives";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export function PatientsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [clinicFilter, setClinicFilter] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [includeArchived, setIncludeArchived] = useState(false);

  async function load() {
    const [cs, ps] = await Promise.all([
      api.clinicsList(false),
      api.patientsSearch({
        query: q || undefined,
        clinicId: clinicFilter ?? null,
        status: statusFilter ?? null,
        includeArchived,
      }),
    ]);
    setClinics(cs);
    setPatients(ps);
  }

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Patients</h1>
      <Card className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            label="Search"
            placeholder="Name, phone, clinic record #, patient ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <label className="block text-sm">
            <span className="text-[oklch(0.35_0.02_260)]">Clinic</span>
            <select
              className="mt-1 w-full rounded-md border px-2 py-1.5"
              value={clinicFilter ?? ""}
              onChange={(e) =>
                setClinicFilter(
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
            >
              <option value="">All</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[oklch(0.35_0.02_260)]">Status</span>
            <select
              className="mt-1 w-full rounded-md border px-2 py-1.5"
              value={statusFilter ?? ""}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
            >
              <option value="">All</option>
              {WORKFLOW_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include archived patients
        </label>
        <Button type="button" onClick={() => load()}>
          Apply filters
        </Button>
      </Card>
      <ul className="space-y-2">
        {patients.map((p) => (
          <li key={p.id}>
            <Link to={`/patients/${p.id}`}>
              <Card className="transition hover:bg-[oklch(0.99_0_0)]">
                <span className="font-medium">
                  {p.lastName}, {p.firstName}
                </span>
                <span className="ml-2 text-sm text-[oklch(0.45_0.02_260)]">
                  #{p.id} · {workflowLabel(p.caseStatus)}
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[oklch(0.45_0.02_260)]">
        <Link className="underline" to="/patients/new">
          Create patient
        </Link>
      </p>
    </div>
  );
}
