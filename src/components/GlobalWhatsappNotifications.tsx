import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type NotificationKind = "nuevo" | "gestion" | "cande_transfer";

type ConversationLite = {
  id: string;
  wa_phone: string | null;
  titulo: string | null;
  subject: string | null;
  estado_gestion: string | null;
  inbox: string | null;
  assigned_to: string | null;
  last_message_preview: string | null;
};

type OpportunityLite = {
  id: string;
  conversacion_id: string;
  cande_activa: boolean | null;
  cande_handoff_requested_at: string | null;
  score: number | null;
  datos: Record<string, unknown> | null;
};

type IncomingMessagePayload = {
  id: string;
  conversacion_id: string;
  direction: string;
  sender_kind: string | null;
  type: string | null;
  text: string | null;
  created_at: string | null;
  wa_timestamp: string | null;
};

function logInfo(message: string, payload?: unknown) {
  if (payload === undefined) {
    console.log(`[GlobalWhatsappNotifications] ${message}`);
    return;
  }

  try {
    console.log(`[GlobalWhatsappNotifications] ${message}`, JSON.stringify(payload, null, 2));
  } catch {
    console.log(`[GlobalWhatsappNotifications] ${message}`, payload);
  }
}

function logWarn(message: string, payload?: unknown) {
  if (payload === undefined) {
    console.warn(`[GlobalWhatsappNotifications] ${message}`);
    return;
  }

  try {
    console.warn(`[GlobalWhatsappNotifications] ${message}`, JSON.stringify(payload, null, 2));
  } catch {
    console.warn(`[GlobalWhatsappNotifications] ${message}`, payload);
  }
}

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function truncateText(value: string, max = 120): string {
  const clean = cleanText(value).replace(/\s+/g, " ");

  if (clean.length <= max) return clean;

  return `${clean.slice(0, max - 1)}…`;
}

function getConversationName(conversation: ConversationLite | null): string {
  return (
    cleanText(conversation?.titulo) ||
    cleanText(conversation?.subject) ||
    cleanText(conversation?.wa_phone) ||
    "Pasajero"
  );
}

function isInboundMessage(message: IncomingMessagePayload): boolean {
  const direction = cleanText(message.direction).toLowerCase();

  return direction === "in" || direction === "inbound";
}

function shouldIgnoreMessage(message: IncomingMessagePayload): boolean {
  if (!message?.id) {
    logWarn("Ignorado: mensaje sin id", message);
    return true;
  }

  if (!message.conversacion_id) {
    logWarn("Ignorado: mensaje sin conversacion_id", message);
    return true;
  }

  if (!isInboundMessage(message)) {
    logWarn("Ignorado: no es inbound", {
      id: message.id,
      direction: message.direction,
      sender_kind: message.sender_kind,
      type: message.type,
      text: message.text
    });

    return true;
  }

  /*
    IMPORTANTE:
    En esta base los mensajes inbound del pasajero están llegando con:
    direction = "in"
    sender_kind = "humano"

    Por eso NO ignoramos sender_kind === "humano".
    El filtro correcto para notificar es direction inbound.
  */

  const senderKind = cleanText(message.sender_kind).toLowerCase();

  if (senderKind === "cande" || senderKind === "nia" || senderKind === "sistema") {
    logWarn("Ignorado: inbound de sistema/IA", {
      id: message.id,
      direction: message.direction,
      sender_kind: message.sender_kind,
      type: message.type,
      text: message.text
    });

    return true;
  }

  return false;
}

function getMessagePreview(message: IncomingMessagePayload): string {
  const text = cleanText(message.text);

  if (text) return truncateText(text);

  const type = cleanText(message.type).toLowerCase();

  if (type === "audio") return "Audio recibido";
  if (type === "image") return "Imagen recibida";
  if (type === "document") return "Archivo recibido";
  if (type === "video") return "Video recibido";

  return "Nuevo mensaje recibido";
}

function classifyNotification(params: {
  conversation: ConversationLite | null;
  opportunity: OpportunityLite | null;
}): NotificationKind {
  const conversation = params.conversation;
  const opportunity = params.opportunity;

  if (opportunity?.cande_handoff_requested_at) {
    const handoffTime = new Date(opportunity.cande_handoff_requested_at).getTime();
    const recently = Number.isFinite(handoffTime) && Date.now() - handoffTime < 90_000;

    if (recently) return "cande_transfer";
  }

  const estadoGestion = cleanText(conversation?.estado_gestion).toLowerCase();
  const inbox = cleanText(conversation?.inbox).toLowerCase();

  if (!conversation?.assigned_to || estadoGestion === "sin_atender" || inbox === "sin_atender") {
    return "nuevo";
  }

  return "gestion";
}

