import * as api from "@/api/commands";
import type {
  Clinic,
  DoctorProfile,
  LetterTemplate,
  LogbookEntry,
} from "@/types/domain";
import { downloadTextPdf } from "@/services/pdfExport";
import { downloadCsvUtf8 } from "@/lib/csvDownload";
import { Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type LogbookRow = Pick<
  LogbookEntry,
  | "id"
  | "patientId"
  | "surgeryDate"
  | "implantSite"
  | "implantSystem"
  | "implantCount"
  | "outcome"
  | "sacClassification"
  | "cbctStatus"
  | "implantFailure"
>;

function LogRow({ row }: { row: LogbookRow }) {
  return (
    <tr className="border-b border-[oklch(0.96_0.01_95)]">
      <td className="py-2 pr-2 whitespace-nowrap">{row.surgeryDate}</td>
      <td className="py-2 pr-2">{row.patientId}</td>
      <td className="py-2 pr-2">{row.implantSite ?? "—"}</td>
      <td className="py-2 pr-2">{row.implantSystem ?? "—"}</td>
      <td className="py-2 pr-2 text-xs">{row.sacClassification ?? "—"}</td>
      <td className="py-2 pr-2 text-xs">{row.cbctStatus ?? "—"}</td>
      <td className="py-2 pr-2">{row.implantFailure ? "⚠️" : "—"}</td>
      <td className="py-2 pr-2">{row.implantCount}</td>
      <td className="py-2 pr-2 text-xs">{row.outcome ?? "—"}</td>
      <td className="py-2 pr-2">
        <Link className="text-blue-700 underline" to={`/logbook/edit/${row.id}`}>
          Edit
        </Link>
      </td>
    </tr>
  );
}

export function LogbookPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicId, setClinicId] = useState<number>(-1);
  const [patientIdFilter, setPatientIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cbctMatch, setCbctMatch] = useState("");
  const [sacMatch, setSacMatch] = useState("");
  const [implantFailureOnly, setImplantFailureOnly] = useState(false);
  const [rows, setRows] = useState<LogbookEntry[]>([]);

  function filters() {
    const pid = patientIdFilter.trim();
    const pnum = pid ? Number(pid) : null;
    return {
      clinicId: clinicId < 0 ? null : clinicId,
      patientId: pnum && Number.isFinite(pnum) && pnum > 0 ? pnum : null,
      dateFrom: dateFrom.trim() || null,
      dateTo: dateTo.trim() || null,
      cbctStatus: cbctMatch.trim() || null,
      sacClassification: sacMatch.trim() || null,
      implantFailureOnly,
    };
  }

  async function load() {
    await api.clinicsList(false).then(setClinics);
    const list = await api.logbookList(filters());
    setRows(list);
  }

  useEffect(() => {
    api.clinicsList(false).then(setClinics).catch(console.error);
  }, []);

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  async function exportCsv() {
    const csv = await api.exportLogbookCsv(filters());
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "logbook.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdfSnapshot() {
    const lines = rows.map((r) =>
      [
        r.surgeryDate,
        r.patientId,
        r.implantSite ?? "",
        r.implantSystem ?? "",
        r.sacClassification ?? "",
        r.cbctStatus ?? "",
        r.implantFailure ? "Y" : "",
        r.implantCount,
        r.outcome ?? "",
      ].join("\t"),
    );
    downloadTextPdf(
      "implant-logbook-report",
      `Implant logbook export\nGenerated locally (offline).\n\n${[
        "date\tpatient\timplant_site\tsystem\tsac\tcbct\timplant_fail\tcount\toutcome",
      ]
        .concat(lines)
        .join("\n")}`,
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Implant logbook</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/logbook/new">
            <Button type="button">New entry</Button>
          </Link>
          <label className="flex items-center gap-2 text-sm">
            Clinic
            <select
              className="rounded border px-2 py-1"
              value={clinicId}
              onChange={(e) => setClinicId(Number(e.target.value))}
            >
              <option value={-1}>All</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label=""
            placeholder="Patient ID"
            className="w-28 px-2 py-1 text-sm"
            value={patientIdFilter}
            onChange={(e) => setPatientIdFilter(e.target.value)}
          />
          <Input
            type="date"
            label=""
            className="w-36 px-2 py-1 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            type="date"
            label=""
            className="w-36 px-2 py-1 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Input
            label=""
            placeholder="CBCT status ="
            className="w-36 px-2 py-1 text-sm"
            value={cbctMatch}
            onChange={(e) => setCbctMatch(e.target.value)}
          />
          <Input
            label=""
            placeholder="SAC ="
            className="w-28 px-2 py-1 text-sm"
            value={sacMatch}
            onChange={(e) => setSacMatch(e.target.value)}
          />
          <label className="flex items-center gap-1 whitespace-nowrap text-xs">
            <input
              type="checkbox"
              checked={implantFailureOnly}
              onChange={(e) => setImplantFailureOnly(e.target.checked)}
            />
            Impl. fail only
          </label>
          <Button type="button" variant="ghost" onClick={() => load()}>
            Apply
          </Button>
          <Button type="button" variant="ghost" onClick={() => exportCsv()}>
            Export CSV
          </Button>
          <Button type="button" variant="ghost" onClick={exportPdfSnapshot}>
            Export PDF summary
          </Button>
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto text-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-xs uppercase text-[oklch(0.45_0.02_260)]">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Patient</th>
                <th className="py-2 pr-2">Site</th>
                <th className="py-2 pr-2">System</th>
                <th className="py-2 pr-2">SAC</th>
                <th className="py-2 pr-2">CBCT</th>
                <th className="py-2 pr-2">Fail</th>
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Outcome</th>
                <th className="py-2 pr-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <LogRow key={r.id} row={r as LogbookRow} />
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-[oklch(0.45_0.02_260)]">
              No entries yet.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [editingTpl, setEditingTpl] = useState<LetterTemplate | null>(null);
  const [pwd, setPwd] = useState({ current: "", next: "", repeat: "" });
  const [pwdMsg, setPwdMsg] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.doctorProfileGet().then(setProfile).catch(console.error);
    api.clinicsList(true).then(setClinics).catch(console.error);
    api.letterTemplatesList().then(setTemplates).catch(console.error);
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await api.doctorProfileUpdate(profile);
    window.dispatchEvent(new Event("doctor-profile-changed"));
    setMsg("Profile saved.");
    setTimeout(() => setMsg(""), 2000);
  }

  async function changePwd(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg("");
    if (pwd.next.length < 8) {
      setPwdMsg("New password needs at least 8 characters.");
      return;
    }
    if (pwd.next !== pwd.repeat) {
      setPwdMsg("New passwords do not match.");
      return;
    }
    try {
      await api.authChangePassword(pwd.current, pwd.next);
      setPwdMsg("Password updated.");
      setPwd({ current: "", next: "", repeat: "" });
    } catch (err) {
      setPwdMsg(String(err));
    }
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTpl) return;
    await api.letterTemplateUpdate(editingTpl.id, {
      name: editingTpl.name,
      letterType: editingTpl.letterType,
      body: editingTpl.body,
    });
    setEditingTpl(null);
    setTemplates(await api.letterTemplatesList());
  }

  if (!profile) {
    return <p className="text-sm">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <h2 className="mb-2 font-medium">Doctor profile</h2>
        <form onSubmit={saveProfile} className="space-y-2 text-sm">
          <Input
            label="Name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <Input
            label="Title / qualification"
            value={profile.title ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, title: e.target.value || null })
            }
          />
          <Input
            label="Registration #"
            value={profile.registrationNumber ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                registrationNumber: e.target.value || null,
              })
            }
          />
          <Textarea
            label="Signature block (letters)"
            value={profile.signatureBlock ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                signatureBlock: e.target.value || null,
              })
            }
          />
          <Input
            label="Phone"
            value={profile.contactPhone ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, contactPhone: e.target.value || null })
            }
          />
          <Input
            label="Email"
            value={profile.contactEmail ?? ""}
            onChange={(e) =>
              setProfile({ ...profile, contactEmail: e.target.value || null })
            }
          />
          <label className="block text-sm">
            Default clinic
            <select
              className="mt-1 w-full rounded border px-2 py-1"
              value={profile.defaultClinicId ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  defaultClinicId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">—</option>
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Preferred backup folder (note)"
            placeholder="Reminder only — picker still prompts"
            value={profile.backupLocation ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                backupLocation: e.target.value || null,
              })
            }
          />
          <Input
            label="Preferred export folder (note)"
            value={profile.exportLocation ?? ""}
            onChange={(e) =>
              setProfile({
                ...profile,
                exportLocation: e.target.value || null,
              })
            }
          />
          <Input
            label="Auto-lock after idle (minutes)"
            type="number"
            min={0}
            placeholder="0 = off"
            value={
              profile.autoLockMinutes != null
                ? String(profile.autoLockMinutes)
                : ""
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (raw === "") {
                setProfile({ ...profile, autoLockMinutes: null });
                return;
              }
              const n = Math.round(Number(raw));
              setProfile({
                ...profile,
                autoLockMinutes:
                  Number.isFinite(n) && n > 0 ? n : null,
              });
            }}
          />
          <p className="text-xs text-[oklch(0.45_0.02_260)]">
            After this many minutes without pointer, keypress or scroll
            activity in the main window, you are returned to login. Leave empty or
            set 0 stored as off — use a positive integer to enable (e.g. 15).
          </p>
          <Button type="submit">Save profile</Button>
          {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
        </form>
      </Card>

      <Card className="space-y-3 text-sm">
        <h2 className="font-medium">Letter templates</h2>
        <ul className="divide-y">
          {templates.map((t) => (
            <li key={t.id} className="flex justify-between gap-2 py-2">
              <span>{t.name}</span>
              <Button type="button" variant="ghost" className="text-xs" onClick={() => setEditingTpl(t)}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
        {editingTpl ? (
          <form onSubmit={saveTemplate} className="space-y-2 rounded border border-[oklch(0.9_0.01_260)] p-3">
            <Input
              label="Template name"
              value={editingTpl.name}
              onChange={(e) =>
                setEditingTpl({ ...editingTpl, name: e.target.value })
              }
            />
            <Input
              label="Letter type"
              value={editingTpl.letterType}
              onChange={(e) =>
                setEditingTpl({ ...editingTpl, letterType: e.target.value })
              }
            />
            <Textarea
              label="Body (use {{patient_name}}, etc.)"
              className="min-h-[200px]"
              value={editingTpl.body}
              onChange={(e) =>
                setEditingTpl({ ...editingTpl, body: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button type="submit">Save template</Button>
              <Button type="button" variant="ghost" onClick={() => setEditingTpl(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">Security</h2>
        <form onSubmit={changePwd} className="space-y-2 text-sm">
          <Input
            label="Current password"
            type="password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
          />
          <Input
            label="New password (min 8)"
            type="password"
            value={pwd.next}
            onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={pwd.repeat}
            onChange={(e) => setPwd({ ...pwd, repeat: e.target.value })}
          />
          <Button type="submit">Update password</Button>
          {pwdMsg ? <p className="text-xs text-green-700">{pwdMsg}</p> : null}
        </form>
      </Card>
    </div>
  );
}

export function BackupPage() {
  const [lastPath, setLastPath] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function createBackup() {
    setBusy(true);
    setErr("");
    try {
      const p = await api.backupCreate();
      setLastPath(p);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    if (
      !confirm(
        "Restoring will replace the local database and files. Continue?",
      )
    ) {
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.backupRestore();
      alert("Restore complete. Restart the app if anything looks out of sync.");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Backup & restore</h1>
      <Card className="space-y-3 text-sm">
        <p className="text-[oklch(0.45_0.02_260)]">
          Backups are ZIP files containing your SQLite database and patient file
          tree. Store them outside this machine for disaster recovery.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => createBackup()}>
            Create backup…
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => restore()}
          >
            Restore from ZIP…
          </Button>
        </div>
        {lastPath ? (
          <p className="text-xs break-all text-[oklch(0.35_0.02_260)]">
            Last saved: {lastPath}
          </p>
        ) : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </Card>
    </div>
  );
}

export function ReportsPage() {
  const [clinicId, setClinicId] = useState(-1);
  const [clinics, setClinics] = useState<Clinic[]>([]);

  function clinicTag() {
    return clinicId < 0 ? "all-clinics" : `clinic-${clinicId}`;
  }

  useEffect(() => {
    api.clinicsList(false).then(setClinics).catch(console.error);
  }, []);

  async function exportPatients() {
    const csv = await api.exportPatientsCsv(clinicId);
    downloadCsvUtf8(`patients_${clinicTag()}.csv`, csv);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Exports</h1>
      <Card className="max-w-2xl space-y-4 text-sm">
        <p className="text-[oklch(0.45_0.02_260)]">
          Download CSV snapshots for spreadsheets.
        </p>
        <label className="flex items-center gap-2">
          Clinic filter
          <select
            className="rounded border px-2 py-1"
            value={clinicId}
            onChange={(e) => setClinicId(Number(e.target.value))}
          >
            <option value={-1}>All clinics</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" onClick={() => exportPatients()}>
            Export patients CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              const csv = await api.exportFollowUpsCsv(clinicId);
              downloadCsvUtf8(`follow-ups_${clinicTag()}.csv`, csv);
            }}
          >
            Export follow-ups CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              const csv = await api.exportComplicationsCsv(clinicId);
              downloadCsvUtf8(`complications_${clinicTag()}.csv`, csv);
            }}
          >
            Export complications CSV
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              const csv = await api.reportsCsvPendingCbct(clinicId);
              downloadCsvUtf8(`pending-cbct_${clinicTag()}.csv`, csv);
            }}
          >
            Pending CBCT (patients)
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              const csv = await api.reportsCsvFailedCases(clinicId);
              downloadCsvUtf8(`failed-cases_${clinicTag()}.csv`, csv);
            }}
          >
            Failed implant cases (patients)
          </Button>
        </div>
      </Card>
    </div>
  );
}
