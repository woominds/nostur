// src/components/comunicaciones/ComunicacionesRightPanel.tsx

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  
  Archive,
  Bot,
  CheckCircle2,
  Handshake,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus
} from "lucide-react";

import {
  getComunicacionEstadoComercialLabel,
  getComunicacionEstadoGestionLabel,
  useComunicacionesStore,
  type AiConversationAnalysis,
  type AiOperationalAlert,
  type ComunicacionConversation,
  type ConversationNote
} from "../../store/comunicacionesStore";

import { PriorityBadge } from "./ComunicacionesBadges";
import { formatDateTime } from "./comunicacionesPanel.helpers";
import { CommercialAssistantChat } from "./components/CommercialAssistantChat";

type ComunicacionesState = ReturnType<typeof useComunicacionesStore.getState>;

type ComunicacionesRightPanelTab = "gestion" | "nia" | "notas";

type NoteMode =
  | "NOTA_INTERNA"
  | "RECORDATORIO_INTERNO"
  | "MENSAJE_CLIENTE_PROGRAMADO";

type ComunicacionesRightPanelProps = {
  selectedConversation: ComunicacionConversation | null;
  notes: ConversationNote[];
  saving: boolean;
  aiAnalysis: AiConversationAnalysis | unknown | null;
  aiAnalyzing: boolean;
  onOpenAi: () => void;
  onSyncContacto: () => void;
  onTakeConversation: () => void;
  onTransfer: () => void;
  onCollaborators: () => void;
  onCloseOrReopen: () => void;
  onRestore: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onTags: () => void;
  onDeleteNote: (noteId: string) => Promise<void>;
  onAddNote?: (
    note: string,
    tipo?: string,
    scheduledAt?: string | null
  ) => Promise<void>;
  onUseAiSuggestedResponse?: (text: string) => void;
  onSaveAiSummaryAsNote?: (summary: string) => Promise<void>;
};

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

function getAiScore(aiAnalysis: unknown): number {
  const analysis = readRecord(aiAnalysis);

  const value =
    analysis.score ||
    analysis.lead_score ||
    analysis.score_cliente ||
    analysis.puntaje_lead ||
    0;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function getAiSummary(aiAnalysis: unknown): string {
  const analysis = readRecord(aiAnalysis);

  return readString(
    analysis.resumen || analysis.summary || analysis.sintesis,
    "NIA todavía no generó un resumen claro de esta conversación."
  );
}

function getAiNextActions(aiAnalysis: unknown): string[] {
  const analysis = readRecord(aiAnalysis);

  const actions = readStringArray(
    analysis.proximas_acciones || analysis.next_actions
  );

  const singleAction = readString(
    analysis.proxima_accion || analysis.next_action || analysis.accion_sugerida
  );

  if (actions.length > 0) return actions;
  if (singleAction) return [singleAction];

  return [];
}

function getAiSuggestedResponse(aiAnalysis: unknown): string {
  const analysis = readRecord(aiAnalysis);

  return readString(
    analysis.respuesta_sugerida ||
      analysis.suggested_response ||
      analysis.suggested_reply ||
      analysis.reply
  );
}

function formatNoteType(value?: string): string {
  const labels: Record<string, string> = {
    NOTA_INTERNA: "Nota interna",
    RECORDATORIO_INTERNO: "Recordatorio",
    MENSAJE_CLIENTE_PROGRAMADO: "Mensaje programado"
  };

  return labels[value || ""] || value || "Nota interna";
}

function formatGapHours(value: unknown): string {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed <= 0) return "—";

  return `${parsed.toFixed(1).replace(".", ",")} hs`;
}

function getMainContactValue(conversation: ComunicacionConversation): string {
  return (
    conversation.telefono ||
    conversation.email ||
    conversation.subject ||
    "Sin contacto visible"
  );
}

