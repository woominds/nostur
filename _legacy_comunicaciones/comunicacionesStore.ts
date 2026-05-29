// src/store/comunicacionesStore.ts

import { create } from "zustand";

import { supabase } from "../lib/supabase";

/* =========================================================
   TIPOS BASE
========================================================= */

export type ProfileLite = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  sucursal_id: string | null;
  rol: string;
  color: string | null;
  activo: boolean;
  avatar_url?: string | null;
  nombre_publico_whatsapp?: string | null;
  mostrar_nombre_agente?: boolean | null;

  availability_status?: "DISPONIBLE" | "OCUPADO" | "AUSENTE" | "FUERA_OFICINA" | string | null;
  availability_message?: string | null;
  available_for_ai_handoff?: boolean | null;
};

export type SucursalLite = {
  id: string;
  nombre: string;
  color?: string | null;
  activa?: boolean;
  activo?: boolean;
};

export type ComunicacionesTab =
  | "nia"
  | "cande_atendiendo"
  | "derivado_nuevo"
  | "mis_conversaciones"
  | "en_colaboracion"
  | "abiertas"
  | "cerradas"
  | "archivadas"
  | "eliminadas";

export type ComunicacionChannel =
  | "whatsapp"
  | "email"
  | "interno"
  | "telefono"
  | "otro";

export type EstadoGestion =
  | "EN_ATENCION_IA"
  | "DERIVADO_NUEVO"
  | "ESPERA_CLIENTE"
  | "ESPERA_AGENTE"
  | "EN_GESTION"
  | "RECONTACTAR"
  | "RESUELTA"
  | "CERRADA"
  | "SIN_ATENDER";

export type EstadoComercial =
  | "NUEVO"
  | "SEGUIMIENTO"
  | "COTIZANDO"
  | "PRESUPUESTADO"
  | "VENDIDO"
  | "POSTVENTA"
  | "CERRADO"
  | "PERDIDO";

export type PrioridadConversacion = "BAJA" | "NORMAL" | "ALTA" | "URGENTE";

export type ConversationStatus = "ABIERTA" | "CERRADA" | "ARCHIVADA" | "ELIMINADA";

export type CustomerAiMode = "APAGADA" | "SUGERIDA" | "AUTOMATICA" | string;
export type CustomerAiStatus =
  | "INACTIVA"
  | "OBSERVANDO"
  | "RESPONDIENDO"
  | "INDAGANDO"
  | "LISTA_PARA_DERIVAR"
  | "DERIVANDO"
  | "DERIVADA"
  | "PAUSADA"
  | string;

export type CustomerAiHandoffStatus =
  | "NO_DERIVADA"
  | "LISTA_PARA_DERIVAR"
  | "DERIVADA_A_BANDEJA"
  | "TOMADA_POR_VENDEDOR"
  | "REASIGNADA"
  | "PAUSADA"
  | "CERRADA"
  | string;

export type ConversationTag = {
  id: string;
  nombre: string;
  color: string | null;
  activo: boolean;
};

export type ConversationParticipant = {
  id: string;
  profile_id: string;
  rol: "PRINCIPAL" | "COLABORADOR" | "SUPERVISOR" | string;
  nombre?: string | null;
  apellido?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  nombre_publico_whatsapp?: string | null;
};

