// @ts-nocheck

/* =========================================================
   NOSSIX / NOSTUR — nia-chat
   NIA · Asistente interno comercial

   Hace:
   - autentica usuario por JWT si viene Authorization
   - lee contexto puntual de LiveNos si hay conversation_id
   - si NO hay conversation_id, lee contexto comercial general:
     conversaciones abiertas, sin asignar, oportunidades y feedback negativo
   - responde con OpenAI si hay OPENAI_API_KEY
   - guarda auditoría en nia_interacciones
   - devuelve audit_id para feedback desde el widget
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

function getSupabaseUserClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) return null;

  const authorization = req.headers.get("Authorization") || "";

  if (!authorization) return null;

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

async function getAuthUserId(req: Request): Promise<string | null> {
  try {
    const client = getSupabaseUserClient(req);

    if (!client) return null;

    const { data, error } = await client.auth.getUser();

    if (error) return null;

    return data.user?.id || null;
  } catch {
    return null;
  }
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
        : message.sender_kind === "nia"
          ? "NIA"
          : "VENDEDOR";

  const type = cleanText(message.type) || "text";
  const text = cleanText(message.text) || `[${type}]`;
  const at = cleanText(message.wa_timestamp || message.created_at);

  return `[${at}] ${direction}: ${text}`;
}

async function loadConversationContext(params: {
  supabase: any;
  conversationId: string | null;
}) {
  if (!params.conversationId) {
    return {
      conversation: null,
      messages: []
    };
  }

  const [conversationRes, messagesRes] = await Promise.all([
    params.supabase
      .from("conversaciones")
      .select("*")
      .eq("id", params.conversationId)
      .maybeSingle(),

    params.supabase
      .from("mensajes")
      .select("id,direction,type,text,media,status,error,wa_message_id,sender_profile_id,sender_kind,wa_timestamp,created_at")
      .eq("conversacion_id", params.conversationId)
      .is("deleted_at", null)
      .order("wa_timestamp", { ascending: false })
      .limit(30)
  ]);

  if (conversationRes.error) throw conversationRes.error;
  if (messagesRes.error) throw messagesRes.error;

  return {
    conversation: conversationRes.data || null,
    messages: (messagesRes.data || []).slice().reverse()
  };
}

async function loadGeneralCommercialContext(params: { supabase: any }) {
  const [openConversationsRes, unattendedConversationsRes, oportunidadesRes, profilesRes, feedbackRes] =
    await Promise.all([
      params.supabase
        .from("conversaciones")
        .select(`
          id,
          wa_phone,
          titulo,
          subject,
          estado_gestion,
          estado_comercial,
          inbox,
          status,
          assigned_to,
          last_message_preview,
          last_message_at,
          last_inbound_message_at,
          last_outbound_message_at,
          whatsapp_24h_expires_at,
          created_at,
          updated_at
        `)
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("closed_at", null)
        .eq("status", "open")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(30),

      params.supabase
        .from("conversaciones")
        .select(`
          id,
          wa_phone,
          titulo,
          subject,
          estado_gestion,
          estado_comercial,
          inbox,
          status,
          assigned_to,
          last_message_preview,
          last_message_at,
          last_inbound_message_at,
          last_outbound_message_at,
          whatsapp_24h_expires_at,
          created_at,
          updated_at
        `)
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("closed_at", null)
        .eq("status", "open")
        .is("assigned_to", null)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(20),

      params.supabase
        .from("lead_oportunidades")
        .select(`
          id,
          conversacion_id,
          estado_id,
          score,
          datos,
          assigned_to,
          cande_activa,
          transferida_at,
          cande_handoff_requested_at,
          last_score_at,
          created_at,
          updated_at
        `)
        .order("updated_at", { ascending: false })
        .limit(40),

      params.supabase
        .from("profiles")
        .select("id,nombre,apellido,email,color,activo,nombre_publico_whatsapp")
        .eq("activo", true),

      params.supabase
        .from("nia_interacciones")
        .select("user_message, assistant_response, feedback_rating, feedback_comment, feedback_created_at, created_at")
        .eq("feedback_rating", "negative")
        .order("feedback_created_at", { ascending: false, nullsFirst: false })
        .limit(8)
    ]);

  if (openConversationsRes.error) throw openConversationsRes.error;
  if (unattendedConversationsRes.error) throw unattendedConversationsRes.error;
  if (oportunidadesRes.error) throw oportunidadesRes.error;
  if (profilesRes.error) throw profilesRes.error;
  if (feedbackRes.error) throw feedbackRes.error;

  const openConversations = openConversationsRes.data || [];
  const unattendedConversations = unattendedConversationsRes.data || [];
  const oportunidades = oportunidadesRes.data || [];
  const profiles = profilesRes.data || [];

  const profilesMap = new Map<string, any>();

  profiles.forEach((profile: any) => {
    if (profile.id) {
      profilesMap.set(profile.id, profile);
    }
  });

  const oportunidadesByConversationId = new Map<string, any>();

  oportunidades.forEach((item: any) => {
    if (item.conversacion_id) {
      oportunidadesByConversationId.set(item.conversacion_id, item);
    }
  });

  function getVendedorForConversation(conv: any) {
    if (!conv.assigned_to) {
      return {
        vendedor: null,
        vendedor_nombre: null,
        tiene_vendedor_asignado: false
      };
    }

    const profile = profilesMap.get(conv.assigned_to) || null;

    if (!profile) {
      return {
        vendedor: null,
        vendedor_nombre: "Vendedor asignado",
        tiene_vendedor_asignado: true
      };
    }

    const vendedorNombre = `${cleanText(profile.nombre)} ${cleanText(profile.apellido)}`.trim();

    return {
      vendedor: profile,
      vendedor_nombre: vendedorNombre || "Vendedor asignado",
      tiene_vendedor_asignado: true
    };
  }

  const openConversationsWithOpportunity = openConversations.map((conv: any) => {
    const vendedorInfo = getVendedorForConversation(conv);

    return {
      ...conv,
      ...vendedorInfo,
      oportunidad: oportunidadesByConversationId.get(conv.id) || null
    };
  });

  const unattendedConversationsWithOpportunity = unattendedConversations.map((conv: any) => {
    const vendedorInfo = getVendedorForConversation(conv);

    return {
      ...conv,
      ...vendedorInfo,
      oportunidad: oportunidadesByConversationId.get(conv.id) || null
    };
  });

  const activeOpportunities = oportunidades.filter((item: any) => {
    const score = Number(item.score || 0);
    const hasData = item.datos && Object.keys(item.datos || {}).length > 0;

    return Boolean(item.conversacion_id) || score > 0 || hasData || item.cande_activa;
  });

  return {
    open_conversations_count: openConversationsWithOpportunity.length,
    unattended_conversations_count: unattendedConversationsWithOpportunity.length,
    opportunities_count: activeOpportunities.length,
    open_conversations: openConversationsWithOpportunity,
    unattended_conversations: unattendedConversationsWithOpportunity,
    opportunities: activeOpportunities,
    recent_negative_feedback: feedbackRes.data || []
  };
}

function buildSystemPrompt() {
  return `
Sos NIA, el asistente comercial interno de NOSSIX / NOSTUR.

Tu usuario es un vendedor, gerente o administrador interno de una agencia de viajes.
No hablás con pasajeros finales. CANDE habla con pasajeros; NIA habla con el equipo interno.

- La asistente de pasajeros se llama CANDE. Nunca escribas CADE.
- Si una conversación tiene assigned_to con valor, no digas que no tiene vendedor asignado.
- Si la conversación trae vendedor_nombre, usá ese nombre como vendedor asignado.
- Si assigned_to existe pero no hay vendedor_nombre, decí "tiene vendedor asignado" y no "sin vendedor".
- Diferenciá "sin vendedor asignado" de "en gestión". Una conversación en inbox vendedor o estado_gestion en_gestion no debe tratarse como sin atender.

Tu función:
- resumir conversaciones comerciales
- detectar intención de compra
- detectar si falta respuesta del vendedor
- detectar conversaciones abiertas, sin atender o sin asignar
- detectar oportunidades activas o en gestión
- sugerir próxima acción concreta
- proponer una respuesta lista para copiar y pegar
- detectar si conviene activar, pausar o derivar CANDE
- ayudar al vendedor a ordenar oportunidad, datos faltantes y urgencias

Reglas:
- Respondé en español de Argentina.
- Sé concreta, ejecutiva y comercial.
- No inventes datos.
- No digas "no hay nada" si el contexto muestra conversaciones abiertas u oportunidades.
- Si hay conversaciones abiertas, mencioná cantidad, estado, si tienen vendedor asignado y próxima acción.
- Si hay conversaciones sin asignar, marcá prioridad y recomendá tomar/derivar.
- Si el usuario pregunta "qué tenemos", "qué hay abierto" o "oportunidades abiertas", revisá primero CONTEXTO COMERCIAL GENERAL.
- Tené en cuenta el feedback negativo reciente para no repetir errores.
- Si falta información, decí exactamente qué falta.
- Si sugerís una respuesta al pasajero, escribila lista para copiar y pegar.
- No digas que sos ChatGPT.
- No prometas acciones que todavía no fueron ejecutadas.
`.trim();
}

function buildUserPrompt(params: {
  userMessage: string;
  context: any;
  conversation: any | null;
  messages: any[];
  generalContext: any | null;
}) {
  const context = params.context || {};
  const lastMessages = params.messages.map(formatMessageForPrompt).join("\n") || "Sin mensajes cargados.";

  return `
PEDIDO DEL USUARIO INTERNO:
${params.userMessage}

CONTEXTO ENVIADO DESDE LA PANTALLA:
${formatJson(context)}

CONTEXTO COMERCIAL GENERAL:
${formatJson(params.generalContext)}

REGISTRO DE CONVERSACIÓN PUNTUAL EN BASE:
${formatJson(params.conversation)}

ÚLTIMOS MENSAJES DE LA CONVERSACIÓN PUNTUAL:
${lastMessages}

Respondé a lo pedido por el usuario interno usando el contexto disponible.
Si hay conversación puntual, priorizá esa conversación.
Si no hay conversación puntual, usá el contexto comercial general.
`.trim();
}

async function callOpenAI(params: {
  systemPrompt: string;
  userPrompt: string;
}) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    return {
      ok: false,
      missingKey: true,
      text: ""
    };
  }

  const model = Deno.env.get("NIA_OPENAI_MODEL") || "gpt-4.1-mini";

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
      missingKey: false,
      text:
        data?.error?.message ||
        `OpenAI rechazó la solicitud. HTTP ${response.status}`
    };
  }

  const text =
    data.output_text ||
    data.output?.[0]?.content?.[0]?.text ||
    data.output?.[0]?.content?.[0]?.content ||
    "";

  return {
    ok: true,
    missingKey: false,
    text: cleanText(text) || "NIA no pudo generar una respuesta."
  };
}

function fallbackResponse(params: {
  userMessage: string;
  context: any;
  messages: any[];
  generalContext: any | null;
  conversationId: string | null;
}) {
  if (!params.conversationId && params.generalContext) {
    const openCount = Number(params.generalContext.open_conversations_count || 0);
    const unattendedCount = Number(params.generalContext.unattended_conversations_count || 0);
    const opportunitiesCount = Number(params.generalContext.opportunities_count || 0);
    const firstOpen = params.generalContext.open_conversations?.[0] || null;

    return `
Contexto comercial general:

- Conversaciones abiertas: ${openCount}
- Conversaciones sin vendedor asignado: ${unattendedCount}
- Oportunidades detectadas: ${opportunitiesCount}

${
  firstOpen
    ? `Conversación abierta más reciente:
- Pasajero/título: ${cleanText(firstOpen.titulo || firstOpen.subject || firstOpen.wa_phone) || "—"}
- Estado gestión: ${cleanText(firstOpen.estado_gestion) || "—"}
- Inbox: ${cleanText(firstOpen.inbox) || "—"}
- Último mensaje: ${cleanText(firstOpen.last_message_preview) || "—"}`
    : "No hay conversaciones abiertas en el contexto cargado."
}

Tu pedido fue:
"${params.userMessage}"

OpenAI no está configurado, pero NIA ya está leyendo el contexto general desde Supabase.
`.trim();
  }

  const passenger =
    cleanText(params.context?.contacto_nombre) ||
    cleanText(params.context?.contacto) ||
    cleanText(params.context?.wa_phone) ||
    "esta conversación";

  const score = params.context?.oportunidad_score ?? "—";
  const cande = params.context?.cande_activa ? "activa" : "pausada";
  const lastMessage =
    cleanText(params.context?.last_message_preview) ||
    cleanText(params.messages[params.messages.length - 1]?.text) ||
    "—";

  return `
Tengo el contexto de ${passenger}.

Resumen operativo:
- Score: ${score}
- CANDE: ${cande}
- Último mensaje: ${lastMessage}

Tu pedido fue:
"${params.userMessage}"

OpenAI no está configurado, pero la conexión con LiveNos y Supabase ya está funcionando.
`.trim();
}

async function insertNiaAudit(params: {
  supabase: any;
  userId: string | null;
  payload: any;
  userMessage: string;
  assistantResponse: string | null;
  conversationId: string | null;
  tool: string | null;
  usedOpenai: boolean;
  success: boolean;
  error?: string | null;
  generalContext?: any | null;
}) {
  const context = params.payload?.context || {};
  const oportunidadId = cleanText(context?.oportunidad_id);
  const safeOportunidadId = oportunidadId || null;

  const insertRes = await params.supabase
    .from("nia_interacciones")
    .insert({
      user_id: params.userId,

      source: cleanText(context?.source || params.payload?.source) || null,
      module: cleanText(context?.module) || null,
      action: cleanText(context?.action) || null,

      conversation_id: params.conversationId || null,
      oportunidad_id: safeOportunidadId,

      user_message: params.userMessage,
      assistant_response: params.assistantResponse,

      context,
      metadata: {
        payload_source: params.payload?.source || null,
        used_context_conversation_id:
          params.payload?.context?.conversation_id ||
          params.payload?.context?.conversacion_id ||
          null,
        general_context_summary: params.generalContext
          ? {
              open_conversations_count: params.generalContext.open_conversations_count,
              unattended_conversations_count: params.generalContext.unattended_conversations_count,
              opportunities_count: params.generalContext.opportunities_count
            }
          : null,
        created_by: "nia-chat"
      },

      tool: params.tool,
      used_openai: params.usedOpenai,
      success: params.success,
      error: params.error || null
    })
    .select("id")
    .single();

  if (insertRes.error) {
    console.error("[nia-chat] No se pudo guardar auditoría:", insertRes.error.message);
    return null;
  }

  return insertRes.data?.id || null;
}

serve(async (req) => {
  let payload: any = {};

  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  try {
    payload = await req.json();

    const userMessage = cleanText(payload.message || payload.text);

    if (!userMessage) {
      return jsonResponse({ ok: false, error: "El mensaje está vacío." }, 400);
    }

    const supabase = getSupabaseAdmin();
    const userId = await getAuthUserId(req);
    const conversationId = getConversationId(payload);

    const { conversation, messages } = await loadConversationContext({
      supabase,
      conversationId
    });

    const generalContext = conversationId
      ? null
      : await loadGeneralCommercialContext({ supabase });

    const systemPrompt = buildSystemPrompt();

    const userPrompt = buildUserPrompt({
      userMessage,
      context: payload.context || {},
      conversation,
      messages,
      generalContext
    });

    const ai = await callOpenAI({
      systemPrompt,
      userPrompt
    });

    const tool = conversationId ? "nia_livenos_context" : "nia_chat";

    const finalText = ai.ok
      ? ai.text
      : ai.missingKey
        ? fallbackResponse({
            userMessage,
            context: payload.context || {},
            messages,
            generalContext,
            conversationId
          })
        : `No pude generar la respuesta de NIA.\n\nDetalle: ${ai.text}`;

    const auditId = await insertNiaAudit({
      supabase,
      userId,
      payload,
      userMessage,
      assistantResponse: finalText,
      conversationId,
      tool,
      usedOpenai: ai.ok,
      success: true,
      error: ai.ok || ai.missingKey ? null : ai.text,
      generalContext
    });

    return jsonResponse({
      ok: true,
      text: finalText,
      tool,
      conversation_id: conversationId,
      user_id: userId,
      audit_id: auditId,
      used_openai: ai.ok,
      general_context: generalContext
        ? {
            open_conversations_count: generalContext.open_conversations_count,
            unattended_conversations_count: generalContext.unattended_conversations_count,
            opportunities_count: generalContext.opportunities_count
          }
        : null
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    try {
      const supabase = getSupabaseAdmin();
      const conversationId = getConversationId(payload);

      await insertNiaAudit({
        supabase,
        userId: null,
        payload,
        userMessage: cleanText(payload?.message || payload?.text) || "[mensaje no disponible]",
        assistantResponse: null,
        conversationId,
        tool: conversationId ? "nia_livenos_context" : "nia_chat",
        usedOpenai: false,
        success: false,
        error: errorMessage,
        generalContext: null
      });
    } catch (auditError) {
      console.error("[nia-chat] No se pudo auditar error:", getErrorMessage(auditError));
    }

    return jsonResponse(
      {
        ok: false,
        error: errorMessage
      },
      500
    );
  }
});