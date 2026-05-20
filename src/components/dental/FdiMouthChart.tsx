import {
  FDI_LOWER_LEFT,
  FDI_LOWER_RIGHT,
  FDI_UPPER_LEFT,
  FDI_UPPER_RIGHT,
  isValidFdiPermanent,
} from "@/lib/fdi";
import { cn } from "@/lib/utils";
import { lazy, Suspense, useMemo } from "react";

const DentalArch3D = lazy(() =>
  import("./DentalArch3D").then((m) => ({ default: m.DentalArch3D })),
);

type Props = {
  /** FDI numbers currently marked in the sites table */
  selectedFdis: number[];
  onToggle: (fdi: number) => void;
  className?: string;
};

function ToothBtn({
  n,
  active,
  onClick,
}: {
  n: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={`FDI ${n}`}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-9 min-w-[2.1rem] shrink-0 items-center justify-center rounded border px-1 text-[11px] font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.995_0.005_95)]",
        active
          ? "border-blue-700 bg-blue-600 text-white shadow-sm"
          : "border-[oklch(0.88_0.01_260)] bg-white text-[oklch(0.32_0.02_260)] hover:bg-[oklch(0.97_0.01_95)] active:bg-[oklch(0.95_0.01_95)]",
      )}
    >
      {n}
    </button>
  );
}

/**
 * Clickable FDI chart — Three.js arch + numbered keypad (patient facing you).
 */
export function FdiMouthChart({ selectedFdis, onToggle, className }: Props) {
  const sel = useMemo(
    () =>
      new Set(
        selectedFdis.filter((x) => Number.isFinite(x)).map((x) => Number(x)),
      ),
    [selectedFdis],
  );

  const validSelectedCount = useMemo(() => {
    let n = 0;
    for (const x of sel) {
      if (isValidFdiPermanent(x)) n += 1;
    }
    return n;
  }, [sel]);

  const Row = ({
    label,
    hint,
    leftTeeth,
    rightTeeth,
  }: {
    label: string;
    hint: string;
    leftTeeth: readonly number[];
    rightTeeth: readonly number[];
  }) => (
    <div className="space-y-1">
      <div className="text-center">
        <div className="text-[10px] font-medium uppercase tracking-wide text-[oklch(0.5_0.02_260)]">
          {label}
        </div>
        <div className="text-[10px] text-[oklch(0.48_0.02_260)]">{hint}</div>
      </div>
      <div
        className="flex flex-wrap items-center justify-center gap-1"
        role="group"
        aria-label={label}
      >
        <div className="flex flex-wrap justify-end gap-0.5">
          {leftTeeth.map((n) => (
            <ToothBtn
              key={n}
              n={n}
              active={sel.has(n)}
              onClick={() => onToggle(n)}
            />
          ))}
        </div>
        <div
          className="mx-1 flex min-h-[2.25rem] w-[3px] shrink-0 rounded-full bg-[oklch(0.88_0.02_260)]"
          title="Patient midline"
          aria-hidden
        />
        <div className="flex flex-wrap justify-start gap-0.5">
          {rightTeeth.map((n) => (
            <ToothBtn
              key={n}
              n={n}
              active={sel.has(n)}
              onClick={() => onToggle(n)}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "rounded-lg border border-[oklch(0.9_0.01_260)] bg-[oklch(0.995_0.005_95)] p-3",
        className,
      )}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-xl text-xs leading-relaxed text-[oklch(0.45_0.02_260)]">
          Use the <span className="font-medium">3D arch</span> or{" "}
          <span className="font-medium">keypad</span> to toggle implant sites. Facing the patient:
          keypad center is the midline; quadrants UR/LR follow ISO 3950 (same numbering as the table
          below).
        </p>
        <div className="flex shrink-0 flex-col items-center gap-1 rounded-md border border-[oklch(0.88_0.02_260)] bg-white px-3 py-2 text-center sm:items-end">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[oklch(0.5_0.02_260)]">
            Sites marked
          </span>
          <span className="text-lg font-semibold tabular-nums text-[oklch(0.28_0.03_260)]">
            {validSelectedCount}
          </span>
        </div>
      </div>

      <div className="mb-2 rounded-lg border border-[oklch(0.88_0.015_260)] bg-[oklch(0.98_0.008_95)] px-2 py-1.5 text-center text-[10px] leading-snug text-[oklch(0.42_0.02_260)]">
        <span className="font-medium text-[oklch(0.35_0.03_260)]">Rotate view:</span> drag on{" "}
        palate, cheeks, or tongue ·{" "}
        <span className="font-medium text-[oklch(0.35_0.03_260)]">Pick tooth:</span> quick tap on a
        crown (dragging spins the camera instead).
      </div>

      <Suspense
        fallback={
          <div className="mx-auto mb-4 flex h-[min(320px,46vw)] min-h-[240px] max-w-xl animate-pulse items-center justify-center rounded-xl border border-[oklch(0.88_0.015_260)] bg-[oklch(0.96_0.01_95)] text-xs text-[oklch(0.5_0.02_260)]">
            Loading 3D viewer…
          </div>
        }
      >
        <DentalArch3D
          selectedFdis={selectedFdis}
          onToggle={onToggle}
          className="mx-auto mb-4 max-w-xl"
        />
      </Suspense>

      <Row
        label="Upper arch (maxillary)"
        hint="Viewer left → UR · Viewer right → UL"
        leftTeeth={FDI_UPPER_RIGHT}
        rightTeeth={FDI_UPPER_LEFT}
      />
      <div className="my-3 border-t border-[oklch(0.92_0.01_95)]" />
      <Row
        label="Lower arch (mandibular)"
        hint="Viewer left → LR · Viewer right → LL"
        leftTeeth={FDI_LOWER_RIGHT}
        rightTeeth={FDI_LOWER_LEFT}
      />
    </div>
  );
}