function getNotificationTitle(kind: NotificationKind, passengerName: string): string {
  if (kind === "cande_transfer") return `CANDE derivó a ${passengerName}`;
  if (kind === "nuevo") return `Nuevo pasajero · ${passengerName}`;

  return `Nuevo mensaje · ${passengerName}`;
}

function getNotificationBody(kind: NotificationKind, preview: string): string {
  if (kind === "cande_transfer") return `Requiere atención de vendedor. ${preview}`;
  if (kind === "nuevo") return `Mensaje sin atender. ${preview}`;

  return preview;
}

function playTone(params: {
  frequency: number;
  durationMs: number;
  volume: number;
  repeat?: number;
  gapMs?: number;
}) {
  const repeat = params.repeat || 1;
  const gapMs = params.gapMs || 120;

  for (let index = 0; index < repeat; index += 1) {
    window.setTimeout(() => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextClass) return;

        const audioContext = new AudioContextClass();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = params.frequency;

        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(params.volume, audioContext.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + params.durationMs / 1000
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + params.durationMs / 1000 + 0.03);

        oscillator.onended = () => {
          void audioContext.close();
        };
      } catch {
        // Algunos entornos bloquean audio del renderer. En Electron usamos también el beep del main process.
      }
    }, index * (params.durationMs + gapMs));
  }
}

