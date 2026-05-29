// src/components/comunicaciones/comunicacionesPanel.constants.ts

import type { ComunicacionesTab } from "../../store/comunicacionesStore";
import {
  Bot,
  CheckCircle2,
  Inbox,
  Sparkles,
  Users
} from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

export const TAB_OPTIONS: Array<{
  value: ComunicacionesTab;
  label: string;
  description: string;
  icon: typeof Inbox;
}> = [
  {
    value: "nia",
    label: "NIA",
    description: "Asistente comercial interno",
    icon: Bot
  },
  {
    value: "derivado_nuevo",
    label: "Sin atender",
    description: "Nuevas o derivadas por CANDE para tomar",
    icon: Sparkles
  },
  {
    value: "mis_conversaciones",
    label: "En gestión",
    description: "Clientes ya tomados por vendedores",
    icon: Inbox
  },
  {
    value: "cande_atendiendo",
    label: "CANDE trabajando",
    description: "CANDE todavía está filtrando",
    icon: Bot
  },
  {
    value: "en_colaboracion",
    label: "Colaboración",
    description: "Chats compartidos con el equipo",
    icon: Users
  },
  {
    value: "cerradas",
    label: "Cerradas / historial",
    description: "Conversaciones finalizadas",
    icon: CheckCircle2
  }
];

export const CHANNEL_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "interno", label: "Interno" },
  { value: "telefono", label: "Teléfono" },
  { value: "otro", label: "Otro" }
];

export const PRIORIDAD_OPTIONS: SelectOption[] = [
  { value: "todas", label: "Todas" },
  { value: "BAJA", label: "Baja" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" }
];

export const ESTADO_GESTION_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "SIN_ATENDER", label: "Sin atender" },
  { value: "DERIVADO_NUEVO", label: "Derivado por CANDE" },
  { value: "EN_ATENCION_IA", label: "CANDE trabajando" },
  { value: "EN_GESTION", label: "En gestión" },
  { value: "ESPERA_CLIENTE", label: "Espera cliente" },
  { value: "ESPERA_AGENTE", label: "Espera vendedor" },
  { value: "RECONTACTAR", label: "Recontactar" },
  { value: "RESUELTA", label: "Resuelta" },
  { value: "CERRADA", label: "Cerrada" }
];

export const ESTADO_COMERCIAL_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "NUEVO", label: "Nuevo" },
  { value: "SEGUIMIENTO", label: "Seguimiento" },
  { value: "COTIZANDO", label: "Cotizando" },
  { value: "PRESUPUESTADO", label: "Presupuestado" },
  { value: "VENDIDO", label: "Vendido" },
  { value: "POSTVENTA", label: "Postventa" },
  { value: "CERRADO", label: "Cerrado" },
  { value: "PERDIDO", label: "Perdido" }
];

export const QUICK_REPLY_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "todas", label: "Todas" },
  { value: "generales", label: "Generales" },
  { value: "ventas", label: "Ventas" },
  { value: "cotizaciones", label: "Cotizaciones" },
  { value: "pagos", label: "Pagos" },
  { value: "documentacion", label: "Documentación" },
  { value: "postventa", label: "Postventa" },
  { value: "reclamos", label: "Reclamos" },
  { value: "operaciones", label: "Operaciones" }
];

export const EMOJI_OPTIONS: string[] = [
  "😀",
  "😃",
  "😄",
  "😁",
  "🙂",
  "😉",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤔",
  "😅",
  "😂",
  "🤣",
  "👍",
  "👏",
  "🙌",
  "🙏",
  "💪",
  "👌",
  "✅",
  "❌",
  "⚠️",
  "📌",
  "📎",
  "📄",
  "✈️",
  "🏖️",
  "🌎",
  "🧳",
  "🏨",
  "🚗",
  "💳",
  "💵",
  "🔥",
  "⭐",
  "❤️",
  "💙",
  "🧡"
];

export const REACTION_OPTIONS: string[] = ["👍", "❤️", "😂", "😮", "😢", "🙏", "✅", "🔥"];