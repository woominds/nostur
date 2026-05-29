// src/components/comunicaciones/ConversationListItem.tsx

import {
  Bot,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Sparkles,
  UserCheck,
  Users
} from "lucide-react";

import {
  getComunicacionChannelLabel,
  getComunicacionDisplayName,
  getComunicacionEstadoGestionLabel,
  getComunicacionPrioridadLabel,
  type ComunicacionConversation
} from "../../store/comunicacionesStore";

import {
  formatDateTime,
  getInitials
} from "./comunicacionesPanel.helpers";

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp") return <MessageCircle size={14} />;
  if (channel === "email") return <Mail size={14} />;
  if (channel === "telefono") return <Phone size={14} />;

  return <MessageSquare size={14} />;
}

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function readConversationMetadata(conversation: ComunicacionConversation): Record<string, unknown> {
  if (
    !conversation.metadata ||
    typeof conversation.metadata !== "object" ||
    Array.isArray(conversation.metadata)
  ) {
    return {};
  }

  return conversation.metadata as Record<string, unknown>;
}

function isClosedArchivedOrDeleted(conversation: ComunicacionConversation): boolean {
  return (
    Boolean(conversation.archived) ||
    Boolean(conversation.deleted) ||
    conversation.status === "CERRADA" ||
    conversation.status === "ARCHIVADA" ||
    conversation.status === "ELIMINADA" ||
    conversation.estado_gestion === "CERRADA"
  );
}

function isSystemAiConversation(conversation: ComunicacionConversation): boolean {
  const metadata = readConversationMetadata(conversation);

  return (
    metadata.system_ai === true ||
    metadata.system_ai === "true" ||
    cleanText(metadata.ai_persona_code) === "commercial_assistant" ||
    cleanText(metadata.ai_persona_id) !== ""
  );
}

function isDerivedByCande(conversation: ComunicacionConversation): boolean {
  if (isClosedArchivedOrDeleted(conversation)) return false;

  const inboxFolder = cleanText(conversation.inbox_folder).toUpperCase();
  const estadoGestion = cleanText(conversation.estado_gestion).toUpperCase();
  const aiStatus = cleanText(conversation.customer_ai_status).toUpperCase();
  const aiStage = cleanText(conversation.customer_ai_stage).toUpperCase();
  const handoffStatus = cleanText(conversation.customer_ai_handoff_status).toUpperCase();
  const metadata = readConversationMetadata(conversation);
  const metadataStage = cleanText(metadata.customer_ai_stage).toUpperCase();

  return (
    !conversation.assigned_to &&
    (
      inboxFolder === "DERIVADO_NUEVO" ||
      inboxFolder === "SIN_ATENDER" ||
      estadoGestion === "DERIVADO_NUEVO" ||
      estadoGestion === "SIN_ATENDER" ||
      aiStatus === "DERIVADA" ||
      aiStage === "DERIVADA" ||
      metadataStage === "DERIVADO_NUEVO" ||
      metadataStage === "SIN_ATENDER" ||
      handoffStatus === "DERIVADA_A_BANDEJA" ||
      handoffStatus === "LISTA_PARA_DERIVAR" ||
      handoffStatus === "PENDIENTE_VENDEDOR"
    )
  );
}

function isCandeAttending(conversation: ComunicacionConversation): boolean {
  if (isClosedArchivedOrDeleted(conversation)) return false;

  const inboxFolder = cleanText(conversation.inbox_folder).toUpperCase();

  return (
    !conversation.assigned_to &&
    !isDerivedByCande(conversation) &&
    (
      inboxFolder === "CANDE_ATENDIENDO" ||
      (
        conversation.channel === "whatsapp" &&
        conversation.customer_ai_enabled === true &&
        conversation.customer_ai_mode === "AUTOMATICA"
      )
    )
  );
}