async function playNotificationSound(kind: NotificationKind) {
  try {
    if (window.nostur?.playNotificationSound) {
      const played = await window.nostur.playNotificationSound({
        kind
      });

      if (played) {
        logInfo("Sonido Electron ejecutado", { kind });
        return;
      }
    }
  } catch (error) {
    logWarn("No se pudo ejecutar sonido Electron, uso fallback", {
      kind,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  if (kind === "cande_transfer") {
    playTone({
      frequency: 980,
      durationMs: 180,
      volume: 0.24,
      repeat: 3,
      gapMs: 80
    });

    return;
  }

  if (kind === "nuevo") {
    playTone({
      frequency: 760,
      durationMs: 220,
      volume: 0.22,
      repeat: 2,
      gapMs: 110
    });

    return;
  }

  playTone({
    frequency: 520,
    durationMs: 150,
    volume: 0.13,
    repeat: 1
  });
}

async function loadNotificationContext(conversationId: string) {
  const [conversationRes, opportunityRes] = await Promise.all([
    supabase
      .from("conversaciones")
      .select("id,wa_phone,titulo,subject,estado_gestion,inbox,assigned_to,last_message_preview")
      .eq("id", conversationId)
      .maybeSingle(),
    supabase
      .from("lead_oportunidades")
      .select("id,conversacion_id,cande_activa,cande_handoff_requested_at,score,datos")
      .eq("conversacion_id", conversationId)
      .maybeSingle()
  ]);

  if (conversationRes.error) {
    logWarn("Error cargando conversación para notificación", conversationRes.error.message);
  }

  if (opportunityRes.error) {
    logWarn("Error cargando oportunidad para notificación", opportunityRes.error.message);
  }

  return {
    conversation: (conversationRes.data || null) as ConversationLite | null,
    opportunity: (opportunityRes.data || null) as OpportunityLite | null
  };
}

async function notifySystem(params: {
  kind: NotificationKind;
  conversation: ConversationLite | null;
  message: IncomingMessagePayload;
}) {
  const passengerName = getConversationName(params.conversation);
  const preview = getMessagePreview(params.message);

  const title = getNotificationTitle(params.kind, passengerName);
  const body = getNotificationBody(params.kind, preview);

  try {
    if (window.nostur?.notify) {
      const ok = await window.nostur.notify({
        title,
        body,
        conversationId: params.conversation?.id || params.message.conversacion_id,
        messageId: params.message.id
      });

      logInfo("Notificación OS solicitada a Electron", {
        ok,
        title,
        body,
        kind: params.kind,
        conversationId: params.conversation?.id || params.message.conversacion_id,
        messageId: params.message.id
      });

      return;
    }
  } catch (error) {
    logWarn("Error solicitando notificación OS a Electron", {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  try {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }

      if (Notification.permission === "granted") {
        new Notification(title, {
          body
        });

        logInfo("Notificación OS fallback navegador mostrada", {
          title,
          body
        });
      } else {
        logWarn("Notificación OS fallback sin permiso", {
          permission: Notification.permission
        });
      }
    }
  } catch (error) {
    logWarn("Error mostrando notificación OS fallback", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export function GlobalWhatsappNotifications() {
  const processedMessagesRef = useRef<Set<string>>(new Set());
  const lastHandoffByOpportunityRef = useRef<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    async function handleIncomingMessage(message: IncomingMessagePayload) {
      if (!mounted) return;

      logInfo("Evento mensaje", {
        id: message.id,
        conversacion_id: message.conversacion_id,
        direction: message.direction,
        sender_kind: message.sender_kind,
        type: message.type,
        text: message.text,
        created_at: message.created_at,
        wa_timestamp: message.wa_timestamp
      });

      if (shouldIgnoreMessage(message)) {
        logInfo("Mensaje ignorado", {
          id: message.id,
          direction: message.direction,
          sender_kind: message.sender_kind,
          type: message.type,
          text: message.text
        });

        return;
      }

      if (processedMessagesRef.current.has(message.id)) {
        logWarn("Ignorado: mensaje ya procesado", {
          id: message.id
        });

        return;
      }

      processedMessagesRef.current.add(message.id);

      if (processedMessagesRef.current.size > 300) {
        processedMessagesRef.current = new Set(
          Array.from(processedMessagesRef.current).slice(-120)
        );
      }

      const conversationId = cleanText(message.conversacion_id);

      if (!conversationId) {
        logWarn("Ignorado: conversationId vacío", message);
        return;
      }

      const { conversation, opportunity } = await loadNotificationContext(conversationId);

      const kind = classifyNotification({
        conversation,
        opportunity
      });

      logInfo("Mensaje inbound válido. Disparo sonido y notificación", {
        kind,
        messageId: message.id,
        conversationId,
        passenger: getConversationName(conversation),
        preview: getMessagePreview(message),
        estado_gestion: conversation?.estado_gestion,
        inbox: conversation?.inbox,
        assigned_to: conversation?.assigned_to
      });

      await playNotificationSound(kind);

      await notifySystem({
        kind,
        conversation,
        message
      });

      window.dispatchEvent(
        new CustomEvent("nostur:global-whatsapp-message", {
          detail: {
            kind,
            conversation_id: conversationId,
            message_id: message.id
          }
        })
      );
    }

    async function handleOpportunityChange(opportunity: OpportunityLite) {
      if (!mounted) return;
      if (!opportunity?.id) return;
      if (!opportunity.cande_handoff_requested_at) return;

      const previous = lastHandoffByOpportunityRef.current[opportunity.id];

      if (previous === opportunity.cande_handoff_requested_at) return;

      lastHandoffByOpportunityRef.current[opportunity.id] = opportunity.cande_handoff_requested_at;

      const handoffTime = new Date(opportunity.cande_handoff_requested_at).getTime();

      if (!Number.isFinite(handoffTime)) return;
      if (Date.now() - handoffTime > 120_000) return;

      const conversationId = cleanText(opportunity.conversacion_id);

      if (!conversationId) return;

      const { conversation } = await loadNotificationContext(conversationId);

      logInfo("Handoff de CANDE detectado. Disparo sonido y notificación", {
        opportunityId: opportunity.id,
        conversationId,
        cande_handoff_requested_at: opportunity.cande_handoff_requested_at
      });

      await playNotificationSound("cande_transfer");

      await notifySystem({
        kind: "cande_transfer",
        conversation,
        message: {
          id: `handoff:${opportunity.id}:${opportunity.cande_handoff_requested_at}`,
          conversacion_id: conversationId,
          direction: "in",
          sender_kind: "sistema",
          type: "system",
          text: "CANDE derivó esta conversación al equipo.",
          created_at: opportunity.cande_handoff_requested_at,
          wa_timestamp: opportunity.cande_handoff_requested_at
        }
      });

      window.dispatchEvent(
        new CustomEvent("nostur:cande-handoff", {
          detail: {
            conversation_id: conversationId,
            oportunidad_id: opportunity.id
          }
        })
      );
    }

    const channel = supabase
      .channel(`global-whatsapp-notifications-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes"
        },
        (payload) => {
          void handleIncomingMessage(payload.new as IncomingMessagePayload);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lead_oportunidades"
        },
        (payload) => {
          void handleOpportunityChange(payload.new as OpportunityLite);
        }
      )
      .subscribe((status) => {
        logInfo(`Realtime status: ${status}`);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}