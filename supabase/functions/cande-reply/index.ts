// @ts-nocheck

/* =========================================================
   NOSSIX / NOSTUR — cande-reply
   CANDE · Asistente de pasajeros por WhatsApp

   Recibe:
   - conversation_id / conversacion_id
   - inbound_message_id / mensaje_id
   - oportunidad_id
   - source

   Hace:
   - valida conversación
   - valida oportunidad y cande_activa
   - evita duplicados
   - lee últimos mensajes
   - lee cande_config
   - genera respuesta con OpenAI
   - guarda mensaje outbound sender_kind = cande
   - envía por whatsapp-send-message
   - audita en cande_runs
========================================================= */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

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

function getErrorMessage(error: unknown): string {
  if (!error) return "Error desconocido.";

  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "Error desconocido.");
  }

  return String(error);
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

function formatJson(value: unknown): string {
  if (!value) return "—";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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

function isInbound(message: any) {
  return message?.direction === "in" || message?.direction === "inbound";
}

function isOutbound(message: any) {
  return message?.direction === "out" || message?.direction === "outbound";
}

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
      request_payload: params.payload || {}
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
      response_payload: params.responsePayload || {},
      error: params.error || null,
      finished_at: new Date().toISOString()
    })
    .eq("id", params.runId);

  if (error) {
    console.error("[cande-reply] No se pudo cerrar cande_runs:", error.message);
  }
}

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
  let query = params.supabase
    .from("lead_oportunidades")
    .select("*");

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

function shouldCandeReply(params: {
  config: any;
  conversation: any;
  opportunity: any;
  messages: any[];
  inboundMessage: any | null;
}) {
  const config = params.config;
  const conversation = params.conversation;
  const opportunity = params.opportunity;
  const messages = params.messages || [];
  const inboundMessage = params.inboundMessage;

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

  if (!config) {
    return {
      ok: true,
      reason: "cande_active_without_config"
    };
  }

  return {
    ok: true,
    reason: "cande_active"
  };
}

function buildSystemPrompt(config: any) {
  const promptBase =
    cleanText(config?.prompt_base) ||
    "Sos Cande, asistente virtual de una agencia de viajes. Atendés consultas iniciales por WhatsApp. Sé cordial, breve y útil. Hacé preguntas para entender lo que el pasajero busca. Debes presentarte.";

  const reglasDuras =
    cleanText(config?.reglas_duras) ||
    "No des precios concretos. No prometas disponibilidad. No inventes información de productos.";

  const tono =
    cleanText(config?.tono) ||
    "cálido, formal, profesional";

  return `
${promptBase}

IDENTIDAD:
- Te llamás CANDE.
- Sos la asistente de pasajeros de NOSSIX / ALMUNDO Franquicia Córdoba.
- Hablás con pasajeros por WhatsApp.
- NIA es el asistente interno del equipo. No menciones a NIA al pasajero.

TONO:
- ${tono}
- Español de Argentina.
- Mensajes breves y naturales para WhatsApp.
- No hagas textos largos.
- No uses formato markdown.
- No uses listas largas salvo que ayude mucho.

REGLAS DURAS:
${reglasDuras}

REGLAS COMERCIALES:
- Tu objetivo es hacer una primera indagación comercial.
- Si el pasajero saluda, respondé cálida y brevemente.
- Pedí datos faltantes de a poco, no todo junto.
- Datos útiles: destino, fecha o mes aproximado, cantidad de pasajeros, edades de menores, origen, presupuesto aproximado, tipo de viaje.
- No des precio final.
- No prometas disponibilidad.
- No inventes vuelos, hoteles, tarifas ni condiciones.
- Si el pasajero pide hablar con un asesor, decí que lo derivás al equipo.
- Si detectás urgencia, derivación o intención fuerte, podés cerrar con una frase corta indicando que un asesor continuará.

NO DEBÉS:
- Decir que sos ChatGPT.
- Decir que sos inteligencia artificial si no hace falta.
- Mencionar herramientas internas, Supabase, pipeline, oportunidad, score o cande_activa.
- Enviar más de una respuesta para el mismo mensaje.
`.trim();
}

