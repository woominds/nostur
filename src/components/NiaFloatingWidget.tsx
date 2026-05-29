import { useEffect, useMemo, useState } from "react";
import { Bot, Mic, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";

type NiaFloatingWidgetProps = {
  activeUrl: string;
};

type NiaContext = {
  source?: string;
  module?: string;
  action?: string;

  conversation_id?: string;
  conversacion_id?: string;

  wa_phone?: string;
  contacto_id?: string;
  contacto?: string;
  contacto_nombre?: string;
  contacto_profile_name?: string | null;

  vendedor_id?: string | null;
  vendedor_nombre?: string | null;

  estado_gestion?: string | null;
  estado_comercial?: string | null;
  inbox?: string | null;
  status?: string | null;

  last_message_at?: string | null;
  last_inbound_message_at?: string | null;
  last_outbound_message_at?: string | null;
  last_message_preview?: string | null;

  ventana_24h_abierta?: boolean;
  whatsapp_24h_expires_at?: string | null;

  oportunidad_id?: string | null;
  oportunidad_score?: number | null;
  oportunidad_estado_id?: string | null;
  oportunidad_datos?: Record<string, unknown> | null;

  cande_activa?: boolean;
  cande_handoff_requested_at?: string | null;

  created_at?: string;
};

type ChatMessage = {
  id: string;
  direction: "user" | "assistant";
  text: string;
  tool?: string;
};

function isInternalUrl(activeUrl: string): boolean {
  return activeUrl.startsWith("internal://");
}

function getNiaConversationId(context: NiaContext | null): string | null {
  return context?.conversation_id || context?.conversacion_id || null;
}

function getNiaPassengerName(context: NiaContext | null): string {
  return (
    context?.contacto_nombre ||
    context?.contacto ||
    context?.contacto_profile_name ||
    context?.wa_phone ||
    "conversación de LiveNos"
  );
}

function formatContextValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";

  if (typeof value === "boolean") return value ? "Sí" : "No";

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function buildNiaContextSummary(context: NiaContext | null): string {
  if (!getNiaConversationId(context)) {
    return "NIA abierta sin conversación seleccionada.";
  }

  return [
    `Pasajero: ${getNiaPassengerName(context)}`,
    `WhatsApp: ${formatContextValue(context?.wa_phone)}`,
    `Vendedor: ${formatContextValue(context?.vendedor_nombre)}`,
    `Estado gestión: ${formatContextValue(context?.estado_gestion)}`,
    `Estado comercial: ${formatContextValue(context?.estado_comercial)}`,
    `Último mensaje: ${formatContextValue(context?.last_message_preview)}`,
    `Ventana 24h abierta: ${formatContextValue(context?.ventana_24h_abierta)}`,
    `Score oportunidad: ${formatContextValue(context?.oportunidad_score)}`,
    `Cande activa: ${formatContextValue(context?.cande_activa)}`,
    `Datos oportunidad: ${formatContextValue(context?.oportunidad_datos)}`
  ].join("\n");
}

function getInitialMessages(context: NiaContext | null): ChatMessage[] {
  if (getNiaConversationId(context)) {
    return [
      {
        id: crypto.randomUUID(),
        direction: "assistant",
        text: `Estoy viendo el contexto real de LiveNos.\n\n${buildNiaContextSummary(
          context
        )}\n\nPodés pedirme, por ejemplo:\n• Resumí esta conversación.\n• Decime qué debería responder el vendedor.\n• Detectá si está caliente o fría.\n• Decime si conviene activar, pausar o derivar CANDE.`,
        tool: "contexto_livenos"
      }
    ];
  }

  return [
    {
      id: crypto.randomUUID(),
      direction: "assistant",
      text: "Hola, soy NIA. Puedo ayudarte con oportunidades, conversaciones, reportes, alertas comerciales y acciones internas."
    }
  ];
}

export function NiaFloatingWidget({ activeUrl }: NiaFloatingWidgetProps) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<NiaContext | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages(null));

  const visible = useMemo(() => {
    if (!isInternalUrl(activeUrl)) return false;
    return true;
  }, [activeUrl]);

  function readContextFromStorage() {
    const raw = window.localStorage.getItem("nostur_nia_context");

    if (!raw) {
      setContext(null);
      setMessages(getInitialMessages(null));
      return;
    }

    try {
      const parsed = JSON.parse(raw) as NiaContext;
      setContext(parsed);
      setMessages(getInitialMessages(parsed));
    } catch {
      setContext(null);
      setMessages(getInitialMessages(null));
    }
  }

  function openChat() {
    readContextFromStorage();
    setOpen(true);
  }

  function closeChat() {
    setOpen(false);
  }

  function handleSend() {
    const clean = input.trim();

    if (!clean) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      direction: "user",
      text: clean
    };

  const hasConversationContext = Boolean(getNiaConversationId(context));