function getStableAvatarColor(seed: string): string {
  const colors = [
    "#4f7c90",
    "#7c3aed",
    "#0f766e",
    "#2563eb",
    "#c2410c",
    "#be185d",
    "#047857",
    "#4338ca",
    "#b45309",
    "#0e7490",
    "#6d28d9",
    "#15803d",
    "#b91c1c",
    "#0369a1",
    "#a21caf"
  ];

  const cleanSeed = cleanText(seed) || "nostur";
  let hash = 0;

  for (let index = 0; index < cleanSeed.length; index += 1) {
    hash = cleanSeed.charCodeAt(index) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash) % colors.length;

  return colors[colorIndex];
}

function getConversationAvatarSeed(conversation: ComunicacionConversation): string {
  return cleanText(
    conversation.contacto_id ||
      conversation.cliente_id ||
      conversation.telefono ||
      conversation.email ||
      conversation.contacto_nombre ||
      conversation.id
  );
}

function getConversationAvatarUrl(conversation: ComunicacionConversation): string {
  const metadata = readConversationMetadata(conversation);

  if (isSystemAiConversation(conversation)) {
    return cleanText(
      metadata.ai_persona_avatar_url ||
        metadata.avatar_url ||
        conversation.avatar_url
    );
  }

  return cleanText(
    conversation.contacto_avatar_url ||
      conversation.cliente_avatar_url ||
      conversation.avatar_url ||
      metadata.avatar_url ||
      conversation.assigned_avatar_url
  );
}

function getConversationAvatarColor(conversation: ComunicacionConversation): string {
  const metadata = readConversationMetadata(conversation);

  if (isSystemAiConversation(conversation)) {
    return cleanText(metadata.ai_persona_color || metadata.color) || "#7c3aed";
  }

  if (isDerivedByCande(conversation)) return "#dc2626";
  if (isCandeAttending(conversation)) return "#059669";

  return getStableAvatarColor(getConversationAvatarSeed(conversation));
}

function getSimpleStatus(conversation: ComunicacionConversation): {
  label: string;
  className: string;
  icon: "bot" | "sparkles" | "user" | "users" | "none";
} {
  if (isSystemAiConversation(conversation)) {
    return {
      label: "NIA",
      className: "border-violet-200 bg-violet-50 text-violet-700",
      icon: "bot"
    };
  }

  if (isDerivedByCande(conversation)) {
    return {
      label: "Sin atender",
      className: "border-red-200 bg-red-50 text-red-700",
      icon: "sparkles"
    };
  }

  if (isCandeAttending(conversation)) {
    return {
      label: "CANDE trabajando",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: "bot"
    };
  }

  if (conversation.has_collaborators || conversation.en_colaboracion) {
    return {
      label: "Colaboración",
      className: "border-violet-200 bg-violet-50 text-violet-700",
      icon: "users"
    };
  }

  if (conversation.assigned_to) {
    return {
      label: "En gestión",
      className: "border-[#4f7c90]/20 bg-[#4f7c90]/10 text-[#31596a]",
      icon: "user"
    };
  }

  if (isClosedArchivedOrDeleted(conversation)) {
    return {
      label: "Cerrada",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      icon: "none"
    };
  }

  return {
    label: getComunicacionEstadoGestionLabel(conversation.estado_gestion),
    className: "border-slate-200 bg-slate-50 text-slate-600",
    icon: "none"
  };
}

function StatusIcon({ icon }: { icon: "bot" | "sparkles" | "user" | "users" | "none" }) {
  if (icon === "bot") return <Bot size={11} />;
  if (icon === "sparkles") return <Sparkles size={11} />;
  if (icon === "user") return <UserCheck size={11} />;
  if (icon === "users") return <Users size={11} />;

  return null;
}

function PriorityBadge({ value }: { value: string }) {
  if (!value || value === "NORMAL") return null;

  const className =
    value === "URGENTE"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "ALTA"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : value === "BAJA"
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <span className={["rounded-xl border px-2 py-1 text-[10px] font-black uppercase", className].join(" ")}>
      {getComunicacionPrioridadLabel(value)}
    </span>
  );
}

