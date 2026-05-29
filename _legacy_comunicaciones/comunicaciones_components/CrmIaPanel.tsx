// src/components/comunicaciones/CrmIaPanel.tsx

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Brain,
  ChevronRight,
  Clock3,
  MessageCircle,
  RefreshCcw,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  X
} from "lucide-react";

import {
  getComunicacionDisplayName,
  getComunicacionEstadoComercialLabel,
  getComunicacionEstadoGestionLabel,
  useComunicacionesStore,
  type AiConversationAnalysis,
  type ComunicacionConversation,
  type ComunicacionesFilters
} from "../../store/comunicacionesStore";

import { MetricPill, PriorityBadge, WindowBadge } from "./ComunicacionesBadges";
import { formatDateTime } from "./comunicacionesPanel.helpers";
import { FieldLabel, InlineError, NosturSelect } from "./comunicacionesPanel.ui";
import type { SelectOption } from "./comunicacionesPanel.constants";

type ComunicacionesState = ReturnType<typeof useComunicacionesStore.getState>;

type ContactAiProfile = {
  id: string;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id?: string | null;
  nombre_detectado: string | null;
  telefono_detectado: string | null;
  email_detectado?: string | null;
  score_actual: number | string | null;
  temperatura_actual: string | null;
  resumen_general: string | null;
  preferencias_generales: string | null;
  destinos_interes: string[] | null;
  fechas_interes: string[] | null;
  cantidad_pasajeros: string | null;
  presupuesto_estimado: string | null;
  restricciones: string[] | null;
  objeciones: string[] | null;
  intereses: string[] | null;
  ultimo_resumen_ia: string | null;
  ultima_accion_sugerida: string | null;
  ultima_respuesta_sugerida: string | null;
  informacion_faltante: string[] | null;
  etiquetas_sugeridas: string[] | null;
  estado_pipeline: string | null;
  estado_ia: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AiActionLog = {
  id: string;
  created_at: string;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  contact_ai_profile_id: string | null;
  ai_event_id: string | null;
  action_type: string;
  action_title: string;
  action_detail: string | null;
  actor_type: string | null;
  actor_id: string | null;
  source: string | null;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
};

type ComunicacionesStateExtended = ComunicacionesState & {
  contactAiProfiles?: ContactAiProfile[];
  aiActionsLog?: AiActionLog[];
  loadContactAiProfiles?: () => Promise<void>;
  loadAiActionsLog?: () => Promise<void>;
};

type CrmIaTemperature = "CALIENTE" | "TIBIO" | "FRIO" | "SIN_ANALISIS";

type CrmIaColumnId =
  | "OPORTUNIDADES"
  | "COTIZADO"
  | "GANADO"
  | "PERDIDO";

type CrmIaClientProfile = {
  nombre: string;
  contacto: string;
  vendedor: string;
  sucursal: string;
  preferenciasGenerales: string[];
  destinosInteres: string[];
  estiloViaje: string;
  presupuestoEstimado: string;
  fechasTentativas: string;
  pasajeros: string;
  necesidadesDetectadas: string[];
  restricciones: string[];
  objeciones: string[];
  intereses: string[];
  etiquetas: string[];
  resumenGeneral: string;
  ultimaRespuestaSugerida: string;
};

type CrmIaOpportunity = {
  conversation: ComunicacionConversation;
  analysis: AiConversationAnalysis | null;
  contactProfile: ContactAiProfile | null;
  score: number;
  temperature: CrmIaTemperature;
  columnId: CrmIaColumnId;
  summary: string;
  nextAction: string;
  missingInfo: string[];
  clientProfile: CrmIaClientProfile;
};

type CrmIaFilters = {
  search: string;
  vendedorId: string;
  sucursalId: string;
  columnId: "todas" | CrmIaColumnId;
  onlyWithoutAnalysis: boolean;
};

const EMPTY_CONTACT_AI_PROFILES: ContactAiProfile[] = [];
const EMPTY_AI_ACTIONS_LOG: AiActionLog[] = [];

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown, fallback = ""): string {
  const text = String(value || "").trim();
  return text || fallback;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getAiScore(
  analysis: AiConversationAnalysis | null,
  contactProfile?: ContactAiProfile | null
): number {
  if (contactProfile?.score_actual !== null && contactProfile?.score_actual !== undefined) {
    return toNumber(contactProfile.score_actual);
  }

  if (!analysis) return 0;

  const raw = readRecord(analysis.raw);

  const value =
    analysis.score_cliente ||
    analysis.puntaje_lead ||
    analysis.lead_score ||
    raw.ai_score ||
    0;

  return toNumber(value);
}

function getAiSummary(
  analysis: AiConversationAnalysis | null,
  contactProfile?: ContactAiProfile | null
): string {
  const fromProfile =
    readString(contactProfile?.resumen_general) ||
    readString(contactProfile?.ultimo_resumen_ia);

  if (fromProfile) return fromProfile;

  if (!analysis) return "Todavía no hay análisis IA para esta oportunidad.";

  return readString(
    analysis.resumen || analysis.summary,
    "Sin resumen disponible."
  );
}

function getAiNextAction(
  analysis: AiConversationAnalysis | null,
  contactProfile?: ContactAiProfile | null
): string {
  const fromProfile = readString(contactProfile?.ultima_accion_sugerida);

  if (fromProfile) return fromProfile;

  if (!analysis) return "Analizar conversación con IA.";

  const actions = readStringArray(analysis.proximas_acciones || analysis.next_actions);

  return readString(
    analysis.proxima_accion || actions[0],
    "Revisar la conversación y definir próximo paso."
  );
}

function getAiMissingInfo(
  analysis: AiConversationAnalysis | null,
  contactProfile?: ContactAiProfile | null
): string[] {
  const fromProfile = readStringArray(contactProfile?.informacion_faltante);

  if (fromProfile.length > 0) return fromProfile;

  if (!analysis) return [];

  return readStringArray(analysis.informacion_faltante || analysis.missing_info);
}

function getAiDetectedData(analysis: AiConversationAnalysis | null): Record<string, unknown> {
  if (!analysis) return {};

  return readRecord(
    analysis.datos_detectados ||
      readRecord(analysis.raw).datos_detectados ||
      readRecord(analysis.raw).datos ||
      {}
  );
}

function getTemperatureFromScore(
  score: number,
  hasAnalysis: boolean,
  contactProfile?: ContactAiProfile | null
): CrmIaTemperature {
  const profileTemperature = readString(contactProfile?.temperatura_actual).toUpperCase();

  if (profileTemperature === "CALIENTE") return "CALIENTE";
  if (profileTemperature === "TIBIO") return "TIBIO";
  if (profileTemperature === "FRIO" || profileTemperature === "FRÍO") return "FRIO";

  if (!hasAnalysis && !contactProfile) return "SIN_ANALISIS";
  if (score >= 75) return "CALIENTE";
  if (score >= 45) return "TIBIO";
  return "FRIO";
}

function getColumnId(conversation: ComunicacionConversation): CrmIaColumnId {
  const estadoComercial = String(conversation.estado_comercial || "").toUpperCase();

  if (estadoComercial === "PRESUPUESTADO" || estadoComercial === "COTIZANDO") return "COTIZADO";
  if (estadoComercial === "VENDIDO") return "GANADO";
  if (estadoComercial === "PERDIDO" || estadoComercial === "CERRADO") return "PERDIDO";

  return "OPORTUNIDADES";
}

function getColumnLabel(value: CrmIaColumnId): string {
  const labels: Record<CrmIaColumnId, string> = {
    OPORTUNIDADES: "Oportunidades",
    COTIZADO: "Cotizados",
    GANADO: "Ganados",
    PERDIDO: "Perdidos"
  };

  return labels[value];
}

function getColumnDescription(value: CrmIaColumnId): string {
  const labels: Record<CrmIaColumnId, string> = {
    OPORTUNIDADES: "Sin análisis, frías, tibias y calientes",
    COTIZADO: "Ya recibió propuesta",
    GANADO: "Venta lograda",
    PERDIDO: "Oportunidad perdida"
  };

  return labels[value];
}

function getTemperatureLabel(value: CrmIaTemperature): string {
  const labels: Record<CrmIaTemperature, string> = {
    CALIENTE: "Caliente",
    TIBIO: "Tibio",
    FRIO: "Frío",
    SIN_ANALISIS: "Sin análisis"
  };

  return labels[value];
}

function getTemperatureClass(value: CrmIaTemperature): string {
  const classes: Record<CrmIaTemperature, string> = {
    CALIENTE: "border-red-200 bg-red-50 text-red-700",
    TIBIO: "border-amber-200 bg-amber-50 text-amber-700",
    FRIO: "border-slate-200 bg-slate-50 text-slate-600",
    SIN_ANALISIS: "border-violet-200 bg-violet-50 text-violet-700"
  };

  return classes[value];
}

function getColumnHeaderClass(value: CrmIaColumnId): string {
  const classes: Record<CrmIaColumnId, string> = {
    OPORTUNIDADES: "border-violet-200 bg-violet-50 text-violet-800",
    COTIZADO: "border-blue-200 bg-blue-50 text-blue-800",
    GANADO: "border-green-200 bg-green-50 text-green-800",
    PERDIDO: "border-zinc-200 bg-zinc-50 text-zinc-700"
  };

  return classes[value];
}

function getScoreClass(score: number): string {
  if (score >= 75) return "text-red-700";
  if (score >= 45) return "text-amber-700";
  if (score > 0) return "text-slate-600";
  return "text-violet-700";
}

function formatProfileField(value: unknown): string {
  const text = String(value || "").trim();
  return text || "—";
}

function findContactProfileForConversation(
  conversation: ComunicacionConversation,
  profiles: ContactAiProfile[]
): ContactAiProfile | null {
  return (
    profiles.find((profile) => profile.conversation_id === conversation.id) ||
    profiles.find((profile) => Boolean(conversation.contacto_id) && profile.contacto_id === conversation.contacto_id) ||
    null
  );
}

function buildClientProfile(
  conversation: ComunicacionConversation,
  analysis: AiConversationAnalysis | null,
  contactProfile: ContactAiProfile | null
): CrmIaClientProfile {
  const detected = getAiDetectedData(analysis);
  const raw = readRecord(analysis?.raw);

  const preferenciasFromRaw = readStringArray(
    detected.preferencias ||
      detected.preferencias_generales ||
      raw.preferencias ||
      raw.preferencias_generales ||
      raw.ai_preferencias
  );

  const necesidadesFromRaw = readStringArray(
    detected.necesidades ||
      detected.necesidades_detectadas ||
      raw.necesidades ||
      raw.necesidades_detectadas
  );

  const destinos = uniq(
    [
      ...(contactProfile?.destinos_interes || []),
      readString(detected.destino),
      readString(detected.destinos),
      readString(raw.ai_destino_detectado),
      readString(conversation.categoria)
    ].filter(Boolean)
  );

  const preferenciasGenerales = uniq([
    readString(contactProfile?.preferencias_generales),
    ...preferenciasFromRaw,
    readString(detected.estilo_viaje),
    readString(raw.estilo_viaje),
    readString(raw.ai_estilo_viaje)
  ]).filter((item) => item !== "—");

  const missingInfo = getAiMissingInfo(analysis, contactProfile);

  const necesidadesDetectadas = uniq([
    ...necesidadesFromRaw,
    ...missingInfo.map((item) => `Falta confirmar: ${item}`)
  ]);

  const restricciones = uniq(readStringArray(contactProfile?.restricciones));
  const objeciones = uniq(readStringArray(contactProfile?.objeciones));
  const intereses = uniq(readStringArray(contactProfile?.intereses));
  const etiquetas = uniq(readStringArray(contactProfile?.etiquetas_sugeridas));

  return {
    nombre:
      readString(contactProfile?.nombre_detectado) ||
      getComunicacionDisplayName(conversation),
    contacto:
      readString(contactProfile?.telefono_detectado) ||
      readString(contactProfile?.email_detectado) ||
      conversation.telefono ||
      conversation.email ||
      "Sin contacto",
    vendedor: conversation.assigned_full_name || "Sin vendedor asignado",
    sucursal: conversation.sucursal_nombre || "Sin sucursal",
    preferenciasGenerales:
      preferenciasGenerales.length > 0
        ? preferenciasGenerales
        : ["La IA todavía no detectó preferencias generales consistentes."],
    destinosInteres: destinos.length > 0 ? destinos : ["Destino no detectado"],
    estiloViaje: formatProfileField(
      detected.estilo_viaje ||
        raw.estilo_viaje ||
        raw.ai_estilo_viaje ||
        detected.tipo_viaje
    ),
    presupuestoEstimado: formatProfileField(
      contactProfile?.presupuesto_estimado ||
        detected.presupuesto ||
        raw.ai_presupuesto_detectado ||
        raw.presupuesto
    ),
    fechasTentativas: formatProfileField(
      contactProfile?.fechas_interes?.join(", ") ||
        detected.fecha_viaje ||
        raw.ai_fecha_detectada ||
        raw.fecha_viaje
    ),
    pasajeros: formatProfileField(
      contactProfile?.cantidad_pasajeros ||
        detected.cantidad_pasajeros ||
        raw.ai_pax_detectados ||
        raw.pasajeros
    ),
    necesidadesDetectadas:
      necesidadesDetectadas.length > 0
        ? necesidadesDetectadas
        : ["Sin necesidades específicas detectadas todavía."],
    restricciones,
    objeciones,
    intereses,
    etiquetas,
    resumenGeneral:
      readString(contactProfile?.resumen_general) ||
      readString(contactProfile?.ultimo_resumen_ia) ||
      getAiSummary(analysis, contactProfile),
    ultimaRespuestaSugerida:
      readString(contactProfile?.ultima_respuesta_sugerida) ||
      readString(analysis?.respuesta_sugerida || analysis?.suggested_response)
  };
}

function buildOpportunity(
  conversation: ComunicacionConversation,
  analysis: AiConversationAnalysis | null,
  contactProfile: ContactAiProfile | null
): CrmIaOpportunity {
  const score = getAiScore(analysis, contactProfile);
  const temperature = getTemperatureFromScore(score, Boolean(analysis), contactProfile);
  const columnId = getColumnId(conversation);

  return {
    conversation,
    analysis,
    contactProfile,
    score,
    temperature,
    columnId,
    summary: getAiSummary(analysis, contactProfile),
    nextAction: getAiNextAction(analysis, contactProfile),
    missingInfo: getAiMissingInfo(analysis, contactProfile),
    clientProfile: buildClientProfile(conversation, analysis, contactProfile)
  };
}

function openConversation(conversationId: string) {
  window.localStorage.setItem(
    "nostur_comunicaciones_open_conversation",
    JSON.stringify({
      conversationId,
      source: "asistente-comercial",
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
}

function CrmIaTemperatureBadge({ value }: { value: CrmIaTemperature }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
        getTemperatureClass(value)
      ].join(" ")}
    >
      {getTemperatureLabel(value)}
    </span>
  );
}

function CrmIaScore({ score }: { score: number }) {
  return (
    <div className="flex items-end gap-1">
      <span className={["text-2xl font-black leading-none", getScoreClass(score)].join(" ")}>
        {score}
      </span>
      <span className="pb-0.5 text-[10px] font-black text-[#94a3b8]">/100</span>
    </div>
  );
}

function CrmIaEmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-black/10 bg-white/75 p-8 text-center shadow-sm">
      <div className="max-w-md">
        <Bot size={38} className="mx-auto mb-3 text-[#4f7c90]" />
        <h3 className="text-base font-black text-[#111827]">{title}</h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-[#64748b]">
          {description}
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-[#64748b]">{label}</span>
      <strong className="max-w-[210px] text-right text-[#111827]">{value}</strong>
    </div>
  );
}

function PillList({
  items,
  emptyText,
  tone = "slate"
}: {
  items: string[];
  emptyText: string;
  tone?: "slate" | "violet" | "amber" | "blue" | "red" | "green";
}) {
  const classes = {
    slate: "border-black/10 bg-[#f8fafc] text-[#334155]",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    red: "border-red-200 bg-red-50 text-red-800",
    green: "border-green-200 bg-green-50 text-green-800"
  };

  if (items.length === 0) {
    return <div className="text-xs font-semibold text-[#64748b]">{emptyText}</div>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={[
            "rounded-xl border px-2 py-1 text-[10px] font-black",
            classes[tone]
          ].join(" ")}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function CrmIaOpportunityCard({
  item,
  selected,
  onClick
}: {
  item: CrmIaOpportunity;
  selected: boolean;
  onClick: () => void;
}) {
  const conversation = item.conversation;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group w-full rounded-[20px] border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
        selected
          ? "border-[#4f7c90] bg-white ring-2 ring-[#4f7c90]/20"
          : "border-black/10 bg-white/88"
      ].join(" ")}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-[#111827]">
            {getComunicacionDisplayName(conversation)}
          </h3>

          <div className="mt-0.5 truncate text-[10px] font-bold text-[#64748b]">
            {conversation.telefono || conversation.email || "Sin contacto"}
          </div>
        </div>

        <CrmIaScore score={item.score} />
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        <CrmIaTemperatureBadge value={item.temperature} />
        <PriorityBadge value={conversation.prioridad} />
        {conversation.unread_count ? (
          <span className="rounded-xl border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
            {conversation.unread_count} sin leer
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold leading-5 text-[#334155]">
        {item.summary}
      </div>

      <div className="mt-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2">
        <div className="mb-0.5 text-[9px] font-black uppercase tracking-wide text-[#94a3b8]">
          Próxima acción
        </div>

        <div className="text-[11px] font-semibold leading-5 text-[#475569]">
          {item.nextAction}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-black text-[#64748b]">
        <span className="truncate">{conversation.assigned_full_name || "Sin vendedor"}</span>

        <span className="flex items-center gap-1 text-[#4f7c90] opacity-80 group-hover:opacity-100">
          Ver ficha
          <ChevronRight size={12} />
        </span>
      </div>
    </button>
  );
}

function CrmIaOpportunityDrawer({
  item,
  activityLog,
  analyzing,
  onClose,
  onOpenConversation,
  onAnalyze
}: {
  item: CrmIaOpportunity;
  activityLog: AiActionLog[];
  analyzing: boolean;
  onClose: () => void;
  onOpenConversation: () => void;
  onAnalyze: () => void;
}) {
  const conversation = item.conversation;
  const profile = item.clientProfile;

  const timeline = [
    {
      title: "Último mensaje",
      detail: conversation.last_message || "Sin último mensaje registrado.",
      date: conversation.last_message_time
    },
    {
      title: item.analysis ? "Análisis IA disponible" : "Análisis IA pendiente",
      detail: item.analysis ? item.summary : "Todavía falta generar el análisis de esta oportunidad.",
      date: item.analysis?.analyzed_at || item.analysis?.created_at || null
    },
    {
      title: "Próxima acción sugerida",
      detail: item.nextAction,
      date: null
    }
  ];

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-[260] flex w-full max-w-[560px] flex-col border-l border-black/10 bg-white shadow-2xl">
      <header className="shrink-0 border-b border-black/10 bg-[#f8fafc] px-5 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-1.5">
              <CrmIaTemperatureBadge value={item.temperature} />
              <PriorityBadge value={conversation.prioridad} />
              <WindowBadge conversation={conversation} />
            </div>

            <h2 className="truncate text-lg font-black text-[#111827]">
              {getComunicacionDisplayName(conversation)}
            </h2>

            <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
              Ficha comercial generada por IA
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-black/10 bg-white p-3">
            <div className="text-[10px] font-black uppercase text-[#64748b]">Score</div>
            <CrmIaScore score={item.score} />
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-3">
            <div className="text-[10px] font-black uppercase text-[#64748b]">Estado</div>
            <div className="mt-1 text-xs font-black text-[#111827]">
              {getComunicacionEstadoComercialLabel(conversation.estado_comercial)}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-3">
            <div className="text-[10px] font-black uppercase text-[#64748b]">Gestión</div>
            <div className="mt-1 text-xs font-black text-[#111827]">
              {getComunicacionEstadoGestionLabel(conversation.estado_gestion)}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-5">
        <div className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <UserCheck size={15} className="text-[#4f7c90]" />
              <h3 className="text-sm font-black text-[#111827]">Ficha del cliente</h3>
            </div>

            <div className="grid gap-2">
              <InfoRow label="Nombre" value={profile.nombre} />
              <InfoRow label="Contacto" value={profile.contacto} />
              <InfoRow label="Vendedor" value={profile.vendedor} />
              <InfoRow label="Sucursal" value={profile.sucursal} />
              <InfoRow label="Último mensaje" value={formatDateTime(conversation.last_message_time)} />
            </div>
          </section>

          <section className="rounded-[24px] border border-violet-200 bg-violet-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Brain size={15} className="text-violet-700" />
              <h3 className="text-sm font-black text-violet-950">Preferencias generales</h3>
            </div>

            <div className="grid gap-3">
              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                  Preferencias detectadas
                </div>
                <PillList
                  items={profile.preferenciasGenerales}
                  emptyText="Sin preferencias detectadas."
                  tone="violet"
                />
              </div>

              <div>
                <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                  Destinos de interés
                </div>
                <PillList
                  items={profile.destinosInteres}
                  emptyText="Sin destinos detectados."
                  tone="blue"
                />
              </div>

              <div className="grid gap-2 rounded-2xl border border-violet-200 bg-white/75 p-3">
                <InfoRow label="Estilo de viaje" value={profile.estiloViaje} />
                <InfoRow label="Presupuesto" value={profile.presupuestoEstimado} />
                <InfoRow label="Fechas" value={profile.fechasTentativas} />
                <InfoRow label="Pasajeros" value={profile.pasajeros} />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={15} className="text-[#4f7c90]" />
              <h3 className="text-sm font-black text-[#111827]">Resumen IA</h3>
            </div>

            <div className="whitespace-pre-wrap rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs font-semibold leading-5 text-[#334155]">
              {profile.resumenGeneral}
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-[#4f7c90]" />
              <h3 className="text-sm font-black text-[#111827]">Próxima acción</h3>
            </div>

            <div className="whitespace-pre-wrap rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs font-semibold leading-5 text-[#334155]">
              {item.nextAction}
            </div>
          </section>

          {profile.ultimaRespuestaSugerida ? (
            <section className="rounded-[24px] border border-green-200 bg-green-50 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <MessageCircle size={15} className="text-green-700" />
                <h3 className="text-sm font-black text-green-900">Respuesta sugerida</h3>
              </div>

              <div className="whitespace-pre-wrap rounded-2xl border border-green-200 bg-white/75 p-3 text-xs font-semibold leading-5 text-green-900">
                {profile.ultimaRespuestaSugerida}
              </div>
            </section>
          ) : null}

          <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-700" />
              <h3 className="text-sm font-black text-amber-900">Datos faltantes / necesidades</h3>
            </div>

            <PillList
              items={profile.necesidadesDetectadas}
              emptyText="Sin datos faltantes detectados."
              tone="amber"
            />
          </section>

          {profile.restricciones.length > 0 || profile.objeciones.length > 0 || profile.intereses.length > 0 ? (
            <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Brain size={15} className="text-[#4f7c90]" />
                <h3 className="text-sm font-black text-[#111827]">Lectura comercial</h3>
              </div>

              <div className="grid gap-3">
                {profile.intereses.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                      Intereses
                    </div>
                    <PillList items={profile.intereses} emptyText="Sin intereses detectados." tone="blue" />
                  </div>
                ) : null}

                {profile.restricciones.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                      Restricciones
                    </div>
                    <PillList items={profile.restricciones} emptyText="Sin restricciones." tone="amber" />
                  </div>
                ) : null}

                {profile.objeciones.length > 0 ? (
                  <div>
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                      Objeciones
                    </div>
                    <PillList items={profile.objeciones} emptyText="Sin objeciones." tone="red" />
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 size={15} className="text-[#4f7c90]" />
              <h3 className="text-sm font-black text-[#111827]">Actividad preliminar</h3>
            </div>

            <div className="grid gap-2">
              {timeline.map((event) => (
                <div
                  key={`${event.title}-${event.detail}`}
                  className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-black text-[#111827]">{event.title}</div>
                    <div className="text-[10px] font-bold text-[#94a3b8]">
                      {event.date ? formatDateTime(event.date) : "—"}
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] font-semibold leading-5 text-[#64748b]">
                    {event.detail}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Clock3 size={15} className="text-[#4f7c90]" />
              <h3 className="text-sm font-black text-[#111827]">Registro de movimientos IA</h3>
            </div>

            {activityLog.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#64748b]">
                Todavía no hay movimientos registrados para esta oportunidad.
              </div>
            ) : (
              <div className="grid gap-2">
                {activityLog.slice(0, 12).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {event.action_title || event.action_type}
                        </div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">
                          {event.actor_type || "AI"} · {event.source || "sistema"}
                        </div>
                      </div>

                      <div className="shrink-0 text-[10px] font-bold text-[#94a3b8]">
                        {formatDateTime(event.created_at)}
                      </div>
                    </div>

                    {event.action_detail ? (
                      <div className="mt-1 line-clamp-4 text-[11px] font-semibold leading-5 text-[#64748b]">
                        {event.action_detail}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-black/10 bg-[#f8fafc] p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenConversation}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-[#4f7c90] text-xs font-black text-white shadow-sm hover:bg-[#416a7a]"
          >
            <MessageCircle size={15} />
            Abrir chat
          </button>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={analyzing}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-white text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
          >
            <Sparkles size={15} />
            {analyzing ? "Analizando..." : item.analysis ? "Reanalizar" : "Analizar IA"}
          </button>
        </div>
      </footer>
    </aside>
  );
}

export function CrmIaPanel() {
  const comunicacionesStore = useComunicacionesStore() as ComunicacionesStateExtended;

  const loading = comunicacionesStore.loading;
  const error = comunicacionesStore.error;
  const conversations = comunicacionesStore.conversations;
  const vendedores = comunicacionesStore.vendedores;
  const sucursales = comunicacionesStore.sucursales;
  const aiAnalysisByConversationId = comunicacionesStore.aiAnalysisByConversationId;

  const contactAiProfiles = comunicacionesStore.contactAiProfiles || EMPTY_CONTACT_AI_PROFILES;
  const aiActionsLog = comunicacionesStore.aiActionsLog || EMPTY_AI_ACTIONS_LOG;

  const loadComunicaciones = comunicacionesStore.loadComunicaciones;
  const analyzeConversationAi = comunicacionesStore.analyzeConversationAi;
  const loadConversationAiAnalysis = comunicacionesStore.loadConversationAiAnalysis;
  const loadContactAiProfiles = comunicacionesStore.loadContactAiProfiles;
  const loadAiActionsLog = comunicacionesStore.loadAiActionsLog;
  const clearError = comunicacionesStore.clearError;
  const setComunicacionesFilter = comunicacionesStore.setFilter;

  const [filters, setFilters] = useState<CrmIaFilters>({
    search: "",
    vendedorId: "todos",
    sucursalId: "todas",
    columnId: "todas",
    onlyWithoutAnalysis: false
  });

  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);

  useEffect(() => {
    void loadComunicaciones();
    void loadContactAiProfiles?.();
    void loadAiActionsLog?.();
  }, [loadComunicaciones, loadContactAiProfiles, loadAiActionsLog]);

  useEffect(() => {
    conversations.slice(0, 40).forEach((conversation) => {
      if (!aiAnalysisByConversationId[conversation.id]) {
        void loadConversationAiAnalysis(conversation.id);
      }
    });
  }, [conversations, aiAnalysisByConversationId, loadConversationAiAnalysis]);

  const vendedorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todos" },
      ...vendedores.map((vendedor) => ({
        value: vendedor.id,
        label: `${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim() || vendedor.email
      }))
    ],
    [vendedores]
  );

  const sucursalOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todas", label: "Todas" },
      ...sucursales.map((sucursal) => ({
        value: sucursal.id,
        label: sucursal.nombre
      }))
    ],
    [sucursales]
  );

  const columnOptions: SelectOption[] = [
    { value: "todas", label: "Todas" },
    { value: "OPORTUNIDADES", label: "Oportunidades" },
    { value: "COTIZADO", label: "Cotizados" },
    { value: "GANADO", label: "Ganados" },
    { value: "PERDIDO", label: "Perdidos" }
  ];

  const columns: Array<{
    id: CrmIaColumnId;
    label: string;
    description: string;
  }> = [
    {
      id: "OPORTUNIDADES",
      label: getColumnLabel("OPORTUNIDADES"),
      description: getColumnDescription("OPORTUNIDADES")
    },
    {
      id: "COTIZADO",
      label: getColumnLabel("COTIZADO"),
      description: getColumnDescription("COTIZADO")
    },
    {
      id: "GANADO",
      label: getColumnLabel("GANADO"),
      description: getColumnDescription("GANADO")
    },
    {
      id: "PERDIDO",
      label: getColumnLabel("PERDIDO"),
      description: getColumnDescription("PERDIDO")
    }
  ];

  const opportunities = useMemo(() => {
    return conversations
      .filter((conversation) => !conversation.deleted && !conversation.archived)
      .map((conversation) =>
        buildOpportunity(
          conversation,
          aiAnalysisByConversationId[conversation.id] || null,
          findContactProfileForConversation(conversation, contactAiProfiles)
        )
      )
      .sort((a, b) => {
        const columnWeight: Record<CrmIaColumnId, number> = {
          OPORTUNIDADES: 1,
          COTIZADO: 2,
          GANADO: 3,
          PERDIDO: 4
        };

        const byColumn = columnWeight[a.columnId] - columnWeight[b.columnId];

        if (byColumn !== 0) return byColumn;

        if (a.columnId === "OPORTUNIDADES" && b.columnId === "OPORTUNIDADES") {
          const tempWeight: Record<CrmIaTemperature, number> = {
            CALIENTE: 1,
            TIBIO: 2,
            FRIO: 3,
            SIN_ANALISIS: 4
          };

          const byTemperature = tempWeight[a.temperature] - tempWeight[b.temperature];

          if (byTemperature !== 0) return byTemperature;
        }

        return b.score - a.score;
      });
  }, [conversations, aiAnalysisByConversationId, contactAiProfiles]);

  const filteredOpportunities = useMemo(() => {
    const search = normalizeText(filters.search);

    return opportunities.filter((item) => {
      const conversation = item.conversation;

      if (filters.vendedorId !== "todos" && conversation.assigned_to !== filters.vendedorId) return false;
      if (filters.sucursalId !== "todas" && conversation.sucursal_id !== filters.sucursalId) return false;
      if (filters.columnId !== "todas" && item.columnId !== filters.columnId) return false;
      if (filters.onlyWithoutAnalysis && item.analysis) return false;

      if (search) {
        const haystack = normalizeText(
          [
            getComunicacionDisplayName(conversation),
            conversation.telefono,
            conversation.email,
            conversation.subject,
            conversation.assigned_full_name,
            conversation.sucursal_nombre,
            conversation.last_message,
            item.summary,
            item.nextAction,
            item.missingInfo.join(" "),
            item.clientProfile.preferenciasGenerales.join(" "),
            item.clientProfile.destinosInteres.join(" "),
            item.clientProfile.intereses.join(" "),
            item.clientProfile.objeciones.join(" "),
            item.clientProfile.restricciones.join(" ")
          ].join(" ")
        );

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [opportunities, filters]);

  const selectedOpportunity =
    filteredOpportunities.find((item) => item.conversation.id === selectedOpportunityId) ||
    opportunities.find((item) => item.conversation.id === selectedOpportunityId) ||
    null;

  const selectedActivityLog = useMemo(() => {
    if (!selectedOpportunity) return [];

    return aiActionsLog
      .filter((event) => {
        const sameConversation = event.conversation_id === selectedOpportunity.conversation.id;
        const sameProfile =
          Boolean(selectedOpportunity.contactProfile?.id) &&
          event.contact_ai_profile_id === selectedOpportunity.contactProfile?.id;

        return sameConversation || sameProfile;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [aiActionsLog, selectedOpportunity]);

  const metrics = useMemo(() => {
    const oportunidades = opportunities.filter((item) => item.columnId === "OPORTUNIDADES").length;
    const calientes = opportunities.filter(
      (item) => item.columnId === "OPORTUNIDADES" && item.temperature === "CALIENTE"
    ).length;
    const tibios = opportunities.filter(
      (item) => item.columnId === "OPORTUNIDADES" && item.temperature === "TIBIO"
    ).length;
    const cotizados = opportunities.filter((item) => item.columnId === "COTIZADO").length;
    const ganados = opportunities.filter((item) => item.columnId === "GANADO").length;
    const perdidos = opportunities.filter((item) => item.columnId === "PERDIDO").length;
    const sinAnalisis = opportunities.filter(
      (item) => item.columnId === "OPORTUNIDADES" && item.temperature === "SIN_ANALISIS"
    ).length;
    const analyzed = opportunities.filter((item) => item.analysis || item.contactProfile);
    const promedio =
      analyzed.length > 0
        ? Math.round(analyzed.reduce((total, item) => total + item.score, 0) / analyzed.length)
        : 0;

    return {
      total: opportunities.length,
      oportunidades,
      calientes,
      tibios,
      cotizados,
      ganados,
      perdidos,
      sinAnalisis,
      promedio
    };
  }, [opportunities]);

  function updateFilter<K extends keyof CrmIaFilters>(key: K, value: CrmIaFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleAnalyze(conversationId: string) {
    setAnalyzingId(conversationId);

    await analyzeConversationAi(conversationId, true);

    await Promise.all([
      loadContactAiProfiles?.(),
      loadAiActionsLog?.()
    ]);

    setAnalyzingId(null);
  }

  function handleOpenInComunicaciones(conversationId: string) {
    setComunicacionesFilter("search", "" as ComunicacionesFilters["search"]);
    openConversation(conversationId);
  }

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_20%_10%,rgba(79,124,144,0.14),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.11),transparent_32%),linear-gradient(135deg,#eef3f5,#e5edf1_48%,#f8fafc)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-white/75 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#111827]">
                  Asistente Comercial
                </h1>

                <span className="rounded-xl bg-violet-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                  CRM IA
                </span>
              </div>

              <p className="mt-0.5 max-w-3xl text-xs font-semibold leading-5 text-[#64748b]">
                Tablero inteligente de oportunidades. La IA arma una ficha viva del cliente,
                detecta preferencias, resume conversaciones y sugiere próximos pasos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadComunicaciones();
                void loadContactAiProfiles?.();
                void loadAiActionsLog?.();
              }}
              disabled={loading}
              className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
            >
              <RefreshCcw size={14} />
              Actualizar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill label="Total" value={metrics.total} tone="slate" />
            <MetricPill label="Oportunidades" value={metrics.oportunidades} tone="blue" />
            <MetricPill label="Calientes" value={metrics.calientes} tone="red" />
            <MetricPill label="Tibias" value={metrics.tibios} tone="blue" />
            <MetricPill label="Cotizados" value={metrics.cotizados} tone="slate" />
            <MetricPill label="Ganados" value={metrics.ganados} tone="green" />
            <MetricPill label="Perdidos" value={metrics.perdidos} tone="slate" />
            <MetricPill label="Sin análisis" value={metrics.sinAnalisis} tone="slate" />
            <MetricPill label="Score prom." value={metrics.promedio} tone="green" />
          </div>
        </header>

        {error ? (
          <div className="shrink-0 px-4 pt-3">
            <InlineError message={error} onClose={clearError} />
          </div>
        ) : null}

        <section className="relative z-30 shrink-0 border-b border-black/10 bg-white/55 px-4 py-3 backdrop-blur">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_170px_170px]">
            <div>
              <FieldLabel>Buscar oportunidad</FieldLabel>

              <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
                <Search size={14} className="text-[#64748b]" />

                <input
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Pasajero, teléfono, destino, preferencia, resumen..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="relative z-50">
              <FieldLabel>Vendedor</FieldLabel>
              <NosturSelect
                value={filters.vendedorId}
                onChange={(value) => updateFilter("vendedorId", value)}
                options={vendedorOptions}
              />
            </div>

            <div className="relative z-50">
              <FieldLabel>Sucursal</FieldLabel>
              <NosturSelect
                value={filters.sucursalId}
                onChange={(value) => updateFilter("sucursalId", value)}
                options={sucursalOptions}
              />
            </div>

            <div className="relative z-50">
              <FieldLabel>Columna</FieldLabel>
              <NosturSelect
                value={filters.columnId}
                onChange={(value) => updateFilter("columnId", value as CrmIaFilters["columnId"])}
                options={columnOptions}
              />
            </div>

            <div>
              <FieldLabel>Vista rápida</FieldLabel>

              <button
                type="button"
                onClick={() => updateFilter("onlyWithoutAnalysis", !filters.onlyWithoutAnalysis)}
                className={[
                  "flex h-9 w-full items-center justify-center rounded-xl border text-xs font-black",
                  filters.onlyWithoutAnalysis
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-black/10 bg-white text-[#334155] hover:bg-[#f8fafc]"
                ].join(" ")}
              >
                {filters.onlyWithoutAnalysis ? "Solo sin análisis" : "Todas"}
              </button>
            </div>
          </div>
        </section>

        <main className="relative z-10 min-h-0 flex-1 overflow-auto p-4">
          {loading ? (
            <CrmIaEmptyState
              title="Cargando oportunidades"
              description="Estamos leyendo conversaciones, contactos y análisis IA disponibles."
            />
          ) : filteredOpportunities.length === 0 ? (
            <CrmIaEmptyState
              title="No hay oportunidades para este filtro"
              description="Probá cambiar los filtros o actualizar el tablero."
            />
          ) : (
            <div className="grid min-w-[1320px] grid-cols-4 gap-4">
              {columns.map((column) => {
                const items = filteredOpportunities.filter((item) => item.columnId === column.id);

                return (
                  <section
                    key={column.id}
                    className="flex max-h-[calc(100vh-245px)] min-h-[420px] min-w-0 flex-col rounded-[26px] border border-black/10 bg-white/42 p-3 shadow-sm backdrop-blur"
                  >
                    <div
                      className={[
                        "mb-3 rounded-2xl border px-3 py-2",
                        getColumnHeaderClass(column.id)
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="truncate text-xs font-black uppercase tracking-wide">
                            {column.label}
                          </h2>

                          <p className="mt-0.5 truncate text-[10px] font-bold opacity-75">
                            {column.description}
                          </p>
                        </div>

                        <span className="flex h-7 min-w-7 items-center justify-center rounded-xl bg-white/70 px-2 text-xs font-black">
                          {items.length}
                        </span>
                      </div>
                    </div>

                    <div className="grid min-h-0 flex-1 content-start gap-3 overflow-auto pr-1">
                      {items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-4 text-center text-[11px] font-semibold text-[#94a3b8]">
                          Sin registros
                        </div>
                      ) : (
                        items.map((item) => (
                          <CrmIaOpportunityCard
                            key={item.conversation.id}
                            item={item}
                            selected={selectedOpportunityId === item.conversation.id}
                            onClick={() => setSelectedOpportunityId(item.conversation.id)}
                          />
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {selectedOpportunity ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[250] bg-black/20 backdrop-blur-[1px]"
            onClick={() => setSelectedOpportunityId(null)}
            tabIndex={-1}
          />

          <CrmIaOpportunityDrawer
            item={selectedOpportunity}
            activityLog={selectedActivityLog}
            analyzing={analyzingId === selectedOpportunity.conversation.id}
            onClose={() => setSelectedOpportunityId(null)}
            onOpenConversation={() => handleOpenInComunicaciones(selectedOpportunity.conversation.id)}
            onAnalyze={() => handleAnalyze(selectedOpportunity.conversation.id)}
          />
        </>
      ) : null}
    </div>
  );
}