const assistantMessage: ChatMessage = {
  id: crypto.randomUUID(),
  direction: "assistant",
  text: hasConversationContext
    ? `Recibido. Voy a trabajar sobre este contexto de LiveNos:\n\n${buildNiaContextSummary(
        context
      )}\n\nPedido del vendedor:\n"${clean}"\n\nEn el próximo paso conectamos este chat a la función real de NIA para que pueda leer mensajes completos, resumir, sugerir respuesta y ejecutar acciones internas.`
    : `Recibido.\n\nPedido:\n"${clean}"\n\nEn el próximo paso conectamos este chat con la función real de NIA para leer datos del sistema y ejecutar acciones internas.`,
  tool: hasConversationContext ? "contexto_livenos" : "chat_nia"
};

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInput("");
  }

  useEffect(() => {
    function handleOpenNiaChat(event: Event) {
      const customEvent = event as CustomEvent<NiaContext | undefined>;

      if (customEvent.detail) {
        window.localStorage.setItem("nostur_nia_context", JSON.stringify(customEvent.detail));
      }

      readContextFromStorage();
      setOpen(true);
    }

    window.addEventListener("nostur:open-nia-chat", handleOpenNiaChat);

    return () => {
      window.removeEventListener("nostur:open-nia-chat", handleOpenNiaChat);
    };
  }, []);

  if (!visible) return null;

  return (
    <>
      {!open ? (
        <div className="nostur-no-drag fixed bottom-6 right-6 z-[900]">
          <button
            type="button"
            onClick={openChat}
            className="group flex h-14 items-center gap-3 rounded-full bg-gradient-to-br from-[#ff2f76] to-[#8b2cff] px-4 pr-5 text-white shadow-2xl shadow-purple-500/30 transition hover:scale-[1.03] hover:shadow-purple-500/40"
            title="Abrir NIA"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/18">
              <Bot size={19} strokeWidth={2} />

              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[#8b2cff]">
                <Sparkles size={10} strokeWidth={2.5} />
              </span>
            </span>

            <span className="hidden flex-col items-start leading-none sm:flex">
              <span className="text-[12px] font-black">NIA</span>
              <span className="mt-1 text-[10px] font-bold text-white/75">Asistente interno</span>
            </span>
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="nostur-no-drag fixed inset-0 z-[950]">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/28 backdrop-blur-[3px]"
            onClick={closeChat}
            tabIndex={-1}
          />

          <aside className="absolute bottom-4 right-4 top-4 flex w-[410px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-2xl">
            <header className="shrink-0 bg-gradient-to-r from-[#ff2f76] to-[#8b2cff] px-4 py-3 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/18">
                    <Sparkles size={20} />
                  </div>

                  <div>
                    <div className="text-base font-black leading-none">NIA</div>
                    <div className="mt-1 text-xs font-bold text-white/75">Asistente comercial</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeChat}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl text-white/85 hover:bg-white/15 hover:text-white"
                  title="Cerrar NIA"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="shrink-0 border-b border-black/10 bg-white px-4 py-3">
              <div className="text-sm font-black text-[#dc1748]">
                ✨ Pedile a NIA un resumen de tus oportunidades
              </div>

            {getNiaConversationId(context) ? (
  <div className="mt-2 rounded-2xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-bold text-[#5b21b6]">
    <div className="font-black">
      Contexto activo: {getNiaPassengerName(context)}
    </div>

    <div className="mt-1 text-[11px] leading-relaxed text-[#6d28d9]">
      WhatsApp: {context?.wa_phone || "—"} · Score:{" "}
      {context?.oportunidad_score ?? "—"} · CANDE:{" "}
      {context?.cande_activa ? "activa" : "pausada"} · 24h:{" "}
      {context?.ventana_24h_abierta ? "abierta" : "cerrada"}
    </div>
  </div>
) : null}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto bg-[#fafafa] px-4 py-4">
              {messages.map((message) => {
                const isUser = message.direction === "user";

                return (
                  <div key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={[
                        "max-w-[86%] rounded-[22px] px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm",
                        isUser
                          ? "rounded-br-md bg-[#8b2cff] text-white"
                          : "rounded-bl-md border border-black/10 bg-white text-[#172033]"
                      ].join(" ")}
                    >
                      <div className="whitespace-pre-wrap">{message.text}</div>

                      {!isUser ? (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          {message.tool ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                              ✓ {message.tool}
                            </span>
                          ) : (
                            <span />
                          )}

                          <span className="flex gap-1 text-[#94a3b8]">
                            <ThumbsUp size={13} />
                            <ThumbsDown size={13} />
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="shrink-0 border-t border-black/10 bg-white p-3">
              <div className="flex items-end gap-2 rounded-[24px] bg-[#eef2f7] p-2">
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#64748b] hover:bg-white"
                  title="Audio"
                >
                  <Mic size={18} />
                </button>

                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Hablale a NIA..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm font-semibold text-[#172033] outline-none placeholder:text-[#94a3b8]"
                />

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8b2cff] text-white shadow-sm transition hover:bg-[#7c3aed] disabled:opacity-50"
                  title="Enviar"
                >
                  <Send size={17} />
                </button>
              </div>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}