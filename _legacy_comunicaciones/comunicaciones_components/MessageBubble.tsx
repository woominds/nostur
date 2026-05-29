import { useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  File,
  MoreVertical,
  PencilLine,
  Repeat2,
  Share2,
  Smile,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import type { ComunicacionMessage } from "../../store/comunicacionesStore";
import { formatDateTime, formatFileSize } from "./comunicacionesPanel.helpers";

const REACTION_OPTIONS: string[] = ["👍", "❤️", "😂", "😮", "😢", "🙏", "✅", "🔥"];

type AiFeedbackType = "POSITIVO" | "NEGATIVO" | "NEUTRO";
type NiaAlertStatus = "ABIERTA" | "ENVIADA" | "VISTA" | "ACK" | "RESUELTA" | "DESCARTADA" | string;

type NiaAction = {
  action_type: string;
  title?: string | null;
  detail?: string | null;
  conversation_id?: string | null;
  alert_id?: string | null;
  status?: string | null;
  message?: string | null;
  available_until?: string | null;
  customer_ai_mode?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

type NiaUnassignedConversationItem = {
  conversation_id?: string | null;
  contacto_id?: string | null;
  cliente_id?: string | null;
  carrito_id?: string | null;
  contacto_nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  estado_gestion?: string | null;
  estado_comercial?: string | null;
  prioridad?: string | null;
  gap_hours?: number | string | null;
  ai_score_actual?: number | string | null;
  ai_temperatura_actual?: string | null;
  ai_resumen_general?: string | null;
  ai_ultima_accion_sugerida?: string | null;
  recommended_action?: string | null;
  last_inbound_message_at?: string | null;
  last_outbound_message_at?: string | null;
};

type NiaSummaryType =
  | "UNASSIGNED_CONVERSATION_SUMMARY"
  | "SELLER_ACTION_SUMMARY"
  | "DAILY_COMMERCIAL_REPORT"
  | string;

function readMessageMetadata(message: ComunicacionMessage): Record<string, unknown> {
  if (!message.metadata || typeof message.metadata !== "object" || Array.isArray(message.metadata)) {
    return {};
  }

  return message.metadata as Record<string, unknown>;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanMessageText(value: unknown): string {
  return String(value || "").trim();
}

function getMetadataString(metadata: Record<string, unknown>, key: string): string {
  return cleanMessageText(metadata[key]);
}

function getMetadataNumber(metadata: Record<string, unknown>, key: string): number | null {
  const value = metadata[key];

  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getNowIso(): string {
  return new Date().toISOString();
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

function formatNiaHours(value: unknown): string {
  const parsed = Number(value || 0);

  if (!Number.isFinite(parsed) || parsed <= 0) return "0,00 hs";

  return `${parsed.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} hs`;
}

function getNiaSeverityClass(value: unknown): string {
  const severity = cleanMessageText(value).toUpperCase();

  if (severity === "CRITICA" || severity === "CRÍTICA") {
    return "border-red-300 bg-red-100 text-red-900";
  }

  if (severity === "URGENTE") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (severity === "ALTA") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (severity === "BAJA") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-800";
}

function isNiaSystemMessage(message: ComunicacionMessage): boolean {
  const metadata = readMessageMetadata(message);

  return (
    metadata.system_ai === true ||
    metadata.system_ai === "true" ||
    cleanMessageText(metadata.ai_persona_code) === "commercial_assistant" ||
    cleanMessageText(metadata.source).toLowerCase().includes("nia")
  );
}

function isNiaOperationalAlertMessage(message: ComunicacionMessage): boolean {
  const metadata = readMessageMetadata(message);

  return Boolean(
    isNiaSystemMessage(message) &&
      cleanMessageText(metadata.alert_id) &&
      cleanMessageText(metadata.conversation_id)
  );
}

function isCandeMessage(message: ComunicacionMessage): boolean {
  const metadata = readMessageMetadata(message);
  const source = cleanMessageText(metadata.source).toLowerCase();
  const aiPersonaCode = cleanMessageText(metadata.ai_persona_code).toLowerCase();
  const aiPersonaName = cleanMessageText(metadata.ai_persona_name).toLowerCase();
  const senderName = cleanMessageText(message.sender_name).toLowerCase();

  return (
    message.direction === "outbound" &&
    message.sender_type === "agent" &&
    (
      source === "customer-assistant-reply" ||
      source.includes("customer-assistant-reply") ||
      aiPersonaCode === "customer_assistant" ||
      aiPersonaName === "cande" ||
      senderName.includes("cande")
    )
  );
}

function getNiaDisplayName(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);

  return (
    cleanMessageText(metadata.ai_persona_display_name) ||
    cleanMessageText(metadata.ai_persona_name) ||
    cleanMessageText(message.sender_name) ||
    "NIA"
  );
}

function getNiaAvatarUrl(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);
  return cleanMessageText(metadata.ai_persona_avatar_url || metadata.avatar_url);
}

function getNiaColor(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);
  return cleanMessageText(metadata.ai_persona_color || metadata.color) || "#7c3aed";
}

function getNiaInitials(name: string): string {
  const clean = cleanMessageText(name);

  if (!clean) return "N";

  const parts = clean.split(" ").filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function getNiaMessageTitle(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);

  const title =
    cleanMessageText(metadata.ai_message_title) ||
    cleanMessageText(metadata.alert_title) ||
    cleanMessageText(metadata.title);

  if (title) return title;

  const content = cleanMessageText(message.content);

  if (content.includes("GAP 48h")) return "Alerta comercial";
  if (content.includes("GAP 24h")) return "Recordatorio comercial";
  if (content.includes("Reporte comercial")) return "Reporte comercial diario";

  return getNiaDisplayName(message);
}

function getNiaMessageTone(message: ComunicacionMessage): "alert" | "report" | "normal" {
  const content = cleanMessageText(message.content).toLowerCase();
  const metadata = readMessageMetadata(message);
  const priority = cleanMessageText(metadata.ai_message_priority || metadata.severity).toLowerCase();

  if (
    content.includes("gap 48h") ||
    content.includes("urgente") ||
    priority.includes("urgente") ||
    priority.includes("critica") ||
    priority.includes("crítica")
  ) {
    return "alert";
  }

  if (content.includes("reporte comercial") || content.includes("resumen general")) {
    return "report";
  }

  return "normal";
}

function getNiaSummaryType(message: ComunicacionMessage): NiaSummaryType {
  const metadata = readMessageMetadata(message);
  return cleanMessageText(metadata.summary_type);
}

function isNiaUnassignedConversationSummaryMessage(message: ComunicacionMessage): boolean {
  const metadata = readMessageMetadata(message);
  const summaryType = getNiaSummaryType(message);

  return (
    isNiaSystemMessage(message) &&
    summaryType === "UNASSIGNED_CONVERSATION_SUMMARY" &&
    Array.isArray(metadata.items) &&
    metadata.items.length > 0
  );
}

function getNiaUnassignedItems(message: ComunicacionMessage): NiaUnassignedConversationItem[] {
  const metadata = readMessageMetadata(message);

  if (!Array.isArray(metadata.items)) return [];

  return metadata.items
    .map((item) => readRecord(item))
    .map((item) => ({
      conversation_id: cleanMessageText(item.conversation_id) || null,
      contacto_id: cleanMessageText(item.contacto_id) || null,
      cliente_id: cleanMessageText(item.cliente_id) || null,
      carrito_id: cleanMessageText(item.carrito_id) || null,
      contacto_nombre: cleanMessageText(item.contacto_nombre) || null,
      telefono: cleanMessageText(item.telefono) || null,
      email: cleanMessageText(item.email) || null,
      estado_gestion: cleanMessageText(item.estado_gestion) || null,
      estado_comercial: cleanMessageText(item.estado_comercial) || null,
      prioridad: cleanMessageText(item.prioridad) || null,
      gap_hours: item.gap_hours as number | string | null,
      ai_score_actual: item.ai_score_actual as number | string | null,
      ai_temperatura_actual: cleanMessageText(item.ai_temperatura_actual) || null,
      ai_resumen_general: cleanMessageText(item.ai_resumen_general) || null,
      ai_ultima_accion_sugerida: cleanMessageText(item.ai_ultima_accion_sugerida) || null,
      recommended_action: cleanMessageText(item.recommended_action) || null,
      last_inbound_message_at: cleanMessageText(item.last_inbound_message_at) || null,
      last_outbound_message_at: cleanMessageText(item.last_outbound_message_at) || null
    }))
    .filter((item) => Boolean(item.conversation_id));
}

function getNiaRecommendedActionLabel(value: unknown): string {
  const action = cleanMessageText(value).toUpperCase();

  if (action === "TOMAR_O_ASIGNAR_URGENTE") return "Tomar o asignar urgente";
  if (action === "ASIGNAR_PREVENTIVO") return "Asignar preventivo";
  if (action === "ASIGNAR_SEGUIMIENTO") return "Asignar seguimiento";

  return action || "Revisar";
}

function getNiaRecommendedActionClass(value: unknown): string {
  const action = cleanMessageText(value).toUpperCase();

  if (action === "TOMAR_O_ASIGNAR_URGENTE") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (action === "ASIGNAR_PREVENTIVO") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (action === "ASIGNAR_SEGUIMIENTO") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getNiaTemperatureClass(value: unknown): string {
  const temperature = cleanMessageText(value).toUpperCase();

  if (temperature === "MUY_CALIENTE" || temperature === "CALIENTE") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (temperature === "TIBIO") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (temperature === "FRIO" || temperature === "FRÍO") {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }

  return "border-slate-200 bg-white text-slate-600";
}

function formatNiaScore(value: unknown): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return "Sin score";

  return `${parsed.toLocaleString("es-AR", {
    maximumFractionDigits: 0
  })}/100`;
}

function getNiaPassengerName(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);

  return (
    getMetadataString(metadata, "contacto_nombre") ||
    getMetadataString(metadata, "telefono") ||
    "Pasajero sin nombre"
  );
}

function getNiaSellerName(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);
  const fullName = `${getMetadataString(metadata, "vendedor_nombre")} ${getMetadataString(
    metadata,
    "vendedor_apellido"
  )}`.trim();

  return fullName || getMetadataString(metadata, "vendedor_email") || "Sin vendedor asignado";
}

