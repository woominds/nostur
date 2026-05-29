// src/components/comunicaciones/ComunicacionesPanel.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  Clock3,
  Image,
  Loader2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Palette,
  Plus,
  RefreshCcw,
  Save,
  Send,
  Settings,
  Sparkles,
  Tag,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Users,
  Wrench,
  X
} from "lucide-react";

import { useComunicacionesRealtime } from "../../hooks/useComunicacionesRealtime";
import { supabase } from "../../lib/supabase";

import { ConversationListItem } from "./ConversationListItem";
import { AnalisisIAModal } from "./components/AnalisisIAModal";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { MetricPill, WindowBadge } from "./ComunicacionesBadges";
import { ComunicacionesSidebar } from "./ComunicacionesSidebar";
import { ComunicacionesRightPanel } from "./ComunicacionesRightPanel";

import {
  ColaboradoresModal,
  DetalleModal,
  EnviarTemplateModal,
  NuevaConversacionModal,
  QuickRepliesModal,
  TagsModal,
  TemplatesModal,
  TransferirModal
} from "./ComunicacionesModals";

import type { SelectOption } from "./comunicacionesPanel.constants";

import { InlineError } from "./comunicacionesPanel.ui";

import {
  getInitials,
  normalizePhoneDigits
} from "./comunicacionesPanel.helpers";

import {
  getComunicacionChannelLabel,
  getComunicacionDisplayName,
  getComunicacionEstadoGestionLabel,
  getCustomerAiModeLabel,
  useComunicacionesStore,
  type ComunicacionConversation,
  type ComunicacionMessage,
  type ComunicacionesFilters,
  type CreateConversationDraft,
  type CustomerAiMode,
  type EstadoComercial,
  type EstadoGestion,
  type PrioridadConversacion,
  type QuickReply,
  type QuickReplyDraft,
  type SendMessageDraft,
  type WhatsappTemplate
} from "../../store/comunicacionesStore";

type ComunicacionesState = ReturnType<typeof useComunicacionesStore.getState>;

type ModalMode =
  | "nueva"
  | "detalle"
  | "tags"
  | "quick-replies"
  | "templates"
  | "enviar-template"
  | "transferir"
  | "colaboradores"
  | "analisis-ia"
  | "nia-config"
  | "iapax-config"
  | null;

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ImagePreviewState = {
  url: string;
  filename: string;
} | null;

type ReplyState = ComunicacionMessage | null;
type ForwardState = ComunicacionMessage | null;

