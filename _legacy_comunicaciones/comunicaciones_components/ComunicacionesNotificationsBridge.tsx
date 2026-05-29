import { useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

type IncomingRealtimeMessage = {
  id: string;
  conversation_id: string;
  content: string | null;
  sender_name: string | null;
  message_type: string | null;
  direction: string | null;
  created_at: string | null;
};

type RealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE" | string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

function isInboundMessage(payloadNew: unknown): payloadNew is IncomingRealtimeMessage {
  if (!payloadNew || typeof payloadNew !== "object") return false;

  const row = payloadNew as Record<string, unknown>;

  return (
    String(row.direction || "") === "inbound" &&
    Boolean(row.id) &&
    Boolean(row.conversation_id)
  );
}

function getMessagePreview(message: IncomingRealtimeMessage): string {
  const type = String(message.message_type || "text");

  if (message.content?.trim()) return message.content.trim();

  if (type === "image") return "Imagen recibida";
  if (type === "audio") return "Audio recibido";
  if (type === "video") return "Video recibido";
  if (type === "document") return "Documento recibido";

  return "Nuevo mensaje recibido";
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

async function showSystemNotification(message: IncomingRealtimeMessage) {
  try {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission !== "granted") return;

    const notification = new Notification(message.sender_name || "Nuevo mensaje", {
      body: getMessagePreview(message),
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

function showBrowserToast(message: IncomingRealtimeMessage) {
  window.dispatchEvent(
    new CustomEvent("nossix:global-toast", {
      detail: {
        type: "success",
        title: message.sender_name || "Nuevo mensaje",
        message: getMessagePreview(message),
        conversationId: message.conversation_id
      }
    })
  );
}

export function ComunicacionesNotificationsBridge() {
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel(`comunicaciones-realtime-global-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload: RealtimePayload) => {
          if (!isInboundMessage(payload.new)) return;

          const message = payload.new;

          if (notifiedMessageIdsRef.current.has(message.id)) return;

          notifiedMessageIdsRef.current.add(message.id);

          if (notifiedMessageIdsRef.current.size > 200) {
            notifiedMessageIdsRef.current = new Set(
              Array.from(notifiedMessageIdsRef.current).slice(-80)
            );
          }

          showBrowserToast(message);
          playIncomingSound();
          void showSystemNotification(message);
        }
      );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return null;
}