function buildUserPrompt(params: {
  config: any;
  conversation: any;
  opportunity: any;
  messages: any[];
  inboundMessage: any | null;
}) {
  const conversation = params.conversation;
  const opportunity = params.opportunity;
  const datos = opportunity?.datos || {};
  const lastMessages = params.messages.map(formatMessageForPrompt).join("\n") || "Sin mensajes previos.";

  return `
CONTEXTO DEL PASAJERO:
Nombre/título: ${cleanText(datos.nombre) || cleanText(datos.contacto_nombre) || cleanText(datos.pasajero) || cleanText(conversation?.titulo) || "Sin nombre"}
WhatsApp: ${cleanText(datos.wa_phone) || cleanText(datos.telefono) || cleanText(conversation?.wa_phone) || "—"}

DATOS DETECTADOS DE LA OPORTUNIDAD:
${formatJson(datos)}

MENSAJE INBOUND QUE DISPARÓ CANDE:
${params.inboundMessage ? formatMessageForPrompt(params.inboundMessage) : "No vino inbound_message_id. Usar último mensaje inbound de la conversación."}

ÚLTIMOS MENSAJES:
${lastMessages}

INSTRUCCIÓN:
Respondé SOLO el próximo mensaje que CANDE debe enviar al pasajero por WhatsApp.
`.trim();
}

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

  const model = cleanText(params.config?.modelo) || Deno.env.get("CANDE_OPENAI_MODEL") || "gpt-4o-mini";

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

  const clean = cleanText(text);

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

function fallbackCandeResponse(params: {
  conversation: any;
  opportunity: any;
}) {
  const datos = params.opportunity?.datos || {};
  const nombre =
    cleanText(datos.nombre) ||
    cleanText(datos.contacto_nombre) ||
    cleanText(datos.pasajero) ||
    cleanText(params.conversation?.titulo);

  if (nombre && nombre.toLowerCase() !== "sin nombre") {
    return `Hola ${nombre.split(" ")[0]}, soy Cande de Almundo Córdoba 😊 ¿Me contás qué destino o tipo de viaje estás buscando?`;
  }

  return "Hola, soy Cande de Almundo Córdoba 😊 ¿Me contás qué destino o tipo de viaje estás buscando?";
}

async function insertOutboundMessage(params: {
  supabase: any;
  conversation: any;
  opportunity: any;
  text: string;
}) {
  const now = new Date().toISOString();

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
      last_message_preview: `CANDE:\n${params.text}`,
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

async function updateOpportunityAfterReply(params: {
  supabase: any;
  opportunity: any;
  conversation: any;
}) {
  const datos =
    params.opportunity?.datos && typeof params.opportunity.datos === "object"
      ? params.opportunity.datos
      : {};

  const enrichedDatos = {
    ...datos,
    nombre:
      cleanText(datos.nombre) ||
      cleanText(datos.contacto_nombre) ||
      cleanText(datos.pasajero) ||
      cleanText(params.conversation.titulo) ||
      cleanText(params.conversation.wa_phone) ||
      "Sin nombre",
    contacto_nombre:
      cleanText(datos.contacto_nombre) ||
      cleanText(datos.nombre) ||
      cleanText(datos.pasajero) ||
      cleanText(params.conversation.titulo) ||
      cleanText(params.conversation.wa_phone) ||
      "Sin nombre",
    pasajero:
      cleanText(datos.pasajero) ||
      cleanText(datos.nombre) ||
      cleanText(datos.contacto_nombre) ||
      cleanText(params.conversation.titulo) ||
      cleanText(params.conversation.wa_phone) ||
      "Sin nombre",
    telefono:
      cleanText(datos.telefono) ||
      cleanText(datos.wa_phone) ||
      cleanText(params.conversation.wa_phone) ||
      "",
    wa_phone:
      cleanText(datos.wa_phone) ||
      cleanText(datos.telefono) ||
      cleanText(params.conversation.wa_phone) ||
      "",
    origen_livenos: true,
    conversation_id: params.conversation.id
  };

  await params.supabase
    .from("lead_oportunidades")
    .update({
      datos: enrichedDatos,
      updated_at: new Date().toISOString()
    })
    .eq("id", params.opportunity.id);
}

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
        text: "Falta conversation_id."
      });
    }

    const [config, conversation, inboundMessage] = await Promise.all([
      loadCandeConfig({ supabase }),
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
        oportunidad_id: opportunity?.id || null
      });
    }

    const systemPrompt = buildSystemPrompt(config);
    const userPrompt = buildUserPrompt({
      config,
      conversation,
      opportunity,
      messages,
      inboundMessage
    });

    const ai = await callOpenAI({
      config,
      systemPrompt,
      userPrompt
    });

    const finalText = ai.ok
      ? ai.text
      : fallbackCandeResponse({
          conversation,
          opportunity
        });

    const outboundMessage = await insertOutboundMessage({
      supabase,
      conversation,
      opportunity,
      text: finalText
    });

    await updateOpportunityAfterReply({
      supabase,
      opportunity,
      conversation
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
          send_error: sendErrorMessage
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
        oportunidad_id: opportunity.id
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
        send_result: sendResult
      }
    });

    return jsonResponse({
      ok: true,
      status: "sent",
      text: finalText,
      conversation_id: conversationId,
      oportunidad_id: opportunity.id,
      outbound_message_id: outboundMessage.id,
      send_result: sendResult,
      ai_ok: ai.ok,
      ai_error: ai.error
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
      error: errorMessage
    });
  }
});