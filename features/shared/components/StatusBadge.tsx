import type { EvacStatus } from "@/features/shared/types";

const STATUS_STYLES: Record<EvacStatus, string> = {
  OPEN: "bg-ph-blue-light text-ph-blue border-ph-blue/40",
  FULL: "bg-ph-gold-light text-ph-blue-dark border-ph-gold",
  CLOSED: "bg-ph-red-light text-ph-red-dark border-ph-red/40",
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