function getNiaAlertDetail(message: ComunicacionMessage): string {
  const metadata = readMessageMetadata(message);

  return (
    getMetadataString(metadata, "alert_detail") ||
    cleanMessageText(message.content)
      .split("\n")
      .filter((line) => !line.includes("Prioridad:") && !line.includes("Demora estimada:") && !line.includes("Tipo:"))
      .join("\n")
      .trim() ||
    "NIA detectó una alerta operativa."
  );
}

function getNiaActionFromMessage(message: ComunicacionMessage): NiaAction | null {
  const metadata = readMessageMetadata(message);
  const responseMetadata = readRecord(metadata.response_metadata);
  const rawResponse = readRecord(responseMetadata.raw_response);
  const nestedMetadata = readRecord(rawResponse.metadata);

  const candidates = [
    metadata.nia_action,
    metadata.action,
    responseMetadata.nia_action,
    responseMetadata.action,
    nestedMetadata.nia_action,
    nestedMetadata.action
  ];

  for (const candidate of candidates) {
    const record = readRecord(candidate);
    const actionType = cleanMessageText(record.action_type);

    if (!actionType) continue;

    return {
      action_type: actionType,
      title: cleanMessageText(record.title) || null,
      detail: cleanMessageText(record.detail) || null,
      conversation_id: cleanMessageText(record.conversation_id) || null,
      alert_id: cleanMessageText(record.alert_id) || null,
      status: cleanMessageText(record.status) || null,
      message: cleanMessageText(record.message) || null,
      available_until: cleanMessageText(record.available_until) || null,
      customer_ai_mode: cleanMessageText(record.customer_ai_mode) || null,
      note: cleanMessageText(record.note) || null,
      metadata: readRecord(record.metadata)
    };
  }

  return null;
}

function getNiaActionTitle(action: NiaAction): string {
  if (action.title) return action.title;

  const labels: Record<string, string> = {
    SET_MY_AVAILABILITY: "Actualizar disponibilidad",
    ACTIVATE_CANDE_FOR_CONVERSATION: "Activar CANDE en esta conversación",
    PAUSE_CANDE_FOR_CONVERSATION: "Pausar CANDE en esta conversación",
    REQUEST_CANDE_HANDOFF: "Derivar conversación a vendedores",
    TAKE_CONVERSATION: "Tomar conversación",
    RESOLVE_OPERATIONAL_ALERT: "Resolver alerta operativa",
    ACK_OPERATIONAL_ALERT: "Marcar alerta como tomada",
    ADD_INTERNAL_NOTE: "Agregar nota interna"
  };

  return labels[action.action_type] || "Acción sugerida por NIA";
}

