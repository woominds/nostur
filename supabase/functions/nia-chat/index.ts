// @ts-nocheck

/* =========================================================
   NOSSIX / NOSTUR — nia-chat
   NIA · Asistente interno comercial

   Recibe:
   - message
   - context
   - conversation_id / conversacion_id

   Hace:
   - lee últimos mensajes de LiveNos si hay conversación
   - arma contexto comercial
   - responde con OpenAI si hay OPENAI_API_KEY
   - fallback seguro si no hay OpenAI configurado
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

function buildSystemPrompt() {
  return `
Sos NIA, el asistente comercial interno de NOSSIX / NOSTUR.

Tu usuario es un vendedor, gerente o administrador interno de una agencia de viajes.
No hablás con pasajeros finales. CANDE habla con pasajeros; NIA habla con el equipo interno.

Tu función:
- resumir conversaciones comerciales
- detectar intención de compra
- detectar si falta respuesta del vendedor
- sugerir próxima acción
- proponer una respuesta para enviar al pasajero
- detectar si conviene activar, pausar o derivar CANDE
- ayudar al vendedor a ordenar oportunidad, datos faltantes y urgencias

Reglas:
- Respondé en español de Argentina.
- Sé concreta, ejecutiva y comercial.
- No inventes datos.
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
}) {
  const context = params.context || {};
  const lastMessages = params.messages.map(formatMessageForPrompt).join("\n") || "Sin mensajes cargados.";

  return `
PEDIDO DEL USUARIO INTERNO:
${params.userMessage}

CONTEXTO ENVIADO DESDE LIVENOS:
${formatJson(context)}

REGISTRO DE CONVERSACIÓN EN BASE:
${formatJson(params.conversation)}

ÚLTIMOS MENSAJES:
${lastMessages}

Respondé a lo pedido por el usuario interno usando el contexto disponible.
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
}) {
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

Todavía falta conectar OPENAI_API_KEY en Supabase para que NIA analice en profundidad y proponga respuestas inteligentes. La conexión con LiveNos ya está funcionando.
`.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  if (req.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    const userMessage = cleanText(payload.message || payload.text);

    if (!userMessage) {
      return jsonResponse({ ok: false, error: "El mensaje está vacío." }, 400);
    }

    const supabase = getSupabaseAdmin();
    const conversationId = getConversationId(payload);

    const { conversation, messages } = await loadConversationContext({
      supabase,
      conversationId
    });

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      userMessage,
      context: payload.context || {},
      conversation,
      messages
    });

    const ai = await callOpenAI({
      systemPrompt,
      userPrompt
    });

    const finalText = ai.ok
      ? ai.text
      : ai.missingKey
        ? fallbackResponse({
            userMessage,
            context: payload.context || {},
            messages
          })
        : `No pude generar la respuesta de NIA.\n\nDetalle: ${ai.text}`;

    return jsonResponse({
      ok: true,
      text: finalText,
      tool: conversationId ? "nia_livenos_context" : "nia_chat",
      conversation_id: conversationId,
      used_openai: ai.ok
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: getErrorMessage(error)
      },
      500
    );
  }
});