function MainBadge({
  label,
  className,
  icon
}: {
  label: string;
  className: string;
  icon: "bot" | "sparkles" | "user" | "users" | "none";
}) {
  return (
    <span className={["inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[10px] font-black", className].join(" ")}>
      <StatusIcon icon={icon} />
      {label}
    </span>
  );
}

function getResponsibleLabel(conversation: ComunicacionConversation): string {
  if (isDerivedByCande(conversation)) return "Disponible para tomar";
  if (isCandeAttending(conversation)) return "Atiende CANDE";
  if (conversation.assigned_full_name) return conversation.assigned_full_name;
  if (conversation.assigned_email) return conversation.assigned_email;
  if (conversation.assigned_to) return "Asignada";

  return "Sin asignar";
}

function getLastMessagePreview(conversation: ComunicacionConversation): string {
  const text =
    cleanText(conversation.last_message) ||
    cleanText(conversation.subject) ||
    cleanText(conversation.titulo);

  if (!text) return "Sin mensajes todavía";

  return text;
}

export function ConversationListItem({
  conversation,
  selected,
  onClick
}: {
  conversation: ComunicacionConversation;
  selected: boolean;
  onClick: () => void;
}) {
  const displayName = getComunicacionDisplayName(conversation);
  const unread = Number(conversation.unread_count || 0);
  const avatarUrl = getConversationAvatarUrl(conversation);
  const avatarColor = getConversationAvatarColor(conversation);
  const systemAi = isSystemAiConversation(conversation);
  const derivedByCande = isDerivedByCande(conversation);
  const candeAttending = isCandeAttending(conversation);
  const status = getSimpleStatus(conversation);
  const responsibleLabel = getResponsibleLabel(conversation);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full border-b border-black/5 px-3 py-3 text-left transition",
        selected
          ? "bg-[#4f7c90]/12"
          : derivedByCande
            ? "bg-red-50/65 hover:bg-red-50"
            : candeAttending
              ? "bg-emerald-50/50 hover:bg-emerald-50"
              : unread > 0
                ? "bg-white hover:bg-[#f8fafc]"
                : "bg-white/65 hover:bg-white"
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-xs font-black text-white",
            avatarUrl ? "bg-white" : ""
          ].join(" ")}
          style={{ backgroundColor: avatarUrl ? undefined : avatarColor }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : systemAi ? (
            <span>N</span>
          ) : derivedByCande || candeAttending ? (
            <Bot size={17} />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}

          {unread > 0 ? (
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border border-white bg-red-500" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-black text-[#111827]">
                {displayName}
              </div>

              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-[#64748b]">
                <span className="flex shrink-0 items-center gap-1">
                  <ChannelIcon channel={conversation.channel} />
                  {getComunicacionChannelLabel(conversation.channel)}
                </span>

                <span className="text-[#cbd5e1]">·</span>

                <span className="truncate">{responsibleLabel}</span>
              </div>
            </div>

            <div className="shrink-0 text-[10px] font-semibold text-[#94a3b8]">
              {formatDateTime(conversation.last_message_time || conversation.created_at)}
            </div>
          </div>

          <div className="mt-1.5 line-clamp-2 text-[12px] font-semibold leading-5 text-[#475569]">
            {getLastMessagePreview(conversation)}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <MainBadge
              label={status.label}
              className={status.className}
              icon={status.icon}
            />

            <PriorityBadge value={conversation.prioridad} />

            {conversation.can_take ? (
              <span className="rounded-xl border border-[#4f7c90]/20 bg-white px-2 py-1 text-[10px] font-black text-[#31596a]">
                Tomar
              </span>
            ) : null}

            {unread > 0 ? (
              <span className="rounded-xl bg-[#4f7c90] px-2 py-1 text-[10px] font-black text-white">
                {unread} nuevo{unread === 1 ? "" : "s"}
              </span>
            ) : null}

            {(conversation.tags || []).slice(0, 2).map((tagItem) => (
              <span
                key={tagItem.id}
                className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-semibold text-[#475569]"
              >
                {tagItem.nombre}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}