function getNiaActionDetail(action: NiaAction): string {
  if (action.detail) return action.detail;
  if (action.note) return action.note;
  if (action.message) return action.message;

  const labels: Record<string, string> = {
    SET_MY_AVAILABILITY: "NIA propone actualizar tu disponibilidad para que CANDE pueda cubrir o derivar mejor las conversaciones.",
    ACTIVATE_CANDE_FOR_CONVERSATION: "NIA propone dejar a CANDE respondiendo o acompañando esta conversación.",
    PAUSE_CANDE_FOR_CONVERSATION: "NIA propone pausar las respuestas automáticas de CANDE para evitar intervenciones duplicadas.",
    REQUEST_CANDE_HANDOFF: "NIA propone mover esta conversación a la bandeja de vendedores para atención humana.",
    TAKE_CONVERSATION: "NIA propone tomar esta conversación y asignarla a tu usuario.",
    RESOLVE_OPERATIONAL_ALERT: "NIA propone marcar esta alerta como resuelta.",
    ACK_OPERATIONAL_ALERT: "NIA propone marcar esta alerta como tomada/reconocida.",
    ADD_INTERNAL_NOTE: "NIA propone guardar una nota interna en esta conversación."
  };

  return labels[action.action_type] || "Revisá la acción antes de confirmarla.";
}

