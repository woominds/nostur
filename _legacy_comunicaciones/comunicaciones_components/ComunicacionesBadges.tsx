import {
  getComunicacionPrioridadLabel,
  type ComunicacionConversation
} from "../../store/comunicacionesStore";
import { isWindowOpen } from "./comunicacionesPanel.helpers";

type MetricTone = "neutral" | "orange" | "red" | "green" | "blue" | "slate";

export function MetricPill({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: MetricTone;
}) {
  const className = {
    neutral: "border-black/10 bg-white/75 text-[#334155]",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-green-200 bg-green-50 text-green-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700"
  }[tone];

  return (
    <div className={["rounded-2xl border px-3 py-2 text-xs font-black shadow-sm", className].join(" ")}>
      <span className="mr-2 text-sm">{value}</span>
      {label}
    </div>
  );
}

export function PriorityBadge({ value }: { value: string }) {
  const className =
    value === "URGENTE"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "ALTA"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : value === "BAJA"
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={["rounded-xl border px-2 py-1 text-[10px] font-black uppercase", className].join(" ")}>
      {getComunicacionPrioridadLabel(value)}
    </span>
  );
}

export function WindowBadge({ conversation }: { conversation: ComunicacionConversation }) {
  const open = isWindowOpen(conversation);

  return (
    <span
      className={[
        "rounded-xl border px-2 py-1 text-[10px] font-black uppercase",
        open ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"
      ].join(" ")}
    >
      {open ? "24h abierta" : "24h cerrada"}
    </span>
  );
}