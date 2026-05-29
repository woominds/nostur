// src/components/comunicaciones/components/CommercialAssistantChat.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Clipboard,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound
} from "lucide-react";

import {
  AiFeedbackModal,
  type AiFeedbackModalState,
  type AiFeedbackType
} from "./AiFeedbackModal";

import {
  getComunicacionDisplayName,
  useComunicacionesStore,
  type AiAssistantMessage,
  type AiConversationAnalysis,
  type ComunicacionConversation,
  type ContactAiProfile
} from "../../../store/comunicacionesStore";

import { supabase } from "../../../lib/supabase";
import { formatDateTime } from "../comunicacionesPanel.helpers";

type ComunicacionesState = ReturnType<typeof useComunicacionesStore.getState>;

type CommercialAssistantChatProps = {
  conversation: ComunicacionConversation;
  aiAnalysis: AiConversationAnalysis | unknown | null;
  compact?: boolean;
  onUseTextAsReply?: (text: string) => void;
};

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getAiSummary(aiAnalysis: unknown): string {
  const analysis = readRecord(aiAnalysis);
  return cleanText(analysis.resumen || analysis.summary || analysis.sintesis);
}

function getAiSuggestedResponse(aiAnalysis: unknown): string {
  const analysis = readRecord(aiAnalysis);

  return cleanText(
    analysis.respuesta_sugerida ||
      analysis.suggested_response ||
      analysis.suggested_reply ||
      analysis.reply
  );
}

function getAiPersistedEventId(aiAnalysis: unknown): string | null {
  const analysis = readRecord(aiAnalysis);
  const raw = readRecord(analysis.raw);

  return (
    cleanText(
      analysis.persisted_event_id ||
        analysis.ai_event_id ||
        raw.persisted_event_id ||
        raw.id
    ) || null
  );
}

function getProfileSummary(profile: ContactAiProfile | null): string {
  if (!profile) return "";

  return cleanText(
    [
      profile.resumen_general ? `Resumen general: ${profile.resumen_general}` : "",
      profile.preferencias_generales ? `Preferencias: ${profile.preferencias_generales}` : "",
      profile.destinos_interes?.length ? `Destinos de interés: ${profile.destinos_interes.join(", ")}` : "",
      profile.cantidad_pasajeros ? `Pasajeros: ${profile.cantidad_pasajeros}` : "",
      profile.presupuesto_estimado ? `Presupuesto: ${profile.presupuesto_estimado}` : "",
      profile.informacion_faltante?.length
        ? `Información faltante: ${profile.informacion_faltante.join(", ")}`
        : ""
    ]
      .filter(Boolean)
      .join("\n")
  );
}

function getMessageContent(message: AiAssistantMessage): string {
  return cleanText(message.content || message.audio_transcript || "");
}

function isAssistantMessage(message: AiAssistantMessage): boolean {
  return message.role === "assistant";
}

function getMessageTime(message: AiAssistantMessage): number {
  const time = new Date(message.created_at || "").getTime();
  return Number.isFinite(time) ? time : 0;
}

function dedupeVisibleMessages(messages: AiAssistantMessage[]): AiAssistantMessage[] {
  const ordered = [...messages].sort((a, b) => getMessageTime(a) - getMessageTime(b));
  const result: AiAssistantMessage[] = [];

  for (const message of ordered) {
    const content = getMessageContent(message);
    const previous = result[result.length - 1];

    if (!previous) {
      result.push(message);
      continue;
    }

    const previousContent = getMessageContent(previous);
    const sameRole = previous.role === message.role;
    const sameContent = previousContent === content;
    const closeTime = Math.abs(getMessageTime(previous) - getMessageTime(message)) <= 8000;

    if (sameRole && sameContent && closeTime) {
      continue;
    }

    result.push(message);
  }

  return result;
}