function openConversationFromNiaAlert(conversationId: string) {
  window.localStorage.setItem(
    "nostur_comunicaciones_open_conversation",
    JSON.stringify({
      conversationId,
      source: "nia-alert-message-card",
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

  window.dispatchEvent(
    new CustomEvent("nossix:open-conversation", {
      detail: {
        conversationId,
        source: "nia-alert-message-card"
      }
    })
  );
}

function dispatchComunicacionesRefresh(conversationId?: string | null) {
  window.dispatchEvent(
    new CustomEvent("nossix:refresh-comunicaciones", {
      detail: {
        conversationId: conversationId || null,
        source: "nia-action-card",
        createdAt: getNowIso()
      }
    })
  );

  if (conversationId) {
    window.dispatchEvent(
      new CustomEvent("nossix:open-conversation", {
        detail: {
          conversationId,
          source: "nia-action-card"
        }
      })
    );
  }
}

function NiaAvatar({ message }: { message: ComunicacionMessage }) {
  const displayName = getNiaDisplayName(message);
  const avatarUrl = getNiaAvatarUrl(message);
  const color = getNiaColor(message);

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-[15px] font-normal text-white"
      style={{ backgroundColor: color }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        <span>{getNiaInitials(displayName)}</span>
      )}
    </div>
  );
}

function NiaActionCard({
  message,
  action
}: {
  message: ComunicacionMessage;
  action: NiaAction;
}) {
  const [status, setStatus] = useState<"PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "ERROR">("PENDIENTE");
  const [executing, setExecuting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const title = getNiaActionTitle(action);
  const detail = getNiaActionDetail(action);
  const disabled = executing || status === "CONFIRMADA" || status === "CANCELADA";

  async function insertSystemMessage(conversationId: string, content: string, extraMetadata: Record<string, unknown> = {}) {
    const currentUserId = await getCurrentUserId();

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      channel: "interno",
      direction: "system",
      sender_type: "system",
      sender_id: null,
      sender_name: getNiaDisplayName(message),
      content,
      message_type: "system",
      status: "sent",
      is_internal: true,
      metadata: {
        system_ai: true,
        ai_persona_code: "commercial_assistant",
        ai_persona_display_name: getNiaDisplayName(message),
        source: "nia_action_card",
        parent_message_id: message.id,
        nia_action: action,
        ...extraMetadata
      },
      created_by: currentUserId
    });
  }

  async function executeAction() {
    setExecuting(true);
    setLocalError(null);

    const currentUserId = await getCurrentUserId();
    const now = getNowIso();

    try {
      if (!currentUserId) {
        throw new Error("No hay usuario autenticado.");
      }

      if (action.action_type === "SET_MY_AVAILABILITY") {
        const availabilityStatus = cleanMessageText(action.status) || "AUSENTE";
        const availableForAiHandoff = availabilityStatus === "DISPONIBLE";

        const { error } = await supabase.from("seller_availability").upsert(
          {
            profile_id: currentUserId,
            status: availabilityStatus,
            message: action.message || action.note || null,
            available_for_ai_handoff: availableForAiHandoff,
            available_until: action.available_until || null,
            updated_at: now,
            updated_by: currentUserId
          },
          { onConflict: "profile_id" }
        );

        if (error) throw new Error(error.message);

        if (message.conversation_id) {
          await insertSystemMessage(
            message.conversation_id,
            `NIA actualizó la disponibilidad del vendedor a ${availabilityStatus}.`,
            {
              availability_status: availabilityStatus,
              available_until: action.available_until || null
            }
          );
        }
      }

      if (action.action_type === "ACTIVATE_CANDE_FOR_CONVERSATION") {
        const conversationId = action.conversation_id || message.conversation_id;
        const mode = action.customer_ai_mode === "SUGERIDA" ? "SUGERIDA" : "AUTOMATICA";

        if (!conversationId) throw new Error("La acción no tiene conversation_id.");

        const { error } = await supabase
          .from("conversations")
          .update({
            customer_ai_enabled: true,
            customer_ai_mode: mode,
            customer_ai_status: mode === "AUTOMATICA" ? "RESPONDIENDO" : "OBSERVANDO",
            customer_ai_paused_until: null,
            updated_at: now,
            updated_by: currentUserId
          })
          .eq("id", conversationId);

        if (error) throw new Error(error.message);

        await insertSystemMessage(
          conversationId,
          `NIA activó CANDE en modo ${mode}.`,
          {
            customer_ai_mode: mode
          }
        );

        dispatchComunicacionesRefresh(conversationId);
      }

      if (action.action_type === "PAUSE_CANDE_FOR_CONVERSATION") {
        const conversationId = action.conversation_id || message.conversation_id;

        if (!conversationId) throw new Error("La acción no tiene conversation_id.");

        const { error } = await supabase
          .from("conversations")
          .update({
            customer_ai_status: "PAUSADA",
            customer_ai_paused_until: null,
            updated_at: now,
            updated_by: currentUserId
          })
          .eq("id", conversationId);

        if (error) throw new Error(error.message);

        await insertSystemMessage(
          conversationId,
          "NIA pausó CANDE para evitar respuestas automáticas en esta conversación.",
          {
            customer_ai_status: "PAUSADA"
          }
        );

        dispatchComunicacionesRefresh(conversationId);
      }

      if (action.action_type === "REQUEST_CANDE_HANDOFF") {
        const conversationId = action.conversation_id || message.conversation_id;
        const reason = action.note || action.message || "NIA solicitó derivar esta conversación a vendedores.";

        if (!conversationId) throw new Error("La acción no tiene conversation_id.");

        const { error } = await supabase
          .from("conversations")
          .update({
            assigned_to: null,
            estado_gestion: "DERIVADO_NUEVO",
            customer_ai_status: "DERIVADA",
            customer_ai_handoff_status: "DERIVADA_A_BANDEJA",
            customer_ai_handoff_reason: reason,
            customer_ai_handoff_at: now,
            updated_at: now,
            updated_by: currentUserId
          })
          .eq("id", conversationId);

        if (error) throw new Error(error.message);

        await insertSystemMessage(
          conversationId,
          `NIA derivó esta conversación a vendedores.\n\nMotivo: ${reason}`,
          {
            customer_ai_handoff_status: "DERIVADA_A_BANDEJA"
          }
        );

        dispatchComunicacionesRefresh(conversationId);
      }

      if (action.action_type === "TAKE_CONVERSATION") {
        const conversationId = action.conversation_id || message.conversation_id;

        if (!conversationId) throw new Error("La acción no tiene conversation_id.");

        const { error } = await supabase.rpc("take_conversation", {
          p_conversation_id: conversationId
        });

        if (error) throw new Error(error.message);

        await insertSystemMessage(
          conversationId,
          "NIA ejecutó la acción: conversación tomada.",
          {
            action_status: "TAKEN"
          }
        );

        dispatchComunicacionesRefresh(conversationId);
      }

      if (action.action_type === "RESOLVE_OPERATIONAL_ALERT") {
        const alertId = action.alert_id;

        if (!alertId) throw new Error("La acción no tiene alert_id.");

        const { error } = await supabase.rpc("update_ai_operational_alert_status", {
          p_alert_id: alertId,
          p_status: "RESUELTA",
          p_resolution_note: action.note || "Resuelta desde acción confirmada de NIA."
        });

        if (error) throw new Error(error.message);

        if (message.conversation_id) {
          await insertSystemMessage(
            message.conversation_id,
            "NIA marcó la alerta operativa como resuelta.",
            {
              alert_id: alertId,
              alert_status: "RESUELTA"
            }
          );
        }

        dispatchComunicacionesRefresh(action.conversation_id || message.conversation_id);
      }

      if (action.action_type === "ACK_OPERATIONAL_ALERT") {
        const alertId = action.alert_id;

        if (!alertId) throw new Error("La acción no tiene alert_id.");

        const { error } = await supabase.rpc("update_ai_operational_alert_status", {
          p_alert_id: alertId,
          p_status: "ACK",
          p_resolution_note: action.note || null
        });

        if (error) throw new Error(error.message);

        if (message.conversation_id) {
          await insertSystemMessage(
            message.conversation_id,
            "NIA marcó la alerta operativa como tomada.",
            {
              alert_id: alertId,
              alert_status: "ACK"
            }
          );
        }

        dispatchComunicacionesRefresh(action.conversation_id || message.conversation_id);
      }

      if (action.action_type === "ADD_INTERNAL_NOTE") {
        const conversationId = action.conversation_id || message.conversation_id;
        const note = action.note || action.message || detail;

        if (!conversationId) throw new Error("La acción no tiene conversation_id.");

        const { error } = await supabase.from("conversation_notes").insert({
          conversation_id: conversationId,
          note,
          tipo: "NOTA_INTERNA",
          target_type: "INTERNO",
          status: "ACTIVA",
          created_by: currentUserId
        });

        if (error) throw new Error(error.message);

        await insertSystemMessage(
          conversationId,
          "NIA guardó una nota interna en la conversación.",
          {
            note
          }
        );

        dispatchComunicacionesRefresh(conversationId);
      }

      setStatus("CONFIRMADA");
      setExecuting(false);
    } catch (error) {
      const messageError = error instanceof Error ? error.message : String(error);

      setLocalError(messageError || "No se pudo ejecutar la acción.");
      setStatus("ERROR");
      setExecuting(false);
    }
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-violet-200 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-violet-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-violet-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
                Acción NIA
              </span>

              <span
                className={[
                  "rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                  status === "CONFIRMADA"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : status === "CANCELADA"
                      ? "border-slate-200 bg-slate-50 text-slate-600"
                      : status === "ERROR"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                ].join(" ")}
              >
                {status}
              </span>
            </div>

            <div className="mt-2 text-[15px] font-black leading-6 text-[#111827]">
              {title}
            </div>

            <div className="mt-1 whitespace-pre-wrap text-[12px] font-semibold leading-5 text-[#475569]">
              {detail}
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Bot size={18} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-3">
        {action.conversation_id ? (
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold text-[#475569]">
            Conversación vinculada: <strong>{action.conversation_id}</strong>
          </div>
        ) : null}

        {action.alert_id ? (
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-[11px] font-semibold text-[#475569]">
            Alerta vinculada: <strong>{action.alert_id}</strong>
          </div>
        ) : null}

        {localError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700">
            {localError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-black/10 pt-3">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setStatus("CANCELADA");
              setLocalError(null);
            }}
            className="flex h-9 items-center gap-2 rounded-2xl bg-white px-3 text-[12px] font-black text-[#64748b] shadow-sm ring-1 ring-black/10 hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <X size={14} />
            Cancelar
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={executeAction}
            className="flex h-9 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-[12px] font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {executing ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
            {executing ? "Ejecutando..." : "Confirmar acción"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NiaOperationalAlertCard({ message }: { message: ComunicacionMessage }) {
  const metadata = readMessageMetadata(message);

  const alertId = getMetadataString(metadata, "alert_id");
  const conversationId = getMetadataString(metadata, "conversation_id");
  const alertType = getMetadataString(metadata, "alert_type") || "ALERTA";
  const severity = getMetadataString(metadata, "severity") || getMetadataString(metadata, "ai_message_priority") || "NORMAL";
  const gapHours = getMetadataNumber(metadata, "gap_hours");
  const displayName = getNiaDisplayName(message);
  const title = getNiaMessageTitle(message);
  const detail = getNiaAlertDetail(message);
  const passengerName = getNiaPassengerName(message);
  const sellerName = getNiaSellerName(message);
  const branchName = getMetadataString(metadata, "sucursal_nombre") || "Sin sucursal";
  const estadoGestion = getMetadataString(metadata, "estado_gestion");
  const estadoComercial = getMetadataString(metadata, "estado_comercial");

  const initialStatus = getMetadataString(metadata, "alert_status") || "ENVIADA";
  const [localStatus, setLocalStatus] = useState<NiaAlertStatus>(initialStatus);
  const [updating, setUpdating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resolved = localStatus === "RESUELTA" || localStatus === "DESCARTADA";

  async function updateAlertStatus(status: "VISTA" | "ACK" | "RESUELTA" | "DESCARTADA") {
    if (!alertId) {
      setLocalError("La alerta no tiene ID.");
      return;
    }

    setUpdating(true);
    setLocalError(null);

    const { error } = await supabase.rpc("update_ai_operational_alert_status", {
      p_alert_id: alertId,
      p_status: status,
      p_resolution_note:
        status === "RESUELTA"
          ? "Resuelta desde tarjeta de NIA en chat interno."
          : status === "DESCARTADA"
            ? "Descartada desde tarjeta de NIA en chat interno."
            : null
    });

    if (error) {
      setLocalError(error.message || "No se pudo actualizar la alerta.");
      setUpdating(false);
      return;
    }

    setLocalStatus(status);
    setUpdating(false);
    dispatchComunicacionesRefresh(conversationId || null);
  }

  return (
    <div className="my-4 flex justify-start">
      <div className="w-full max-w-[720px] overflow-hidden rounded-[28px] border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 bg-red-50 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <NiaAvatar message={message} />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                      getNiaSeverityClass(severity)
                    ].join(" ")}
                  >
                    {severity}
                  </span>

                  <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                    {alertType}
                  </span>

                  <span
                    className={[
                      "rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                      resolved
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    ].join(" ")}
                  >
                    {localStatus}
                  </span>
                </div>

                <h3 className="mt-2 text-[17px] font-black leading-6 text-[#111827]">
                  {title}
                </h3>

                <div className="mt-1 text-[12px] font-semibold text-[#64748b]">
                  {displayName} · {formatDateTime(message.created_at)}
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl border border-red-200 bg-white px-3 py-2 text-right shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wide text-red-600">
                Demora
              </div>

              <div className="text-sm font-black text-red-800">
                {formatNiaHours(gapHours)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 px-5 py-4">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-[#64748b]">
              <AlertTriangle size={14} />
              Detalle de la alerta
            </div>

            <div className="whitespace-pre-wrap text-[13px] font-semibold leading-6 text-[#334155]">
              {detail}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                Pasajero
              </div>

              <div className="mt-1 truncate text-[14px] font-black text-[#111827]">
                {passengerName}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                Vendedor
              </div>

              <div className="mt-1 truncate text-[14px] font-black text-[#111827]">
                {sellerName}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                Sucursal
              </div>

              <div className="mt-1 truncate text-[14px] font-black text-[#111827]">
                {branchName}
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white px-4 py-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                Estado
              </div>

              <div className="mt-1 truncate text-[14px] font-black text-[#111827]">
                {[estadoGestion, estadoComercial].filter(Boolean).join(" · ") || "Sin estado"}
              </div>
            </div>
          </div>

          {localError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
              {localError}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
            <button
              type="button"
              disabled={!conversationId}
              onClick={() => conversationId && openConversationFromNiaAlert(conversationId)}
              className="flex h-10 items-center gap-2 rounded-2xl bg-[#4f7c90] px-4 text-[12px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
            >
              <ExternalLink size={15} />
              Abrir conversación
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={updating || resolved}
                onClick={() => updateAlertStatus("VISTA")}
                className="flex h-10 items-center gap-2 rounded-2xl bg-white px-3 text-[12px] font-black text-[#334155] shadow-sm ring-1 ring-black/10 hover:bg-[#f8fafc] disabled:opacity-50"
              >
                <Eye size={15} />
                Vista
              </button>

              <button
                type="button"
                disabled={updating || resolved}
                onClick={() => updateAlertStatus("ACK")}
                className="flex h-10 items-center gap-2 rounded-2xl bg-blue-50 px-3 text-[12px] font-black text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-50"
              >
                <Check size={15} />
                Tomada
              </button>

              <button
                type="button"
                disabled={updating || resolved}
                onClick={() => updateAlertStatus("RESUELTA")}
                className="flex h-10 items-center gap-2 rounded-2xl bg-green-50 px-3 text-[12px] font-black text-green-700 ring-1 ring-green-200 hover:bg-green-100 disabled:opacity-50"
              >
                <CheckCircle2 size={15} />
                Resolver
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NiaUnassignedConversationSummaryCards({ message }: { message: ComunicacionMessage }) {
  const items = getNiaUnassignedItems(message);

  if (items.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-[24px] border border-red-200 bg-white shadow-sm">
      <div className="border-b border-red-100 bg-red-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-xl border border-red-200 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                Bandeja sin asignar
              </span>

              <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                {items.length} casos
              </span>
            </div>

            <div className="mt-2 text-[15px] font-black leading-6 text-[#111827]">
              Casos detectados por NIA
            </div>

            <div className="mt-1 text-[12px] font-semibold leading-5 text-[#475569]">
              Estas conversaciones están sin vendedor asignado. Las que tienen GAP 48h deberían tomarse o asignarse primero.
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 px-4 py-4">
        {items.map((item, index) => {
          const conversationId = cleanMessageText(item.conversation_id);
          const passengerName =
            cleanMessageText(item.contacto_nombre) ||
            cleanMessageText(item.telefono) ||
            "Pasajero sin nombre";

          const gapHours = Number(item.gap_hours || 0);
          const isUrgent = Number.isFinite(gapHours) && gapHours >= 48;

          return (
            <div
              key={conversationId || `${passengerName}-${index}`}
              className={[
                "overflow-hidden rounded-[22px] border bg-white shadow-sm",
                isUrgent ? "border-red-200" : "border-black/10"
              ].join(" ")}
            >
              <div
                className={[
                  "px-4 py-3",
                  isUrgent ? "bg-red-50" : "bg-[#f8fafc]"
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                          getNiaRecommendedActionClass(item.recommended_action)
                        ].join(" ")}
                      >
                        {getNiaRecommendedActionLabel(item.recommended_action)}
                      </span>

                      {item.ai_temperatura_actual ? (
                        <span
                          className={[
                            "rounded-xl border px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                            getNiaTemperatureClass(item.ai_temperatura_actual)
                          ].join(" ")}
                        >
                          IA: {item.ai_temperatura_actual}
                        </span>
                      ) : null}

                      <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                        {formatNiaScore(item.ai_score_actual)}
                      </span>
                    </div>

                    <div className="mt-2 truncate text-[15px] font-black text-[#111827]">
                      {passengerName}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#64748b]">
                      {item.telefono ? <span>{item.telefono}</span> : null}
                      {item.email ? <span>{item.email}</span> : null}
                      <span>
                        {[item.estado_gestion, item.estado_comercial].filter(Boolean).join(" / ") || "Sin estado"}
                      </span>
                    </div>
                  </div>

                  <div
                    className={[
                      "shrink-0 rounded-2xl border px-3 py-2 text-right shadow-sm",
                      isUrgent
                        ? "border-red-200 bg-white text-red-800"
                        : "border-black/10 bg-white text-[#334155]"
                    ].join(" ")}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
                      Demora
                    </div>

                    <div className="text-sm font-black">
                      {formatNiaHours(item.gap_hours)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 px-4 py-3">
                {item.ai_resumen_general ? (
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                      Resumen IA
                    </div>

                    <div className="text-[12px] font-semibold leading-5 text-[#334155]">
                      {item.ai_resumen_general}
                    </div>
                  </div>
                ) : null}

                {item.ai_ultima_accion_sugerida ? (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-blue-700">
                      Próxima acción sugerida
                    </div>

                    <div className="text-[12px] font-semibold leading-5 text-blue-900">
                      {item.ai_ultima_accion_sugerida}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-3">
                  <div className="text-[10px] font-semibold text-[#94a3b8]">
                    ID conversación: {conversationId}
                  </div>

                  <button
                    type="button"
                    disabled={!conversationId}
                    onClick={() => conversationId && openConversationFromNiaAlert(conversationId)}
                    className="flex h-9 items-center gap-2 rounded-2xl bg-[#4f7c90] px-4 text-[12px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
                  >
                    <ExternalLink size={14} />
                    Abrir conversación
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageStatusTicks({ status }: { status: string }) {
  if (status === "failed") {
    return <span className="text-[12px] text-red-100">Error</span>;
  }

  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-white/75">
        <Clock3 size={13} /> Enviando
      </span>
    );
  }

  if (status === "read") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-blue-100">
        <CheckCheck size={15} /> Visto
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-white/80">
        <CheckCheck size={15} /> Recibido
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-white/75">
        <Check size={15} /> Enviado
      </span>
    );
  }

  return null;
}

function CandeFeedbackModal({
  message,
  initialType,
  onClose,
  onSave
}: {
  message: ComunicacionMessage;
  initialType: AiFeedbackType;
  onClose: () => void;
  onSave: (message: ComunicacionMessage, feedbackType: AiFeedbackType, rating: number | null, comment: string) => void;
}) {
  const [feedbackType, setFeedbackType] = useState<AiFeedbackType>(initialType);
  const [comment, setComment] = useState("");

  const rating = feedbackType === "POSITIVO" ? 5 : feedbackType === "NEGATIVO" ? 1 : 3;

  return (
    <div className="fixed inset-0 z-[360] flex items-start justify-center bg-black/30 px-4 pt-16 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} tabIndex={-1} />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-black/10 bg-white text-[#1f2937] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-[#f8fafc] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4f7c90] text-white">
              <Bot size={20} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-black text-[#111827]">
                Feedback para CANDE
              </h2>

              <p className="mt-0.5 text-[12px] font-semibold text-[#64748b]">
                Esto queda guardado para revisar y mejorar respuestas futuras.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-[#64748b] hover:bg-white hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
            <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-[#64748b]">
              Respuesta de CANDE
            </div>

            <div className="max-h-32 overflow-auto whitespace-pre-wrap text-[13px] font-semibold leading-6 text-[#334155]">
              {message.content || "Sin contenido visible."}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFeedbackType("POSITIVO")}
              className={[
                "flex h-10 items-center justify-center gap-2 rounded-2xl text-[12px] font-black ring-1 ring-black/10",
                feedbackType === "POSITIVO"
                  ? "bg-green-600 text-white"
                  : "bg-white text-[#334155] hover:bg-green-50"
              ].join(" ")}
            >
              <ThumbsUp size={15} />
              Buena
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType("NEGATIVO")}
              className={[
                "flex h-10 items-center justify-center gap-2 rounded-2xl text-[12px] font-black ring-1 ring-black/10",
                feedbackType === "NEGATIVO"
                  ? "bg-red-600 text-white"
                  : "bg-white text-[#334155] hover:bg-red-50"
              ].join(" ")}
            >
              <ThumbsDown size={15} />
              Mala
            </button>

            <button
              type="button"
              onClick={() => setFeedbackType("NEUTRO")}
              className={[
                "flex h-10 items-center justify-center gap-2 rounded-2xl text-[12px] font-black ring-1 ring-black/10",
                feedbackType === "NEUTRO"
                  ? "bg-[#4f7c90] text-white"
                  : "bg-white text-[#334155] hover:bg-[#f1f5f9]"
              ].join(" ")}
            >
              <PencilLine size={15} />
              Corregir
            </button>
          </div>

          <div>
            <label className="mb-2 block text-[12px] font-black uppercase tracking-wide text-[#64748b]">
              Corrección / aprendizaje
            </label>

            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Ejemplo: CANDE no debería volver a preguntar cantidad de pasajeros si el cliente ya dijo que viajan 4 adultos."
              className="min-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[13px] font-semibold leading-6 text-[#111827] outline-none focus:border-[#4f7c90]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-[#f8fafc] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-2xl px-4 text-[13px] font-black text-[#64748b] hover:bg-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onSave(message, feedbackType, rating, comment)}
            className="h-10 rounded-2xl bg-[#4f7c90] px-5 text-[13px] font-black text-white shadow-sm hover:bg-[#416a7a]"
          >
            Guardar feedback
          </button>
        </div>
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  onOpenImage,
  onReply,
  onForward,
  onDelete,
  onReact,
  onAiFeedback
}: {
  message: ComunicacionMessage;
  onOpenImage: (image: { url: string; filename: string }) => void;
  onReply: (message: ComunicacionMessage) => void;
  onForward: (message: ComunicacionMessage) => void;
  onDelete: (message: ComunicacionMessage) => void;
  onReact: (message: ComunicacionMessage, emoji: string) => void;
  onAiFeedback?: (
    message: ComunicacionMessage,
    feedbackType: AiFeedbackType,
    rating: number | null,
    comment: string
  ) => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [feedbackModalType, setFeedbackModalType] = useState<AiFeedbackType | null>(null);

  const outbound = message.direction === "outbound";
  const internal = message.direction === "internal" || message.is_internal;
  const system = message.direction === "system" || message.message_type === "system";
const niaSystem = system && isNiaSystemMessage(message);
const niaOperationalAlert = system && isNiaOperationalAlertMessage(message);
const niaUnassignedSummary = system && isNiaUnassignedConversationSummaryMessage(message);
const niaAction = niaSystem ? getNiaActionFromMessage(message) : null;
  const reactions = message.message_reactions || message.reactions || [];
  const candeMessage = isCandeMessage(message);

  function handleFastFeedback(feedbackType: AiFeedbackType, rating: number) {
    if (!onAiFeedback) return;

    onAiFeedback(message, feedbackType, rating, "");
  }

  function handleSaveFeedback(
    targetMessage: ComunicacionMessage,
    feedbackType: AiFeedbackType,
    rating: number | null,
    comment: string
  ) {
    if (!onAiFeedback) return;

    onAiFeedback(targetMessage, feedbackType, rating, comment);
    setFeedbackModalType(null);
  }

  if (niaOperationalAlert) {
    return <NiaOperationalAlertCard message={message} />;
  }

  if (system && niaSystem) {
    const tone = getNiaMessageTone(message);
    const title = getNiaMessageTitle(message);
    const displayName = getNiaDisplayName(message);
    const niaColor = getNiaColor(message);

    const toneClass =
      tone === "alert"
        ? "border-red-200 bg-red-50 text-red-950"
        : tone === "report"
          ? "border-blue-200 bg-blue-50 text-blue-950"
          : "border-violet-200 bg-violet-50 text-violet-950";

    return (
      <div className="my-4 flex justify-start">
        <div className={["max-w-[94%] rounded-[24px] border px-5 py-4 shadow-sm", toneClass].join(" ")}>
          <div className="mb-3 flex items-center gap-3">
            <NiaAvatar message={message} />

            <div className="min-w-0">
              <div className="truncate text-[16px] font-normal">{title}</div>

              <div className="mt-0.5 text-[12px] font-normal opacity-70">
                {displayName} · {formatDateTime(message.created_at)}
              </div>
            </div>
          </div>

         <div className="whitespace-pre-wrap break-words text-[15px] font-normal leading-7">
  {message.content || "Actualización de NIA."}
</div>

{niaUnassignedSummary ? <NiaUnassignedConversationSummaryCards message={message} /> : null}

{niaAction ? <NiaActionCard message={message} action={niaAction} /> : null}

          {tone === "normal" ? (
            <div className="mt-3 h-1.5 w-16 rounded-full" style={{ backgroundColor: niaColor }} />
          ) : null}
        </div>
      </div>
    );
  }

  if (system) {
    return (
      <div className="my-3 flex justify-center">
        <div className="max-w-[88%] rounded-[18px] border border-black/10 bg-white/85 px-4 py-2 text-[13px] font-normal leading-6 text-[#64748b] shadow-sm">
          {message.content || "Actualización del sistema"}
        </div>
      </div>
    );
  }

  const alignment = outbound ? "justify-end" : "justify-start";

  const bubbleClass = internal
    ? "border-amber-200 bg-amber-50 text-amber-900"
    : outbound
      ? "border-[#4f7c90]/20 bg-[#4f7c90] text-white"
      : "border-black/10 bg-white text-[#111827]";

  const isImage =
    message.message_type === "image" ||
    Boolean(message.media_mime_type?.startsWith("image/"));

  const isAudio =
    message.message_type === "audio" ||
    Boolean(message.media_mime_type?.startsWith("audio/"));

  const isVideo =
    message.message_type === "video" ||
    Boolean(message.media_mime_type?.startsWith("video/"));

  return (
    <>
      <div className={["group flex", alignment].join(" ")}>
        <div className="relative max-w-[82%]">
          <div className={["rounded-[24px] border px-4 py-3 text-[15px] font-normal leading-7 shadow-sm", bubbleClass].join(" ")}>
            <div
              className={[
                "mb-2 flex items-center justify-between gap-2 text-[12px] font-normal",
                outbound ? "text-white/80" : "text-[#64748b]"
              ].join(" ")}
            >
              <span className="truncate">
                {internal
                  ? "Nota interna"
                  : outbound
                    ? candeMessage
                      ? message.sender_full_name || message.sender_name || "CANDE"
                      : message.sender_full_name || message.sender_name || "NOSSIX"
                    : message.sender_name || "Cliente"}
                {" · "}
                {formatDateTime(message.created_at)}
              </span>

              <button
                type="button"
                onClick={() => setActionsOpen((current) => !current)}
                className={[
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl opacity-0 transition group-hover:opacity-100",
                  outbound ? "hover:bg-white/15" : "hover:bg-black/5"
                ].join(" ")}
                title="Acciones"
              >
                <MoreVertical size={15} />
              </button>
            </div>

            {candeMessage ? (
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/85">
                <Bot size={12} />
                CANDE automático
              </div>
            ) : null}

            {message.is_forwarded ? (
              <div
                className={[
                  "mb-2 flex items-center gap-1 text-[12px] font-normal italic",
                  outbound ? "text-white/70" : "text-[#64748b]"
                ].join(" ")}
              >
                <Share2 size={13} /> Reenviado
              </div>
            ) : null}

            {message.reply_to_whatsapp_message_id || message.reply_to_id ? (
              <div
                className={[
                  "mb-3 rounded-2xl border-l-4 px-3 py-2 text-[12px] font-normal",
                  outbound
                    ? "border-white/50 bg-white/10 text-white/80"
                    : "border-[#4f7c90] bg-[#f1f5f9] text-[#475569]"
                ].join(" ")}
              >
                Respuesta a mensaje anterior
              </div>
            ) : null}

            {message.media_url ? (
              <div className="mb-3 overflow-hidden rounded-2xl border border-black/10 bg-white/40">
                {isImage ? (
                  <button
                    type="button"
                    onClick={() =>
                      onOpenImage({
                        url: message.media_url || "",
                        filename: message.media_filename || "Imagen"
                      })
                    }
                    className="group/image block w-full cursor-zoom-in overflow-hidden text-left"
                    title="Ampliar imagen"
                  >
                    <img
                      src={message.media_url}
                      alt={message.media_filename || "Imagen"}
                      className="max-h-[320px] w-full object-cover transition duration-200 group-hover/image:scale-[1.02] group-hover/image:opacity-95"
                    />

                    <div
                      className={[
                        "flex items-center justify-between gap-2 px-3 py-2 text-[12px] font-normal",
                        outbound ? "text-[#111827]" : "text-[#334155]"
                      ].join(" ")}
                    >
                      <span className="truncate">{message.media_filename || "Imagen"}</span>
                      <span className="shrink-0">Ampliar</span>
                    </div>
                  </button>
                ) : isAudio ? (
                  <div className="px-3 py-3">
                    <audio src={message.media_url} controls className="w-[300px] max-w-full" />
                    <div className="mt-2 text-[12px] font-normal text-[#64748b]">
                      {message.media_filename || "Audio"} · {formatFileSize(message.media_size)}
                    </div>
                  </div>
                ) : isVideo ? (
                  <div className="px-3 py-3">
                    <video src={message.media_url} controls className="max-h-[320px] w-full rounded-2xl" />
                    <div className="mt-2 text-[12px] font-normal text-[#64748b]">
                      {message.media_filename || "Video"} · {formatFileSize(message.media_size)}
                    </div>
                  </div>
                ) : (
                  <a
                    href={message.media_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-3 text-[14px] font-normal underline"
                  >
                    <File size={16} />
                    {message.media_filename || "Ver archivo"} · {formatFileSize(message.media_size)}
                  </a>
                )}
              </div>
            ) : null}

            {message.content ? (
              <div className="whitespace-pre-wrap break-words text-[15px] font-normal leading-7">
                {message.content}
              </div>
            ) : null}

            {candeMessage && onAiFeedback ? (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-white/15 pt-2">
                <button
                  type="button"
                  onClick={() => handleFastFeedback("POSITIVO", 5)}
                  className="flex h-7 items-center gap-1 rounded-xl bg-white/10 px-2 text-[11px] font-black text-white/85 hover:bg-white/20"
                  title="Marcar como buena respuesta"
                >
                  <ThumbsUp size={13} />
                  Buena
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackModalType("NEGATIVO")}
                  className="flex h-7 items-center gap-1 rounded-xl bg-white/10 px-2 text-[11px] font-black text-white/85 hover:bg-white/20"
                  title="Marcar como mala respuesta y corregir"
                >
                  <ThumbsDown size={13} />
                  Mala
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackModalType("NEUTRO")}
                  className="flex h-7 items-center gap-1 rounded-xl bg-white/10 px-2 text-[11px] font-black text-white/85 hover:bg-white/20"
                  title="Enseñarle una corrección a CANDE"
                >
                  <PencilLine size={13} />
                  Corregir
                </button>
              </div>
            ) : null}

            {outbound && !internal ? (
              <div className="mt-2 flex justify-end">
                <MessageStatusTicks status={message.status} />
              </div>
            ) : null}

            {message.status === "failed" ? (
              <div className="mt-2 text-[12px] font-normal text-red-100">
                Error: {message.wa_error_message || "No se pudo enviar"}
              </div>
            ) : null}
          </div>

          {reactions.length > 0 ? (
            <div className={["-mt-2 flex", outbound ? "justify-end pr-2" : "justify-start pl-2"].join(" ")}>
              <div className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-sm shadow-sm">
                {reactions.map((reaction, index) => (
                  <span
                    key={reaction.id || `${reaction.emoji}-${index}`}
                    title={reaction.user_name || reaction.sender_name || "Reacción"}
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {actionsOpen ? (
            <div
              className={[
                "absolute top-8 z-30 w-48 overflow-hidden rounded-2xl border border-black/10 bg-white p-1 text-[13px] font-normal shadow-xl",
                outbound ? "right-0" : "left-0"
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => {
                  onReply(message);
                  setActionsOpen(false);
                }}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f1f5f9]"
              >
                <Repeat2 size={14} /> Responder
              </button>

              <button
                type="button"
                onClick={() => {
                  onForward(message);
                  setActionsOpen(false);
                }}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f1f5f9]"
              >
                <Share2 size={14} /> Reenviar
              </button>

              <button
                type="button"
                onClick={() => setReactionsOpen((current) => !current)}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f1f5f9]"
              >
                <Smile size={14} /> Reaccionar
              </button>

              {candeMessage && onAiFeedback ? (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackModalType("NEUTRO");
                    setActionsOpen(false);
                  }}
                  className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f1f5f9]"
                >
                  <PencilLine size={14} /> Feedback CANDE
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  onDelete(message);
                  setActionsOpen(false);
                }}
                className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} /> Eliminar
              </button>

              {reactionsOpen ? (
                <div className="mt-1 grid grid-cols-4 gap-1 rounded-xl bg-[#f8fafc] p-1">
                  {REACTION_OPTIONS.map((emoji: string) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        onReact(message, emoji);
                        setReactionsOpen(false);
                        setActionsOpen(false);
                      }}
                      className="flex h-9 items-center justify-center rounded-lg text-lg hover:bg-white"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {feedbackModalType ? (
        <CandeFeedbackModal
          message={message}
          initialType={feedbackModalType}
          onClose={() => setFeedbackModalType(null)}
          onSave={handleSaveFeedback}
        />
      ) : null}
    </>
  );
}