import { useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCode2,
  MessageCircle,
  RefreshCcw,
  RotateCcw,
  Search,
  XCircle
} from "lucide-react";
import { create } from "zustand";
import { supabase } from "../../lib/supabase";
import { parseLiveConnectHtml } from "../../lib/liveConnectHtmlParser";

export type LiveContacto = {
  id: string;
  live_contact_id: string | null;
  importacion_id: string | null;
  nombre: string | null;
  apellidos: string | null;
  nombre_completo: string | null;
  avatar_url: string | null;
  email: string | null;
  celular: string | null;
  celular_normalizado: string | null;
  tipo_documento: string | null;
  documento: string | null;
  ciudad: string | null;
  genero: string | null;
  direccion: string | null;
  fecha_cumpleanos: string | null;
  pais: string | null;
  ubicacion: string | null;
  habeas_data: string | null;
  etiquetas: string | null;
  empresa: string | null;
  extra_1: string | null;
  extra_2: string | null;
  dinamicos: Record<string, unknown> | null;
  autoasignado: boolean;
  bloqueado: boolean;
  live_fecha_creado: string | null;
  live_fecha_editado: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  estado_vinculacion: string;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LiveConversacion = {
  id: string;
  live_conversation_id: string | null;
  importacion_id: string | null;
  etiqueta: string | null;
  canal_nombre: string | null;
  canal_tipo: string | null;
  live_contact_id: string | null;
  live_contacto_nombre: string | null;
  live_contacto_id: string | null;
  telefono: string | null;
  telefono_normalizado: string | null;
  empresa: string | null;
  live_fecha_creado: string | null;
  live_fecha_editado: string | null;
  live_fecha_finalizado: string | null;
  grupo: string | null;
  agente: string | null;
  pais: string | null;
  ips: string | null;
  browser: string | null;
  ultimo_mensaje: string | null;
  url_conversacion: string | null;
  html_importado: boolean;
  html_url_original: string | null;
  html_storage_path: string | null;
  html_raw: string | null;
  mensajes_parseados: number;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  estado_historial: string;
  retomada_at: string | null;
  retomada_by: string | null;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LiveMensaje = {
  id: string;
  live_conversation_id: string | null;
  live_conversacion_id: string | null;
  orden: number;
  fecha_mensaje: string | null;
  hora_texto: string | null;
  direction: string | null;
  sender_name: string | null;
  sender_role: string | null;
  content: string | null;
  message_type: string | null;
  media_url: string | null;
  media_filename: string | null;
  media_mime_type: string | null;
  media_storage_path: string | null;
  raw_html: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type HistorialLiveFilters = {
  search: string;
  estado: "todos" | "pendientes" | "retomadas" | "con_html" | "sin_html";
  diasSinActividad: "todos" | "15" | "30" | "60" | "90";
};

type ParseHtmlResult = {
  ok: boolean;
  parsedCount: number;
  message: string;
};

type ComunicacionesHistorialState = {
  loadingContactos: boolean;
  loadingHistorial: boolean;
  loadingMensajes: boolean;
  saving: boolean;
  parsingHtml: boolean;
  error: string | null;

  contactos: LiveContacto[];
  conversaciones: LiveConversacion[];
  mensajes: LiveMensaje[];

  selectedLiveConversationId: string | null;

  filters: HistorialLiveFilters;

  loadContactos: () => Promise<void>;
  loadHistorial: () => Promise<void>;
  loadMensajes: (liveConversationRowId: string) => Promise<void>;
  retomarConversacion: (liveConversationRowId: string) => Promise<{ ok: boolean; conversationId: string | null; message: string }>;
  parseHtmlConversacion: (liveConversationRowId: string) => Promise<ParseHtmlResult>;

  setFilter: <K extends keyof HistorialLiveFilters>(key: K, value: HistorialLiveFilters[K]) => void;
  resetFilters: () => void;
  selectLiveConversation: (id: string | null) => void;
  clearError: () => void;

  getFilteredContactos: () => LiveContacto[];
  getFilteredConversaciones: () => LiveConversacion[];
  getSelectedConversacion: () => LiveConversacion | null;
};

function normalizeError(error: unknown): string {
  if (!error) return "Ocurrió un error inesperado.";

  if (typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "");

    if (message.toLowerCase().includes("row-level security")) return "No tenés permisos para esta acción.";
    if (message.toLowerCase().includes("permission denied")) return "Permiso denegado por Supabase/RLS.";

    return message || "Ocurrió un error.";
  }

  return String(error);
}

function normalizeLiveMessageType(value: unknown): "text" | "image" | "audio" | "video" | "document" | "system" | "unknown" {
  const type = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (type === "text" || type === "texto") return "text";
  if (type === "image" || type === "imagen" || type === "jpg" || type === "jpeg" || type === "png" || type === "webp") return "image";
  if (type === "audio" || type === "mp3" || type === "ogg" || type === "wav" || type === "m4a") return "audio";
  if (type === "video" || type === "mp4" || type === "mov") return "video";
  if (type === "document" || type === "documento" || type === "file" || type === "archivo" || type === "pdf") return "document";
  if (type === "system" || type === "sistema") return "system";
  if (type === "unknown" || type === "desconocido") return "unknown";

  return "text";
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getDefaultFilters(): HistorialLiveFilters {
  return {
    search: "",
    estado: "todos",
    diasSinActividad: "todos"
  };
}

function isOlderThanDays(value: string | null | undefined, days: number): boolean {
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const diff = Date.now() - date.getTime();
  return diff >= days * 24 * 60 * 60 * 1000;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function normalizeContacto(row: Record<string, unknown>): LiveContacto {
  return {
    id: String(row.id),
    live_contact_id: (row.live_contact_id as string | null) || null,
    importacion_id: (row.importacion_id as string | null) || null,
    nombre: (row.nombre as string | null) || null,
    apellidos: (row.apellidos as string | null) || null,
    nombre_completo: (row.nombre_completo as string | null) || null,
    avatar_url: (row.avatar_url as string | null) || null,
    email: (row.email as string | null) || null,
    celular: (row.celular as string | null) || null,
    celular_normalizado: (row.celular_normalizado as string | null) || null,
    tipo_documento: (row.tipo_documento as string | null) || null,
    documento: (row.documento as string | null) || null,
    ciudad: (row.ciudad as string | null) || null,
    genero: (row.genero as string | null) || null,
    direccion: (row.direccion as string | null) || null,
    fecha_cumpleanos: (row.fecha_cumpleanos as string | null) || null,
    pais: (row.pais as string | null) || null,
    ubicacion: (row.ubicacion as string | null) || null,
    habeas_data: (row.habeas_data as string | null) || null,
    etiquetas: (row.etiquetas as string | null) || null,
    empresa: (row.empresa as string | null) || null,
    extra_1: (row.extra_1 as string | null) || null,
    extra_2: (row.extra_2 as string | null) || null,
    dinamicos: (row.dinamicos as Record<string, unknown> | null) || null,
    autoasignado: Boolean(row.autoasignado),
    bloqueado: Boolean(row.bloqueado),
    live_fecha_creado: (row.live_fecha_creado as string | null) || null,
    live_fecha_editado: (row.live_fecha_editado as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    estado_vinculacion: String(row.estado_vinculacion || "SIN_VINCULAR"),
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null,
    updated_by: (row.updated_by as string | null) || null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || "")
  };
}

function normalizeConversacion(row: Record<string, unknown>): LiveConversacion {
  return {
    id: String(row.id),
    live_conversation_id: (row.live_conversation_id as string | null) || null,
    importacion_id: (row.importacion_id as string | null) || null,
    etiqueta: (row.etiqueta as string | null) || null,
    canal_nombre: (row.canal_nombre as string | null) || null,
    canal_tipo: (row.canal_tipo as string | null) || null,
    live_contact_id: (row.live_contact_id as string | null) || null,
    live_contacto_nombre: (row.live_contacto_nombre as string | null) || null,
    live_contacto_id: (row.live_contacto_id as string | null) || null,
    telefono: (row.telefono as string | null) || null,
    telefono_normalizado: (row.telefono_normalizado as string | null) || null,
    empresa: (row.empresa as string | null) || null,
    live_fecha_creado: (row.live_fecha_creado as string | null) || null,
    live_fecha_editado: (row.live_fecha_editado as string | null) || null,
    live_fecha_finalizado: (row.live_fecha_finalizado as string | null) || null,
    grupo: (row.grupo as string | null) || null,
    agente: (row.agente as string | null) || null,
    pais: (row.pais as string | null) || null,
    ips: (row.ips as string | null) || null,
    browser: (row.browser as string | null) || null,
    ultimo_mensaje: (row.ultimo_mensaje as string | null) || null,
    url_conversacion: (row.url_conversacion as string | null) || null,
    html_importado: Boolean(row.html_importado),
    html_url_original: (row.html_url_original as string | null) || null,
    html_storage_path: (row.html_storage_path as string | null) || null,
    html_raw: (row.html_raw as string | null) || null,
    mensajes_parseados: Number(row.mensajes_parseados || 0),
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    estado_historial: String(row.estado_historial || "HISTORICO"),
    retomada_at: (row.retomada_at as string | null) || null,
    retomada_by: (row.retomada_by as string | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null,
    updated_by: (row.updated_by as string | null) || null,
    created_at: String(row.created_at || ""),
    updated_at: String(row.updated_at || "")
  };
}

function normalizeMensaje(row: Record<string, unknown>): LiveMensaje {
  return {
    id: String(row.id),
    live_conversation_id: (row.live_conversation_id as string | null) || null,
    live_conversacion_id: (row.live_conversacion_id as string | null) || null,
    orden: Number(row.orden || 0),
    fecha_mensaje: (row.fecha_mensaje as string | null) || null,
    hora_texto: (row.hora_texto as string | null) || null,
    direction: (row.direction as string | null) || null,
    sender_name: (row.sender_name as string | null) || null,
    sender_role: (row.sender_role as string | null) || null,
    content: (row.content as string | null) || null,
    message_type: (row.message_type as string | null) || null,
    media_url: (row.media_url as string | null) || null,
    media_filename: (row.media_filename as string | null) || null,
    media_mime_type: (row.media_mime_type as string | null) || null,
    media_storage_path: (row.media_storage_path as string | null) || null,
    raw_html: (row.raw_html as string | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_at: String(row.created_at || "")
  };
}

function getConversationHtmlUrl(conversation: LiveConversacion): string | null {
  return conversation.html_url_original || conversation.url_conversacion || null;
}

export const useComunicacionesHistorialStore = create<ComunicacionesHistorialState>((set, get) => ({
  loadingContactos: false,
  loadingHistorial: false,
  loadingMensajes: false,
  saving: false,
  parsingHtml: false,
  error: null,

  contactos: [],
  conversaciones: [],
  mensajes: [],

  selectedLiveConversationId: null,

  filters: getDefaultFilters(),

  loadContactos: async () => {
    set({ loadingContactos: true, error: null });

    const { data, error } = await supabase
      .from("comunicaciones_live_contactos")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(5000);

    if (error) {
      set({ loadingContactos: false, error: normalizeError(error) });
      return;
    }

    set({
      loadingContactos: false,
      contactos: ((data || []) as Record<string, unknown>[]).map(normalizeContacto)
    });
  },

  loadHistorial: async () => {
    set({ loadingHistorial: true, error: null });

    const { data, error } = await supabase
      .from("comunicaciones_live_conversaciones")
      .select("*")
      .order("live_fecha_editado", { ascending: false, nullsFirst: false })
      .limit(5000);

    if (error) {
      set({ loadingHistorial: false, error: normalizeError(error) });
      return;
    }

    const conversaciones = ((data || []) as Record<string, unknown>[]).map(normalizeConversacion);

    set({
      loadingHistorial: false,
      conversaciones,
      selectedLiveConversationId: get().selectedLiveConversationId || conversaciones[0]?.id || null
    });
  },

  loadMensajes: async (liveConversationRowId) => {
    set({ loadingMensajes: true, error: null, selectedLiveConversationId: liveConversationRowId });

    const selected = get().conversaciones.find((item) => item.id === liveConversationRowId);
    const liveConversationId = selected?.live_conversation_id || null;

    let query = supabase
      .from("comunicaciones_live_mensajes")
      .select("*")
      .order("orden", { ascending: true })
      .limit(2000);

    if (liveConversationId) {
      query = query.eq("live_conversation_id", liveConversationId);
    } else {
      query = query.eq("live_conversacion_id", liveConversationRowId);
    }

    const { data, error } = await query;

    if (error) {
      set({ loadingMensajes: false, error: normalizeError(error) });
      return;
    }

    set({
      loadingMensajes: false,
      mensajes: ((data || []) as Record<string, unknown>[]).map(normalizeMensaje)
    });
  },

  retomarConversacion: async (liveConversationRowId) => {
    set({ saving: true, error: null });

    const { data, error } = await supabase.rpc("retomar_live_conversacion", {
      p_live_conversation_row_id: liveConversationRowId
    });

    if (error) {
      const message = normalizeError(error);
      set({ saving: false, error: message });
      return { ok: false, conversationId: null, message };
    }

    const result = data as {
      ok?: boolean;
      conversation_id?: string | null;
      message?: string | null;
    } | null;

    const ok = Boolean(result?.ok);
    const conversationId = result?.conversation_id || null;
    const message = result?.message || (ok ? "Conversación retomada correctamente." : "No se pudo retomar la conversación.");

    await get().loadHistorial();

    set({ saving: false });

    return {
      ok,
      conversationId,
      message
    };
  },

  parseHtmlConversacion: async (liveConversationRowId) => {
    const selected = get().conversaciones.find((item) => item.id === liveConversationRowId) || null;

    if (!selected) {
      return {
        ok: false,
        parsedCount: 0,
        message: "No hay conversación seleccionada."
      };
    }

    const liveConversationId = selected.live_conversation_id;

    if (!liveConversationId) {
      return {
        ok: false,
        parsedCount: 0,
        message: "La conversación no tiene ID Live."
      };
    }

    const htmlUrl = getConversationHtmlUrl(selected);

    if (!htmlUrl && !selected.html_raw) {
      return {
        ok: false,
        parsedCount: 0,
        message: "La conversación no tiene URL de HTML ni HTML crudo guardado."
      };
    }

    set({ parsingHtml: true, error: null });

    try {
      let html = selected.html_raw || "";

      if (!html && htmlUrl) {
        const response = await fetch(htmlUrl);

        if (!response.ok) {
          throw new Error(`No se pudo descargar el HTML. Estado HTTP ${response.status}.`);
        }

        html = await response.text();
      }

      if (!html.trim()) {
        throw new Error("El HTML descargado está vacío.");
      }

   const parsedHtml = parseLiveConnectHtml(html) as unknown as {
  messages?: Array<{
    orden?: number;
    fecha_mensaje?: string | null;
    hora_texto?: string | null;
    direction?: string | null;
    sender_name?: string | null;
    sender_role?: string | null;
    content?: string | null;
    message_type?: string | null;
    media_url?: string | null;
    media_filename?: string | null;
    media_mime_type?: string | null;
    raw_html?: string | null;
    metadata?: Record<string, unknown>;
  }>;
  mensajes?: Array<{
    orden?: number;
    fecha_mensaje?: string | null;
    hora_texto?: string | null;
    direction?: string | null;
    sender_name?: string | null;
    sender_role?: string | null;
    content?: string | null;
    message_type?: string | null;
    media_url?: string | null;
    media_filename?: string | null;
    media_mime_type?: string | null;
    raw_html?: string | null;
    metadata?: Record<string, unknown>;
  }>;
};

const parsedMessages = parsedHtml.messages || parsedHtml.mensajes || [];

if (parsedMessages.length === 0) {

    
        await supabase
          .from("comunicaciones_live_conversaciones")
          .update({
            html_importado: true,
            html_raw: html,
            mensajes_parseados: 0,
            estado_historial: selected.estado_historial || "HISTORICO",
            metadata: {
              ...(selected.metadata || {}),
              html_parseado_at: new Date().toISOString(),
              html_parseado_sin_mensajes: true
            }
          })
          .eq("id", selected.id);

        await get().loadHistorial();
        await get().loadMensajes(selected.id);

        set({ parsingHtml: false });

        return {
          ok: true,
          parsedCount: 0,
          message: "HTML procesado, pero no se detectaron mensajes."
        };
      }

      const { error: deleteError } = await supabase
        .from("comunicaciones_live_mensajes")
        .delete()
        .eq("live_conversation_id", liveConversationId);

      if (deleteError) {
        throw deleteError;
      }

      const rowsToInsert = parsedMessages.map((message, index) => ({
  live_conversation_id: liveConversationId,
  live_conversacion_id: selected.id,
  orden: Number(message.orden || index + 1),
  fecha_mensaje: message.fecha_mensaje || null,
  hora_texto: message.hora_texto || null,
  direction: message.direction || "inbound",
  sender_name: message.sender_name || null,
  sender_role: message.sender_role || null,
  content: message.content || null,
  message_type: normalizeLiveMessageType(message.message_type),
  media_url: message.media_url || null,
  media_filename: message.media_filename || null,
  media_mime_type: message.media_mime_type || null,
  raw_html: message.raw_html || null,
  metadata: message.metadata || {}
}));

      const { error: insertError } = await supabase
        .from("comunicaciones_live_mensajes")
        .insert(rowsToInsert);

      if (insertError) {
        throw insertError;
      }

      const { error: updateError } = await supabase
        .from("comunicaciones_live_conversaciones")
        .update({
          html_importado: true,
          html_raw: html,
          mensajes_parseados: rowsToInsert.length,
          estado_historial: selected.estado_historial || "HISTORICO",
          metadata: {
            ...(selected.metadata || {}),
            html_parseado_at: new Date().toISOString(),
            mensajes_parseados: rowsToInsert.length
          }
        })
        .eq("id", selected.id);

      if (updateError) {
        throw updateError;
      }

      await get().loadHistorial();
      await get().loadMensajes(selected.id);

      set({ parsingHtml: false });

      return {
        ok: true,
        parsedCount: rowsToInsert.length,
        message: `HTML parseado correctamente. ${rowsToInsert.length} mensajes cargados.`
      };
    } catch (error) {
      const message = normalizeError(error);

      set({
        parsingHtml: false,
        error: message
      });

      return {
        ok: false,
        parsedCount: 0,
        message
      };
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value
      }
    }));
  },

  resetFilters: () => set({ filters: getDefaultFilters() }),

  selectLiveConversation: (id) => {
    set({ selectedLiveConversationId: id });
    if (id) void get().loadMensajes(id);
    else set({ mensajes: [] });
  },

  clearError: () => set({ error: null }),

  getFilteredContactos: () => {
    const { contactos, filters } = get();
    const search = normalizeText(filters.search);

    return contactos.filter((contacto) => {
      if (!search) return true;

      const haystack = normalizeText([
        contacto.nombre,
        contacto.apellidos,
        contacto.nombre_completo,
        contacto.celular,
        contacto.celular_normalizado,
        contacto.email,
        contacto.empresa,
        contacto.etiquetas,
        contacto.ciudad,
        contacto.pais
      ].join(" "));

      return haystack.includes(search);
    });
  },

  getFilteredConversaciones: () => {
    const { conversaciones, filters } = get();
    const search = normalizeText(filters.search);

    return conversaciones.filter((conversation) => {
      if (filters.estado === "pendientes" && Boolean(conversation.conversation_id)) return false;
      if (filters.estado === "retomadas" && !conversation.conversation_id) return false;
      if (filters.estado === "con_html" && !conversation.html_importado) return false;
      if (filters.estado === "sin_html" && conversation.html_importado) return false;

      if (filters.diasSinActividad !== "todos") {
        const days = Number(filters.diasSinActividad);
        const activityDate = conversation.live_fecha_editado || conversation.live_fecha_creado || conversation.updated_at;
        if (!isOlderThanDays(activityDate, days)) return false;
      }

      if (search) {
        const haystack = normalizeText([
          conversation.live_conversation_id,
          conversation.live_contact_id,
          conversation.live_contacto_nombre,
          conversation.telefono,
          conversation.telefono_normalizado,
          conversation.empresa,
          conversation.etiqueta,
          conversation.grupo,
          conversation.agente,
          conversation.pais,
          conversation.ultimo_mensaje,
          conversation.url_conversacion
        ].join(" "));

        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  },

  getSelectedConversacion: () => {
    const { selectedLiveConversationId, conversaciones } = get();
    return conversaciones.find((item) => item.id === selectedLiveConversationId) || get().getFilteredConversaciones()[0] || null;
  }
}));

type SelectOption = {
  value: string;
  label: string;
};

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "pendientes", label: "Pendientes" },
  { value: "retomadas", label: "Retomadas" },
  { value: "con_html", label: "Con HTML" },
  { value: "sin_html", label: "Sin HTML" }
];

const DIAS_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "15", label: "+15 días" },
  { value: "30", label: "+30 días" },
  { value: "60", label: "+60 días" },
  { value: "90", label: "+90 días" }
];

function openInternalModule(moduleId: string, title: string, params?: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent("nostur:open-internal", {
      detail: {
        moduleId,
        title,
        params
      }
    })
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate"
}: {
  label: string;
  value: number;
  icon: typeof MessageCircle;
  tone?: "slate" | "green" | "orange" | "blue";
}) {
  const className = {
    slate: "border-slate-200 bg-white text-slate-700",
    green: "border-green-200 bg-green-50 text-green-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700"
  }[tone];

  return (
    <div className={["rounded-[22px] border p-4 shadow-sm", className].join(" ")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{label}</span>
        <Icon size={17} />
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 rounded-xl px-3 text-[11px] font-black transition",
        active ? "bg-[#4f7c90] text-white shadow-sm" : "bg-white text-[#334155] shadow-sm hover:bg-[#f8fafc]"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ConversationCard({
  conversation,
  selected,
  onClick
}: {
  conversation: LiveConversacion;
  selected: boolean;
  onClick: () => void;
}) {
  const displayName = conversation.live_contacto_nombre || conversation.telefono || conversation.live_conversation_id || "Conversación sin nombre";
  const retomada = Boolean(conversation.conversation_id);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-[22px] border p-4 text-left shadow-sm transition",
        selected ? "border-[#4f7c90]/40 bg-[#4f7c90]/10" : "border-black/10 bg-white hover:shadow-md"
      ].join(" ")}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[#111827]">{displayName}</div>
          <div className="mt-1 text-[11px] font-bold text-[#64748b]">
            Editado: {formatDateTime(conversation.live_fecha_editado || conversation.updated_at)}
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-xl border px-2 py-1 text-[10px] font-black uppercase",
            retomada ? "border-green-200 bg-green-50 text-green-700" : "border-orange-200 bg-orange-50 text-orange-700"
          ].join(" ")}
        >
          {retomada ? "Retomada" : "Pendiente"}
        </span>
      </div>

      <div className="grid gap-1.5 text-[11px] font-bold text-[#475569]">
        <div className="truncate">Teléfono: {conversation.telefono || conversation.telefono_normalizado || "—"}</div>
        <div className="truncate">Agente: {conversation.agente || "—"}</div>
        <div className="truncate">Grupo: {conversation.grupo || "—"}</div>
        <div className="line-clamp-2">Último mensaje: {conversation.ultimo_mensaje || "—"}</div>
      </div>
    </button>
  );
}

