import type { ReactNode } from "react";
import { Bell, CalendarClock, Clock3, FileText } from "lucide-react";
import { Pill } from "../comunicacionesShared";
import type { ConversationVM, Mensaje, NotaConversacion } from "./types";

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