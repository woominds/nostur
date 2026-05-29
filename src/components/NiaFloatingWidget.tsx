import { useEffect, useMemo, useState } from "react";
import { Bot, Mic, Send, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";

type NiaFloatingWidgetProps = {
  activeUrl: string;
};

type NiaContext = {
  source?: string;
  conversation_id?: string;
  wa_phone?: string;
  contacto?: string;
  oportunidad_id?: string | null;
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

function getInitialMessages(context: NiaContext | null): ChatMessage[] {
  if (context?.conversation_id) {
    return [
      {
        id: crypto.randomUUID(),
        direction: "assistant",
        text: `Estoy viendo el contexto de LiveNos.\n\nPasajero: ${context.contacto || "—"}\nWhatsApp: ${context.wa_phone || "—"}\n\nPedime un resumen, una acción o una recomendación sobre esta conversación.`
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

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      direction: "assistant",
      text: context?.conversation_id
        ? `Recibido. En la próxima fase voy a ejecutar esto contra la conversación ${context.contacto || context.wa_phone || ""}.\n\nPor ahora dejé preparado el chat contextual de NIA.`
        : "Recibido. En la próxima fase conectamos este chat con la función real de NIA para leer datos y ejecutar acciones.",
      tool: context?.conversation_id ? "contexto_livenos" : "chat_nia"
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

              {context?.conversation_id ? (
                <div className="mt-2 rounded-2xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs font-bold text-[#5b21b6]">
                  Contexto: {context.contacto || context.wa_phone || "conversación de LiveNos"}
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