export type ComunicacionConversation = {
  id: string;
  channel: ComunicacionChannel | string;
  subject: string | null;
  titulo: string | null;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;

  contacto_id: string | null;
  cliente_id: string | null;
  lead_id: string | null;
  carrito_id: string | null;

  assigned_to: string | null;
  assigned_full_name?: string | null;
  assigned_email?: string | null;
  assigned_avatar_url?: string | null;

  contacto_avatar_url?: string | null;
  cliente_avatar_url?: string | null;
  avatar_url?: string | null;
  avatar_color?: string | null;
  avatar_initials?: string | null;

  nombre_publico_whatsapp?: string | null;

  sucursal_id: string | null;
  sucursal_nombre?: string | null;

  status: ConversationStatus | string;
  estado_gestion: EstadoGestion | string;
  estado_comercial: EstadoComercial | string;
  prioridad: PrioridadConversacion | string;
  categoria: string | null;
  etapa_comercial: string | null;

  unread_count: number | null;
  last_message: string | null;
  last_message_time: string | null;
  last_inbound_message_at: string | null;
  last_outbound_message_at?: string | null;
  whatsapp_24h_expires_at: string | null;
  ventana_24h_abierta?: boolean | null;

  archived: boolean;
  archived_at: string | null;
  deleted: boolean;
  deleted_at: string | null;
  closed_at: string | null;
  closed_by: string | null;

  mostrar_agente: boolean;
  en_colaboracion?: boolean | null;
  has_collaborators?: boolean | null;
  participants?: ConversationParticipant[];

  inbox_folder?: string | null;
  can_write?: boolean | null;
  can_take?: boolean | null;
  can_manage_assignment?: boolean | null;

  customer_ai_persona_id?: string | null;
  customer_ai_enabled?: boolean | null;
  customer_ai_mode?: CustomerAiMode | null;
  customer_ai_status?: CustomerAiStatus | null;
  customer_ai_handoff_status?: CustomerAiHandoffStatus | null;
  customer_ai_handoff_reason?: string | null;
  customer_ai_handoff_at?: string | null;
  customer_ai_taken_by?: string | null;
  customer_ai_taken_at?: string | null;
  customer_ai_paused_until?: string | null;
  customer_ai_last_response_at?: string | null;
  customer_ai_last_analysis_at?: string | null;
  customer_ai_score?: number | string | null;
  customer_ai_temperature?: string | null;
  customer_ai_summary?: string | null;
  customer_ai_missing_info?: string[] | null;
  customer_ai_next_action?: string | null;
  customer_ai_auto_reply_count?: number | null;
  customer_ai_last_error?: string | null;
  customer_ai_stage?: string | null;
  metadata?: Record<string, unknown> | null;
  tags?: ConversationTag[];

  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ComunicacionMessageReaction = {
  id?: string | null;
  emoji: string;
  user_id?: string | null;
  user_name?: string | null;
  sender_name?: string | null;
  created_at?: string | null;
};

export type ComunicacionMessage = {
  id: string;
  conversation_id: string;
  channel: string;
  direction: "inbound" | "outbound" | "internal" | "system" | string;
  sender_type: "cliente" | "contact" | "agent" | "system" | "internal" | string;
  sender_id: string | null;
  sender_name: string | null;
  sender_full_name?: string | null;
  content: string | null;
  message_type:
    | "text"
    | "image"
    | "audio"
    | "video"
    | "document"
    | "template"
    | "internal"
    | "system"
    | "reaction"
    | string;
  media_url: string | null;
  media_path: string | null;
  media_filename: string | null;
  media_mime_type: string | null;
  media_size: number | null;
  status: "pending" | "sent" | "delivered" | "read" | "failed" | "received" | string;
  whatsapp_message_id: string | null;
  wa_error_code: string | null;
  wa_error_message: string | null;
  reply_to_id: string | null;
  reply_to_whatsapp_message_id?: string | null;
  reactions?: ComunicacionMessageReaction[] | null;
  message_reactions?: ComunicacionMessageReaction[] | null;
  reaction_emoji?: string | null;
  is_forwarded?: boolean | null;
  edited: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  is_internal: boolean;
  metadata?: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

export type ConversationNote = {
  id: string;
  conversation_id: string;
  note: string;
  tipo?: "NOTA_INTERNA" | "RECORDATORIO_INTERNO" | "MENSAJE_CLIENTE_PROGRAMADO" | string;
  target_type?: "INTERNO" | "CLIENTE" | string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  status?: "ACTIVA" | "PROGRAMADA" | "COMPLETADA" | "CANCELADA" | "FALLIDA" | string;
  created_by: string | null;
  created_by_full_name?: string | null;
  created_at: string;
  updated_at: string | null;
};

export type QuickReplyCategoria =
  | "generales"
  | "ventas"
  | "cotizaciones"
  | "pagos"
  | "documentacion"
  | "postventa"
  | "reclamos"
  | "operaciones";

export type QuickReply = {
  id: string;
  titulo: string;
  contenido: string;
  categoria: QuickReplyCategoria | string;
  profile_id?: string | null;
  global?: boolean | null;
  activo: boolean;
  orden?: number | null;
  uso_contador?: number | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type QuickReplyDraft = {
  id?: string;
  titulo: string;
  contenido: string;
  categoria: QuickReplyCategoria | string;
  global?: boolean;
  profile_id?: string | null;
  activo?: boolean;
  orden?: number;
};

export type WhatsappTemplate = {
  id: string;
  name: string;
  language: string;
  category: string | null;
  status: string;
  body: string | null;
  components?: unknown[] | null;
  meta_template_id: string | null;
  activo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

/* =========================================================
   TIPOS IA
========================================================= */

export type AiPersona = {
  id: string;
  code: string;
  name: string;
  display_name: string;
  description?: string | null;
  avatar_url?: string | null;
  color?: string | null;
  tone?: string | null;
  public_behavior?: string | null;
  internal_behavior?: string | null;
  allowed_topics?: string[] | null;
  forbidden_topics?: string[] | null;
  handoff_rules?: string | null;
  business_rules?: string | null;
  safety_rules?: string | null;
  default_mode?: CustomerAiMode | null;
  is_default?: boolean | null;
  active: boolean;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AiPersonaUpdateDraft = {
  id: string;
  name?: string;
  display_name?: string;
  description?: string | null;
  avatar_url?: string | null;
  color?: string | null;
  tone?: string | null;
  public_behavior?: string | null;
  internal_behavior?: string | null;
  allowed_topics?: string[] | null;
  forbidden_topics?: string[] | null;
  handoff_rules?: string | null;
  business_rules?: string | null;
  safety_rules?: string | null;
  default_mode?: CustomerAiMode | null;
  active?: boolean;
  is_default?: boolean;
  metadata?: Record<string, unknown>;
    blocked_topics?: string[] | null;
  escalation_rules?: string | null;
};

export type SellerAvailability = {
  id: string;
  user_id: string;
  profile_id: string | null;
  status: string;
  available: boolean;
  message: string | null;
  availability_message?: string | null;
  available_for_ai_handoff: boolean;
  available_until: string | null;
  note?: string | null;
  until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type SetSellerAvailabilityDraft = {
  status: "DISPONIBLE" | "OCUPADO" | "AUSENTE" | "FUERA_OFICINA" | string;
  message?: string | null;
  available_for_ai_handoff?: boolean;
  available_until?: string | null;
};

export type CustomerAiConversationConfigDraft = {
  conversation_id: string;
  customer_ai_enabled?: boolean;
  customer_ai_mode?: CustomerAiMode;
  customer_ai_persona_id?: string | null;
  customer_ai_status?: CustomerAiStatus;
  customer_ai_handoff_status?: CustomerAiHandoffStatus;
  customer_ai_handoff_reason?: string | null;
  customer_ai_paused_until?: string | null;
};
export type AiConversationAnalysis = {
  conversation_id: string;
  resumen: string;
  summary?: string;
  intencion: string;
  intent?: string;
  prioridad_sugerida: PrioridadConversacion | string;
  priority?: PrioridadConversacion | string;
  estado_comercial_sugerido: EstadoComercial | string;
  estado_gestion_sugerido: EstadoGestion | string;
  sentimiento: string;
  sentiment?: string;
  score_cliente: number | null;
  puntaje_lead?: number | null;
  lead_score?: number | null;
  temperatura_lead?: string;
  lead_temperature?: string;
  datos_detectados: {
    destino?: string | null;
    fecha_viaje?: string | null;
    cantidad_pasajeros?: string | null;
    presupuesto?: string | null;
    origen?: string | null;
    nombre?: string | null;
    telefono?: string | null;
    email?: string | null;
    otros?: string[] | null;
  };
  proxima_accion: string;
  proximas_acciones?: string[];
  next_actions?: string[];
  respuesta_sugerida: string;
  suggested_response?: string;
  etiquetas_sugeridas: string[];
  suggested_tags?: string[];
  informacion_faltante?: string[];
  missing_info?: string[];
  confianza?: number | null;
  analyzed_at?: string | null;
  created_at?: string | null;
  persisted_event_id?: string | null;
  raw?: Record<string, unknown> | null;
};

export type ContactAiProfile = {
  id: string;
  created_at: string;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  nombre_detectado: string | null;
  telefono_detectado: string | null;
  email_detectado: string | null;
  score_actual: number | string | null;
  temperatura_actual: string | null;
  resumen_general: string | null;
  preferencias_generales: string | null;
  destinos_interes: string[] | null;
  fechas_interes: string[] | null;
  cantidad_pasajeros: string | null;
  presupuesto_estimado: string | null;
  restricciones: string[] | null;
  objeciones: string[] | null;
  intereses: string[] | null;
  ultimo_resumen_ia: string | null;
  ultima_accion_sugerida: string | null;
  ultima_respuesta_sugerida: string | null;
  informacion_faltante: string[] | null;
  etiquetas_sugeridas: string[] | null;
  estado_pipeline: string | null;
  estado_ia: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  updated_by?: string | null;
  updated_at: string | null;
};

export type AiActionsLogItem = {
  id: string;
  created_at: string;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  contact_ai_profile_id: string | null;
  ai_event_id: string | null;
  action_type: string;
  action_title: string;
  action_detail: string | null;
  actor_type: string | null;
  actor_id: string | null;
  source: string | null;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
};

export type AiAssistantThread = {
  id: string;
  created_at: string;
  title: string;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  contact_ai_profile_id: string | null;
  owner_id: string | null;
  thread_type: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

export type AiAssistantMessage = {
  id: string;
  created_at: string;
  thread_id: string;
  conversation_id: string | null;
  contacto_id: string | null;
  contact_ai_profile_id: string | null;
  role: "user" | "assistant" | "system" | string;
  content: string | null;
  audio_url: string | null;
  audio_transcript: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
};

export type CreateAssistantThreadDraft = {
  title?: string;
  conversation_id?: string | null;
  contacto_id?: string | null;
  cliente_id?: string | null;
  contact_ai_profile_id?: string | null;
  thread_type?: string;
  metadata?: Record<string, unknown>;
};

export type SendAssistantMessageDraft = {
  thread_id?: string | null;
  title?: string;
  conversation_id?: string | null;
  contacto_id?: string | null;
  cliente_id?: string | null;
  contact_ai_profile_id?: string | null;
  content: string;
  audio_url?: string | null;
  audio_transcript?: string | null;
  metadata?: Record<string, unknown>;
};

export type LogAiActionDraft = {
  conversation_id?: string | null;
  contacto_id?: string | null;
  cliente_id?: string | null;
  contact_ai_profile_id?: string | null;
  ai_event_id?: string | null;
  action_type: string;
  action_title: string;
  action_detail?: string | null;
  actor_type?: "AI" | "USER" | "SYSTEM" | string;
  actor_id?: string | null;
  source?: string | null;
  previous_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

export type AiOperationalAlert = {
  id: string;
  created_at: string;
  updated_at: string;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  carrito_id: string | null;
  contact_ai_profile_id: string | null;
  ai_event_id: string | null;
  vendedor_id: string | null;
  sucursal_id: string | null;
  alert_type: string;
  alert_title: string;
  alert_detail: string | null;
  severity: "BAJA" | "NORMAL" | "ALTA" | "URGENTE" | "CRITICA" | string;
  status: "ABIERTA" | "ENVIADA" | "VISTA" | "ACK" | "RESUELTA" | "DESCARTADA" | string;
  gap_hours: number | string | null;
  gap_started_at: string | null;
  last_inbound_message_at: string | null;
  last_outbound_message_at: string | null;
  notify_seller: boolean;
  notify_management: boolean;
  sent_to_user_ids: string[];
  copied_to_user_ids: string[];
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
  source: string | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type CommercialGapDashboardGlobal = {
  cliente_esperando_respuesta: number;
  gap_24h: number;
  gap_48h: number;
  gap_promedio_horas: number;
  gap_max_horas: number;
  cotizados_pendientes: number;
  oportunidades_abiertas: number;
  oportunidades_calientes: number;
};

export type CommercialGapDashboardSeller = {
  vendedor_id: string | null;
  vendedor_nombre: string | null;
  vendedor_apellido: string | null;
  vendedor_email: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  conversaciones_cliente_esperando: number;
  gap_24h: number;
  gap_48h: number;
  oportunidades_abiertas: number;
  cotizados_pendientes: number;
  oportunidades_calientes: number;
  gap_promedio_horas: number;
  gap_max_horas: number;
};

export type CommercialGapDashboardBranch = {
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  conversaciones_cliente_esperando: number;
  gap_24h: number;
  gap_48h: number;
  oportunidades_abiertas: number;
  cotizados_pendientes: number;
  oportunidades_calientes: number;
  gap_promedio_horas: number;
  gap_max_horas: number;
};

export type CommercialGapDashboard = {
  generated_at: string | null;
  global: CommercialGapDashboardGlobal;
  por_vendedor: CommercialGapDashboardSeller[];
  por_sucursal: CommercialGapDashboardBranch[];
  alertas_abiertas: AiOperationalAlert[];
};

export type AiCommercialControlGlobal = {
  total_conversaciones: number;
  conversaciones_cliente_esperando: number;
  gap_24h: number;
  gap_48h: number;
  gap_promedio_horas: number;
  gap_max_horas: number;

  oportunidades_abiertas: number;
  oportunidades_calientes: number;
  cotizados_pendientes: number;

  mensajes_inbound: number;
  mensajes_outbound: number;
  mensajes_internos: number;

  ai_analisis_generados: number;
  ai_chat_mensajes_usuario: number;
  ai_chat_respuestas: number;
  ai_acciones_log: number;

  ai_feedback_total: number;
  ai_feedback_positivo: number;
  ai_feedback_negativo: number;
  ai_feedback_promedio: number;

  alertas_abiertas: number;
  alertas_resueltas: number;
  alertas_urgentes: number;
};

export type AiCommercialControlSeller = {
  vendedor_id: string | null;
  vendedor_nombre: string | null;
  vendedor_apellido: string | null;
  vendedor_email: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;

  total_conversaciones: number;
  conversaciones_cliente_esperando: number;
  gap_24h: number;
  gap_48h: number;
  gap_promedio_horas: number;
  gap_max_horas: number;

  oportunidades_abiertas: number;
  oportunidades_calientes: number;
  cotizados_pendientes: number;

  mensajes_inbound: number;
  mensajes_outbound: number;

  ai_analisis_generados: number;
  ai_chat_mensajes_usuario: number;
  ai_chat_respuestas: number;

  ai_feedback_total: number;
  ai_feedback_positivo: number;
  ai_feedback_negativo: number;
  ai_feedback_promedio: number;
};

export type AiCommercialControlBranch = {
  sucursal_id: string | null;
  sucursal_nombre: string | null;

  total_conversaciones: number;
  conversaciones_cliente_esperando: number;
  gap_24h: number;
  gap_48h: number;
  gap_promedio_horas: number;
  gap_max_horas: number;

  oportunidades_abiertas: number;
  oportunidades_calientes: number;
  cotizados_pendientes: number;

  mensajes_inbound: number;
  mensajes_outbound: number;

  ai_analisis_generados: number;
  ai_chat_mensajes_usuario: number;
  ai_chat_respuestas: number;

  ai_feedback_total: number;
  ai_feedback_positivo: number;
  ai_feedback_negativo: number;
  ai_feedback_promedio: number;
};

export type AiTopGapConversation = {
  conversation_id: string;
  contacto_id: string | null;
  cliente_id: string | null;
  vendedor_id: string | null;
  vendedor_nombre: string | null;
  vendedor_apellido: string | null;
  vendedor_email: string | null;
  sucursal_id: string | null;
  sucursal_nombre: string | null;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  estado_gestion: string | null;
  estado_comercial: string | null;
  prioridad: string | null;
  gap_hours: number;
  last_inbound_message_at: string | null;
  last_outbound_message_at: string | null;
  ai_score_actual: number | string | null;
  ai_temperatura_actual: string | null;
  ai_resumen_general: string | null;
  ai_ultima_accion_sugerida: string | null;
};

export type AiCommercialControlDashboard = {
  generated_at: string | null;
  period_days: number;
  global: AiCommercialControlGlobal;
  por_vendedor: AiCommercialControlSeller[];
  por_sucursal: AiCommercialControlBranch[];
  top_gap_conversations: AiTopGapConversation[];
  alertas_abiertas: AiOperationalAlert[];
};

export type AiDailyCommercialReport = {
  id: string;
  report_date: string;
  report_scope: "GLOBAL" | "SUCURSAL" | "VENDEDOR" | string;
  sucursal_id: string | null;
  vendedor_id: string | null;
  report_title: string;
  report_summary: string | null;

  total_conversaciones: number;
  conversaciones_cliente_esperando: number;
  gap_24h: number;
  gap_48h: number;
  gap_promedio_horas: number;
  gap_max_horas: number;

  oportunidades_abiertas: number;
  oportunidades_calientes: number;
  cotizados_pendientes: number;

  mensajes_inbound: number;
  mensajes_outbound: number;
  mensajes_internos: number;

  ai_analisis_generados: number;
  ai_chat_mensajes_usuario: number;
  ai_chat_respuestas: number;
  ai_acciones_log: number;

  ai_feedback_total: number;
  ai_feedback_positivo: number;
  ai_feedback_negativo: number;
  ai_feedback_promedio: number;

  alertas_abiertas: number;
  alertas_resueltas: number;
  alertas_urgentes: number;

  payload?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export type AiFeedback = {
  id: string;
  created_at: string;
  updated_at: string | null;
  conversation_id: string | null;
  contacto_id: string | null;
  cliente_id: string | null;
  contact_ai_profile_id: string | null;
  ai_event_id: string | null;
  thread_id: string | null;
  assistant_message_id: string | null;
  feedback_type: "POSITIVO" | "NEGATIVO" | "NEUTRO" | string;
  rating: number | null;
  comment: string | null;
  original_ai_answer: string | null;
  original_user_prompt: string | null;
  source: string | null;
  module: string | null;
  context_snapshot?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  created_by?: string | null;
  updated_by?: string | null;
};

export type CreateAiFeedbackDraft = {
  conversation_id?: string | null;
  contacto_id?: string | null;
  cliente_id?: string | null;
  contact_ai_profile_id?: string | null;
  ai_event_id?: string | null;
  thread_id?: string | null;
  assistant_message_id?: string | null;
  feedback_type: "POSITIVO" | "NEGATIVO" | "NEUTRO" | string;
  rating?: number | null;
  comment?: string | null;
  original_ai_answer?: string | null;
  original_user_prompt?: string | null;
  source?: string | null;
  module?: string | null;
  context_snapshot?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

/* =========================================================
   DRAFTS / FILTROS
========================================================= */

export type ComunicacionesFilters = {
  tab: ComunicacionesTab;
  search: string;
  channel: "todos" | ComunicacionChannel;
  assignedTo: string;
  sucursalId: string;
  prioridad: "todas" | PrioridadConversacion;
  estadoGestion: "todos" | EstadoGestion;
  estadoComercial: "todos" | EstadoComercial;
  tagId: string;
  ventana24h: "todas" | "abierta" | "cerrada";
  unreadOnly: boolean;
};

export type ComunicacionesMetrics = {
  nia: number;
  candeAtendiendo: number;
  derivadoNuevo: number;
  misConversaciones: number;
  enColaboracion: number;
  cerradas: number;
  archivadas: number;
  eliminadas: number;
  abiertas: number;
  noLeidas: number;
  urgentes: number;
  ventanaAbierta: number;
  aiAutomaticas: number;
  aiSugeridas: number;
  aiDerivadasPendientes: number;
};

export type CreateConversationDraft = {
  channel: ComunicacionChannel;
  contacto_nombre: string;
  telefono: string;
  email: string;
  subject: string;
  assigned_to: string | null;
  sucursal_id: string | null;
  prioridad: PrioridadConversacion;
  estado_gestion: EstadoGestion;
  estado_comercial: EstadoComercial;
  categoria: string;
  initial_message: string;
};

export type SendMessageDraft = {
  conversation_id: string;
  content: string;
  message_type?: string;
  media_file?: File | null;
  media_url?: string | null;
  media_filename?: string | null;
  media_mime_type?: string | null;
  media_size?: number | null;
  template_name?: string;
  template_language?: string;
  template_variables?: string[];
  is_internal?: boolean;
  reply_to_id?: string | null;
  reply_to_whatsapp_message_id?: string | null;
};

export type AddNoteDraft = {
  conversation_id: string;
  note: string;
  tipo?: "NOTA_INTERNA" | "RECORDATORIO_INTERNO" | "MENSAJE_CLIENTE_PROGRAMADO" | string;
  target_type?: "INTERNO" | "CLIENTE" | string;
  scheduled_at?: string | null;
  message_template_id?: string | null;
  template_variables?: string[];
};

export type UpdateConversationDraft = Partial<ComunicacionConversation> & { id: string };

export type ForwardMessageDraft = {
  source_message_id: string;
  target_conversation_id: string;
  caption?: string;
};

export type SyncContactoResult = {
  ok: boolean;
  contactoId: string | null;
  created: boolean;
  message: string;
};

type ComunicacionesState = {
  loading: boolean;
  loadingMessages: boolean;
  loadingNotes: boolean;
  saving: boolean;
  uploading: boolean;
  analyzingAi: boolean;
  loadingAiProfiles: boolean;
  loadingAiActions: boolean;
  loadingAssistant: boolean;
  loadingOperationalAlerts: boolean;
  loadingAiCommercialControl: boolean;
  loadingAiPersonas: boolean;
  loadingSellerAvailability: boolean;
  error: string | null;

  currentProfile: ProfileLite | null;
  canUseComunicaciones: boolean;
  canManageComunicaciones: boolean;

  conversations: ComunicacionConversation[];
  messages: ComunicacionMessage[];
  notes: ConversationNote[];
  tags: ConversationTag[];
  vendedores: ProfileLite[];
  sucursales: SucursalLite[];
  quickReplies: QuickReply[];
  templates: WhatsappTemplate[];

  aiPersonas: AiPersona[];
  sellerAvailability: SellerAvailability[];

  aiAnalysisByConversationId: Record<string, AiConversationAnalysis>;
  contactAiProfiles: ContactAiProfile[];
  aiActionsLog: AiActionsLogItem[];
  assistantThreads: AiAssistantThread[];
  assistantMessages: AiAssistantMessage[];
  selectedAssistantThreadId: string | null;

  operationalAlerts: AiOperationalAlert[];
  commercialGapDashboard: CommercialGapDashboard | null;
  aiCommercialControlDashboard: AiCommercialControlDashboard | null;
  aiDailyCommercialReports: AiDailyCommercialReport[];
  aiFeedback: AiFeedback[];

  filters: ComunicacionesFilters;
  selectedConversationId: string | null;

  loadComunicaciones: (silent?: boolean) => Promise<void>;
  loadMessages: (conversationId?: string | null, silent?: boolean) => Promise<void>;
  loadNotes: (conversationId?: string | null, silent?: boolean) => Promise<void>;

  loadQuickReplies: (silent?: boolean) => Promise<void>;
  createQuickReply: (draft: QuickReplyDraft) => Promise<boolean>;
  updateQuickReply: (draft: QuickReplyDraft & { id: string }) => Promise<boolean>;
  toggleQuickReplyActive: (quickReplyId: string) => Promise<boolean>;
  incrementQuickReplyUsage: (quickReplyId: string) => Promise<void>;

  createConversation: (draft: CreateConversationDraft) => Promise<string | null>;
  sendMessage: (draft: SendMessageDraft) => Promise<boolean>;

  addNote: (draft: AddNoteDraft) => Promise<boolean>;
  deleteNote: (noteId: string) => Promise<boolean>;

  updateConversation: (draft: UpdateConversationDraft) => Promise<boolean>;
  takeConversation: (conversationId: string) => Promise<boolean>;
  transferConversation: (conversationId: string, targetProfileId: string, note?: string) => Promise<boolean>;
  addCollaborator: (conversationId: string, profileId: string) => Promise<boolean>;
  removeCollaborator: (conversationId: string, profileId: string) => Promise<boolean>;

  archiveConversation: (conversationId: string) => Promise<boolean>;
  trashConversation: (conversationId: string) => Promise<boolean>;
  restoreConversation: (conversationId: string) => Promise<boolean>;
  closeConversation: (conversationId: string) => Promise<boolean>;
  reopenConversation: (conversationId: string) => Promise<boolean>;
  joinConversation: (conversationId: string) => Promise<boolean>;

  toggleTag: (conversationId: string, tagId: string) => Promise<boolean>;

  deleteMessage: (messageId: string) => Promise<boolean>;
  deleteMessageLocal: (messageId: string) => Promise<boolean>;
  reactToMessage: (messageId: string, emoji: string) => Promise<boolean>;
  forwardMessage: (draftOrSourceMessageId: ForwardMessageDraft | string, targetConversationId?: string) => Promise<boolean>;

  syncConversationToContacto: (conversationId: string) => Promise<SyncContactoResult>;

  loadConversationAiAnalysis: (conversationId: string) => Promise<AiConversationAnalysis | null>;
  analyzeConversationAi: (conversationId: string, force?: boolean) => Promise<AiConversationAnalysis | null>;

  loadContactAiProfiles: (silent?: boolean) => Promise<void>;
  loadAiActionsLog: (conversationId?: string | null, silent?: boolean) => Promise<void>;

  loadAiPersonas: (silent?: boolean) => Promise<void>;
  updateAiPersona: (draft: AiPersonaUpdateDraft) => Promise<boolean>;
  testAiPersonaInternalChat: (message: string) => Promise<string | null>;

  getCustomerAiPersona: () => AiPersona | null;
  getCommercialAiPersona: () => AiPersona | null;

  updateCustomerAiConversationConfig: (draft: CustomerAiConversationConfigDraft) => Promise<boolean>;
  activateCustomerAiForConversation: (conversationId: string, mode?: CustomerAiMode) => Promise<boolean>;
  pauseCustomerAiForConversation: (conversationId: string, reason?: string) => Promise<boolean>;
  handoffCustomerAiConversation: (conversationId: string, reason?: string) => Promise<boolean>;
  requestCustomerAiHandoff: (conversationId: string, reason?: string) => Promise<boolean>;
  takeCustomerAiHandoff: (conversationId: string) => Promise<boolean>;
  triggerCustomerAiReply: (conversationId: string, force?: boolean) => Promise<boolean>;

  loadSellerAvailability: (silent?: boolean) => Promise<void>;
  setMySellerAvailability: (draft: SetSellerAvailabilityDraft) => Promise<boolean>;
  updateMySellerAvailability: (draft: SetSellerAvailabilityDraft) => Promise<boolean>;
  setSellerAvailability: (status: string, note?: string, until?: string | null) => Promise<boolean>;
  getSellerAvailabilityByUserId: (userId: string) => SellerAvailability | null;

  loadAssistantThreads: (silent?: boolean) => Promise<void>;
  loadAssistantMessages: (threadId?: string | null, silent?: boolean) => Promise<void>;
  createAssistantThread: (draft: CreateAssistantThreadDraft) => Promise<string | null>;
  selectAssistantThread: (threadId: string | null) => void;
  sendAssistantMessage: (draft: SendAssistantMessageDraft) => Promise<boolean>;

  replyFromNiaInternalChat: (
    conversation: ComunicacionConversation,
    userMessage: string,
    localUserMessageId: string
  ) => Promise<boolean>;

  logAiAction: (draft: LogAiActionDraft) => Promise<boolean>;
  loadOperationalAlerts: (silent?: boolean) => Promise<void>;
  loadCommercialGapDashboard: (silent?: boolean) => Promise<void>;
  generateCommercialGapAlerts: () => Promise<boolean>;
  resolveCommercialGapAlerts: () => Promise<boolean>;
  runNiaCommercialAssistantDispatch: (sendDailyReport?: boolean) => Promise<boolean>;
  loadAiCommercialControlDashboard: (days?: number, silent?: boolean) => Promise<void>;
  generateAiDailyCommercialReport: () => Promise<boolean>;
  loadAiDailyCommercialReports: (silent?: boolean) => Promise<void>;
  updateOperationalAlertStatus: (
    alertId: string,
    status: "VISTA" | "ACK" | "RESUELTA" | "DESCARTADA",
    resolutionNote?: string
  ) => Promise<boolean>;
  loadAiFeedback: (conversationId?: string | null, silent?: boolean) => Promise<void>;
  createAiFeedback: (draft: CreateAiFeedbackDraft) => Promise<boolean>;

  setFilter: <K extends keyof ComunicacionesFilters>(key: K, value: ComunicacionesFilters[K]) => void;
  resetFilters: () => void;
  selectConversation: (conversationId: string | null) => void;
  clearError: () => void;

  getFilteredConversations: () => ComunicacionConversation[];
  getSelectedConversation: () => ComunicacionConversation | null;
  getSelectedAiAnalysis: () => AiConversationAnalysis | null;
  getContactAiProfileByConversationId: (conversationId: string) => ContactAiProfile | null;
  getContactAiProfileById: (profileId: string) => ContactAiProfile | null;
  getSelectedAssistantThread: () => AiAssistantThread | null;
  getMetrics: () => ComunicacionesMetrics;
};
/* =========================================================
   HELPERS
========================================================= */

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function nullableText(value: unknown): string | null {
  const cleaned = cleanText(value);
  return cleaned ? cleaned : null;
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizePhoneForDisplay(value: unknown): string {
  const raw = String(value || "").replace(/[^\d+]/g, "");

  if (!raw) return "";
  if (raw.startsWith("+")) return raw;

  return `+${raw}`;
}

function normalizePhoneForLookup(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

function normalizeError(error: unknown): string {
  if (!error) return "Ocurrió un error inesperado.";

  if (typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "");

    if (message.toLowerCase().includes("row-level security")) return "No tenés permisos para esta acción.";
    if (message.toLowerCase().includes("permission denied")) return "Permiso denegado por Supabase/RLS.";
    if (message.toLowerCase().includes("duplicate key")) return "Ya existe un registro igual.";

    return message || "Ocurrió un error.";
  }

  return String(error);
}

function getNowIso(): string {
  return new Date().toISOString();
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();

  return data.user?.id || null;
}

function getProfileName(profile: ProfileLite | null): string {
  return profile ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || profile.email : "";
}

function canProfileUseComunicaciones(profile: ProfileLite | null): boolean {
  return Boolean(
    profile?.activo &&
      ["vendedor", "administracion", "gerencia", "admin_general"].includes(profile.rol)
  );
}

function canProfileManageComunicaciones(profile: ProfileLite | null): boolean {
  return Boolean(
    profile?.activo &&
      ["administracion", "gerencia", "admin_general"].includes(profile.rol)
  );
}

function getDefaultFilters(): ComunicacionesFilters {
  return {
    tab: "derivado_nuevo",
    search: "",
    channel: "todos",
    assignedTo: "todos",
    sucursalId: "todas",
    prioridad: "todas",
    estadoGestion: "todos",
    estadoComercial: "todos",
    tagId: "todos",
    ventana24h: "todas",
    unreadOnly: false
  };
}

function getMessagePreview(draft: SendMessageDraft): string {
  if (draft.template_name) return `[Plantilla] ${draft.template_name}`;
  if (draft.media_file) return draft.media_file.name;
  if (draft.media_filename) return draft.media_filename;

  return cleanText(draft.content) || "Mensaje";
}

function getMessageTypeFromFile(file?: File | null): string {
  if (!file) return "text";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";

  return "document";
}

function getFirstReactionEmoji(reactions: unknown): string | null {
  if (!Array.isArray(reactions) || reactions.length === 0) return null;

  const first = reactions[0] as { emoji?: unknown };

  return typeof first.emoji === "string" ? first.emoji : null;
}

function mergeMetadata(
  current: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(current || {}), ...patch };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return value as Record<string, unknown>;
}

function parseJsonSafe(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;

  const text = String(value || "").trim();

  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) return {};

    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function asJsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function numberFromRecord(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  const parsed = Number(value || 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

function isWindowOpen(conversation?: ComunicacionConversation | null): boolean {
  if (!conversation) return false;
  if (typeof conversation.ventana_24h_abierta === "boolean") return conversation.ventana_24h_abierta;
  if (!conversation.whatsapp_24h_expires_at) return false;

  return new Date(conversation.whatsapp_24h_expires_at).getTime() > Date.now();
}

function isAiInternalConversation(conversation?: ComunicacionConversation | null): boolean {
  if (!conversation) return false;

  const metadata = conversation.metadata || {};

  return (
    metadata.system_ai === true ||
    metadata.system_ai === "true" ||
    metadata.ai_persona_code === "commercial_assistant" ||
    metadata.ai_persona_id !== undefined ||
    (conversation.channel === "interno" && conversation.contacto_nombre === "NIA · Asistente Comercial")
  );
}

function getAiPersonaDisplayName(conversation?: ComunicacionConversation | null): string {
  const metadata = conversation?.metadata || {};

  return (
    cleanText(metadata.ai_persona_display_name) ||
    cleanText(metadata.ai_persona_name) ||
    cleanText(conversation?.contacto_nombre) ||
    "NIA · Asistente Comercial"
  );
}

function inboxFolderForTab(tab: ComunicacionesTab): string | null {
  const map: Partial<Record<ComunicacionesTab, string>> = {
    mis_conversaciones: "MIS_CONVERSACIONES",
    en_colaboracion: "EN_COLABORACION",
    cerradas: "CERRADAS",
    archivadas: "ARCHIVADAS",
    eliminadas: "ELIMINADAS"
  };

  return map[tab] || null;
}

function isClosedArchivedOrDeletedConversation(conversation: ComunicacionConversation): boolean {
  return (
    Boolean(conversation.archived) ||
    Boolean(conversation.deleted) ||
    conversation.status === "CERRADA" ||
    conversation.status === "ARCHIVADA" ||
    conversation.status === "ELIMINADA" ||
    conversation.estado_gestion === "CERRADA"
  );
}

function isCustomerAiPendingHandoff(conversation: ComunicacionConversation): boolean {
  const inboxFolder = String(conversation.inbox_folder || "").toUpperCase();
  const handoffStatus = String(conversation.customer_ai_handoff_status || "").toUpperCase();
  const aiStatus = String(conversation.customer_ai_status || "").toUpperCase();
  const aiStage = String(conversation.customer_ai_stage || "").toUpperCase();
  const estadoGestion = String(conversation.estado_gestion || "").toUpperCase();
  const metadataStage = String(conversation.metadata?.customer_ai_stage || "").toUpperCase();

  return (
    inboxFolder === "DERIVADO_NUEVO" ||
    inboxFolder === "SIN_ATENDER" ||
    handoffStatus === "DERIVADA_A_BANDEJA" ||
    handoffStatus === "LISTA_PARA_DERIVAR" ||
    handoffStatus === "PENDIENTE_VENDEDOR" ||
    aiStatus === "DERIVADA" ||
    aiStage === "DERIVADA" ||
    estadoGestion === "DERIVADO_NUEVO" ||
    estadoGestion === "SIN_ATENDER" ||
    metadataStage === "DERIVADO_NUEVO" ||
    metadataStage === "SIN_ATENDER"
  );
}

function isCandeAtendiendoConversation(conversation: ComunicacionConversation): boolean {
  const inboxFolder = String(conversation.inbox_folder || "").toUpperCase();

  return (
    !isClosedArchivedOrDeletedConversation(conversation) &&
    !conversation.assigned_to &&
    !isDerivadoNuevoConversation(conversation) &&
    (
      inboxFolder === "CANDE_ATENDIENDO" ||
      (
        conversation.channel === "whatsapp" &&
        conversation.customer_ai_enabled === true &&
        conversation.customer_ai_mode === "AUTOMATICA" &&
        !isCustomerAiPendingHandoff(conversation)
      )
    )
  );
}

function isDerivadoNuevoConversation(conversation: ComunicacionConversation): boolean {
  const inboxFolder = String(conversation.inbox_folder || "").toUpperCase();
  const estadoGestion = String(conversation.estado_gestion || "").toUpperCase();

  return (
    !isClosedArchivedOrDeletedConversation(conversation) &&
    !isAiInternalConversation(conversation) &&
    !conversation.assigned_to &&
    (
      isCustomerAiPendingHandoff(conversation) ||
      inboxFolder === "DERIVADO_NUEVO" ||
      inboxFolder === "SIN_ATENDER" ||
      estadoGestion === "DERIVADO_NUEVO" ||
      estadoGestion === "SIN_ATENDER"
    )
  );
}

function isHumanWorkConversation(conversation: ComunicacionConversation): boolean {
  const inboxFolder = String(conversation.inbox_folder || "").toUpperCase();
  const estadoGestion = String(conversation.estado_gestion || "").toUpperCase();

  return (
    !isClosedArchivedOrDeletedConversation(conversation) &&
    !isAiInternalConversation(conversation) &&
    !isCandeAtendiendoConversation(conversation) &&
    !isDerivadoNuevoConversation(conversation) &&
    (
      Boolean(conversation.assigned_to) ||
      inboxFolder === "MIS_CONVERSACIONES" ||
      inboxFolder === "EN_GESTION" ||
      ["EN_GESTION", "ESPERA_CLIENTE", "ESPERA_AGENTE", "RECONTACTAR", "RESUELTA"].includes(estadoGestion)
    )
  );
}


function getStableAvatarColor(seed: unknown): string {
  const colors = [
    "#0f766e",
    "#2563eb",
    "#7c3aed",
    "#db2777",
    "#ea580c",
    "#ca8a04",
    "#16a34a",
    "#0891b2",
    "#4f46e5",
    "#be123c"
  ];

  const text = String(seed || "cliente");
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = text.charCodeAt(index) + ((hash << 5) - hash);
  }

  const safeIndex = Math.abs(hash) % colors.length;

  return colors[safeIndex];
}

function getInitialsFromName(value: unknown): string {
  const clean = cleanText(value);

  if (!clean) return "CL";

  const parts = clean
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "CL";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function extractAssistantAnswer(value: unknown): string {
  const data = readRecord(value);

  const direct =
    cleanText(data.answer) ||
    cleanText(data.content) ||
    cleanText(data.message) ||
    cleanText(data.reply) ||
    cleanText(data.text) ||
    cleanText(data.response) ||
    cleanText(data.output_text);

  if (direct) return direct;

  const nestedData = readRecord(data.data);
  const nestedResult = readRecord(data.result);
  const nestedResponse = readRecord(data.response);
  const nestedPayload = readRecord(data.payload);

  const nested =
    cleanText(nestedData.answer) ||
    cleanText(nestedData.content) ||
    cleanText(nestedData.message) ||
    cleanText(nestedData.reply) ||
    cleanText(nestedData.text) ||
    cleanText(nestedData.response) ||
    cleanText(nestedData.output_text) ||
    cleanText(nestedResult.answer) ||
    cleanText(nestedResult.content) ||
    cleanText(nestedResult.message) ||
    cleanText(nestedResult.reply) ||
    cleanText(nestedResult.response) ||
    cleanText(nestedResponse.answer) ||
    cleanText(nestedResponse.content) ||
    cleanText(nestedResponse.message) ||
    cleanText(nestedResponse.reply) ||
    cleanText(nestedResponse.response) ||
    cleanText(nestedPayload.answer) ||
    cleanText(nestedPayload.content) ||
    cleanText(nestedPayload.message) ||
    cleanText(nestedPayload.reply) ||
    cleanText(nestedPayload.response);

  if (nested) return nested;

  const choices = data.choices;

  if (Array.isArray(choices) && choices.length > 0) {
    const firstChoice = readRecord(choices[0]);
    const firstMessage = readRecord(firstChoice.message);

    return (
      cleanText(firstMessage.content) ||
      cleanText(firstChoice.text) ||
      cleanText(firstChoice.content) ||
      cleanText(firstChoice.response)
    );
  }

  return "";
}

/* =========================================================
   LABELS / EXPORTS
========================================================= */

export function getComunicacionChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    whatsapp: "WhatsApp",
    email: "Email",
    interno: "Interno",
    telefono: "Teléfono",
    otro: "Otro"
  };

  return labels[channel] || channel;
}

export function getComunicacionEstadoGestionLabel(value: string): string {
  const labels: Record<string, string> = {
    EN_ATENCION_IA: "En atención CANDE",
    DERIVADO_NUEVO: "Derivado nuevo",
    SIN_ATENDER: "Sin atender",
    ESPERA_CLIENTE: "Espera cliente",
    ESPERA_AGENTE: "Espera agente",
    EN_GESTION: "En gestión",
    RECONTACTAR: "Recontactar",
    RESUELTA: "Resuelta",
    CERRADA: "Cerrada"
  };

  return labels[value] || value;
}

export function getComunicacionEstadoComercialLabel(value: string): string {
  const labels: Record<string, string> = {
    NUEVO: "Nuevo",
    SEGUIMIENTO: "Seguimiento",
    COTIZANDO: "Cotizando",
    PRESUPUESTADO: "Presupuestado",
    VENDIDO: "Vendido",
    POSTVENTA: "Postventa",
    CERRADO: "Cerrado",
    PERDIDO: "Perdido"
  };

  return labels[value] || value;
}

export function getComunicacionPrioridadLabel(value: string): string {
  const labels: Record<string, string> = {
    BAJA: "Baja",
    NORMAL: "Normal",
    ALTA: "Alta",
    URGENTE: "Urgente"
  };

  return labels[value] || value;
}

export function getCustomerAiModeLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    APAGADA: "Apagada",
    SUGERIDA: "Sugerida",
    AUTOMATICA: "Automática"
  };

  return labels[String(value || "APAGADA")] || String(value || "Apagada");
}

export function getCustomerAiStatusLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    INACTIVA: "Inactiva",
    ACTIVA: "Activa",
    OBSERVANDO: "Observando",
    RESPONDIENDO: "Respondiendo",
    INDAGANDO: "Indagando",
    LISTA_PARA_DERIVAR: "Lista para derivar",
    DERIVADA: "Derivada",
    DERIVANDO: "Derivando",
    PAUSADA: "Pausada"
  };

  return labels[String(value || "INACTIVA")] || String(value || "Inactiva");
}

export function getCustomerAiHandoffStatusLabel(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    NO_DERIVADA: "No derivada",
    LISTA_PARA_DERIVAR: "Lista para derivar",
    DERIVADA_A_BANDEJA: "Derivada a vendedores",
    TOMADA_POR_VENDEDOR: "Tomada por vendedor",
    REASIGNADA: "Reasignada",
    PAUSADA: "Pausada",
    CERRADA: "Cerrada",

    SIN_DERIVAR: "Sin derivar",
    PENDIENTE_VENDEDOR: "Pendiente de vendedor",
    DERIVADA: "Derivada",
    TOMADA: "Tomada",
    CANCELADA: "Cancelada"
  };

  return labels[String(value || "NO_DERIVADA")] || String(value || "No derivada");
}

export function getQuickReplyCategoriaLabel(value: string): string {
  const labels: Record<string, string> = {
    generales: "Generales",
    ventas: "Ventas",
    cotizaciones: "Cotizaciones",
    pagos: "Pagos",
    documentacion: "Documentación",
    postventa: "Postventa",
    reclamos: "Reclamos",
    operaciones: "Operaciones"
  };

  return labels[value] || value;
}

export function getComunicacionDisplayName(conversation: ComunicacionConversation): string {
  return (
    conversation.contacto_nombre ||
    conversation.titulo ||
    conversation.subject ||
    conversation.telefono ||
    conversation.email ||
    "Sin nombre"
  );
}

export function createInitialConversationDraft(profile: ProfileLite | null): CreateConversationDraft {
  return {
    channel: "whatsapp",
    contacto_nombre: "",
    telefono: "",
    email: "",
    subject: "",
    assigned_to: profile?.id || null,
    sucursal_id: profile?.sucursal_id || null,
    prioridad: "NORMAL",
    estado_gestion: "EN_ATENCION_IA",
    estado_comercial: "NUEVO",
    categoria: "",
    initial_message: ""
  };
}

function mapEstadoComercialToContactoEstado(value: unknown): string {
  const estado = String(value || "NUEVO").toUpperCase();

  if (estado === "COTIZANDO") return "CONTACTADO";
  if (estado === "PRESUPUESTADO") return "COTIZADO";
  if (estado === "SEGUIMIENTO") return "SEGUIMIENTO";
  if (estado === "VENDIDO") return "VENDIDO";
  if (estado === "PERDIDO") return "RECHAZADO";
  if (estado === "CERRADO") return "RECHAZADO";

  return "NUEVO";
}

/* =========================================================
   NORMALIZADORES
========================================================= */

function normalizeAiAnalysis(conversationId: string, value: unknown): AiConversationAnalysis {
  const raw = readRecord(value);
  const metadata = readRecord(raw.metadata);
  const parsedOutput = parseJsonSafe(raw.output_text);

  const data = readRecord(
    raw.analysis ||
      raw.analisis ||
      raw.result ||
      raw.data ||
      metadata.analysis ||
      metadata.analisis ||
      parsedOutput.analysis ||
      parsedOutput.analisis ||
      parsedOutput ||
      raw
  );

  const datosDetectados = readRecord(data.datos_detectados || data.datosDetectados || data.datos || {});

  const score =
    toNumberOrNull(data.score_cliente) ??
    toNumberOrNull(data.puntaje_lead) ??
    toNumberOrNull(data.lead_score) ??
    toNumberOrNull(raw.ai_score);

  const resumen =
    cleanText(data.resumen || data.summary || data.sintesis || raw.ai_resumen) || "Sin resumen disponible.";

  const intencion =
    cleanText(data.intencion || data.intent || data.intention || raw.ai_intencion_compra) || "No detectada";

  const prioridad =
    cleanText(data.prioridad_sugerida || data.priority || data.prioridad || raw.ai_urgencia) || "NORMAL";

  const estadoComercial =
    cleanText(data.estado_comercial_sugerido || data.estado_comercial || data.suggested_commercial_status) ||
    "NUEVO";

  const estadoGestion =
    cleanText(data.estado_gestion_sugerido || data.estado_gestion || data.suggested_management_status) ||
    "EN_GESTION";

  const sentimiento = cleanText(data.sentimiento || data.sentiment) || "NEUTRO";
  const temperatura = cleanText(data.temperatura_lead || data.lead_temperature || raw.ai_temperatura) || "TIBIO";
  const proximasAcciones = toStringArray(data.proximas_acciones || data.next_actions);

  const proximaAccion =
    cleanText(data.proxima_accion || data.next_action || data.accion_sugerida || raw.ai_next_action) ||
    proximasAcciones[0] ||
    "Revisar la conversación y continuar seguimiento.";

  const respuestaSugerida =
    cleanText(data.respuesta_sugerida || data.suggested_response || data.suggested_reply || data.reply) || "";

  const etiquetas = toStringArray(data.etiquetas_sugeridas || data.suggested_tags || data.tags || data.etiquetas);
  const faltante = toStringArray(data.informacion_faltante || data.missing_info);

  return {
    conversation_id: String(data.conversation_id || raw.conversation_id || conversationId),
    resumen,
    summary: resumen,
    intencion,
    intent: intencion,
    prioridad_sugerida: prioridad,
    priority: prioridad,
    estado_comercial_sugerido: estadoComercial,
    estado_gestion_sugerido: estadoGestion,
    sentimiento,
    sentiment: sentimiento,
    score_cliente: score,
    puntaje_lead: score,
    lead_score: score,
    temperatura_lead: temperatura,
    lead_temperature: temperatura,
    datos_detectados: {
      destino: (datosDetectados.destino as string | null) || (raw.ai_destino_detectado as string | null) || null,
      fecha_viaje: (datosDetectados.fecha_viaje as string | null) || (raw.ai_fecha_detectada as string | null) || null,
      cantidad_pasajeros:
        (datosDetectados.cantidad_pasajeros as string | null) || (raw.ai_pax_detectados as string | null) || null,
      presupuesto:
        (datosDetectados.presupuesto as string | null) || (raw.ai_presupuesto_detectado as string | null) || null,
      origen: (datosDetectados.origen as string | null) || null,
      nombre: (datosDetectados.nombre as string | null) || null,
      telefono: (datosDetectados.telefono as string | null) || null,
      email: (datosDetectados.email as string | null) || null,
      otros: Array.isArray(datosDetectados.otros) ? toStringArray(datosDetectados.otros) : null
    },
    proxima_accion: proximaAccion,
    proximas_acciones: proximasAcciones,
    next_actions: proximasAcciones,
    respuesta_sugerida: respuestaSugerida,
    suggested_response: respuestaSugerida,
    etiquetas_sugeridas: etiquetas,
    suggested_tags: etiquetas,
    informacion_faltante: faltante,
    missing_info: faltante,
    confianza: toNumberOrNull(data.confianza),
    analyzed_at: (data.analyzed_at as string | null) || (raw.created_at as string | null) || getNowIso(),
    created_at: (raw.created_at as string | null) || (data.created_at as string | null) || getNowIso(),
    persisted_event_id: (data.persisted_event_id as string | null) || (raw.persisted_event_id as string | null) || null,
    raw
  };
}

function normalizeContactAiProfile(row: Record<string, unknown>): ContactAiProfile {
  return {
    id: String(row.id),
    created_at: String(row.created_at || getNowIso()),
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    nombre_detectado: (row.nombre_detectado as string | null) || null,
    telefono_detectado: (row.telefono_detectado as string | null) || null,
    email_detectado: (row.email_detectado as string | null) || null,
    score_actual: (row.score_actual as number | string | null) || null,
    temperatura_actual: (row.temperatura_actual as string | null) || null,
    resumen_general: (row.resumen_general as string | null) || null,
    preferencias_generales: (row.preferencias_generales as string | null) || null,
    destinos_interes: asStringArray(row.destinos_interes),
    fechas_interes: asStringArray(row.fechas_interes),
    cantidad_pasajeros: (row.cantidad_pasajeros as string | null) || null,
    presupuesto_estimado: (row.presupuesto_estimado as string | null) || null,
    restricciones: asStringArray(row.restricciones),
    objeciones: asStringArray(row.objeciones),
    intereses: asStringArray(row.intereses),
    ultimo_resumen_ia: (row.ultimo_resumen_ia as string | null) || null,
    ultima_accion_sugerida: (row.ultima_accion_sugerida as string | null) || null,
    ultima_respuesta_sugerida: (row.ultima_respuesta_sugerida as string | null) || null,
    informacion_faltante: asStringArray(row.informacion_faltante),
    etiquetas_sugeridas: asStringArray(row.etiquetas_sugeridas),
    estado_pipeline: (row.estado_pipeline as string | null) || null,
    estado_ia: (row.estado_ia as string | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null,
    updated_by: (row.updated_by as string | null) || null,
    updated_at: (row.updated_at as string | null) || null
  };
}

function normalizeAiPersona(row: Record<string, unknown>): AiPersona {
  return {
    id: String(row.id),
    code: String(row.code || ""),
    name: String(row.name || "NIA"),
    display_name: String(row.display_name || row.name || "NIA"),
    description: (row.description as string | null) || null,
    avatar_url: (row.avatar_url as string | null) || null,
    color: (row.color as string | null) || null,
    tone: (row.tone as string | null) || null,
    public_behavior: (row.public_behavior as string | null) || null,
    internal_behavior: (row.internal_behavior as string | null) || null,
    allowed_topics: asStringArray(row.allowed_topics),
    forbidden_topics: asStringArray(row.forbidden_topics),
    handoff_rules: (row.handoff_rules as string | null) || null,
    business_rules: (row.business_rules as string | null) || null,
    safety_rules: (row.safety_rules as string | null) || null,
    default_mode: (row.default_mode as CustomerAiMode | null) || null,
    is_default: Boolean(row.is_default),
    active: row.active === undefined ? true : Boolean(row.active),
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_at: (row.created_at as string | null) || null,
    updated_at: (row.updated_at as string | null) || null
  };
}

function normalizeSellerAvailability(row: Record<string, unknown>): SellerAvailability {
  const userId = String(row.user_id || row.profile_id || row.id || "");

  return {
    id: String(row.id || userId),
    user_id: userId,
    profile_id: (row.profile_id as string | null) || userId || null,
    status: String(row.status || row.availability_status || "DISPONIBLE"),
    available: row.available === undefined ? true : Boolean(row.available),
    note:
      (row.note as string | null) ||
      (row.message as string | null) ||
      (row.availability_message as string | null) ||
      null,
    message:
      (row.message as string | null) ||
      (row.note as string | null) ||
      (row.availability_message as string | null) ||
      null,
    available_for_ai_handoff:
      row.available_for_ai_handoff === undefined ? true : Boolean(row.available_for_ai_handoff),
    available_until:
      (row.available_until as string | null) ||
      (row.unavailable_until as string | null) ||
      (row.until as string | null) ||
      null,
    until:
      (row.until as string | null) ||
      (row.available_until as string | null) ||
      (row.unavailable_until as string | null) ||
      null,
    created_at: (row.created_at as string | null) || null,
    updated_at: (row.updated_at as string | null) || null
  };
}
function normalizeAiActionLog(row: Record<string, unknown>): AiActionsLogItem {
  return {
    id: String(row.id),
    created_at: String(row.created_at || getNowIso()),
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    contact_ai_profile_id: (row.contact_ai_profile_id as string | null) || null,
    ai_event_id: (row.ai_event_id as string | null) || null,
    action_type: String(row.action_type || "AI_ACTION"),
    action_title: String(row.action_title || "Acción IA"),
    action_detail: (row.action_detail as string | null) || null,
    actor_type: (row.actor_type as string | null) || null,
    actor_id: (row.actor_id as string | null) || null,
    source: (row.source as string | null) || null,
    previous_value: (row.previous_value as Record<string, unknown> | null) || null,
    new_value: (row.new_value as Record<string, unknown> | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null
  };
}

function normalizeAssistantThread(row: Record<string, unknown>): AiAssistantThread {
  return {
    id: String(row.id),
    created_at: String(row.created_at || getNowIso()),
    title: String(row.title || "Conversación con IA"),
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    contact_ai_profile_id: (row.contact_ai_profile_id as string | null) || null,
    owner_id: (row.owner_id as string | null) || null,
    thread_type: String(row.thread_type || "GENERAL"),
    status: String(row.status || "ABIERTA"),
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null,
    updated_by: (row.updated_by as string | null) || null,
    updated_at: (row.updated_at as string | null) || null
  };
}

function normalizeAssistantMessage(row: Record<string, unknown>): AiAssistantMessage {
  return {
    id: String(row.id),
    created_at: String(row.created_at || getNowIso()),
    thread_id: String(row.thread_id),
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    contact_ai_profile_id: (row.contact_ai_profile_id as string | null) || null,
    role: String(row.role || "assistant"),
    content: (row.content as string | null) || null,
    audio_url: (row.audio_url as string | null) || null,
    audio_transcript: (row.audio_transcript as string | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null
  };
}

function normalizeOperationalAlert(row: Record<string, unknown>): AiOperationalAlert {
  return {
    id: String(row.id),
    created_at: String(row.created_at || getNowIso()),
    updated_at: String(row.updated_at || getNowIso()),
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    carrito_id: (row.carrito_id as string | null) || null,
    contact_ai_profile_id: (row.contact_ai_profile_id as string | null) || null,
    ai_event_id: (row.ai_event_id as string | null) || null,
    vendedor_id: (row.vendedor_id as string | null) || null,
    sucursal_id: (row.sucursal_id as string | null) || null,
    alert_type: String(row.alert_type || "OTRO"),
    alert_title: String(row.alert_title || "Alerta operativa"),
    alert_detail: (row.alert_detail as string | null) || null,
    severity: String(row.severity || "NORMAL"),
    status: String(row.status || "ABIERTA"),
    gap_hours: (row.gap_hours as number | string | null) || null,
    gap_started_at: (row.gap_started_at as string | null) || null,
    last_inbound_message_at: (row.last_inbound_message_at as string | null) || null,
    last_outbound_message_at: (row.last_outbound_message_at as string | null) || null,
    notify_seller: Boolean(row.notify_seller),
    notify_management: Boolean(row.notify_management),
    sent_to_user_ids: asStringArray(row.sent_to_user_ids),
    copied_to_user_ids: asStringArray(row.copied_to_user_ids),
    acknowledged_at: (row.acknowledged_at as string | null) || null,
    acknowledged_by: (row.acknowledged_by as string | null) || null,
    resolved_at: (row.resolved_at as string | null) || null,
    resolved_by: (row.resolved_by as string | null) || null,
    resolution_note: (row.resolution_note as string | null) || null,
    source: (row.source as string | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null,
    updated_by: (row.updated_by as string | null) || null
  };
}

function normalizeCommercialGapDashboard(value: unknown): CommercialGapDashboard {
  const data = readRecord(value);
  const global = readRecord(data.global);

  return {
    generated_at: (data.generated_at as string | null) || null,
    global: {
      cliente_esperando_respuesta: Number(global.cliente_esperando_respuesta || 0),
      gap_24h: Number(global.gap_24h || 0),
      gap_48h: Number(global.gap_48h || 0),
      gap_promedio_horas: Number(global.gap_promedio_horas || 0),
      gap_max_horas: Number(global.gap_max_horas || 0),
      cotizados_pendientes: Number(global.cotizados_pendientes || 0),
      oportunidades_abiertas: Number(global.oportunidades_abiertas || 0),
      oportunidades_calientes: Number(global.oportunidades_calientes || 0)
    },
    por_vendedor: asJsonArray<CommercialGapDashboardSeller>(data.por_vendedor),
    por_sucursal: asJsonArray<CommercialGapDashboardBranch>(data.por_sucursal),
    alertas_abiertas: asJsonArray<Record<string, unknown>>(data.alertas_abiertas).map(normalizeOperationalAlert)
  };
}

function normalizeAiCommercialControlDashboard(value: unknown): AiCommercialControlDashboard {
  const data = readRecord(value);
  const global = readRecord(data.global);

  return {
    generated_at: (data.generated_at as string | null) || null,
    period_days: Number(data.period_days || 7),
    global: {
      total_conversaciones: numberFromRecord(global, "total_conversaciones"),
      conversaciones_cliente_esperando: numberFromRecord(global, "conversaciones_cliente_esperando"),
      gap_24h: numberFromRecord(global, "gap_24h"),
      gap_48h: numberFromRecord(global, "gap_48h"),
      gap_promedio_horas: numberFromRecord(global, "gap_promedio_horas"),
      gap_max_horas: numberFromRecord(global, "gap_max_horas"),

      oportunidades_abiertas: numberFromRecord(global, "oportunidades_abiertas"),
      oportunidades_calientes: numberFromRecord(global, "oportunidades_calientes"),
      cotizados_pendientes: numberFromRecord(global, "cotizados_pendientes"),

      mensajes_inbound: numberFromRecord(global, "mensajes_inbound"),
      mensajes_outbound: numberFromRecord(global, "mensajes_outbound"),
      mensajes_internos: numberFromRecord(global, "mensajes_internos"),

      ai_analisis_generados: numberFromRecord(global, "ai_analisis_generados"),
      ai_chat_mensajes_usuario: numberFromRecord(global, "ai_chat_mensajes_usuario"),
      ai_chat_respuestas: numberFromRecord(global, "ai_chat_respuestas"),
      ai_acciones_log: numberFromRecord(global, "ai_acciones_log"),

      ai_feedback_total: numberFromRecord(global, "ai_feedback_total"),
      ai_feedback_positivo: numberFromRecord(global, "ai_feedback_positivo"),
      ai_feedback_negativo: numberFromRecord(global, "ai_feedback_negativo"),
      ai_feedback_promedio: numberFromRecord(global, "ai_feedback_promedio"),

      alertas_abiertas: numberFromRecord(global, "alertas_abiertas"),
      alertas_resueltas: numberFromRecord(global, "alertas_resueltas"),
      alertas_urgentes: numberFromRecord(global, "alertas_urgentes")
    },
    por_vendedor: asJsonArray<AiCommercialControlSeller>(data.por_vendedor),
    por_sucursal: asJsonArray<AiCommercialControlBranch>(data.por_sucursal),
    top_gap_conversations: asJsonArray<AiTopGapConversation>(data.top_gap_conversations),
    alertas_abiertas: asJsonArray<Record<string, unknown>>(data.alertas_abiertas).map(normalizeOperationalAlert)
  };
}

function normalizeAiDailyCommercialReport(row: Record<string, unknown>): AiDailyCommercialReport {
  return {
    id: String(row.id),
    report_date: String(row.report_date || ""),
    report_scope: String(row.report_scope || "GLOBAL"),
    sucursal_id: (row.sucursal_id as string | null) || null,
    vendedor_id: (row.vendedor_id as string | null) || null,
    report_title: String(row.report_title || "Reporte diario comercial IA"),
    report_summary: (row.report_summary as string | null) || null,

    total_conversaciones: Number(row.total_conversaciones || 0),
    conversaciones_cliente_esperando: Number(row.conversaciones_cliente_esperando || 0),
    gap_24h: Number(row.gap_24h || 0),
    gap_48h: Number(row.gap_48h || 0),
    gap_promedio_horas: Number(row.gap_promedio_horas || 0),
    gap_max_horas: Number(row.gap_max_horas || 0),

    oportunidades_abiertas: Number(row.oportunidades_abiertas || 0),
    oportunidades_calientes: Number(row.oportunidades_calientes || 0),
    cotizados_pendientes: Number(row.cotizados_pendientes || 0),

    mensajes_inbound: Number(row.mensajes_inbound || 0),
    mensajes_outbound: Number(row.mensajes_outbound || 0),
    mensajes_internos: Number(row.mensajes_internos || 0),

    ai_analisis_generados: Number(row.ai_analisis_generados || 0),
    ai_chat_mensajes_usuario: Number(row.ai_chat_mensajes_usuario || 0),
    ai_chat_respuestas: Number(row.ai_chat_respuestas || 0),
    ai_acciones_log: Number(row.ai_acciones_log || 0),

    ai_feedback_total: Number(row.ai_feedback_total || 0),
    ai_feedback_positivo: Number(row.ai_feedback_positivo || 0),
    ai_feedback_negativo: Number(row.ai_feedback_negativo || 0),
    ai_feedback_promedio: Number(row.ai_feedback_promedio || 0),

    alertas_abiertas: Number(row.alertas_abiertas || 0),
    alertas_resueltas: Number(row.alertas_resueltas || 0),
    alertas_urgentes: Number(row.alertas_urgentes || 0),

    payload: (row.payload as Record<string, unknown> | null) || null,
    created_at: String(row.created_at || getNowIso()),
    updated_at: (row.updated_at as string | null) || null
  };
}

function normalizeAiFeedback(row: Record<string, unknown>): AiFeedback {
  return {
    id: String(row.id),
    created_at: String(row.created_at || getNowIso()),
    updated_at: (row.updated_at as string | null) || null,
    conversation_id: (row.conversation_id as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    contact_ai_profile_id: (row.contact_ai_profile_id as string | null) || null,
    ai_event_id: (row.ai_event_id as string | null) || null,
    thread_id: (row.thread_id as string | null) || null,
    assistant_message_id: (row.assistant_message_id as string | null) || null,
    feedback_type: String(row.feedback_type || "NEUTRO"),
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    comment: (row.comment as string | null) || null,
    original_ai_answer: (row.original_ai_answer as string | null) || null,
    original_user_prompt: (row.original_user_prompt as string | null) || null,
    source: (row.source as string | null) || null,
    module: (row.module as string | null) || null,
    context_snapshot: (row.context_snapshot as Record<string, unknown> | null) || null,
    metadata: (row.metadata as Record<string, unknown> | null) || null,
    created_by: (row.created_by as string | null) || null,
    updated_by: (row.updated_by as string | null) || null
  };
}

function normalizeConversation(row: Record<string, unknown>): ComunicacionConversation {
  const displayName =
    cleanText(row.contacto_nombre) ||
    cleanText(row.titulo) ||
    cleanText(row.subject) ||
    cleanText(row.telefono) ||
    cleanText(row.email) ||
    "Cliente";

  const avatarUrl =
    (row.avatar_url as string | null) ||
    (row.contacto_avatar_url as string | null) ||
    (row.cliente_avatar_url as string | null) ||
    null;

  return {
    id: String(row.id),
    channel: String(row.channel || "whatsapp"),
    subject: (row.subject as string | null) || null,
    titulo: (row.titulo as string | null) || null,
    contacto_nombre: (row.contacto_nombre as string | null) || null,
    telefono: (row.telefono as string | null) || null,
    email: (row.email as string | null) || null,
    contacto_id: (row.contacto_id as string | null) || null,
    cliente_id: (row.cliente_id as string | null) || null,
    lead_id: (row.lead_id as string | null) || null,
    carrito_id: (row.carrito_id as string | null) || null,

    assigned_to: (row.assigned_to as string | null) || null,
    assigned_full_name: (row.assigned_full_name as string | null) || null,
    assigned_email: (row.assigned_email as string | null) || null,
    assigned_avatar_url: (row.assigned_avatar_url as string | null) || null,

    contacto_avatar_url: (row.contacto_avatar_url as string | null) || null,
    cliente_avatar_url: (row.cliente_avatar_url as string | null) || null,
    avatar_url: avatarUrl,
    avatar_color: (row.avatar_color as string | null) || getStableAvatarColor(row.id || displayName),
    avatar_initials: (row.avatar_initials as string | null) || getInitialsFromName(displayName),

    nombre_publico_whatsapp: (row.nombre_publico_whatsapp as string | null) || null,

    sucursal_id: (row.sucursal_id as string | null) || null,
    sucursal_nombre: (row.sucursal_nombre as string | null) || null,

    status: String(row.status || "ABIERTA"),
estado_gestion: String(row.estado_gestion || "EN_ATENCION_IA"),
    estado_comercial: String(row.estado_comercial || "NUEVO"),
    prioridad: String(row.prioridad || "NORMAL"),
    categoria: (row.categoria as string | null) || null,
    etapa_comercial: (row.etapa_comercial as string | null) || null,

    unread_count: Number(row.unread_count || 0),
    last_message: (row.last_message as string | null) || null,
    last_message_time: (row.last_message_time as string | null) || null,
    last_inbound_message_at: (row.last_inbound_message_at as string | null) || null,
    last_outbound_message_at: (row.last_outbound_message_at as string | null) || null,
    whatsapp_24h_expires_at: (row.whatsapp_24h_expires_at as string | null) || null,
    ventana_24h_abierta: typeof row.ventana_24h_abierta === "boolean" ? row.ventana_24h_abierta : false,

    archived: Boolean(row.archived),
    archived_at: (row.archived_at as string | null) || null,
    deleted: Boolean(row.deleted),
    deleted_at: (row.deleted_at as string | null) || null,
    closed_at: (row.closed_at as string | null) || null,
    closed_by: (row.closed_by as string | null) || null,

    mostrar_agente: row.mostrar_agente === undefined ? true : Boolean(row.mostrar_agente),
    en_colaboracion: Boolean(row.en_colaboracion),
    has_collaborators: Boolean(row.has_collaborators),
    participants: asJsonArray<ConversationParticipant>(row.participants),

    inbox_folder: (row.inbox_folder as string | null) || null,
    can_write: Boolean(row.can_write),
    can_take: Boolean(row.can_take),
    can_manage_assignment: Boolean(row.can_manage_assignment),

    customer_ai_persona_id: (row.customer_ai_persona_id as string | null) || null,
    customer_ai_enabled: Boolean(row.customer_ai_enabled),
    customer_ai_mode: (row.customer_ai_mode as CustomerAiMode | null) || "APAGADA",
        customer_ai_status: (row.customer_ai_status as CustomerAiStatus | null) || "INACTIVA",
    customer_ai_stage: (row.customer_ai_stage as string | null) || null,
    customer_ai_handoff_status:
      (row.customer_ai_handoff_status as CustomerAiHandoffStatus | null) || "NO_DERIVADA",
    customer_ai_handoff_reason: (row.customer_ai_handoff_reason as string | null) || null,
    customer_ai_handoff_at:
      (row.customer_ai_handoff_at as string | null) ||
      (row.customer_ai_handoff_requested_at as string | null) ||
      null,
    customer_ai_taken_by:
      (row.customer_ai_taken_by as string | null) ||
      (row.customer_ai_handoff_taken_by as string | null) ||
      null,
    customer_ai_taken_at:
      (row.customer_ai_taken_at as string | null) ||
      (row.customer_ai_handoff_taken_at as string | null) ||
      null,
    customer_ai_paused_until: (row.customer_ai_paused_until as string | null) || null,
    customer_ai_last_response_at: (row.customer_ai_last_response_at as string | null) || null,
    customer_ai_last_analysis_at: (row.customer_ai_last_analysis_at as string | null) || null,
    customer_ai_score: (row.customer_ai_score as number | string | null) || null,
    customer_ai_temperature: (row.customer_ai_temperature as string | null) || null,
    customer_ai_summary: (row.customer_ai_summary as string | null) || null,
    customer_ai_missing_info: asStringArray(row.customer_ai_missing_info),
    customer_ai_next_action: (row.customer_ai_next_action as string | null) || null,
    customer_ai_auto_reply_count:
      row.customer_ai_auto_reply_count === null || row.customer_ai_auto_reply_count === undefined
        ? 0
        : Number(row.customer_ai_auto_reply_count),
    customer_ai_last_error: (row.customer_ai_last_error as string | null) || null,

    metadata: (row.metadata as Record<string, unknown> | null) || null,
    tags: asJsonArray<ConversationTag>(row.tags),

    created_by: (row.created_by as string | null) || null,
    created_at: String(row.created_at || getNowIso()),
    updated_at: String(row.updated_at || getNowIso())
  };
}

function normalizeMessage(row: Record<string, unknown>): ComunicacionMessage {
  const metadata = (row.metadata as Record<string, unknown> | null) || null;
  const metadataReactions = metadata?.message_reactions;

  const reactions = Array.isArray(row.message_reactions)
    ? (row.message_reactions as ComunicacionMessageReaction[])
    : Array.isArray(row.reactions)
      ? (row.reactions as ComunicacionMessageReaction[])
      : Array.isArray(metadataReactions)
        ? (metadataReactions as ComunicacionMessageReaction[])
        : null;

  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    channel: String(row.channel || "whatsapp"),
    direction: String(row.direction || "outbound"),
    sender_type: String(row.sender_type || "agent"),
    sender_id: (row.sender_id as string | null) || null,
    sender_name: (row.sender_name as string | null) || null,
    sender_full_name: (row.sender_full_name as string | null) || null,
    content: (row.content as string | null) || null,
    message_type: String(row.message_type || "text"),
    media_url: (row.media_url as string | null) || null,
    media_path: (row.media_path as string | null) || null,
    media_filename: (row.media_filename as string | null) || null,
    media_mime_type: (row.media_mime_type as string | null) || null,
    media_size: row.media_size === null || row.media_size === undefined ? null : Number(row.media_size),
    status: String(row.status || "sent"),
    whatsapp_message_id: (row.whatsapp_message_id as string | null) || null,
    wa_error_code: (row.wa_error_code as string | null) || null,
    wa_error_message: (row.wa_error_message as string | null) || null,
    reply_to_id: (row.reply_to_id as string | null) || null,
    reply_to_whatsapp_message_id:
      (row.reply_to_whatsapp_message_id as string | null) ||
      (metadata?.reply_to_whatsapp_message_id as string | null) ||
      null,
    reactions,
    message_reactions: reactions,
    reaction_emoji: (row.reaction_emoji as string | null) || getFirstReactionEmoji(reactions),
    is_forwarded: Boolean(row.is_forwarded || metadata?.is_forwarded),
    edited: Boolean(row.edited),
    edited_at: (row.edited_at as string | null) || null,
    deleted_at: (row.deleted_at as string | null) || null,
    is_internal: Boolean(row.is_internal),
    metadata,
    created_by: (row.created_by as string | null) || null,
    created_at: String(row.created_at || getNowIso()),
    updated_at: (row.updated_at as string | null) || null
  };
}

async function syncContactoFromConversationPatch(
  conversation: ComunicacionConversation,
  patch: UpdateConversationDraft
): Promise<{ ok: boolean; message?: string }> {
  if (!conversation.contacto_id) {
    return { ok: true };
  }

  const payload: Record<string, unknown> = {};

  if (patch.estado_comercial !== undefined) {
    payload.estado = mapEstadoComercialToContactoEstado(patch.estado_comercial);
  }

  if (patch.contacto_nombre !== undefined || patch.titulo !== undefined || patch.subject !== undefined) {
    payload.nombre_completo =
      cleanText(patch.contacto_nombre) ||
      cleanText(patch.titulo) ||
      cleanText(patch.subject) ||
      getComunicacionDisplayName(conversation);
  }

  if (patch.telefono !== undefined) {
    payload.telefono = patch.telefono ? normalizePhoneForDisplay(patch.telefono) : conversation.telefono;
  }

  if (patch.assigned_to !== undefined) {
    payload.vendedor_id = patch.assigned_to || conversation.assigned_to;
  }

  if (patch.sucursal_id !== undefined) {
    payload.sucursal_id = patch.sucursal_id || conversation.sucursal_id;
  }

  if (Object.keys(payload).length === 0) {
    return { ok: true };
  }

  payload.updated_at = getNowIso();

  const { error } = await supabase.from("contactos").update(payload).eq("id", conversation.contacto_id);

  if (error) {
    return {
      ok: false,
      message: normalizeError(error)
    };
  }

  return { ok: true };
}

/* =========================================================
   STORE
========================================================= */

export const useComunicacionesStore = create<ComunicacionesState>((set, get) => ({
  loading: false,
  loadingMessages: false,
  loadingNotes: false,
  saving: false,
  uploading: false,
  analyzingAi: false,
  loadingAiProfiles: false,
  loadingAiActions: false,
  loadingAssistant: false,
  loadingOperationalAlerts: false,
  loadingAiCommercialControl: false,
  loadingAiPersonas: false,
  loadingSellerAvailability: false,
  error: null,

  currentProfile: null,
  canUseComunicaciones: false,
  canManageComunicaciones: false,

  conversations: [],
  messages: [],
  notes: [],
  tags: [],
  vendedores: [],
  sucursales: [],
  quickReplies: [],
  templates: [],

  aiPersonas: [],
  sellerAvailability: [],

  aiAnalysisByConversationId: {},
  contactAiProfiles: [],
  aiActionsLog: [],
  assistantThreads: [],
  assistantMessages: [],
  selectedAssistantThreadId: null,

  operationalAlerts: [],
  commercialGapDashboard: null,
  aiCommercialControlDashboard: null,
  aiDailyCommercialReports: [],
  aiFeedback: [],

  filters: getDefaultFilters(),
  selectedConversationId: null,

  loadComunicaciones: async (silent = false) => {
    if (!silent) set({ loading: true, error: null });
    else set({ error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({
        loading: false,
        currentProfile: null,
        canUseComunicaciones: false,
        canManageComunicaciones: false,
        conversations: [],
        messages: [],
        notes: [],
        error: "No hay usuario autenticado."
      });

      return;
    }

    const profileRes = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUserId)
      .maybeSingle();

    if (profileRes.error) {
      set({ loading: false, error: normalizeError(profileRes.error) });
      return;
    }

    const currentProfile = (profileRes.data || null) as ProfileLite | null;
    const canUseComunicaciones = canProfileUseComunicaciones(currentProfile);
    const canManageComunicaciones = canProfileManageComunicaciones(currentProfile);

    if (!canUseComunicaciones) {
      set({
        loading: false,
        currentProfile,
        canUseComunicaciones,
        canManageComunicaciones,
        conversations: [],
        messages: [],
        notes: [],
        error: "Tu usuario no tiene acceso al módulo Comunicaciones."
      });

      return;
    }

const [
  conversationsRes,
  niaConversationsRes,
  tagsRes,
  vendedoresRes,
  sucursalesRes,
  quickRepliesRes,
  templatesRes,
  aiPersonasRes,
  sellerAvailabilityRes
] = await Promise.all([
  supabase.rpc("get_operational_inbox"),

  supabase
    .from("conversations")
    .select("*")
    .eq("channel", "interno")
    .eq("metadata->>system_ai", "true")
    .eq("metadata->>ai_persona_code", "commercial_assistant")
    .eq("metadata->>recipient_user_id", currentUserId)
    .eq("archived", false)
    .eq("deleted", false)
    .order("last_message_time", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(20),

  supabase.from("conversation_tags").select("*").eq("activo", true).order("nombre", { ascending: true }),
  supabase.from("profiles").select("*").eq("activo", true).order("nombre", { ascending: true }),
  supabase.from("sucursales").select("*").order("nombre", { ascending: true }),
  supabase
    .from("whatsapp_quick_replies")
    .select("*")
    .order("orden", { ascending: true })
    .order("titulo", { ascending: true }),
  supabase.from("whatsapp_templates").select("*").eq("activo", true).order("name", { ascending: true }),
  supabase.from("ai_personas").select("*").order("is_default", { ascending: false }).order("name", { ascending: true }),
  supabase.from("seller_availability").select("*")
]);

    const firstError =
      conversationsRes.error ||
      niaConversationsRes.error ||
      tagsRes.error ||
      vendedoresRes.error ||
      sucursalesRes.error ||
      quickRepliesRes.error ||
      templatesRes.error ||
      aiPersonasRes.error ||
      sellerAvailabilityRes.error;

    if (firstError) {
      set({
        loading: false,
        currentProfile,
        canUseComunicaciones,
        canManageComunicaciones,
        error: normalizeError(firstError)
      });

      return;
    }

const operationalConversations = ((conversationsRes.data || []) as Record<string, unknown>[]).map(
  normalizeConversation
);

const niaConversations = ((niaConversationsRes.data || []) as Record<string, unknown>[]).map((row) => {
  const normalized = normalizeConversation(row);

  return {
    ...normalized,
    channel: "interno",
    contacto_nombre: normalized.contacto_nombre || "NIA · Asistente Comercial",
    subject: normalized.subject || "NIA · Asistente Comercial",
    titulo: normalized.titulo || "NIA · Asistente Comercial",
    can_write: true,
    can_take: false,
    can_manage_assignment: false,
    inbox_folder: "NIA",
    avatar_color: cleanText(normalized.metadata?.ai_persona_color) || "#7c3aed",
    avatar_initials: "NIA"
  };
});

const mergedConversationsMap = new Map<string, ComunicacionConversation>();

[...niaConversations, ...operationalConversations].forEach((conversation) => {
  mergedConversationsMap.set(conversation.id, conversation);
});

const conversations = Array.from(mergedConversationsMap.values()).sort((a, b) => {
  const aIsNia = isAiInternalConversation(a) ? 1 : 0;
  const bIsNia = isAiInternalConversation(b) ? 1 : 0;

  if (aIsNia !== bIsNia) return bIsNia - aIsNia;

  const aTime = new Date(a.last_message_time || a.updated_at || a.created_at).getTime();
  const bTime = new Date(b.last_message_time || b.updated_at || b.created_at).getTime();

  return bTime - aTime;
});

const selectedConversationId = get().selectedConversationId;

    const nextSelectedConversationId =
      selectedConversationId && conversations.some((item) => item.id === selectedConversationId)
        ? selectedConversationId
        : conversations[0]?.id || null;

    set({
      loading: false,
      error: null,
      currentProfile,
      canUseComunicaciones,
      canManageComunicaciones,
      conversations,
      tags: (tagsRes.data || []) as ConversationTag[],
      vendedores: (vendedoresRes.data || []) as ProfileLite[],
      sucursales: (sucursalesRes.data || []) as SucursalLite[],
      quickReplies: (quickRepliesRes.data || []) as QuickReply[],
      templates: (templatesRes.data || []) as WhatsappTemplate[],
      aiPersonas: ((aiPersonasRes.data || []) as Record<string, unknown>[]).map(normalizeAiPersona),
      sellerAvailability: ((sellerAvailabilityRes.data || []) as Record<string, unknown>[]).map(
        normalizeSellerAvailability
      ),
      selectedConversationId: nextSelectedConversationId
    });

    void get().loadContactAiProfiles(true);
    void get().loadCommercialGapDashboard(true);
    void get().loadOperationalAlerts(true);
    void get().loadAiCommercialControlDashboard(7, true);
    void get().loadAiDailyCommercialReports(true);

    if (!silent && nextSelectedConversationId) {
      await Promise.all([
        get().loadMessages(nextSelectedConversationId, true),
        get().loadNotes(nextSelectedConversationId, true),
        get().loadConversationAiAnalysis(nextSelectedConversationId),
        get().loadAiActionsLog(nextSelectedConversationId, true),
        get().loadAiFeedback(nextSelectedConversationId, true)
      ]);
    }
  },

  loadAiPersonas: async (silent = false) => {
    if (!silent) set({ loadingAiPersonas: true, error: null });
    else set({ error: null });

    const personasRes = await supabase
      .from("ai_personas")
      .select("*")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (personasRes.error) {
      set({
        loadingAiPersonas: false,
        error: normalizeError(personasRes.error)
      });

      return;
    }

    set({
      loadingAiPersonas: false,
      aiPersonas: ((personasRes.data || []) as Record<string, unknown>[]).map(normalizeAiPersona)
    });
  },

  updateAiPersona: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const { canManageComunicaciones } = get();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    if (!canManageComunicaciones) {
      set({ saving: false, error: "No tenés permisos para configurar la IA." });
      return false;
    }

    if (!cleanText(draft.id)) {
      set({ saving: false, error: "No se encontró la persona IA." });
      return false;
    }

    const payload: Record<string, unknown> = {
      updated_by: currentUserId,
      updated_at: getNowIso()
    };

    if (draft.name !== undefined) payload.name = cleanText(draft.name);
    if (draft.display_name !== undefined) payload.display_name = cleanText(draft.display_name);
    if (draft.description !== undefined) payload.description = nullableText(draft.description);
    if (draft.avatar_url !== undefined) payload.avatar_url = nullableText(draft.avatar_url);
    if (draft.color !== undefined) payload.color = nullableText(draft.color);
    if (draft.tone !== undefined) payload.tone = nullableText(draft.tone);
    if (draft.public_behavior !== undefined) payload.public_behavior = nullableText(draft.public_behavior);
    if (draft.internal_behavior !== undefined) payload.internal_behavior = nullableText(draft.internal_behavior);
    if (draft.allowed_topics !== undefined) payload.allowed_topics = draft.allowed_topics || [];
    if (draft.forbidden_topics !== undefined) payload.forbidden_topics = draft.forbidden_topics || [];
    if (draft.handoff_rules !== undefined) payload.handoff_rules = nullableText(draft.handoff_rules);
    if (draft.business_rules !== undefined) payload.business_rules = nullableText(draft.business_rules);
    if (draft.safety_rules !== undefined) payload.safety_rules = nullableText(draft.safety_rules);
    if (draft.default_mode !== undefined) payload.default_mode = draft.default_mode || "SUGERIDA";
    if (draft.active !== undefined) payload.active = Boolean(draft.active);
    if (draft.metadata !== undefined) payload.metadata = draft.metadata || {};

    const updateRes = await supabase.from("ai_personas").update(payload).eq("id", draft.id);

    if (updateRes.error) {
      set({ saving: false, error: normalizeError(updateRes.error) });
      return false;
    }

    await get().loadAiPersonas(true);

    set({ saving: false });

    return true;
  },

  testAiPersonaInternalChat: async (message: string) => {
    set({ loadingAiPersonas: true, error: null });

    const cleanMessage = cleanText(message);

    if (!cleanMessage) {
      set({
        loadingAiPersonas: false,
        error: "Escribí un mensaje de prueba para NIA."
      });

      return null;
    }

    try {
      const rpcRes = await supabase.rpc("test_ai_persona_internal_chat", {
        p_message: cleanMessage
      });

      if (rpcRes.error) {
        set({
          loadingAiPersonas: false,
          error: normalizeError(rpcRes.error)
        });

        return null;
      }

      const response = extractAssistantAnswer(rpcRes.data) || cleanText(rpcRes.data);

      set({ loadingAiPersonas: false });

      return response || "NIA no devolvió una respuesta visible.";
    } catch (error) {
      const messageError = normalizeError(error);

      set({
        loadingAiPersonas: false,
        error: messageError
      });

      return null;
    }
  },

  loadSellerAvailability: async (silent = false) => {
    if (!silent) set({ loadingSellerAvailability: true, error: null });
    else set({ error: null });

    const availabilityRes = await supabase.from("seller_availability").select("*");

    if (availabilityRes.error) {
      set({
        loadingSellerAvailability: false,
        error: normalizeError(availabilityRes.error)
      });

      return;
    }

    set({
      loadingSellerAvailability: false,
      sellerAvailability: ((availabilityRes.data || []) as Record<string, unknown>[]).map(
        normalizeSellerAvailability
      )
    });
  },

  setMySellerAvailability: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

      const payload = {
      profile_id: currentUserId,
      status: cleanText(draft.status || "DISPONIBLE"),
      message: draft.message || null,
      available_for_ai_handoff:
        draft.available_for_ai_handoff === undefined ? true : Boolean(draft.available_for_ai_handoff),
      available_until: draft.available_until || null,
      updated_at: getNowIso()
    };

    const upsertRes = await supabase.from("seller_availability").upsert(payload, { onConflict: "profile_id" });

    if (upsertRes.error) {
      set({ saving: false, error: normalizeError(upsertRes.error) });
      return false;
    }

    await get().loadSellerAvailability(true);

    set({ saving: false });

    return true;
  },

    updateMySellerAvailability: async (draft: SetSellerAvailabilityDraft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    const payload = {
      profile_id: currentUserId,
      status: cleanText(draft.status || "DISPONIBLE"),
      message: draft.message || null,
      available_for_ai_handoff:
        draft.available_for_ai_handoff === undefined ? true : Boolean(draft.available_for_ai_handoff),
      available_until: draft.available_until || null,
      updated_at: getNowIso(),
      updated_by: currentUserId
    };

    const upsertRes = await supabase
      .from("seller_availability")
      .upsert(payload, { onConflict: "profile_id" });

    if (upsertRes.error) {
      set({ saving: false, error: normalizeError(upsertRes.error) });
      return false;
    }

    await get().loadSellerAvailability(true);

    set({ saving: false });

    return true;
  },

  setSellerAvailability: async (status, note = "", until = null) => {
    return get().setMySellerAvailability({
      status,
      message: note,
      available_for_ai_handoff: status === "DISPONIBLE",
      available_until: until
    });
  },

    loadQuickReplies: async (silent = false) => {
    if (!silent) set({ saving: true, error: null });
    else set({ error: null });

    const quickRepliesRes = await supabase
      .from("whatsapp_quick_replies")
      .select("*")
      .order("orden", { ascending: true })
      .order("titulo", { ascending: true });

    if (quickRepliesRes.error) {
      set({ saving: false, error: normalizeError(quickRepliesRes.error) });
      return;
    }

    set({
      saving: false,
      quickReplies: (quickRepliesRes.data || []) as QuickReply[]
    });
  },

  createQuickReply: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const { canManageComunicaciones } = get();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    if (!cleanText(draft.titulo)) {
      set({ saving: false, error: "Ingresá un título para la respuesta rápida." });
      return false;
    }

    if (!cleanText(draft.contenido)) {
      set({ saving: false, error: "Ingresá el contenido de la respuesta rápida." });
      return false;
    }

    const shouldBeGlobal = canManageComunicaciones ? Boolean(draft.global ?? true) : false;

    const insertRes = await supabase.from("whatsapp_quick_replies").insert({
      titulo: cleanText(draft.titulo),
      contenido: cleanText(draft.contenido),
      categoria: cleanText(draft.categoria) || "generales",
      global: shouldBeGlobal,
      profile_id: shouldBeGlobal ? null : draft.profile_id || currentUserId,
      activo: draft.activo ?? true,
      orden: Number(draft.orden || 0),
      created_by: currentUserId,
      updated_by: currentUserId
    });

    if (insertRes.error) {
      set({ saving: false, error: normalizeError(insertRes.error) });
      return false;
    }

    await get().loadQuickReplies(true);

    set({ saving: false });

    return true;
  },

  updateQuickReply: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const { canManageComunicaciones } = get();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    if (!cleanText(draft.titulo)) {
      set({ saving: false, error: "Ingresá un título para la respuesta rápida." });
      return false;
    }

    if (!cleanText(draft.contenido)) {
      set({ saving: false, error: "Ingresá el contenido de la respuesta rápida." });
      return false;
    }

    const shouldBeGlobal = canManageComunicaciones ? Boolean(draft.global ?? true) : false;

    const payload: Record<string, unknown> = {
      titulo: cleanText(draft.titulo),
      contenido: cleanText(draft.contenido),
      categoria: cleanText(draft.categoria) || "generales",
      activo: draft.activo ?? true,
      orden: Number(draft.orden || 0),
      updated_by: currentUserId,
      updated_at: getNowIso()
    };

    if (canManageComunicaciones) {
      payload.global = shouldBeGlobal;
      payload.profile_id = shouldBeGlobal ? null : draft.profile_id || currentUserId;
    }

    const updateRes = await supabase
      .from("whatsapp_quick_replies")
      .update(payload)
      .eq("id", draft.id);

    if (updateRes.error) {
      set({ saving: false, error: normalizeError(updateRes.error) });
      return false;
    }

    await get().loadQuickReplies(true);

    set({ saving: false });

    return true;
  },

  toggleQuickReplyActive: async (quickReplyId) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const reply = get().quickReplies.find((item) => item.id === quickReplyId);

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    if (!reply) {
      set({ saving: false, error: "No se encontró la respuesta rápida." });
      return false;
    }

    const updateRes = await supabase
      .from("whatsapp_quick_replies")
      .update({
        activo: !reply.activo,
        updated_by: currentUserId,
        updated_at: getNowIso()
      })
      .eq("id", quickReplyId);

    if (updateRes.error) {
      set({ saving: false, error: normalizeError(updateRes.error) });
      return false;
    }

    await get().loadQuickReplies(true);

    set({ saving: false });

    return true;
  },

  incrementQuickReplyUsage: async (quickReplyId) => {
    const reply = get().quickReplies.find((item) => item.id === quickReplyId);

    if (!reply) return;

    const nextValue = Number(reply.uso_contador || 0) + 1;

    set((state) => ({
      quickReplies: state.quickReplies.map((item) =>
        item.id === quickReplyId ? { ...item, uso_contador: nextValue } : item
      )
    }));

    await supabase
      .from("whatsapp_quick_replies")
      .update({
        uso_contador: nextValue,
        updated_at: getNowIso()
      })
      .eq("id", quickReplyId);
  },

  loadMessages: async (conversationId, silent = false) => {
    const targetConversationId = conversationId || get().selectedConversationId;

    if (!targetConversationId) {
      set({ messages: [], loadingMessages: false });
      return;
    }

    if (!silent) set({ loadingMessages: true, error: null });
    else set({ error: null });

    const messagesRes = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", targetConversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesRes.error) {
      set({ loadingMessages: false, error: normalizeError(messagesRes.error) });
      return;
    }

    const messages = ((messagesRes.data || []) as Record<string, unknown>[]).map(normalizeMessage);

    set({ loadingMessages: false, messages });

    const conversation = get().conversations.find((item) => item.id === targetConversationId);

    if (conversation && Number(conversation.unread_count || 0) > 0) {
      await supabase
        .from("conversations")
        .update({ unread_count: 0, updated_at: getNowIso() })
        .eq("id", targetConversationId);

      set((state) => ({
        conversations: state.conversations.map((item) =>
          item.id === targetConversationId ? { ...item, unread_count: 0 } : item
        )
      }));
    }
  },

  loadNotes: async (conversationId, silent = false) => {
    const targetConversationId = conversationId || get().selectedConversationId;

    if (!targetConversationId) {
      set({ notes: [], loadingNotes: false });
      return;
    }

    if (!silent) set({ loadingNotes: true, error: null });
    else set({ error: null });

    const notesRes = await supabase
      .from("conversation_notes")
      .select("*")
      .eq("conversation_id", targetConversationId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (notesRes.error) {
      set({ loadingNotes: false, error: normalizeError(notesRes.error) });
      return;
    }

    set({
      loadingNotes: false,
      notes: (notesRes.data || []) as ConversationNote[]
    });
  },

  createConversation: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const { currentProfile, aiPersonas } = get();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return null;
    }

    if (!cleanText(draft.contacto_nombre) && !cleanText(draft.telefono) && !cleanText(draft.email)) {
      set({ saving: false, error: "Ingresá al menos nombre, teléfono o email." });
      return null;
    }

    if (draft.channel === "whatsapp" && !cleanText(draft.telefono)) {
      set({ saving: false, error: "Para WhatsApp necesitás cargar un teléfono." });
      return null;
    }

    const now = getNowIso();

    const displayName =
      cleanText(draft.contacto_nombre) ||
      normalizePhoneForDisplay(draft.telefono) ||
      cleanText(draft.email) ||
      "Nueva conversación";

    const initialMessage = cleanText(draft.initial_message);
    const isWhatsApp = draft.channel === "whatsapp";

    const customerPersona =
      aiPersonas.find((persona) => persona.code === "customer_assistant" && persona.active) ||
      aiPersonas.find((persona) => persona.active) ||
      null;

    const insertRes = await supabase
      .from("conversations")
      .insert({
        channel: draft.channel,
        subject: nullableText(draft.subject) || displayName,
        titulo: displayName,
        contacto_nombre: nullableText(draft.contacto_nombre),
        telefono: draft.telefono ? normalizePhoneForDisplay(draft.telefono) : null,
        email: nullableText(draft.email),
      assigned_to: isWhatsApp ? null : draft.assigned_to || currentUserId,
sucursal_id: draft.sucursal_id || currentProfile?.sucursal_id || null,
status: "ABIERTA",
estado_gestion: isWhatsApp ? "EN_ATENCION_IA" : draft.estado_gestion || "EN_GESTION",
        estado_comercial: draft.estado_comercial || "NUEVO",
        prioridad: draft.prioridad || "NORMAL",
        categoria: nullableText(draft.categoria),
        unread_count: 0,
        last_message: isWhatsApp ? null : initialMessage || null,
        last_message_time: isWhatsApp ? null : initialMessage ? now : null,
        mostrar_agente: true,
        archived: false,
        deleted: false,

      customer_ai_persona_id: customerPersona?.id || null,
customer_ai_enabled: isWhatsApp,
customer_ai_mode: isWhatsApp ? "AUTOMATICA" : "APAGADA",
customer_ai_status: isWhatsApp ? "ACTIVA" : "INACTIVA",
customer_ai_handoff_status: "NO_DERIVADA",

        metadata: {
          source: "electron",
          customer_ai_created_ready: Boolean(customerPersona?.id),
          customer_ai_persona_code: customerPersona?.code || null
        },
        created_by: currentUserId
      })
      .select("id")
      .single();

    if (insertRes.error) {
      set({ saving: false, error: normalizeError(insertRes.error) });
      return null;
    }

    const conversationId = insertRes.data.id as string;

    if (initialMessage && !isWhatsApp) {
      const messageRes = await supabase.from("messages").insert({
        conversation_id: conversationId,
        channel: draft.channel,
        direction: "outbound",
        sender_type: "agent",
        sender_id: currentUserId,
        sender_name: getProfileName(currentProfile),
        content: initialMessage,
        message_type: "text",
        status: "sent",
        is_internal: draft.channel === "interno",
        created_by: currentUserId
      });

      if (messageRes.error) {
        set({ saving: false, error: normalizeError(messageRes.error) });
        return null;
      }
    }

    await get().loadComunicaciones(true);
    get().selectConversation(conversationId);

    set({ saving: false });

    return conversationId;
  },

  sendMessage: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const { currentProfile } = get();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    const conversation = get().conversations.find((item) => item.id === draft.conversation_id);

    if (!conversation) {
      set({ saving: false, error: "No se encontró la conversación." });
      return false;
    }

    const content = cleanText(draft.content);
    const isNiaInternalChat = isAiInternalConversation(conversation);
    const isInternal = Boolean(draft.is_internal);
    const isWhatsApp = conversation.channel === "whatsapp" && !isInternal && !isNiaInternalChat;
    const isTemplateMessage = Boolean(draft.template_name);
    const whatsappWindowOpen = isWhatsApp ? isWindowOpen(conversation) : true;

    if (!conversation.can_write && !isInternal) {
      set({
        saving: false,
        error: "No podés escribir en esta conversación. Primero debe ser tomada o asignada."
      });

      return false;
    }

    if (isWhatsApp && !whatsappWindowOpen && !isTemplateMessage) {
      set({
        saving: false,
        error:
          "La ventana de 24 horas está cerrada. Para iniciar o retomar la conversación por WhatsApp tenés que enviar una plantilla aprobada de Meta."
      });

      return false;
    }

    if (!content && !draft.media_file && !draft.media_url && !draft.template_name) {
      set({ saving: false, error: "El mensaje está vacío." });
      return false;
    }

    let mediaUrl = draft.media_url || null;
    let mediaPath: string | null = null;
    let mediaFilename = draft.media_filename || null;
    let mediaMimeType = draft.media_mime_type || null;
    let mediaSize = draft.media_size || null;
    let messageType = draft.message_type || "text";

    if (draft.media_file) {
      set({ uploading: true });

      const file = draft.media_file;
      const extension = file.name.split(".").pop() || "bin";
      const storagePath = `comunicaciones/${draft.conversation_id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const uploadRes = await supabase.storage.from("comunicaciones-media").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      });

      if (uploadRes.error) {
        set({ saving: false, uploading: false, error: normalizeError(uploadRes.error) });
        return false;
      }

      const publicRes = supabase.storage.from("comunicaciones-media").getPublicUrl(storagePath);

      mediaUrl = publicRes.data.publicUrl;
      mediaPath = storagePath;
      mediaFilename = file.name;
      mediaMimeType = file.type || null;
      mediaSize = file.size;
      messageType = getMessageTypeFromFile(file);

      set({ uploading: false });
    }

    if (isInternal) messageType = "internal";
    if (draft.template_name) messageType = "template";

    const now = getNowIso();
    const preview = getMessagePreview(draft);

    const localInsertRes = await supabase
      .from("messages")
      .insert({
        conversation_id: draft.conversation_id,
        channel: isNiaInternalChat ? "interno" : conversation.channel,
        direction: isInternal ? "internal" : "outbound",
        sender_type: isInternal ? "internal" : "agent",
        sender_id: currentUserId,
        sender_name: getProfileName(currentProfile),
        content: content || preview,
        message_type: messageType,
        media_url: mediaUrl,
        media_path: mediaPath,
        media_filename: mediaFilename,
        media_mime_type: mediaMimeType,
        media_size: mediaSize,
        reply_to_id: draft.reply_to_id || null,
        status: isWhatsApp ? "pending" : "sent",
        is_internal: isInternal,
        metadata: {
          source: isNiaInternalChat ? "nia_internal_chat_user" : "electron",
          system_ai_chat: isNiaInternalChat,
          template_language: draft.template_language,
          template_variables: draft.template_variables || [],
          reply_to_whatsapp_message_id: draft.reply_to_whatsapp_message_id || null
        },
        created_by: currentUserId,
        created_at: now
      })
      .select("id")
      .single();

    if (localInsertRes.error) {
      set({ saving: false, uploading: false, error: normalizeError(localInsertRes.error) });
      return false;
    }

    const localMessageId = localInsertRes.data.id as string;

    const conversationPatch: Record<string, unknown> = {
      last_message: isInternal ? `[Interno] ${content || preview}` : content || preview,
      last_message_time: now,
      last_outbound_message_at: isInternal ? conversation.last_outbound_message_at || null : now,
      estado_gestion: isInternal ? conversation.estado_gestion : "ESPERA_CLIENTE",
      updated_at: now
    };

    if (!isInternal && !isNiaInternalChat) {
      conversationPatch.customer_ai_status = "PAUSADA";
      conversationPatch.customer_ai_paused_until = null;
      conversationPatch.customer_ai_last_agent_message_at = now;
    }

    await supabase.from("conversations").update(conversationPatch).eq("id", draft.conversation_id);

    await Promise.all([get().loadMessages(draft.conversation_id, true), get().loadComunicaciones(true)]);

    if (isNiaInternalChat) {
      set({ saving: false });

      void get().replyFromNiaInternalChat(conversation, content || preview, localMessageId);

      return true;
    }

    if (!isWhatsApp) {
      set({ saving: false });
      return true;
    }

    const phone = normalizePhoneForDisplay(conversation.telefono);

    if (!phone) {
      await supabase
        .from("messages")
        .update({
          status: "failed",
          wa_error_code: "missing_phone",
          wa_error_message: "La conversación no tiene teléfono."
        })
        .eq("id", localMessageId);

      await get().loadMessages(draft.conversation_id, true);

      set({ saving: false, error: "La conversación no tiene teléfono." });

      return false;
    }

    try {
      const invokeRes = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          conversation_id: draft.conversation_id,
          local_message_id: localMessageId,
          to: phone,
          content: content || preview,
          text: content || preview,
          message_type: messageType,
          media_url: mediaUrl,
          media_filename: mediaFilename,
          template_name: draft.template_name,
          template_language: draft.template_language || "es_AR",
          template_variables: draft.template_variables || [],
          reply_to_message_id: draft.reply_to_whatsapp_message_id || draft.reply_to_id || null
        }
      });

      if (invokeRes.error) {
        const errorMessage = normalizeError(invokeRes.error);

        await supabase
          .from("messages")
          .update({
            status: "failed",
            wa_error_message: errorMessage,
            metadata: {
              source: "electron",
              local_fallback: true,
              whatsapp_invoke_failed: true,
              template_language: draft.template_language,
              template_variables: draft.template_variables || []
            }
          })
          .eq("id", localMessageId);

        await get().loadMessages(draft.conversation_id, true);

        set({ saving: false, error: errorMessage });

        return false;
      }

      const response = invokeRes.data as {
        ok?: boolean;
        success?: boolean;
        whatsapp_message_id?: string | null;
        wa_error_code?: string | null;
        wa_error_message?: string | null;
        error?: string | null;
      } | null;

      if (!response?.ok && !response?.success) {
        const errorMessage = response?.wa_error_message || response?.error || "WhatsApp rechazó el envío.";

        await supabase
          .from("messages")
          .update({
            status: "failed",
            wa_error_code: response?.wa_error_code || null,
            wa_error_message: errorMessage,
            metadata: {
              source: "electron",
              local_fallback: true,
              whatsapp_response_failed: true,
              whatsapp_response: response,
              template_language: draft.template_language,
              template_variables: draft.template_variables || []
            }
          })
          .eq("id", localMessageId);

        await get().loadMessages(draft.conversation_id, true);

        set({ saving: false, error: errorMessage });

        return false;
      }

      await supabase
        .from("messages")
        .update({
          status: "sent",
          whatsapp_message_id: response.whatsapp_message_id || null,
          wa_error_code: null,
          wa_error_message: null,
          metadata: {
            source: "electron",
            whatsapp_response: response,
            template_language: draft.template_language,
            template_variables: draft.template_variables || []
          }
        })
        .eq("id", localMessageId);

      await get().loadMessages(draft.conversation_id, true);

      set({ saving: false });

      return true;
    } catch (error) {
      const errorMessage = normalizeError(error);

      await supabase
        .from("messages")
        .update({
          status: "failed",
          wa_error_message: errorMessage,
          metadata: {
            source: "electron",
            local_fallback: true,
            whatsapp_exception: true,
            template_language: draft.template_language,
            template_variables: draft.template_variables || []
          }
        })
        .eq("id", localMessageId);

      await get().loadMessages(draft.conversation_id, true);

      set({ saving: false, error: errorMessage });

      return false;
    }
  },

  addNote: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    if (!cleanText(draft.note)) {
      set({ saving: false, error: "La nota está vacía." });
      return false;
    }

    const tipo = draft.tipo || "NOTA_INTERNA";
    const targetType = draft.target_type || (tipo === "MENSAJE_CLIENTE_PROGRAMADO" ? "CLIENTE" : "INTERNO");
    const scheduledAt = draft.scheduled_at || null;

    const { error } = await supabase.from("conversation_notes").insert({
      conversation_id: draft.conversation_id,
      note: cleanText(draft.note),
      tipo,
      target_type: targetType,
      scheduled_at: scheduledAt,
      status: scheduledAt ? "PROGRAMADA" : "ACTIVA",
      message_template_id: draft.message_template_id || null,
      template_variables: draft.template_variables || [],
      created_by: currentUserId
    });

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadNotes(draft.conversation_id, true);

    set({ saving: false });

    return true;
  },

  deleteNote: async (noteId) => {
    set({ saving: true, error: null });

    const note = get().notes.find((item) => item.id === noteId);

    if (!note) {
      set({ saving: false, error: "No se encontró la nota." });
      return false;
    }

    const { error } = await supabase.from("conversation_notes").delete().eq("id", noteId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadNotes(note.conversation_id, true);

    set({ saving: false });

    return true;
  },

  updateConversation: async (draft) => {
    set({ saving: true, error: null });

    const conversation = get().conversations.find((item) => item.id === draft.id);

    if (!conversation) {
      set({ saving: false, error: "No se encontró la conversación." });
      return false;
    }

    const payload: Record<string, unknown> = { updated_at: getNowIso() };

    const allowedKeys: Array<keyof UpdateConversationDraft> = [
      "assigned_to",
      "sucursal_id",
      "estado_comercial",
      "estado_gestion",
      "prioridad",
      "categoria",
      "etapa_comercial",
      "mostrar_agente",
      "contacto_nombre",
      "telefono",
      "email",
      "subject",
      "titulo",
      "customer_ai_persona_id",
      "customer_ai_enabled",
      "customer_ai_mode",
      "customer_ai_status",
      "customer_ai_paused_until",
      "customer_ai_handoff_status",
      "customer_ai_handoff_reason"
    ];

    allowedKeys.forEach((key) => {
      if (draft[key] !== undefined) {
        payload[key] = draft[key] === "" ? null : draft[key];
      }
    });

    if (typeof payload.telefono === "string" && payload.telefono) {
      payload.telefono = normalizePhoneForDisplay(payload.telefono);
    }

    if (payload.customer_ai_mode === "APAGADA") {
      payload.customer_ai_enabled = false;
      payload.customer_ai_status = "INACTIVA";
    }

    if (payload.customer_ai_mode === "SUGERIDA") {
      payload.customer_ai_enabled = true;
      payload.customer_ai_status = "OBSERVANDO";
    }

    if (payload.customer_ai_mode === "AUTOMATICA") {
      payload.customer_ai_enabled = true;
      payload.customer_ai_status = "RESPONDIENDO";
    }

    const { error } = await supabase.from("conversations").update(payload).eq("id", draft.id);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    const contactoSync = await syncContactoFromConversationPatch(conversation, draft);

    if (!contactoSync.ok) {
      set({
        saving: false,
        error: contactoSync.message || "La conversación se actualizó, pero no se pudo sincronizar el contacto."
      });

      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

 takeConversation: async (conversationId) => {
  set({ saving: true, error: null });

  const conversation = get().conversations.find((item) => item.id === conversationId);

  const { error } = await supabase.rpc("take_conversation", {
    p_conversation_id: conversationId
  });

  if (error) {
    set({ saving: false, error: normalizeError(error) });
    return false;
  }

  const handoffStatus = String(conversation?.customer_ai_handoff_status || "").toUpperCase();
  const aiStatus = String(conversation?.customer_ai_status || "").toUpperCase();
  const estadoGestion = String(conversation?.estado_gestion || "").toUpperCase();
  const inboxFolder = String(conversation?.inbox_folder || "").toUpperCase();

  const wasDerivedByCande =
    inboxFolder === "DERIVADO_NUEVO" ||
    estadoGestion === "DERIVADO_NUEVO" ||
    aiStatus === "DERIVADA" ||
    handoffStatus === "DERIVADA_A_BANDEJA" ||
    handoffStatus === "LISTA_PARA_DERIVAR";

  if (wasDerivedByCande) {
    const ok = await get().takeCustomerAiHandoff(conversationId);

    if (!ok) {
      set({ saving: false });
      return false;
    }

    set({ saving: false });
    return true;
  }

  await get().loadComunicaciones(true);

  get().selectConversation(conversationId);

  set({ saving: false });

  return true;
},

  transferConversation: async (conversationId, targetProfileId, note = "") => {
    set({ saving: true, error: null });

    const { error } = await supabase.rpc("transfer_conversation", {
      p_conversation_id: conversationId,
      p_target_profile_id: targetProfileId,
      p_note: note
    });

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  addCollaborator: async (conversationId, profileId) => {
    set({ saving: true, error: null });

    const { error } = await supabase.rpc("add_conversation_collaborator", {
      p_conversation_id: conversationId,
      p_profile_id: profileId
    });

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  removeCollaborator: async (conversationId, profileId) => {
    set({ saving: true, error: null });

    const { error } = await supabase.rpc("remove_conversation_collaborator", {
      p_conversation_id: conversationId,
      p_profile_id: profileId
    });

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  archiveConversation: async (conversationId) => {
    set({ saving: true, error: null });

    const { error } = await supabase
      .from("conversations")
      .update({
        archived: true,
        archived_at: getNowIso(),
        status: "ARCHIVADA",
        updated_at: getNowIso()
      })
      .eq("id", conversationId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  trashConversation: async (conversationId) => {
    set({ saving: true, error: null });

    const { error } = await supabase
      .from("conversations")
      .update({
        deleted: true,
        deleted_at: getNowIso(),
        status: "ELIMINADA",
        updated_at: getNowIso()
      })
      .eq("id", conversationId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  restoreConversation: async (conversationId) => {
    set({ saving: true, error: null });

    const { error } = await supabase
      .from("conversations")
      .update({
        archived: false,
        archived_at: null,
        deleted: false,
        deleted_at: null,
        status: "ABIERTA",
        updated_at: getNowIso()
      })
      .eq("id", conversationId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  closeConversation: async (conversationId) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();

    const { error } = await supabase
      .from("conversations")
      .update({
        status: "CERRADA",
        estado_gestion: "CERRADA",
        closed_at: getNowIso(),
        closed_by: currentUserId,
        customer_ai_status: "INACTIVA",
        updated_at: getNowIso()
      })
      .eq("id", conversationId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  reopenConversation: async (conversationId) => {
    set({ saving: true, error: null });

    const conversation = get().conversations.find((item) => item.id === conversationId);
    const nextCustomerAiStatus =
      conversation?.customer_ai_mode === "AUTOMATICA"
        ? "RESPONDIENDO"
        : conversation?.customer_ai_mode === "SUGERIDA"
          ? "OBSERVANDO"
          : "INACTIVA";

    const { error } = await supabase
      .from("conversations")
      .update({
        status: "ABIERTA",
        estado_gestion: "EN_GESTION",
        closed_at: null,
        closed_by: null,
        customer_ai_status: nextCustomerAiStatus,
        updated_at: getNowIso()
      })
      .eq("id", conversationId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  joinConversation: async (conversationId) => get().takeConversation(conversationId),

  toggleTag: async (conversationId, tagId) => {
    set({ saving: true, error: null });

    const existingRes = await supabase
      .from("conversation_tag_links")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("tag_id", tagId)
      .maybeSingle();

    if (existingRes.error) {
      set({ saving: false, error: normalizeError(existingRes.error) });
      return false;
    }

    if (existingRes.data?.id) {
      const { error } = await supabase.from("conversation_tag_links").delete().eq("id", existingRes.data.id);

      if (error) {
        set({ saving: false, error: normalizeError(error) });
        return false;
      }
    } else {
      const { error } = await supabase.from("conversation_tag_links").insert({
        conversation_id: conversationId,
        tag_id: tagId
      });

      if (error) {
        set({ saving: false, error: normalizeError(error) });
        return false;
      }
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return true;
  },

  deleteMessage: async (messageId) => {
    set({ saving: true, error: null });

    const { error } = await supabase
      .from("messages")
      .update({
        deleted_at: getNowIso(),
        status: "deleted"
      })
      .eq("id", messageId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    const conversationId = get().messages.find((item) => item.id === messageId)?.conversation_id;

    if (conversationId) {
      await get().loadMessages(conversationId, true);
    }

    set({ saving: false });

    return true;
  },

  deleteMessageLocal: async (messageId) => get().deleteMessage(messageId),

  reactToMessage: async (messageId, emoji) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const message = get().messages.find((item) => item.id === messageId);

    if (!message) {
      set({ saving: false, error: "No se encontró el mensaje." });
      return false;
    }

    const existingReactions = message.message_reactions || message.reactions || [];
    const userName = getProfileName(get().currentProfile);

    const nextReactions = [
      ...existingReactions.filter((item) => item.user_id !== currentUserId),
      {
        id: `${currentUserId || "user"}-${Date.now()}`,
        emoji,
        user_id: currentUserId,
        user_name: userName,
        sender_name: userName,
        created_at: getNowIso()
      }
    ];

    const { error } = await supabase
      .from("messages")
      .update({
        reactions: nextReactions,
        metadata: mergeMetadata(message.metadata, {
          message_reactions: nextReactions,
          last_reaction_emoji: emoji,
          last_reaction_at: getNowIso()
        })
      })
      .eq("id", messageId);

    if (error) {
      set({ saving: false, error: normalizeError(error) });
      return false;
    }

    await get().loadMessages(message.conversation_id, true);

    set({ saving: false });

    return true;
  },

  forwardMessage: async (draftOrSourceMessageId, targetConversationId) => {
    const draft: ForwardMessageDraft =
      typeof draftOrSourceMessageId === "string"
        ? {
            source_message_id: draftOrSourceMessageId,
            target_conversation_id: targetConversationId || ""
          }
        : draftOrSourceMessageId;

    if (!draft.target_conversation_id) {
      set({ error: "Seleccioná una conversación de destino." });
      return false;
    }

    const sourceMessage = get().messages.find((item) => item.id === draft.source_message_id);

    if (!sourceMessage) {
      set({ error: "No se encontró el mensaje a reenviar." });
      return false;
    }

    const caption = cleanText(draft.caption);
    const content = caption || sourceMessage.content || sourceMessage.media_filename || "Mensaje reenviado";

    return get().sendMessage({
      conversation_id: draft.target_conversation_id,
      content,
      message_type: sourceMessage.media_url ? undefined : "text",
      media_url: sourceMessage.media_url,
      media_filename: sourceMessage.media_filename,
      media_mime_type: sourceMessage.media_mime_type,
      media_size: sourceMessage.media_size,
      is_internal: false
    });
  },

  syncConversationToContacto: async (conversationId) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();
    const { currentProfile } = get();

    if (!currentUserId || !currentProfile) {
      set({ saving: false, error: "No hay usuario autenticado." });

      return {
        ok: false,
        contactoId: null,
        created: false,
        message: "No hay usuario autenticado."
      };
    }

    const conversation = get().conversations.find((item) => item.id === conversationId);

    if (!conversation) {
      set({ saving: false, error: "No se encontró la conversación." });

      return {
        ok: false,
        contactoId: null,
        created: false,
        message: "No se encontró la conversación."
      };
    }

    const nombreContacto = cleanText(
      conversation.contacto_nombre ||
        conversation.titulo ||
        conversation.subject ||
        conversation.telefono ||
        "Contacto WhatsApp"
    );

    const telefono = normalizePhoneForDisplay(conversation.telefono);
    const telefonoLookup = normalizePhoneForLookup(telefono);

    if (!telefonoLookup && !nombreContacto) {
      set({ saving: false, error: "La conversación no tiene teléfono ni nombre para crear contacto." });

      return {
        ok: false,
        contactoId: null,
        created: false,
        message: "La conversación no tiene teléfono ni nombre para crear contacto."
      };
    }

    const vendedorId = conversation.assigned_to || currentUserId;
    const vendedorNombre = conversation.assigned_full_name || getProfileName(currentProfile) || "Sin vendedor";
    const sucursalId = conversation.sucursal_id || currentProfile.sucursal_id || null;
    const estadoContacto = mapEstadoComercialToContactoEstado(conversation.estado_comercial);

    const observaciones = [
      "Contacto creado/vinculado desde Comunicaciones WhatsApp.",
      conversation.subject ? `Asunto: ${conversation.subject}` : "",
      conversation.last_message ? `Último mensaje: ${conversation.last_message}` : "",
      conversation.estado_comercial
        ? `Estado comercial: ${getComunicacionEstadoComercialLabel(conversation.estado_comercial)}`
        : "",
      conversation.estado_gestion
        ? `Estado gestión: ${getComunicacionEstadoGestionLabel(conversation.estado_gestion)}`
        : "",
      conversation.customer_ai_mode
        ? `IA pasajeros: ${conversation.customer_ai_mode} / ${conversation.customer_ai_status || "sin estado"}`
        : ""
    ]
      .filter(Boolean)
      .join("\n");

    const contactosRes = await supabase
      .from("contactos")
      .select("id, telefono, observaciones")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (contactosRes.error) {
      const message = normalizeError(contactosRes.error);

      set({ saving: false, error: message });

      return {
        ok: false,
        contactoId: null,
        created: false,
        message
      };
    }

    const contactoExistente = ((contactosRes.data || []) as Array<{
      id: string;
      telefono: string | null;
      observaciones: string | null;
    }>).find((contacto) => {
      const contactoPhone = normalizePhoneForLookup(contacto.telefono);
      return Boolean(telefonoLookup && contactoPhone && contactoPhone === telefonoLookup);
    });

    if (contactoExistente) {
      const nextObservaciones = contactoExistente.observaciones
        ? `${contactoExistente.observaciones}\n\n${observaciones}`
        : observaciones;

      const updateContactoRes = await supabase
        .from("contactos")
        .update({
          nombre_completo: nombreContacto,
          telefono,
          origen: "whatsapp",
          estado: estadoContacto,
          activo: true,
          vendedor: vendedorNombre,
          vendedor_id: vendedorId,
          sucursal_id: sucursalId,
          observaciones: nextObservaciones
        })
        .eq("id", contactoExistente.id);

      if (updateContactoRes.error) {
        const message = normalizeError(updateContactoRes.error);

        set({ saving: false, error: message });

        return {
          ok: false,
          contactoId: null,
          created: false,
          message
        };
      }

      const updateConversationRes = await supabase
        .from("conversations")
        .update({
          contacto_id: contactoExistente.id,
          updated_at: getNowIso(),
          metadata: mergeMetadata(conversation.metadata, {
            contacto_sync_source: "comunicaciones",
            contacto_sync_at: getNowIso(),
            contacto_sync_status: "linked_existing"
          })
        })
        .eq("id", conversation.id);

      if (updateConversationRes.error) {
        const message = normalizeError(updateConversationRes.error);

        set({ saving: false, error: message });

        return {
          ok: false,
          contactoId: contactoExistente.id,
          created: false,
          message
        };
      }

      await get().loadComunicaciones(true);

      set({ saving: false });

      return {
        ok: true,
        contactoId: contactoExistente.id,
        created: false,
        message: "Conversación vinculada a un contacto existente."
      };
    }

    const insertContactoRes = await supabase
      .from("contactos")
      .insert({
        nombre_completo: nombreContacto,
        telefono,
        origen: "whatsapp",
        destinos: null,
        adultos: 1,
        menores: 0,
        edad_menores: null,
        fecha_viaje: null,
        fecha_viaje_out: null,
        solo_ida: false,
        observaciones,
        estado: estadoContacto,
        activo: true,
        vendedor: vendedorNombre,
        vendedor_id: vendedorId,
        sucursal_id: sucursalId
      })
      .select("id")
      .single();

    if (insertContactoRes.error) {
      const message = normalizeError(insertContactoRes.error);

      set({ saving: false, error: message });

      return {
        ok: false,
        contactoId: null,
        created: false,
        message
      };
    }

    const contactoId = insertContactoRes.data.id as string;

    const updateConversationRes = await supabase
      .from("conversations")
      .update({
        contacto_id: contactoId,
        updated_at: getNowIso(),
        metadata: mergeMetadata(conversation.metadata, {
          contacto_sync_source: "comunicaciones",
          contacto_sync_at: getNowIso(),
          contacto_sync_status: "created"
        })
      })
      .eq("id", conversation.id);

    if (updateConversationRes.error) {
      const message = normalizeError(updateConversationRes.error);

      set({ saving: false, error: message });

      return {
        ok: false,
        contactoId,
        created: true,
        message
      };
    }

    await get().loadComunicaciones(true);

    set({ saving: false });

    return {
      ok: true,
      contactoId,
      created: true,
      message: "Contacto creado correctamente desde la conversación."
    };
  },

    loadConversationAiAnalysis: async (conversationId) => {
    if (!conversationId) return null;

    const cached = get().aiAnalysisByConversationId[conversationId];

    if (cached) return cached;

    const analysisRes = await supabase
      .from("conversation_ai_events")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("event_type", "ANALISIS")
      .eq("event_status", "OK")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisRes.error) {
      set({ error: normalizeError(analysisRes.error) });
      return null;
    }

    if (!analysisRes.data) return null;

    const analysis = normalizeAiAnalysis(conversationId, analysisRes.data);

    set((state) => ({
      aiAnalysisByConversationId: {
        ...state.aiAnalysisByConversationId,
        [conversationId]: analysis
      }
    }));

    return analysis;
  },

  analyzeConversationAi: async (conversationId, force = true) => {
    set({ analyzingAi: true, error: null });

    if (!conversationId) {
      set({ analyzingAi: false, error: "Seleccioná una conversación para analizar." });
      return null;
    }

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ analyzingAi: false, error: "No hay usuario autenticado." });
      return null;
    }

    const conversation = get().conversations.find((item) => item.id === conversationId);

    if (!conversation) {
      set({ analyzingAi: false, error: "No se encontró la conversación." });
      return null;
    }

    if (!force) {
      const previous = await get().loadConversationAiAnalysis(conversationId);

      if (previous) {
        set({ analyzingAi: false });
        return previous;
      }
    }

    try {
      const invokeRes = await supabase.functions.invoke("analyze-conversation-ai", {
        body: {
          conversation_id: conversationId,
          force,
          source: "comunicaciones_panel"
        }
      });

      if (invokeRes.error) {
        const message = normalizeError(invokeRes.error);

        set({ analyzingAi: false, error: message });

        return null;
      }

      const analysis = normalizeAiAnalysis(conversationId, invokeRes.data);

      set((state) => ({
        analyzingAi: false,
        aiAnalysisByConversationId: {
          ...state.aiAnalysisByConversationId,
          [conversationId]: analysis
        }
      }));

      await supabase
        .from("conversations")
        .update({
          metadata: mergeMetadata(conversation.metadata, {
            ai_last_analysis_at: getNowIso(),
            ai_last_analysis_summary: analysis.resumen,
            ai_last_score_cliente: analysis.score_cliente,
            ai_last_priority: analysis.prioridad_sugerida,
            ai_last_estado_comercial: analysis.estado_comercial_sugerido,
            ai_last_estado_gestion: analysis.estado_gestion_sugerido
          }),
          updated_at: getNowIso()
        })
        .eq("id", conversationId);

      await Promise.all([
        get().loadConversationAiAnalysis(conversationId),
        get().loadContactAiProfiles(true),
        get().loadAiActionsLog(conversationId, true)
      ]);

      return analysis;
    } catch (error) {
      const message = normalizeError(error);

      set({ analyzingAi: false, error: message });

      return null;
    }
  },

  loadContactAiProfiles: async (silent = false) => {
    if (!silent) set({ loadingAiProfiles: true, error: null });
    else set({ error: null });

    const profilesRes = await supabase
      .from("contact_ai_profiles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1000);

    if (profilesRes.error) {
      set({ loadingAiProfiles: false, error: normalizeError(profilesRes.error) });
      return;
    }

    set({
      loadingAiProfiles: false,
      contactAiProfiles: ((profilesRes.data || []) as Record<string, unknown>[]).map(normalizeContactAiProfile)
    });
  },

  loadAiActionsLog: async (conversationId = null, silent = false) => {
    if (!silent) set({ loadingAiActions: true, error: null });
    else set({ error: null });

    let query = supabase
      .from("ai_actions_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const logRes = await query;

    if (logRes.error) {
      set({ loadingAiActions: false, error: normalizeError(logRes.error) });
      return;
    }

    set({
      loadingAiActions: false,
      aiActionsLog: ((logRes.data || []) as Record<string, unknown>[]).map(normalizeAiActionLog)
    });
  },

  loadAssistantThreads: async (silent = false) => {
    if (!silent) set({ loadingAssistant: true, error: null });
    else set({ error: null });

    const threadsRes = await supabase
      .from("ai_assistant_threads")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200);

    if (threadsRes.error) {
      set({ loadingAssistant: false, error: normalizeError(threadsRes.error) });
      return;
    }

    const threads = ((threadsRes.data || []) as Record<string, unknown>[]).map(normalizeAssistantThread);
    const selectedAssistantThreadId = get().selectedAssistantThreadId;

    const nextSelectedThreadId =
      selectedAssistantThreadId && threads.some((thread) => thread.id === selectedAssistantThreadId)
        ? selectedAssistantThreadId
        : threads[0]?.id || null;

    set({
      loadingAssistant: false,
      assistantThreads: threads,
      selectedAssistantThreadId: nextSelectedThreadId
    });

    if (nextSelectedThreadId) {
      void get().loadAssistantMessages(nextSelectedThreadId, true);
    }
  },

  loadAssistantMessages: async (threadId = null, silent = false) => {
    const targetThreadId = threadId || get().selectedAssistantThreadId;

    if (!targetThreadId) {
      set({ assistantMessages: [], loadingAssistant: false });
      return;
    }

    if (!silent) set({ loadingAssistant: true, error: null });
    else set({ error: null });

    const messagesRes = await supabase
      .from("ai_assistant_messages")
      .select("*")
      .eq("thread_id", targetThreadId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messagesRes.error) {
      set({ loadingAssistant: false, error: normalizeError(messagesRes.error) });
      return;
    }

    set({
      loadingAssistant: false,
      assistantMessages: ((messagesRes.data || []) as Record<string, unknown>[]).map(normalizeAssistantMessage)
    });
  },

  createAssistantThread: async (draft) => {
    set({ loadingAssistant: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ loadingAssistant: false, error: "No hay usuario autenticado." });
      return null;
    }

    const insertRes = await supabase
      .from("ai_assistant_threads")
      .insert({
        title: cleanText(draft.title) || "Conversación con Asistente Comercial",
        conversation_id: draft.conversation_id || null,
        contacto_id: draft.contacto_id || null,
        cliente_id: draft.cliente_id || null,
        contact_ai_profile_id: draft.contact_ai_profile_id || null,
        owner_id: currentUserId,
        thread_type: draft.thread_type || "GENERAL",
        status: "ABIERTA",
        metadata: draft.metadata || {},
        created_by: currentUserId,
        updated_by: currentUserId
      })
      .select("id")
      .single();

    if (insertRes.error) {
      set({ loadingAssistant: false, error: normalizeError(insertRes.error) });
      return null;
    }

    const threadId = insertRes.data.id as string;

    await get().loadAssistantThreads(true);

    set({
      selectedAssistantThreadId: threadId,
      loadingAssistant: false
    });

    return threadId;
  },

  selectAssistantThread: (threadId) => {
    set({ selectedAssistantThreadId: threadId });

    if (threadId) {
      void get().loadAssistantMessages(threadId, false);
    } else {
      set({ assistantMessages: [] });
    }
  },

  sendAssistantMessage: async (draft) => {
    set({ loadingAssistant: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ loadingAssistant: false, error: "No hay usuario autenticado." });
      return false;
    }

    const cleanContent = cleanText(draft.content);

    if (!cleanContent && !cleanText(draft.audio_transcript)) {
      set({ loadingAssistant: false, error: "El mensaje para la IA está vacío." });
      return false;
    }

    let threadId = draft.thread_id || get().selectedAssistantThreadId;

    if (!threadId) {
      threadId = await get().createAssistantThread({
        title: draft.title || "Chat con Asistente Comercial",
        conversation_id: draft.conversation_id || null,
        contacto_id: draft.contacto_id || null,
        cliente_id: draft.cliente_id || null,
        contact_ai_profile_id: draft.contact_ai_profile_id || null,
        thread_type: "GENERAL",
        metadata: draft.metadata || {}
      });
    }

    if (!threadId) {
      set({ loadingAssistant: false, error: "No se pudo crear el hilo con la IA." });
      return false;
    }

    const userInsertRes = await supabase.from("ai_assistant_messages").insert({
      thread_id: threadId,
      conversation_id: draft.conversation_id || null,
      contacto_id: draft.contacto_id || null,
      contact_ai_profile_id: draft.contact_ai_profile_id || null,
      role: "user",
      content: cleanContent || cleanText(draft.audio_transcript),
      audio_url: draft.audio_url || null,
      audio_transcript: draft.audio_transcript || null,
      metadata: draft.metadata || {},
      created_by: currentUserId
    });

    if (userInsertRes.error) {
      set({ loadingAssistant: false, error: normalizeError(userInsertRes.error) });
      return false;
    }

    await get().loadAssistantMessages(threadId, true);

    try {
      const invokeRes = await supabase.functions.invoke("commercial-assistant-chat", {
        body: {
          thread_id: threadId,
          message: cleanContent || cleanText(draft.audio_transcript),
          conversation_id: draft.conversation_id || null,
          contacto_id: draft.contacto_id || null,
          cliente_id: draft.cliente_id || null,
          contact_ai_profile_id: draft.contact_ai_profile_id || null,
          source: "asistente_comercial"
        }
      });

      if (invokeRes.error) {
        const message = normalizeError(invokeRes.error);

        await supabase.from("ai_assistant_messages").insert({
          thread_id: threadId,
          conversation_id: draft.conversation_id || null,
          contacto_id: draft.contacto_id || null,
          contact_ai_profile_id: draft.contact_ai_profile_id || null,
          role: "assistant",
          content: `No pude responder en este momento. Error: ${message}`,
          metadata: {
            error: true,
            source: "commercial-assistant-chat"
          },
          created_by: currentUserId
        });

        await get().loadAssistantMessages(threadId, true);

        set({ loadingAssistant: false, error: message });

        return false;
      }

      const response = invokeRes.data as Record<string, unknown> | null;
      const assistantContent = extractAssistantAnswer(response);

      if (!assistantContent) {
        await get().loadAssistantMessages(threadId, true);

        set({
          loadingAssistant: false,
          error: null
        });

        return false;
      }

      await supabase.from("ai_assistant_messages").insert({
        thread_id: threadId,
        conversation_id: draft.conversation_id || null,
        contacto_id: draft.contacto_id || null,
        contact_ai_profile_id: draft.contact_ai_profile_id || null,
        role: "assistant",
        content: assistantContent,
        metadata: {
          source: "commercial-assistant-chat",
          ok: response?.ok ?? true,
          raw_response: response || null,
          response_metadata: response && typeof response.metadata === "object" ? response.metadata : {}
        },
        created_by: currentUserId
      });

      await supabase
        .from("ai_assistant_threads")
        .update({
          updated_at: getNowIso(),
          updated_by: currentUserId
        })
        .eq("id", threadId);

      await Promise.all([get().loadAssistantMessages(threadId, true), get().loadAssistantThreads(true)]);

      set({ loadingAssistant: false });

      return true;
    } catch (error) {
      const message = normalizeError(error);

      await supabase.from("ai_assistant_messages").insert({
        thread_id: threadId,
        conversation_id: draft.conversation_id || null,
        contacto_id: draft.contacto_id || null,
        contact_ai_profile_id: draft.contact_ai_profile_id || null,
        role: "assistant",
        content: `No pude responder en este momento. Error: ${message}`,
        metadata: {
          error: true,
          source: "commercial-assistant-chat"
        },
        created_by: currentUserId
      });

      await get().loadAssistantMessages(threadId, true);

      set({ loadingAssistant: false, error: message });

      return false;
    }
  },

  replyFromNiaInternalChat: async (conversation, userMessage, localUserMessageId) => {
    const currentUserId = await getCurrentUserId();

    const personaName = getAiPersonaDisplayName(conversation);
    const metadata = conversation.metadata || {};

    try {
      const invokeRes = await supabase.functions.invoke("commercial-assistant-chat", {
        body: {
          thread_id: null,
          message: userMessage,
          conversation_id: conversation.id,
          contacto_id: conversation.contacto_id || null,
          cliente_id: conversation.cliente_id || null,
          contact_ai_profile_id: metadata.contact_ai_profile_id || null,
          source: "nia_internal_chat",
          mode: "internal_ai_persona",
          metadata: {
            nia_chat: true,
            local_user_message_id: localUserMessageId,
            ai_persona_code: metadata.ai_persona_code || "commercial_assistant",
            ai_persona_name: personaName
          }
        }
      });

      if (invokeRes.error) {
        const errorMessage = normalizeError(invokeRes.error);

        await supabase.from("messages").insert({
          conversation_id: conversation.id,
          channel: "interno",
          direction: "system",
          sender_type: "system",
          sender_id: null,
          sender_name: personaName,
          content: `No pude responder en este momento. Error: ${errorMessage}`,
          message_type: "system",
          status: "sent",
          is_internal: true,
          metadata: {
            system_ai: true,
            ai_persona_code: metadata.ai_persona_code || "commercial_assistant",
            ai_persona_display_name: personaName,
            source: "nia_internal_chat",
            error: true,
            local_user_message_id: localUserMessageId
          },
          created_by: currentUserId
        });

        await Promise.all([get().loadMessages(conversation.id, true), get().loadComunicaciones(true)]);

        return false;
      }

      const response = invokeRes.data as Record<string, unknown> | null;
      const assistantContent = extractAssistantAnswer(response);

      if (!assistantContent) {
        await supabase.from("ai_actions_log").insert({
          conversation_id: conversation.id,
          contacto_id: conversation.contacto_id || null,
          cliente_id: conversation.cliente_id || null,
          contact_ai_profile_id:
            typeof metadata.contact_ai_profile_id === "string" ? metadata.contact_ai_profile_id : null,
          ai_event_id: null,
          action_type: "NIA_EMPTY_RESPONSE",
          action_title: "NIA no recibió respuesta útil de la Edge Function",
          action_detail: "commercial-assistant-chat respondió sin contenido visible para mostrar en el chat interno.",
          actor_type: "SYSTEM",
          actor_id: currentUserId,
          source: "nia_internal_chat",
          previous_value: null,
          new_value: null,
          metadata: {
            local_user_message_id: localUserMessageId,
            user_message: userMessage,
            raw_response: response || null
          },
          created_by: currentUserId
        });

        await Promise.all([get().loadMessages(conversation.id, true), get().loadComunicaciones(true)]);

        return false;
      }

      const now = getNowIso();

      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        channel: "interno",
        direction: "system",
        sender_type: "system",
        sender_id: null,
        sender_name: personaName,
        content: assistantContent,
        message_type: "system",
        status: "sent",
        is_internal: true,
        metadata: {
          system_ai: true,
          ai_persona_code: metadata.ai_persona_code || "commercial_assistant",
          ai_persona_display_name: personaName,
          source: "nia_internal_chat",
          local_user_message_id: localUserMessageId,
          response_metadata: response?.metadata || {}
        },
        created_by: currentUserId,
        created_at: now
      });

      await supabase
        .from("conversations")
        .update({
          last_message: assistantContent,
          last_message_time: now,
          updated_at: now
        })
        .eq("id", conversation.id);

      await Promise.all([get().loadMessages(conversation.id, true), get().loadComunicaciones(true)]);

      return true;
    } catch (error) {
      const errorMessage = normalizeError(error);

      await supabase.from("messages").insert({
        conversation_id: conversation.id,
        channel: "interno",
        direction: "system",
        sender_type: "system",
        sender_id: null,
        sender_name: personaName,
        content: `No pude responder en este momento. Error: ${errorMessage}`,
        message_type: "system",
        status: "sent",
        is_internal: true,
        metadata: {
          system_ai: true,
          ai_persona_code: metadata.ai_persona_code || "commercial_assistant",
          ai_persona_display_name: personaName,
          source: "nia_internal_chat",
          error: true,
          local_user_message_id: localUserMessageId
        },
        created_by: currentUserId
      });

      await Promise.all([get().loadMessages(conversation.id, true), get().loadComunicaciones(true)]);

      return false;
    }
  },

  logAiAction: async (draft) => {
    const currentUserId = await getCurrentUserId();

    const insertRes = await supabase.from("ai_actions_log").insert({
      conversation_id: draft.conversation_id || null,
      contacto_id: draft.contacto_id || null,
      cliente_id: draft.cliente_id || null,
      contact_ai_profile_id: draft.contact_ai_profile_id || null,
      ai_event_id: draft.ai_event_id || null,
      action_type: draft.action_type,
      action_title: draft.action_title,
      action_detail: draft.action_detail || null,
      actor_type: draft.actor_type || "USER",
      actor_id: draft.actor_id || currentUserId,
      source: draft.source || "frontend",
      previous_value: draft.previous_value || null,
      new_value: draft.new_value || null,
      metadata: draft.metadata || {},
      created_by: currentUserId
    });

    if (insertRes.error) {
      set({ error: normalizeError(insertRes.error) });
      return false;
    }

    if (draft.conversation_id) {
      await get().loadAiActionsLog(draft.conversation_id, true);
    }

    return true;
  },

  loadOperationalAlerts: async (silent = false) => {
    if (!silent) set({ loadingOperationalAlerts: true, error: null });
    else set({ error: null });

    const alertsRes = await supabase
      .from("ai_operational_alerts")
      .select("*")
      .in("status", ["ABIERTA", "ENVIADA", "VISTA", "ACK"])
      .order("gap_hours", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300);

    if (alertsRes.error) {
      set({
        loadingOperationalAlerts: false,
        error: normalizeError(alertsRes.error)
      });
      return;
    }

    set({
      loadingOperationalAlerts: false,
      operationalAlerts: ((alertsRes.data || []) as Record<string, unknown>[]).map(normalizeOperationalAlert)
    });
  },

  loadCommercialGapDashboard: async (silent = false) => {
    if (!silent) set({ loadingOperationalAlerts: true, error: null });
    else set({ error: null });

    const dashboardRes = await supabase.rpc("get_commercial_gap_dashboard");

    if (dashboardRes.error) {
      set({
        loadingOperationalAlerts: false,
        error: normalizeError(dashboardRes.error)
      });
      return;
    }

    const dashboard = normalizeCommercialGapDashboard(dashboardRes.data);

    set({
      loadingOperationalAlerts: false,
      commercialGapDashboard: dashboard,
      operationalAlerts: dashboard.alertas_abiertas
    });
  },

  generateCommercialGapAlerts: async () => {
    set({ loadingOperationalAlerts: true, error: null });

    const generateRes = await supabase.rpc("generate_commercial_gap_alerts");

    if (generateRes.error) {
      set({
        loadingOperationalAlerts: false,
        error: normalizeError(generateRes.error)
      });
      return false;
    }

    await Promise.all([get().loadCommercialGapDashboard(true), get().loadOperationalAlerts(true)]);

    set({ loadingOperationalAlerts: false });

    return true;
  },

  resolveCommercialGapAlerts: async () => {
    set({ loadingOperationalAlerts: true, error: null });

    const resolveRes = await supabase.rpc("resolve_commercial_gap_alerts");

    if (resolveRes.error) {
      set({
        loadingOperationalAlerts: false,
        error: normalizeError(resolveRes.error)
      });
      return false;
    }

    await Promise.all([get().loadCommercialGapDashboard(true), get().loadOperationalAlerts(true)]);

    set({ loadingOperationalAlerts: false });

    return true;
  },


    runNiaCommercialAssistantDispatch: async (sendDailyReport = false) => {
    set({
      loadingOperationalAlerts: true,
      loadingAiCommercialControl: true,
      error: null
    });

    const dispatchRes = await supabase.rpc("run_nia_commercial_assistant_dispatch", {
      p_send_daily_report: sendDailyReport
    });

    if (dispatchRes.error) {
      set({
        loadingOperationalAlerts: false,
        loadingAiCommercialControl: false,
        error: normalizeError(dispatchRes.error)
      });

      return false;
    }

    await Promise.all([
      get().loadCommercialGapDashboard(true),
      get().loadOperationalAlerts(true),
      get().loadAiCommercialControlDashboard(7, true),
      get().loadAiDailyCommercialReports(true),
      get().loadComunicaciones(true)
    ]);

    set({
      loadingOperationalAlerts: false,
      loadingAiCommercialControl: false
    });

    return true;
  },


  
  updateOperationalAlertStatus: async (alertId, status, resolutionNote = "") => {
    set({ loadingOperationalAlerts: true, error: null });

    const updateRes = await supabase.rpc("update_ai_operational_alert_status", {
      p_alert_id: alertId,
      p_status: status,
      p_resolution_note: resolutionNote || null
    });

    if (updateRes.error) {
      set({
        loadingOperationalAlerts: false,
        error: normalizeError(updateRes.error)
      });
      return false;
    }

    await Promise.all([get().loadCommercialGapDashboard(true), get().loadOperationalAlerts(true)]);

    set({ loadingOperationalAlerts: false });

    return Boolean(updateRes.data);
  },

  loadAiCommercialControlDashboard: async (days = 7, silent = false) => {
    if (!silent) set({ loadingAiCommercialControl: true, error: null });
    else set({ error: null });

    const dashboardRes = await supabase.rpc("get_ai_commercial_control_dashboard", {
      p_days: days
    });

    if (dashboardRes.error) {
      set({
        loadingAiCommercialControl: false,
        error: normalizeError(dashboardRes.error)
      });
      return;
    }

    const dashboard = normalizeAiCommercialControlDashboard(dashboardRes.data);

    set({
      loadingAiCommercialControl: false,
      aiCommercialControlDashboard: dashboard
    });
  },

  generateAiDailyCommercialReport: async () => {
    set({ loadingAiCommercialControl: true, error: null });

    const reportRes = await supabase.rpc("generate_ai_daily_commercial_report");

    if (reportRes.error) {
      set({
        loadingAiCommercialControl: false,
        error: normalizeError(reportRes.error)
      });
      return false;
    }

    await Promise.all([get().loadAiCommercialControlDashboard(7, true), get().loadAiDailyCommercialReports(true)]);

    set({ loadingAiCommercialControl: false });

    return true;
  },

  loadAiDailyCommercialReports: async (silent = false) => {
    if (!silent) set({ loadingAiCommercialControl: true, error: null });
    else set({ error: null });

    const reportsRes = await supabase.rpc("get_ai_daily_commercial_reports", {
      p_limit: 30
    });

    if (reportsRes.error) {
      set({
        loadingAiCommercialControl: false,
        error: normalizeError(reportsRes.error)
      });
      return;
    }

    const rows = asJsonArray<Record<string, unknown>>(reportsRes.data);

    set({
      loadingAiCommercialControl: false,
      aiDailyCommercialReports: rows.map(normalizeAiDailyCommercialReport)
    });
  },

  loadAiFeedback: async (conversationId = null, silent = false) => {
    if (!silent) set({ loadingAiActions: true, error: null });
    else set({ error: null });

    let query = supabase
      .from("ai_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);

    if (conversationId) {
      query = query.eq("conversation_id", conversationId);
    }

    const feedbackRes = await query;

    if (feedbackRes.error) {
      set({ loadingAiActions: false, error: normalizeError(feedbackRes.error) });
      return;
    }

    set({
      loadingAiActions: false,
      aiFeedback: ((feedbackRes.data || []) as Record<string, unknown>[]).map(normalizeAiFeedback)
    });
  },

  createAiFeedback: async (draft) => {
    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ error: "No hay usuario autenticado." });
      return false;
    }

    const feedbackType = cleanText(draft.feedback_type || "NEUTRO").toUpperCase();

    if (!["POSITIVO", "NEGATIVO", "NEUTRO"].includes(feedbackType)) {
      set({ error: "Tipo de feedback inválido." });
      return false;
    }

    const rating = draft.rating === null || draft.rating === undefined ? null : Number(draft.rating);

    if (rating !== null && (!Number.isFinite(rating) || rating < 1 || rating > 5)) {
      set({ error: "La calificación debe ser de 1 a 5 estrellas." });
      return false;
    }

    const rpcRes = await supabase.rpc("create_ai_feedback", {
      p_conversation_id: draft.conversation_id || null,
      p_contacto_id: draft.contacto_id || null,
      p_cliente_id: draft.cliente_id || null,
      p_contact_ai_profile_id: draft.contact_ai_profile_id || null,
      p_ai_event_id: draft.ai_event_id || null,
      p_thread_id: draft.thread_id || null,
      p_assistant_message_id: draft.assistant_message_id || null,
      p_feedback_type: feedbackType,
      p_rating: rating,
      p_comment: cleanText(draft.comment) || null,
      p_original_ai_answer: cleanText(draft.original_ai_answer) || null,
      p_original_user_prompt: cleanText(draft.original_user_prompt) || null,
      p_source: cleanText(draft.source) || "frontend",
      p_module: cleanText(draft.module) || "comunicaciones",
      p_context_snapshot: draft.context_snapshot || {},
      p_metadata: draft.metadata || {}
    });

    if (rpcRes.error) {
      set({ error: normalizeError(rpcRes.error) });
      return false;
    }

    if (draft.conversation_id) {
      await get().loadAiFeedback(draft.conversation_id, true);
    } else {
      await get().loadAiFeedback(null, true);
    }

    await get().logAiAction({
      conversation_id: draft.conversation_id || null,
      contacto_id: draft.contacto_id || null,
      cliente_id: draft.cliente_id || null,
      contact_ai_profile_id: draft.contact_ai_profile_id || null,
      action_type: "AI_FEEDBACK",
      action_title:
        feedbackType === "POSITIVO"
          ? "Feedback positivo sobre respuesta IA"
          : feedbackType === "NEGATIVO"
            ? "Feedback negativo sobre respuesta IA"
            : "Feedback neutro sobre respuesta IA",
      action_detail: [rating ? `Calificación: ${rating}/5` : "", cleanText(draft.comment)]
        .filter(Boolean)
        .join("\n"),
      actor_type: "USER",
      source: draft.source || "frontend",
      metadata: {
        feedback_type: feedbackType,
        rating,
        assistant_message_id: draft.assistant_message_id || null,
        thread_id: draft.thread_id || null
      }
    });

    return true;
  },

  activateCustomerAiForConversation: async (conversationId, mode = "SUGERIDA") => {
    const conversation = get().conversations.find((item) => item.id === conversationId);
    const persona = get().getCustomerAiPersona();

    if (!conversation) {
      set({ error: "No se encontró la conversación." });
      return false;
    }

    const safeMode = mode === "AUTOMATICA" ? "AUTOMATICA" : "SUGERIDA";

    return get().updateCustomerAiConversationConfig({
      conversation_id: conversationId,
      customer_ai_enabled: true,
      customer_ai_mode: safeMode,
      customer_ai_persona_id: conversation.customer_ai_persona_id || persona?.id || null,
      customer_ai_status: safeMode === "AUTOMATICA" ? "RESPONDIENDO" : "OBSERVANDO",
customer_ai_handoff_status: conversation.customer_ai_handoff_status || "NO_DERIVADA",
      customer_ai_paused_until: null
    });
  },

  pauseCustomerAiForConversation: async (conversationId, reason = "") => {
    const conversation = get().conversations.find((item) => item.id === conversationId);

    if (!conversation) {
      set({ error: "No se encontró la conversación." });
      return false;
    }

    const ok = await get().updateCustomerAiConversationConfig({
      conversation_id: conversationId,
      customer_ai_enabled: Boolean(conversation.customer_ai_enabled),
      customer_ai_mode: conversation.customer_ai_mode || "SUGERIDA",
      customer_ai_status: "PAUSADA",
      customer_ai_paused_until: null
    });

    if (ok) {
      await get().logAiAction({
        conversation_id: conversationId,
        contacto_id: conversation.contacto_id,
        cliente_id: conversation.cliente_id,
        action_type: "CUSTOMER_AI_PAUSED",
        action_title: "NIA pasajeros pausada",
        action_detail: cleanText(reason) || "Pausa manual desde Comunicaciones.",
        actor_type: "USER",
        source: "comunicaciones_panel",
        metadata: {
          previous_status: conversation.customer_ai_status || null,
          previous_mode: conversation.customer_ai_mode || null
        }
      });
    }

    return ok;
  },

  handoffCustomerAiConversation: async (conversationId, reason = "") => {
    return get().requestCustomerAiHandoff(conversationId, reason);
  },

  updateCustomerAiConversationConfig: async (draft) => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    const conversation = get().conversations.find((item) => item.id === draft.conversation_id);

    if (!conversation) {
      set({ saving: false, error: "No se encontró la conversación." });
      return false;
    }

    const { canManageComunicaciones } = get();

    if (!canManageComunicaciones && draft.customer_ai_mode === "AUTOMATICA") {
      set({
        saving: false,
        error: "Solo administración o gerencia puede activar respuesta automática de NIA."
      });
      return false;
    }

    const payload: Record<string, unknown> = {
      updated_at: getNowIso(),
      updated_by: currentUserId
    };

    if (draft.customer_ai_persona_id !== undefined) {
      payload.customer_ai_persona_id = draft.customer_ai_persona_id || null;
    }

    if (draft.customer_ai_enabled !== undefined) {
      payload.customer_ai_enabled = Boolean(draft.customer_ai_enabled);
    }

    if (draft.customer_ai_mode !== undefined) {
      payload.customer_ai_mode = draft.customer_ai_mode || "APAGADA";
    }

    if (draft.customer_ai_status !== undefined) {
      payload.customer_ai_status = draft.customer_ai_status || "INACTIVA";
    }

    if (draft.customer_ai_paused_until !== undefined) {
      payload.customer_ai_paused_until = draft.customer_ai_paused_until || null;
    }

    if (draft.customer_ai_handoff_status !== undefined) {
      payload.customer_ai_handoff_status = draft.customer_ai_handoff_status || "NO_DERIVADA";
    }

    if (draft.customer_ai_handoff_reason !== undefined) {
      payload.customer_ai_handoff_reason = nullableText(draft.customer_ai_handoff_reason);
    }

    if (payload.customer_ai_mode === "APAGADA") {
      payload.customer_ai_enabled = false;
      payload.customer_ai_status = "INACTIVA";
      payload.customer_ai_paused_until = null;
    }

    if (payload.customer_ai_mode === "SUGERIDA") {
      payload.customer_ai_enabled = true;
      payload.customer_ai_status = "OBSERVANDO";
      payload.customer_ai_paused_until = null;
    }

    if (payload.customer_ai_mode === "AUTOMATICA") {
      payload.customer_ai_enabled = true;
      payload.customer_ai_status = "RESPONDIENDO";
      payload.customer_ai_paused_until = null;
    }

    const updateRes = await supabase.from("conversations").update(payload).eq("id", draft.conversation_id);

    if (updateRes.error) {
      set({ saving: false, error: normalizeError(updateRes.error) });
      return false;
    }

    await get().loadComunicaciones(true);
    get().selectConversation(draft.conversation_id);

    set({ saving: false });

    return true;
  },

    updateConversationCustomerAiSettings: async (
    conversationId: string,
    patch: Partial<ComunicacionConversation>
  ) => {
    return get().updateCustomerAiConversationConfig({
      conversation_id: conversationId,
      customer_ai_persona_id: patch.customer_ai_persona_id,
      customer_ai_enabled: patch.customer_ai_enabled ?? undefined,
      customer_ai_mode: patch.customer_ai_mode ?? undefined,
      customer_ai_status: patch.customer_ai_status ?? undefined,
      customer_ai_handoff_status: patch.customer_ai_handoff_status ?? undefined,
      customer_ai_handoff_reason: patch.customer_ai_handoff_reason ?? undefined,
      customer_ai_paused_until: patch.customer_ai_paused_until ?? undefined
    });
  },

  requestCustomerAiHandoff: async (conversationId, reason = "") => {
    set({ saving: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ saving: false, error: "No hay usuario autenticado." });
      return false;
    }

    const conversation = get().conversations.find((item) => item.id === conversationId);

    if (!conversation) {
      set({ saving: false, error: "No se encontró la conversación." });
      return false;
    }

    const now = getNowIso();
    const cleanReason = cleanText(reason) || "La IA considera que debe intervenir un vendedor.";

    const updateRes = await supabase
      .from("conversations")
      .update({
        assigned_to: null,
estado_gestion: "DERIVADO_NUEVO",
        customer_ai_status: "DERIVADA",
        customer_ai_handoff_status: "DERIVADA_A_BANDEJA",
        customer_ai_handoff_reason: cleanReason,
        customer_ai_handoff_at: now,
        updated_at: now,
        updated_by: currentUserId,
        metadata: mergeMetadata(conversation.metadata, {
          customer_ai_handoff_requested_by: currentUserId,
          customer_ai_handoff_requested_at: now
        })
      })
      .eq("id", conversationId);

    if (updateRes.error) {
      set({ saving: false, error: normalizeError(updateRes.error) });
      return false;
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      channel: "interno",
      direction: "system",
      sender_type: "system",
      sender_id: null,
      sender_name: "CANDE",
content: `CANDE derivó esta conversación a vendedores.\n\nMotivo: ${cleanReason}`,
      message_type: "system",
      status: "sent",
      is_internal: true,
      metadata: {
        system_ai: true,
        source: "customer_ai_handoff",
        customer_ai_handoff_status: "DERIVADA"
      },
      created_by: currentUserId
    });

    await get().logAiAction({
      conversation_id: conversationId,
      contacto_id: conversation.contacto_id,
      cliente_id: conversation.cliente_id,
      action_type: "CUSTOMER_AI_HANDOFF",
      action_title: "CANDE derivó la conversación a vendedores",
      action_detail: cleanReason,
      actor_type: "USER",
      source: "comunicaciones_panel",
      metadata: {
        handoff_status: "DERIVADA",
        previous_assigned_to: conversation.assigned_to || null
      }
    });

    await Promise.all([get().loadMessages(conversationId, true), get().loadComunicaciones(true)]);

    get().selectConversation(conversationId);

    set({ saving: false });

    return true;
  },

  handoffConversationFromCustomerAi: async (conversationId: string, reason = "") => {
        return get().requestCustomerAiHandoff(conversationId, reason);
  },

 takeCustomerAiHandoff: async (conversationId) => {
  set({ saving: true, error: null });

  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    set({ saving: false, error: "No hay usuario autenticado." });
    return false;
  }

  const conversation = get().conversations.find((item) => item.id === conversationId);

  if (!conversation) {
    set({ saving: false, error: "No se encontró la conversación." });
    return false;
  }

  const now = getNowIso();

  const updateRes = await supabase
    .from("conversations")
    .update({
      assigned_to: currentUserId,
      taken_at: now,
      taken_by: currentUserId,
      estado_gestion: "EN_GESTION",
      status: "ABIERTA",
      archived: false,
      archived_at: null,
      deleted: false,
      deleted_at: null,
      customer_ai_status: "PAUSADA",
      customer_ai_handoff_status: "TOMADA_POR_VENDEDOR",
      customer_ai_taken_by: currentUserId,
      customer_ai_taken_at: now,
      updated_at: now,
      updated_by: currentUserId,
      metadata: mergeMetadata(conversation.metadata, {
        customer_ai_stage: "EN_HUMANO",
        customer_ai_taken_by: currentUserId,
        customer_ai_taken_at: now,
        customer_ai_handoff_status: "TOMADA_POR_VENDEDOR"
      })
    })
    .eq("id", conversationId);

  if (updateRes.error) {
    set({ saving: false, error: normalizeError(updateRes.error) });
    return false;
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    channel: "interno",
    direction: "system",
    sender_type: "system",
    sender_id: null,
    sender_name: "CANDE",
    content: "Conversación tomada por un vendedor. CANDE queda pausada para evitar respuestas automáticas.",
    message_type: "system",
    status: "sent",
    is_internal: true,
    metadata: {
      system_ai: true,
      source: "customer_ai_handoff_taken",
      customer_ai_handoff_status: "TOMADA_POR_VENDEDOR"
    },
    created_by: currentUserId
  });

  await get().logAiAction({
    conversation_id: conversationId,
    contacto_id: conversation.contacto_id,
    cliente_id: conversation.cliente_id,
    action_type: "CUSTOMER_AI_HANDOFF_TAKEN",
    action_title: "Vendedor tomó conversación derivada por CANDE",
    action_detail: "La conversación quedó asignada al vendedor y CANDE quedó pausada.",
    actor_type: "USER",
    source: "comunicaciones_panel",
    metadata: {
      seller_id: currentUserId,
      previous_handoff_status: conversation.customer_ai_handoff_status || null,
      previous_customer_ai_status: conversation.customer_ai_status || null
    }
  });

  await Promise.all([
    get().loadMessages(conversationId, true),
    get().loadComunicaciones(true)
  ]);

  get().selectConversation(conversationId);

  set({ saving: false });

  return true;
},

  triggerCustomerAiReply: async (conversationId, force = false) => {
    set({ analyzingAi: true, error: null });

    const currentUserId = await getCurrentUserId();

    if (!currentUserId) {
      set({ analyzingAi: false, error: "No hay usuario autenticado." });
      return false;
    }

    const conversation = get().conversations.find((item) => item.id === conversationId);

    if (!conversation) {
      set({ analyzingAi: false, error: "No se encontró la conversación." });
      return false;
    }

    try {
      const invokeRes = await supabase.functions.invoke("customer-assistant-reply", {
        body: {
          conversation_id: conversationId,
          force,
          source: "comunicaciones_panel",
          mode: conversation.customer_ai_mode || "SUGERIDA"
        }
      });

      if (invokeRes.error) {
        const message = normalizeError(invokeRes.error);

        await supabase
          .from("conversations")
          .update({
            customer_ai_last_error: message,
            updated_at: getNowIso()
          })
          .eq("id", conversationId);

        set({ analyzingAi: false, error: message });

        return false;
      }

      await Promise.all([
        get().loadMessages(conversationId, true),
        get().loadComunicaciones(true),
        get().loadContactAiProfiles(true),
        get().loadAiActionsLog(conversationId, true)
      ]);

      set({ analyzingAi: false });

      return true;
    } catch (error) {
      const message = normalizeError(error);

      await supabase
        .from("conversations")
        .update({
          customer_ai_last_error: message,
          updated_at: getNowIso()
        })
        .eq("id", conversationId);

      set({ analyzingAi: false, error: message });

      return false;
    }
  },

  
  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value
      }
    }));
  },

  resetFilters: () => {
    set({ filters: getDefaultFilters() });
  },

  selectConversation: (conversationId) => {
  const currentSelectedId = get().selectedConversationId;

  if (currentSelectedId === conversationId) {
    return;
  }

  set({ selectedConversationId: conversationId });

  if (!conversationId) {
    set({
      messages: [],
      notes: [],
      aiActionsLog: [],
      aiFeedback: []
    });

    return;
  }

  void get().loadMessages(conversationId, false);
  void get().loadNotes(conversationId, false);
  void get().loadConversationAiAnalysis(conversationId);
  void get().loadAiActionsLog(conversationId, true);
  void get().loadAiFeedback(conversationId, true);
},

  clearError: () => {
    set({ error: null });
  },

getFilteredConversations: () => {
  const { conversations, filters, currentProfile, canManageComunicaciones } = get();
  const search = normalizeText(filters.search);
  const folder = inboxFolderForTab(filters.tab);

  return conversations.filter((conversation) => {
    const isNiaConversation = isAiInternalConversation(conversation);
    const isClosedArchivedOrDeleted = isClosedArchivedOrDeletedConversation(conversation);

    if (filters.tab === "nia") {
      if (!isNiaConversation) return false;
      if (isClosedArchivedOrDeleted) return false;
    }

    if (filters.tab !== "nia" && isNiaConversation) {
      return false;
    }

    if (filters.tab === "cande_atendiendo" && !isCandeAtendiendoConversation(conversation)) {
      return false;
    }

    if (filters.tab === "derivado_nuevo" && !isDerivadoNuevoConversation(conversation)) {
      return false;
    }

    if (filters.tab === "mis_conversaciones") {
      if (canManageComunicaciones) {
        if (!isHumanWorkConversation(conversation)) return false;
      } else {
        const isMine = conversation.assigned_to === currentProfile?.id;
        const isMyInbox = conversation.inbox_folder === "MIS_CONVERSACIONES";

        if (!isHumanWorkConversation(conversation)) return false;
        if (!isMine && !isMyInbox) return false;
      }
    }

    if (
      filters.tab === "en_colaboracion" &&
      conversation.inbox_folder !== "EN_COLABORACION" &&
      !conversation.en_colaboracion
    ) {
      return false;
    }

    if (filters.tab === "cerradas" && !isClosedArchivedOrDeleted) {
      return false;
    }

    if (filters.tab === "abiertas" && isClosedArchivedOrDeleted) {
      return false;
    }

    if (
      ![
        "nia",
        "cande_atendiendo",
        "derivado_nuevo",
        "mis_conversaciones",
        "en_colaboracion",
        "cerradas",
        "abiertas"
      ].includes(filters.tab) &&
      folder &&
      conversation.inbox_folder !== folder
    ) {
      return false;
    }

    if (filters.channel !== "todos" && conversation.channel !== filters.channel) return false;
    if (filters.assignedTo !== "todos" && conversation.assigned_to !== filters.assignedTo) return false;
    if (filters.sucursalId !== "todas" && conversation.sucursal_id !== filters.sucursalId) return false;
    if (filters.prioridad !== "todas" && conversation.prioridad !== filters.prioridad) return false;
    if (filters.estadoGestion !== "todos" && conversation.estado_gestion !== filters.estadoGestion) return false;
    if (filters.estadoComercial !== "todos" && conversation.estado_comercial !== filters.estadoComercial) return false;
    if (filters.unreadOnly && Number(conversation.unread_count || 0) <= 0) return false;
    if (filters.ventana24h === "abierta" && !isWindowOpen(conversation)) return false;
    if (filters.ventana24h === "cerrada" && isWindowOpen(conversation)) return false;

    if (
      filters.tagId !== "todos" &&
      !(conversation.tags || []).some((tag) => tag.id === filters.tagId)
    ) {
      return false;
    }

    if (search) {
      const haystack = normalizeText(
        [
          conversation.contacto_nombre,
          conversation.telefono,
          conversation.email,
          conversation.subject,
          conversation.titulo,
          conversation.last_message,
          conversation.assigned_full_name,
          conversation.sucursal_nombre,
          conversation.categoria,
          conversation.estado_gestion,
          conversation.customer_ai_mode,
          conversation.customer_ai_status,
          conversation.customer_ai_handoff_status,
          cleanText(conversation.metadata?.ai_persona_display_name),
          cleanText(conversation.metadata?.ai_persona_name),
          ...(conversation.tags || []).map((tag) => tag.nombre)
        ].join(" ")
      );

      if (!haystack.includes(search)) return false;
    }

    return true;
  });
},

getSelectedConversation: () => {
  const { selectedConversationId, conversations } = get();

  if (!selectedConversationId) return null;

  return conversations.find((item) => item.id === selectedConversationId) || null;
},

  getSelectedAiAnalysis: () => {
    const selectedConversationId = get().selectedConversationId;

    if (!selectedConversationId) return null;

    return get().aiAnalysisByConversationId[selectedConversationId] || null;
  },

  getContactAiProfileByConversationId: (conversationId) => {
    return get().contactAiProfiles.find((profile) => profile.conversation_id === conversationId) || null;
  },

  getContactAiProfileById: (profileId) => {
    return get().contactAiProfiles.find((profile) => profile.id === profileId) || null;
  },

  getSelectedAssistantThread: () => {
    const selectedAssistantThreadId = get().selectedAssistantThreadId;

    if (!selectedAssistantThreadId) return null;

    return get().assistantThreads.find((thread) => thread.id === selectedAssistantThreadId) || null;
  },

  getCustomerAiPersona: () => {
    const personas = get().aiPersonas;

    return (
      personas.find((persona) => persona.code === "customer_assistant" && persona.active) ||
      personas.find((persona) => persona.code === "customer_assistant") ||
      null
    );
  },

  getCommercialAiPersona: () => {
    const personas = get().aiPersonas;

    return (
      personas.find((persona) => persona.code === "commercial_assistant" && persona.active) ||
      personas.find((persona) => persona.code === "commercial_assistant") ||
      personas.find((persona) => persona.is_default) ||
      null
    );
  },

  getSellerAvailabilityByUserId: (userId) => {
    return get().sellerAvailability.find((item) => item.user_id === userId || item.profile_id === userId) || null;
  },

  getMetrics: () => {
    const { conversations, currentProfile, canManageComunicaciones } = get();

    const abiertas = conversations.filter((item) => !isClosedArchivedOrDeletedConversation(item));
    const candeAtendiendo = conversations.filter(isCandeAtendiendoConversation).length;
    const derivadoNuevo = conversations.filter(isDerivadoNuevoConversation).length;
    const humanWork = conversations.filter(isHumanWorkConversation);

    const misConversaciones = canManageComunicaciones
      ? humanWork.length
      : conversations.filter(
          (item) => item.assigned_to === currentProfile?.id || item.inbox_folder === "MIS_CONVERSACIONES"
        ).length;

 const nia = conversations.filter(isAiInternalConversation).length;

return {
  candeAtendiendo,
  derivadoNuevo,
  misConversaciones,
  enColaboracion: conversations.filter(
    (item) => item.inbox_folder === "EN_COLABORACION" || item.en_colaboracion
  ).length,
  cerradas: conversations.filter(
    (item) => item.inbox_folder === "CERRADAS" || item.status === "CERRADA" || item.estado_gestion === "CERRADA"
  ).length,
  archivadas: conversations.filter((item) => item.inbox_folder === "ARCHIVADAS" || item.archived).length,
  eliminadas: conversations.filter((item) => item.inbox_folder === "ELIMINADAS" || item.deleted).length,
  abiertas: abiertas.length,
  noLeidas: conversations.filter((item) => Number(item.unread_count || 0) > 0).length,
  urgentes: abiertas.filter((item) => item.prioridad === "URGENTE").length,
  ventanaAbierta: abiertas.filter((item) => item.channel === "whatsapp" && isWindowOpen(item)).length,
  aiAutomaticas: abiertas.filter((item) => item.customer_ai_mode === "AUTOMATICA").length,
  aiSugeridas: abiertas.filter((item) => item.customer_ai_mode === "SUGERIDA").length,
  aiDerivadasPendientes: derivadoNuevo,
  nia
  }

}

}));


