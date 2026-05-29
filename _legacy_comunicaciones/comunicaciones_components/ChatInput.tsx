import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Paperclip, Search, Send, Smile, Square, X } from "lucide-react";

import {
  getQuickReplyCategoriaLabel,
  type ComunicacionConversation,
  type ComunicacionMessage,
  type QuickReply,
  type SendMessageDraft
} from "../../store/comunicacionesStore";

import { transcodeAudioToMp3 } from "../../lib/audioTranscode";

import { NosturSelect } from "./comunicacionesPanel.ui";
import { EMOJI_OPTIONS, QUICK_REPLY_CATEGORY_OPTIONS } from "./comunicacionesPanel.constants";

import {
  canCurrentUserWrite,
  formatDurationSeconds,
  formatFileSize,
  getAudioExtensionFromMime,
  getBestAudioMimeType,
  isWindowOpen,
  normalizeSearch
} from "./comunicacionesPanel.helpers";

type ReplyState = ComunicacionMessage | null;



export function ChatInput({
  selectedConversation,
  quickReplies,
  saving,
  uploading,
  replyToMessage,
  externalDraftText,
  onCancelReply,
  onExternalDraftTextConsumed,
  onSend,
  onOpenTemplateModal,
  onUseQuickReply
}: {
  selectedConversation: ComunicacionConversation | null;
  quickReplies: QuickReply[];
  saving: boolean;
  uploading: boolean;
  replyToMessage: ReplyState;
  externalDraftText: string;
  onCancelReply: () => void;
  onExternalDraftTextConsumed: () => void;
  onSend: (draft: SendMessageDraft) => Promise<void>;
  onOpenTemplateModal: () => void;
  onUseQuickReply: (reply: QuickReply) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [internal, setInternal] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [quickCategory, setQuickCategory] = useState("todas");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [recordingPreviewUrl, setRecordingPreviewUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!externalDraftText.trim()) return;

    setContent(externalDraftText);
    onExternalDraftTextConsumed();
  }, [externalDraftText, onExternalDraftTextConsumed]);

  const activeQuickReplies = useMemo(() => {
    const search = normalizeSearch(quickSearch);

    return quickReplies
      .filter((reply) => reply.activo)
      .filter((reply) => quickCategory === "todas" || reply.categoria === quickCategory)
      .filter((reply) => {
        if (!search) return true;
        return normalizeSearch(`${reply.titulo} ${reply.contenido} ${reply.categoria}`).includes(search);
      })
      .slice(0, 30);
  }, [quickReplies, quickSearch, quickCategory]);

  const mustTakeBeforeWriting =
    Boolean(selectedConversation?.can_take) ||
    selectedConversation?.inbox_folder === "MENSAJE_NUEVO" ||
    (!selectedConversation?.assigned_to && selectedConversation?.channel === "whatsapp");

  const canWrite = canCurrentUserWrite(selectedConversation) && !mustTakeBeforeWriting;

  const whatsappWindowClosed =
    Boolean(selectedConversation) &&
    selectedConversation?.channel === "whatsapp" &&
    !isWindowOpen(selectedConversation);

  const blockFreeWhatsappMessage = whatsappWindowClosed && !internal;
  const blockedByAssignment = Boolean(selectedConversation) && !canWrite && !internal;
  const activeMediaFile = recordingFile || file;

  const canSend =
    Boolean(selectedConversation) &&
    canWrite &&
    !saving &&
    !uploading &&
    !recording &&
    Boolean(content.trim() || activeMediaFile);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    return () => {
      if (recordingPreviewUrl) URL.revokeObjectURL(recordingPreviewUrl);
    };
  }, [recordingPreviewUrl]);

  function appendEmoji(emoji: string) {
    setContent((current) => `${current}${emoji}`);
  }

  function clearRecording() {
    if (recordingPreviewUrl) URL.revokeObjectURL(recordingPreviewUrl);

    setRecordingFile(null);
    setRecordingPreviewUrl(null);
    setRecordingSeconds(0);
    setRecordingError(null);
  }

  function insertQuickReply(reply: QuickReply, mode: "replace" | "append") {
    if (mode === "replace") {
      setContent(reply.contenido);
    } else {
      setContent((current) => {
        const base = current.trimEnd();
        if (!base) return reply.contenido;
        return `${base}\n\n${reply.contenido}`;
      });
    }

    void onUseQuickReply(reply);
    setQuickOpen(false);
  }

  async function startRecording() {
    if (!selectedConversation || blockFreeWhatsappMessage || blockedByAssignment || internal || recording) return;

    try {
      clearRecording();
      setFile(null);
      setQuickOpen(false);
      setEmojiOpen(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        void (async () => {
          const finalMimeType = recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(recordingChunksRef.current, { type: finalMimeType });
          const extension = getAudioExtensionFromMime(finalMimeType);
          const rawAudioFile = new globalThis.File([blob], `audio-${Date.now()}.${extension}`, {
            type: finalMimeType
          });

          const previewUrl = URL.createObjectURL(blob);
          setRecordingPreviewUrl(previewUrl);

          try {
            const result = await transcodeAudioToMp3(rawAudioFile);
            setRecordingFile(result.file);
            setRecordingError(
              result.converted
                ? "Audio convertido a MP3 compatible con WhatsApp. Ya podés enviarlo."
                : null
            );
          } catch {
            setRecordingFile(rawAudioFile);
            setRecordingError("No se pudo convertir el audio. Se intentará enviar el archivo original.");
          }

          recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
          mediaRecorderRef.current = null;
        })();
      };

      recorder.start();

      setRecording(true);
      setRecordingSeconds(0);
      setRecordingError(null);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
    } catch {
      setRecordingError("No se pudo acceder al micrófono.");
      setRecording(false);
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  }

  async function handleSend() {
    if (!selectedConversation) return;
    if (blockFreeWhatsappMessage || blockedByAssignment) return;
    if (!content.trim() && !activeMediaFile) return;

    await onSend({
      conversation_id: selectedConversation.id,
      content,
      message_type: activeMediaFile ? undefined : "text",
      media_file: activeMediaFile,
      is_internal: internal,
      reply_to_id: replyToMessage?.id || null,
      reply_to_whatsapp_message_id: replyToMessage?.whatsapp_message_id || null
    });

    setContent("");
    setFile(null);
    clearRecording();
    setInternal(false);
    setQuickOpen(false);
    setEmojiOpen(false);
    onCancelReply();
  }

  return (
    <div className="border-t border-black/10 bg-white/90 p-3">
      {blockedByAssignment ? (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-700">
          Esta conversación todavía no está asignada a vos. Para responder, usá el botón{" "}
          <strong>Tomar conversación</strong>.
        </div>
      ) : null}

      {whatsappWindowClosed ? (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-black text-amber-800">Ventana de 24 horas cerrada</div>
              <div className="mt-1 font-semibold leading-5 text-amber-700">
                Para iniciar o retomar esta conversación por WhatsApp tenés que enviar una plantilla aprobada por Meta.
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenTemplateModal}
              disabled={!selectedConversation || saving || uploading || blockedByAssignment}
              className="h-9 shrink-0 rounded-xl bg-[#4f7c90] px-4 text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar plantilla
            </button>
          </div>
        </div>
      ) : null}

      {replyToMessage ? (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-2xl border border-[#4f7c90]/20 bg-[#4f7c90]/10 px-3 py-2 text-xs">
          <div className="min-w-0">
            <div className="font-black text-[#31596a]">
              Respondiendo a {replyToMessage.sender_name || "mensaje"}
            </div>
            <div className="mt-1 truncate font-semibold text-[#475569]">
              {replyToMessage.content || replyToMessage.media_filename || "Archivo"}
            </div>
          </div>

          <button type="button" onClick={onCancelReply} className="text-[#64748b] hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {file ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#334155]">
          <span className="truncate">Adjuntar: {file.name} · {formatFileSize(file.size)}</span>
          <button type="button" onClick={() => setFile(null)} className="text-[#64748b] hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {recording ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">
          <span>Grabando audio... {formatDurationSeconds(recordingSeconds)}</span>
          <button type="button" onClick={stopRecording} className="rounded-xl bg-red-600 px-3 py-1.5 text-[11px] text-white">
            Detener
          </button>
        </div>
      ) : null}

      {recordingFile && recordingPreviewUrl ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-bold text-[#334155]">
          <div className="min-w-0 flex flex-1 items-center gap-3">
            <audio src={recordingPreviewUrl} controls className="h-8 max-w-[280px]" />
            <span className="truncate">Audio listo · {formatFileSize(recordingFile.size)}</span>
          </div>

          <button type="button" onClick={clearRecording} className="text-[#64748b] hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {recordingError ? (
        <div className="mb-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
          {recordingError}
        </div>
      ) : null}

      {emojiOpen ? (
        <div className="mb-2 rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div className="text-[11px] font-black uppercase tracking-wide text-[#64748b]">Emoticones</div>

            <button
              type="button"
              onClick={() => setEmojiOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
              title="Cerrar emoticones"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-10 gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => appendEmoji(emoji)}
                className="flex h-8 items-center justify-center rounded-xl text-lg hover:bg-[#f1f5f9]"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {quickOpen ? (
        <div className="mb-2 rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                <Search size={14} className="text-[#64748b]" />
                <input
                  value={quickSearch}
                  onChange={(event) => setQuickSearch(event.target.value)}
                  placeholder="Buscar respuesta rápida..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="w-44">
              <NosturSelect value={quickCategory} onChange={setQuickCategory} options={QUICK_REPLY_CATEGORY_OPTIONS} />
            </div>

            <button
              type="button"
              onClick={() => setQuickOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-56 overflow-auto rounded-2xl bg-[#f8fafc] p-1">
            {activeQuickReplies.length === 0 ? (
              <div className="px-3 py-3 text-xs font-bold text-[#94a3b8]">
                Sin respuestas rápidas para este filtro.
              </div>
            ) : (
              activeQuickReplies.map((reply) => (
                <div key={reply.id} className="mb-1 rounded-xl bg-white p-2 last:mb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black text-[#111827]">{reply.titulo}</div>
                      <div className="mt-0.5 text-[10px] font-black uppercase text-[#64748b]">
                        {getQuickReplyCategoriaLabel(reply.categoria || "generales")}
                        {reply.global ? " · Global" : " · Personal"}
                        {Number(reply.uso_contador || 0) > 0 ? ` · ${reply.uso_contador} usos` : ""}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => insertQuickReply(reply, "append")}
                        disabled={blockFreeWhatsappMessage || blockedByAssignment}
                        className="h-8 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-[11px] font-black text-[#334155] hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Insertar
                      </button>

                      <button
                        type="button"
                        onClick={() => insertQuickReply(reply, "replace")}
                        disabled={blockFreeWhatsappMessage || blockedByAssignment}
                        className="h-8 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Usar
                      </button>
                    </div>
                  </div>

                  <div className="mt-1 line-clamp-2 whitespace-pre-wrap text-[11px] font-semibold leading-4 text-[#475569]">
                    {reply.contenido}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!selectedConversation || blockFreeWhatsappMessage || blockedByAssignment || Boolean(recordingFile)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-40"
          title="Adjuntar"
        >
          <Paperclip size={17} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setRecordingFile(null);
            setRecordingPreviewUrl(null);
          }}
        />

        <div
          className={[
            "min-w-0 flex-1 rounded-2xl border px-3 py-2",
            blockFreeWhatsappMessage || blockedByAssignment
              ? "border-amber-200 bg-amber-50"
              : "border-black/10 bg-[#f8fafc] focus-within:border-[#4f7c90]"
          ].join(" ")}
        >
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={
              internal
                ? "Escribir nota interna..."
                : blockedByAssignment
                  ? "Tomá la conversación para poder responder."
                  : blockFreeWhatsappMessage
                    ? "Mensaje libre bloqueado. Usá una plantilla aprobada de Meta."
                    : selectedConversation
                      ? "Escribir mensaje..."
                      : "Seleccioná una conversación"
            }
            disabled={!selectedConversation || blockFreeWhatsappMessage || blockedByAssignment || recording}
            className="max-h-28 min-h-[42px] w-full resize-none bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8] disabled:cursor-not-allowed"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setEmojiOpen(false);
                setQuickOpen(false);
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => setEmojiOpen((current) => !current)}
          disabled={blockFreeWhatsappMessage || blockedByAssignment || recording}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-40"
          title="Emoticones"
        >
          <Smile size={17} />
        </button>

        <button
          type="button"
          onClick={() => setQuickOpen((current) => !current)}
          disabled={blockFreeWhatsappMessage || blockedByAssignment || recording}
          className={[
            "flex h-10 items-center justify-center rounded-2xl border px-3 text-[11px] font-black disabled:cursor-not-allowed disabled:opacity-40",
            quickOpen
              ? "border-[#4f7c90]/30 bg-[#4f7c90]/10 text-[#31596a]"
              : "border-black/10 bg-white text-[#64748b] hover:bg-[#f8fafc] hover:text-[#111827]"
          ].join(" ")}
        >
          Rápidas
        </button>

        <button
          type="button"
          onClick={() => setInternal((current) => !current)}
          disabled={recording || Boolean(recordingFile)}
          className={[
            "flex h-10 items-center justify-center rounded-2xl border px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-40",
            internal
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-black/10 bg-white text-[#64748b] hover:bg-[#f8fafc]"
          ].join(" ")}
        >
          Interno
        </button>

        {blockFreeWhatsappMessage ? (
          <button
            type="button"
            onClick={onOpenTemplateModal}
            disabled={!selectedConversation || saving || uploading || blockedByAssignment}
            className="flex h-10 items-center justify-center rounded-2xl bg-[#4f7c90] px-4 text-[11px] font-black text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Plantilla
          </button>
        ) : recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm hover:bg-red-700"
            title="Detener audio"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : activeMediaFile || content.trim() ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4f7c90] text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
            title="Enviar"
          >
            <Send size={17} />
          </button>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            disabled={!selectedConversation || saving || uploading || internal || blockedByAssignment}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4f7c90] text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
            title="Grabar audio"
          >
            <Mic size={17} />
          </button>
        )}
      </div>
    </div>
  );
}