import type { ReactNode } from "react";
import { Bell, CalendarClock, Clock3, FileText } from "lucide-react";
import { Pill } from "../comunicacionesShared";
import type {
  ConversationVM,
  InboxKey,
  Mensaje,
  NotaConversacion
} from "./types";
import { INBOXES } from "./constants";
import {
  formatDateTime,
  getDisplayName,
  getInitials,
  getVendedorName,
  isWindowOpen
} from "./helpers";


export function StatusPill({ conv }: { conv: ConversationVM }) {
  if (conv.deleted_at) return <Pill>Eliminada</Pill>;
  if (conv.archived_at) return <Pill>Archivada</Pill>;
  if (conv.closed_at) return <Pill>Cerrada</Pill>;
  if (conv.oportunidad?.cande_activa) return <Pill>Cande activa</Pill>;
  if (conv.assigned_to) return <Pill>En gestión</Pill>;

  return <Pill>Sin atender</Pill>;
}

export function HeaderButton({
  children,
  onClick,
  disabled = false,
  variant = "default"
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const className =
    variant === "primary"
      ? "bg-[#4f7c90] text-white hover:bg-[#406b7d]"
      : variant === "danger"
        ? "bg-red-50 text-red-700 hover:bg-red-100"
        : "bg-white text-[#334155] hover:bg-[#f8fafc]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-9 items-center justify-center gap-2 rounded-2xl px-3 text-xs font-black shadow-sm ring-1 ring-black/5 transition disabled:cursor-not-allowed disabled:opacity-50",
        className
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ComposerIconButton({
  children,
  title,
  onClick,
  disabled = false,
  active = false
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[#64748b] shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-[#8b2cff]/30 bg-[#8b2cff]/10 text-[#7c3aed]"
          : "border-black/10 bg-white hover:border-[#4f7c90]/40 hover:bg-[#f8fafc] hover:text-[#4f7c90]"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function getVisualMessageStatus(message: Mensaje): string {
  if (message.status === "pending" && message.wa_message_id) return "sent";
  return message.status || "pending";
}

export function MessageStatusIcon({ message }: { message: Mensaje }) {
  const status = getVisualMessageStatus(message);

  if (status === "pending") {
    return (
      <span title="Pendiente de envío" className="inline-flex items-center text-white/55">
        <Clock3 size={12} strokeWidth={2.4} />
      </span>
    );
  }

  if (status === "sent") {
    return (
      <span
        title="Enviado"
        className="inline-flex items-center text-[13px] font-black leading-none text-white/75"
      >
        ✓
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span
        title="Entregado"
        className="inline-flex items-center text-[13px] font-black leading-none tracking-[-0.18em] text-white/85"
      >
        ✓✓
      </span>
    );
  }

  if (status === "read") {
    return (
      <span
        title="Leído"
        className="inline-flex items-center text-[13px] font-black leading-none tracking-[-0.18em] text-[#38d5ff]"
      >
        ✓✓
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        title={message.error || "Error de envío"}
        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-black text-red-700"
      >
        !
      </span>
    );
  }

  return null;
}

export function getNotaVisual(nota: NotaConversacion) {
  if (nota.tipo === "programar_envio_cliente") {
    return {
      label: "Mensaje programado",
      icon: <CalendarClock size={14} />,
      bubbleClass: "border-sky-200 bg-sky-50 text-sky-950",
      chipClass: "bg-sky-100 text-sky-700"
    };
  }

  if (nota.tipo === "recordatorio") {
    return {
      label: "Recordatorio interno",
      icon: <Bell size={14} />,
      bubbleClass: "border-purple-200 bg-purple-50 text-purple-950",
      chipClass: "bg-purple-100 text-purple-700"
    };
  }

  return {
    label: "Mensaje interno",
    icon: <FileText size={14} />,
    bubbleClass: "border-amber-200 bg-amber-50 text-amber-950",
    chipClass: "bg-amber-100 text-amber-700"
  };
}

export function ConversationCard({
  conv,
  selectedId,
  onSelect
}: {
  conv: ConversationVM;
  selectedId: string | null;
  onSelect: (id: string) => void | Promise<void>;
}) {
  const name = getDisplayName(conv.contacto, conv);
  const active = conv.id === selectedId;
  const vendedor = getVendedorName(conv.vendedor);
  const score = conv.oportunidad?.score || 0;

  return (
    <button
      key={conv.id}
      type="button"
      onClick={() => {
        void onSelect(conv.id);
      }}
      className={[
        "w-full rounded-[22px] border p-3 text-left transition",
        active
          ? "border-[#4f7c90] bg-[#eef6f7] shadow-sm"
          : "border-black/10 bg-white hover:border-[#4f7c90]/40 hover:bg-[#f8fbfc]"
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4f7c90] text-xs font-black text-white">
          {getInitials(name)}

          {conv.unread_count > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff2f76] px-1 text-[10px] font-black text-white">
              {conv.unread_count > 9 ? "9+" : conv.unread_count}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-sm font-black text-[#142033]">{name}</div>

            <div className="shrink-0 text-[10px] font-bold text-[#94a3b8]">
              {formatDateTime(conv.last_message_at || conv.updated_at)}
            </div>
          </div>

          <div className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-[#64748b]">
            {conv.last_message_preview || "Sin mensajes todavía"}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusPill conv={conv} />
            <Pill>{vendedor}</Pill>
            {score > 0 ? <Pill>Score {score}</Pill> : null}
            {isWindowOpen(conv) ? <Pill>24h abierta</Pill> : <Pill>24h cerrada</Pill>}
          </div>
        </div>
      </div>
    </button>
  );
}
export function InboxList({
  activeInbox,
  inboxCounts,
  onChangeInbox
}: {
  activeInbox: InboxKey;
  inboxCounts: Record<InboxKey, number>;
  onChangeInbox: (inbox: InboxKey) => void;
}) {
  return (
    <section className="min-h-0 flex-1 overflow-auto rounded-[26px] border border-black/10 bg-white/80 p-3 shadow-sm">
      <div className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
        Bandejas
      </div>

      <div className="space-y-1.5">
        {INBOXES.map((inbox) => (
          <button
            key={inbox.id}
            type="button"
            onClick={() => onChangeInbox(inbox.id)}
            className={[
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
              activeInbox === inbox.id
                ? "bg-[#4f7c90] text-white shadow-sm"
                : "text-[#475569] hover:bg-[#eef6f7] hover:text-[#142033]"
            ].join(" ")}
          >
            <span className="shrink-0">{inbox.icon}</span>

            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black">{inbox.label}</span>
              <span
                className={[
                  "block truncate text-[10px] font-bold",
                  activeInbox === inbox.id ? "text-white/75" : "text-[#94a3b8]"
                ].join(" ")}
              >
                {inbox.description}
              </span>
            </span>

            <span
              className={[
                "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-black",
                activeInbox === inbox.id
                  ? "bg-white/20 text-white"
                  : "bg-[#eef2f7] text-[#475569]"
              ].join(" ")}
            >
              {inboxCounts[inbox.id] || 0}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}