function getOperationalAlertSeverityClass(severity: string): string {
  const normalized = String(severity || "").toUpperCase();

  if (normalized === "CRITICA" || normalized === "CRÍTICA") {
    return "border-red-300 bg-red-100 text-red-800";
  }

  if (normalized === "URGENTE") return "border-red-200 bg-red-50 text-red-700";
  if (normalized === "ALTA") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "BAJA") return "border-slate-200 bg-slate-50 text-slate-600";

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function RightPanelTabButton({
  active,
  icon: Icon,
  label,
  count,
  onClick
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black transition",
        active
          ? "bg-[#4f7c90] text-white shadow-sm"
          : "bg-white text-[#334155] ring-1 ring-black/10 hover:bg-[#f8fafc]"
      ].join(" ")}
    >
      <Icon size={13} />

      <span className="truncate">{label}</span>

      {typeof count === "number" && count > 0 ? (
        <span
          className={[
            "ml-0.5 rounded-lg px-1.5 py-0.5 text-[9px]",
            active ? "bg-white/20 text-white" : "bg-[#f1f5f9] text-[#64748b]"
          ].join(" ")}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyRightPanel() {
  return (
    <aside className="min-h-0 overflow-auto border-l border-black/10 bg-white/70 p-3 backdrop-blur">
      <div className="rounded-[24px] border border-black/10 bg-white/80 p-4 text-center text-xs font-semibold text-[#64748b]">
        Sin conversación seleccionada.
      </div>
    </aside>
  );
}

function DetailRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-[#64748b]">{label}</span>

      <strong className="max-w-[220px] text-right text-[#111827]">
        {value || "—"}
      </strong>
    </div>
  );
}

function SmallActionButton({
  children,
  disabled,
  tone = "default",
  onClick
}: {
  children: React.ReactNode;
  disabled?: boolean;
  tone?: "default" | "primary" | "green" | "red";
  onClick: () => void;
}) {
  const className =
    tone === "primary"
      ? "bg-[#4f7c90] text-white hover:bg-[#416a7a]"
      : tone === "green"
        ? "bg-green-50 text-green-700 ring-1 ring-green-200 hover:bg-green-100"
        : tone === "red"
          ? "bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
          : "bg-[#f8fafc] text-[#334155] ring-1 ring-black/10 hover:bg-white";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-black shadow-sm disabled:opacity-50",
        className
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function AlertMiniCard({
  alert,
  onResolve
}: {
  alert: AiOperationalAlert;
  onResolve: (alert: AiOperationalAlert) => void;
}) {
  return (
    <div className="rounded-[22px] border border-red-200 bg-red-50 p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={[
                "rounded-xl border px-2 py-1 text-[10px] font-black uppercase",
                getOperationalAlertSeverityClass(alert.severity)
              ].join(" ")}
            >
              {alert.severity || "ALERTA"}
            </span>

            <span className="rounded-xl border border-red-200 bg-white px-2 py-1 text-[10px] font-black uppercase text-red-700">
              {alert.alert_type}
            </span>
          </div>

          <div className="mt-2 text-xs font-black text-red-950">
            {alert.alert_title || "Alerta operativa"}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-black uppercase text-red-600">
            Demora
          </div>

          <div className="text-sm font-black text-red-800">
            {formatGapHours(alert.gap_hours)}
          </div>
        </div>
      </div>

      {alert.alert_detail ? (
        <div className="mb-2 line-clamp-3 text-[11px] font-semibold leading-5 text-red-800">
          {alert.alert_detail}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onResolve(alert)}
        className="h-8 w-full rounded-xl bg-white text-[10px] font-black text-red-700 ring-1 ring-red-200 hover:bg-red-100"
      >
        Marcar resuelta
      </button>
    </div>
  );
}

export function ComunicacionesRightPanel({
  selectedConversation,
  notes,
  saving,
  aiAnalysis,
  aiAnalyzing,
  onOpenAi,
  onSyncContacto,
  onTakeConversation,
  onTransfer,
  onCollaborators,
  onCloseOrReopen,
  onRestore,
  onArchive,
  onTrash,
  onTags,
  onDeleteNote,
  onAddNote,
  onUseAiSuggestedResponse,
  onSaveAiSummaryAsNote
}: ComunicacionesRightPanelProps) {
  const [activeTab, setActiveTab] = useState<ComunicacionesRightPanelTab>("gestion");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteMode, setNoteMode] = useState<NoteMode>("NOTA_INTERNA");
  const [scheduledAt, setScheduledAt] = useState("");

  const operationalAlerts = useComunicacionesStore(
    (state: ComunicacionesState) => state.operationalAlerts
  );
  const loadingOperationalAlerts = useComunicacionesStore(
    (state: ComunicacionesState) => state.loadingOperationalAlerts
  );
  const updateOperationalAlertStatus = useComunicacionesStore(
    (state: ComunicacionesState) => state.updateOperationalAlertStatus
  );

  const selectedConversationAlerts = useMemo(() => {
    if (!selectedConversation) return [];

    return operationalAlerts.filter(
      (alert) =>
        alert.conversation_id === selectedConversation.id &&
        ["ABIERTA", "ENVIADA", "VISTA", "ACK"].includes(
          String(alert.status || "").toUpperCase()
        )
    );
  }, [operationalAlerts, selectedConversation]);

  if (!selectedConversation) {
    return <EmptyRightPanel />;
  }

  const isClosed = selectedConversation.status === "CERRADA";
  const hasContacto = Boolean(selectedConversation.contacto_id);
  const canTake = Boolean(selectedConversation.can_take);
  const canWrite = Boolean(selectedConversation.can_write);
  const canManageAssignment = Boolean(selectedConversation.can_manage_assignment);
  const archivedOrDeleted = Boolean(selectedConversation.archived || selectedConversation.deleted);

  const aiSuggestedResponse = aiAnalysis ? getAiSuggestedResponse(aiAnalysis) : "";
  const aiNextActions = aiAnalysis ? getAiNextActions(aiAnalysis) : [];
  const aiSummary = aiAnalysis ? getAiSummary(aiAnalysis) : "";
  const aiScore = aiAnalysis ? getAiScore(aiAnalysis) : 0;

  const latestAlert = selectedConversationAlerts[0] || null;

  const tabs = [
    {
      value: "gestion" as const,
      label: "Gestión",
      icon: UserCheck
    },
    {
      value: "nia" as const,
      label: "NIA",
      icon: Bot,
      count: aiAnalysis ? 1 : 0
    },
    {
      value: "notas" as const,
      label: "Notas",
      icon: MessageSquareText,
      count: notes.length
    }
  ];

  async function handleAddNoteFromPanel() {
    if (!onAddNote) return;

    const cleanNote = noteDraft.trim();

    if (!cleanNote) return;

    await onAddNote(cleanNote, noteMode, scheduledAt || null);

    setNoteDraft("");
    setScheduledAt("");
  }

  async function handleResolveAlert(alert: AiOperationalAlert) {
    await updateOperationalAlertStatus(
      alert.id,
      "RESUELTA",
      "Resuelta desde panel de comunicaciones."
    );
  }

  return (
    <aside className="min-h-0 overflow-auto border-l border-black/10 bg-white/70 p-3 backdrop-blur">
      <div className="grid gap-3">
        <div className="rounded-[24px] border border-black/10 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-black text-[#111827]">
                Panel de trabajo
              </div>

              <div className="mt-0.5 truncate text-[11px] font-semibold text-[#64748b]">
                {getMainContactValue(selectedConversation)}
              </div>
            </div>

            <PriorityBadge value={selectedConversation.prioridad} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <RightPanelTabButton
                key={tab.value}
                active={activeTab === tab.value}
                icon={tab.icon}
                label={tab.label}
                count={tab.count}
                onClick={() => setActiveTab(tab.value)}
              />
            ))}
          </div>
        </div>

        {latestAlert ? (
          <AlertMiniCard alert={latestAlert} onResolve={handleResolveAlert} />
        ) : null}

        {activeTab === "gestion" ? (
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-[#111827]">
                    Estado actual
                  </h3>

                  <p className="text-[11px] font-semibold text-[#64748b]">
                    Información mínima para trabajar sin perderse.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <DetailRow
                  label="Gestión"
                  value={getComunicacionEstadoGestionLabel(selectedConversation.estado_gestion)}
                />

                <DetailRow
                  label="Comercial"
                  value={getComunicacionEstadoComercialLabel(selectedConversation.estado_comercial)}
                />

                <DetailRow
                  label="Responsable"
                  value={selectedConversation.assigned_full_name || "Sin asignar"}
                />

                <DetailRow
                  label="Sucursal"
                  value={selectedConversation.sucursal_nombre || "—"}
                />

                <DetailRow
                  label="Último mensaje"
                  value={formatDateTime(selectedConversation.last_message_time)}
                />

                <DetailRow
                  label="Contacto"
                  value={hasContacto ? "Vinculado" : "Sin vincular"}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h3 className="text-sm font-black text-[#111827]">
                  Acciones principales
                </h3>

                <p className="text-[11px] font-semibold text-[#64748b]">
                  Solo las acciones más importantes para esta conversación.
                </p>
              </div>

              <div className="grid gap-2">
                {!hasContacto ? (
                  <SmallActionButton
                    tone="green"
                    disabled={saving}
                    onClick={onSyncContacto}
                  >
                    <UserPlus size={14} />
                    Crear / vincular contacto
                  </SmallActionButton>
                ) : null}

                {canTake ? (
                  <SmallActionButton
                    tone="primary"
                    disabled={saving}
                    onClick={onTakeConversation}
                  >
                    <UserCheck size={14} />
                    Tomar conversación
                  </SmallActionButton>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <SmallActionButton
                    disabled={saving || !canManageAssignment}
                    onClick={onTransfer}
                  >
                    <Handshake size={13} />
                    Transferir
                  </SmallActionButton>

                  <SmallActionButton
                    disabled={saving || !canManageAssignment}
                    onClick={onCollaborators}
                  >
                    <UserPlus size={13} />
                    Colaborar
                  </SmallActionButton>

                  <SmallActionButton
                    tone="green"
                    disabled={saving || !canWrite}
                    onClick={onCloseOrReopen}
                  >
                    <CheckCircle2 size={13} />
                    {isClosed ? "Reabrir" : "Cerrar"}
                  </SmallActionButton>

                  {archivedOrDeleted ? (
                    <SmallActionButton disabled={saving} onClick={onRestore}>
                      <RotateCcw size={13} />
                      Restaurar
                    </SmallActionButton>
                  ) : (
                    <SmallActionButton
                      disabled={saving || !canWrite}
                      onClick={onArchive}
                    >
                      <Archive size={13} />
                      Archivar
                    </SmallActionButton>
                  )}
                </div>

                <SmallActionButton
                  tone="red"
                  disabled={saving || !canWrite}
                  onClick={onTrash}
                >
                  <Trash2 size={13} />
                  Eliminar conversación
                </SmallActionButton>
              </div>
            </div>

            <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h3 className="text-sm font-black text-[#111827]">
                  Datos del pasajero
                </h3>

                <p className="text-[11px] font-semibold text-[#64748b]">
                  Datos visibles de la conversación.
                </p>
              </div>

              <div className="grid gap-2">
                <DetailRow
                  label="Nombre"
                  value={selectedConversation.contacto_nombre || selectedConversation.titulo || "—"}
                />

                <DetailRow
                  label="Teléfono"
                  value={selectedConversation.telefono || "—"}
                />

                <DetailRow
                  label="Email"
                  value={selectedConversation.email || "—"}
                />

                <DetailRow
                  label="Asunto"
                  value={selectedConversation.subject || "—"}
                />
              </div>

              <button
                type="button"
                onClick={onTags}
                className="mt-3 h-9 w-full rounded-xl bg-[#f8fafc] text-[11px] font-black text-[#334155] ring-1 ring-black/10 hover:bg-white"
              >
                Ver / editar etiquetas
              </button>

              {(selectedConversation.tags || []).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(selectedConversation.tags || []).slice(0, 6).map((tagItem) => (
                    <span
                      key={tagItem.id}
                      className="rounded-xl border border-black/10 bg-[#f8fafc] px-2 py-1 text-[10px] font-black text-[#334155]"
                    >
                      {tagItem.nombre}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === "nia" ? (
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-violet-900">
                    NIA para esta oportunidad
                  </h3>

                  <p className="text-[11px] font-semibold leading-5 text-violet-700/80">
                    Resumen, próxima acción y asistencia al vendedor.
                  </p>
                </div>

                {aiAnalysis ? (
                  <span className="shrink-0 rounded-xl bg-white/80 px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm">
                    {aiScore}/100
                  </span>
                ) : null}
              </div>

              {aiAnalysis ? (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-violet-200 bg-white/75 p-3">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-violet-600">
                      Resumen comercial
                    </div>

                    <div className="whitespace-pre-wrap text-xs font-semibold leading-5 text-violet-950">
                      {aiSummary}
                    </div>
                  </div>

                  {aiNextActions.length > 0 ? (
                    <div className="rounded-2xl border border-violet-200 bg-white/75 p-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-violet-600">
                        Próxima acción
                      </div>

                      <div className="grid gap-1 text-xs font-semibold leading-5 text-violet-950">
                        {aiNextActions.map((item, index) => (
                          <div key={`${item}-${index}`}>• {item}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {aiSuggestedResponse ? (
                    <div className="rounded-2xl border border-violet-200 bg-white/75 p-3">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-violet-600">
                        Respuesta sugerida
                      </div>

                      <div className="whitespace-pre-wrap text-xs font-semibold leading-5 text-violet-950">
                        {aiSuggestedResponse}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    {aiSuggestedResponse ? (
                      <button
                        type="button"
                        onClick={() => onUseAiSuggestedResponse?.(aiSuggestedResponse)}
                        className="h-9 w-full rounded-xl bg-white text-[11px] font-black text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50"
                      >
                        Usar respuesta sugerida
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onSaveAiSummaryAsNote?.(aiSummary)}
                      disabled={!onSaveAiSummaryAsNote}
                      className="h-9 w-full rounded-xl bg-white text-[11px] font-black text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
                    >
                      Guardar resumen como nota
                    </button>

                    <button
                      type="button"
                      onClick={onOpenAi}
                      disabled={aiAnalyzing}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-[11px] font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Sparkles size={14} />
                      Ver análisis completo
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-violet-200 bg-white/65 p-3 text-xs font-semibold text-violet-800">
                    Todavía no hay análisis IA para esta conversación.
                  </div>

                  <button
                    type="button"
                    onClick={onOpenAi}
                    disabled={aiAnalyzing}
                    className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-[11px] font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                  >
                    <Sparkles size={14} />
                    {aiAnalyzing ? "Analizando..." : "Analizar conversación"}
                  </button>
                </div>
              )}
            </div>

            <CommercialAssistantChat
              conversation={selectedConversation}
              aiAnalysis={aiAnalysis}
              compact
              onUseTextAsReply={onUseAiSuggestedResponse}
            />
          </div>
        ) : null}

        {activeTab === "notas" ? (
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h3 className="text-sm font-black text-[#111827]">
                  Notas y recordatorios
                </h3>

                <p className="text-[11px] font-semibold text-[#64748b]">
                  Seguimiento interno de la conversación.
                </p>
              </div>

              <div className="mb-3 grid gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteMode("NOTA_INTERNA")}
                    className={[
                      "h-8 rounded-xl text-[10px] font-black ring-1 ring-black/10",
                      noteMode === "NOTA_INTERNA"
                        ? "bg-[#4f7c90] text-white"
                        : "bg-white text-[#334155]"
                    ].join(" ")}
                  >
                    Nota
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoteMode("RECORDATORIO_INTERNO")}
                    className={[
                      "h-8 rounded-xl text-[10px] font-black ring-1 ring-black/10",
                      noteMode === "RECORDATORIO_INTERNO"
                        ? "bg-[#4f7c90] text-white"
                        : "bg-white text-[#334155]"
                    ].join(" ")}
                  >
                    Recordatorio
                  </button>

                  <button
                    type="button"
                    onClick={() => setNoteMode("MENSAJE_CLIENTE_PROGRAMADO")}
                    className={[
                      "col-span-2 h-8 rounded-xl text-[10px] font-black ring-1 ring-black/10",
                      noteMode === "MENSAJE_CLIENTE_PROGRAMADO"
                        ? "bg-[#4f7c90] text-white"
                        : "bg-white text-[#334155]"
                    ].join(" ")}
                  >
                    Mensaje programado al pasajero
                  </button>
                </div>

                {noteMode !== "NOTA_INTERNA" ? (
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-[11px] font-semibold text-[#111827] outline-none focus:border-[#4f7c90]"
                  />
                ) : null}

                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder={
                    noteMode === "MENSAJE_CLIENTE_PROGRAMADO"
                      ? "Mensaje que se enviará/programará para el pasajero..."
                      : noteMode === "RECORDATORIO_INTERNO"
                        ? "Recordatorio interno para el vendedor..."
                        : "Agregar nota interna..."
                  }
                  className="min-h-20 resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none focus:border-[#4f7c90]"
                />

                <button
                  type="button"
                  disabled={saving || !noteDraft.trim() || !onAddNote}
                  onClick={handleAddNoteFromPanel}
                  className="h-9 rounded-xl bg-[#4f7c90] text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Agregar"}
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#64748b]">
                  Sin notas.
                </div>
              ) : (
                <div className="grid gap-2">
                  {notes.slice(0, 14).map((note) => (
                    <div key={note.id} className="rounded-2xl bg-[#f8fafc] p-2">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0 text-[10px] font-black uppercase text-[#64748b]">
                          <span className="block truncate">
                            {note.created_by_full_name || "Usuario"} · {formatDateTime(note.created_at)}
                          </span>

                          <div className="mt-1 flex flex-wrap gap-1">
                            <span className="inline-flex rounded-lg border border-black/10 bg-white px-2 py-0.5">
                              {formatNoteType(note.tipo)}
                            </span>

                            {note.status ? (
                              <span className="inline-flex rounded-lg border border-black/10 bg-white px-2 py-0.5">
                                {note.status}
                              </span>
                            ) : null}

                            {note.scheduled_at ? (
                              <span className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">
                                {formatDateTime(note.scheduled_at)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onDeleteNote(note.id)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                          title="Eliminar nota"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="mt-1 line-clamp-6 text-[11px] font-semibold leading-5 text-[#334155]">
                        {note.note}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {loadingOperationalAlerts ? (
          <div className="rounded-2xl border border-black/10 bg-white/70 p-3 text-center text-[11px] font-semibold text-[#64748b]">
            Actualizando alertas...
          </div>
        ) : null}
      </div>
    </aside>
  );
}