// @ts-nocheck

/* =========================================================
   NOSSIX / NOSTUR — nia-chat
   NIA · Asistente interno comercial

   Hace:
   - autentica usuario por JWT si viene Authorization
   - lee contexto puntual de LiveNos si hay conversation_id
   - si NO hay conversation_id, lee contexto comercial general
   - lee feedback positivo/negativo de nia_interacciones como entrenamiento operativo
   - responde con OpenAI si hay OPENAI_API_KEY
   - ejecuta acciones explícitas:
     marcar urgente, pausar/activar CANDE, tomar conversación,
     crear nota interna, crear recordatorio, cambiar estado pipeline
   - permite cambiar estado de pipeline desde Oportunidades usando nombre:
     "pasa batica a presupuestada", "pasar Alan a en gestión"
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

function normalizeForIntent(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function loadNiaTrainingMemory(params: { supabase: any }) {
  const [negativeRes, positiveRes] = await Promise.all([
    params.supabase
      .from("nia_interacciones")
      .select("id,created_at,user_message,assistant_response,feedback_rating,feedback_comment,feedback_created_at,module,source,tool,metadata")
      .eq("feedback_rating", "negative")
      .not("feedback_comment", "is", null)
      .order("feedback_created_at", { ascending: false, nullsFirst: false })
      .limit(12),

    params.supabase
      .from("nia_interacciones")
      .select("id,created_at,user_message,assistant_response,feedback_rating,feedback_comment,feedback_created_at,module,source,tool,metadata")
      .eq("feedback_rating", "positive")
      .order("feedback_created_at", { ascending: false, nullsFirst: false })
      .limit(6)
  ]);

  if (negativeRes.error) throw negativeRes.error;
  if (positiveRes.error) throw positiveRes.error;

  return {
    negative_feedback: negativeRes.data || [],
    positive_feedback: positiveRes.data || []
  };
}

async function loadGeneralCommercialContext(params: { supabase: any }) {
  const [
    openConversationsRes,
    unattendedConversationsRes,
    oportunidadesRes,
    profilesRes,
    trainingMemory
  ] = await Promise.all([
    params.supabase
      .from("conversaciones")
      .select(`
        id,
        contacto_id,
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
        contacto_id,
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

    loadNiaTrainingMemory({ supabase: params.supabase })
  ]);

  if (openConversationsRes.error) throw openConversationsRes.error;
  if (unattendedConversationsRes.error) throw unattendedConversationsRes.error;
  if (oportunidadesRes.error) throw oportunidadesRes.error;
  if (profilesRes.error) throw profilesRes.error;

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
    training_memory: trainingMemory,
    recent_negative_feedback: trainingMemory.negative_feedback,
    recent_positive_feedback: trainingMemory.positive_feedback
  };
}

function buildSystemPrompt() {
  return `
Sos NIA, el asistente comercial interno de NOSSIX / NOSTUR.

Tu usuario es un vendedor, gerente o administrador interno de una agencia de viajes.
No hablás con pasajeros finales. CANDE habla con pasajeros; NIA habla con el equipo interno.

IDENTIDAD Y ROLES:
- La asistente de pasajeros se llama CANDE. Nunca escribas CADE.
- CANDE habla con pasajeros.
- NIA habla con el equipo interno.
- Diferenciá siempre entre "pasajero/contacto", "vendedor asignado", "gerencia" y "administración".
- Si el pasajero y el vendedor tienen el mismo nombre, aclaralo y no asumas que son la misma persona operativamente.

REGLAS DE CONTEXTO:
- Si una conversación tiene assigned_to con valor, no digas que no tiene vendedor asignado.
- Si la conversación trae vendedor_nombre, usá ese nombre como vendedor asignado.
- Si assigned_to existe pero no hay vendedor_nombre, decí "tiene vendedor asignado" y no "sin vendedor".
- Diferenciá "sin vendedor asignado" de "en gestión".
- Una conversación en inbox vendedor o estado_gestion en_gestion no debe tratarse como sin atender.
- No digas "derivar a CANDE" si CANDE ya está activa; en ese caso sugerí "mantener CANDE activa" o "pedir a CANDE que continúe indagando".

ENTRENAMIENTO OPERATIVO CON FEEDBACK:
- El panel de feedback de NIA es una fuente de aprendizaje operativo.
- Usá el feedback negativo reciente como corrección prioritaria.
- Si un feedback negativo contradice una respuesta anterior, no repitas ese error.
- Si el feedback negativo dice que había una conversación, oportunidad, vendedor o estado que ignoraste, prestá especial atención a esos campos en el contexto.
- Usá el feedback positivo reciente como ejemplo de estilo y criterio.
- El feedback cargado por el equipo de NOSSIX tiene prioridad sobre inferencias generales del modelo.
- No digas que estás "aprendiendo" ni expliques el mecanismo interno; simplemente aplicá las correcciones.

ACCIONES DIRECTAS:
- Si el usuario da una orden directa como "pausá CANDE", "desactivá CANDE", "activá CANDE", "marcá urgente", "tomá la conversación", "creá nota", "creá recordatorio" o "cambiá el estado", no pidas confirmación.
- Solo pedí aclaración si falta identificar una conversación, una oportunidad concreta o un estado de pipeline válido.
- No respondas con "¿confirmás que procedo?" cuando el usuario ya dio una instrucción directa.
- No prometas acciones que todavía no fueron ejecutadas.

FUNCIÓN DE NIA:
- resumir conversaciones comerciales
- detectar intención de compra
- detectar si falta respuesta del vendedor
- detectar conversaciones abiertas, sin atender o sin asignar
- detectar oportunidades activas o en gestión
- sugerir próxima acción concreta
- proponer respuestas listas para copiar y pegar, indicando si son para el pasajero, para el vendedor o para uso interno
- detectar si conviene activar, pausar o mantener CANDE
- ayudar al vendedor a ordenar oportunidad, datos faltantes y urgencias

ESTILO:
- Respondé en español de Argentina.
- Sé concreta, ejecutiva y comercial.
- No inventes datos.
- No digas "no hay nada" si el contexto muestra conversaciones abiertas u oportunidades.
- Si hay conversaciones abiertas, mencioná cantidad, estado, si tienen vendedor asignado y próxima acción.
- Si hay conversaciones sin asignar, marcá prioridad y recomendá tomar/derivar.
- Si el usuario pregunta "qué tenemos", "qué hay abierto" o "oportunidades abiertas", revisá primero CONTEXTO COMERCIAL GENERAL.
- Si falta información, decí exactamente qué falta.
- Si sugerís una respuesta al pasajero, escribila lista para copiar y pegar.
- No digas que sos ChatGPT.
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
  const negativeFeedback =
    params.generalContext?.training_memory?.negative_feedback ||
    params.generalContext?.recent_negative_feedback ||
    [];
  const positiveFeedback =
    params.generalContext?.training_memory?.positive_feedback ||
    params.generalContext?.recent_positive_feedback ||
    [];

  return `
PEDIDO DEL USUARIO INTERNO:
${params.userMessage}

CONTEXTO ENVIADO DESDE LA PANTALLA:
${formatJson(context)}

CONTEXTO COMERCIAL GENERAL:
${formatJson(params.generalContext)}

FEEDBACK NEGATIVO RECIENTE PARA ENTRENAMIENTO OPERATIVO:
${formatJson(negativeFeedback)}

FEEDBACK POSITIVO RECIENTE COMO EJEMPLO DE BUEN CRITERIO:
${formatJson(positiveFeedback)}

REGISTRO DE CONVERSACIÓN PUNTUAL EN BASE:
${formatJson(params.conversation)}

ÚLTIMOS MENSAJES DE LA CONVERSACIÓN PUNTUAL:
${lastMessages}

INSTRUCCIONES DE USO DEL CONTEXTO:
- Si hay conversación puntual, priorizá esa conversación.
- Si no hay conversación puntual, usá el contexto comercial general.
- Aplicá especialmente las correcciones del feedback negativo reciente.
- No repitas errores que el equipo ya corrigió en el feedback.
- Si el usuario dio una orden directa, no pidas confirmación; respondé como acción realizada solo si la herramienta/código la ejecutó.
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

OpenAI no está configurado, pero NIA ya está leyendo el contexto general y el feedback del panel de entrenamiento.
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

OpenAI no está configurado, pero la conexión con LiveNos, Supabase y el panel de feedback ya está funcionando.
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
  actionResult?: any | null;
  actionExecuted?: boolean;
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
        action_executed: params.actionExecuted || false,
        action_result: params.actionResult || null,
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

type NiaAction =
  | { type: "mark_urgent" }
  | { type: "pause_cande" }
  | { type: "activate_cande" }
  | { type: "take_conversation" }
  | { type: "create_internal_note"; text: string }
  | { type: "create_reminder"; text: string }
  | { type: "change_pipeline_status"; statusName: string; targetName?: string | null };

function extractTextAfterSeparators(message: string): string {
  const clean = cleanText(message);
  const separators = [":", "-", "—"];

  for (const separator of separators) {
    const index = clean.indexOf(separator);

    if (index >= 0 && index < clean.length - 1) {
      return clean.slice(index + 1).trim();
    }
  }

  return clean;
}

function extractPipelineTargetAndStatus(userMessage: string): { targetName: string | null; statusName: string | null } {
  const original = cleanText(userMessage);
  const normalized = normalizeForIntent(original);

  const estadosConocidos = [
    "sin atender",
    "nuevo",
    "nueva",
    "en gestion",
    "en gestión",
    "presupuestada",
    "presupuestado",
    "cotizada",
    "cotizado",
    "vendida",
    "vendido",
    "ganada",
    "ganado",
    "perdida",
    "perdido",
    "cerrada",
    "cerrado"
  ];

  for (const estado of estadosConocidos) {
    const estadoNorm = normalizeForIntent(estado);

    if (!normalized.includes(estadoNorm)) continue;

    let target = ` ${normalized} `;

    const frasesAEliminar = [
      "pasa a",
      "pasar a",
      "pasala a",
      "pasalo a",
      "mover a",
      "movela a",
      "movelo a",
      "cambiar a",
      "cambia a",
      "cambiala a",
      "cambialo a",
      "cambiar estado a",
      "cambia estado a",
      "cambiar el estado a",
      "cambia el estado a",
      "pasa",
      "pasar",
      "pasala",
      "pasalo",
      "mover",
      "movela",
      "movelo",
      "cambiar",
      "cambia",
      "cambiala",
      "cambialo",
      "estado",
      "el contacto",
      "contacto",
      "la oportunidad de",
      "la oportunidad",
      "oportunidad",
      "la conversacion de",
      "la conversación de",
      "la conversacion",
      "la conversación",
      "conversacion",
      "conversación",
      "la de",
      "el de"
    ];

    frasesAEliminar.forEach((frase) => {
      const fraseNorm = normalizeForIntent(frase);
      target = target.replaceAll(` ${fraseNorm} `, " ");
    });

    target = target.replaceAll(` ${estadoNorm} `, " ");

    // Limpieza final segura: elimina conectores sueltos, pero NO borra letras dentro de nombres.
    const tokens = target
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .filter((token) => !["a", "al", "el", "la", "de"].includes(token));

    target = tokens.join(" ").trim();

    return {
      targetName: target || null,
      statusName: estado
    };
  }

  return {
    targetName: null,
    statusName: null
  };
}

function detectNiaAction(userMessage: string): NiaAction | null {
  const normalized = normalizeForIntent(userMessage);

  function hasPhrase(phrases: string[]) {
    return phrases.some((phrase) => normalized.includes(normalizeForIntent(phrase)));
  }

  if (
    hasPhrase([
      "pausar cande",
      "pausa cande",
      "desactivar cande",
      "desactiva cande",
      "apagar cande",
      "apaga cande",
      "quitar cande",
      "quita cande",
      "frenar cande",
      "frena cande",
      "suspender cande",
      "suspende cande"
    ])
  ) {
    return { type: "pause_cande" };
  }

  if (
    hasPhrase([
      "activar cande",
      "activa cande",
      "encender cande",
      "encende cande",
      "prender cande",
      "prende cande",
      "habilitar cande",
      "habilita cande"
    ])
  ) {
    return { type: "activate_cande" };
  }

  if (
    hasPhrase([
      "marcar urgente",
      "marcala urgente",
      "marcalo urgente",
      "poner urgente",
      "ponela urgente",
      "ponelo urgente",
      "urgente esta conversacion",
      "urgente esta conversación"
    ])
  ) {
    return { type: "mark_urgent" };
  }

  if (
    hasPhrase([
      "tomar conversacion",
      "tomar conversación",
      "tomar esta conversacion",
      "tomar esta conversación",
      "toma esta conversacion",
      "toma esta conversación",
      "asignarmela",
      "asignármela",
      "asignamela",
      "asignámela",
      "me la asignas",
      "me la asignás"
    ])
  ) {
    return { type: "take_conversation" };
  }

  if (
    hasPhrase([
      "crear nota interna",
      "generar nota interna",
      "agregar nota interna",
      "guardar nota interna",
      "dejar nota interna"
    ])
  ) {
    return {
      type: "create_internal_note",
      text: extractTextAfterSeparators(userMessage)
    };
  }

  if (
    hasPhrase([
      "crear recordatorio",
      "generar recordatorio",
      "agregar recordatorio",
      "guardar recordatorio",
      "dejar recordatorio",
      "recordame",
      "recordar"
    ])
  ) {
    return {
      type: "create_reminder",
      text: extractTextAfterSeparators(userMessage)
    };
  }

  const pipelineActionWords = [
    "pasa",
    "pasar",
    "pasala",
    "pasalo",
    "mover",
    "movela",
    "movelo",
    "cambiar",
    "cambia",
    "cambiala",
    "cambialo"
  ];

  const pipelineStateWords = [
    "sin atender",
    "nuevo",
    "nueva",
    "en gestion",
    "en gestión",
    "presupuestada",
    "presupuestado",
    "cotizada",
    "cotizado",
    "vendida",
    "vendido",
    "ganada",
    "ganado",
    "perdida",
    "perdido",
    "cerrada",
    "cerrado"
  ];

  const hasPipelineAction = pipelineActionWords.some((word) =>
    normalized.includes(normalizeForIntent(word))
  );

  const hasPipelineState = pipelineStateWords.some((word) =>
    normalized.includes(normalizeForIntent(word))
  );

  if (hasPipelineAction && hasPipelineState) {
    const targetStatus = extractPipelineTargetAndStatus(userMessage);

    if (targetStatus.statusName) {
      return {
        type: "change_pipeline_status",
        statusName: targetStatus.statusName,
        targetName: targetStatus.targetName
      };
    }
  }

  return null;
}

async function getOpportunityForConversation(params: {
  supabase: any;
  conversationId: string;
}) {
  const { data, error } = await params.supabase
    .from("lead_oportunidades")
    .select("*")
    .eq("conversacion_id", params.conversationId)
    .maybeSingle();

  if (error) throw error;

  return data || null;
}

async function findOpportunityByTargetName(params: {
  supabase: any;
  targetName: string | null | undefined;
}) {
  const target = normalizeForIntent(params.targetName || "");

  if (!target) return null;

  const [oportunidadesRes, conversacionesRes, contactosRes] = await Promise.all([
    params.supabase
      .from("lead_oportunidades")
      .select("id,conversacion_id,estado_id,score,datos,assigned_to,cande_activa,updated_at,created_at")
      .order("updated_at", { ascending: false })
      .limit(200),

    params.supabase
      .from("conversaciones")
      .select("id,contacto_id,wa_phone,titulo,subject,assigned_to,estado_gestion,estado_comercial,last_message_preview")
      .is("deleted_at", null)
      .limit(500),

    params.supabase
      .from("contactos_wa")
      .select("id,wa_phone,display_name,profile_name")
      .limit(500)
  ]);

  if (oportunidadesRes.error) throw oportunidadesRes.error;
  if (conversacionesRes.error) throw conversacionesRes.error;
  if (contactosRes.error) throw contactosRes.error;

  const conversacionesMap = new Map<string, any>();
  (conversacionesRes.data || []).forEach((conv: any) => {
    conversacionesMap.set(conv.id, conv);
  });

  const contactosMap = new Map<string, any>();
  (contactosRes.data || []).forEach((contacto: any) => {
    contactosMap.set(contacto.id, contacto);
  });

  const enriched = (oportunidadesRes.data || []).map((opp: any) => {
    const conv = conversacionesMap.get(opp.conversacion_id) || null;
    const contacto = conv?.contacto_id ? contactosMap.get(conv.contacto_id) || null : null;

    return {
      ...opp,
      conversacion: conv,
      contacto
    };
  });

  const matches = enriched.filter((item: any) => {
    const conv = item.conversacion || {};
    const contacto = item.contacto || {};
    const datos = item.datos || {};

    const haystack = [
      datos.nombre,
      datos.contacto_nombre,
      datos.pasajero,
      datos.nombre_pasajero,
      datos.cliente,
      datos.contacto,
      datos.telefono,
      datos.wa_phone,
      datos.whatsapp,
      conv.titulo,
      conv.subject,
      conv.wa_phone,
      contacto.display_name,
      contacto.profile_name,
      contacto.wa_phone
    ]
      .filter(Boolean)
      .map((value) => normalizeForIntent(String(value)))
      .join(" ");

    return haystack.includes(target) || target.includes(haystack);
  });

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    return {
      multiple: true,
      matches
    };
  }

  return null;
}

function getDisplayNameFromOpportunity(item: any) {
  const datos = item?.datos || {};
  const conv = item?.conversacion || {};
  const contacto = item?.contacto || {};

  return (
    cleanText(datos.nombre) ||
    cleanText(datos.contacto_nombre) ||
    cleanText(datos.pasajero) ||
    cleanText(datos.nombre_pasajero) ||
    cleanText(contacto.display_name) ||
    cleanText(contacto.profile_name) ||
    cleanText(conv.titulo) ||
    cleanText(conv.subject) ||
    cleanText(conv.wa_phone) ||
    "Sin nombre"
  );
}

function getPhoneFromOpportunity(item: any) {
  const datos = item?.datos || {};
  const conv = item?.conversacion || {};
  const contacto = item?.contacto || {};

  return (
    cleanText(datos.telefono) ||
    cleanText(datos.wa_phone) ||
    cleanText(datos.whatsapp) ||
    cleanText(contacto.wa_phone) ||
    cleanText(conv.wa_phone) ||
    ""
  );
}

function enrichOpportunityDatos(params: {
  oportunidad: any;
  conversation: any;
  contacto: any;
}) {
  const datosActuales =
    params.oportunidad?.datos && typeof params.oportunidad.datos === "object"
      ? params.oportunidad.datos
      : {};

  const nombreContacto =
    cleanText(params.contacto?.display_name) ||
    cleanText(params.contacto?.profile_name) ||
    cleanText(params.conversation?.titulo) ||
    cleanText(params.conversation?.subject) ||
    cleanText(params.conversation?.wa_phone) ||
    "Sin nombre";

  const telefonoContacto =
    cleanText(params.contacto?.wa_phone) ||
    cleanText(params.conversation?.wa_phone) ||
    "";

  return {
    ...datosActuales,
    nombre: cleanText((datosActuales as any).nombre) || nombreContacto,
    contacto_nombre: cleanText((datosActuales as any).contacto_nombre) || nombreContacto,
    pasajero: cleanText((datosActuales as any).pasajero) || nombreContacto,
    telefono: cleanText((datosActuales as any).telefono) || telefonoContacto,
    wa_phone: cleanText((datosActuales as any).wa_phone) || telefonoContacto,
    ultimo_mensaje:
      cleanText((datosActuales as any).ultimo_mensaje) ||
      cleanText(params.conversation?.last_message_preview) ||
      null,
    origen_livenos: true,
    conversation_id: params.conversation?.id || params.oportunidad?.conversacion_id || null
  };
}

async function executeNiaAction(params: {
  supabase: any;
  action: NiaAction;
  conversationId: string | null;
  userId: string | null;
  payload: any;
}) {
  const now = new Date().toISOString();
  const initialConversationId = params.conversationId;

  if (!params.userId) {
    return {
      executed: false,
      ok: false,
      text: "No pude ejecutar la acción porque no pude identificar el usuario actual. Volvé a iniciar sesión e intentá nuevamente.",
      action_result: null
    };
  }

  if (!initialConversationId && params.action.type !== "change_pipeline_status") {
    return {
      executed: false,
      ok: false,
      text: "Para ejecutar esta acción necesito estar parada en una conversación puntual de LiveNos. Abrí NIA desde la conversación que querés modificar.",
      action_result: null
    };
  }

  if (params.action.type === "mark_urgent") {
    const { error } = await params.supabase
      .from("conversaciones")
      .update({
        priority: 3,
        updated_at: now,
        metadata: {
          ...(params.payload?.context?.metadata || {}),
          nia_last_action: "mark_urgent",
          nia_last_action_at: now,
          nia_last_action_by: params.userId
        }
      })
      .eq("id", initialConversationId);

    if (error) throw error;

    return {
      executed: true,
      ok: true,
      text: "Listo. Marqué esta conversación como urgente.",
      action_result: {
        action: "mark_urgent",
        conversation_id: initialConversationId
      }
    };
  }

  if (params.action.type === "take_conversation") {
    const { error } = await params.supabase
      .from("conversaciones")
      .update({
        assigned_to: params.userId,
        tomada_by: params.userId,
        tomada_at: now,
        estado_gestion: "en_gestion",
        inbox: "vendedor",
        updated_at: now
      })
      .eq("id", initialConversationId);

    if (error) throw error;

    return {
      executed: true,
      ok: true,
      text: "Listo. Tomé la conversación y la dejé en gestión.",
      action_result: {
        action: "take_conversation",
        conversation_id: initialConversationId,
        assigned_to: params.userId
      }
    };
  }

  if (params.action.type === "pause_cande" || params.action.type === "activate_cande") {
    const oportunidad = await getOpportunityForConversation({
      supabase: params.supabase,
      conversationId: initialConversationId
    });

    if (!oportunidad?.id) {
      return {
        executed: false,
        ok: false,
        text: "No pude actualizar CANDE porque esta conversación todavía no tiene una oportunidad vinculada.",
        action_result: null
      };
    }

    const nextCandeState = params.action.type === "activate_cande";

    const { error } = await params.supabase
      .from("lead_oportunidades")
      .update({
        cande_activa: nextCandeState,
        updated_at: now
      })
      .eq("id", oportunidad.id);

    if (error) throw error;

    return {
      executed: true,
      ok: true,
      text: nextCandeState
        ? "Listo. Activé CANDE para esta oportunidad."
        : "Listo. Pausé CANDE para esta oportunidad.",
      action_result: {
        action: params.action.type,
        conversation_id: initialConversationId,
        oportunidad_id: oportunidad.id,
        cande_activa: nextCandeState
      }
    };
  }

  if (params.action.type === "create_internal_note" || params.action.type === "create_reminder") {
    const rawText = cleanText(params.action.text);

    const text =
      rawText &&
      !normalizeForIntent(rawText).includes("crear nota interna") &&
      !normalizeForIntent(rawText).includes("generar nota interna") &&
      !normalizeForIntent(rawText).includes("crear recordatorio") &&
      !normalizeForIntent(rawText).includes("generar recordatorio")
        ? rawText
        : params.action.type === "create_reminder"
          ? "Recordatorio generado por NIA."
          : "Nota interna generada por NIA.";

    const { error } = await params.supabase
      .from("notas_conversacion")
      .insert({
        conversacion_id: initialConversationId,
        autor_id: params.userId,
        contenido: text,
        tipo: params.action.type === "create_reminder" ? "recordatorio" : "mensaje_interno",
        scheduled_for: null
      });

    if (error) throw error;

    return {
      executed: true,
      ok: true,
      text:
        params.action.type === "create_reminder"
          ? `Listo. Creé el recordatorio interno: "${text}"`
          : `Listo. Generé la nota interna: "${text}"`,
      action_result: {
        action: params.action.type,
        conversation_id: initialConversationId,
        text
      }
    };
  }

  if (params.action.type === "change_pipeline_status") {
    let resolvedConversationId = initialConversationId;
    let oportunidad: any = null;

    if (resolvedConversationId) {
      oportunidad = await getOpportunityForConversation({
        supabase: params.supabase,
        conversationId: resolvedConversationId
      });
    }

    if (!resolvedConversationId && params.action.targetName) {
      const found = await findOpportunityByTargetName({
        supabase: params.supabase,
        targetName: params.action.targetName
      });

      if (!found) {
        return {
          executed: false,
          ok: false,
          text: `No encontré una oportunidad que coincida con "${params.action.targetName}". Probá con el nombre exacto que figura en la card.`,
          action_result: {
            action: "change_pipeline_status",
            target_name: params.action.targetName,
            reason: "target_not_found"
          }
        };
      }

      if (found.multiple) {
        const opciones = found.matches
          .slice(0, 5)
          .map((item: any, index: number) => `${index + 1}. ${getDisplayNameFromOpportunity(item)}`)
          .join("\n");

        return {
          executed: false,
          ok: false,
          text: `Encontré más de una oportunidad que coincide con "${params.action.targetName}". Necesito que seas más específico.\n\n${opciones}`,
          action_result: {
            action: "change_pipeline_status",
            target_name: params.action.targetName,
            reason: "multiple_matches"
          }
        };
      }

      oportunidad = found;
      resolvedConversationId = found.conversacion_id || found.conversation_id || null;
    }

    if (!resolvedConversationId) {
      return {
        executed: false,
        ok: false,
        text: "No pude identificar la conversación vinculada a esa oportunidad.",
        action_result: {
          action: "change_pipeline_status",
          target_name: params.action.targetName || null,
          reason: "missing_conversation_id"
        }
      };
    }

    const requestedStatus = normalizeForIntent(params.action.statusName);

    const { data: estados, error: estadosError } = await params.supabase
      .from("pipeline_estados")
      .select("id,nombre,color,orden,es_final,resultado,es_sin_atender")
      .order("orden", { ascending: true });

    if (estadosError) throw estadosError;

    const estado = (estados || []).find((item: any) => {
      const nombre = normalizeForIntent(item.nombre);
      return nombre === requestedStatus || nombre.includes(requestedStatus) || requestedStatus.includes(nombre);
    });

    if (!estado?.id) {
      return {
        executed: false,
        ok: false,
        text: `No encontré un estado de pipeline llamado "${params.action.statusName}". Revisá el nombre del estado e intentá nuevamente.`,
        action_result: {
          action: "change_pipeline_status",
          requested_status: params.action.statusName,
          available_statuses: (estados || []).map((item: any) => item.nombre)
        }
      };
    }

    const { data: conversation, error: conversationError } = await params.supabase
      .from("conversaciones")
      .select(`
        id,
        contacto_id,
        wa_phone,
        titulo,
        subject,
        assigned_to,
        sucursal_id,
        estado_gestion,
        estado_comercial,
        last_message_preview,
        last_message_at,
        whatsapp_24h_expires_at,
        metadata
      `)
      .eq("id", resolvedConversationId)
      .maybeSingle();

    if (conversationError) throw conversationError;

    if (!conversation?.id) {
      return {
        executed: false,
        ok: false,
        text: "No encontré la conversación vinculada para cambiar el estado del pipeline.",
        action_result: null
      };
    }

    let contacto: any = null;

    if (conversation.contacto_id) {
      const { data: contactoData, error: contactoError } = await params.supabase
        .from("contactos_wa")
        .select("id,wa_phone,display_name,profile_name,avatar_url")
        .eq("id", conversation.contacto_id)
        .maybeSingle();

      if (contactoError) throw contactoError;

      contacto = contactoData || null;
    }

    if (!oportunidad?.id) {
      oportunidad = await getOpportunityForConversation({
        supabase: params.supabase,
        conversationId: resolvedConversationId
      });
    }

    const datosEnriquecidos = enrichOpportunityDatos({
      oportunidad,
      conversation,
      contacto
    });

    if (!oportunidad?.id) {
      const { data: insertedOpportunity, error: insertOpportunityError } = await params.supabase
        .from("lead_oportunidades")
        .insert({
          conversacion_id: conversation.id,
          estado_id: estado.id,
          score: 0,
          datos: datosEnriquecidos,
          assigned_to: conversation.assigned_to || params.userId,
          cande_activa: false,
          updated_at: now
        })
        .select("*")
        .single();

      if (insertOpportunityError) throw insertOpportunityError;

      oportunidad = insertedOpportunity;
    } else {
      const { error } = await params.supabase
        .from("lead_oportunidades")
        .update({
          estado_id: estado.id,
          datos: datosEnriquecidos,
          assigned_to: oportunidad.assigned_to || conversation.assigned_to || params.userId,
          updated_at: now
        })
        .eq("id", oportunidad.id);

      if (error) throw error;
    }

    const { error: updateConversationError } = await params.supabase
      .from("conversaciones")
      .update({
        estado_gestion: estado.es_sin_atender ? "sin_atender" : "en_gestion",
        estado_comercial: estado.nombre,
        updated_at: now
      })
      .eq("id", conversation.id);

    if (updateConversationError) throw updateConversationError;

    const nombreContacto =
      cleanText(datosEnriquecidos.nombre) ||
      cleanText(datosEnriquecidos.contacto_nombre) ||
      getDisplayNameFromOpportunity({
        ...oportunidad,
        conversacion: conversation,
        contacto
      });

    return {
      executed: true,
      ok: true,
      text: `Listo. Cambié la oportunidad de ${nombreContacto} al estado "${estado.nombre}".`,
      action_result: {
        action: "change_pipeline_status",
        conversation_id: resolvedConversationId,
        oportunidad_id: oportunidad.id,
        estado_id: estado.id,
        estado_nombre: estado.nombre,
        contacto_nombre: nombreContacto,
        telefono: cleanText(datosEnriquecidos.telefono) || getPhoneFromOpportunity({
          ...oportunidad,
          conversacion: conversation,
          contacto
        })
      }
    };
  }

  return {
    executed: false,
    ok: false,
    text: "No pude interpretar la acción solicitada.",
    action_result: null
  };
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

    const detectedAction = detectNiaAction(userMessage);

    if (detectedAction) {
      const actionResponse = await executeNiaAction({
        supabase,
        action: detectedAction,
        conversationId,
        userId,
        payload
      });

      const tool = conversationId ? "nia_action_livenos" : "nia_action";

      const auditId = await insertNiaAudit({
        supabase,
        userId,
        payload,
        userMessage,
        assistantResponse: actionResponse.text,
        conversationId: actionResponse.action_result?.conversation_id || conversationId,
        tool,
        usedOpenai: false,
        success: actionResponse.ok,
        error: actionResponse.ok ? null : actionResponse.text,
        generalContext: null,
        actionResult: actionResponse.action_result,
        actionExecuted: actionResponse.executed
      });
return jsonResponse(
  {
    ok: actionResponse.ok,
    text: actionResponse.text,
    tool,
    conversation_id: actionResponse.action_result?.conversation_id || conversationId,
    user_id: userId,
    audit_id: auditId,
    used_openai: false,
    action_executed: actionResponse.executed,
    action_result: actionResponse.action_result,
    error: actionResponse.ok ? null : actionResponse.text
  },
  200
);
    }

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
            opportunities_count: generalContext.opportunities_count,
            training_negative_count: generalContext.recent_negative_feedback?.length || 0,
            training_positive_count: generalContext.recent_positive_feedback?.length || 0
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