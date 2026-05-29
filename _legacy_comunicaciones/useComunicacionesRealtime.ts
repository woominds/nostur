// src/hooks/useComunicacionesRealtime.ts

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type IncomingRealtimeMessage = {
  id: string;
  conversation_id: string;
  content: string | null;
  sender_name: string | null;
  message_type: string | null;
  direction: string | null;
  created_at: string | null;
  metadata?: Record<string, unknown> | null;
};

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

type UseComunicacionesRealtimeParams = {
  selectedConversationId: string | null;
  enabled: boolean;
  onRefreshConversations: (silent?: boolean) => Promise<void>;
  onRefreshMessages: (conversationId?: string | null, silent?: boolean) => Promise<void>;
  onRefreshNotes: (conversationId?: string | null, silent?: boolean) => Promise<void>;
  onIncomingMessage?: (message: IncomingRealtimeMessage) => void;
};

function isRealtimeMessage(payloadNew: unknown): payloadNew is IncomingRealtimeMessage {
  if (!payloadNew || typeof payloadNew !== "object") return false;

  const row = payloadNew as Record<string, unknown>;

  return Boolean(row.id) && Boolean(row.conversation_id);
}

function isInboundMessage(payloadNew: unknown): payloadNew is IncomingRealtimeMessage {
  if (!isRealtimeMessage(payloadNew)) return false;

  const row = payloadNew as Record<string, unknown>;

  return String(row.direction || "") === "inbound";
}

function isHandoffSystemMessage(payloadNew: unknown): payloadNew is IncomingRealtimeMessage {
  if (!isRealtimeMessage(payloadNew)) return false;

  const row = payloadNew as Record<string, unknown>;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return (
    metadata.play_handoff_sound === true ||
    metadata.customer_ai_handoff_status === "PENDIENTE_VENDEDOR" ||
    metadata.source === "customer_ai_handoff"
  );
}

function getMessagePreview(message: IncomingRealtimeMessage): string {
  const type = String(message.message_type || "text");

  if (message.content?.trim()) return message.content.trim();

  if (type === "image") return "Imagen recibida";
  if (type === "audio") return "Audio recibido";
  if (type === "video") return "Video recibido";
  if (type === "document") return "Documento recibido";
  if (type === "system") return "Nueva derivación de CANDE";

  return "Nuevo mensaje recibido";
}

function canNotifyNow(): boolean {
  return typeof document !== "undefined" && (document.hidden || !document.hasFocus());
}

function playIncomingSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.08);

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.28);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);

    window.setTimeout(() => {
      void audioContext.close();
    }, 350);
  } catch {
    // Silencioso por compatibilidad.
  }
}

function playHandoffSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const masterGain = audioContext.createGain();

    masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.45, audioContext.currentTime + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.05);

    masterGain.connect(audioContext.destination);

    const notes = [
      { frequency: 660, start: 0, duration: 0.16 },
      { frequency: 880, start: 0.18, duration: 0.16 },
      { frequency: 1180, start: 0.36, duration: 0.22 },
      { frequency: 880, start: 0.68, duration: 0.22 }
    ];

    notes.forEach((note) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(note.frequency, audioContext.currentTime + note.start);

      gain.gain.setValueAtTime(0.0001, audioContext.currentTime + note.start);
      gain.gain.exponentialRampToValueAtTime(0.35, audioContext.currentTime + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + note.start + note.duration
      );

      oscillator.connect(gain);
      gain.connect(masterGain);

      oscillator.start(audioContext.currentTime + note.start);
      oscillator.stop(audioContext.currentTime + note.start + note.duration + 0.03);
    });

    window.setTimeout(() => {
      void audioContext.close();
    }, 1300);
  } catch {
    // Silencioso por compatibilidad.
  }
}

async function showSystemNotification(message: IncomingRealtimeMessage, isHandoff = false) {
  try {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission !== "granted") return;

    const title = isHandoff
      ? "CANDE derivó una conversación"
      : message.sender_name || "Nuevo mensaje";

    const body = getMessagePreview(message);

    const notification = new Notification(title, {
      body,
      tag: `conversation-${message.conversation_id}`,
      silent: true
    });

    notification.onclick = () => {
      window.focus();

      window.dispatchEvent(
        new CustomEvent("nossix:open-conversation", {
          detail: {
            conversationId: message.conversation_id
          }
        })
      );

      notification.close();
    };
  } catch {
    // Silencioso por compatibilidad.
  }
}

