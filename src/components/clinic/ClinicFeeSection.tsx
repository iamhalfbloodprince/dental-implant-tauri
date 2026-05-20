import * as api from "@/api/commands";
import type { ClinicFeeItem } from "@/types/domain";
import { Button, Input } from "@/components/ui/primitives";
import { useEffect, useState } from "react";

function majorFromCents(c: number): string {
  return (c / 100).toFixed(2);
}

function centsFromMajor(s: string): number {
  const n = parseFloat(s.replace(/,/g, "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function FeeRow({
  row,
  onChanged,
}: {
  row: ClinicFeeItem;
  onChanged: () => Promise<void>;
}) {
  const [itemName, setItemName] = useState(row.itemName);
  const [category, setCategory] = useState(row.category);
  const [priceMajor, setPriceMajor] = useState(majorFromCents(row.priceCents));
  const [isActive, setIsActive] = useState(row.isActive);

  useEffect(() => {
    setItemName(row.itemName);
    setCategory(row.category);
    setPriceMajor(majorFromCents(row.priceCents));
    setIsActive(row.isActive);
  }, [row]);

  return (
    <tr className="border-b border-[oklch(0.95_0.01_95)]">
      <td className="py-1 pr-1">
        <input
          className="w-full min-w-[8rem] rounded border px-1 py-0.5 text-sm"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
      </td>
      <td className="py-1 pr-1">
        <input
          className="w-full min-w-[6rem] rounded border px-1 py-0.5 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </td>
      <td className="py-1 pr-1">
        <input
          className="w-24 rounded border px-1 py-0.5 text-sm tabular-nums"
          value={priceMajor}
          onChange={(e) => setPriceMajor(e.target.value)}
        />
      </td>
      <td className="py-1 pr-1">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
      </td>
      <td className="py-1">
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            className="text-xs"
            onClick={async () => {
              await api.clinicFeeItemsUpdate(row.id, {
                itemName: itemName.trim(),
                category: category.trim() || "General",
                priceCents: centsFromMajor(priceMajor),
                isActive,
                sortOrder: row.sortOrder,
              });
              await onChanged();
            }}
          >
            Save
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-xs"
            onClick={async () => {
              if (!window.confirm(`Delete fee line "${row.itemName}"?`)) {
                return;
              }
              await api.clinicFeeItemsDelete(row.id);
              await onChanged();
            }}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function ClinicFeeSection({ clinicId }: { clinicId: number }) {
  const [fees, setFees] = useState<ClinicFeeItem[]>([]);
  const [newFee, setNewFee] = useState({
    itemName: "",
    category: "General",
    priceMajor: "",
    sortOrder: "0",
  });

  async function reload() {
    setFees(await api.clinicFeeItemsList(clinicId));
  }

  useEffect(() => {
    reload().catch(console.error);
  }, [clinicId]);

  return (
    <div className="border-t pt-3">
      <h3 className="mb-2 text-sm font-semibold">Fee schedule</h3>
      <p className="mb-2 text-xs text-[oklch(0.45_0.02_260)]">
        Amounts in major currency units for display (stored as minor units).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-[oklch(0.45_0.02_260)]">
              <th className="py-1 pr-2">Item</th>
              <th className="py-1 pr-2">Category</th>
              <th className="py-1 pr-2">Price</th>
              <th className="py-1 pr-2">Active</th>
              <th className="py-1 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {fees.map((row) => (
              <FeeRow key={row.id} row={row} onChanged={reload} />
            ))}
          </tbody>
        </table>
      </div>
      <form
        className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-4"
        onSubmit={async (ev) => {
          ev.preventDefault();
          if (!newFee.itemName.trim()) return;
          await api.clinicFeeItemsCreate(clinicId, {
            itemName: newFee.itemName.trim(),
            category: newFee.category.trim() || "General",
            priceCents: centsFromMajor(newFee.priceMajor),
            isActive: true,
            sortOrder: parseInt(newFee.sortOrder, 10) || fees.length,
          });
          setNewFee({
            itemName: "",
            category: "General",
            priceMajor: "",
            sortOrder: "0",
          });
          await reload();
        }}
      >
        <Input
          label="New item"
          placeholder="Name"
          value={newFee.itemName}
          onChange={(e) =>
            setNewFee({ ...newFee, itemName: e.target.value })
          }
        />
        <Input
          label="Category"
          value={newFee.category}
          onChange={(e) =>
            setNewFee({ ...newFee, category: e.target.value })
          }
        />
        <Input
          label="Price"
          placeholder="0.00"
          value={newFee.priceMajor}
          onChange={(e) =>
            setNewFee({ ...newFee, priceMajor: e.target.value })
          }
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full sm:w-auto">
            Add fee line
          </Button>
        </div>
      </form>
    </div>
  );
}
