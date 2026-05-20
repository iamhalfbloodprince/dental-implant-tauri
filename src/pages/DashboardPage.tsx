import * as api from "@/api/commands";
import type {
  Clinic,
  DashboardClinicRow,
  DashboardRecentLetter,
  DashboardRecentPatient,
  DashboardStats,
} from "@/types/domain";
import { downloadCsvUtf8 } from "@/lib/csvDownload";
import { Button, Card } from "@/components/ui/primitives";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function formatIsoDate(iso: string): string {
  const d = iso.slice(0, 10);
  return d || iso;
}

function BreakdownSection({
  title,
  rows,
  valueHeading,
}: {
  title: string;
  rows?: DashboardClinicRow[];
  valueHeading: string;
}) {
  if (!rows?.length) return null;
  return (
    <Card>
      <h2 className="text-sm font-semibold text-[oklch(0.25_0.02_260)]">
        {title}
      </h2>
      <div className="mt-2 overflow-x-auto text-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-xs uppercase text-[oklch(0.45_0.02_260)]">
              <th className="py-2 pr-3">Clinic</th>
              <th className="py-2 pr-3 text-right tabular-nums">{valueHeading}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.clinicId} className="border-b border-[oklch(0.96_0.01_95)]">
                <td className="py-2 pr-3">{r.clinicName}</td>
                <td className="py-2 text-right tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicScope, setClinicScope] = useState(-1);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState("");
  const [reportsMsg, setReportsMsg] = useState("");

  useEffect(() => {
    api.clinicsList(false).then(setClinics).catch(console.error);
  }, []);

  useEffect(() => {
    setErr("");
    (async () => {
      try {
        const s = await api.dashboardStats(clinicScope);
        setStats(s);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [clinicScope]);

  if (err) {
    return <p className="text-red-600">{err}</p>;
  }
  if (!stats) {
    return <p className="text-sm text-[oklch(0.45_0.02_260)]">Loading…</p>;
  }

  const cards: { label: string; value: number | string }[] = [
    { label: "Patients (non-archived)", value: stats.totalPatients },
    { label: "Active cases", value: stats.activeCases },
    { label: "Completed", value: stats.completedCases },
    { label: "Pending CBCT", value: stats.pendingCbct },
    { label: "Failed cases", value: stats.failedCases },
    { label: "Surgery scheduled", value: stats.surgeryScheduled },
    { label: "Surgery completed", value: stats.surgeryCompleted },
    { label: "Restoration / oss.", value: stats.restorationPhase },
    { label: "On hold", value: stats.onHold },
    { label: "Follow-ups due", value: stats.followUpsDue },
    { label: "Implants placed (logbook)", value: stats.totalImplants },
    { label: "Complications", value: stats.complications },
  ];

  const allClinics = clinicScope < 0;

  const recentPatients: DashboardRecentPatient[] = stats.recentPatients ?? [];
  const recentLetters: DashboardRecentLetter[] = stats.recentLetters ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <label className="flex items-center gap-2 text-sm">
          <span>Clinic scope</span>
          <select
            className="rounded-md border border-[oklch(0.9_0.01_260)] px-2 py-1"
            value={clinicScope}
            onChange={(e) => setClinicScope(Number(e.target.value))}
          >
            <option value={-1}>All clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col items-end gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-[oklch(0.5_0.02_260)]">
            CSV reports
          </span>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setReportsMsg("");
                api
                  .reportsCsvPendingCbct(clinicScope)
                  .then((csv) => {
                    const tag =
                      clinicScope < 0 ? "all-clinics" : `clinic-${clinicScope}`;
                    downloadCsvUtf8(`pending-cbct_${tag}.csv`, csv);
                  })
                  .catch((e) => setReportsMsg(String(e)));
              }}
            >
              Pending CBCT
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setReportsMsg("");
                api
                  .reportsCsvFailedCases(clinicScope)
                  .then((csv) => {
                    const tag =
                      clinicScope < 0 ? "all-clinics" : `clinic-${clinicScope}`;
                    downloadCsvUtf8(`failed-cases_${tag}.csv`, csv);
                  })
                  .catch((e) => setReportsMsg(String(e)));
              }}
            >
              Failed cases
            </Button>
          </div>
          {reportsMsg ? (
            <p className="max-w-xs text-right text-xs text-red-600">
              {reportsMsg}
            </p>
          ) : null}
        </div>
      </div>

      <Card className="rounded-lg border-[oklch(0.9_0.01_95)] bg-[oklch(0.995_0.005_95)] px-4 py-3">
        <h2 className="mb-2 text-sm font-semibold text-[oklch(0.28_0.02_260)]">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/patients/new">
            <Button type="button">New patient</Button>
          </Link>
          <Link to="/logbook/new">
            <Button type="button" variant="ghost">
              New logbook entry
            </Button>
          </Link>
          <Link to="/patients">
            <Button type="button" variant="ghost">
              Patient registry
            </Button>
          </Link>
          <Link to="/reports">
            <Button type="button" variant="ghost">
              Data exports
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-xs font-medium uppercase tracking-wide text-[oklch(0.5_0.02_260)]">
              {c.label}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{c.value}</div>
          </Card>
        ))}
      </div>

      {allClinics ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <BreakdownSection
            title="Patients by clinic"
            rows={stats.patientsPerClinic}
            valueHeading="Patients"
          />
          <BreakdownSection
            title="Implants by clinic (logbook sum)"
            rows={stats.implantsPerClinic}
            valueHeading="Implants"
          />
          <BreakdownSection
            title="Complications by clinic"
            rows={stats.complicationsPerClinic}
            valueHeading="Count"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-[oklch(0.25_0.02_260)]">
            Recently updated patients
          </h2>
          {recentPatients.length === 0 ? (
            <p className="mt-2 text-sm text-[oklch(0.45_0.02_260)]">None yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {recentPatients.map((p) => (
                <li key={p.id}>
                  <Link
                    className="font-medium text-blue-700 underline"
                    to={`/patients/${p.id}`}
                  >
                    {p.lastName}, {p.firstName}
                  </Link>
                  <span className="text-[oklch(0.45_0.02_260)]">
                    {" "}
                    · {p.clinicName} (#{p.id})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-[oklch(0.25_0.02_260)]">
            Recent letters
          </h2>
          {recentLetters.length === 0 ? (
            <p className="mt-2 text-sm text-[oklch(0.45_0.02_260)]">None yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[oklch(0.96_0.01_95)] text-sm">
              {recentLetters.map((L) => (
                <li key={L.id} className="py-2 first:pt-0">
                  <Link
                    className="font-medium text-blue-700 underline"
                    to={`/patients/${L.patientId}`}
                  >
                    {L.title || "Untitled"}
                  </Link>
                  <div className="text-xs text-[oklch(0.45_0.02_260)]">
                    {L.letterType} · {L.patientLastName}, {L.patientFirstName} ·
                    updated {formatIsoDate(L.updatedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
