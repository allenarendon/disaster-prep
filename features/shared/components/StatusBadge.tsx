import type { EvacStatus } from "@/features/shared/types";

const STATUS_STYLES: Record<EvacStatus, string> = {
  OPEN: "bg-green-100 text-green-800 border-green-300",
  FULL: "bg-amber-100 text-amber-800 border-amber-300",
  CLOSED: "bg-red-100 text-red-800 border-red-300",
  UNKNOWN: "bg-slate-100 text-slate-600 border-slate-300",
};

export function StatusBadge({ status }: { status: EvacStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}