function MessageRow({ message }: { message: LiveMensaje }) {
  const outbound = message.direction === "outbound" || message.direction === "agent";
  const system = message.direction === "system";

  if (system) {
    return (
      <div className="flex justify-center">
        <div className="rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-bold text-[#64748b]">
          {message.content || "Sistema"}
        </div>
      </div>
    );
  }

  return (
    <div className={["flex", outbound ? "justify-end" : "justify-start"].join(" ")}>
      <div
        className={[
          "max-w-[78%] rounded-2xl border px-3 py-2 text-xs shadow-sm",
          outbound ? "border-[#4f7c90]/20 bg-[#4f7c90] text-white" : "border-black/10 bg-white text-[#111827]"
        ].join(" ")}
      >
        <div className={["mb-1 text-[10px] font-black", outbound ? "text-white/75" : "text-[#64748b]"].join(" ")}>
          {message.sender_name || message.sender_role || message.direction || "Mensaje"} ·{" "}
          {formatDateTime(message.fecha_mensaje || message.created_at)}
        </div>

        {message.content ? <div className="whitespace-pre-wrap break-words leading-5">{message.content}</div> : null}

        {message.media_url ? (
          <a
            href={message.media_url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 rounded-xl bg-white/15 px-2 py-1 text-[11px] font-black underline"
          >
            <ExternalLink size={12} />
            {message.media_filename || "Ver archivo"}
          </a>
        ) : null}

        {!message.content && !message.media_url ? (
          <div className="italic opacity-70">Mensaje sin contenido visible</div>
        ) : null}
      </div>
    </div>
  );
}

export function ComunicacionesHistorialLivePanel() {
  const loadingHistorial = useComunicacionesHistorialStore((state) => state.loadingHistorial);
  const loadingMensajes = useComunicacionesHistorialStore((state) => state.loadingMensajes);
  const saving = useComunicacionesHistorialStore((state) => state.saving);
  const parsingHtml = useComunicacionesHistorialStore((state) => state.parsingHtml);
  const error = useComunicacionesHistorialStore((state) => state.error);
  const conversaciones = useComunicacionesHistorialStore((state) => state.conversaciones);
  const mensajes = useComunicacionesHistorialStore((state) => state.mensajes);
  const filters = useComunicacionesHistorialStore((state) => state.filters);

  const loadHistorial = useComunicacionesHistorialStore((state) => state.loadHistorial);
  const loadMensajes = useComunicacionesHistorialStore((state) => state.loadMensajes);
  const retomarConversacion = useComunicacionesHistorialStore((state) => state.retomarConversacion);
  const parseHtmlConversacion = useComunicacionesHistorialStore((state) => state.parseHtmlConversacion);
  const setFilter = useComunicacionesHistorialStore((state) => state.setFilter);
  const resetFilters = useComunicacionesHistorialStore((state) => state.resetFilters);
  const selectLiveConversation = useComunicacionesHistorialStore((state) => state.selectLiveConversation);
  const clearError = useComunicacionesHistorialStore((state) => state.clearError);
  const getFilteredConversaciones = useComunicacionesHistorialStore((state) => state.getFilteredConversaciones);
  const getSelectedConversacion = useComunicacionesHistorialStore((state) => state.getSelectedConversacion);

  const filteredConversaciones = getFilteredConversaciones();
  const selectedConversation = getSelectedConversacion();

  const metrics = useMemo(() => {
    const retomadas = conversaciones.filter((item) => item.conversation_id).length;
    const pendientes = conversaciones.length - retomadas;
    const conHtml = conversaciones.filter((item) => item.html_importado).length;

    return {
      total: conversaciones.length,
      retomadas,
      pendientes,
      conHtml
    };
  }, [conversaciones]);

  useEffect(() => {
    void loadHistorial();
  }, [loadHistorial]);

  useEffect(() => {
    if (selectedConversation?.id) {
      void loadMensajes(selectedConversation.id);
    }
  }, [selectedConversation?.id, loadMensajes]);

  async function handleRetomar() {
    if (!selectedConversation) return;

    const result = await retomarConversacion(selectedConversation.id);

    if (result.ok && result.conversationId) {
      openInternalModule("comunicaciones", "Comunicaciones", {
        conversationId: result.conversationId
      });
    }
  }

  async function handleParseHtml() {
    if (!selectedConversation) return;
    await parseHtmlConversacion(selectedConversation.id);
  }

  const selectedHtmlUrl = selectedConversation ? getConversationHtmlUrl(selectedConversation) : null;
  const canParseHtml = Boolean(selectedConversation && (selectedHtmlUrl || selectedConversation.html_raw));

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_22%_10%,rgba(79,124,144,0.12),transparent_28%),linear-gradient(135deg,#eef3f5,#dfe8ec_48%,#eef3f5)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-white/75 px-5 py-4 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#111827]">Historial Live</h1>
                <span className="rounded-xl bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#31596a]">
                  Live Connect
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                Conversaciones históricas importadas desde Live Connect para consultar, auditar y retomar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadHistorial()}
              disabled={loadingHistorial}
              className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
            >
              <RefreshCcw size={14} />
              {loadingHistorial ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Total historial" value={metrics.total} icon={MessageCircle} tone="blue" />
            <MetricCard label="Retomadas" value={metrics.retomadas} icon={CheckCircle2} tone="green" />
            <MetricCard label="Pendientes" value={metrics.pendientes} icon={XCircle} tone="orange" />
            <MetricCard label="Con HTML" value={metrics.conHtml} icon={Clock3} tone="slate" />
          </div>
        </header>

        {error ? (
          <div className="shrink-0 px-5 pt-4">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              <span>{error}</span>
              <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        <main className="grid min-h-0 flex-1 grid-cols-[380px_minmax(0,1fr)] overflow-hidden">
          <aside className="min-h-0 overflow-hidden border-r border-black/10 bg-white/60 p-4 backdrop-blur">
            <div className="mb-3 flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 shadow-sm">
              <Search size={15} className="text-[#64748b]" />
              <input
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
                placeholder="Buscar por nombre, teléfono, agente..."
                className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
              />
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {ESTADO_OPTIONS.map((option) => (
                <FilterButton
                  key={option.value}
                  active={filters.estado === option.value}
                  onClick={() => setFilter("estado", option.value as HistorialLiveFilters["estado"])}
                >
                  {option.label}
                </FilterButton>
              ))}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {DIAS_OPTIONS.map((option) => (
                <FilterButton
                  key={option.value}
                  active={filters.diasSinActividad === option.value}
                  onClick={() => setFilter("diasSinActividad", option.value as HistorialLiveFilters["diasSinActividad"])}
                >
                  {option.label}
                </FilterButton>
              ))}

              <button
                type="button"
                onClick={resetFilters}
                className="h-9 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
              >
                Limpiar
              </button>
            </div>

            <div className="h-[calc(100%-136px)] overflow-auto pr-1">
              {loadingHistorial ? (
                <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#64748b]">
                  Cargando historial Live...
                </div>
              ) : filteredConversaciones.length === 0 ? (
                <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#64748b]">
                  No hay conversaciones para este filtro.
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredConversaciones.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      selected={selectedConversation?.id === conversation.id}
                      onClick={() => selectLiveConversation(conversation.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-col bg-[#eef3f5]">
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="max-w-md rounded-[24px] border border-black/10 bg-white/80 p-6 text-center shadow-sm">
                  <MessageCircle size={34} className="mx-auto mb-3 text-[#4f7c90]" />
                  <h2 className="text-lg font-black text-[#111827]">Seleccioná una conversación</h2>
                  <p className="mt-1 text-xs font-semibold text-[#64748b]">
                    Desde acá vas a poder revisar el historial importado y retomarlo en Comunicaciones.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-white/85 px-5 py-4 backdrop-blur">
                  <div className="min-w-0">
                    <div className="truncate text-base font-black text-[#111827]">
                      {selectedConversation.live_contacto_nombre || selectedConversation.telefono || "Conversación Live"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#64748b]">
                      <span>ID: {selectedConversation.live_conversation_id || "—"}</span>
                      <span>·</span>
                      <span>Tel: {selectedConversation.telefono || selectedConversation.telefono_normalizado || "—"}</span>
                      <span>·</span>
                      <span>Agente: {selectedConversation.agente || "—"}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {selectedHtmlUrl ? (
                      <a
                        href={selectedHtmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                      >
                        <ExternalLink size={14} />
                        HTML
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleParseHtml}
                      disabled={!canParseHtml || parsingHtml}
                      className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileCode2 size={14} />
                      {parsingHtml ? "Parseando..." : "Parsear HTML"}
                    </button>

                    {selectedConversation.conversation_id ? (
                      <button
                        type="button"
                        onClick={() =>
                          openInternalModule("comunicaciones", "Comunicaciones", {
                            conversationId: selectedConversation.conversation_id
                          })
                        }
                        className="flex h-9 items-center gap-2 rounded-xl bg-green-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-green-700"
                      >
                        <CheckCircle2 size={14} />
                        Abrir chat
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRetomar}
                        disabled={saving}
                        className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
                      >
                        <RotateCcw size={14} />
                        {saving ? "Retomando..." : "Retomar"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid shrink-0 gap-3 border-b border-black/10 bg-white/55 p-4 text-xs md:grid-cols-4">
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-[#64748b]">Fecha creado</div>
                    <div className="mt-1 font-black text-[#111827]">{formatDateTime(selectedConversation.live_fecha_creado)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-[#64748b]">Fecha editado</div>
                    <div className="mt-1 font-black text-[#111827]">{formatDateTime(selectedConversation.live_fecha_editado)}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-[#64748b]">Mensajes parseados</div>
                    <div className="mt-1 font-black text-[#111827]">{selectedConversation.mensajes_parseados}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-3 shadow-sm">
                    <div className="text-[10px] font-black uppercase text-[#64748b]">Estado</div>
                    <div className="mt-1 font-black text-[#111827]">{selectedConversation.estado_historial}</div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
                  {loadingMensajes ? (
                    <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#64748b]">
                      Cargando mensajes...
                    </div>
                  ) : mensajes.length === 0 ? (
                    <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#64748b]">
                      Todavía no hay mensajes parseados para esta conversación.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {mensajes.map((message) => (
                        <MessageRow key={message.id} message={message} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}