type AiPersonaRow = {
  id: string;
  code: string;
  name: string;
  display_name: string;
  role_label: string | null;
  description: string | null;
  tone: string | null;
  avatar_url: string | null;
  color: string | null;
  active: boolean;
  is_default: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

type NiaConfigDraft = {
  name: string;
  display_name: string;
  role_label: string;
  description: string;
  tone: string;
  avatar_url: string;
  color: string;
  welcome_message: string;
  active: boolean;
  fixed_top: boolean;
};

type IapaxConfigDraft = {
  name: string;
  display_name: string;
  role_label: string;
  description: string;
  tone: string;
  avatar_url: string;
  color: string;
  default_mode: CustomerAiMode;
  welcome_message: string;
  fallback_message: string;
  handoff_message: string;
  can_say: string;
  cannot_say: string;
  business_rules: string;
  handoff_rules: string;
  active: boolean;
};

function getInitialIapaxDraft(): IapaxConfigDraft {
  return {
    name: "IAPAX",
    display_name: "IAPAX · Asistente de Pasajeros",
    role_label: "IA Vendedora / Primer Filtro",
    description:
      "Asistente para responder consultas iniciales de pasajeros, indagar necesidades, detectar oportunidades y derivar al equipo comercial cuando corresponda.",
    tone:
      "Amable, comercial, claro, empático, profesional y orientado a obtener datos útiles para cotizar.",
    avatar_url: "",
    color: "#0f766e",
    default_mode: "SUGERIDA",
    welcome_message:
      "Hola, soy el asistente de NOSSIX Travel. Te ayudo a avanzar con tu consulta para que un asesor pueda cotizarte mejor.",
    fallback_message:
      "Te entiendo. Para ayudarte mejor, voy a pedirle a un asesor del equipo que revise tu consulta.",
    handoff_message:
      "Ya tengo información suficiente para que un asesor continúe con la atención. Te vamos a responder a la brevedad.",
    can_say:
      "Puede saludar, pedir destino, fechas, cantidad de pasajeros, edades de menores, presupuesto estimado, ciudad de salida, preferencias de hotel, flexibilidad de fechas y urgencia de compra. Puede explicar que está tomando datos para derivar o preparar mejor la cotización.",
    cannot_say:
      "No puede confirmar disponibilidad final, no puede garantizar precios, no puede emitir tickets, no puede prometer reservas, no puede tomar pagos, no puede dar información legal/migratoria como definitiva y no puede inventar políticas de proveedores.",
    business_rules:
      "Debe priorizar consultas con intención de compra clara. Si detecta urgencia, reclamo, pasajero en destino, problema de documentación, cambios, cancelaciones o pago pendiente, debe derivar a un vendedor. Si faltan datos básicos, debe preguntar de a poco sin saturar.",
    handoff_rules:
      "Debe derivar cuando el pasajero informa destino, fecha aproximada y cantidad de pasajeros; cuando pide hablar con un asesor; cuando hay reclamo o urgencia; cuando hay intención fuerte de compra; o cuando la conversación supera el límite razonable de indagación.",
    active: true
  };
}


function cleanPanelText(value: unknown): string {
  return String(value || "").trim();
}

function readPanelMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getInitialNiaDraft(): NiaConfigDraft {
  return {
    name: "NIA",
    display_name: "NIA · Asistente Comercial",
    role_label: "Asistente Comercial NOSTUR",
    description:
      "Asistente interno para alertas comerciales, reportes, seguimiento de oportunidades y métricas de gestión.",
    tone: "Claro, directo, ejecutivo, amable y orientado a la acción.",
    avatar_url: "",
    color: "#7c3aed",
    welcome_message:
      "Hola. Soy NIA · Asistente Comercial. Desde este chat voy a enviarte alertas, reportes y recordatorios comerciales importantes.",
    active: true,
    fixed_top: true
  };
}


function isNiaConversation(conversation?: ComunicacionConversation | null): boolean {
  if (!conversation) return false;

  const metadata = readPanelMetadata(conversation.metadata);

  return (
    conversation.channel === "interno" &&
    (
      metadata.system_ai === true ||
      metadata.system_ai === "true" ||
      cleanPanelText(metadata.ai_persona_code) === "commercial_assistant" ||
      cleanPanelText(conversation.contacto_nombre).toLowerCase().includes("nia") ||
      cleanPanelText(conversation.subject).toLowerCase().includes("nia")
    )
  );
}

/* =========================================================
   TOAST
========================================================= */

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[280] w-[320px] rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={[
              "mb-1 font-black",
              toast.type === "success" ? "text-green-700" : "text-red-700"
            ].join(" ")}
          >
            {toast.type === "success" ? "Operación exitosa" : "Atención"}
          </div>

          <div className="font-semibold text-[#334155]">{toast.message}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   IMAGE PREVIEW MODAL
========================================================= */

function ImagePreviewModal({
  image,
  onClose
}: {
  image: ImagePreviewState;
  onClose: () => void;
}) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        aria-label="Cerrar imagen"
      />

      <div className="relative z-10 flex max-h-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/15 bg-white shadow-2xl">
        <div className="flex h-12 items-center justify-between gap-3 border-b border-black/10 px-4">
          <div className="min-w-0 text-sm font-black text-[#111827]">
            <span className="block truncate">{image.filename}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-[#f1f5f9] px-3 py-2 text-[11px] font-black text-[#334155] hover:bg-[#e2e8f0]"
            >
              Abrir original
            </a>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 items-center justify-center bg-[#0f172a] p-3">
          <img
            src={image.url}
            alt={image.filename}
            className="max-h-[calc(100vh-140px)] max-w-[calc(100vw-80px)] object-contain"
          />
        </div>
      </div>
    </div>
  );
}


function NiaRightPanel({
  selectedConversation,
  loading,
  saving,
  onRefresh,
  onOpenConfig,
  onOpenCommercialControl,
  onSendDailyReport
}: {
  selectedConversation: ComunicacionConversation | null;
  loading: boolean;
  saving: boolean;
  onRefresh: () => void | Promise<void>;
  onOpenConfig: () => void;
  onOpenCommercialControl: () => void;
  onSendDailyReport: () => void;
}) {
  const metadata = readPanelMetadata(selectedConversation?.metadata);
  const displayName =
    cleanPanelText(metadata.ai_persona_display_name) ||
    cleanPanelText(selectedConversation?.contacto_nombre) ||
    "NIA · Asistente Comercial";

  return (
    <aside className="min-h-0 overflow-auto border-l border-black/10 bg-white/70 p-4 backdrop-blur">
      <div className="rounded-[28px] border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-violet-600 text-white shadow-sm">
              <Bot size={22} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-[16px] font-black text-[#111827]">
                Panel NIA
              </div>

              <div className="mt-0.5 truncate text-[12px] font-semibold text-[#64748b]">
                {displayName}
              </div>
            </div>
          </div>

          <span className="rounded-xl border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700">
            Interno
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
          <div className="text-[11px] font-black uppercase tracking-wide text-[#64748b]">
            Función
          </div>

          <p className="mt-1 text-[13px] font-semibold leading-6 text-[#334155]">
            NIA es el asistente comercial interno. Controla alertas, GAP de respuesta,
            conversaciones sin asignar, resúmenes por vendedor y reportes para gerencia.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
        <div className="mb-3 text-[14px] font-black text-[#111827]">
          Estado operativo
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-3 py-2">
            <span className="text-[12px] font-semibold text-[#64748b]">Estado</span>
            <span className="text-[12px] font-black text-green-700">Activa</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-3 py-2">
            <span className="text-[12px] font-semibold text-[#64748b]">Canal</span>
            <span className="text-[12px] font-black text-[#111827]">Interno</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-3 py-2">
            <span className="text-[12px] font-semibold text-[#64748b]">Chat fijado</span>
            <span className="text-[12px] font-black text-violet-700">Sí</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-[#f8fafc] px-3 py-2">
            <span className="text-[12px] font-semibold text-[#64748b]">Último mensaje</span>
            <span className="max-w-[150px] truncate text-right text-[12px] font-black text-[#111827]">
              {selectedConversation?.last_message_time || "Sin datos"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
        <div className="mb-3 text-[14px] font-black text-[#111827]">
          Qué controla NIA
        </div>

        <div className="grid gap-2 text-[12px] font-semibold text-[#334155]">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2">
            Alertas comerciales GAP 24h y GAP 48h.
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2">
            Conversaciones sin vendedor asignado.
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2">
            Resumen diario por vendedor y para gerencia.
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2">
            Seguimiento de oportunidades abiertas y cotizadas pendientes.
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[28px] border border-black/10 bg-white p-4 shadow-sm">
        <div className="mb-3 text-[14px] font-black text-[#111827]">
          Acciones NIA
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || saving}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-3 text-[12px] font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            <RefreshCcw size={14} />
            Actualizar bandeja
          </button>

          <button
            type="button"
            onClick={onSendDailyReport}
            disabled={loading || saving}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12px] font-black text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
          >
            <Sparkles size={14} />
            Enviar reporte diario
          </button>

          <button
            type="button"
            onClick={onOpenCommercialControl}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12px] font-black text-[#334155] shadow-sm ring-1 ring-black/10 hover:bg-[#f8fafc]"
          >
            <ExternalLinkIcon />
            Ver Control Comercial IA
          </button>

          <button
            type="button"
            onClick={onOpenConfig}
            className="flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3 text-[12px] font-black text-[#334155] shadow-sm ring-1 ring-black/10 hover:bg-[#f8fafc]"
          >
            <Settings size={14} />
            Configurar NIA
          </button>
        </div>
      </div>
    </aside>
  );
}

function ExternalLinkIcon() {
  return <Sparkles size={14} />;
}



/* =========================================================
   IAPAX CONFIG MODAL
========================================================= */

function IapaxConfigModal({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [persona, setPersona] = useState<AiPersonaRow | null>(null);
  const [draft, setDraft] = useState<IapaxConfigDraft>(getInitialIapaxDraft());
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void loadPersona();
  }, []);

  async function loadPersona() {
    setLoading(true);
    setLocalError(null);

    const { data, error } = await supabase
      .from("ai_personas")
      .select("*")
      .eq("code", "customer_assistant")
      .maybeSingle();

    if (error) {
      setLocalError(error.message || "No se pudo cargar la configuración de IAPAX.");
      setLoading(false);
      return;
    }

    if (!data) {
      setDraft(getInitialIapaxDraft());
      setPersona(null);
      setLoading(false);
      return;
    }

    const row = data as AiPersonaRow;
    const metadata = readPanelMetadata(row.metadata);
    const initial = getInitialIapaxDraft();

    setPersona(row);
    setDraft({
      name: cleanPanelText(row.name) || initial.name,
      display_name: cleanPanelText(row.display_name) || initial.display_name,
      role_label: cleanPanelText(row.role_label) || initial.role_label,
      description: cleanPanelText(row.description) || initial.description,
      tone: cleanPanelText(row.tone) || initial.tone,
      avatar_url: cleanPanelText(row.avatar_url),
      color: cleanPanelText(row.color) || initial.color,
      default_mode: (["APAGADA", "SUGERIDA", "AUTOMATICA"].includes(cleanPanelText(metadata.default_mode))
  ? cleanPanelText(metadata.default_mode)
  : initial.default_mode) as CustomerAiMode,
      welcome_message: cleanPanelText(metadata.welcome_message) || initial.welcome_message,
      fallback_message: cleanPanelText(metadata.fallback_message) || initial.fallback_message,
      handoff_message: cleanPanelText(metadata.handoff_message) || initial.handoff_message,
      can_say: cleanPanelText(metadata.can_say) || initial.can_say,
      cannot_say: cleanPanelText(metadata.cannot_say) || initial.cannot_say,
      business_rules: cleanPanelText(metadata.business_rules) || initial.business_rules,
      handoff_rules: cleanPanelText(metadata.handoff_rules) || initial.handoff_rules,
      active: Boolean(row.active)
    });

    setLoading(false);
  }

  async function savePersona() {
    setSaving(true);
    setLocalError(null);

    const currentMetadata = readPanelMetadata(persona?.metadata);

    const payload = {
      name: cleanPanelText(draft.name) || "IAPAX",
      display_name: cleanPanelText(draft.display_name) || "IAPAX · Asistente de Pasajeros",
      role_label: cleanPanelText(draft.role_label) || "IA Vendedora / Primer Filtro",
      description: cleanPanelText(draft.description) || null,
      tone: cleanPanelText(draft.tone) || null,
      avatar_url: cleanPanelText(draft.avatar_url) || null,
      color: cleanPanelText(draft.color) || "#0f766e",
      active: Boolean(draft.active),
      is_default: false,
      metadata: {
        ...currentMetadata,
        system_ai: false,
        customer_ai: true,
        default_channel: "whatsapp",
        default_mode: draft.default_mode,
        welcome_message: cleanPanelText(draft.welcome_message),
        fallback_message: cleanPanelText(draft.fallback_message),
        handoff_message: cleanPanelText(draft.handoff_message),
        can_say: cleanPanelText(draft.can_say),
        cannot_say: cleanPanelText(draft.cannot_say),
        business_rules: cleanPanelText(draft.business_rules),
        handoff_rules: cleanPanelText(draft.handoff_rules)
      },
      updated_at: new Date().toISOString()
    };

    if (persona?.id) {
      const { data, error } = await supabase
        .from("ai_personas")
        .update(payload)
        .eq("id", persona.id)
        .select("*")
        .single();

      if (error) {
        setLocalError(error.message || "No se pudo guardar la configuración de IAPAX.");
        setSaving(false);
        return;
      }

      setPersona(data as AiPersonaRow);
    } else {
      const { data, error } = await supabase
        .from("ai_personas")
        .insert({
          code: "customer_assistant",
          ...payload
        })
        .select("*")
        .single();

      if (error) {
        setLocalError(error.message || "No se pudo crear la configuración de IAPAX.");
        setSaving(false);
        return;
      }

      setPersona(data as AiPersonaRow);
    }

    setSaving(false);
    onSaved("Configuración de IAPAX guardada correctamente.");
  }

  async function sendTestMessage() {
  setTesting(true);
  setLocalError(null);

  window.setTimeout(() => {
    setTesting(false);
    onSaved(
      "IAPAX quedó configurada. La prueba real requiere tener deployada la Edge Function customer-assistant-reply."
    );
  }, 500);
}

  function updateDraft<K extends keyof IapaxConfigDraft>(key: K, value: IapaxConfigDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  return (
    <div className="fixed inset-0 z-[310] flex items-start justify-center bg-black/30 px-4 pt-10 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div className="relative z-10 flex max-h-[calc(100vh-80px)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white text-[#1f2937] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-[#f8fafc] px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl text-[18px] text-white shadow-sm"
              style={{ backgroundColor: draft.color || "#0f766e" }}
            >
              {draft.avatar_url ? (
                <img
                  src={draft.avatar_url}
                  alt="Avatar IAPAX"
                  className="h-full w-full rounded-3xl object-cover"
                />
              ) : (
                <Bot size={24} />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-normal text-[#111827]">
                Configurar IAPAX
              </h2>

              <p className="mt-1 text-[14px] font-normal leading-6 text-[#64748b]">
                IA para pasajeros: primer filtro, indagación, score y derivación a vendedores.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#64748b] hover:bg-white hover:text-[#111827]"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center text-[15px] font-normal text-[#64748b]">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Cargando configuración...
          </div>
        ) : (
          <div className="min-h-0 overflow-auto px-6 py-5">
            {localError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-normal text-red-700">
                {localError}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Nombre corto
                    </label>

                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] font-normal outline-none focus:border-emerald-400"
                      placeholder="IAPAX"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Nombre visible
                    </label>

                    <input
                      value={draft.display_name}
                      onChange={(event) => updateDraft("display_name", event.target.value)}
                      className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] font-normal outline-none focus:border-emerald-400"
                      placeholder="IAPAX · Asistente de Pasajeros"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Rol visible
                  </label>

                  <input
                    value={draft.role_label}
                    onChange={(event) => updateDraft("role_label", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] font-normal outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Descripción
                  </label>

                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft("description", event.target.value)}
                    className="min-h-[88px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Qué puede decir
                  </label>

                  <textarea
                    value={draft.can_say}
                    onChange={(event) => updateDraft("can_say", event.target.value)}
                    className="min-h-[105px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Qué NO puede decir
                  </label>

                  <textarea
                    value={draft.cannot_say}
                    onChange={(event) => updateDraft("cannot_say", event.target.value)}
                    className="min-h-[105px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Reglas de negocio
                  </label>

                  <textarea
                    value={draft.business_rules}
                    onChange={(event) => updateDraft("business_rules", event.target.value)}
                    className="min-h-[105px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Reglas de derivación a vendedores
                  </label>

                  <textarea
                    value={draft.handoff_rules}
                    onChange={(event) => updateDraft("handoff_rules", event.target.value)}
                    className="min-h-[105px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Bienvenida
                    </label>

                    <textarea
                      value={draft.welcome_message}
                      onChange={(event) => updateDraft("welcome_message", event.target.value)}
                      className="min-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-normal leading-6 outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Respuesta fallback
                    </label>

                    <textarea
                      value={draft.fallback_message}
                      onChange={(event) => updateDraft("fallback_message", event.target.value)}
                      className="min-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-normal leading-6 outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Mensaje de derivación
                    </label>

                    <textarea
                      value={draft.handoff_message}
                      onChange={(event) => updateDraft("handoff_message", event.target.value)}
                      className="min-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] font-normal leading-6 outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              </div>

              <aside className="grid content-start gap-4">
                <div className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-normal text-[#111827]">
                    <Image size={17} />
                    Avatar
                  </div>

                  <input
                    value={draft.avatar_url}
                    onChange={(event) => updateDraft("avatar_url", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-emerald-400"
                    placeholder="https://..."
                  />

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl text-white"
                      style={{ backgroundColor: draft.color || "#0f766e" }}
                    >
                      {draft.avatar_url ? (
                        <img
                          src={draft.avatar_url}
                          alt="Avatar preview"
                          className="h-full w-full rounded-3xl object-cover"
                        />
                      ) : (
                        <Bot size={24} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-normal text-[#111827]">
                        {draft.display_name || "IAPAX"}
                      </div>

                      <div className="truncate text-[13px] font-normal text-[#64748b]">
                        {draft.role_label || "IA pasajeros"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-normal text-[#111827]">
                    <Palette size={17} />
                    Color
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={draft.color || "#0f766e"}
                      onChange={(event) => updateDraft("color", event.target.value)}
                      className="h-11 w-16 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
                    />

                    <input
                      value={draft.color}
                      onChange={(event) => updateDraft("color", event.target.value)}
                      className="h-11 min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-3 text-[15px] font-normal text-[#111827]">
                    Modo default
                  </div>

                  <div className="grid gap-2">
{(["APAGADA", "SUGERIDA", "AUTOMATICA"] as CustomerAiMode[]).map((mode) => (
                        <button
                        key={mode}
                        type="button"
                        onClick={() => updateDraft("default_mode", mode)}
                        className={[
                          "h-10 rounded-2xl text-[13px] font-black ring-1 ring-black/10",
                          draft.default_mode === mode
                            ? "bg-emerald-600 text-white"
                            : "bg-white text-[#334155] hover:bg-emerald-50"
                        ].join(" ")}
                      >
                        {getCustomerAiModeLabel(mode)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateDraft("active", !draft.active)}
                  className={[
                    "flex items-center justify-between gap-3 rounded-[24px] border px-4 py-4 text-left transition",
                    draft.active
                      ? "border-green-200 bg-green-50 text-green-900"
                      : "border-black/10 bg-white text-[#334155]"
                  ].join(" ")}
                >
                  <div>
                    <div className="text-[15px] font-normal">IAPAX activa</div>
                    <div className="mt-1 text-[13px] font-normal text-[#64748b]">
                      Permite usar IA para pasajeros y derivaciones.
                    </div>
                  </div>

                  {draft.active ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                </button>
              </aside>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-[#f8fafc] px-6 py-4">
          <button
            type="button"
            onClick={sendTestMessage}
            disabled={loading || saving || testing}
            className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-normal text-[#334155] shadow-sm hover:bg-[#eef2f7] disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Probar IAPAX
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl px-4 text-[14px] font-normal text-[#64748b] hover:bg-white"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={savePersona}
              disabled={loading || saving}
              className="flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-5 text-[14px] font-normal text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar IAPAX
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   NIA CONFIG MODAL
========================================================= */

function NiaConfigModal({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [persona, setPersona] = useState<AiPersonaRow | null>(null);
  const [draft, setDraft] = useState<NiaConfigDraft>(getInitialNiaDraft());
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void loadPersona();
  }, []);

  async function loadPersona() {
    setLoading(true);
    setLocalError(null);

    const { data, error } = await supabase
      .from("ai_personas")
      .select("*")
      .eq("code", "commercial_assistant")
      .maybeSingle();

    if (error) {
      setLocalError(error.message || "No se pudo cargar la configuración de NIA.");
      setLoading(false);
      return;
    }

    if (!data) {
      setDraft(getInitialNiaDraft());
      setPersona(null);
      setLoading(false);
      return;
    }

    const row = data as AiPersonaRow;
    const metadata = readPanelMetadata(row.metadata);
    const initial = getInitialNiaDraft();

    setPersona(row);
    setDraft({
      name: cleanPanelText(row.name) || initial.name,
      display_name: cleanPanelText(row.display_name) || initial.display_name,
      role_label: cleanPanelText(row.role_label) || initial.role_label,
      description: cleanPanelText(row.description) || initial.description,
      tone: cleanPanelText(row.tone) || initial.tone,
      avatar_url: cleanPanelText(row.avatar_url),
      color: cleanPanelText(row.color) || initial.color,
      welcome_message: cleanPanelText(metadata.welcome_message) || initial.welcome_message,
      active: Boolean(row.active),
      fixed_top: metadata.fixed_top === false ? false : true
    });

    setLoading(false);
  }

  async function savePersona() {
    setSaving(true);
    setLocalError(null);

    const currentMetadata = readPanelMetadata(persona?.metadata);

    const payload = {
      name: cleanPanelText(draft.name) || "NIA",
      display_name: cleanPanelText(draft.display_name) || "NIA · Asistente Comercial",
      role_label: cleanPanelText(draft.role_label) || "Asistente Comercial NOSTUR",
      description: cleanPanelText(draft.description) || null,
      tone: cleanPanelText(draft.tone) || null,
      avatar_url: cleanPanelText(draft.avatar_url) || null,
      color: cleanPanelText(draft.color) || "#7c3aed",
      active: Boolean(draft.active),
      is_default: true,
      metadata: {
        ...currentMetadata,
        system_ai: true,
        fixed_top: draft.fixed_top,
        pinned: draft.fixed_top,
        default_channel: "interno",
        welcome_message: cleanPanelText(draft.welcome_message)
      },
      updated_at: new Date().toISOString()
    };

    if (persona?.id) {
      const { data, error } = await supabase
        .from("ai_personas")
        .update(payload)
        .eq("id", persona.id)
        .select("*")
        .single();

      if (error) {
        setLocalError(error.message || "No se pudo guardar la configuración de NIA.");
        setSaving(false);
        return;
      }

      setPersona(data as AiPersonaRow);
    } else {
      const { data, error } = await supabase
        .from("ai_personas")
        .insert({
          code: "commercial_assistant",
          ...payload
        })
        .select("*")
        .single();

      if (error) {
        setLocalError(error.message || "No se pudo crear la configuración de NIA.");
        setSaving(false);
        return;
      }

      setPersona(data as AiPersonaRow);
    }

    setSaving(false);
    onSaved("Configuración de NIA guardada correctamente.");
  }

async function sendTestMessage() {
  setTesting(true);
  setLocalError(null);

  window.setTimeout(() => {
    setTesting(false);
    onSaved(
      "NIA quedó configurada. La prueba real requiere tener lista la función test_ai_persona_internal_chat."
    );
  }, 500);
}

  function updateDraft<K extends keyof NiaConfigDraft>(key: K, value: NiaConfigDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  return (
    <div className="fixed inset-0 z-[310] flex items-start justify-center bg-black/30 px-4 pt-10 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div className="relative z-10 flex max-h-[calc(100vh-80px)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white text-[#1f2937] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-[#f8fafc] px-6 py-5">
          <div className="flex min-w-0 items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl text-[18px] text-white shadow-sm"
              style={{ backgroundColor: draft.color || "#7c3aed" }}
            >
              {draft.avatar_url ? (
                <img
                  src={draft.avatar_url}
                  alt="Avatar NIA"
                  className="h-full w-full rounded-3xl object-cover"
                />
              ) : (
                <Bot size={24} />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-normal text-[#111827]">
                Configurar NIA
              </h2>

              <p className="mt-1 text-[14px] font-normal leading-6 text-[#64748b]">
                Nombre, avatar, tono y comportamiento del asistente interno.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#64748b] hover:bg-white hover:text-[#111827]"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center text-[15px] font-normal text-[#64748b]">
            <Loader2 size={18} className="mr-2 animate-spin" />
            Cargando configuración...
          </div>
        ) : (
          <div className="min-h-0 overflow-auto px-6 py-5">
            {localError ? (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-normal text-red-700">
                {localError}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Nombre corto
                    </label>

                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] font-normal outline-none focus:border-violet-400"
                      placeholder="NIA"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                      Nombre visible
                    </label>

                    <input
                      value={draft.display_name}
                      onChange={(event) => updateDraft("display_name", event.target.value)}
                      className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] font-normal outline-none focus:border-violet-400"
                      placeholder="NIA · Asistente Comercial"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Rol visible
                  </label>

                  <input
                    value={draft.role_label}
                    onChange={(event) => updateDraft("role_label", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-[15px] font-normal outline-none focus:border-violet-400"
                    placeholder="Asistente Comercial NOSTUR"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Descripción
                  </label>

                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft("description", event.target.value)}
                    className="min-h-[92px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Tono de comunicación
                  </label>

                  <textarea
                    value={draft.tone}
                    onChange={(event) => updateDraft("tone", event.target.value)}
                    className="min-h-[92px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[14px] font-normal text-[#334155]">
                    Mensaje de bienvenida
                  </label>

                  <textarea
                    value={draft.welcome_message}
                    onChange={(event) => updateDraft("welcome_message", event.target.value)}
                    className="min-h-[110px] w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-[15px] font-normal leading-7 outline-none focus:border-violet-400"
                  />
                </div>
              </div>

              <aside className="grid content-start gap-4">
                <div className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-normal text-[#111827]">
                    <Image size={17} />
                    Avatar
                  </div>

                  <input
                    value={draft.avatar_url}
                    onChange={(event) => updateDraft("avatar_url", event.target.value)}
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-violet-400"
                    placeholder="https://..."
                  />

                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl text-white"
                      style={{ backgroundColor: draft.color || "#7c3aed" }}
                    >
                      {draft.avatar_url ? (
                        <img
                          src={draft.avatar_url}
                          alt="Avatar preview"
                          className="h-full w-full rounded-3xl object-cover"
                        />
                      ) : (
                        <Bot size={24} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-normal text-[#111827]">
                        {draft.display_name || "NIA"}
                      </div>

                      <div className="truncate text-[13px] font-normal text-[#64748b]">
                        {draft.role_label || "Asistente Comercial"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-3 flex items-center gap-2 text-[15px] font-normal text-[#111827]">
                    <Palette size={17} />
                    Color
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={draft.color || "#7c3aed"}
                      onChange={(event) => updateDraft("color", event.target.value)}
                      className="h-11 w-16 cursor-pointer rounded-xl border border-black/10 bg-white p-1"
                    />

                    <input
                      value={draft.color}
                      onChange={(event) => updateDraft("color", event.target.value)}
                      className="h-11 min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-3 text-[14px] font-normal outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateDraft("active", !draft.active)}
                  className={[
                    "flex items-center justify-between gap-3 rounded-[24px] border px-4 py-4 text-left transition",
                    draft.active
                      ? "border-green-200 bg-green-50 text-green-900"
                      : "border-black/10 bg-white text-[#334155]"
                  ].join(" ")}
                >
                  <div>
                    <div className="text-[15px] font-normal">NIA activa</div>
                    <div className="mt-1 text-[13px] font-normal text-[#64748b]">
                      Permite usarla para reportes, alertas y chat interno.
                    </div>
                  </div>

                  {draft.active ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                </button>

                <button
                  type="button"
                  onClick={() => updateDraft("fixed_top", !draft.fixed_top)}
                  className={[
                    "flex items-center justify-between gap-3 rounded-[24px] border px-4 py-4 text-left transition",
                    draft.fixed_top
                      ? "border-violet-200 bg-violet-50 text-violet-950"
                      : "border-black/10 bg-white text-[#334155]"
                  ].join(" ")}
                >
                  <div>
                    <div className="text-[15px] font-normal">Fijada arriba</div>
                    <div className="mt-1 text-[13px] font-normal text-[#64748b]">
                      Mantiene el chat de NIA arriba de Mis conversaciones.
                    </div>
                  </div>

                  {draft.fixed_top ? <ToggleRight size={34} /> : <ToggleLeft size={34} />}
                </button>
              </aside>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-[#f8fafc] px-6 py-4">
          <button
            type="button"
            onClick={sendTestMessage}
            disabled={loading || saving || testing}
            className="flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-[14px] font-normal text-[#334155] shadow-sm hover:bg-[#eef2f7] disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Enviar prueba
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-2xl px-4 text-[14px] font-normal text-[#64748b] hover:bg-white"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={savePersona}
              disabled={loading || saving}
              className="flex h-11 items-center gap-2 rounded-2xl bg-violet-600 px-5 text-[14px] font-normal text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar NIA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
/* =========================================================
   PANEL PRINCIPAL
========================================================= */

export function ComunicacionesPanel() {
  const loading = useComunicacionesStore((state: ComunicacionesState) => state.loading);
  const loadingMessages = useComunicacionesStore((state: ComunicacionesState) => state.loadingMessages);
  const saving = useComunicacionesStore((state: ComunicacionesState) => state.saving);
  const uploading = useComunicacionesStore((state: ComunicacionesState) => state.uploading);
  const error = useComunicacionesStore((state: ComunicacionesState) => state.error);
  const currentProfile = useComunicacionesStore((state: ComunicacionesState) => state.currentProfile);
  const canManageComunicaciones = useComunicacionesStore(
    (state: ComunicacionesState) => state.canManageComunicaciones
  );
  const conversations = useComunicacionesStore((state: ComunicacionesState) => state.conversations);
  const messages = useComunicacionesStore((state: ComunicacionesState) => state.messages);
  const notes = useComunicacionesStore((state: ComunicacionesState) => state.notes);
  const tags = useComunicacionesStore((state: ComunicacionesState) => state.tags);
  const vendedores = useComunicacionesStore((state: ComunicacionesState) => state.vendedores);
  const sucursales = useComunicacionesStore((state: ComunicacionesState) => state.sucursales);
  const quickReplies = useComunicacionesStore((state: ComunicacionesState) => state.quickReplies);
  const templates = useComunicacionesStore((state: ComunicacionesState) => state.templates);
  const filters = useComunicacionesStore((state: ComunicacionesState) => state.filters);

  const aiAnalysis = useComunicacionesStore((state: ComunicacionesState) =>
    state.getSelectedAiAnalysis()
  );
  const aiAnalyzing = useComunicacionesStore((state: ComunicacionesState) => state.analyzingAi);
  const aiError = error;

  const loadComunicaciones = useComunicacionesStore((state: ComunicacionesState) => state.loadComunicaciones);
  const loadMessages = useComunicacionesStore((state: ComunicacionesState) => state.loadMessages);
  const loadNotes = useComunicacionesStore((state: ComunicacionesState) => state.loadNotes);
  const sendMessage = useComunicacionesStore((state: ComunicacionesState) => state.sendMessage);
  const addNote = useComunicacionesStore((state: ComunicacionesState) => state.addNote);
  const createConversation = useComunicacionesStore((state: ComunicacionesState) => state.createConversation);
  const updateConversation = useComunicacionesStore((state: ComunicacionesState) => state.updateConversation);
  const archiveConversation = useComunicacionesStore((state: ComunicacionesState) => state.archiveConversation);
  const trashConversation = useComunicacionesStore((state: ComunicacionesState) => state.trashConversation);
  const restoreConversation = useComunicacionesStore((state: ComunicacionesState) => state.restoreConversation);
  const closeConversation = useComunicacionesStore((state: ComunicacionesState) => state.closeConversation);
  const reopenConversation = useComunicacionesStore((state: ComunicacionesState) => state.reopenConversation);
  const takeConversation = useComunicacionesStore((state: ComunicacionesState) => state.takeConversation);
  const transferConversation = useComunicacionesStore((state: ComunicacionesState) => state.transferConversation);
  const addCollaborator = useComunicacionesStore((state: ComunicacionesState) => state.addCollaborator);
  const removeCollaborator = useComunicacionesStore((state: ComunicacionesState) => state.removeCollaborator);
  const toggleTag = useComunicacionesStore((state: ComunicacionesState) => state.toggleTag);
  const deleteMessage = useComunicacionesStore((state: ComunicacionesState) => state.deleteMessage);
  const reactToMessage = useComunicacionesStore((state: ComunicacionesState) => state.reactToMessage);
  const forwardMessage = useComunicacionesStore((state: ComunicacionesState) => state.forwardMessage);
  const syncConversationToContacto = useComunicacionesStore(
    (state: ComunicacionesState) => state.syncConversationToContacto
  );
  const analyzeConversationAI = useComunicacionesStore(
    (state: ComunicacionesState) => state.analyzeConversationAi
  );
  const deleteNote = useComunicacionesStore((state: ComunicacionesState) => state.deleteNote);
  const createQuickReply = useComunicacionesStore((state: ComunicacionesState) => state.createQuickReply);
  const updateQuickReply = useComunicacionesStore((state: ComunicacionesState) => state.updateQuickReply);
  const toggleQuickReplyActive = useComunicacionesStore(
    (state: ComunicacionesState) => state.toggleQuickReplyActive
  );
  const incrementQuickReplyUsage = useComunicacionesStore(
    (state: ComunicacionesState) => state.incrementQuickReplyUsage
  );
  const createAiFeedback = useComunicacionesStore(
  (state: ComunicacionesState) => state.createAiFeedback
);
 

  const setFilter = useComunicacionesStore((state: ComunicacionesState) => state.setFilter);
  const resetFilters = useComunicacionesStore((state: ComunicacionesState) => state.resetFilters);
  const selectConversation = useComunicacionesStore((state: ComunicacionesState) => state.selectConversation);
  const clearError = useComunicacionesStore((state: ComunicacionesState) => state.clearError);
  const getFilteredConversations = useComunicacionesStore(
    (state: ComunicacionesState) => state.getFilteredConversations
  );
  const getSelectedConversation = useComunicacionesStore(
    (state: ComunicacionesState) => state.getSelectedConversation
  );
  const getMetrics = useComunicacionesStore((state: ComunicacionesState) => state.getMetrics);

 const filteredConversations = getFilteredConversations();
const selectedConversation = getSelectedConversation();
const metrics = getMetrics();
const selectedIsNiaConversation = isNiaConversation(selectedConversation);
    const [externalOpeningConversationId, setExternalOpeningConversationId] = useState<string | null>(null);
  useEffect(() => {
    if (externalOpeningConversationId) return;

    const selectedIsInCurrentFolder = selectedConversation
      ? filteredConversations.some((conversation) => conversation.id === selectedConversation.id)
      : false;

    if ((!selectedConversation || !selectedIsInCurrentFolder) && filteredConversations.length > 0) {
      selectConversation(filteredConversations[0].id);
      return;
    }

    if (filteredConversations.length === 0 && selectedConversation) {
      selectConversation(null);
    }
  }, [externalOpeningConversationId, selectedConversation, filteredConversations, selectConversation]);

 const [modalMode, setModalMode] = useState<ModalMode>(null);
const [filtersOpen, setFiltersOpen] = useState(true);
const [toast, setToast] = useState<ToastState>(null);
const [imagePreview, setImagePreview] = useState<ImagePreviewState>(null);
const [replyToMessage, setReplyToMessage] = useState<ReplyState>(null);
const [forwardMessageSource, setForwardMessageSource] = useState<ForwardState>(null);
const [externalDraftText, setExternalDraftText] = useState("");
const [headerMenuOpen, setHeaderMenuOpen] = useState<"herramientas" | "configuracion" | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const vendedorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todos" },
      ...vendedores.map((vendedor) => ({
        value: vendedor.id,
        label: `${vendedor.nombre} ${vendedor.apellido}`.trim() || vendedor.email
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

  const tagOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todas" },
      ...tags.map((tagItem) => ({
        value: tagItem.id,
        label: tagItem.nombre
      }))
    ],
    [tags]
  );

  useEffect(() => {
    void loadComunicaciones();
  }, [loadComunicaciones]);

  useEffect(() => {
    const raw = window.localStorage.getItem("nostur_comunicaciones_open_conversation");

    if (!raw || loading || conversations.length === 0) return;

    try {
      const payload = JSON.parse(raw) as {
        conversationId?: string;
        source?: string;
        createdAt?: string;
      };

      if (!payload.conversationId) {
        window.localStorage.removeItem("nostur_comunicaciones_open_conversation");
        return;
      }

      const exists = conversations.some((conversation) => conversation.id === payload.conversationId);

      if (!exists) {
        void loadComunicaciones(true);
        return;
      }

      setExternalOpeningConversationId(payload.conversationId);

      setFilter("tab", "abiertas");
      setFilter("search", "");
      setFilter("channel", "todos");
      setFilter("assignedTo", "todos");
      setFilter("sucursalId", "todas");
      setFilter("prioridad", "todas");
      setFilter("estadoGestion", "todos");
      setFilter("estadoComercial", "todos");
      setFilter("tagId", "todos");
      setFilter("ventana24h", "todas");
      setFilter("unreadOnly", false);

      selectConversation(payload.conversationId);
      void loadMessages(payload.conversationId, false);
      void loadNotes(payload.conversationId, false);

      window.localStorage.removeItem("nostur_comunicaciones_open_conversation");

      window.setTimeout(() => {
        setExternalOpeningConversationId(null);
      }, 400);

      showToast("Conversación abierta desde Control Comercial IA.");
    } catch {
      window.localStorage.removeItem("nostur_comunicaciones_open_conversation");
      setExternalOpeningConversationId(null);
    }
  }, [
    loading,
    conversations,
    selectConversation,
    loadMessages,
    loadNotes,
    loadComunicaciones,
    setFilter
  ]);

  useEffect(() => {
    const raw = window.localStorage.getItem("nostur_comunicaciones_handoff");

    if (!raw || loading || conversations.length === 0) return;

    try {
      const handoff = JSON.parse(raw) as {
        source?: string;
        contactoId?: string;
        telefono?: string;
        nombre?: string;
        createdAt?: string;
      };

      const telefonoBuscado = normalizePhoneDigits(handoff.telefono);
      const contactoIdBuscado = handoff.contactoId || "";

      const targetConversation = conversations.find((conversation) => {
        const mismoContacto = Boolean(contactoIdBuscado) && conversation.contacto_id === contactoIdBuscado;
        const mismoTelefono =
          Boolean(telefonoBuscado) && normalizePhoneDigits(conversation.telefono) === telefonoBuscado;

        return mismoContacto || mismoTelefono;
      });

      if (targetConversation) {
        selectConversation(targetConversation.id);
        void loadMessages(targetConversation.id, false);
        void loadNotes(targetConversation.id, false);
        window.localStorage.removeItem("nostur_comunicaciones_handoff");
        showToast("Chat del contacto abierto correctamente.");
        return;
      }

      if (handoff.telefono || handoff.nombre) {
        setFilter("search", handoff.telefono || handoff.nombre || "");
        showToast("No encontré un chat existente. Dejé filtrado el contacto en comunicaciones.", "error");
      }

      window.localStorage.removeItem("nostur_comunicaciones_handoff");
    } catch {
      window.localStorage.removeItem("nostur_comunicaciones_handoff");
    }
  }, [conversations, loading, selectConversation, loadMessages, loadNotes, setFilter]);

  useComunicacionesRealtime({
    selectedConversationId: selectedConversation?.id || null,
    enabled: true,
    onRefreshConversations: loadComunicaciones,
    onRefreshMessages: loadMessages,
    onRefreshNotes: loadNotes
  });

  useEffect(() => {
    function handleOpenConversation(event: Event) {
      const customEvent = event as CustomEvent<{ conversationId?: string }>;
      const conversationId = customEvent.detail?.conversationId;

      if (!conversationId) return;

      setExternalOpeningConversationId(conversationId);

      setFilter("tab", "abiertas");
      setFilter("search", "");
      setFilter("channel", "todos");
      setFilter("assignedTo", "todos");
      setFilter("sucursalId", "todas");
      setFilter("prioridad", "todas");
      setFilter("estadoGestion", "todos");
      setFilter("estadoComercial", "todos");
      setFilter("tagId", "todos");
      setFilter("ventana24h", "todas");
      setFilter("unreadOnly", false);

      selectConversation(conversationId);
      void loadMessages(conversationId, false);
      void loadNotes(conversationId, false);
      void loadComunicaciones(true);

      window.setTimeout(() => {
        setExternalOpeningConversationId(null);
      }, 400);
    }

    window.addEventListener("nossix:open-conversation", handleOpenConversation);

    return () => {
      window.removeEventListener("nossix:open-conversation", handleOpenConversation);
    };
  }, [selectConversation, loadMessages, loadNotes, loadComunicaciones, setFilter]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedConversation?.id]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function handleCreateConversation(draft: CreateConversationDraft) {
    const id = await createConversation(draft);

    if (id) {
      setModalMode(null);
      showToast("Conversación creada correctamente.");
    }
  }

  async function handleSendMessage(draft: SendMessageDraft) {
    const ok = await sendMessage(draft);
    if (!ok) showToast("No se pudo enviar el mensaje.", "error");
  }

  function handleUseAiSuggestedResponse(text: string) {
    const cleanText = text.trim();

    if (!cleanText) {
      showToast("La IA no generó una respuesta para usar.", "error");
      return;
    }

    setExternalDraftText(cleanText);
    setModalMode(null);
    showToast("Respuesta sugerida cargada en el cuadro de mensaje.");
  }

  async function handleSaveAiSummaryAsNote(summary: string) {
    if (!selectedConversation) return;

    const cleanSummary = summary.trim();

    if (!cleanSummary) {
      showToast("No hay resumen para guardar.", "error");
      return;
    }

    const ok = await addNote({
      conversation_id: selectedConversation.id,
      tipo: "NOTA_INTERNA",
      target_type: "INTERNO",
      note: ["Resumen generado por IA:", "", cleanSummary].join("\n")
    });

    if (ok) {
      await loadNotes(selectedConversation.id, true);
      showToast("Resumen IA guardado como nota interna.");
    } else {
      showToast("No se pudo guardar el resumen como nota.", "error");
    }
  }

  async function handleUpdateSelected(patch: Partial<ComunicacionConversation>) {
    if (!selectedConversation) return;

    const ok = await updateConversation({
      id: selectedConversation.id,
      assigned_to: patch.assigned_to,
      sucursal_id: patch.sucursal_id,
      estado_comercial: patch.estado_comercial as EstadoComercial | undefined,
      estado_gestion: patch.estado_gestion as EstadoGestion | undefined,
      prioridad: patch.prioridad as PrioridadConversacion | undefined,
      categoria: patch.categoria,
      etapa_comercial: patch.etapa_comercial,
      mostrar_agente: patch.mostrar_agente,
      contacto_nombre: patch.contacto_nombre,
      telefono: patch.telefono,
      email: patch.email,
      subject: patch.subject,
      titulo: patch.titulo
    });

    if (ok) showToast("Conversación actualizada.");
  }

  async function handleAddNote(note: string, tipo = "NOTA_INTERNA", scheduledAt: string | null = null) {
    if (!selectedConversation) return;

    const ok = await addNote({
      conversation_id: selectedConversation.id,
      note,
      tipo,
      target_type: tipo === "MENSAJE_CLIENTE_PROGRAMADO" ? "CLIENTE" : "INTERNO",
      scheduled_at: scheduledAt
    });

    if (ok) {
      await loadNotes(selectedConversation.id, true);
      showToast(scheduledAt ? "Programación agregada." : "Nota agregada.");
    }
  }

  async function handleDeleteNote(noteId: string) {
    const ok = await deleteNote(noteId);

    if (ok) {
      showToast("Nota eliminada.");
    } else {
      showToast("No se pudo eliminar la nota.", "error");
    }
  }

  async function handleTakeConversation() {
    if (!selectedConversation) return;

    const ok = await takeConversation(selectedConversation.id);
    if (ok) showToast("Conversación tomada correctamente.");
  }

  async function handleTransfer(profileId: string, note: string) {
    if (!selectedConversation) return;

    const ok = await transferConversation(selectedConversation.id, profileId, note);

    if (ok) {
      setModalMode(null);
      showToast("Conversación transferida.");
    }
  }

  async function handleAddCollaborator(profileId: string) {
    if (!selectedConversation) return;

    const ok = await addCollaborator(selectedConversation.id, profileId);

    if (ok) {
      await loadComunicaciones(true);
      showToast("Colaborador agregado.");
    }
  }

  async function handleRemoveCollaborator(profileId: string) {
    if (!selectedConversation) return;

    const ok = await removeCollaborator(selectedConversation.id, profileId);

    if (ok) {
      await loadComunicaciones(true);
      showToast("Colaborador quitado.");
    }
  }

  async function handleArchive() {
    if (!selectedConversation) return;

    const ok = await archiveConversation(selectedConversation.id);
    if (ok) showToast("Conversación archivada.");
  }

  async function handleTrash() {
    if (!selectedConversation) return;

    const ok = await trashConversation(selectedConversation.id);
    if (ok) showToast("Conversación enviada a eliminadas.");
  }

  async function handleRestore() {
    if (!selectedConversation) return;

    const ok = await restoreConversation(selectedConversation.id);
    if (ok) showToast("Conversación restaurada.");
  }

  async function handleCloseOrReopen() {
    if (!selectedConversation) return;

    const ok =
      selectedConversation.status === "CERRADA"
        ? await reopenConversation(selectedConversation.id)
        : await closeConversation(selectedConversation.id);

    if (ok) {
      showToast(selectedConversation.status === "CERRADA" ? "Conversación reabierta." : "Conversación cerrada.");
    }
  }

  async function handleToggleTag(tagId: string) {
    if (!selectedConversation) return;

    const ok = await toggleTag(selectedConversation.id, tagId);

    if (ok) {
      setModalMode(null);
      showToast("Etiqueta actualizada.");
    }
  }

  async function handleDeleteMessage(message: ComunicacionMessage) {
    const ok = await deleteMessage(message.id);
    if (ok) showToast("Mensaje eliminado.");
  }

  async function handleReactMessage(message: ComunicacionMessage, emoji: string) {
    const ok = await reactToMessage(message.id, emoji);
    if (ok) showToast("Reacción agregada.");
  }

  async function handleCandeFeedback(
  message: ComunicacionMessage,
  feedbackType: "POSITIVO" | "NEGATIVO" | "NEUTRO",
  rating: number | null,
  comment: string
) {
  const ok = await createAiFeedback({
    conversation_id: message.conversation_id,
    assistant_message_id: message.id,
    feedback_type: feedbackType,
    rating,
    comment: comment.trim() || null,
    original_ai_answer: message.content || null,
    original_user_prompt: null,
    source: "cande_conversation_feedback",
    module: "comunicaciones",
    context_snapshot: {
      message_id: message.id,
      message_created_at: message.created_at,
      sender_name: message.sender_name || null,
      metadata: message.metadata || null
    },
    metadata: {
      ai_persona: "CANDE",
      source_message_metadata: message.metadata || null
    }
  });

  if (ok) {
    showToast(
      feedbackType === "POSITIVO"
        ? "Feedback positivo guardado para CANDE."
        : feedbackType === "NEGATIVO"
          ? "Corrección guardada para revisar CANDE."
          : "Feedback guardado para CANDE."
    );
  } else {
    showToast("No se pudo guardar el feedback de CANDE.", "error");
  }
}

  async function handleSyncContacto() {
    if (!selectedConversation) return;

    const result = await syncConversationToContacto(selectedConversation.id);

    if (result.ok) {
      showToast(result.message, "success");
      return;
    }

    showToast(result.message || "No se pudo crear/vincular el contacto.", "error");
  }
 

  async function handleAnalyzeAI() {
    if (!selectedConversation) return;

    const result = await analyzeConversationAI(selectedConversation.id, true);

    if (result) {
      showToast("Análisis IA generado correctamente.");
    } else {
      showToast("No se pudo analizar la conversación con IA.", "error");
    }
  }

  async function handleForwardMessage(targetConversationId: string) {
    if (!forwardMessageSource) return;

    const ok = await forwardMessage({
      source_message_id: forwardMessageSource.id,
      target_conversation_id: targetConversationId
    });

    if (ok) {
      setForwardMessageSource(null);
      showToast("Mensaje reenviado.");
    }
  }

  async function handleSendTemplate(template: WhatsappTemplate, variables: string[]) {
    if (!selectedConversation) return;

    const ok = await sendMessage({
      conversation_id: selectedConversation.id,
      content: template.body || template.name,
      message_type: "template",
      template_name: template.name,
      template_language: template.language || "es_AR",
      template_variables: variables,
      is_internal: false
    });

    if (ok) {
      setModalMode(null);
      showToast("Plantilla enviada correctamente.");
    } else {
      showToast("No se pudo enviar la plantilla.", "error");
    }
  }

  async function handleCreateQuickReply(draft: QuickReplyDraft) {
    const ok = await createQuickReply(draft);
    if (ok) showToast("Respuesta rápida creada.");
  }

  async function handleUpdateQuickReply(draft: QuickReplyDraft & { id: string }) {
    const ok = await updateQuickReply(draft);
    if (ok) showToast("Respuesta rápida actualizada.");
  }

  async function handleToggleQuickReplyActive(id: string) {
    const ok = await toggleQuickReplyActive(id);
    if (ok) showToast("Estado de respuesta rápida actualizado.");
  }

  async function handleUseQuickReply(reply: QuickReply) {
    await incrementQuickReplyUsage(reply.id);
  }

  function openInternalModule(moduleId: string, title: string) {
    window.dispatchEvent(
      new CustomEvent("nostur:open-internal", {
        detail: {
          moduleId,
          title
        }
      })
    );
  }

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_22%_10%,rgba(79,124,144,0.12),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(112,139,158,0.14),transparent_30%),linear-gradient(135deg,#eef3f5,#dfe8ec_48%,#eef3f5)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
<header className="shrink-0 border-b border-black/10 bg-white/75 px-4 py-3 backdrop-blur">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-black tracking-tight text-[#111827]">Comunicaciones</h1>

        <span className="rounded-xl bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#31596a]">
          CRM + CANDE + NIA
        </span>
      </div>

      <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
        Bandeja operativa para tomar consultas, responder pasajeros y ordenar el trabajo comercial.
      </p>
    </div>

    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => loadComunicaciones()}
        disabled={loading}
        className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm ring-1 ring-black/5 hover:bg-[#f8fafc] disabled:opacity-50"
      >
        <RefreshCcw size={14} />
        {loading ? "Actualizando..." : "Actualizar"}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setHeaderMenuOpen((current) =>
              current === "herramientas" ? null : "herramientas"
            )
          }
          className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm ring-1 ring-black/5 hover:bg-[#f8fafc]"
        >
          <Wrench size={14} />
          Herramientas
          <ChevronDown size={13} />
        </button>

        {headerMenuOpen === "herramientas" ? (
          <div className="absolute right-0 top-11 z-[120] w-56 overflow-hidden rounded-2xl border border-black/10 bg-white p-1 text-xs font-semibold shadow-xl">
            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(null);
                openInternalModule("comunicaciones-contactos-live", "Contactos Live");
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f8fafc]"
            >
              <Users size={14} />
              Contactos Live
            </button>

            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(null);
                openInternalModule("comunicaciones-historial-live", "Historial Live");
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f8fafc]"
            >
              <Clock3 size={14} />
              Historial Live
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() =>
            setHeaderMenuOpen((current) =>
              current === "configuracion" ? null : "configuracion"
            )
          }
          className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm ring-1 ring-black/5 hover:bg-[#f8fafc]"
        >
          <Settings size={14} />
          Configuración
          <ChevronDown size={13} />
        </button>

        {headerMenuOpen === "configuracion" ? (
          <div className="absolute right-0 top-11 z-[120] w-60 overflow-hidden rounded-2xl border border-black/10 bg-white p-1 text-xs font-semibold shadow-xl">
            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(null);
                setModalMode("templates");
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f8fafc]"
            >
              <MessageSquare size={14} />
              Plantillas WhatsApp
            </button>

            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(null);
                setModalMode("quick-replies");
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[#334155] hover:bg-[#f8fafc]"
            >
              <Settings size={14} />
              Respuestas rápidas
            </button>

            <div className="my-1 h-px bg-black/10" />

            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(null);
                setModalMode("nia-config");
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-violet-700 hover:bg-violet-50"
            >
              <Bot size={14} />
              Configurar NIA
            </button>

            <button
              type="button"
              onClick={() => {
                setHeaderMenuOpen(null);
                setModalMode("iapax-config");
              }}
              className="flex h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-emerald-700 hover:bg-emerald-50"
            >
              <Bot size={14} />
              Configurar IAPAX
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          setHeaderMenuOpen(null);
          setModalMode("nueva");
        }}
        className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white shadow-sm hover:bg-[#416a7a]"
      >
        <Plus size={14} />
        Nueva conversación
      </button>
    </div>
  </div>

  <div className="mt-3 flex flex-wrap gap-2">
    <MetricPill label="Sin atender" value={metrics.derivadoNuevo} tone="red" />
    <MetricPill label="En gestión" value={metrics.misConversaciones} tone="blue" />
    <MetricPill label="CANDE trabajando" value={metrics.candeAtendiendo} tone="green" />
    <MetricPill label="No leídas" value={metrics.noLeidas} tone="blue" />
    <MetricPill label="Urgentes" value={metrics.urgentes} tone="red" />
  </div>
</header>

        {error ? (
          <div className="shrink-0 px-4 pt-3">
            <InlineError message={error} onClose={clearError} />
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-[300px_370px_minmax(0,1fr)_390px] overflow-hidden">
          <ComunicacionesSidebar
            filters={filters}
            metrics={metrics}
            filtersOpen={filtersOpen}
            vendedorOptions={vendedorOptions}
            sucursalOptions={sucursalOptions}
            tagOptions={tagOptions}
            onToggleFilters={() => setFiltersOpen((current) => !current)}
            onSetFilter={<K extends keyof ComunicacionesFilters>(
              key: K,
              value: ComunicacionesFilters[K]
            ) => setFilter(key, value)}
            onResetFilters={resetFilters}
          />

          <section className="min-h-0 overflow-hidden border-r border-black/10 bg-white/75 backdrop-blur">
            <div className="flex h-12 items-center justify-between border-b border-black/10 px-3">
              <div>
                <div className="text-sm font-black text-[#111827]">Conversaciones</div>
                <div className="text-[11px] font-semibold text-[#64748b]">
                  {loading ? "Cargando..." : `${filteredConversations.length} encontradas`}
                </div>
              </div>
            </div>

            <div className="h-[calc(100%-48px)] overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-xs font-semibold text-[#64748b]">
                  Cargando conversaciones...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-xs font-semibold text-[#64748b]">
                  No hay conversaciones para esta carpeta.
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                    selected={selectedConversation?.id === conversation.id}
onClick={() => {
  if (selectedConversation?.id === conversation.id) return;

  selectConversation(conversation.id);
}}                  />
                ))
              )}
            </div>
          </section>
          <main className="flex min-h-0 min-w-0 flex-col bg-[#eef3f5]">
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="max-w-md rounded-[24px] border border-black/10 bg-white/80 p-6 text-center shadow-sm">
                  <MessageCircle size={34} className="mx-auto mb-3 text-[#4f7c90]" />
                  <h2 className="text-lg font-black text-[#111827]">
                    Seleccioná una conversación
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-[#64748b]">
                    Desde acá vas a poder tomar, responder, transferir, colaborar y analizar con IA.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-black/10 bg-white/85 px-4 backdrop-blur">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4f7c90] text-xs font-black text-white">
                      {getInitials(getComunicacionDisplayName(selectedConversation))}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-[#111827]">
                        {getComunicacionDisplayName(selectedConversation)}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold text-[#64748b]">
                        {selectedIsNiaConversation ? (
                          <>
                            <span>Interno</span>
                            <span>·</span>
                            <span>Asistente comercial</span>
                            <span>·</span>
                            <span>Chat privado</span>
                          </>
                        ) : (
                          <>
                            <span>{getComunicacionChannelLabel(selectedConversation.channel)}</span>
                            <span>·</span>
                            <span>
                              {getComunicacionEstadoGestionLabel(
                                selectedConversation.estado_gestion
                              )}
                            </span>
                            <span>·</span>
                            <span>{selectedConversation.assigned_full_name || "Sin asignar"}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!selectedIsNiaConversation && selectedConversation.can_take ? (
                      <button
                        type="button"
                        onClick={handleTakeConversation}
                        disabled={saving}
                        className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
                      >
                        <UserCheck size={14} />
                        Tomar conversación
                      </button>
                    ) : null}

                    {!selectedIsNiaConversation ? (
                      <button
                        type="button"
                        onClick={() => setModalMode("analisis-ia")}
                        disabled={aiAnalyzing}
                        className="flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                        title="Analizar con IA"
                      >
                        <Sparkles size={14} />
                        {aiAnalyzing ? "Analizando..." : "Analizar con IA"}
                      </button>
                    ) : null}

                    {!selectedIsNiaConversation ? (
                      <WindowBadge conversation={selectedConversation} />
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setModalMode("tags")}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#64748b] shadow-sm hover:bg-[#f8fafc] hover:text-[#111827]"
                      title="Etiquetas"
                    >
                      <Tag size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalMode("detalle")}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#64748b] shadow-sm hover:bg-[#f8fafc] hover:text-[#111827]"
                      title="Detalle"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                  {loadingMessages ? (
                    <div className="p-4 text-center text-xs font-semibold text-[#64748b]">
                      Cargando mensajes...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="rounded-[24px] border border-black/10 bg-white/80 p-5 text-center text-xs font-semibold text-[#64748b]">
                        Todavía no hay mensajes en esta conversación.
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          onOpenImage={setImagePreview}
                          onReply={setReplyToMessage}
                          onForward={setForwardMessageSource}
                          onDelete={handleDeleteMessage}
                          onReact={handleReactMessage}
                          onAiFeedback={handleCandeFeedback}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <ChatInput
                  selectedConversation={selectedConversation}
                  quickReplies={quickReplies}
                  saving={saving}
                  uploading={uploading}
                  replyToMessage={replyToMessage}
                  externalDraftText={externalDraftText}
                  onCancelReply={() => setReplyToMessage(null)}
                  onExternalDraftTextConsumed={() => setExternalDraftText("")}
                  onSend={handleSendMessage}
                  onOpenTemplateModal={() => setModalMode("enviar-template")}
                  onUseQuickReply={handleUseQuickReply}
                />
              </>
            )}
          </main>

          {selectedIsNiaConversation ? (
            <NiaRightPanel
  selectedConversation={selectedConversation}
  loading={loading}
  saving={saving}
  onRefresh={async () => {
    const ok = await useComunicacionesStore
      .getState()
      .runNiaCommercialAssistantDispatch(false);

    await loadComunicaciones(true);

    if (ok) {
      showToast("NIA actualizó la bandeja comercial.");
    } else {
      showToast("No se pudo actualizar la bandeja de NIA.", "error");
    }
  }}
  onOpenConfig={() => setModalMode("nia-config")}
  onOpenCommercialControl={() => openInternalModule("control-comercial-ia", "Control Comercial IA")}
  onSendDailyReport={async () => {
    const ok = await useComunicacionesStore
      .getState()
      .runNiaCommercialAssistantDispatch(true);

    await loadComunicaciones(true);

    if (ok) {
      showToast("NIA ejecutó la revisión y envió el reporte diario.");
    } else {
      showToast("No se pudo ejecutar el reporte diario de NIA.", "error");
    }
  }}
/>
          ) : (
            <ComunicacionesRightPanel
              selectedConversation={selectedConversation}
              notes={notes}
              saving={saving}
              aiAnalysis={aiAnalysis}
              aiAnalyzing={aiAnalyzing}
              onOpenAi={() => setModalMode("analisis-ia")}
              onSyncContacto={handleSyncContacto}
              onTakeConversation={handleTakeConversation}
              onTransfer={() => setModalMode("transferir")}
              onCollaborators={() => setModalMode("colaboradores")}
              onCloseOrReopen={handleCloseOrReopen}
              onRestore={handleRestore}
              onArchive={handleArchive}
              onTrash={handleTrash}
              onTags={() => setModalMode("tags")}
              onDeleteNote={handleDeleteNote}
              onAddNote={handleAddNote}
              onUseAiSuggestedResponse={handleUseAiSuggestedResponse}
              onSaveAiSummaryAsNote={handleSaveAiSummaryAsNote}
            />
          )}
        </div>
      </div>

      {modalMode === "nueva" ? (
        <NuevaConversacionModal
          profile={currentProfile}
          vendedores={vendedores}
          sucursales={sucursales}
          saving={saving}
          onClose={() => setModalMode(null)}
          onCreate={handleCreateConversation}
        />
      ) : null}

      {modalMode === "detalle" ? (
        <DetalleModal
          conversation={selectedConversation}
          notes={notes}
          vendedores={vendedores}
          sucursales={sucursales}
          saving={saving}
          onClose={() => setModalMode(null)}
          onUpdate={handleUpdateSelected}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
        />
      ) : null}

      {modalMode === "analisis-ia" ? (
        <AnalisisIAModal
          conversation={selectedConversation}
          aiAnalysis={aiAnalysis}
          aiAnalyzing={aiAnalyzing}
          aiError={aiError}
          onClose={() => setModalMode(null)}
          onAnalyze={handleAnalyzeAI}
          onUseSuggestedResponse={handleUseAiSuggestedResponse}
          onSaveSummaryAsNote={handleSaveAiSummaryAsNote}
        />
      ) : null}

      {modalMode === "tags" ? (
        <TagsModal
          conversation={selectedConversation}
          tags={tags}
          saving={saving}
          onClose={() => setModalMode(null)}
          onToggle={handleToggleTag}
        />
      ) : null}

      {modalMode === "quick-replies" ? (
        <QuickRepliesModal
          quickReplies={quickReplies}
          canManageComunicaciones={canManageComunicaciones}
          currentProfile={currentProfile}
          saving={saving}
          onClose={() => setModalMode(null)}
          onCreate={handleCreateQuickReply}
          onUpdate={handleUpdateQuickReply}
          onToggleActive={handleToggleQuickReplyActive}
        />
      ) : null}

      {modalMode === "templates" ? (
        <TemplatesModal templates={templates} onClose={() => setModalMode(null)} />
      ) : null}

      {modalMode === "enviar-template" ? (
        <EnviarTemplateModal
          conversation={selectedConversation}
          templates={templates}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSendTemplate={handleSendTemplate}
        />
      ) : null}

      {modalMode === "transferir" ? (
        <TransferirModal
          conversation={selectedConversation}
          vendedores={vendedores}
          saving={saving}
          onClose={() => setModalMode(null)}
          onTransfer={handleTransfer}
        />
      ) : null}

      {modalMode === "colaboradores" ? (
        <ColaboradoresModal
          conversation={selectedConversation}
          vendedores={vendedores}
          saving={saving}
          onClose={() => setModalMode(null)}
          onAdd={handleAddCollaborator}
          onRemove={handleRemoveCollaborator}
          onTransfer={handleTransfer}
        />
      ) : null}

      {modalMode === "nia-config" ? (
        <NiaConfigModal
          onClose={() => setModalMode(null)}
          onSaved={(message) => showToast(message)}
        
        />
      ) : null}

   {modalMode === "iapax-config" ? (
  <IapaxConfigModal
    onClose={() => setModalMode(null)}
    onSaved={(message) => showToast(message)}
  />
) : null}

      {forwardMessageSource ? (
        <div className="fixed inset-0 z-[245] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#111827]">Reenviar mensaje</h2>
                <p className="text-xs text-[#64748b]">Elegí la conversación destino.</p>
              </div>

              <button
                type="button"
                onClick={() => setForwardMessageSource(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid max-h-[420px] gap-2 overflow-auto">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleForwardMessage(conversation.id)}
                  className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-left text-xs hover:bg-white"
                >
                  <div className="font-black text-[#111827]">{getComunicacionDisplayName(conversation)}</div>
                  <div className="mt-1 font-semibold text-[#64748b]">
                    {conversation.telefono || conversation.email || conversation.channel}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <ImagePreviewModal image={imagePreview} onClose={() => setImagePreview(null)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}