export function useComunicacionesRealtime({
  selectedConversationId,
  enabled,
  onRefreshConversations,
  onRefreshMessages,
  onRefreshNotes,
  onIncomingMessage
}: UseComunicacionesRealtimeParams) {
  const refreshTimeoutRef = useRef<number | null>(null);
  const pollingRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    function clearRefreshTimeout() {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    }

    function scheduleRefresh(options?: {
      refreshMessages?: boolean;
      conversationId?: string | null;
      refreshNotes?: boolean;
      force?: boolean;
    }) {
      clearRefreshTimeout();

      refreshTimeoutRef.current = window.setTimeout(() => {
        if (!mountedRef.current) return;

        const now = Date.now();

        if (!options?.force && now - lastRefreshRef.current < 600) {
          return;
        }

        lastRefreshRef.current = now;

        void onRefreshConversations(true);

        if (options?.refreshMessages) {
          void onRefreshMessages(options.conversationId || selectedConversationId, true);
        }

        if (options?.refreshNotes) {
          void onRefreshNotes(options.conversationId || selectedConversationId, true);
        }
      }, 250);
    }

    async function notifyIncomingMessage(message: IncomingRealtimeMessage) {
      if (notifiedMessageIdsRef.current.has(message.id)) return;

      notifiedMessageIdsRef.current.add(message.id);

      if (notifiedMessageIdsRef.current.size > 200) {
        notifiedMessageIdsRef.current = new Set(Array.from(notifiedMessageIdsRef.current).slice(-80));
      }

      onIncomingMessage?.(message);

      playIncomingSound();

      if (canNotifyNow()) {
        await showSystemNotification(message, false);
      }
    }

    async function notifyHandoff(message: IncomingRealtimeMessage) {
      if (notifiedMessageIdsRef.current.has(`handoff-${message.id}`)) return;

      notifiedMessageIdsRef.current.add(`handoff-${message.id}`);

      if (notifiedMessageIdsRef.current.size > 200) {
        notifiedMessageIdsRef.current = new Set(Array.from(notifiedMessageIdsRef.current).slice(-80));
      }

      playHandoffSound();

      if (canNotifyNow()) {
        await showSystemNotification(message, true);
      }
    }

    const channel = supabase
      .channel(`comunicaciones-realtime-${Date.now()}`)
            .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_operational_alerts"
        },
        () => {
          scheduleRefresh({
            force: true
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations"
          
        },

        
        (payload: RealtimePayload) => {
          const conversationId =
            typeof payload.new === "object" &&
            payload.new &&
            "id" in payload.new
              ? String(payload.new.id || "")
              : null;

          scheduleRefresh({
            refreshMessages: Boolean(
              selectedConversationId && conversationId === selectedConversationId
            ),
            conversationId,
            force: true
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages"
        },
        (payload: RealtimePayload) => {
          const conversationId =
            typeof payload.new === "object" &&
            payload.new &&
            "conversation_id" in payload.new
              ? String(payload.new.conversation_id || "")
              : null;

          const belongsToSelectedConversation = Boolean(
            selectedConversationId && conversationId === selectedConversationId
          );

          if (payload.eventType === "INSERT" && isInboundMessage(payload.new)) {
            void notifyIncomingMessage(payload.new);
          }

          if (payload.eventType === "INSERT" && isHandoffSystemMessage(payload.new)) {
            void notifyHandoff(payload.new);
          }

          scheduleRefresh({
            refreshMessages: belongsToSelectedConversation,
            conversationId,
            force: true
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_notes"
        },
        (payload: RealtimePayload) => {
          const conversationId =
            typeof payload.new === "object" &&
            payload.new &&
            "conversation_id" in payload.new
              ? String(payload.new.conversation_id || "")
              : null;

          scheduleRefresh({
            refreshNotes: Boolean(
              selectedConversationId && conversationId === selectedConversationId
            ),
            conversationId,
            force: true
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_tag_links"
        },
        () => {
          scheduleRefresh({
            force: true
          });
        }
      );

    channel.subscribe();

    pollingRef.current = window.setInterval(() => {
      if (!mountedRef.current) return;

      void onRefreshConversations(true);

      if (selectedConversationId) {
        void onRefreshMessages(selectedConversationId, true);
        void onRefreshNotes(selectedConversationId, true);
      }
    }, 15000);

    return () => {
      clearRefreshTimeout();

      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [
    enabled,
    selectedConversationId,
    onRefreshConversations,
    onRefreshMessages,
    onRefreshNotes,
    onIncomingMessage
  ]);
}