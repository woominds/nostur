// src/components/comunicaciones/ControlComercialIaPanel.tsx

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
 
  CheckCircle2,
  Clock3,
  MessageCircle,
  RefreshCcw,
  
  Star,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  UserCheck,
  
} from "lucide-react";

import {
  getComunicacionEstadoComercialLabel,
  getComunicacionEstadoGestionLabel,
  useComunicacionesStore,
  type AiCommercialControlBranch,
  type AiCommercialControlSeller,
  type AiDailyCommercialReport,
  type AiOperationalAlert,
  type AiTopGapConversation
} from "../../store/comunicacionesStore";

type ComunicacionesState = ReturnType<typeof useComunicacionesStore.getState>;

type PeriodOption = 1 | 7 | 15 | 30;

type ViewMode = "resumen" | "vendedores" | "sucursales" | "gaps" | "alertas" | "reportes";

function formatNumber(value: unknown): string {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) return "0";

  return parsed.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatDecimal(value: unknown): string {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed)) return "0,00";

  return parsed.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatHours(value: unknown): string {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed <= 0) return "0,00 hs";

  return `${formatDecimal(parsed)} hs`;
}

function formatDateTimeSafe(value: unknown): string {
  const text = String(value || "").trim();

  if (!text) return "—";

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getSellerName(item: AiCommercialControlSeller): string {
  const fullName = `${item.vendedor_nombre || ""} ${item.vendedor_apellido || ""}`.trim();

  return fullName || item.vendedor_email || "Sin vendedor";
}

function getBranchName(item: AiCommercialControlBranch): string {
  return item.sucursal_nombre || "Sin sucursal";
}

function getGapPassengerName(item: AiTopGapConversation): string {
  return item.contacto_nombre || item.telefono || item.email || "Sin pasajero";
}

function getGapSellerName(item: AiTopGapConversation): string {
  const fullName = `${item.vendedor_nombre || ""} ${item.vendedor_apellido || ""}`.trim();

  return fullName || item.vendedor_email || "Sin vendedor";
}

function getAlertPassengerName(alert: AiOperationalAlert): string {
  const metadata = alert.metadata || {};

  return (
    String(metadata.contacto_nombre || "").trim() ||
    String(metadata.telefono || "").trim() ||
    "Pasajero sin nombre"
  );
}

function getAlertSellerName(alert: AiOperationalAlert): string {
  const metadata = alert.metadata || {};
  const fullName = `${metadata.vendedor_nombre || ""} ${metadata.vendedor_apellido || ""}`.trim();

  return fullName || String(metadata.vendedor_email || "").trim() || "Sin vendedor";
}

function getSeverityClass(value: string): string {
  const normalized = String(value || "").toUpperCase();

  if (normalized === "CRITICA") return "border-red-300 bg-red-100 text-red-800";
  if (normalized === "URGENTE") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "ALTA") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "BAJA") return "border-slate-200 bg-slate-50 text-slate-600";

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "slate"
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon: typeof BarChart3;
  tone?: "slate" | "blue" | "green" | "amber" | "red" | "violet";
}) {
  const toneClasses = {
    slate: "border-black/10 bg-white text-[#334155]",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800"
  };

  return (
    <div className={["rounded-[24px] border p-4 shadow-sm", toneClasses[tone]].join(" ")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
            {label}
          </div>

          <div className="mt-1 text-2xl font-black tracking-tight">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          <Icon size={18} />
        </div>
      </div>

      {helper ? (
        <div className="text-[11px] font-semibold leading-5 opacity-75">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white/78 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-[#111827]">{title}</h2>

          {description ? (
            <p className="mt-0.5 text-xs font-semibold leading-5 text-[#64748b]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}

function ViewButton({
  active,
  label,
  count,
  onClick
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition",
        active
          ? "bg-[#4f7c90] text-white shadow-sm"
          : "bg-white text-[#334155] shadow-sm ring-1 ring-black/10 hover:bg-[#f8fafc]"
      ].join(" ")}
    >
      <span>{label}</span>

      {typeof count === "number" ? (
        <span
          className={[
            "rounded-lg px-1.5 py-0.5 text-[10px]",
            active ? "bg-white/20 text-white" : "bg-[#f1f5f9] text-[#64748b]"
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed border-black/10 bg-white/55 p-8 text-center">
      <div className="max-w-md">
        <Bot size={34} className="mx-auto mb-3 text-[#4f7c90]" />

        <h3 className="text-sm font-black text-[#111827]">{title}</h3>

        <p className="mt-1 text-xs font-semibold leading-5 text-[#64748b]">
          {description}
        </p>
      </div>
    </div>
  );
}

function SellerTable({ rows }: { rows: AiCommercialControlSeller[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin datos por vendedor"
        description="Todavía no hay suficientes conversaciones o actividad IA para mostrar este ranking."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="grid grid-cols-[minmax(210px,1.4fr)_90px_90px_90px_90px_90px_90px] border-b border-black/10 bg-[#f8fafc] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
        <div>Vendedor</div>
        <div className="text-right">Esperando</div>
        <div className="text-right">GAP 24</div>
        <div className="text-right">GAP 48</div>
        <div className="text-right">Prom.</div>
        <div className="text-right">IA</div>
        <div className="text-right">Rating</div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        {rows.map((item) => (
          <div
            key={item.vendedor_id || getSellerName(item)}
            className="grid grid-cols-[minmax(210px,1.4fr)_90px_90px_90px_90px_90px_90px] items-center border-b border-black/5 px-3 py-3 text-xs last:border-b-0"
          >
            <div className="min-w-0">
              <div className="truncate font-black text-[#111827]">
                {getSellerName(item)}
              </div>

              <div className="mt-0.5 truncate text-[11px] font-semibold text-[#64748b]">
                {item.sucursal_nombre || "Sin sucursal"}
              </div>
            </div>

            <div className="text-right font-black text-[#334155]">
              {formatNumber(item.conversaciones_cliente_esperando)}
            </div>

            <div className="text-right font-black text-amber-700">
              {formatNumber(item.gap_24h)}
            </div>

            <div className="text-right font-black text-red-700">
              {formatNumber(item.gap_48h)}
            </div>

            <div className="text-right font-black text-[#334155]">
              {formatDecimal(item.gap_promedio_horas)}
            </div>

            <div className="text-right font-black text-violet-700">
              {formatNumber(item.ai_chat_mensajes_usuario)}
            </div>

            <div className="text-right font-black text-green-700">
              {formatDecimal(item.ai_feedback_promedio)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BranchTable({ rows }: { rows: AiCommercialControlBranch[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Sin datos por sucursal"
        description="Todavía no hay suficientes conversaciones o actividad IA para mostrar sucursales."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="grid grid-cols-[minmax(210px,1.4fr)_90px_90px_90px_90px_90px_90px] border-b border-black/10 bg-[#f8fafc] px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
        <div>Sucursal</div>
        <div className="text-right">Total</div>
        <div className="text-right">Esperando</div>
        <div className="text-right">GAP 24</div>
        <div className="text-right">GAP 48</div>
        <div className="text-right">IA</div>
        <div className="text-right">Rating</div>
      </div>

      <div className="max-h-[520px] overflow-auto">
        {rows.map((item) => (
          <div
            key={item.sucursal_id || getBranchName(item)}
            className="grid grid-cols-[minmax(210px,1.4fr)_90px_90px_90px_90px_90px_90px] items-center border-b border-black/5 px-3 py-3 text-xs last:border-b-0"
          >
            <div className="truncate font-black text-[#111827]">
              {getBranchName(item)}
            </div>

            <div className="text-right font-black text-[#334155]">
              {formatNumber(item.total_conversaciones)}
            </div>

            <div className="text-right font-black text-[#334155]">
              {formatNumber(item.conversaciones_cliente_esperando)}
            </div>

            <div className="text-right font-black text-amber-700">
              {formatNumber(item.gap_24h)}
            </div>

            <div className="text-right font-black text-red-700">
              {formatNumber(item.gap_48h)}
            </div>

            <div className="text-right font-black text-violet-700">
              {formatNumber(item.ai_chat_mensajes_usuario)}
            </div>

            <div className="text-right font-black text-green-700">
              {formatDecimal(item.ai_feedback_promedio)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GapCard({
  item,
  onOpenConversation
}: {
  item: AiTopGapConversation;
  onOpenConversation: (conversationId: string) => void;
}) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[#111827]">
            {getGapPassengerName(item)}
          </div>

          <div className="mt-0.5 truncate text-[11px] font-semibold text-[#64748b]">
            {item.telefono || item.email || "Sin contacto"} · {getGapSellerName(item)}
          </div>
        </div>

        <span className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700">
          {formatHours(item.gap_hours)}
        </span>
      </div>

      <div className="grid gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-[11px] font-semibold text-[#334155]">
        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Gestión</span>
          <strong className="text-right">
            {getComunicacionEstadoGestionLabel(item.estado_gestion || "")}
          </strong>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Comercial</span>
          <strong className="text-right">
            {getComunicacionEstadoComercialLabel(item.estado_comercial || "")}
          </strong>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Último cliente</span>
          <strong className="text-right">{formatDateTimeSafe(item.last_inbound_message_at)}</strong>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Última respuesta</span>
          <strong className="text-right">{formatDateTimeSafe(item.last_outbound_message_at)}</strong>
        </div>
      </div>

      {item.ai_resumen_general ? (
        <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-[11px] font-semibold leading-5 text-violet-900">
          {item.ai_resumen_general}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onOpenConversation(item.conversation_id)}
        className="mt-3 h-9 w-full rounded-xl bg-[#4f7c90] text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a]"
      >
        Abrir conversación
      </button>
    </div>
  );
}

function AlertCard({
  item,
  onOpenConversation,
  onResolve,
  onMarkSeen
}: {
  item: AiOperationalAlert;
  onOpenConversation: (conversationId: string, alertId?: string) => void;
  onResolve: (alertId: string) => void;
  onMarkSeen: (alertId: string) => void;
}) {
  const resolved =
    item.status === "RESUELTA" ||
    item.status === "DESCARTADA";

  const seen =
    item.status === "VISTA" ||
    item.status === "ACK" ||
    resolved;

  return (
    <div
      className={[
        "rounded-[22px] border bg-white p-4 shadow-sm",
        item.severity === "URGENTE" || item.severity === "CRITICA" || item.severity === "CRÍTICA"
          ? "border-red-200"
          : item.severity === "ALTA"
            ? "border-amber-200"
            : "border-black/10"
      ].join(" ")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-1.5">
            <span
              className={[
                "rounded-xl border px-2 py-1 text-[10px] font-black uppercase",
                getSeverityClass(item.severity)
              ].join(" ")}
            >
              {item.severity}
            </span>

            <span className="rounded-xl border border-black/10 bg-[#f8fafc] px-2 py-1 text-[10px] font-black uppercase text-[#64748b]">
              {item.alert_type}
            </span>

            <span
              className={[
                "rounded-xl border px-2 py-1 text-[10px] font-black uppercase",
                resolved
                  ? "border-green-200 bg-green-50 text-green-700"
                  : seen
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
              ].join(" ")}
            >
              {item.status}
            </span>
          </div>

          <div className="text-sm font-black text-[#111827]">
            {item.alert_title}
          </div>

          <div className="mt-1 text-[11px] font-semibold leading-5 text-[#64748b]">
            {item.alert_detail}
          </div>
        </div>

        <span className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs font-black text-red-700">
          {formatHours(item.gap_hours)}
        </span>
      </div>

      <div className="grid gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-[11px] font-semibold text-[#334155]">
        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Pasajero</span>
          <strong className="text-right">{getAlertPassengerName(item)}</strong>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Vendedor</span>
          <strong className="text-right">{getAlertSellerName(item)}</strong>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-[#64748b]">Creada</span>
          <strong className="text-right">{formatDateTimeSafe(item.created_at)}</strong>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!item.conversation_id}
          onClick={() => item.conversation_id && onOpenConversation(item.conversation_id, item.id)}
          className="h-9 rounded-xl bg-[#4f7c90] text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          Abrir
        </button>

        <button
          type="button"
          disabled={seen}
          onClick={() => onMarkSeen(item.id)}
          className="h-9 rounded-xl bg-blue-50 text-[11px] font-black text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-50"
        >
          Vista
        </button>

        <button
          type="button"
          disabled={resolved}
          onClick={() => onResolve(item.id)}
          className="h-9 rounded-xl bg-green-50 text-[11px] font-black text-green-700 ring-1 ring-green-200 hover:bg-green-100 disabled:opacity-50"
        >
          Resolver
        </button>
      </div>
    </div>
  );
}

function ReportCard({ item }: { item: AiDailyCommercialReport }) {
  return (
    <div className="rounded-[22px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-black text-[#111827]">
            {item.report_title}
          </div>

          <div className="mt-0.5 text-[11px] font-semibold text-[#64748b]">
            {item.report_date}
          </div>
        </div>

        <span className="rounded-xl border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700">
          {item.report_scope}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-2xl bg-[#f8fafc] p-3">
          <div className="font-black text-[#64748b]">Esperando</div>
          <div className="mt-1 text-lg font-black text-[#111827]">
            {formatNumber(item.conversaciones_cliente_esperando)}
          </div>
        </div>

        <div className="rounded-2xl bg-red-50 p-3">
          <div className="font-black text-red-700">GAP 48h</div>
          <div className="mt-1 text-lg font-black text-red-800">
            {formatNumber(item.gap_48h)}
          </div>
        </div>

        <div className="rounded-2xl bg-violet-50 p-3">
          <div className="font-black text-violet-700">Uso IA</div>
          <div className="mt-1 text-lg font-black text-violet-800">
            {formatNumber(item.ai_chat_mensajes_usuario)}
          </div>
        </div>

        <div className="rounded-2xl bg-green-50 p-3">
          <div className="font-black text-green-700">Rating IA</div>
          <div className="mt-1 text-lg font-black text-green-800">
            {formatDecimal(item.ai_feedback_promedio)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ControlComercialIaPanel() {
  const loading = useComunicacionesStore(
    (state: ComunicacionesState) => state.loadingAiCommercialControl
  );
  const error = useComunicacionesStore((state: ComunicacionesState) => state.error);
  const dashboard = useComunicacionesStore(
    (state: ComunicacionesState) => state.aiCommercialControlDashboard
  );
  const reports = useComunicacionesStore(
    (state: ComunicacionesState) => state.aiDailyCommercialReports
  );

  const loadDashboard = useComunicacionesStore(
    (state: ComunicacionesState) => state.loadAiCommercialControlDashboard
  );
  const loadReports = useComunicacionesStore(
    (state: ComunicacionesState) => state.loadAiDailyCommercialReports
  );


    const runNiaCommercialAssistantDispatch = useComunicacionesStore(
    (state: ComunicacionesState) => state.runNiaCommercialAssistantDispatch
  );


  const updateAlertStatus = useComunicacionesStore(
    (state: ComunicacionesState) => state.updateOperationalAlertStatus
  );
  const clearError = useComunicacionesStore((state: ComunicacionesState) => state.clearError);

  const [period, setPeriod] = useState<PeriodOption>(7);
  const [view, setView] = useState<ViewMode>("resumen");

  useEffect(() => {
    void loadDashboard(period, false);
    void loadReports(true);
  }, [period, loadDashboard, loadReports]);

  const global = dashboard?.global;

  const sellers = useMemo(
    () => dashboard?.por_vendedor || [],
    [dashboard?.por_vendedor]
  );

  const branches = useMemo(
    () => dashboard?.por_sucursal || [],
    [dashboard?.por_sucursal]
  );

  const gaps = useMemo(
    () => dashboard?.top_gap_conversations || [],
    [dashboard?.top_gap_conversations]
  );

  const alerts = useMemo(
    () => dashboard?.alertas_abiertas || [],
    [dashboard?.alertas_abiertas]
  );

  async function handleRefresh() {
    await runNiaCommercialAssistantDispatch(false);
    await loadDashboard(period, true);
    await loadReports(true);
  }

  async function handleGenerateDailyReport() {
    await runNiaCommercialAssistantDispatch(true);
    await loadDashboard(period, true);
    await loadReports(true);
  }

async function handleOpenConversation(conversationId: string, alertId?: string) {
  if (alertId) {
    await updateAlertStatus(
      alertId,
      "VISTA",
      "Vista automáticamente al abrir la conversación desde Control Comercial IA."
    );
  }

  window.localStorage.setItem(
    "nostur_comunicaciones_open_conversation",
    JSON.stringify({
      conversationId,
      source: "control-comercial-ia",
      createdAt: new Date().toISOString()
    })
  );

  window.dispatchEvent(
    new CustomEvent("nostur:open-internal", {
      detail: {
        moduleId: "comunicaciones",
        title: "Comunicaciones"
      }
    })
  );

  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent("nossix:open-conversation", {
        detail: {
          conversationId,
          source: "control-comercial-ia"
        }
      })
    );
  }, 250);

  await loadDashboard(period, true);
}

  async function handleResolveAlert(alertId: string) {
    await updateAlertStatus(
      alertId,
      "RESUELTA",
      "Resuelta desde Control Comercial IA."
    );

    await loadDashboard(period, true);
  }


  async function handleMarkAlertSeen(alertId: string) {
  await updateAlertStatus(
    alertId,
    "VISTA",
    "Vista desde Control Comercial IA."
  );

  await loadDashboard(period, true);
}

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(79,124,144,0.14),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.11),transparent_32%),linear-gradient(135deg,#eef3f5,#e5edf1_48%,#f8fafc)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-white/75 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#111827]">
                  Control Comercial IA
                </h1>

                <span className="rounded-xl bg-violet-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                  Métricas operativas
                </span>
              </div>

              <p className="mt-0.5 max-w-4xl text-xs font-semibold leading-5 text-[#64748b]">
                Tablero de control para medir tiempos de respuesta, GAP 24h / 48h,
                uso del asistente IA, feedback, oportunidades y alertas comerciales.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleGenerateDailyReport}
                disabled={loading}
                className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                Generar reporte diario
              </button>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
              >
                <RefreshCcw size={14} />
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {([1, 7, 15, 30] as PeriodOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPeriod(option)}
                  className={[
                    "h-8 rounded-xl px-3 text-[11px] font-black shadow-sm transition",
                    period === option
                      ? "bg-[#4f7c90] text-white"
                      : "bg-white text-[#334155] ring-1 ring-black/10 hover:bg-[#f8fafc]"
                  ].join(" ")}
                >
                  {option === 1 ? "Hoy" : `${option} días`}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-semibold text-[#64748b]">
              Última actualización: {formatDateTimeSafe(dashboard?.generated_at)}
            </div>
          </div>
        </header>

        {error ? (
          <div className="shrink-0 px-4 pt-3">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
              <span>{error}</span>

              <button
                type="button"
                onClick={clearError}
                className="font-black text-red-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        <section className="shrink-0 border-b border-black/10 bg-white/55 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <ViewButton
              active={view === "resumen"}
              label="Resumen"
              onClick={() => setView("resumen")}
            />

            <ViewButton
              active={view === "vendedores"}
              label="Vendedores"
              count={sellers.length}
              onClick={() => setView("vendedores")}
            />

            <ViewButton
              active={view === "sucursales"}
              label="Sucursales"
              count={branches.length}
              onClick={() => setView("sucursales")}
            />

            <ViewButton
              active={view === "gaps"}
              label="GAPs"
              count={gaps.length}
              onClick={() => setView("gaps")}
            />

            <ViewButton
              active={view === "alertas"}
              label="Alertas"
              count={alerts.length}
              onClick={() => setView("alertas")}
            />

            <ViewButton
              active={view === "reportes"}
              label="Reportes diarios"
              count={reports.length}
              onClick={() => setView("reportes")}
            />
          </div>
        </section>

        <main className="min-h-0 flex-1 overflow-auto p-4">
          {!dashboard ? (
            <EmptyState
              title="Cargando tablero"
              description="Estamos consultando métricas comerciales, uso de IA y alertas operativas."
            />
          ) : null}

          {dashboard && view === "resumen" ? (
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Cliente esperando"
                  value={formatNumber(global?.conversaciones_cliente_esperando)}
                  helper="Conversaciones donde el pasajero escribió y aún no recibió respuesta."
                  icon={Clock3}
                  tone="amber"
                />

                <MetricCard
                  label="GAP 48h"
                  value={formatNumber(global?.gap_48h)}
                  helper="Casos críticos que deben escalarse a gerencia/admin."
                  icon={AlertTriangle}
                  tone="red"
                />

                <MetricCard
                  label="GAP 24h"
                  value={formatNumber(global?.gap_24h)}
                  helper="Casos que requieren aviso preventivo al vendedor."
                  icon={TrendingUp}
                  tone="amber"
                />

                <MetricCard
                  label="GAP promedio"
                  value={formatHours(global?.gap_promedio_horas)}
                  helper="Promedio de demora en conversaciones pendientes."
                  icon={BarChart3}
                  tone="slate"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Oportunidades abiertas"
                  value={formatNumber(global?.oportunidades_abiertas)}
                  helper="Leads activos sin cierre comercial."
                  icon={UserCheck}
                  tone="blue"
                />

                <MetricCard
                  label="Cotizados pendientes"
                  value={formatNumber(global?.cotizados_pendientes)}
                  helper="Presupuestos enviados que siguen abiertos."
                  icon={MessageCircle}
                  tone="violet"
                />

                <MetricCard
                  label="Uso Chat IA"
                  value={formatNumber(global?.ai_chat_mensajes_usuario)}
                  helper="Consultas del equipo al asistente comercial."
                  icon={Bot}
                  tone="violet"
                />

                <MetricCard
                  label="Análisis IA"
                  value={formatNumber(global?.ai_analisis_generados)}
                  helper="Análisis generados sobre conversaciones."
                  icon={Brain}
                  tone="violet"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Feedback positivo"
                  value={formatNumber(global?.ai_feedback_positivo)}
                  helper="Evaluaciones positivas sobre respuestas IA."
                  icon={ThumbsUp}
                  tone="green"
                />

                <MetricCard
                  label="Feedback negativo"
                  value={formatNumber(global?.ai_feedback_negativo)}
                  helper="Evaluaciones negativas para mejorar entrenamiento."
                  icon={ThumbsDown}
                  tone="red"
                />

                <MetricCard
                  label="Rating IA"
                  value={formatDecimal(global?.ai_feedback_promedio)}
                  helper="Promedio de estrellas recibidas."
                  icon={Star}
                  tone="green"
                />

                <MetricCard
                  label="Alertas abiertas"
                  value={formatNumber(global?.alertas_abiertas)}
                  helper="Alertas operativas pendientes de resolución."
                  icon={AlertTriangle}
                  tone="red"
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <SectionCard
                  title="Ranking por vendedor"
                  description="Primeros vendedores con mayor demora o actividad relevante."
                >
                  <SellerTable rows={sellers.slice(0, 8)} />
                </SectionCard>

                <SectionCard
                  title="Ranking por sucursal"
                  description="Control de performance operativa por sucursal."
                >
                  <BranchTable rows={branches.slice(0, 8)} />
                </SectionCard>
              </div>
            </div>
          ) : null}

          {dashboard && view === "vendedores" ? (
            <SectionCard
              title="Métricas por vendedor"
              description="Demoras, oportunidades, uso de IA y feedback por cada vendedor."
            >
              <SellerTable rows={sellers} />
            </SectionCard>
          ) : null}

          {dashboard && view === "sucursales" ? (
            <SectionCard
              title="Métricas por sucursal"
              description="Comparativo operativo por sucursal."
            >
              <BranchTable rows={branches} />
            </SectionCard>
          ) : null}

          {dashboard && view === "gaps" ? (
            <SectionCard
              title="Conversaciones con mayor demora"
              description="Pasajeros esperando respuesta, ordenados por cantidad de horas."
            >
              {gaps.length === 0 ? (
                <EmptyState
                  title="Sin GAPs pendientes"
                  description="No hay conversaciones pendientes de respuesta en este período."
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {gaps.map((item) => (
                    <GapCard
                      key={item.conversation_id}
                      item={item}
                      onOpenConversation={handleOpenConversation}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}

          {dashboard && view === "alertas" ? (
            <SectionCard
              title="Alertas operativas abiertas"
              description="Alertas GAP 24h / 48h y eventos operativos pendientes."
            >
              {alerts.length === 0 ? (
                <EmptyState
                  title="Sin alertas abiertas"
                  description="No hay alertas operativas pendientes."
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {alerts.map((item) => (
                   <AlertCard
  key={item.id}
  item={item}
  onOpenConversation={handleOpenConversation}
  onResolve={handleResolveAlert}
  onMarkSeen={handleMarkAlertSeen}
/>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}

          {dashboard && view === "reportes" ? (
            <SectionCard
              title="Reportes diarios"
              description="Snapshots diarios para gerencia y administración general."
            >
              {reports.length === 0 ? (
                <EmptyState
                  title="Sin reportes diarios"
                  description="Generá el primer reporte diario desde el botón superior."
                />
              ) : (
                <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                  {reports.map((item) => (
                    <ReportCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}
        </main>
      </div>
    </div>
  );
}