function CommercialAssistantMessageBubble({
  message,
  onUseTextAsReply,
  onOpenFeedback
}: {
  message: AiAssistantMessage;
  onUseTextAsReply?: (text: string) => void;
  onOpenFeedback: (feedbackType: AiFeedbackType, message: AiAssistantMessage, originalAnswer: string) => void;
}) {
  const assistant = isAssistantMessage(message);
  const content = getMessageContent(message);

  if (!content) return null;

  return (
    <div className={["flex gap-3", assistant ? "justify-start" : "justify-end"].join(" ")}>
      {assistant ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <Bot size={17} />
        </div>
      ) : null}

      <div
        className={[
          "rounded-[22px] px-4 py-3 shadow-sm",
          assistant
            ? "max-w-[96%] border border-violet-200 bg-white text-violet-950"
            : "max-w-[88%] bg-[#4f7c90] text-white"
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap text-[14px] leading-7">
          {content}
        </div>

        <div
          className={[
            "mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px]",
            assistant ? "text-violet-500" : "text-white/75"
          ].join(" ")}
        >
          <span>{formatDateTime(message.created_at)}</span>

          {assistant ? (
            <div className="flex items-center gap-1.5">
              {onUseTextAsReply ? (
                <button
                  type="button"
                  onClick={() => onUseTextAsReply(content)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[12px] text-violet-700 hover:bg-violet-50"
                  title="Usar como respuesta"
                >
                  <Clipboard size={13} />
                  Usar
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => onOpenFeedback("POSITIVO", message, content)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-green-700 hover:bg-green-50"
                title="La respuesta fue útil"
              >
                <ThumbsUp size={15} />
              </button>

              <button
                type="button"
                onClick={() => onOpenFeedback("NEGATIVO", message, content)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-red-700 hover:bg-red-50"
                title="La respuesta no fue útil"
              >
                <ThumbsDown size={15} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {!assistant ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#4f7c90]/10 text-[#4f7c90]">
          <UserRound size={17} />
        </div>
      ) : null}
    </div>
  );
}

export function CommercialAssistantChat({
  conversation,
  aiAnalysis,
  compact = false,
  onUseTextAsReply
}: CommercialAssistantChatProps) {
  const loadingAssistant = useComunicacionesStore(
    (state: ComunicacionesState) => state.loadingAssistant
  );

  const contactAiProfile = useComunicacionesStore((state: ComunicacionesState) =>
    state.getContactAiProfileByConversationId(conversation.id)
  );

  const sendAssistantMessage = useComunicacionesStore(
    (state: ComunicacionesState) => state.sendAssistantMessage
  );

  const createAiFeedback = useComunicacionesStore(
    (state: ComunicacionesState) => state.createAiFeedback
  );

  const [draft, setDraft] = useState("");
  const [localThreadId, setLocalThreadId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<AiAssistantMessage[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<AiFeedbackModalState>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeThreadId = localThreadId;

  const visibleMessages = useMemo(() => {
    return dedupeVisibleMessages(
      localMessages
        .filter((message) => message.conversation_id === conversation.id)
        .filter((message) => ["user", "assistant"].includes(String(message.role)))
    );
  }, [localMessages, conversation.id]);

  const profileSummary = useMemo(() => getProfileSummary(contactAiProfile), [contactAiProfile]);

  const lastUserPrompt = useMemo(() => {
    const reversed = [...visibleMessages].reverse();
    const userMessage = reversed.find((message) => message.role === "user");

    return userMessage ? getMessageContent(userMessage) : "";
  }, [visibleMessages]);

  const suggestedPrompts = useMemo(() => {
    const prompts = [
      "¿Qué le respondo a este pasajero?",
      "Resumime la conversación y decime el próximo paso.",
      "¿Qué datos faltan para poder cotizar?",
      "Armame una respuesta breve y cálida.",
      "¿Cómo puedo mejorar la chance de cierre?"
    ];

    const aiResponse = getAiSuggestedResponse(aiAnalysis);

    if (aiResponse) {
      return ["Mejorá esta respuesta para WhatsApp.", ...prompts.slice(0, 4)];
    }

    return prompts;
  }, [aiAnalysis]);

  async function refreshCurrentChat() {
    setLocalLoading(true);

    const messagesRes = await supabase
      .from("ai_assistant_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesRes.error) {
      console.error("Error cargando mensajes IA por conversación:", messagesRes.error);
      setLocalThreadId(null);
      setLocalMessages([]);
      setLocalLoading(false);
      return;
    }

    const messages = (messagesRes.data || []) as AiAssistantMessage[];

    const latestThreadId =
      [...messages]
        .reverse()
        .find((message) => Boolean(message.thread_id))?.thread_id || null;

    setLocalThreadId(latestThreadId);
    setLocalMessages(messages);
    setLocalLoading(false);
  }

  useEffect(() => {
    setLocalThreadId(null);
    setLocalMessages([]);
    setFeedbackModal(null);
    void refreshCurrentChat();
  }, [conversation.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleMessages.length, activeThreadId]);

  async function handleSend(text?: string) {
    const content = cleanText(text || draft);

    if (!content || loadingAssistant || localLoading) return;

    const aiSummary = getAiSummary(aiAnalysis);
    const aiSuggestedResponse = getAiSuggestedResponse(aiAnalysis);

    setDraft("");

    const ok = await sendAssistantMessage({
      thread_id: activeThreadId,
      title: `IA · ${getComunicacionDisplayName(conversation)}`,
      conversation_id: conversation.id,
      contacto_id: conversation.contacto_id || null,
      cliente_id: conversation.cliente_id || null,
      contact_ai_profile_id: contactAiProfile?.id || null,
      content,
      metadata: {
        source: "comunicaciones_right_panel",
        context: {
          conversation_id: conversation.id,
          contacto_nombre: getComunicacionDisplayName(conversation),
          telefono: conversation.telefono,
          email: conversation.email,
          estado_gestion: conversation.estado_gestion,
          estado_comercial: conversation.estado_comercial,
          prioridad: conversation.prioridad,
          vendedor: conversation.assigned_full_name,
          sucursal: conversation.sucursal_nombre,
          last_message: conversation.last_message,
          ai_summary: aiSummary,
          ai_suggested_response: aiSuggestedResponse,
          contact_ai_profile_summary: profileSummary
        }
      }
    });

    if (ok) {
      await refreshCurrentChat();

      await new Promise((resolve) => window.setTimeout(resolve, 700));
      await refreshCurrentChat();

      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      await refreshCurrentChat();
    }
  }

  function handleOpenFeedback(
    feedbackType: AiFeedbackType,
    message: AiAssistantMessage,
    originalAnswer: string
  ) {
    setFeedbackModal({
      feedbackType,
      message,
      originalAnswer
    });
  }

  async function handleSaveFeedback(rating: number, comment: string) {
    if (!feedbackModal) return;

    setSavingFeedback(true);

    const ok = await createAiFeedback({
      conversation_id: conversation.id,
      contacto_id: conversation.contacto_id || null,
      cliente_id: conversation.cliente_id || null,
      contact_ai_profile_id: contactAiProfile?.id || null,
      ai_event_id: getAiPersistedEventId(aiAnalysis),
      thread_id: activeThreadId,
      assistant_message_id: feedbackModal.message.id,
      feedback_type: feedbackModal.feedbackType,
      rating,
      comment,
      original_ai_answer: feedbackModal.originalAnswer,
      original_user_prompt: lastUserPrompt,
      source: "commercial_assistant_chat",
      module: "comunicaciones",
      context_snapshot: {
        conversation_id: conversation.id,
        contacto_nombre: getComunicacionDisplayName(conversation),
        telefono: conversation.telefono,
        email: conversation.email,
        estado_gestion: conversation.estado_gestion,
        estado_comercial: conversation.estado_comercial,
        prioridad: conversation.prioridad,
        vendedor: conversation.assigned_full_name,
        sucursal: conversation.sucursal_nombre,
        last_message: conversation.last_message,
        ai_summary: getAiSummary(aiAnalysis),
        contact_ai_profile_summary: profileSummary
      },
      metadata: {
        ui: "CommercialAssistantChat",
        feedback_origin: feedbackModal.feedbackType === "POSITIVO" ? "thumbs_up" : "thumbs_down"
      }
    });

    setSavingFeedback(false);

    if (ok) {
      setFeedbackModal(null);
    }
  }

  return (
    <>
      <section
        className={[
          "rounded-[28px] border border-violet-200 bg-white/90 shadow-sm",
          compact ? "p-4" : "p-5"
        ].join(" ")}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Bot size={22} />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-[18px] text-violet-950">
                  Asistente del chat
                </h3>

                <p className="mt-1 text-[14px] text-violet-700/75">
                  Consultá a la IA sobre esta conversación.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void refreshCurrentChat();
            }}
            disabled={loadingAssistant || localLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm ring-1 ring-violet-200 hover:bg-violet-50 disabled:opacity-50"
            title="Actualizar chat IA"
          >
            <RefreshCcw
              size={17}
              className={loadingAssistant || localLoading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {profileSummary ? (
          <details className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-4" open={visibleMessages.length === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[14px] text-violet-800">
              <Sparkles size={16} />
              Ficha IA disponible
            </summary>

            <div className="mt-3 line-clamp-5 whitespace-pre-wrap text-[14px] leading-7 text-violet-950">
              {profileSummary}
            </div>
          </details>
        ) : null}

        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedPrompts.slice(0, compact ? 3 : 5).map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={loadingAssistant || localLoading}
              className="flex min-h-10 items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-left text-[14px] text-violet-800 hover:bg-violet-100 disabled:opacity-50"
            >
              <MessageSquareText size={16} />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        <div className="mb-4 max-h-[560px] min-h-[360px] overflow-auto rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
          {(loadingAssistant || localLoading) && visibleMessages.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-[14px] text-[#64748b]">
              <Loader2 size={18} className="mr-2 animate-spin" />
              Cargando conversación con IA...
            </div>
          ) : visibleMessages.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-center">
              <div className="max-w-[320px]">
                <Bot size={34} className="mx-auto mb-3 text-violet-500" />

                <div className="text-[15px] text-[#111827]">
                  Todavía no hablaste con la IA en este chat.
                </div>

                <div className="mt-2 text-[14px] leading-6 text-[#64748b]">
                  Podés pedirle una respuesta sugerida, un resumen, los datos faltantes o una estrategia de seguimiento.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleMessages.map((message) => (
                <CommercialAssistantMessageBubble
                  key={message.id}
                  message={message}
                  onUseTextAsReply={onUseTextAsReply}
                  onOpenFeedback={handleOpenFeedback}
                />
              ))}

              {loadingAssistant || localLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-[14px] text-violet-700">
                  <Loader2 size={15} className="animate-spin" />
                  La IA está pensando...
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Escribile a la IA sobre este pasajero..."
            className="min-h-[112px] resize-none rounded-[24px] border border-black/10 bg-white px-4 py-3 text-[14px] leading-6 text-[#111827] outline-none focus:border-violet-400"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loadingAssistant || localLoading || !draft.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-[14px] text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {loadingAssistant || localLoading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Send size={17} />
            )}

            {loadingAssistant || localLoading ? "Enviando..." : "Enviar a IA"}
          </button>

          <div className="text-center text-[12px] text-[#94a3b8]">
            Tip: Cmd/Ctrl + Enter para enviar.
          </div>
        </div>
      </section>

      <AiFeedbackModal
        state={feedbackModal}
        saving={savingFeedback}
        onClose={() => setFeedbackModal(null)}
        onSave={handleSaveFeedback}
      />
    </>
  );
}