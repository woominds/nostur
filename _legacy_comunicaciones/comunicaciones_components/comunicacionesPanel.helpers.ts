import type {
  ComunicacionConversation,
  ComunicacionesMetrics,
  ComunicacionesTab,
  QuickReplyDraft
} from "../../store/comunicacionesStore";

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatLongDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatFileSize(value?: number | null): string {
  const size = Number(value || 0);

  if (size <= 0) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDurationSeconds(value: number): string {
  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function normalizePhoneDigits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeSearch(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getBestAudioMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";

  const candidates = [
    "audio/ogg;codecs=opus",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4"
  ];

  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) || "";
}

export function getAudioExtensionFromMime(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";

  return "webm";
}

export function isWindowOpen(conversation?: ComunicacionConversation | null): boolean {
  if (!conversation) return false;

  if (typeof conversation.ventana_24h_abierta === "boolean") {
    return conversation.ventana_24h_abierta;
  }

  if (!conversation.whatsapp_24h_expires_at) return false;

  return new Date(conversation.whatsapp_24h_expires_at).getTime() > Date.now();
}

export function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";

  return `${first}${second}`.toUpperCase() || "NX";
}

export function folderMetricValue(metrics: ComunicacionesMetrics, tab: ComunicacionesTab): number {
  if (tab === "cande_atendiendo") return metrics.candeAtendiendo;
  if (tab === "derivado_nuevo") return metrics.derivadoNuevo;
  if (tab === "mis_conversaciones") return metrics.misConversaciones;
  if (tab === "en_colaboracion") return metrics.enColaboracion;
  if (tab === "abiertas") return metrics.abiertas;
  if (tab === "cerradas") return metrics.cerradas;
  if (tab === "archivadas") return metrics.archivadas;
  if (tab === "eliminadas") return metrics.eliminadas;

  return 0;
}

export function canCurrentUserWrite(conversation: ComunicacionConversation | null): boolean {
  if (!conversation) return false;

  return Boolean(conversation.can_write);
}

export function createEmptyQuickReplyDraft(
  canManage: boolean,
  profileId?: string | null
): QuickReplyDraft {
  return {
    titulo: "",
    contenido: "",
    categoria: "generales",
    global: canManage,
    profile_id: canManage ? null : profileId || null,
    activo: true,
    orden: 0
  };
}