import * as api from "@/api/commands";
import type { Clinic } from "@/types/domain";
import { ClinicFeeSection } from "@/components/clinic/ClinicFeeSection";
import { Button, Card, Input, Textarea } from "@/components/ui/primitives";
import { useEffect, useState } from "react";

function emptyCreateInput(): Record<string, unknown> {
  return {
    name: "",
    address: null,
    phone: null,
    email: null,
    website: null,
    logoPath: null,
    letterHeader: null,
    letterFooter: null,
    signatureBlock: null,
    surgeonName: null,
    registrationNumber: null,
    brandColor: null,
    isActive: true,
  };
}

function clinicToPayload(c: Clinic): Record<string, unknown> {
  return {
    name: c.name,
    address: c.address ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    website: c.website ?? null,
    logoPath: c.logoPath ?? null,
    letterHeader: c.letterHeader ?? null,
    letterFooter: c.letterFooter ?? null,
    signatureBlock: c.signatureBlock ?? null,
    surgeonName: c.surgeonName ?? null,
    registrationNumber: c.registrationNumber ?? null,
    brandColor: c.brandColor ?? null,
    isActive: c.isActive,
  };
}

export function ClinicsPage() {
  const [list, setList] = useState<Clinic[]>([]);
  const [draft, setDraft] = useState<Record<string, unknown>>(emptyCreateInput);
  const [editing, setEditing] = useState<Clinic | null>(null);

  async function load() {
    setList(await api.clinicsList(true));
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function createClinic(e: React.FormEvent) {
    e.preventDefault();
    const name = String(draft.name ?? "").trim();
    if (!name) return;
    await api.clinicsCreate({
      ...draft,
      name,
      address: (draft.address as string)?.trim() || null,
      phone: (draft.phone as string)?.trim() || null,
      email: (draft.email as string)?.trim() || null,
      website: (draft.website as string)?.trim() || null,
      logoPath: (draft.logoPath as string)?.trim() || null,
      letterHeader: (draft.letterHeader as string)?.trim() || null,
      letterFooter: (draft.letterFooter as string)?.trim() || null,
      signatureBlock: (draft.signatureBlock as string)?.trim() || null,
      surgeonName: (draft.surgeonName as string)?.trim() || null,
      registrationNumber:
        (draft.registrationNumber as string)?.trim() || null,
      brandColor: (draft.brandColor as string)?.trim() || null,
    });
    setDraft(emptyCreateInput());
    await load();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    await api.clinicsUpdate(editing.id, clinicToPayload(editing));
    setEditing(null);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Clinic locations</h1>
      <p className="text-sm text-[oklch(0.4_0.02_260)]">
        Each clinic can carry its own fee schedule. Default lines are created
        automatically; open a clinic to edit prices.
      </p>
      <Card>
        <form onSubmit={createClinic} className="space-y-3">
          <h2 className="text-sm font-medium text-[oklch(0.35_0.02_260)]">
            Add clinic
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Clinic name"
                value={String(draft.name ?? "")}
                onChange={(e) =>
                  setDraft({ ...draft, name: e.target.value })
                }
                required
              />
            </div>
            <Input
              label="Surgeon / lead clinician (optional)"
              value={String(draft.surgeonName ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, surgeonName: e.target.value || null })
              }
            />
            <Input
              label="Clinic registration (e.g. GDC)"
              value={String(draft.registrationNumber ?? "")}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  registrationNumber: e.target.value || null,
                })
              }
            />
            <Input
              label="Brand colour (hex)"
              placeholder="#1e3a5f"
              value={String(draft.brandColor ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, brandColor: e.target.value || null })
              }
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Address"
                rows={2}
                value={String(draft.address ?? "")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    address: e.target.value || null,
                  })
                }
              />
            </div>
            <Input
              label="Phone"
              value={String(draft.phone ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, phone: e.target.value || null })
              }
            />
            <Input
              label="Email"
              value={String(draft.email ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, email: e.target.value || null })
              }
            />
            <Input
              label="Website"
              value={String(draft.website ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, website: e.target.value || null })
              }
            />
            <Input
              label="Logo file path"
              placeholder="Absolute path on this computer"
              value={String(draft.logoPath ?? "")}
              onChange={(e) =>
                setDraft({ ...draft, logoPath: e.target.value || null })
              }
            />
            <div className="sm:col-span-2 space-y-2">
              <Textarea
                label="Letter header (optional)"
                rows={2}
                value={String(draft.letterHeader ?? "")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    letterHeader: e.target.value || null,
                  })
                }
              />
              <Textarea
                label="Letter footer (optional)"
                rows={2}
                value={String(draft.letterFooter ?? "")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    letterFooter: e.target.value || null,
                  })
                }
              />
              <Textarea
                label="Signature block (optional)"
                rows={3}
                value={String(draft.signatureBlock ?? "")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    signatureBlock: e.target.value || null,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(draft.isActive)}
                onChange={(e) =>
                  setDraft({ ...draft, isActive: e.target.checked })
                }
              />
              Active
            </label>
          </div>
          <Button type="submit">Add clinic</Button>
        </form>
      </Card>
      <ul className="space-y-2">
        {list.map((c) => (
          <li key={c.id}>
            <Card className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-[oklch(0.45_0.02_260)]">
                  {c.isActive ? "Active" : "Inactive"}
                  {c.address ? (
                    <>
                      {" "}
                      · <span className="whitespace-pre-wrap">{c.address}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <Button variant="ghost" type="button" onClick={() => setEditing(c)}>
                Edit
              </Button>
            </Card>
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto space-y-3">
            <h2 className="font-semibold">Edit clinic</h2>
            <form onSubmit={saveEdit} className="space-y-2">
              <Input
                label="Name"
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
                required
              />
              <Input
                label="Surgeon / lead clinician"
                value={editing.surgeonName ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    surgeonName: e.target.value || null,
                  })
                }
              />
              <Input
                label="Clinic registration (e.g. GDC)"
                value={editing.registrationNumber ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    registrationNumber: e.target.value || null,
                  })
                }
              />
              <Input
                label="Brand colour (hex)"
                placeholder="#1e3a5f"
                value={editing.brandColor ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    brandColor: e.target.value || null,
                  })
                }
              />
              <Textarea
                label="Address"
                rows={2}
                value={editing.address ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    address: e.target.value || null,
                  })
                }
              />
              <Input
                label="Phone"
                value={editing.phone ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value || null })
                }
              />
              <Input
                label="Email"
                value={editing.email ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value || null })
                }
              />
              <Input
                label="Website"
                value={editing.website ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    website: e.target.value || null,
                  })
                }
              />
              <Input
                label="Logo file path"
                value={editing.logoPath ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    logoPath: e.target.value || null,
                  })
                }
              />
              <Textarea
                label="Letter header"
                rows={2}
                value={editing.letterHeader ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    letterHeader: e.target.value || null,
                  })
                }
              />
              <Textarea
                label="Letter footer"
                rows={2}
                value={editing.letterFooter ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    letterFooter: e.target.value || null,
                  })
                }
              />
              <Textarea
                label="Signature block"
                rows={3}
                value={editing.signatureBlock ?? ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    signatureBlock: e.target.value || null,
                  })
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) =>
                    setEditing({ ...editing, isActive: e.target.checked })
                  }
                />
                Active
              </label>
              <div className="flex gap-2 border-t pt-3">
                <Button type="submit">Save clinic details</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
            <ClinicFeeSection clinicId={editing.id} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}
