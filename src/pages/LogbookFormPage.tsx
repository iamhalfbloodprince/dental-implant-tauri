import * as api from "@/api/commands";
import type { Clinic } from "@/types/domain";
import { Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

const EXTRA_LOGBOOK = {
  sacClassification: "",
  cbctStatus: "",
  boneSiteClassification: "",
  protocolMatrix: "",
  implantMake: "",
  implantType: "",
  implantLotNumber: "",
  graftSite: "",
  graftType: "",
  graftMaterial: "",
  graftLotNumber: "",
  graftTiming: "",
  membraneType: "",
  membraneLotNumber: "",
  periodontalPreOpJson: "",
  complicationClassification: "",
  implantFailure: false,
  graftFailure: false,
  implantStatusRemedial: "",
  supervisor: "",
  mentorNotes: "",
  restoringDentist: "",
  labName: "",
  restorationDate: "",
  chosenProtocol: "",
  optionsAvailable: "",
  itemisedPlanNotes: "",
  componentOrderNotes: "",
};

type ExtraLogbookKeys = keyof typeof EXTRA_LOGBOOK;

export function LogbookFormPage() {
  const { lid } = useParams();
  const isEdit = Boolean(lid && lid !== "new");
  const entryId = isEdit ? Number(lid) : null;
  const [search] = useSearchParams();
  const qpPid = Number(search.get("patientId"));
  const qpCid = Number(search.get("clinicId"));
  const prefillPid = Number.isFinite(qpPid) && qpPid > 0 ? qpPid : 0;
  const prefillCid = Number.isFinite(qpCid) && qpCid > 0 ? qpCid : 0;

  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [form, setForm] = useState({
    patientId: prefillPid,
    clinicId: prefillCid,
    clinicRecordNumber: "" as string | null,
    surgeryDate: new Date().toISOString().slice(0, 10),
    implantSite: "",
    implantSystem: "",
    implantDimensions: "",
    implantCount: 1,
    boneGraft: false,
    sinusLift: false,
    immediatePlacement: false,
    immediateLoading: false,
    surgeonName: "",
    restorationType: "",
    complicationStatus: false,
    complicationType: "",
    outcome: "",
    followUpDate: "",
    notes: "",
    ...EXTRA_LOGBOOK,
  });

  useEffect(() => {
    api.clinicsList(false).then(setClinics).catch(console.error);
  }, []);

  useEffect(() => {
    if (!entryId) return;
    (async () => {
      const row = await api.logbookGet(entryId);
      if (!row || typeof row !== "object") return;
      const r = row as Record<string, unknown>;
      const str = (k: string) => String(r[k] ?? "");
      const strDate = (k: string) => str(k).slice(0, 10);
      setForm({
        patientId: Number(r.patientId),
        clinicId: Number(r.clinicId),
        clinicRecordNumber:
          typeof r.clinicRecordNumber === "string"
            ? r.clinicRecordNumber || null
            : null,
        surgeryDate: strDate("surgeryDate"),
        implantSite: str("implantSite"),
        implantSystem: str("implantSystem"),
        implantDimensions: str("implantDimensions"),
        implantCount: Number(r.implantCount ?? 1),
        boneGraft: Boolean(r.boneGraft),
        sinusLift: Boolean(r.sinusLift),
        immediatePlacement: Boolean(r.immediatePlacement),
        immediateLoading: Boolean(r.immediateLoading),
        surgeonName: str("surgeonName"),
        restorationType: str("restorationType"),
        complicationStatus: Boolean(r.complicationStatus),
        complicationType: str("complicationType"),
        outcome: str("outcome"),
        followUpDate: strDate("followUpDate"),
        notes: str("notes"),
        sacClassification: str("sacClassification"),
        cbctStatus: str("cbctStatus"),
        boneSiteClassification: str("boneSiteClassification"),
        protocolMatrix: str("protocolMatrix"),
        implantMake: str("implantMake"),
        implantType: str("implantType"),
        implantLotNumber: str("implantLotNumber"),
        graftSite: str("graftSite"),
        graftType: str("graftType"),
        graftMaterial: str("graftMaterial"),
        graftLotNumber: str("graftLotNumber"),
        graftTiming: str("graftTiming"),
        membraneType: str("membraneType"),
        membraneLotNumber: str("membraneLotNumber"),
        periodontalPreOpJson: str("periodontalPreOpJson"),
        complicationClassification: str("complicationClassification"),
        implantFailure: Boolean(r.implantFailure),
        graftFailure: Boolean(r.graftFailure),
        implantStatusRemedial: str("implantStatusRemedial"),
        supervisor: str("supervisor"),
        mentorNotes: str("mentorNotes"),
        restoringDentist: str("restoringDentist"),
        labName: str("labName"),
        restorationDate: strDate("restorationDate"),
        chosenProtocol: str("chosenProtocol"),
        optionsAvailable: str("optionsAvailable"),
        itemisedPlanNotes: str("itemisedPlanNotes"),
        componentOrderNotes: str("componentOrderNotes"),
      });
    })().catch(console.error);
  }, [entryId]);

  function setExtra<K extends ExtraLogbookKeys>(k: K, v: (typeof EXTRA_LOGBOOK)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patientId || !form.clinicId) return;

    function opt(s: string) {
      const v = s.trim();
      return v === "" ? null : v;
    }

    const payload = {
      patientId: form.patientId,
      clinicId: form.clinicId,
      clinicRecordNumber: opt(form.clinicRecordNumber ?? "")
        ? form.clinicRecordNumber
        : null,
      surgeryDate: form.surgeryDate,
      implantSite: opt(form.implantSite),
      implantSystem: opt(form.implantSystem),
      implantDimensions: opt(form.implantDimensions),
      implantCount: form.implantCount,
      boneGraft: form.boneGraft,
      sinusLift: form.sinusLift,
      immediatePlacement: form.immediatePlacement,
      immediateLoading: form.immediateLoading,
      surgeonName: opt(form.surgeonName),
      restorationType: opt(form.restorationType),
      complicationStatus: form.complicationStatus,
      complicationType: opt(form.complicationType),
      outcome: opt(form.outcome),
      followUpDate: opt(form.followUpDate),
      notes: opt(form.notes),
      sacClassification: opt(form.sacClassification),
      cbctStatus: opt(form.cbctStatus),
      boneSiteClassification: opt(form.boneSiteClassification),
      protocolMatrix: opt(form.protocolMatrix),
      implantMake: opt(form.implantMake),
      implantType: opt(form.implantType),
      implantLotNumber: opt(form.implantLotNumber),
      graftSite: opt(form.graftSite),
      graftType: opt(form.graftType),
      graftMaterial: opt(form.graftMaterial),
      graftLotNumber: opt(form.graftLotNumber),
      graftTiming: opt(form.graftTiming),
      membraneType: opt(form.membraneType),
      membraneLotNumber: opt(form.membraneLotNumber),
      periodontalPreOpJson: opt(form.periodontalPreOpJson),
      complicationClassification: opt(form.complicationClassification),
      implantFailure: form.implantFailure,
      graftFailure: form.graftFailure,
      implantStatusRemedial: opt(form.implantStatusRemedial),
      supervisor: opt(form.supervisor),
      mentorNotes: opt(form.mentorNotes),
      restoringDentist: opt(form.restoringDentist),
      labName: opt(form.labName),
      restorationDate: opt(form.restorationDate),
      chosenProtocol: opt(form.chosenProtocol),
      optionsAvailable: opt(form.optionsAvailable),
      itemisedPlanNotes: opt(form.itemisedPlanNotes),
      componentOrderNotes: opt(form.componentOrderNotes),
    };
    if (isEdit && entryId) await api.logbookUpdate(entryId, payload);
    else await api.logbookCreate(payload);
    navigate("/logbook");
  }

  const extraPairs: [Exclude<
    ExtraLogbookKeys,
    "implantFailure" | "graftFailure"
  >, string][] = [
    ["sacClassification", "SAC classification"],
    ["cbctStatus", "CBCT status"],
    ["boneSiteClassification", "Bone site class."],
    ["protocolMatrix", "Protocol matrix"],
    ["implantMake", "Implant make"],
    ["implantType", "Implant type / reference"],
    ["implantLotNumber", "Implant lot"],
    ["graftSite", "Graft site"],
    ["graftType", "Graft type"],
    ["graftMaterial", "Graft material"],
    ["graftLotNumber", "Graft lot"],
    ["graftTiming", "Graft timing"],
    ["membraneType", "Membrane type"],
    ["membraneLotNumber", "Membrane lot"],
    ["complicationClassification", "Complication class."],
    ["implantStatusRemedial", "Implant status (remedial)"],
    ["supervisor", "Supervisor"],
    ["restoringDentist", "Restoring dentist"],
    ["labName", "Lab"],
    ["chosenProtocol", "Chosen protocol"],
  ];

  return (
    <Card className="mx-auto max-w-3xl space-y-3">
      <h1 className="text-lg font-semibold">
        {isEdit ? "Edit logbook entry" : "New logbook entry"}
      </h1>
      <form onSubmit={submit} className="grid gap-3 text-sm sm:grid-cols-2">
        <Input
          label="Patient ID"
          required
          type="number"
          value={form.patientId || ""}
          disabled={prefillPid > 0}
          onChange={(e) =>
            setForm({ ...form, patientId: Number(e.target.value) })
          }
        />
        <label className="block text-sm">
          Clinic
          <select
            required
            className="mt-1 w-full rounded border px-2 py-1"
            value={form.clinicId || ""}
            onChange={(e) =>
              setForm({ ...form, clinicId: Number(e.target.value) })
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
          label="Clinic record #"
          value={form.clinicRecordNumber ?? ""}
          onChange={(e) =>
            setForm({ ...form, clinicRecordNumber: e.target.value || null })
          }
        />
        <Input
          label="Surgery date"
          required
          type="date"
          value={form.surgeryDate}
          onChange={(e) => setForm({ ...form, surgeryDate: e.target.value })}
        />
        <Input
          label="Implant site"
          value={form.implantSite}
          onChange={(e) => setForm({ ...form, implantSite: e.target.value })}
        />
        <Input
          label="Implant system"
          value={form.implantSystem}
          onChange={(e) =>
            setForm({ ...form, implantSystem: e.target.value })
          }
        />
        <Input
          label="Dimensions"
          value={form.implantDimensions}
          onChange={(e) =>
            setForm({ ...form, implantDimensions: e.target.value })
          }
        />
        <Input
          label="Implant count"
          type="number"
          min={1}
          value={form.implantCount}
          onChange={(e) =>
            setForm({ ...form, implantCount: Number(e.target.value) })
          }
        />
        {(
          [
            ["boneGraft", "Bone graft"],
            ["sinusLift", "Sinus lift"],
            ["immediatePlacement", "Immediate placement"],
            ["immediateLoading", "Immediate loading"],
            ["complicationStatus", "Complication flag"],
            ["implantFailure", "Implant failure"],
            ["graftFailure", "Graft failure"],
          ] as const
        ).map(([k, lab]) => (
          <label key={k} className="flex items-center gap-2 capitalize">
            <input
              type="checkbox"
              checked={Boolean(form[k])}
              onChange={(ev) =>
                setForm({ ...form, [k]: ev.target.checked })
              }
            />
            {lab}
          </label>
        ))}
        <Input
          label="Surgeon name"
          value={form.surgeonName}
          onChange={(e) =>
            setForm({ ...form, surgeonName: e.target.value })
          }
        />
        <Input
          label="Restoration type"
          value={form.restorationType}
          onChange={(e) =>
            setForm({ ...form, restorationType: e.target.value })
          }
        />
        <Input
          label="Restoration date"
          type="date"
          value={form.restorationDate}
          onChange={(e) =>
            setExtra("restorationDate", e.target.value)
          }
        />
        <Input
          label="Complication type"
          value={form.complicationType}
          onChange={(e) =>
            setForm({ ...form, complicationType: e.target.value })
          }
        />
        <Input
          label="Outcome"
          value={form.outcome}
          onChange={(e) => setForm({ ...form, outcome: e.target.value })}
        />
        <Input
          label="Follow-up date"
          type="date"
          value={form.followUpDate}
          onChange={(e) =>
            setForm({ ...form, followUpDate: e.target.value })
          }
        />
        <details className="sm:col-span-2 rounded border px-3 py-2">
          <summary className="cursor-pointer select-none font-medium">
            SAC, CBCT, graft / membrane, supervisory (PRD)
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {extraPairs.map(([k, lab]) => (
              <Input
                key={k}
                label={lab}
                value={form[k]}
                onChange={(e) => setExtra(k, e.target.value)}
              />
            ))}
            <Textarea
              label="Periodontal pre-op JSON"
              className="min-h-[72px]"
              value={form.periodontalPreOpJson}
              onChange={(e) =>
                setExtra("periodontalPreOpJson", e.target.value)
              }
            />
            <Textarea
              label="Mentor notes"
              className="min-h-[72px]"
              value={form.mentorNotes}
              onChange={(e) => setExtra("mentorNotes", e.target.value)}
            />
            <Textarea
              label="Options available discussed"
              className="min-h-[72px]"
              value={form.optionsAvailable}
              onChange={(e) =>
                setExtra("optionsAvailable", e.target.value)
              }
            />
            <Textarea
              label="Itemised plan notes"
              className="min-h-[72px]"
              value={form.itemisedPlanNotes}
              onChange={(e) =>
                setExtra("itemisedPlanNotes", e.target.value)
              }
            />
            <Textarea
              label="Component order notes"
              className="min-h-[72px]"
              value={form.componentOrderNotes}
              onChange={(e) =>
                setExtra("componentOrderNotes", e.target.value)
              }
            />
          </div>
        </details>

        <Textarea
          label="Notes"
          className="sm:col-span-2 min-h-[100px]"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/logbook")}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
