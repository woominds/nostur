// @ts-nocheck

/* =========================================================
   NOSSIX / NOSTUR — cande-reply
   CANDE · Asistente de pasajeros por WhatsApp

   Versión:
   - Configurable desde CandePanel
   - Score desde cande_campos
   - Origen sugerido por código de área, pero NO confirmado automáticamente
   - Derivación controlada por configuración
   - Evita derivación falsa
   - Evita respuestas en inglés tipo "I'm sorry..."
   - Evita usar datos viejos si no están realmente confirmados
========================================================= */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CODE_VERSION = "cande-reply-configurable-v4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function normalizeForIntent(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getErrorMessage(error: unknown): string {
  if (!error) return "Error desconocido.";

  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Error desconocido.");
  }

  return String(error);
}

function nowIso() {
  return new Date().toISOString();
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey =
    Deno.env.get("NOSTUR_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl) throw new Error("Falta SUPABASE_URL.");
  if (!serviceRoleKey) throw new Error("Falta NOSTUR_SERVICE_ROLE_KEY o SUPABASE_SERVICE_ROLE_KEY.");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

function getEnvSupabaseUrl() {
  const value = Deno.env.get("SUPABASE_URL");
  if (!value) throw new Error("Falta SUPABASE_URL.");
  return value;
}

function getEnvServiceRoleKey() {
  const value =
    Deno.env.get("NOSTUR_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!value) throw new Error("Falta NOSTUR_SERVICE_ROLE_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  return value;
}

/* =========================================================
   CONFIG HELPERS
========================================================= */

function getConfigValue(config: any, key: string, fallback: string) {
  return cleanText(config?.[key]) || fallback;
}

function getConfigBoolean(config: any, key: string, fallback = false) {
  const value = config?.[key];

  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return fallback;

  const normalized = normalizeForIntent(String(value));

  if (["true", "t", "1", "si", "sí", "yes"].includes(normalized)) return true;
  if (["false", "f", "0", "no"].includes(normalized)) return false;

  return fallback;
}

function getConfigNumber(config: any, key: string, fallback = 0) {
  const parsed = Number(config?.[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getMarcaVisible(config: any) {
  return getConfigValue(config, "marca_visible", "ALMUNDO Franquicia Córdoba");
}

function getNombreIa(config: any) {
  return getConfigValue(config, "nombre_ia", "Cande");
}

function getMensajeInicial(config: any) {
  return getConfigValue(
    config,
    "mensaje_inicial",
    `Hola, soy ${getNombreIa(config)} de ${getMarcaVisible(config)} 😊 ¿En qué puedo ayudarte con tu viaje?`
  );
}

function getMensajeFaltaInfo(config: any) {
  return getConfigValue(
    config,
    "mensaje_falta_info",
    "Para ayudarte mejor, ¿me contás destino, fecha aproximada y cantidad de pasajeros?"
  );
}

function getMensajeNoEntiende(config: any) {
  return getConfigValue(
    config,
    "mensaje_no_entiende",
    "Perdón, no llegué a entender bien. ¿Me lo podés repetir con destino, fecha aproximada o tipo de viaje?"
  );
}

function getMensajeFueraHorario(config: any) {
  return getConfigValue(
    config,
    "mensaje_fuera_horario",
    "Gracias por escribirnos 😊 En este momento el equipo no está disponible, pero puedo tomar tus datos para que un asesor te responda apenas pueda."
  );
}

function getMensajeDerivacion(config: any) {
  return getConfigValue(
    config,
    "mensaje_despedida",
    "Genial, te paso con un asesor del equipo que ya va a tener tu información. ¡Gracias!"
  );
}

/* =========================================================
   PAYLOAD HELPERS
========================================================= */

function getConversationId(payload: any): string | null {
  return (
    cleanText(payload.conversation_id) ||
    cleanText(payload.conversacion_id) ||
    cleanText(payload.context?.conversation_id) ||
    cleanText(payload.context?.conversacion_id) ||
    null
  );
}

function getInboundMessageId(payload: any): string | null {
  return (
    cleanText(payload.inbound_message_id) ||
    cleanText(payload.mensaje_id) ||
    cleanText(payload.message_id) ||
    cleanText(payload.context?.inbound_message_id) ||
    cleanText(payload.context?.mensaje_id) ||
    null
  );
}

function getOportunidadId(payload: any): string | null {
  return (
    cleanText(payload.oportunidad_id) ||
    cleanText(payload.context?.oportunidad_id) ||
    null
  );
}

/* =========================================================
   FORMATTERS
========================================================= */

function formatJson(value: unknown): string {
  if (!value) return "—";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatList(value: unknown): string {
  if (!value) return "—";

  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((item) => `- ${cleanText(item) || formatJson(item)}`).join("\n");
  }

  if (typeof value === "object") {
    return formatJson(value);
  }

  return cleanText(value) || "—";
}

function formatRowsForPrompt(rows: any[], fallback = "—"): string {
  if (!rows || rows.length === 0) return fallback;

  return rows
    .map((row, index) => {
      const nombre =
        cleanText(row.nombre) ||
        cleanText(row.titulo) ||
        cleanText(row.keyword) ||
        cleanText(row.palabra) ||
        cleanText(row.clave) ||
        cleanText(row.campo) ||
        `Item ${index + 1}`;

      const descripcion =
        cleanText(row.descripcion) ||
        cleanText(row.respuesta) ||
        cleanText(row.valor) ||
        cleanText(row.prompt) ||
        cleanText(row.texto) ||
        cleanText(row.etiqueta) ||
        "";

      const extra = Object.entries(row || {})
        .filter(
          ([key]) =>
            ![
              "id",
              "created_at",
              "updated_at",
              "nombre",
              "titulo",
              "keyword",
              "palabra",
              "clave",
              "campo",
              "descripcion",
              "respuesta",
              "valor",
              "prompt",
              "texto",
              "etiqueta"
            ].includes(key)
        )
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : cleanText(value)}`)
        .filter((item) => cleanText(item))
        .join(" · ");

      return `- ${nombre}${descripcion ? `: ${descripcion}` : ""}${extra ? ` (${extra})` : ""}`;
    })
    .join("\n");
}

function formatMessageForPrompt(message: any): string {
  const direction =
    message.direction === "in" || message.direction === "inbound"
      ? "PASAJERO"
      : message.sender_kind === "cande"
        ? "CANDE"
        : "ASESOR";

  const type = cleanText(message.type) || "text";
  const text = cleanText(message.text) || `[${type}]`;
  const at = cleanText(message.wa_timestamp || message.created_at);

  return `[${at}] ${direction}: ${text}`;
}

function normalizeWhatsappText(text: string): string {
  return cleanText(text)
    .replace(/\*\*/g, "")
    .replace(/^#+\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* =========================================================
   MESSAGE HELPERS
========================================================= */

function isInbound(message: any) {
  return message?.direction === "in" || message?.direction === "inbound";
}

function isOutbound(message: any) {
  return message?.direction === "out" || message?.direction === "outbound";
}

function isGreetingOnly(text: string): boolean {
  const normalized = normalizeForIntent(text);

  return [
    "hola",
    "holi",
    "holis",
    "holaa",
    "holaaa",
    "buen dia",
    "buenas",
    "buenas tardes",
    "buenas noches",
    "hello",
    "hi"
  ].includes(normalized);
}

/* =========================================================
   LOADERS
========================================================= */

async function loadCandeConfig(params: { supabase: any }) {
  const { data, error } = await params.supabase
    .from("cande_config")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadCandeCampos(params: { supabase: any }) {
  const { data, error } = await params.supabase
    .from("cande_campos")
    .select("*")
    .order("orden", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[cande-reply] No se pudieron leer cande_campos:", error.message);
    return [];
  }

  return data || [];
}

async function loadCandeFaqs(params: { supabase: any }) {
  const { data, error } = await params.supabase
    .from("cande_faqs")
    .select("*")
    .order("orden", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(80);

  if (error) {
    console.error("[cande-reply] No se pudieron leer cande_faqs:", error.message);
    return [];
  }

  return data || [];
}

async function loadCandePalabrasClave(params: { supabase: any }) {
  const { data, error } = await params.supabase
    .from("cande_palabras_clave")
    .select("*")
    .order("peso", { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) {
    console.error("[cande-reply] No se pudieron leer cande_palabras_clave:", error.message);
    return [];
  }

  return data || [];
}

async function loadCandeAreaCodes(params: { supabase: any }) {
  const { data, error } = await params.supabase
    .from("v_cande_area_codes_activos")
    .select("*")
    .eq("es_origen_sugerible", true)
    .order("prioridad", { ascending: true })
    .order("area_code", { ascending: false });

  if (error) {
    console.error("[cande-reply] No se pudieron leer cande_area_codes:", error.message);
    return [];
  }

  return data || [];
}

async function loadConversation(params: {
  supabase: any;
  conversationId: string;
}) {
  const { data, error } = await params.supabase
    .from("conversaciones")
    .select("*")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadOpportunity(params: {
  supabase: any;
  conversationId: string;
  oportunidadId?: string | null;
}) {
  let query = params.supabase.from("lead_oportunidades").select("*");

  if (params.oportunidadId) {
    query = query.eq("id", params.oportunidadId);
  } else {
    query = query.eq("conversacion_id", params.conversationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadMessages(params: {
  supabase: any;
  conversationId: string;
}) {
  const { data, error } = await params.supabase
    .from("mensajes")
    .select("id,direction,sender_kind,type,text,status,error,wa_message_id,wa_timestamp,created_at,deleted_at")
    .eq("conversacion_id", params.conversationId)
    .is("deleted_at", null)
    .order("wa_timestamp", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(35);

  if (error) throw error;

  return (data || []).slice().reverse();
}

async function loadInboundMessage(params: {
  supabase: any;
  inboundMessageId: string | null;
}) {
  if (!params.inboundMessageId) return null;

  const { data, error } = await params.supabase
    .from("mensajes")
    .select("*")
    .eq("id", params.inboundMessageId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

/* =========================================================
   CANDE_RUNS
========================================================= */

async function createRun(params: {
  supabase: any;
  conversationId: string | null;
  oportunidadId: string | null;
  inboundMessageId: string | null;
  payload: any;
}) {
  const { data, error } = await params.supabase
    .from("cande_runs")
    .insert({
      conversation_id: params.conversationId,
      oportunidad_id: params.oportunidadId,
      inbound_message_id: params.inboundMessageId,
      source: cleanText(params.payload?.source) || "cande-reply",
      status: "started",
      request_payload: params.payload || {},
      response_payload: {
        code_version: CODE_VERSION
      }
    })
    .select("id")
    .single();

  if (error) {
    console.error("[cande-reply] No se pudo crear cande_runs:", error.message);
    return null;
  }

  return data?.id || null;
}

async function finishRun(params: {
  supabase: any;
  runId: string | null;
  status: string;
  reason?: string | null;
  outboundMessageId?: string | null;
  responsePayload?: any;
  error?: string | null;
}) {
  if (!params.runId) return;

  const { error } = await params.supabase
    .from("cande_runs")
    .update({
      status: params.status,
      reason: params.reason || null,
      outbound_message_id: params.outboundMessageId || null,
      response_payload: {
        code_version: CODE_VERSION,
        ...(params.responsePayload || {})
      },
      error: params.error || null,
      finished_at: nowIso()
    })
    .eq("id", params.runId);

  if (error) {
    console.error("[cande-reply] No se pudo cerrar cande_runs:", error.message);
  }
}

/* =========================================================
   AREA CODES / ORIGEN SUGERIDO
========================================================= */

function normalizeArgentinaPhoneForAreaCode(phone: string): string {
  let digits = cleanText(phone).replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("549")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("54")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("15")) {
    digits = digits.slice(2);
  }

  return digits;
}

function detectSuggestedOriginFromPhone(params: {
  waPhone: string;
  areaCodes: any[];
}) {
  const normalizedPhone = normalizeArgentinaPhoneForAreaCode(params.waPhone);

  if (!normalizedPhone) return null;

  const orderedAreaCodes = [...(params.areaCodes || [])].sort((a, b) => {
    const aCode = cleanText(a.area_code);
    const bCode = cleanText(b.area_code);

    if (bCode.length !== aCode.length) return bCode.length - aCode.length;

    return Number(a.prioridad || 100) - Number(b.prioridad || 100);
  });

  const match = orderedAreaCodes.find((item) => {
    const areaCode = cleanText(item.area_code);
    return areaCode && normalizedPhone.startsWith(areaCode);
  });

  if (!match) return null;

  return {
    area_code: cleanText(match.area_code),
    ciudad: cleanText(match.ciudad),
    provincia: cleanText(match.provincia),
    pais: cleanText(match.pais) || "Argentina",
    aeropuerto_codigo: cleanText(match.aeropuerto_codigo),
    aeropuerto_nombre: cleanText(match.aeropuerto_nombre)
  };
}

function applySuggestedOriginToDatos(params: {
  datos: Record<string, unknown>;
  suggestedOrigin: any | null;
}) {
  const datos = params.datos || {};
  const suggestedOrigin = params.suggestedOrigin;

  if (!suggestedOrigin?.ciudad) return datos;

  const alreadyHasConfirmedOrigin =
    cleanText(datos.origen) && datos.origen_confirmado === true;

  if (alreadyHasConfirmedOrigin) {
    return {
      ...datos,
      origen_confirmado: true
    };
  }

  return {
    ...datos,
    origen_sugerido: suggestedOrigin.ciudad,
    origen_sugerido_area_code: suggestedOrigin.area_code || null,
    origen_sugerido_provincia: suggestedOrigin.provincia || null,
    origen_sugerido_aeropuerto: suggestedOrigin.aeropuerto_codigo || null,
    origen_sugerido_aeropuerto_nombre: suggestedOrigin.aeropuerto_nombre || null,
    origen_confirmado: false,
    origen: ""
  };
}

function inboundExplicitlyMentionsOrigin(text: string) {
  const inbound = normalizeForIntent(text);

  return (
    inbound.includes("desde ") ||
    inbound.includes("salgo desde") ||
    inbound.includes("salimos desde") ||
    inbound.includes("saliendo desde") ||
    inbound.includes("parto desde") ||
    inbound.includes("partimos desde")
  );
}

function inboundConfirmsSuggestedOrigin(text: string) {
  const inbound = normalizeForIntent(text);

  return (
    inbound === "si" ||
    inbound === "sí" ||
    inbound === "sisi" ||
    inbound === "dale" ||
    inbound === "correcto" ||
    inbound === "exacto" ||
    inbound === "asi es" ||
    inbound === "sí, correcto" ||
    inbound.includes("si desde ahi") ||
    inbound.includes("si desde alli") ||
    inbound.includes("si desde esa") ||
    inbound.includes("si salimos desde") ||
    inbound.includes("si salgo desde")
  );
}

function detectOriginConfirmationFromInbound(params: {
  inboundText: string;
  datos: Record<string, unknown>;
}) {
  const inbound = normalizeForIntent(params.inboundText);
  const datos = params.datos || {};
  const origenSugerido = cleanText(datos.origen_sugerido);

  if (!origenSugerido) return datos;

  const suggestedNormalized = normalizeForIntent(origenSugerido);

  const confirmsSuggested =
    inboundConfirmsSuggestedOrigin(params.inboundText) ||
    inbound.includes(`desde ${suggestedNormalized}`);

  if (!confirmsSuggested) {
    return {
      ...datos,
      origen_confirmado: cleanText(datos.origen) && datos.origen_confirmado === true
    };
  }

  return {
    ...datos,
    origen: origenSugerido,
    origen_aeropuerto: cleanText(datos.origen_sugerido_aeropuerto) || null,
    origen_confirmado: true
  };
}

/* =========================================================
   GATE
========================================================= */

function shouldCandeReply(params: {
  config: any;
  conversation: any;
  opportunity: any;
  messages: any[];
  inboundMessage: any | null;
}) {
  const config = params.config || {};
  const conversation = params.conversation;
  const opportunity = params.opportunity;
  const messages = params.messages || [];
  const inboundMessage = params.inboundMessage;

  if (!getConfigBoolean(config, "enabled", true)) {
    return {
      ok: false,
      reason: "cande_config_disabled"
    };
  }

  if (cleanText(config.modo) === "apagada") {
    return {
      ok: false,
      reason: "cande_mode_off"
    };
  }

  if (!conversation?.id) {
    return {
      ok: false,
      reason: "conversation_not_found"
    };
  }

  if (conversation.deleted_at || conversation.archived_at || conversation.closed_at || conversation.status === "closed") {
    return {
      ok: false,
      reason: "conversation_closed_or_archived"
    };
  }

  if (!opportunity?.id) {
    return {
      ok: false,
      reason: "opportunity_not_found"
    };
  }

  if (opportunity.cande_activa !== true) {
    return {
      ok: false,
      reason: "cande_not_active_for_opportunity"
    };
  }

  if (inboundMessage && !isInbound(inboundMessage)) {
    return {
      ok: false,
      reason: "message_is_not_inbound"
    };
  }

  const lastInbound = [...messages].reverse().find((message) => isInbound(message));
  const lastOutbound = [...messages].reverse().find((message) => isOutbound(message));

  if (!lastInbound?.id) {
    return {
      ok: false,
      reason: "no_inbound_message"
    };
  }

  const inboundDate = new Date(lastInbound.wa_timestamp || lastInbound.created_at || 0).getTime();
  const outboundDate = lastOutbound
    ? new Date(lastOutbound.wa_timestamp || lastOutbound.created_at || 0).getTime()
    : 0;

  if (lastOutbound?.sender_kind === "cande" && outboundDate >= inboundDate) {
    return {
      ok: false,
      reason: "cande_already_replied_after_last_inbound"
    };
  }

  if (lastOutbound && outboundDate >= inboundDate) {
    return {
      ok: false,
      reason: "human_or_agent_already_replied_after_last_inbound"
    };
  }

  return {
    ok: true,
    reason: "cande_active"
  };
}

/* =========================================================
   DERIVACIÓN
========================================================= */

function shouldDeriveByMessage(params: {
  config: any;
  messages: any[];
  inboundMessage: any | null;
  score?: number;
  missingRequiredFields?: any[];
}) {
  const config = params.config || {};
  const inboundText = normalizeForIntent(params.inboundMessage?.text || "");

  const wantsHuman =
    inboundText.includes("asesor") ||
    inboundText.includes("humano") ||
    inboundText.includes("vendedor") ||
    inboundText.includes("agente") ||
    inboundText.includes("llamen") ||
    inboundText.includes("llamar") ||
    inboundText.includes("quiero hablar") ||
    inboundText.includes("hablar con alguien") ||
    inboundText.includes("pasame con alguien") ||
    inboundText.includes("pasame con un asesor") ||
    inboundText.includes("pasame con una persona") ||
    inboundText.includes("quiero hablar con una persona") ||
    inboundText.includes("derivame") ||
    inboundText.includes("que me atienda alguien");

  if (getConfigBoolean(config, "derivar_si_pide_humano", true) && wantsHuman) {
    return {
      shouldDerive: true,
      reason: "passenger_requested_human"
    };
  }

  const urgent =
    inboundText.includes("urgente") ||
    inboundText.includes("emergencia") ||
    inboundText.includes("viajo hoy") ||
    inboundText.includes("viajo manana") ||
    inboundText.includes("viajo mañana") ||
    inboundText.includes("necesito emitir") ||
    inboundText.includes("necesito reservar ya");

  if (getConfigBoolean(config, "derivar_si_urgente", false) && urgent) {
    return {
      shouldDerive: true,
      reason: "urgent_request"
    };
  }

  const score = Number(params.score || 0);
  const threshold = getConfigNumber(config, "umbral_transferencia", 0);
  const missingRequiredFields = params.missingRequiredFields || [];
  const deriveByScore = getConfigBoolean(config, "derivar_si_score_supera_umbral", false);

  if (
    deriveByScore &&
    threshold > 0 &&
    score >= threshold &&
    missingRequiredFields.length === 0
  ) {
    return {
      shouldDerive: true,
      reason: "score_threshold_reached_with_required_fields_complete"
    };
  }

  return {
    shouldDerive: false,
    reason: null
  };
}

/* =========================================================
   DATA EXTRACTION
========================================================= */

function parseJsonObjectFromText(text: string): any {
  const clean = cleanText(text);

  if (!clean) return {};

  try {
    return JSON.parse(clean);
  } catch {
    // continúa abajo
  }

  const match = clean.match(/\{[\s\S]*\}/);

  if (!match) return {};

  try {
    return JSON.parse(match[0]);
  } catch {
    return {};
  }
}

function normalizeDetectedLeadData(value: any) {
  const detected = value && typeof value === "object" ? value : {};
  const result: Record<string, unknown> = {};

  const nombre = cleanText(detected.nombre);
  const destino = cleanText(detected.destino);

  const origen =
    cleanText(detected.origen) ||
    cleanText(detected.ciudad_origen) ||
    cleanText(detected.salida_desde);

  const fechasTentativas =
    cleanText(detected.fechas_tentativas) ||
    cleanText(detected.fecha) ||
    cleanText(detected.fechas) ||
    cleanText(detected.mes) ||
    cleanText(detected.fecha_aproximada);

  const cantidadPasajeros =
    cleanText(detected.cantidad_pasajeros) ||
    cleanText(detected.pax) ||
    cleanText(detected.pasajeros) ||
    cleanText(detected.personas) ||
    cleanText(detected.cantidad_personas);

  const presupuestoAproximado =
    cleanText(detected.presupuesto_aproximado) ||
    cleanText(detected.presupuesto) ||
    cleanText(detected.budget);

  const tipoViaje =
    cleanText(detected.tipo_viaje) ||
    cleanText(detected.tipo_de_viaje);

  if (nombre) result.nombre = nombre;
  if (destino) result.destino = destino;
  if (origen) result.origen = origen;
  if (fechasTentativas) result.fechas_tentativas = fechasTentativas;
  if (cantidadPasajeros) result.cantidad_pasajeros = cantidadPasajeros;
  if (presupuestoAproximado) result.presupuesto_aproximado = presupuestoAproximado;
  if (tipoViaje) result.tipo_viaje = tipoViaje;

  return result;
}

function detectSimpleTravelDataFromText(text: string) {
  const raw = cleanText(text);
  const normalized = normalizeForIntent(raw);

  const detected: Record<string, unknown> = {};

  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "setiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  const month = months.find((item) => normalized.includes(item));

  if (month) {
    detected.fechas_tentativas = month === "setiembre" ? "septiembre" : month;
  }

  if (
    normalized.includes("primer quincena") ||
    normalized.includes("primera quincena") ||
    normalized.includes("1 quincena")
  ) {
    detected.fechas_tentativas = detected.fechas_tentativas
      ? `primera quincena de ${detected.fechas_tentativas}`
      : "primera quincena";
  }

  if (
    normalized.includes("segunda quincena") ||
    normalized.includes("2 quincena")
  ) {
    detected.fechas_tentativas = detected.fechas_tentativas
      ? `segunda quincena de ${detected.fechas_tentativas}`
      : "segunda quincena";
  }

  const numberWords: Record<string, string> = {
    uno: "1",
    una: "1",
    dos: "2",
    tres: "3",
    cuatro: "4",
    cinco: "5",
    seis: "6",
    siete: "7",
    ocho: "8",
    nueve: "9",
    diez: "10"
  };

  const paxPatterns = [
    /somos\s+(\d+)/i,
    /somos\s+(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/i,
    /viajamos\s+(\d+)/i,
    /viajamos\s+(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)/i,
    /(\d+)\s+adultos?/i,
    /(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+adultos?/i,
    /(\d+)\s+personas?/i,
    /(uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+personas?/i,
    /(\d+)\s+pax/i
  ];

  for (const pattern of paxPatterns) {
    const match = raw.match(pattern);

    if (match?.[1]) {
      const value = normalizeForIntent(match[1]);
      const number = numberWords[value] || value;
      detected.cantidad_pasajeros = raw.toLowerCase().includes("adult")
        ? `${number} adultos`
        : number;
      break;
    }
  }

  const knownDestinations = [
    { key: "buzios", value: "Buzios" },
    { key: "búzios", value: "Buzios" },
    { key: "natal", value: "Natal" },
    { key: "rio", value: "Río de Janeiro" },
    { key: "río", value: "Río de Janeiro" },
    { key: "maceio", value: "Maceió" },
    { key: "maceió", value: "Maceió" },
    { key: "punta cana", value: "Punta Cana" },
    { key: "cancun", value: "Cancún" },
    { key: "cancún", value: "Cancún" },
    { key: "europa", value: "Europa" },
    { key: "caribe", value: "Caribe" },
    { key: "miami", value: "Miami" },
    { key: "florianopolis", value: "Florianópolis" },
    { key: "florianópolis", value: "Florianópolis" },
    { key: "aruba", value: "Aruba" },
    { key: "panama", value: "Panamá" },
    { key: "panamá", value: "Panamá" },
    { key: "cartagena", value: "Cartagena" }
  ];

  const destination = knownDestinations.find((item) =>
    normalized.includes(normalizeForIntent(item.key))
  );

  if (destination) {
    detected.destino = destination.value;
  }

  const originPatterns = [
    /desde\s+([a-záéíóúñ\s]+?)(?:,|\.|$)/i,
    /salgo\s+desde\s+([a-záéíóúñ\s]+?)(?:,|\.|$)/i,
    /salimos\s+desde\s+([a-záéíóúñ\s]+?)(?:,|\.|$)/i,
    /saliendo\s+desde\s+([a-záéíóúñ\s]+?)(?:,|\.|$)/i,
    /parto\s+desde\s+([a-záéíóúñ\s]+?)(?:,|\.|$)/i,
    /partimos\s+desde\s+([a-záéíóúñ\s]+?)(?:,|\.|$)/i
  ];

  for (const pattern of originPatterns) {
    const match = raw.match(pattern);

    if (match?.[1]) {
      detected.origen = cleanText(match[1]);
      detected.origen_confirmado = true;
      break;
    }
  }

  const budgetMatch =
    raw.match(/(\d+[\.\,\d]*)\s*(usd|dolares|dólares|u\$d|us\$|pesos|ars)/i) ||
    raw.match(/(usd|dolares|dólares|u\$d|us\$|pesos|ars)\s*(\d+[\.\,\d]*)/i);

  if (budgetMatch) {
    detected.presupuesto_aproximado = raw;
  }

  return detected;
}

/* =========================================================
   SCORE / REQUIRED FIELDS
========================================================= */

function calculateKeywordScore(params: {
  palabrasClave: any[];
  inboundText: string;
}) {
  const inbound = normalizeForIntent(params.inboundText);
  let score = 0;

  for (const item of params.palabrasClave || []) {
    const palabra = normalizeForIntent(cleanText(item.palabra || item.keyword || item.clave));

    if (!palabra) continue;

    if (inbound.includes(palabra)) {
      score += Number(item.peso || 0);
    }
  }

  return score;
}

function calculateOpportunityScore(params: {
  campos: any[];
  datos: Record<string, unknown>;
  keywordScore?: number;
}) {
  const campos = params.campos || [];
  const datos = params.datos || {};

  let score = Number(params.keywordScore || 0);

  for (const campo of campos) {
    const clave = cleanText(campo.clave);
    const peso = Number(campo.peso || 0);

    if (!clave || !peso) continue;

    if (clave === "origen") {
      if (cleanText(datos.origen) && datos.origen_confirmado === true) {
        score += peso;
      }

      continue;
    }

    const value = datos[clave];

    if (value !== null && value !== undefined && cleanText(value)) {
      score += peso;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getMissingRequiredFields(params: {
  campos: any[];
  datos: Record<string, unknown>;
}) {
  const campos = params.campos || [];
  const datos = params.datos || {};

  return campos
    .filter((campo) => campo.requerido === true)
    .filter((campo) => {
      const clave = cleanText(campo.clave);
      if (!clave) return false;

      if (clave === "origen") {
        return !(cleanText(datos.origen) && datos.origen_confirmado === true);
      }

      return !cleanText(datos[clave]);
    })
    .map((campo) => ({
      clave: cleanText(campo.clave),
      etiqueta: cleanText(campo.etiqueta) || cleanText(campo.clave),
      pregunta_sugerida: cleanText(campo.pregunta_sugerida)
    }));
}

/* =========================================================
   ANALYZE LEAD
========================================================= */

async function analyzeLeadDataFromInbound(params: {
  config: any;
  campos: any[];
  palabrasClave: any[];
  conversation: any;
  opportunity: any;
  inboundMessage: any | null;
  areaCodes: any[];
}) {
  const inboundText = cleanText(params.inboundMessage?.text);

  const currentDatos =
    params.opportunity?.datos && typeof params.opportunity.datos === "object"
      ? params.opportunity.datos
      : {};

  let baseDatos: Record<string, unknown> = {
    ...currentDatos,

    nombre:
      cleanText(currentDatos.nombre) ||
      cleanText(currentDatos.contacto_nombre) ||
      cleanText(currentDatos.pasajero) ||
      cleanText(params.conversation?.titulo) ||
      cleanText(params.conversation?.wa_phone) ||
      "Sin nombre",

    contacto_nombre:
      cleanText(currentDatos.contacto_nombre) ||
      cleanText(currentDatos.nombre) ||
      cleanText(currentDatos.pasajero) ||
      cleanText(params.conversation?.titulo) ||
      cleanText(params.conversation?.wa_phone) ||
      "Sin nombre",

    pasajero:
      cleanText(currentDatos.pasajero) ||
      cleanText(currentDatos.nombre) ||
      cleanText(currentDatos.contacto_nombre) ||
      cleanText(params.conversation?.titulo) ||
      cleanText(params.conversation?.wa_phone) ||
      "Sin nombre",

    telefono:
      cleanText(currentDatos.telefono) ||
      cleanText(currentDatos.wa_phone) ||
      cleanText(params.conversation?.wa_phone) ||
      "",

    wa_phone:
      cleanText(currentDatos.wa_phone) ||
      cleanText(currentDatos.telefono) ||
      cleanText(params.conversation?.wa_phone) ||
      "",

    ultimo_mensaje: inboundText || cleanText(currentDatos.ultimo_mensaje) || null,
    origen_livenos: true,
    conversation_id: params.conversation?.id || params.opportunity?.conversacion_id || null
  };

  const suggestedOrigin = detectSuggestedOriginFromPhone({
    waPhone: cleanText(params.conversation?.wa_phone) || cleanText(baseDatos.wa_phone),
    areaCodes: params.areaCodes
  });

  baseDatos = applySuggestedOriginToDatos({
    datos: baseDatos,
    suggestedOrigin
  });

  baseDatos = detectOriginConfirmationFromInbound({
    inboundText,
    datos: baseDatos
  });

  if (!inboundText || isGreetingOnly(inboundText)) {
    const keywordScore = calculateKeywordScore({
      palabrasClave: params.palabrasClave,
      inboundText
    });

    const score = calculateOpportunityScore({
      campos: params.campos,
      datos: baseDatos,
      keywordScore
    });

    const missingRequiredFields = getMissingRequiredFields({
      campos: params.campos,
      datos: baseDatos
    });

    return {
      detected_data: {},
      suggested_origin: suggestedOrigin,
      missing_required_fields: missingRequiredFields,
      datos: baseDatos,
      score,
      keyword_score: keywordScore,
      ai_used: false,
      ai_error: null
    };
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");

  let detectedData: Record<string, unknown> = detectSimpleTravelDataFromText(inboundText);
  let aiError: string | null = null;

  if (apiKey) {
    try {
      const camposPrompt = (params.campos || [])
        .map((campo: any) => {
          return `- ${campo.clave}: ${campo.etiqueta}. Requerido: ${campo.requerido ? "sí" : "no"}. Pregunta sugerida: ${campo.pregunta_sugerida || "—"}`;
        })
        .join("\n");

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model:
            cleanText(params.config?.modelo) ||
            Deno.env.get("CANDE_OPENAI_MODEL") ||
            "gpt-4o-mini",
          input: [
            {
              role: "system",
              content: `
Extraé datos comerciales de turismo desde un mensaje de WhatsApp.

Respondé SOLO JSON válido.
No expliques nada.

Claves permitidas:
{
  "nombre": string | null,
  "destino": string | null,
  "origen": string | null,
  "fechas_tentativas": string | null,
  "cantidad_pasajeros": string | null,
  "presupuesto_aproximado": string | null,
  "tipo_viaje": string | null
}

Campos configurados:
${camposPrompt}

Reglas:
- Si el mensaje es un destino, guardalo en "destino".
- Si dice una ciudad de salida como Córdoba, Buenos Aires, Rosario, Mendoza, etc., guardala en "origen".
- Solo guardes "origen" si el pasajero lo dijo explícitamente o si está confirmando un origen sugerido.
- Si dice un mes, fecha o rango, guardalo en "fechas_tentativas".
- Si dice "somos 2", "viajamos 4", "2 adultos", "somos dos", guardalo en "cantidad_pasajeros".
- Si dice plata, USD, pesos o presupuesto, guardalo en "presupuesto_aproximado".
- No inventes datos.
- Si no hay dato claro, devolvé null.
`.trim()
            },
            {
              role: "user",
              content: `
Datos actuales:
${formatJson(baseDatos)}

Mensaje nuevo del pasajero:
${inboundText}
`.trim()
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        aiError = data?.error?.message || `OpenAI rechazó extracción. HTTP ${response.status}`;
      } else {
        const outputText =
          data.output_text ||
          data.output?.[0]?.content?.[0]?.text ||
          data.output?.[0]?.content?.[0]?.content ||
          "";

        const parsedRaw = parseJsonObjectFromText(outputText);
        const aiDetectedData = normalizeDetectedLeadData(parsedRaw);
        const simpleDetectedData = detectSimpleTravelDataFromText(inboundText);

        detectedData = {
          ...simpleDetectedData,
          ...aiDetectedData
        };

        const origenDetectado = cleanText(parsedRaw?.origen);
        const canConfirmOrigin =
          inboundExplicitlyMentionsOrigin(inboundText) ||
          inboundConfirmsSuggestedOrigin(inboundText);

        if (origenDetectado && canConfirmOrigin) {
          detectedData.origen = origenDetectado;
          detectedData.origen_confirmado = true;
        }

        if (origenDetectado && !canConfirmOrigin) {
          delete detectedData.origen;
          delete detectedData.origen_confirmado;
        }
      }
    } catch (error) {
      aiError = getErrorMessage(error);
    }
  }

  detectedData = {
    ...detectSimpleTravelDataFromText(inboundText),
    ...detectedData
  };

  if (
    !cleanText(baseDatos.destino) &&
    !cleanText(detectedData.destino) &&
    inboundText.length >= 3 &&
    inboundText.length <= 45 &&
    !inboundText.includes("?") &&
    !isGreetingOnly(inboundText)
  ) {
    detectedData.destino = inboundText;
  }

  const mergedDatos = {
    ...baseDatos,
    ...Object.fromEntries(
      Object.entries(detectedData).filter(([, value]) => cleanText(value))
    ),
    ultimo_mensaje: inboundText || baseDatos.ultimo_mensaje
  };

  let finalDatos = detectOriginConfirmationFromInbound({
    inboundText,
    datos: mergedDatos
  });

  const canConfirmOrigin =
    inboundExplicitlyMentionsOrigin(inboundText) ||
    inboundConfirmsSuggestedOrigin(inboundText);

  if (!canConfirmOrigin && cleanText(finalDatos.origen_sugerido)) {
    finalDatos = {
      ...finalDatos,
      origen:
        cleanText(currentDatos.origen) && currentDatos.origen_confirmado === true
          ? currentDatos.origen
          : "",
      origen_confirmado:
        cleanText(currentDatos.origen) && currentDatos.origen_confirmado === true
    };
  }

  const keywordScore = calculateKeywordScore({
    palabrasClave: params.palabrasClave,
    inboundText
  });

  const score = calculateOpportunityScore({
    campos: params.campos,
    datos: finalDatos,
    keywordScore
  });

  const missingRequiredFields = getMissingRequiredFields({
    campos: params.campos,
    datos: finalDatos
  });

  return {
    detected_data: detectedData,
    suggested_origin: suggestedOrigin,
    missing_required_fields: missingRequiredFields,
    datos: finalDatos,
    score,
    keyword_score: keywordScore,
    ai_used: Boolean(apiKey),
    ai_error: aiError
  };
}

/* =========================================================
   SAFE NEXT QUESTION
========================================================= */

function textLooksLikeHandoff(text: string) {
  const normalized = normalizeForIntent(text);

  return (
    normalized.includes("te paso con un asesor") ||
    normalized.includes("te paso con un vendedor") ||
    normalized.includes("te paso con una persona") ||
    normalized.includes("te derivo") ||
    normalized.includes("te va a asistir") ||
    normalized.includes("va a asistirte") ||
    normalized.includes("va a ayudarte con todo") ||
    normalized.includes("asesor del equipo") ||
    normalized.includes("vendedor del equipo") ||
    normalized.includes("equipo que ya va a tener") ||
    normalized.includes("con todos los detalles") ||
    normalized.includes("con todo lo que necesitas") ||
    normalized.includes("con todo lo que necesitás") ||
    normalized.includes("ya tiene tu informacion") ||
    normalized.includes("ya tiene toda tu informacion")
  );
}

function getFirstNameFromOpportunity(params: {
  conversation: any;
  opportunity: any;
}) {
  const datos = params.opportunity?.datos || {};

  const nombre =
    cleanText(datos.nombre) ||
    cleanText(datos.contacto_nombre) ||
    cleanText(datos.pasajero) ||
    cleanText(params.conversation?.titulo);

  if (!nombre || nombre.toLowerCase() === "sin nombre") return "";

  return nombre.split(" ")[0];
}

function getNextMissingField(params: {
  campos: any[];
  datos: Record<string, unknown>;
}) {
  const campos = [...(params.campos || [])].sort(
    (a, b) => Number(a.orden || 0) - Number(b.orden || 0)
  );

  const datos = params.datos || {};

  for (const campo of campos) {
    const clave = cleanText(campo.clave);
    if (!clave) continue;

    if (clave === "origen") {
      if (!(cleanText(datos.origen) && datos.origen_confirmado === true)) {
        return campo;
      }

      continue;
    }

    if (!cleanText(datos[clave])) {
      return campo;
    }
  }

  return null;
}

function buildCandeSafeNextQuestion(params: {
  config: any;
  campos: any[];
  conversation: any;
  opportunity: any;
}) {
  const datos = params.opportunity?.datos || {};
  const nombre = getFirstNameFromOpportunity({
    conversation: params.conversation,
    opportunity: params.opportunity
  });

  const prefix = nombre ? `¡Genial, ${nombre}! ` : "¡Genial! ";

  const destino = cleanText(datos.destino);
  const origen = cleanText(datos.origen);
  const origenSugerido = cleanText(datos.origen_sugerido);
  const origenConfirmado = datos.origen_confirmado === true;
  const fechas = cleanText(datos.fechas_tentativas);
  const pax = cleanText(datos.cantidad_pasajeros);
  const presupuesto = cleanText(datos.presupuesto_aproximado);

  const partes: string[] = [];

  if (destino) partes.push(`destino: ${destino}`);
  if (pax) partes.push(`pasajeros: ${pax}`);
  if (fechas) partes.push(`fecha aproximada: ${fechas}`);
  if (presupuesto) partes.push(`presupuesto: ${presupuesto}`);

  const resumen = partes.length > 0 ? `Ya tengo ${partes.join(", ")}. ` : "";

  const nextMissing = getNextMissingField({
    campos: params.campos,
    datos
  });

  if (nextMissing?.clave === "origen" && origenSugerido && !origenConfirmado) {
    return `${prefix}${resumen}Por tu número, pareciera que estás en zona ${origenSugerido}. ¿Saldrían desde ${origenSugerido}?`;
  }

  if (nextMissing?.pregunta_sugerida) {
    return `${prefix}${resumen}${nextMissing.pregunta_sugerida}`;
  }

  if (!destino) {
    return `${prefix}¿A qué destino les gustaría viajar?`;
  }

  if (!fechas) {
    return `${prefix}${resumen}¿Para qué fecha o mes lo están pensando?`;
  }

  if (!pax) {
    return `${prefix}${resumen}¿Cuántas personas viajarían?`;
  }

  if (!origen && origenSugerido && !origenConfirmado) {
    return `${prefix}${resumen}Por tu número, pareciera que estás en zona ${origenSugerido}. ¿Saldrían desde ${origenSugerido}?`;
  }

  if (!origen) {
    return `${prefix}${resumen}¿Desde qué ciudad estarían saliendo?`;
  }

  if (!presupuesto) {
    return `${prefix}${resumen}¿Tienen algún presupuesto aproximado en mente?`;
  }

  return `${prefix}${resumen}¿Querés contarme si tienen alguna preferencia de hotel, zona o cantidad de noches?`;
}

function sanitizeCandeFinalText(params: {
  text: string;
  deriveInfo: any;
  config: any;
  campos: any[];
  conversation: any;
  opportunityForPrompt: any;
}) {
  const clean = normalizeWhatsappText(params.text);

  if (params.deriveInfo?.shouldDerive === true) {
    return clean;
  }

  if (textLooksLikeHandoff(clean)) {
    return buildCandeSafeNextQuestion({
      config: params.config,
      campos: params.campos,
      conversation: params.conversation,
      opportunity: params.opportunityForPrompt
    });
  }

  return clean;
}

/* =========================================================
   PROMPTS
========================================================= */

function buildSystemPrompt(params: {
  config: any;
  campos: any[];
  faqs: any[];
  palabrasClave: any[];
  deriveInfo: any;
}) {
  const config = params.config || {};

  const nombreIa = getNombreIa(config);
  const marcaVisible = getMarcaVisible(config);

  const promptBase =
    cleanText(config.prompt_base) ||
    `Sos ${nombreIa}, asistente virtual de ${marcaVisible}. Atendés consultas iniciales por WhatsApp.`;

  const tono =
    cleanText(config.tono) ||
    "cálido, claro, profesional, breve y natural para WhatsApp";

  const reglasDuras =
    cleanText(config.reglas_duras) ||
    "No des precios concretos. No prometas disponibilidad. No inventes vuelos, hoteles, tarifas ni condiciones. No confirmes reservas. No solicites datos sensibles de pago.";

  const datosARelevar = config.datos_a_relevar || [];
  const cosasProhibidas = config.cosas_prohibidas || [];

  const mensajeInicial = getMensajeInicial(config);
  const mensajeFaltaInfo = getMensajeFaltaInfo(config);
  const mensajeNoEntiende = getMensajeNoEntiende(config);
  const mensajeFueraHorario = getMensajeFueraHorario(config);
  const mensajeDerivacion = getMensajeDerivacion(config);

  return `
${promptBase}

IDENTIDAD CONFIGURADA:
- Nombre de la IA: ${nombreIa}
- Marca visible: ${marcaVisible}
- Canal: WhatsApp
- Rol: asistente de pasajeros / primer filtro comercial.
- No menciones NIA, Supabase, pipeline, score, oportunidad, cande_config ni herramientas internas.
- Respondé SIEMPRE en español de Argentina.
- Nunca respondas en inglés.

TONO CONFIGURADO:
${tono}

MENSAJES CONFIGURADOS:
- Mensaje inicial sugerido: ${mensajeInicial}
- Si falta información: ${mensajeFaltaInfo}
- Si no entendés: ${mensajeNoEntiende}
- Fuera de horario: ${mensajeFueraHorario}
- Derivación a asesor: ${mensajeDerivacion}

DATOS A RELEVAR DESDE CONFIGURACIÓN:
${formatList(datosARelevar)}

CAMPOS CONFIGURADOS EN EL PANEL:
${formatRowsForPrompt(params.campos)}

FAQS / CONOCIMIENTO CONFIGURADO:
${formatRowsForPrompt(params.faqs)}

PALABRAS CLAVE / CRITERIOS CONFIGURADOS:
${formatRowsForPrompt(params.palabrasClave)}

REGLAS DURAS CONFIGURADAS:
${reglasDuras}

COSAS PROHIBIDAS CONFIGURADAS:
${formatList(cosasProhibidas)}

REGLAS OPERATIVAS:
- Respondé breve, natural y útil para WhatsApp.
- No escribas mensajes largos.
- Pedí datos faltantes de a poco.
- No hagas interrogatorios largos.
- Si el pasajero solo saluda, presentate con el mensaje inicial configurado o una variante natural.
- Priorizá los campos configurados en el panel, según orden y requeridos.
- Si existe origen_sugerido y falta origen confirmado, no afirmes que sale desde ahí. Preguntá: "Por tu número, pareciera que estás en zona {origen_sugerido}. ¿Saldrían desde {origen_sugerido}?"
- No afirmes que el pasajero sale desde el origen sugerido. Pedí confirmación.
- Si el pasajero confirma el origen sugerido, continuá naturalmente.
- Si el pasajero indica otro origen, usá el origen indicado por el pasajero.
- Si hay menores, pedí edades.
- Si pide precio, explicá que necesitás datos básicos para cotizar correctamente.
- No inventes precios, hoteles, vuelos, tarifas, cupos, promociones ni disponibilidad.
- No confirmes reservas.
- No pidas tarjetas, claves, DNI completo ni datos sensibles de pago.
- No digas frases como "parece que tuvimos problemas de comunicación", "hubo problemas de comunicación" o similares.
- No te disculpes salvo que realmente no hayas entendido el mensaje.
- Está prohibido decir "te paso con un asesor", "te derivo" o "un asesor te va a asistir" salvo que DERIVACIÓN indique explícitamente que corresponde derivar.

DERIVACIÓN:
${
  params.deriveInfo?.shouldDerive
    ? `- En este mensaje SÍ corresponde derivar al equipo. Motivo interno: ${params.deriveInfo.reason}. Respondé usando SOLO una versión natural del mensaje de derivación configurado: "${mensajeDerivacion}". No agregues disculpas. No digas que hubo problemas de comunicación.`
    : "- En este mensaje NO corresponde derivar. Está prohibido decir que lo pasás con un asesor, que lo derivás o que un asesor lo va a asistir. Seguí preguntando datos faltantes."
}

FORMATO:
- Devolvé solamente el texto final que se enviará al pasajero.
- No uses markdown.
- No expliques tu razonamiento.
- No digas “I'm sorry, I can't assist with that”.
- Si no podés responder algo, pedí los datos faltantes en español.
`.trim();
}

function buildUserPrompt(params: {
  config: any;
  campos: any[];
  conversation: any;
  opportunity: any;
  messages: any[];
  inboundMessage: any | null;
}) {
  const conversation = params.conversation;
  const opportunity = params.opportunity;
  const datos = opportunity?.datos || {};
  const lastMessages = params.messages.map(formatMessageForPrompt).join("\n") || "Sin mensajes previos.";

  const passengerName =
    cleanText(datos.nombre) ||
    cleanText(datos.contacto_nombre) ||
    cleanText(datos.pasajero) ||
    cleanText(conversation?.titulo) ||
    "Sin nombre";

  const passengerPhone =
    cleanText(datos.wa_phone) ||
    cleanText(datos.telefono) ||
    cleanText(conversation?.wa_phone) ||
    "—";

  const missingRequiredFields = getMissingRequiredFields({
    campos: params.campos,
    datos
  });

  const nextMissing = getNextMissingField({
    campos: params.campos,
    datos
  });

  return `
PASAJERO:
Nombre/título: ${passengerName}
WhatsApp: ${passengerPhone}

DATOS DETECTADOS DE LA OPORTUNIDAD:
${formatJson(datos)}

CAMPOS REQUERIDOS FALTANTES:
${formatJson(missingRequiredFields)}

PRÓXIMO CAMPO A PREGUNTAR:
${formatJson(nextMissing)}

MENSAJE QUE DISPARÓ CANDE:
${params.inboundMessage ? formatMessageForPrompt(params.inboundMessage) : "No vino inbound_message_id. Usar último mensaje inbound de la conversación."}

ÚLTIMOS MENSAJES:
${lastMessages}

INSTRUCCIÓN:
Respondé solo el próximo mensaje que ${getNombreIa(params.config)} debe enviar al pasajero por WhatsApp.
La respuesta debe estar en español de Argentina.
Si falta un campo requerido, preguntá por ese campo.
Si existe origen_sugerido pero origen_confirmado es false, pedí confirmación del origen sugerido.
No derives si DERIVACIÓN indica que no corresponde.
`.trim();
}

/* =========================================================
   OPENAI + SAFE RESPONSE
========================================================= */

async function callOpenAI(params: {
  config: any;
  systemPrompt: string;
  userPrompt: string;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return {
      ok: false,
      text: "",
      error: "Falta OPENAI_API_KEY."
    };
  }

  const model =
    cleanText(params.config?.modelo) ||
    Deno.env.get("CANDE_OPENAI_MODEL") ||
    "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: params.systemPrompt
        },
        {
          role: "user",
          content: params.userPrompt
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    return {
      ok: false,
      text: "",
      error:
        data?.error?.message ||
        `OpenAI rechazó la solicitud. HTTP ${response.status}`
    };
  }

  const text =
    data.output_text ||
    data.output?.[0]?.content?.[0]?.text ||
    data.output?.[0]?.content?.[0]?.content ||
    "";

  const clean = normalizeWhatsappText(text);

  if (!clean) {
    return {
      ok: false,
      text: "",
      error: "OpenAI no devolvió texto."
    };
  }

  return {
    ok: true,
    text: clean,
    error: null
  };
}

function isBadCandeResponse(text: string): boolean {
  const normalized = normalizeForIntent(text);

  if (!normalized) return true;

  const badPhrases = [
    "i'm sorry, i can't assist with that",
    "im sorry, i cant assist with that",
    "i cannot assist with that",
    "i can't assist with that",
    "sorry, i can't",
    "can't assist",
    "cannot assist",
    "lo siento, no puedo ayudar",
    "no puedo ayudarte con eso",
    "no puedo asistir"
  ];

  return badPhrases.some((phrase) => normalized.includes(normalizeForIntent(phrase)));
}

function fallbackCandeResponse(params: {
  config: any;
  campos: any[];
  conversation: any;
  opportunity: any;
  deriveInfo?: any;
}) {
  const config = params.config || {};

  if (params.deriveInfo?.shouldDerive) {
    return getMensajeDerivacion(config);
  }

  return buildCandeSafeNextQuestion({
    config,
    campos: params.campos,
    conversation: params.conversation,
    opportunity: params.opportunity
  });
}

function safeCandeText(params: {
  aiText: string;
  aiOk: boolean;
  config: any;
  campos: any[];
  conversation: any;
  opportunity: any;
  deriveInfo?: any;
}) {
  const clean = normalizeWhatsappText(params.aiText);

  if (!params.aiOk || isBadCandeResponse(clean)) {
    return fallbackCandeResponse({
      config: params.config,
      campos: params.campos,
      conversation: params.conversation,
      opportunity: params.opportunity,
      deriveInfo: params.deriveInfo
    });
  }

  return sanitizeCandeFinalText({
    text: clean,
    deriveInfo: params.deriveInfo,
    config: params.config,
    campos: params.campos,
    conversation: params.conversation,
    opportunityForPrompt: params.opportunity
  });
}

/* =========================================================
   DB UPDATES / SEND
========================================================= */

async function insertOutboundMessage(params: {
  supabase: any;
  conversation: any;
  opportunity: any;
  config: any;
  text: string;
}) {
  const now = nowIso();
  const nombreIa = getNombreIa(params.config);

  const { data, error } = await params.supabase
    .from("mensajes")
    .insert({
      conversacion_id: params.conversation.id,
      direction: "out",
      sender_kind: "cande",
      type: "text",
      text: params.text,
      status: "pending",
      wa_timestamp: now
    })
    .select("*")
    .single();

  if (error) throw error;

  await params.supabase
    .from("conversaciones")
    .update({
      last_message_preview: `${nombreIa}:\n${params.text}`,
      last_message_at: now,
      last_outbound_message_at: now,
      updated_at: now
    })
    .eq("id", params.conversation.id);

  return data;
}

async function markOutboundFailed(params: {
  supabase: any;
  messageId: string;
  error: string;
}) {
  await params.supabase
    .from("mensajes")
    .update({
      status: "failed",
      error: params.error
    })
    .eq("id", params.messageId);
}

async function updateOpportunityAfterReply(params: {
  supabase: any;
  opportunity: any;
  conversation: any;
  leadAnalysis: any;
  deriveInfo?: any;
}) {
  if (!params.opportunity?.id) {
    throw new Error("No se pudo actualizar oportunidad: falta opportunity.id.");
  }

  const datosActuales =
    params.opportunity?.datos && typeof params.opportunity.datos === "object"
      ? params.opportunity.datos
      : {};

  const datosAnalizados =
    params.leadAnalysis?.datos && typeof params.leadAnalysis.datos === "object"
      ? params.leadAnalysis.datos
      : {};

  const enrichedDatos = {
    ...datosActuales,
    ...datosAnalizados,
    nombre:
      cleanText(datosAnalizados.nombre) ||
      cleanText(datosActuales.nombre) ||
      cleanText(datosActuales.contacto_nombre) ||
      cleanText(params.conversation?.titulo) ||
      "Sin nombre",
    contacto_nombre:
      cleanText(datosAnalizados.contacto_nombre) ||
      cleanText(datosActuales.contacto_nombre) ||
      cleanText(datosActuales.nombre) ||
      cleanText(params.conversation?.titulo) ||
      "Sin nombre",
    pasajero:
      cleanText(datosAnalizados.pasajero) ||
      cleanText(datosActuales.pasajero) ||
      cleanText(datosActuales.nombre) ||
      cleanText(params.conversation?.titulo) ||
      "Sin nombre",
    telefono:
      cleanText(datosAnalizados.telefono) ||
      cleanText(datosActuales.telefono) ||
      cleanText(datosActuales.wa_phone) ||
      cleanText(params.conversation?.wa_phone) ||
      "",
    wa_phone:
      cleanText(datosAnalizados.wa_phone) ||
      cleanText(datosActuales.wa_phone) ||
      cleanText(datosActuales.telefono) ||
      cleanText(params.conversation?.wa_phone) ||
      "",
    origen_livenos: true,
    conversation_id: params.conversation?.id || params.opportunity?.conversacion_id || null
  };

  const nextScore = Number(params.leadAnalysis?.score || 0);

  const updatePayload: Record<string, unknown> = {
    datos: enrichedDatos,
    score: nextScore,
    last_score_at: nowIso(),
    updated_at: nowIso()
  };

  if (params.deriveInfo?.shouldDerive && !params.opportunity.cande_handoff_requested_at) {
    updatePayload.cande_handoff_requested_at = nowIso();
  }

  const { data, error } = await params.supabase
    .from("lead_oportunidades")
    .update(updatePayload)
    .eq("id", params.opportunity.id)
    .select("id, datos, score, updated_at, last_score_at, cande_handoff_requested_at")
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar lead_oportunidades: ${error.message}`);
  }

  return data;
}

async function callWhatsappSendMessage(params: {
  conversation: any;
  outboundMessage: any;
  text: string;
}) {
  const supabaseUrl = getEnvSupabaseUrl();
  const serviceRoleKey = getEnvServiceRoleKey();

  const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send-message`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      source: "cande-reply",

      conversation_id: params.conversation.id,
      conversacion_id: params.conversation.id,

      message_id: params.outboundMessage.id,
      mensaje_id: params.outboundMessage.id,

      to: params.conversation.wa_phone,
      phone: params.conversation.wa_phone,
      wa_phone: params.conversation.wa_phone,

      type: "text",
      text: params.text,
      body: params.text,

      sender_kind: "cande"
    })
  });

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || data?.ok === false || data?.error) {
    throw new Error(
      data?.error ||
      data?.message ||
      `whatsapp-send-message rechazó el envío. HTTP ${response.status}`
    );
  }

  return data || { ok: true };
}

/* =========================================================
   SERVE
========================================================= */

serve(async (req) => {
  let payload: any = {};
  let runId: string | null = null;
  let supabase: any = null;

  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 200);

  try {
    payload = await req.json();

    supabase = getSupabaseAdmin();

    const conversationId = getConversationId(payload);
    const inboundMessageId = getInboundMessageId(payload);
    const payloadOportunidadId = getOportunidadId(payload);

    runId = await createRun({
      supabase,
      conversationId,
      oportunidadId: payloadOportunidadId,
      inboundMessageId,
      payload
    });

    if (!conversationId) {
      await finishRun({
        supabase,
        runId,
        status: "skipped",
        reason: "missing_conversation_id",
        responsePayload: { ok: false }
      });

      return jsonResponse({
        ok: false,
        skipped: true,
        reason: "missing_conversation_id",
        text: "Falta conversation_id.",
        code_version: CODE_VERSION
      });
    }

    const [
      config,
      campos,
      faqs,
      palabrasClave,
      areaCodes,
      conversation,
      inboundMessage
    ] = await Promise.all([
      loadCandeConfig({ supabase }),
      loadCandeCampos({ supabase }),
      loadCandeFaqs({ supabase }),
      loadCandePalabrasClave({ supabase }),
      loadCandeAreaCodes({ supabase }),
      loadConversation({ supabase, conversationId }),
      loadInboundMessage({ supabase, inboundMessageId })
    ]);

    const opportunity = await loadOpportunity({
      supabase,
      conversationId,
      oportunidadId: payloadOportunidadId
    });

    const messages = await loadMessages({
      supabase,
      conversationId
    });

    const gate = shouldCandeReply({
      config,
      conversation,
      opportunity,
      messages,
      inboundMessage
    });

    if (!gate.ok) {
      await finishRun({
        supabase,
        runId,
        status: "skipped",
        reason: gate.reason,
        responsePayload: {
          ok: false,
          skipped: true,
          reason: gate.reason,
          conversation_id: conversationId,
          oportunidad_id: opportunity?.id || null
        }
      });

      return jsonResponse({
        ok: false,
        skipped: true,
        reason: gate.reason,
        conversation_id: conversationId,
        oportunidad_id: opportunity?.id || null,
        code_version: CODE_VERSION
      });
    }

    const leadAnalysis = await analyzeLeadDataFromInbound({
      config,
      campos,
      palabrasClave,
      conversation,
      opportunity,
      inboundMessage,
      areaCodes
    });

    const deriveInfo = shouldDeriveByMessage({
      config,
      messages,
      inboundMessage,
      score: leadAnalysis.score,
      missingRequiredFields: leadAnalysis.missing_required_fields
    });

    const opportunityForPrompt = {
      ...opportunity,
      datos: leadAnalysis.datos,
      score: leadAnalysis.score
    };

    const systemPrompt = buildSystemPrompt({
      config,
      campos,
      faqs,
      palabrasClave,
      deriveInfo
    });

    const userPrompt = buildUserPrompt({
      config,
      campos,
      conversation,
      opportunity: opportunityForPrompt,
      messages,
      inboundMessage
    });

    const ai = await callOpenAI({
      config,
      systemPrompt,
      userPrompt
    });

    const finalText = safeCandeText({
      aiText: ai.text,
      aiOk: ai.ok,
      config,
      campos,
      conversation,
      opportunity: opportunityForPrompt,
      deriveInfo
    });

    const updatedOpportunity = await updateOpportunityAfterReply({
      supabase,
      opportunity,
      conversation,
      leadAnalysis,
      deriveInfo
    });

    const outboundMessage = await insertOutboundMessage({
      supabase,
      conversation,
      opportunity: opportunityForPrompt,
      config,
      text: finalText
    });

    let sendResult: any = null;

    try {
      sendResult = await callWhatsappSendMessage({
        conversation,
        outboundMessage,
        text: finalText
      });
    } catch (sendError) {
      const sendErrorMessage = getErrorMessage(sendError);

      await markOutboundFailed({
        supabase,
        messageId: outboundMessage.id,
        error: sendErrorMessage
      });

      await finishRun({
        supabase,
        runId,
        status: "failed",
        reason: "whatsapp_send_failed",
        outboundMessageId: outboundMessage.id,
        responsePayload: {
          ok: false,
          text: finalText,
          ai_ok: ai.ok,
          ai_error: ai.error,
          send_error: sendErrorMessage,
          derive_info: deriveInfo,
          lead_analysis: {
            detected_data: leadAnalysis.detected_data,
            suggested_origin: leadAnalysis.suggested_origin,
            missing_required_fields: leadAnalysis.missing_required_fields,
            datos: leadAnalysis.datos,
            score: leadAnalysis.score,
            keyword_score: leadAnalysis.keyword_score,
            ai_used: leadAnalysis.ai_used,
            ai_error: leadAnalysis.ai_error
          },
          updated_opportunity: updatedOpportunity
        },
        error: sendErrorMessage
      });

      return jsonResponse({
        ok: false,
        status: "failed",
        reason: "whatsapp_send_failed",
        error: sendErrorMessage,
        text: finalText,
        outbound_message_id: outboundMessage.id,
        conversation_id: conversationId,
        oportunidad_id: opportunity.id,
        code_version: CODE_VERSION,
        lead_analysis: {
          detected_data: leadAnalysis.detected_data,
          suggested_origin: leadAnalysis.suggested_origin,
          missing_required_fields: leadAnalysis.missing_required_fields,
          datos: leadAnalysis.datos,
          score: leadAnalysis.score,
          keyword_score: leadAnalysis.keyword_score,
          ai_used: leadAnalysis.ai_used,
          ai_error: leadAnalysis.ai_error
        },
        updated_opportunity: updatedOpportunity
      });
    }

    await finishRun({
      supabase,
      runId,
      status: "sent",
      reason: "sent",
      outboundMessageId: outboundMessage.id,
      responsePayload: {
        ok: true,
        text: finalText,
        ai_ok: ai.ok,
        ai_error: ai.error,
        send_result: sendResult,
        derive_info: deriveInfo,
        lead_analysis: {
          detected_data: leadAnalysis.detected_data,
          suggested_origin: leadAnalysis.suggested_origin,
          missing_required_fields: leadAnalysis.missing_required_fields,
          datos: leadAnalysis.datos,
          score: leadAnalysis.score,
          keyword_score: leadAnalysis.keyword_score,
          ai_used: leadAnalysis.ai_used,
          ai_error: leadAnalysis.ai_error
        },
        updated_opportunity: updatedOpportunity,
        config_used: {
          config_id: config?.id || null,
          nombre_ia: getNombreIa(config),
          marca_visible: getMarcaVisible(config),
          modelo: cleanText(config?.modelo) || null,
          derivar_si_score_supera_umbral: getConfigBoolean(config, "derivar_si_score_supera_umbral", false),
          umbral_transferencia: getConfigNumber(config, "umbral_transferencia", 0)
        }
      }
    });

    return jsonResponse({
      ok: true,
      status: "sent",
      code_version: CODE_VERSION,
      text: finalText,
      conversation_id: conversationId,
      oportunidad_id: opportunity.id,
      outbound_message_id: outboundMessage.id,
      send_result: sendResult,
      ai_ok: ai.ok,
      ai_error: ai.error,
      derive_info: deriveInfo,
      lead_analysis: {
        detected_data: leadAnalysis.detected_data,
        suggested_origin: leadAnalysis.suggested_origin,
        missing_required_fields: leadAnalysis.missing_required_fields,
        datos: leadAnalysis.datos,
        score: leadAnalysis.score,
        keyword_score: leadAnalysis.keyword_score,
        ai_used: leadAnalysis.ai_used,
        ai_error: leadAnalysis.ai_error
      },
      updated_opportunity: updatedOpportunity
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    try {
      if (!supabase) {
        supabase = getSupabaseAdmin();
      }

      await finishRun({
        supabase,
        runId,
        status: "failed",
        reason: "exception",
        responsePayload: {
          ok: false,
          error: errorMessage
        },
        error: errorMessage
      });
    } catch (auditError) {
      console.error("[cande-reply] No se pudo auditar error:", getErrorMessage(auditError));
    }

    return jsonResponse({
      ok: false,
      status: "failed",
      reason: "exception",
      error: errorMessage,
      code_version: CODE_VERSION
    });
  }
});