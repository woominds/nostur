import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Bot,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Image,
  Loader2,
  MessageCircle,
  Mic,
  MoreVertical,
  Paperclip,
  RefreshCcw,
  Reply,
  Search,
  Send,
  Smile,
  Sparkles,
  Trash2,
  UserCheck,
  Wand2,
  XCircle
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { EmptyState, Pill } from "./comunicacionesShared";
import { EMOJI_GROUPS, INBOXES, QUICK_EMOJIS } from "./liveNos/constants";
import {
  ComposerIconButton,
  ConversationCard,
  HeaderButton,
  MessageStatusIcon,
  StatusPill,
  getNotaVisual
} from "./liveNos/ui";
import type {
  ContactoWa,
  Conversacion,
  ConversationVM,
  InboxKey,
  LeadOportunidad,
  Mensaje,
  MensajeReaccion,
  NotaConversacion,
  PendingAttachment,
  PipelineEstado,
  PreviewMedia,
  ProfileLite,
  RespuestaRapida,
  RightTab,
  TimelineItem,
  WhatsappTemplate
} from "./liveNos/types";
import {
  canSendAsWhatsappAudio,
  filterByInbox,
  formatDateTime,
  formatFileSize,
  getAudioExtension,
  getCleanAudioMimeForMeta,
  getDato,
  getDisplayName,
  getInitials,
  getMessageMediaMime,
  getMessageMediaName,
  getMessageMediaSize,
  getMessageMediaUrl,
  getMessageRole,
  getMessageSenderName,
  getRecorderMimeType,
  getVendedorName,
  getWindowRemainingLabel,
  isAudioMessage,
  isImageMessage,
  normalizePhoneForLiveNos,
  normalizePhoneWithPlus
} from "./liveNos/helpers";



export function LiveNosPanel() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeInbox, setActiveInbox] = useState<InboxKey>("sin_atender");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [conversaciones, setConversaciones] = useState<ConversationVM[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [notas, setNotas] = useState<NotaConversacion[]>([]);
  const [reacciones, setReacciones] = useState<MensajeReaccion[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEstado[]>([]);

  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsappTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [templateSending, setTemplateSending] = useState(false);
  const [templateSyncing, setTemplateSyncing] = useState(false);

  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationPhone, setNewConversationPhone] = useState("");
  const [newConversationName, setNewConversationName] = useState("");
  const [newConversationTemplateId, setNewConversationTemplateId] = useState<string | null>(null);
  const [newConversationVariables, setNewConversationVariables] = useState<Record<string, string>>({});
  const [newConversationSending, setNewConversationSending] = useState(false);

  const [quickReplies, setQuickReplies] = useState<RespuestaRapida[]>([]);
  const [composerText, setComposerText] = useState("");
  const [internalText, setInternalText] = useState("");
  const [editingContactName, setEditingContactName] = useState(false);
  const [contactNameDraft, setContactNameDraft] = useState("");
  const [scheduledText, setScheduledText] = useState("");
  const [reminderText, setReminderText] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [reminderFor, setReminderFor] = useState("");

  const [replyToMessage, setReplyToMessage] = useState<Mensaje | null>(null);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showQuickRepliesPanel, setShowQuickRepliesPanel] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState("");
  const [quickReplyTitle, setQuickReplyTitle] = useState("");
  const [quickReplyContent, setQuickReplyContent] = useState("");
  const [quickReplyCategory, setQuickReplyCategory] = useState("");
  const [showAgentName, setShowAgentName] = useState(true);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [audioRecording, setAudioRecording] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<PreviewMedia | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>("info");
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);

  
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const selectedIdRef = useRef<string | null>(null);
  const reloadTimerRef = useRef<number | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);

  const selectedConversation = useMemo(() => {
    return conversaciones.find((item) => item.id === selectedId) || null;
  }, [conversaciones, selectedId]);

  const selectedOportunidad = selectedConversation?.oportunidad || null;
  const selectedContacto = selectedConversation?.contacto || null;
  const selectedVendedor = selectedConversation?.vendedor || null;

  const timeline = useMemo<TimelineItem[]>(() => {
    const messageItems: TimelineItem[] = mensajes.map((message) => ({
      id: `message:${message.id}`,
      kind: "message",
      at: message.wa_timestamp || message.created_at,
      message
    }));

    const internalItems: TimelineItem[] = notas
      .filter((nota) => nota.tipo === "mensaje_interno" || nota.tipo === "nota")
      .map((nota) => ({
        id: `internal:${nota.id}`,
        kind: "internal",
        at: nota.created_at,
        nota
      }));

    return [...messageItems, ...internalItems].sort((a, b) => {
      const aTime = new Date(a.at).getTime();
      const bTime = new Date(b.at).getTime();

      return aTime - bTime;
    });
  }, [mensajes, notas]);

  const filteredConversations = useMemo(() => {
    const clean = search.trim().toLowerCase();

    return conversaciones
      .filter((conv) => filterByInbox(conv, activeInbox))
      .filter((conv) => {
        if (!clean) return true;

        const haystack = [
          conv.wa_phone,
          conv.last_message_preview,
          conv.titulo,
          conv.subject,
          conv.contacto?.display_name,
          conv.contacto?.profile_name,
          conv.vendedor?.nombre,
          conv.vendedor?.apellido,
          conv.oportunidad?.datos?.destino,
          conv.oportunidad?.datos?.origen
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(clean);
      })
      .sort((a, b) => {
        const aDate = new Date(a.last_message_at || a.updated_at || a.created_at).getTime();
        const bDate = new Date(b.last_message_at || b.updated_at || b.created_at).getTime();
        return bDate - aDate;
      });
  }, [activeInbox, conversaciones, search]);

  const inboxCounts = useMemo(() => {
    return INBOXES.reduce<Record<InboxKey, number>>((acc, inbox) => {
      acc[inbox.id] = conversaciones.filter((conv) => filterByInbox(conv, inbox.id)).length;
      return acc;
    }, {} as Record<InboxKey, number>);
  }, [conversaciones]);

  const reaccionesByMensaje = useMemo(() => {
    return reacciones.reduce<Record<string, MensajeReaccion[]>>((acc, reaccion) => {
      if (!acc[reaccion.mensaje_id]) acc[reaccion.mensaje_id] = [];
      acc[reaccion.mensaje_id].push(reaccion);
      return acc;
    }, {});
  }, [reacciones]);

  const activeWhatsappTemplates = useMemo(() => {
    return whatsappTemplates
      .filter((template) => template.active && template.meta_status === "approved")
      .sort((a, b) => {
        const aName = a.display_name || a.name;
        const bName = b.display_name || b.name;
        return aName.localeCompare(bName);
      });
  }, [whatsappTemplates]);

  const selectedWhatsappTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return activeWhatsappTemplates.find((template) => template.id === selectedTemplateId) || null;
  }, [activeWhatsappTemplates, selectedTemplateId]);

  const templatePreview = useMemo(() => {
    if (!selectedWhatsappTemplate) return "";

    let text = selectedWhatsappTemplate.body || "";

    selectedWhatsappTemplate.variables.forEach((variable, index) => {
      const key = String(index + 1);
      const value = templateVariables[key] || templateVariables[variable] || `{{${index + 1}}}`;

      text = text.replaceAll(`{{${index + 1}}}`, value);
    });

    return text;
  }, [selectedWhatsappTemplate, templateVariables]);

  const newConversationTemplate = useMemo(() => {
    if (!newConversationTemplateId) return null;

    return activeWhatsappTemplates.find((template) => template.id === newConversationTemplateId) || null;
  }, [activeWhatsappTemplates, newConversationTemplateId]);

  const newConversationPreview = useMemo(() => {
    if (!newConversationTemplate) return "";

    let text = newConversationTemplate.body || "";

    newConversationTemplate.variables.forEach((variable, index) => {
      const key = String(index + 1);
      const value =
        newConversationVariables[key] ||
        newConversationVariables[variable] ||
        `{{${index + 1}}}`;

      text = text.replaceAll(`{{${index + 1}}}`, value);
    });

    return text;
  }, [newConversationTemplate, newConversationVariables]);

  const filteredQuickReplies = useMemo(() => {
    const clean = quickReplySearch.trim().toLowerCase();

    return quickReplies.filter((reply) => {
      if (!clean) return true;

      return [reply.titulo, reply.contenido, reply.categoria, reply.atajo]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(clean);
    });
  }, [quickReplies, quickReplySearch]);
    function scheduleRefreshDetail(conversationId?: string | null) {
    const current = conversationId || selectedIdRef.current;

    if (!current) return;

    if (reloadTimerRef.current) {
      window.clearTimeout(reloadTimerRef.current);
    }

    reloadTimerRef.current = window.setTimeout(() => {
      void loadConversationDetail(current, { preserveScroll: true });
    }, 350);
  }

  function scrollTimelineToBottom(behavior: ScrollBehavior = "auto") {
    window.requestAnimationFrame(() => {
      const el = timelineRef.current;
      if (!el) return;

      el.scrollTo({
        top: el.scrollHeight,
        behavior
      });
    });
  }

  function updateStickToBottom() {
    const el = timelineRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 120;
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [convRes, contactosRes, profilesRes, oppRes, pipelineRes] = await Promise.all([
      supabase
        .from("conversaciones")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(200),
      supabase.from("contactos_wa").select("*"),
      supabase
        .from("profiles")
        .select("id,nombre,apellido,email,color,activo,nombre_publico_whatsapp,mostrar_nombre_agente")
        .eq("activo", true)
        .order("nombre", { ascending: true }),
      supabase.from("lead_oportunidades").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("pipeline_estados")
        .select("id,nombre,color,orden,es_final,resultado,es_sin_atender")
        .order("orden", { ascending: true })
    ]);

    const firstError =
      convRes.error || contactosRes.error || profilesRes.error || oppRes.error || pipelineRes.error;

    if (firstError) {
      setError(firstError.message || "No se pudo cargar LiveNos.");
      setLoading(false);
      return;
    }

    const contactosMap = new Map<string, ContactoWa>();
    ((contactosRes.data || []) as ContactoWa[]).forEach((item) => contactosMap.set(item.id, item));

    const profilesMap = new Map<string, ProfileLite>();
    ((profilesRes.data || []) as ProfileLite[]).forEach((item) => profilesMap.set(item.id, item));

    const oppMap = new Map<string, LeadOportunidad>();
    ((oppRes.data || []) as LeadOportunidad[]).forEach((item) =>
      oppMap.set(item.conversacion_id, item)
    );

    const nextConversaciones = ((convRes.data || []) as Conversacion[]).map((conv) => ({
      ...conv,
      contacto: contactosMap.get(conv.contacto_id) || null,
      vendedor: conv.assigned_to ? profilesMap.get(conv.assigned_to) || null : null,
      oportunidad: oppMap.get(conv.id) || null
    }));

    setConversaciones(nextConversaciones);
    setProfiles((profilesRes.data || []) as ProfileLite[]);
    setPipeline((pipelineRes.data || []) as PipelineEstado[]);

    const currentSelectedId = selectedIdRef.current;

    if (currentSelectedId) {
      const stillExists = nextConversaciones.some((conv) => conv.id === currentSelectedId);

      if (!stillExists) {
        setSelectedId(null);
        selectedIdRef.current = null;
        setMensajes([]);
        setNotas([]);
        setReacciones([]);
      }
    }

    setLoading(false);
  }, []);

  const loadQuickReplies = useCallback(async () => {
    const { data, error: quickError } = await supabase
      .from("respuestas_rapidas")
      .select("*")
      .eq("activa", true)
      .order("orden", { ascending: true })
      .order("titulo", { ascending: true });

    if (quickError) {
      setError(quickError.message || "No se pudieron cargar las respuestas rápidas.");
      return;
    }

    setQuickReplies((data || []) as RespuestaRapida[]);
  }, []);

  const loadWhatsappTemplates = useCallback(async () => {
    const { data, error: templatesError } = await supabase
      .from("whatsapp_templates")
      .select(
        "id,name,display_name,language,category,body,variables,components,meta_id,meta_status,active,last_synced_at"
      )
      .eq("active", true)
      .order("display_name", { ascending: true });

    if (templatesError) {
      setError(templatesError.message || "No se pudieron cargar las plantillas de WhatsApp.");
      return;
    }

    setWhatsappTemplates((data || []) as WhatsappTemplate[]);
  }, []);

  const loadConversationDetail = useCallback(
    async (
      conversationId: string,
      options: {
        preserveScroll?: boolean;
        forceBottom?: boolean;
      } = {}
    ) => {
      setError(null);

      const shouldAutoScroll =
        options.forceBottom || (!options.preserveScroll && shouldStickToBottomRef.current);

      const [messagesRes, notesRes] = await Promise.all([
        supabase
          .from("mensajes")
          .select("*")
          .eq("conversacion_id", conversationId)
          .is("deleted_at", null)
          .order("wa_timestamp", { ascending: true }),
        supabase
          .from("notas_conversacion")
          .select("*")
          .eq("conversacion_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100)
      ]);

      const firstError = messagesRes.error || notesRes.error;

      if (firstError) {
        setError(firstError.message || "No se pudo cargar la conversación.");
        return;
      }

      const nextMensajes = (messagesRes.data || []) as Mensaje[];
      const messageIds = nextMensajes.map((message) => message.id);

      let nextReacciones: MensajeReaccion[] = [];

      if (messageIds.length > 0) {
        const reactionsRes = await supabase
          .from("mensaje_reacciones")
          .select("*")
          .in("mensaje_id", messageIds)
          .order("created_at", { ascending: true });

        if (!reactionsRes.error) {
          nextReacciones = (reactionsRes.data || []) as MensajeReaccion[];
        }
      }

      setMensajes(nextMensajes);
      setNotas((notesRes.data || []) as NotaConversacion[]);
      setReacciones(nextReacciones);

      if (shouldAutoScroll || options.forceBottom) {
        scrollTimelineToBottom(options.forceBottom ? "smooth" : "auto");
      }
    },
    []
  );

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadQuickReplies();
  }, [loadQuickReplies]);

  useEffect(() => {
    void loadWhatsappTemplates();
  }, [loadWhatsappTemplates]);

  useEffect(() => {
    if (!selectedId) return;
    shouldStickToBottomRef.current = true;
    void loadConversationDetail(selectedId, { forceBottom: true });
  }, [selectedId, loadConversationDetail]);

  useEffect(() => {
    const channelName = `livenos-realtime-${Date.now()}`;

    const refreshCurrentConversation = () => {
      const current = selectedIdRef.current;

      if (current) {
        scheduleRefreshDetail(current);
      }
    };

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversaciones"
        },
        () => {
          void loadData();
          refreshCurrentConversation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lead_oportunidades"
        },
        () => {
          void loadData();
          refreshCurrentConversation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensajes"
        },
        () => {
          refreshCurrentConversation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notas_conversacion"
        },
        () => {
          refreshCurrentConversation();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mensaje_reacciones"
        },
        () => {
          refreshCurrentConversation();
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log("[LiveNos realtime]", subscriptionStatus);
      });

    const fallbackInterval = window.setInterval(() => {
      refreshCurrentConversation();
    }, 8000);

    return () => {
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }

      window.clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      scrollTimelineToBottom("auto");
    }
  }, [timeline.length]);

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }

      const recorder = audioRecorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [pendingAttachment]);

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }

  async function selectConversation(id: string) {
    setSelectedId(id);
    selectedIdRef.current = id;
    setComposerText("");
    setInternalText("");
    setScheduledText("");
    setReminderText("");
    setScheduledFor("");
    setReminderFor("");
    setReplyToMessage(null);
    setOpenMessageMenuId(null);
    setShowEmojiPanel(false);
    setShowQuickRepliesPanel(false);
    setQuickReplySearch("");

    setTemplateModalOpen(false);
    setSelectedTemplateId(null);
    setTemplateVariables({});
    setTemplateSending(false);

    setNewConversationOpen(false);
    setNewConversationPhone("");
    setNewConversationName("");
    setNewConversationTemplateId(null);
    setNewConversationVariables({});
    setNewConversationSending(false);

    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    setPendingAttachment(null);
    setIsDraggingFile(false);
    setAudioRecording(false);
    setPreviewMedia(null);

    const selected = conversaciones.find((conv) => conv.id === id);

    setEditingContactName(false);
    setContactNameDraft(getDisplayName(selected?.contacto, selected || null));

    const target = conversaciones.find((conv) => conv.id === id);

    if (target && target.unread_count > 0) {
      await supabase.from("conversaciones").update({ unread_count: 0 }).eq("id", id);
      await loadData();
    }
  }

  async function takeConversation() {
    if (!selectedConversation) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    if (!userId) {
      setError("No se pudo identificar el usuario actual.");
      setActionLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("conversaciones")
      .update({
        assigned_to: userId,
        tomada_by: userId,
        tomada_at: new Date().toISOString(),
        estado_gestion: "en_gestion",
        inbox: "vendedor"
      })
      .eq("id", selectedConversation.id);

    if (updateError) {
      setError(updateError.message || "No se pudo tomar la conversación.");
      setActionLoading(false);
      return;
    }

    setStatus("Conversación tomada.");
    await loadData();
    await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
    setActionLoading(false);
  }

  async function toggleCande() {
    if (!selectedConversation) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const current = selectedConversation.oportunidad;

    if (!current) {
      setError("Esta conversación todavía no tiene oportunidad vinculada.");
      setActionLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("lead_oportunidades")
      .update({
        cande_activa: !current.cande_activa,
        updated_at: new Date().toISOString()
      })
      .eq("id", current.id);

    if (updateError) {
      setError(updateError.message || "No se pudo actualizar Cande.");
      setActionLoading(false);
      return;
    }

    setStatus(current.cande_activa ? "Cande desactivada." : "Cande activada.");
    await loadData();
    setActionLoading(false);
  }

  async function closeConversation() {
    if (!selectedConversation) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const { error: updateError } = await supabase
      .from("conversaciones")
      .update({
        closed_at: new Date().toISOString(),
        estado_gestion: "resuelta"
      })
      .eq("id", selectedConversation.id);

    if (updateError) {
      setError(updateError.message || "No se pudo cerrar la conversación.");
      setActionLoading(false);
      return;
    }

    setStatus("Conversación cerrada.");
    await loadData();
    setActionLoading(false);
  }

  async function archiveConversation() {
    if (!selectedConversation) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const { error: updateError } = await supabase
      .from("conversaciones")
      .update({
        archived_at: new Date().toISOString(),
        status: "archived"
      })
      .eq("id", selectedConversation.id);

    if (updateError) {
      setError(updateError.message || "No se pudo archivar la conversación.");
      setActionLoading(false);
      return;
    }

    setStatus("Conversación archivada.");
    await loadData();
    setActionLoading(false);
  }

  async function deleteConversation() {
    if (!selectedConversation) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const { error: updateError } = await supabase
      .from("conversaciones")
      .update({
        deleted_at: new Date().toISOString(),
        status: "trash"
      })
      .eq("id", selectedConversation.id);

    if (updateError) {
      setError(updateError.message || "No se pudo eliminar la conversación.");
      setActionLoading(false);
      return;
    }

    setStatus("Conversación enviada a eliminadas.");
    await loadData();
    setActionLoading(false);
  }

  async function restoreConversation() {
    if (!selectedConversation) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const { error: updateError } = await supabase
      .from("conversaciones")
      .update({
        archived_at: null,
        deleted_at: null,
        closed_at: null,
        status: "open",
        estado_gestion: selectedConversation.assigned_to ? "en_gestion" : "sin_atender"
      })
      .eq("id", selectedConversation.id);

    if (updateError) {
      setError(updateError.message || "No se pudo restaurar la conversación.");
      setActionLoading(false);
      return;
    }

    setStatus("Conversación restaurada.");
    await loadData();
    setActionLoading(false);
  }

  async function addTaskItem(tipo: "programar_envio_cliente" | "recordatorio") {
    if (!selectedConversation) return;

    const text = tipo === "programar_envio_cliente" ? scheduledText.trim() : reminderText.trim();

    if (!text) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    if (!userId) {
      setError("No se pudo identificar el usuario actual.");
      setActionLoading(false);
      return;
    }

    const scheduledValue =
      tipo === "programar_envio_cliente" ? scheduledFor || null : reminderFor || null;

    const { error: insertError } = await supabase.from("notas_conversacion").insert({
      conversacion_id: selectedConversation.id,
      autor_id: userId,
      contenido: text,
      tipo,
      scheduled_for: scheduledValue
    });

    if (insertError) {
      setError(insertError.message || "No se pudo guardar la tarea.");
      setActionLoading(false);
      return;
    }

    if (tipo === "programar_envio_cliente") {
      setScheduledText("");
      setScheduledFor("");
      setStatus("Mensaje programado guardado.");
    } else {
      setReminderText("");
      setReminderFor("");
      setStatus("Recordatorio guardado.");
    }

    await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
    setActionLoading(false);
  }

  async function saveContactDisplayName() {
    if (!selectedConversation || !selectedContacto) return;

    const cleanName = contactNameDraft.trim();

    if (!cleanName) {
      setError("El nombre del contacto no puede quedar vacío.");
      return;
    }

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const { error: updateContactError } = await supabase
      .from("contactos_wa")
      .update({
        display_name: cleanName,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedContacto.id);

    if (updateContactError) {
      setError(updateContactError.message || "No se pudo actualizar el nombre del contacto.");
      setActionLoading(false);
      return;
    }

    const { error: updateConversationError } = await supabase
      .from("conversaciones")
      .update({
        titulo: cleanName,
        subject: cleanName,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedConversation.id);

    if (updateConversationError) {
      setError(updateConversationError.message || "No se pudo actualizar el título de la conversación.");
      setActionLoading(false);
      return;
    }

    setEditingContactName(false);
    setStatus("Nombre del contacto actualizado.");

    await loadData();
    await loadConversationDetail(selectedConversation.id, { preserveScroll: true });

    setActionLoading(false);
  }

    function applyQuickReplyVariables(text: string): string {
    const vendedorName = selectedVendedor?.nombre_publico_whatsapp || getVendedorName(selectedVendedor);

    return text
      .replaceAll("{{vendedor}}", vendedorName === "Sin asignar" ? "NOSSIX Travel" : vendedorName)
      .replaceAll("{{cliente}}", getDisplayName(selectedContacto, selectedConversation))
      .replaceAll("{{telefono}}", selectedConversation?.wa_phone || "");
  }

  function insertQuickReply(reply: RespuestaRapida) {
    const finalText = applyQuickReplyVariables(reply.contenido);

    setComposerText((current) => {
      if (!current.trim()) return finalText;
      return `${current.trim()}\n${finalText}`;
    });

    setShowQuickRepliesPanel(false);
    setQuickReplySearch("");
  }

  async function createQuickReply() {
    const title = quickReplyTitle.trim();
    const content = quickReplyContent.trim();

    if (!title || !content) {
      setError("La respuesta rápida necesita título y contenido.");
      return;
    }

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    const { error: insertError } = await supabase.from("respuestas_rapidas").insert({
      titulo: title,
      contenido: content,
      categoria: quickReplyCategory.trim() || null,
      atajo: null,
      activa: true,
      orden: quickReplies.length + 1,
      created_by: userId
    });

    if (insertError) {
      setError(insertError.message || "No se pudo crear la respuesta rápida.");
      setActionLoading(false);
      return;
    }

    setQuickReplyTitle("");
    setQuickReplyContent("");
    setQuickReplyCategory("");
    setStatus("Respuesta rápida creada.");

    await loadQuickReplies();
    setActionLoading(false);
  }

  async function sendInternalMessage() {
    if (!selectedConversation || !internalText.trim()) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    if (!userId) {
      setError("No se pudo identificar el usuario actual.");
      setActionLoading(false);
      return;
    }

    const text = internalText.trim();

    const { error: insertError } = await supabase.from("notas_conversacion").insert({
      conversacion_id: selectedConversation.id,
      autor_id: userId,
      contenido: text,
      tipo: "mensaje_interno",
      scheduled_for: null
    });

    if (insertError) {
      setError(insertError.message || "No se pudo enviar el mensaje interno.");
      setActionLoading(false);
      return;
    }

    setInternalText("");
    shouldStickToBottomRef.current = true;

    await loadConversationDetail(selectedConversation.id, { forceBottom: true });
    setActionLoading(false);
  }

  async function sendLocalMessage() {
  if (!selectedConversation) return;

  const hasText = Boolean(composerText.trim());
  const hasAttachment = Boolean(pendingAttachment);

  if (!hasText && !hasAttachment) return;

  setActionLoading(true);
  setError(null);
  setStatus(null);

  const userId = await getUserId();

  if (!userId) {
    setError("No se pudo identificar el usuario actual.");
    setActionLoading(false);
    return;
  }

  const text = composerText.trim();
  const captionText = text || "";
  const now = new Date().toISOString();

  let mediaPayload: Record<string, unknown> | null = null;

  // Tipo que se guarda en LiveNos / DB.
  let localMessageType = "text";

  // Tipo que se manda realmente a WhatsApp.
  let whatsappMessageType = "text";

  try {
    if (pendingAttachment) {
      const uploaded = await uploadAttachmentToStorage({
        conversationId: selectedConversation.id,
        attachment: pendingAttachment
      });

      localMessageType =
        pendingAttachment.kind === "image"
          ? "image"
          : pendingAttachment.kind === "audio"
            ? "audio"
            : "document";

      whatsappMessageType = localMessageType;

      mediaPayload = {
        url: uploaded.url,
        media_url: uploaded.url,
        path: uploaded.path,
        media_path: uploaded.path,
        filename: uploaded.filename,
        media_filename: uploaded.filename,
        mime_type: uploaded.mimeType,
        media_mime_type: uploaded.mimeType,
        size: uploaded.size,
        media_size: uploaded.size
      };
    }

    const previewText =
      text ||
      (localMessageType === "image"
        ? "Imagen enviada"
        : localMessageType === "audio"
          ? "Audio enviado"
          : localMessageType === "document"
            ? "Archivo enviado"
            : "");

    const { data: insertedMessage, error: insertError } = await supabase
      .from("mensajes")
      .insert({
        conversacion_id: selectedConversation.id,
        direction: "out",
        type: localMessageType,
        text: text || null,
        media: mediaPayload,
        reply_to_id: replyToMessage?.id || null,
        forwarded: false,
        status: "pending",
        error: null,
        wa_message_id: null,
        sender_profile_id: userId,
        deleted_at: null,
        delivered_at: null,
        read_at: null,
        wa_timestamp: now,
        sender_kind: "humano"
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message || "No se pudo crear el mensaje.");
    }

    const messageId = insertedMessage.id as string;

    await supabase
      .from("conversaciones")
      .update({
        last_message_at: now,
        last_outbound_message_at: now,
        last_message_preview: previewText,
        estado_gestion: "en_gestion",
        updated_at: now
      })
      .eq("id", selectedConversation.id);

    setComposerText("");
    setReplyToMessage(null);
    setShowEmojiPanel(false);
    setShowQuickRepliesPanel(false);
    clearPendingAttachment();
    setIsDraggingFile(false);

    shouldStickToBottomRef.current = true;
    await loadConversationDetail(selectedConversation.id, { forceBottom: true });

    const { data: sendData, error: sendError } = await supabase.functions.invoke(
      "whatsapp-send-message",
      {
        body: {
          conversacion_id: selectedConversation.id,
          conversation_id: selectedConversation.id,
          message_id: messageId,
          local_message_id: messageId,
          to: selectedConversation.wa_phone,
          wa_phone: selectedConversation.wa_phone,
          text: captionText,

          // Si es audio, WhatsApp debe recibir type: audio, no document.
          message_type: whatsappMessageType,

          media_url: mediaPayload?.media_url || null,

          // Si es audio, enviamos un MIME limpio aceptado por Meta.
          media_mime_type:
            localMessageType === "audio"
              ? getCleanAudioMimeForMeta(String(mediaPayload?.media_mime_type || "audio/ogg"))
              : mediaPayload?.media_mime_type || null,

          media_filename:
            localMessageType === "audio"
              ? mediaPayload?.media_filename || "audio.ogg"
              : mediaPayload?.media_filename || null,

          reply_to_whatsapp_message_id: replyToMessage?.wa_message_id || null,
          sender_profile_id: userId,
          show_agent_name: showAgentName
        }
      }
    );

    if (sendError) {
      await supabase
        .from("mensajes")
        .update({
          status: "failed",
          error: sendError.message || "No se pudo enviar el mensaje por WhatsApp."
        })
        .eq("id", messageId);

      setError(sendError.message || "No se pudo enviar el mensaje por WhatsApp.");
      await loadData();
      await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
      setActionLoading(false);
      return;
    }

    if (!sendData?.ok) {
      const errorMessage = sendData?.error || "WhatsApp rechazó el envío del mensaje.";

      await supabase
        .from("mensajes")
        .update({
          status: "failed",
          error: errorMessage
        })
        .eq("id", messageId);

      setError(errorMessage);
      await loadData();
      await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
      setActionLoading(false);
      return;
    }

    await loadData();
    await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
    setActionLoading(false);
  } catch (err) {
    setError(err instanceof Error ? err.message : "No se pudo preparar el archivo.");
    setActionLoading(false);
  }
}

  async function deleteMessage(message: Mensaje) {
    setActionLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("mensajes")
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq("id", message.id);

    if (updateError) {
      setError(updateError.message || "No se pudo eliminar el mensaje.");
      setActionLoading(false);
      return;
    }

    setOpenMessageMenuId(null);

    if (selectedConversation) {
      await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
    }

    setActionLoading(false);
  }

  async function handleReaction(message: Mensaje, emoji: string) {
    setOpenMessageMenuId(null);
    setError(null);

    const userId = await getUserId();

    const existing = reacciones.find(
      (reaccion) => reaccion.mensaje_id === message.id && reaccion.autor_id === userId
    );

    if (existing) {
      await supabase.from("mensaje_reacciones").delete().eq("id", existing.id);
    }

    const { error: insertError } = await supabase.from("mensaje_reacciones").insert({
      mensaje_id: message.id,
      autor_id: userId,
      emoji
    });

    if (insertError) {
      setError(insertError.message || "No se pudo guardar la reacción.");
      return;
    }

    if (message.wa_message_id && message.direction === "in") {
      await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          conversacion_id: selectedConversation?.id || message.conversacion_id,
          to: selectedConversation?.wa_phone || null,
          reaction_emoji: emoji,
          reaction_to_whatsapp_message_id: message.wa_message_id
        }
      });
    }

    if (selectedConversation) {
      await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
    }
  }

  function handleForward(message: Mensaje) {
    setStatus("Reenvío preparado para próxima fase.");
    setOpenMessageMenuId(null);
    console.info("forward_pending", message);
  }

  function handleReply(message: Mensaje) {
    setReplyToMessage(message);
    setOpenMessageMenuId(null);
  }

  function handleFileButtonClick(kind: "file" | "image") {
    if (kind === "image") {
      imageInputRef.current?.click();
      return;
    }

    fileInputRef.current?.click();
  }

  async function startAudioRecording() {
  if (audioRecording) return;

  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    setError("Este navegador no permite grabar audio.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferredMimeType = getRecorderMimeType();

    const recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const recordedMimeType =
        recorder.mimeType ||
        preferredMimeType ||
        "audio/webm";

      const extension = getAudioExtension(recordedMimeType);

      const finalMimeType =
        getCleanAudioMimeForMeta(recordedMimeType) ||
        recordedMimeType ||
        "audio/webm";

      const blob = new Blob(chunks, {
        type: finalMimeType
      });

      const file = new File([blob], `audio-${Date.now()}.${extension}`, {
        type: finalMimeType
      });

      setAttachmentFromFile(file);

      stream.getTracks().forEach((track) => track.stop());
      setAudioRecording(false);
      audioRecorderRef.current = null;

      if (!canSendAsWhatsappAudio(finalMimeType)) {
        setStatus("Audio grabado. Si WhatsApp no acepta el formato, revisaremos conversión luego.");
      } else {
        setStatus("Audio listo para enviar.");
      }
    };

    audioRecorderRef.current = recorder;
    recorder.start();

    setAudioRecording(true);
    setError(null);
    setStatus("Grabando audio...");
  } catch (err) {
    setError(err instanceof Error ? err.message : "No se pudo iniciar la grabación.");
    setAudioRecording(false);
  }
}

function stopAudioRecording() {
  const recorder = audioRecorderRef.current;

  if (!recorder || recorder.state === "inactive") {
    setAudioRecording(false);
    return;
  }

  recorder.stop();
}

function handleMicButtonClick() {
  if (audioRecording) {
    stopAudioRecording();
    return;
  }

  void startAudioRecording();
}

  async function syncWhatsappTemplates() {
    setTemplateSyncing(true);
    setError(null);
    setStatus(null);

    const { data, error: syncError } = await supabase.functions.invoke("whatsapp-sync-templates", {
      body: {}
    });

    if (syncError) {
      setError(syncError.message || "No se pudieron sincronizar las plantillas.");
      setTemplateSyncing(false);
      return;
    }

    if (!data?.ok) {
      setError(data?.error || "Meta rechazó la sincronización de plantillas.");
      setTemplateSyncing(false);
      return;
    }

    setStatus(`Plantillas sincronizadas: ${data.synced || 0}.`);
    await loadWhatsappTemplates();
    setTemplateSyncing(false);
  }

  function openNewConversationModal() {
    if (activeWhatsappTemplates.length === 0) {
      setError("No hay plantillas activas sincronizadas desde Meta.");
      return;
    }

    const firstTemplate = activeWhatsappTemplates[0];

    setNewConversationPhone("");
    setNewConversationName("");
    setNewConversationTemplateId(firstTemplate.id);
    setNewConversationVariables({});
    setNewConversationOpen(true);
  }

  function handleTemplateButton() {
    if (!selectedConversation) return;

    if (activeWhatsappTemplates.length === 0) {
      setError("No hay plantillas activas sincronizadas desde Meta.");
      return;
    }

    const firstTemplate = activeWhatsappTemplates[0];

    setSelectedTemplateId(firstTemplate.id);
    setTemplateVariables({});
    setTemplateModalOpen(true);
  }

  async function sendNewConversationTemplate() {
    if (!newConversationTemplate) return;

    const phone = normalizePhoneForLiveNos(newConversationPhone);
    const phonePlus = normalizePhoneWithPlus(newConversationPhone);
    const name = newConversationName.trim() || phonePlus || phone;

    if (!phone) {
      setError("Ingresá un teléfono válido.");
      return;
    }

    setNewConversationSending(true);
    setActionLoading(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    if (!userId) {
      setError("No se pudo identificar el usuario actual.");
      setNewConversationSending(false);
      setActionLoading(false);
      return;
    }

    const variables = newConversationTemplate.variables.map((variable, index) => {
      const numericKey = String(index + 1);
      return newConversationVariables[numericKey] || newConversationVariables[variable] || "";
    });

    const now = new Date().toISOString();

    try {
      const existingContactRes = await supabase
        .from("contactos_wa")
        .select("*")
        .or(`wa_phone.eq.${phonePlus},wa_phone.eq.${phone}`)
        .limit(1)
        .maybeSingle();

      if (existingContactRes.error) {
        throw new Error(existingContactRes.error.message || "No se pudo buscar el contacto.");
      }

      let contactoId = existingContactRes.data?.id as string | undefined;

      if (!contactoId) {
        const insertContactRes = await supabase
          .from("contactos_wa")
          .insert({
            wa_phone: phonePlus,
            display_name: name,
            profile_name: name,
            avatar_url: null
          })
          .select("id")
          .single();

        if (insertContactRes.error) {
          throw new Error(insertContactRes.error.message || "No se pudo crear el contacto.");
        }

        contactoId = insertContactRes.data.id as string;
      } else if (newConversationName.trim()) {
        await supabase
          .from("contactos_wa")
          .update({
            display_name: name
          })
          .eq("id", contactoId);
      }

      const existingConversationRes = await supabase
        .from("conversaciones")
        .select("*")
        .eq("contacto_id", contactoId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingConversationRes.error) {
        throw new Error(existingConversationRes.error.message || "No se pudo buscar la conversación.");
      }

      let conversationId = existingConversationRes.data?.id as string | undefined;

      if (!conversationId) {
        const insertConversationRes = await supabase
          .from("conversaciones")
          .insert({
            contacto_id: contactoId,
            assigned_to: userId,
            inbox: "vendedor",
            status: "open",
            priority: 0,
            unread_count: 0,
            last_message_at: now,
            last_message_preview: newConversationPreview,
            window_expires_at: null,
            wa_phone: phonePlus,
            last_outbound_message_at: now,
            whatsapp_24h_expires_at: null,
            estado_gestion: "en_gestion",
            estado_comercial: "NUEVO",
            subject: name,
            titulo: name,
            channel: "whatsapp",
            metadata: {
              source: "livenos_new_conversation",
              created_from_template: newConversationTemplate.name
            },
            tomada_at: now,
            tomada_by: userId
          })
          .select("id")
          .single();

        if (insertConversationRes.error) {
          throw new Error(insertConversationRes.error.message || "No se pudo crear la conversación.");
        }

        conversationId = insertConversationRes.data.id as string;
      }

      const insertMessageRes = await supabase
        .from("mensajes")
        .insert({
          conversacion_id: conversationId,
          direction: "out",
          type: "template",
          text: newConversationPreview,
          media: null,
          reply_to_id: null,
          forwarded: false,
          status: "pending",
          error: null,
          wa_message_id: null,
          sender_profile_id: userId,
          deleted_at: null,
          delivered_at: null,
          read_at: null,
          wa_timestamp: now,
          sender_kind: "humano"
        })
        .select("id")
        .single();

      if (insertMessageRes.error) {
        throw new Error(insertMessageRes.error.message || "No se pudo crear el mensaje.");
      }

      const messageId = insertMessageRes.data.id as string;

      const { data: sendData, error: sendError } = await supabase.functions.invoke(
        "whatsapp-send-message",
        {
          body: {
            conversacion_id: conversationId,
            conversation_id: conversationId,
            message_id: messageId,
            local_message_id: messageId,
            to: phone,
            wa_phone: phone,
            text: newConversationPreview,
            template_name: newConversationTemplate.name,
            template_language: newConversationTemplate.language,
            template_variables: variables,
            sender_profile_id: userId,
            show_agent_name: false
          }
        }
      );

      if (sendError || !sendData?.ok) {
        const errorMessage =
          sendError?.message || sendData?.error || "WhatsApp rechazó la plantilla.";

        await supabase
          .from("mensajes")
          .update({
            status: "failed",
            error: errorMessage
          })
          .eq("id", messageId);

        throw new Error(errorMessage);
      }

      await supabase
        .from("conversaciones")
        .update({
          last_message_at: now,
          last_outbound_message_at: now,
          last_message_preview: newConversationPreview,
          estado_gestion: "en_gestion",
          updated_at: now
        })
        .eq("id", conversationId);

      setNewConversationOpen(false);
      setNewConversationPhone("");
      setNewConversationName("");
      setNewConversationTemplateId(null);
      setNewConversationVariables({});
      setStatus("Nueva conversación iniciada.");

      await loadData();

      setSelectedId(conversationId);
      selectedIdRef.current = conversationId;
      shouldStickToBottomRef.current = true;
      await loadConversationDetail(conversationId, { forceBottom: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la conversación.");
    }

    setNewConversationSending(false);
    setActionLoading(false);
  }

  async function sendTemplateMessage() {
    if (!selectedConversation || !selectedWhatsappTemplate) return;

    setTemplateSending(true);
    setActionLoading(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    if (!userId) {
      setError("No se pudo identificar el usuario actual.");
      setTemplateSending(false);
      setActionLoading(false);
      return;
    }

    const variables = selectedWhatsappTemplate.variables.map((variable, index) => {
      const numericKey = String(index + 1);
      return templateVariables[numericKey] || templateVariables[variable] || "";
    });

    const now = new Date().toISOString();

    const { data: insertedMessage, error: insertError } = await supabase
      .from("mensajes")
      .insert({
        conversacion_id: selectedConversation.id,
        direction: "out",
        type: "template",
        text: templatePreview,
        media: null,
        reply_to_id: null,
        forwarded: false,
        status: "pending",
        error: null,
        wa_message_id: null,
        sender_profile_id: userId,
        deleted_at: null,
        delivered_at: null,
        read_at: null,
        wa_timestamp: now,
        sender_kind: "humano"
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message || "No se pudo crear el mensaje de plantilla.");
      setTemplateSending(false);
      setActionLoading(false);
      return;
    }

    const messageId = insertedMessage.id as string;

    const { data: sendData, error: sendError } = await supabase.functions.invoke(
      "whatsapp-send-message",
      {
        body: {
          conversacion_id: selectedConversation.id,
          conversation_id: selectedConversation.id,
          message_id: messageId,
          local_message_id: messageId,
          to: selectedConversation.wa_phone,
          wa_phone: selectedConversation.wa_phone,
          text: templatePreview,
          template_name: selectedWhatsappTemplate.name,
          template_language: selectedWhatsappTemplate.language,
          template_variables: variables,
          sender_profile_id: userId,
          show_agent_name: false
        }
      }
    );

    if (sendError || !sendData?.ok) {
      const errorMessage =
        sendError?.message || sendData?.error || "WhatsApp rechazó la plantilla.";

      await supabase
        .from("mensajes")
        .update({
          status: "failed",
          error: errorMessage
        })
        .eq("id", messageId);

      setError(errorMessage);
      await loadConversationDetail(selectedConversation.id, { preserveScroll: true });
      setTemplateSending(false);
      setActionLoading(false);
      return;
    }

    await supabase
      .from("conversaciones")
      .update({
        last_message_at: now,
        last_outbound_message_at: now,
        last_message_preview: templatePreview,
        estado_gestion: "en_gestion",
        updated_at: now
      })
      .eq("id", selectedConversation.id);

    setTemplateModalOpen(false);
    setSelectedTemplateId(null);
    setTemplateVariables({});
    setStatus("Plantilla enviada.");
    shouldStickToBottomRef.current = true;

    await loadData();
    await loadConversationDetail(selectedConversation.id, { forceBottom: true });

    setTemplateSending(false);
    setActionLoading(false);
  }

    function getAttachmentKind(file: File): PendingAttachment["kind"] {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    return "document";
  }

  function setAttachmentFromFile(file: File | null) {
    if (!file) return;

    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    const kind = getAttachmentKind(file);
    const previewUrl = kind === "image" || kind === "audio" ? URL.createObjectURL(file) : null;

    setPendingAttachment({
      file,
      previewUrl,
      kind
    });

    setStatus(null);
    setError(null);
  }

  function clearPendingAttachment() {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    setPendingAttachment(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function getSafeStorageName(file: File): string {
    const cleanName = file.name
      .replace(/[^\w.\-áéíóúÁÉÍÓÚñÑ ]/g, "")
      .replace(/\s+/g, "-")
      .trim()
      .slice(0, 120);

    return cleanName || `archivo-${Date.now()}`;
  }

  async function uploadAttachmentToStorage(params: {
    conversationId: string;
    attachment: PendingAttachment;
  }) {
    const safeName = getSafeStorageName(params.attachment.file);
    const path = `whatsapp-outbound/${params.conversationId}/${Date.now()}-${safeName}`;

    const uploadRes = await supabase.storage
      .from("comunicaciones-media")
      .upload(path, params.attachment.file, {
        contentType: params.attachment.file.type || "application/octet-stream",
        cacheControl: "3600",
        upsert: false
      });

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message || "No se pudo subir el archivo.");
    }

    const publicRes = supabase.storage.from("comunicaciones-media").getPublicUrl(path);

    return {
      path,
      url: publicRes.data.publicUrl,
      filename: params.attachment.file.name,
      mimeType: params.attachment.file.type || "application/octet-stream",
      size: params.attachment.file.size
    };
  }

  function handleSelectedFile(file: File | null, source: "file" | "image" = "file") {
    setAttachmentFromFile(file);

    if (source === "image" && imageInputRef.current) {
      imageInputRef.current.value = "";
    }

    if (source === "file" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function getFileFromDataTransfer(dataTransfer: DataTransfer): File | null {
    const files = Array.from(dataTransfer.files || []);
    return files.length > 0 ? files[0] : null;
  }

  function handleChatDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedConversation) return;

    setIsDraggingFile(true);
  }

  function handleChatDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const currentTarget = event.currentTarget;
    const relatedTarget = event.relatedTarget as Node | null;

    if (relatedTarget && currentTarget.contains(relatedTarget)) return;

    setIsDraggingFile(false);
  }

  function handleChatDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    setIsDraggingFile(false);

    if (!selectedConversation) return;

    const file = getFileFromDataTransfer(event.dataTransfer);

    if (!file) {
      setError("No se detectó ningún archivo para adjuntar.");
      return;
    }

    setAttachmentFromFile(file);
  }

  function handleComposerPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const items = Array.from(event.clipboardData?.items || []);
    const fileItem = items.find((item) => item.kind === "file");
    const file = fileItem?.getAsFile() || null;

    if (!file) return;

    event.preventDefault();
    setAttachmentFromFile(file);
  }

  function openMediaPreview(message: Mensaje) {
  const url = getMessageMediaUrl(message);

  if (!url) return;

  const name = getMessageMediaName(message);
  const mime = getMessageMediaMime(message);
  const type = isImageMessage(message) ? "image" : isAudioMessage(message) ? "audio" : "file";

  setPreviewMedia({
    url,
    name,
    mime,
    type
  });
}

  function openMediaInNewTab(message: Mensaje) {
    const mediaUrl = getMessageMediaUrl(message);

    if (!mediaUrl) return;

    window.open(mediaUrl, "_blank", "noopener,noreferrer");
  }

  function openNiaFromLiveNos() {
    const detail = selectedConversation
      ? {
          source: "livenos",
          conversation_id: selectedConversation.id,
          wa_phone: selectedConversation.wa_phone,
          contacto: getDisplayName(selectedContacto, selectedConversation),
          oportunidad_id: selectedOportunidad?.id || null,
          created_at: new Date().toISOString()
        }
      : {
          source: "livenos",
          created_at: new Date().toISOString()
        };

    window.localStorage.setItem("nostur_nia_context", JSON.stringify(detail));

    window.dispatchEvent(
      new CustomEvent("nostur:open-nia-chat", {
        detail
      })
    );
  }



  function renderMessageMenu(message: Mensaje) {
    const mediaUrl = getMessageMediaUrl(message);

    return (
      <div
        className="absolute right-0 top-8 z-40 w-[230px] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-black/10 p-2">
          <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
            Reaccionar
          </div>

          <div className="flex gap-1">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReaction(message, emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-base hover:bg-[#f1f5f9]"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleReply(message)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-[#475569] hover:bg-[#f8fafc]"
        >
          <Reply size={14} />
          Responder
        </button>

        <button
          type="button"
          onClick={() => handleForward(message)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-[#475569] hover:bg-[#f8fafc]"
        >
          <Send size={14} />
          Reenviar
        </button>

        {mediaUrl ? (
          <>
            <button
              type="button"
              onClick={() => {
                openMediaPreview(message);
                setOpenMessageMenuId(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-[#475569] hover:bg-[#f8fafc]"
            >
              <Eye size={14} />
              Vista rápida
            </button>

            <button
              type="button"
              onClick={() => {
                openMediaInNewTab(message);
                setOpenMessageMenuId(null);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-[#475569] hover:bg-[#f8fafc]"
            >
              <FileText size={14} />
              Abrir en pestaña
            </button>

            <a
              href={mediaUrl}
              download={getMessageMediaName(message)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpenMessageMenuId(null)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-[#475569] hover:bg-[#f8fafc]"
            >
              <Download size={14} />
              Descargar archivo
            </a>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => deleteMessage(message)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-black text-red-600 hover:bg-red-50"
        >
          <Trash2 size={14} />
          Eliminar
        </button>
      </div>
    );
  }

  function renderReactions(message: Mensaje) {
    const messageReactions = reaccionesByMensaje[message.id] || [];

    if (messageReactions.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {messageReactions.map((reaction) => (
          <span
            key={reaction.id}
            className="rounded-full bg-white/75 px-2 py-0.5 text-xs shadow-sm ring-1 ring-black/5"
          >
            {reaction.emoji}
          </span>
        ))}
      </div>
    );
  }

  function renderMediaPreviewModal() {
    if (!previewMedia) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f172a]/70 p-4 backdrop-blur-sm">
        <div className="flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-[30px] bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-[#142033]">{previewMedia.name}</h3>
              <p className="text-xs font-bold text-[#64748b]">{previewMedia.mime || "archivo"}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => window.open(previewMedia.url, "_blank", "noopener,noreferrer")}
                className="rounded-2xl bg-[#f1f5f9] px-3 py-2 text-xs font-black text-[#475569] hover:bg-[#e2e8f0]"
              >
                Abrir
              </button>

              <a
                href={previewMedia.url}
                download={previewMedia.name}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-[#4f7c90] px-3 py-2 text-xs font-black text-white hover:bg-[#406b7d]"
              >
                Descargar
              </a>

              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
              >
                Cerrar
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto bg-[#f8fafc] p-4">
            {previewMedia.type === "image" ? (
              <img
                src={previewMedia.url}
                alt={previewMedia.name}
                className="mx-auto max-h-[72vh] max-w-full rounded-2xl object-contain shadow-sm"
              />
            ) : previewMedia.type === "audio" ? (
              <div className="mx-auto max-w-[620px] rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-black/10">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90]">
                    <Mic size={24} />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-[#142033]">{previewMedia.name}</div>
                    <div className="text-xs font-bold text-[#64748b]">Audio recibido</div>
                  </div>
                </div>

                <audio controls className="w-full" src={previewMedia.url}>
                  Tu navegador no puede reproducir este audio.
                </audio>
              </div>
            ) : (
              <div className="mx-auto max-w-[620px] rounded-[26px] bg-white p-5 text-center shadow-sm ring-1 ring-black/10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90]">
                  <FileText size={28} />
                </div>

                <div className="text-sm font-black text-[#142033]">{previewMedia.name}</div>
                <div className="mt-1 text-xs font-bold text-[#64748b]">
                  Este archivo se abre en una pestaña nueva del navegador.
                </div>

                <button
                  type="button"
                  onClick={() => window.open(previewMedia.url, "_blank", "noopener,noreferrer")}
                  className="mt-4 rounded-2xl bg-[#4f7c90] px-4 py-2 text-xs font-black text-white hover:bg-[#406b7d]"
                >
                  Abrir archivo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderMessageBubble(message: Mensaje) {
    const role = getMessageRole(message);
    const outbound = role !== "passenger";
    const mediaUrl = getMessageMediaUrl(message);
    const mediaMime = getMessageMediaMime(message);
    const mediaName = getMessageMediaName(message);
    const mediaSize = getMessageMediaSize(message);
    const isImage = isImageMessage(message);
    const isAudio = isAudioMessage(message);
    const isAi = role === "cande" || role === "nia";
    const menuOpen = openMessageMenuId === message.id;

    const bubbleClass =
      role === "cande"
        ? "rounded-br-md bg-gradient-to-br from-[#8b2cff] to-[#b14cff] text-white ring-purple-200"
        : role === "nia"
          ? "rounded-br-md bg-gradient-to-br from-[#ff2f76] to-[#b14cff] text-white ring-pink-200"
          : role === "agent"
            ? "rounded-br-md bg-[#4f7c90] text-white ring-[#4f7c90]/20"
            : role === "system"
              ? "mx-auto bg-amber-50 text-amber-800 ring-amber-100"
              : "rounded-bl-md bg-white text-[#172033] ring-black/5";

    return (
      <article
        key={message.id}
        className={[
          "flex w-full px-1",
          role === "system" ? "justify-center" : outbound ? "justify-end" : "justify-start"
        ].join(" ")}
      >
        <div
          className={[
            "relative max-w-[76%] rounded-[22px] px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm ring-1 transition",
            bubbleClass,
            message.status === "failed" ? "ring-red-200" : ""
          ].join(" ")}
        >
          <div className={["absolute top-2", outbound ? "-left-10" : "-right-10"].join(" ")}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpenMessageMenuId((current) => (current === message.id ? null : message.id));
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-[#64748b] shadow-sm hover:bg-[#f8fafc] hover:text-[#142033]"
              title="Acciones del mensaje"
            >
              <MoreVertical size={15} />
            </button>

            {menuOpen ? renderMessageMenu(message) : null}
          </div>

          {role === "cande" ? (
            <div className="mb-1 flex items-center gap-1 text-xs font-black text-white/90">
              <Sparkles size={12} />
              Cande · IA
            </div>
          ) : null}

          {role === "nia" ? (
            <div className="mb-1 flex items-center gap-1 text-xs font-black text-white/90">
              <Sparkles size={12} />
              NIA · Asistente
            </div>
          ) : null}

          {role === "agent" && showAgentName ? (
            <div className="mb-1 text-[11px] font-black text-white/75">
              {getMessageSenderName(message, profiles)}
            </div>
          ) : null}

          {mediaUrl ? (
            <div className="mb-2 overflow-hidden rounded-2xl bg-black/5">
              {isImage ? (
                <div className="overflow-hidden rounded-2xl bg-white/20">
                  <button type="button" onClick={() => openMediaPreview(message)} className="block w-full">
                    <img src={mediaUrl} alt={mediaName} className="max-h-72 w-full min-w-[220px] object-cover" />
                  </button>
                </div>
              ) : isAudio ? (
                <div className={["rounded-2xl p-3", outbound ? "bg-white/15" : "bg-white"].join(" ")}>
                  <div className="mb-2 flex items-center gap-2">
                    <Mic size={16} />
                    <span className="truncate text-xs font-black">{mediaName}</span>
                  </div>

                  <audio controls className="w-full" src={mediaUrl}>
                    Tu navegador no puede reproducir este audio.
                  </audio>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openMediaInNewTab(message)}
                  className={[
                    "flex min-w-[240px] items-center gap-3 rounded-2xl px-3 py-3 text-left shadow-sm ring-1 ring-black/5",
                    outbound ? "bg-white/15 text-white" : "bg-white text-[#142033]"
                  ].join(" ")}
                >
                  <div
                    className={[
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                      outbound ? "bg-white/15 text-white" : "bg-[#eef6f7] text-[#4f7c90]"
                    ].join(" ")}
                  >
                    <FileText size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-black">{mediaName}</div>

                    <div className={["mt-0.5 text-[10px] font-bold", outbound ? "text-white/70" : "text-[#94a3b8]"].join(" ")}>
                      {mediaMime || "archivo"}
                      {mediaSize ? ` · ${formatFileSize(mediaSize)}` : ""}
                    </div>
                  </div>

                  <Download size={16} className="shrink-0 opacity-80" />
                </button>
              )}
            </div>
          ) : null}

          <div className="whitespace-pre-wrap break-words">{message.text || `[${message.type}]`}</div>

          <div
            className={[
              "mt-2 flex items-center gap-2 text-[10px] font-black",
              outbound ? "justify-end text-white/75" : "justify-start text-[#94a3b8]"
            ].join(" ")}
          >
            {role === "passenger" ? (
              <span className="rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#94a3b8]">
                pasajero
              </span>
            ) : null}

            <span>{formatDateTime(message.wa_timestamp || message.created_at)}</span>

            {outbound ? <MessageStatusIcon message={message} /> : null}
          </div>

          {renderReactions(message)}

          {isAi ? (
            <div className="mt-2 flex items-center gap-2 text-white/80">
              <button
                type="button"
                onClick={() => handleReaction(message, "👍")}
                className="rounded-xl p-1 hover:bg-white/15"
                title="Buen mensaje"
              >
                👍
              </button>
              <button
                type="button"
                onClick={() => handleReaction(message, "👎")}
                className="rounded-xl p-1 hover:bg-white/15"
                title="Mal mensaje"
              >
                👎
              </button>
            </div>
          ) : null}

          {message.status === "failed" && message.error ? (
            <div className="mt-2 rounded-xl border border-red-100 bg-red-50 px-2 py-1 text-[10px] font-bold leading-relaxed text-red-700">
              {message.error}
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  function renderInternalBubble(nota: NotaConversacion) {
    const visual = getNotaVisual(nota);

    return (
      <article key={nota.id} className="flex w-full justify-end px-1">
        <div
          className={[
            "max-w-[76%] rounded-[22px] rounded-br-md border px-4 py-3 text-sm font-semibold leading-relaxed shadow-sm",
            visual.bubbleClass
          ].join(" ")}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]",
                visual.chipClass
              ].join(" ")}
            >
              {visual.icon}
              {visual.label}
            </span>
          </div>

          <div className="whitespace-pre-wrap break-words">{nota.contenido}</div>

          <div className="mt-2 text-right text-[10px] font-black opacity-60">
            {formatDateTime(nota.created_at)}
          </div>
        </div>
      </article>
    );
  }

  function renderTimelineItem(item: TimelineItem) {
    if (item.kind === "message") return renderMessageBubble(item.message);
    return renderInternalBubble(item.nota);
  }

  function renderRightTabs() {
    const tabs: { id: RightTab; label: string }[] = [
      { id: "info", label: "Datos" },
      { id: "tareas", label: "Tareas" },
      { id: "historial", label: "Historial" }
    ];

    return (
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#f1f5f9] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setRightTab(tab.id)}
            className={[
              "rounded-xl px-2 py-2 text-[10px] font-black",
              rightTab === tab.id ? "bg-white text-[#4f7c90] shadow-sm" : "text-[#64748b]"
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderTemplateModal() {
    if (!templateModalOpen || !selectedConversation) return null;

    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-[620px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
            <div>
              <h3 className="text-lg font-black text-[#142033]">Enviar plantilla WhatsApp</h3>
              <p className="mt-1 text-xs font-bold text-[#64748b]">
                Se enviará a {getDisplayName(selectedContacto, selectedConversation)} ·{" "}
                {selectedConversation.wa_phone}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setTemplateModalOpen(false);
                setSelectedTemplateId(null);
                setTemplateVariables({});
              }}
              className="rounded-2xl bg-[#f1f5f9] px-3 py-2 text-xs font-black text-[#64748b] hover:bg-[#e2e8f0]"
            >
              Cerrar
            </button>
          </div>

          <div className="max-h-[72vh] overflow-auto p-5">
            <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
              Plantilla
            </label>

            <select
              value={selectedTemplateId || ""}
              onChange={(event) => {
                setSelectedTemplateId(event.target.value || null);
                setTemplateVariables({});
              }}
              className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold text-[#142033] outline-none focus:border-[#4f7c90]"
            >
              {activeWhatsappTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.display_name || template.name} · {template.language}
                </option>
              ))}
            </select>

            {selectedWhatsappTemplate ? (
              <>
                <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Pill>{selectedWhatsappTemplate.name}</Pill>
                    <Pill>{selectedWhatsappTemplate.language}</Pill>
                    {selectedWhatsappTemplate.category ? <Pill>{selectedWhatsappTemplate.category}</Pill> : null}
                  </div>

                  <div className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#142033]">
                    {selectedWhatsappTemplate.body}
                  </div>
                </div>

                {selectedWhatsappTemplate.variables.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                      Variables
                    </div>

                    {selectedWhatsappTemplate.variables.map((variable, index) => {
                      const numericKey = String(index + 1);

                      return (
                        <div key={`${variable}-${index}`}>
                          <label className="mb-1 block text-xs font-black text-[#475569]">
                            Variable {index + 1}{" "}
                            <span className="font-bold text-[#94a3b8]">({variable})</span>
                          </label>

                          <input
                            value={templateVariables[numericKey] || ""}
                            onChange={(event) =>
                              setTemplateVariables((current) => ({
                                ...current,
                                [numericKey]: event.target.value
                              }))
                            }
                            placeholder={`Valor para {{${index + 1}}}`}
                            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold text-[#142033] outline-none placeholder:text-[#94a3b8] focus:border-[#4f7c90]"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-[#4f7c90]/20 bg-[#eef6f7] p-4">
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#4f7c90]">
                    Vista previa
                  </div>

                  <div className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#142033]">
                    {templatePreview || "Completá las variables para ver la plantilla final."}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-[#f8fafc] px-5 py-4">
            <button
              type="button"
              onClick={syncWhatsappTemplates}
              disabled={templateSyncing}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-3 text-xs font-black text-[#64748b] ring-1 ring-black/10 hover:bg-[#f1f5f9] disabled:opacity-50"
            >
              {templateSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Sincronizar
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTemplateModalOpen(false);
                  setSelectedTemplateId(null);
                  setTemplateVariables({});
                }}
                className="h-10 rounded-2xl bg-white px-4 text-xs font-black text-[#64748b] ring-1 ring-black/10 hover:bg-[#f1f5f9]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={sendTemplateMessage}
                disabled={templateSending || !selectedWhatsappTemplate}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4f7c90] px-4 text-xs font-black text-white hover:bg-[#406b7d] disabled:opacity-50"
              >
                {templateSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar plantilla
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderNewConversationModal() {
    if (!newConversationOpen) return null;

    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0f172a]/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-[660px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
            <div>
              <h3 className="text-lg font-black text-[#142033]">Nueva conversación WhatsApp</h3>
              <p className="mt-1 text-xs font-bold text-[#64748b]">
                Para iniciar una conversación nueva necesitás enviar una plantilla aprobada por Meta.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewConversationOpen(false);
                setNewConversationPhone("");
                setNewConversationName("");
                setNewConversationTemplateId(null);
                setNewConversationVariables({});
              }}
              className="rounded-2xl bg-[#f1f5f9] px-3 py-2 text-xs font-black text-[#64748b] hover:bg-[#e2e8f0]"
            >
              Cerrar
            </button>
          </div>

          <div className="max-h-[72vh] overflow-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                  Teléfono WhatsApp
                </label>

                <input
                  value={newConversationPhone}
                  onChange={(event) => setNewConversationPhone(event.target.value)}
                  placeholder="Ej: 351..."
                  className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold text-[#142033] outline-none placeholder:text-[#94a3b8] focus:border-[#4f7c90]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                  Nombre pasajero
                </label>

                <input
                  value={newConversationName}
                  onChange={(event) => setNewConversationName(event.target.value)}
                  placeholder="Nombre visible en LiveNos"
                  className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold text-[#142033] outline-none placeholder:text-[#94a3b8] focus:border-[#4f7c90]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                Plantilla Meta
              </label>

              <select
                value={newConversationTemplateId || ""}
                onChange={(event) => {
                  setNewConversationTemplateId(event.target.value || null);
                  setNewConversationVariables({});
                }}
                className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold text-[#142033] outline-none focus:border-[#4f7c90]"
              >
                {activeWhatsappTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.display_name || template.name} · {template.language}
                  </option>
                ))}
              </select>
            </div>

            {newConversationTemplate ? (
              <>
                <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Pill>{newConversationTemplate.name}</Pill>
                    <Pill>{newConversationTemplate.language}</Pill>
                    {newConversationTemplate.category ? <Pill>{newConversationTemplate.category}</Pill> : null}
                  </div>

                  <div className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#142033]">
                    {newConversationTemplate.body}
                  </div>
                </div>

                {newConversationTemplate.variables.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                      Variables
                    </div>

                    {newConversationTemplate.variables.map((variable, index) => {
                      const numericKey = String(index + 1);

                      return (
                        <div key={`${variable}-${index}`}>
                          <label className="mb-1 block text-xs font-black text-[#475569]">
                            Variable {index + 1}{" "}
                            <span className="font-bold text-[#94a3b8]">({variable})</span>
                          </label>

                          <input
                            value={newConversationVariables[numericKey] || ""}
                            onChange={(event) =>
                              setNewConversationVariables((current) => ({
                                ...current,
                                [numericKey]: event.target.value
                              }))
                            }
                            placeholder={`Valor para {{${index + 1}}}`}
                            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm font-bold text-[#142033] outline-none placeholder:text-[#94a3b8] focus:border-[#4f7c90]"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-[#4f7c90]/20 bg-[#eef6f7] p-4">
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#4f7c90]">
                    Vista previa
                  </div>

                  <div className="whitespace-pre-wrap text-sm font-bold leading-relaxed text-[#142033]">
                    {newConversationPreview || "Completá las variables para ver la plantilla final."}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/10 bg-[#f8fafc] px-5 py-4">
            <button
              type="button"
              onClick={syncWhatsappTemplates}
              disabled={templateSyncing}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-white px-3 text-xs font-black text-[#64748b] ring-1 ring-black/10 hover:bg-[#f1f5f9] disabled:opacity-50"
            >
              {templateSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              Sincronizar
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewConversationOpen(false);
                  setNewConversationPhone("");
                  setNewConversationName("");
                  setNewConversationTemplateId(null);
                  setNewConversationVariables({});
                }}
                className="h-10 rounded-2xl bg-white px-4 text-xs font-black text-[#64748b] ring-1 ring-black/10 hover:bg-[#f1f5f9]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={sendNewConversationTemplate}
                disabled={newConversationSending || !newConversationTemplate}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4f7c90] px-4 text-xs font-black text-white hover:bg-[#406b7d] disabled:opacity-50"
              >
                {newConversationSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Iniciar conversación
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderRightPanelContent() {
    if (!selectedConversation) return null;

    if (rightTab === "info") {
      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="text-sm font-black text-[#142033]">Datos del contacto</h3>

            <div className="mt-3 space-y-2 text-xs font-bold text-[#475569]">
              <div>
                <span className="block text-[#94a3b8]">Nombre</span>
                <span className="text-[#142033]">
                  {getDisplayName(selectedContacto, selectedConversation)}
                </span>
              </div>

              <div>
                <span className="block text-[#94a3b8]">WhatsApp</span>
                <span className="text-[#142033]">{selectedConversation.wa_phone}</span>
              </div>

              <div>
                <span className="block text-[#94a3b8]">Canal</span>
                <span className="text-[#142033]">{selectedConversation.channel}</span>
              </div>

              <div>
                <span className="block text-[#94a3b8]">Último inbound</span>
                <span className="text-[#142033]">
                  {formatDateTime(selectedConversation.last_inbound_message_at)}
                </span>
              </div>

              <div>
                <span className="block text-[#94a3b8]">Último outbound</span>
                <span className="text-[#142033]">
                  {formatDateTime(selectedConversation.last_outbound_message_at)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="text-sm font-black text-[#142033]">Oportunidad</h3>

            {selectedOportunidad ? (
              <div className="mt-3 space-y-2 text-xs font-bold text-[#475569]">
                <div className="flex justify-between gap-3">
                  <span>Score</span>
                  <span className="font-black text-[#142033]">{selectedOportunidad.score}/100</span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Cande</span>
                  <span className="font-black text-[#142033]">
                    {selectedOportunidad.cande_activa ? "Activa" : "Pausada"}
                  </span>
                </div>

                <div className="flex justify-between gap-3">
                  <span>Estado</span>
                  <span className="font-black text-[#142033]">
                    {pipeline.find((item) => item.id === selectedOportunidad.estado_id)?.nombre || "—"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-3">
                  <div className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                    Datos relevados
                  </div>

                  <div className="space-y-1.5">
                    {["destino", "origen", "fecha", "pax", "presupuesto"].map((key) => (
                      <div key={key} className="flex justify-between gap-3">
                        <span className="capitalize">{key}</span>
                        <span className="max-w-[150px] truncate font-black text-[#142033]">
                          {getDato(selectedOportunidad.datos, key)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs font-bold text-[#64748b]">
                Esta conversación todavía no tiene oportunidad creada.
              </p>
            )}
          </section>
        </div>
      );
    }

    if (rightTab === "tareas") {
      return (
        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <h3 className="text-sm font-black text-[#142033]">Tareas y programados</h3>

          <div className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 p-3">
            <div className="mb-2 text-xs font-black text-sky-800">Programar mensaje al cliente</div>

            <textarea
              value={scheduledText}
              onChange={(event) => setScheduledText(event.target.value)}
              placeholder="Mensaje a programar para el cliente..."
              className="min-h-[82px] w-full resize-none rounded-2xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-[#142033] outline-none placeholder:text-[#94a3b8]"
            />

            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="mt-2 h-9 w-full rounded-2xl border border-sky-200 bg-white px-3 text-xs font-bold text-[#142033] outline-none"
            />

            <button
              type="button"
              onClick={() => addTaskItem("programar_envio_cliente")}
              disabled={actionLoading || !scheduledText.trim()}
              className="mt-2 h-9 w-full rounded-2xl bg-sky-400 text-xs font-black text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
            >
              Guardar programación
            </button>
          </div>

          <div className="mt-3 rounded-2xl border border-purple-100 bg-purple-50 p-3">
            <div className="mb-2 text-xs font-black text-purple-800">Recordatorio interno</div>

            <textarea
              value={reminderText}
              onChange={(event) => setReminderText(event.target.value)}
              placeholder="Recordatorio propio o para el equipo..."
              className="min-h-[82px] w-full resize-none rounded-2xl border border-purple-200 bg-white px-3 py-2 text-xs font-bold text-[#142033] outline-none placeholder:text-[#94a3b8]"
            />

            <input
              type="datetime-local"
              value={reminderFor}
              onChange={(event) => setReminderFor(event.target.value)}
              className="mt-2 h-9 w-full rounded-2xl border border-purple-200 bg-white px-3 text-xs font-bold text-[#142033] outline-none"
            />

            <button
              type="button"
              onClick={() => addTaskItem("recordatorio")}
              disabled={actionLoading || !reminderText.trim()}
              className="mt-2 h-9 w-full rounded-2xl bg-purple-400 text-xs font-black text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
            >
              Guardar recordatorio
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
        <h3 className="text-sm font-black text-[#142033]">Historial interno</h3>

        <div className="mt-3 space-y-2">
          {notas.filter((nota) => nota.tipo !== "mensaje_interno" && nota.tipo !== "nota").length === 0 ? (
            <div className="text-xs font-bold text-[#94a3b8]">Sin tareas ni programaciones.</div>
          ) : (
            notas
              .filter((nota) => nota.tipo !== "mensaje_interno" && nota.tipo !== "nota")
              .slice()
              .reverse()
              .map((nota) => {
                const visual = getNotaVisual(nota);

                return (
                  <div key={nota.id} className={["rounded-2xl border p-3", visual.bubbleClass].join(" ")}>
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] opacity-70">
                      {visual.icon}
                      {visual.label}
                    </div>

                    <div className="text-xs font-bold leading-relaxed">{nota.contenido}</div>

                    {nota.scheduled_for ? (
                      <div className="mt-2 text-[10px] font-black opacity-60">
                        Programado: {formatDateTime(nota.scheduled_for)}
                      </div>
                    ) : null}

                    <div className="mt-1 text-[10px] font-black opacity-60">
                      Creado: {formatDateTime(nota.created_at)}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      {renderTemplateModal()}
      {renderNewConversationModal()}
      {renderMediaPreviewModal()}

      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#edf3f7] text-[#142033]">
        <header className="shrink-0 border-b border-black/10 bg-white/80 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-black tracking-tight text-[#142033]">LiveNos</h1>
                <Pill>CRM + CANDE + NIA</Pill>
                <Pill>WhatsApp</Pill>
              </div>

              <p className="mt-1 text-sm font-semibold text-[#64748b]">
                Centro de conversaciones, oportunidades y asistencia comercial inteligente.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <HeaderButton onClick={loadData} disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                Actualizar
              </HeaderButton>

              <HeaderButton onClick={syncWhatsappTemplates} disabled={templateSyncing}>
                {templateSyncing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Sync plantillas
              </HeaderButton>

              <HeaderButton variant="primary" onClick={openNewConversationModal}>
                <MessageCircle size={14} />
                Nueva conversación
              </HeaderButton>
            </div>
          </div>

          {error ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-red-500">
                <XCircle size={16} />
              </button>
            </div>
          ) : null}

          {status ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
              {status}
            </div>
          ) : null}
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-[320px_410px_minmax(0,1fr)] gap-4 overflow-hidden p-4">
          <aside className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <section className="rounded-[26px] border border-black/10 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff2f76] to-[#8b2cff] text-white shadow-lg shadow-purple-500/20">
                  <Sparkles size={20} />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-black text-[#142033]">NIA interno</div>
                  <div className="truncate text-xs font-bold text-[#64748b]">
                    Pedime resúmenes, acciones o derivaciones.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={openNiaFromLiveNos}
                className="mt-3 h-10 w-full rounded-2xl bg-[#7c3aed] text-xs font-black text-white shadow-sm hover:bg-[#6d28d9]"
              >
                Abrir NIA
              </button>
            </section>

            <section className="min-h-0 flex-1 overflow-auto rounded-[26px] border border-black/10 bg-white/80 p-3 shadow-sm">
              <div className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
                Bandejas
              </div>

              <div className="space-y-1.5">
                {INBOXES.map((inbox) => (
                  <button
                    key={inbox.id}
                    type="button"
                    onClick={() => setActiveInbox(inbox.id)}
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
                        activeInbox === inbox.id ? "bg-white/20 text-white" : "bg-[#eef2f7] text-[#475569]"
                      ].join(" ")}
                    >
                      {inboxCounts[inbox.id] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="shrink-0 rounded-[26px] border border-black/10 bg-white/80 p-3 shadow-sm">
              <div className="mb-3 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#64748b]">
                Vendedores
              </div>

              <div className="space-y-1.5">
                {profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-2 rounded-2xl px-2 py-2 text-xs font-bold text-[#475569]"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: profile.color || "#4f7c90" }}
                    />
                    <span className="truncate">{getVendedorName(profile)}</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white/80 shadow-sm">
            <div className="shrink-0 border-b border-black/10 p-3">
              <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] px-3">
                <Search size={15} className="text-[#94a3b8]" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar conversación..."
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-[#142033] outline-none placeholder:text-[#94a3b8]"
                />
              </div>

              <div className="mt-2 text-xs font-bold text-[#64748b]">
                {filteredConversations.length} conversaciones en{" "}
                {INBOXES.find((item) => item.id === activeInbox)?.label}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-auto p-3">
              {loading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-[#4f7c90]" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <EmptyState
                  title="Sin conversaciones"
                  subtitle="Cuando ingresen mensajes por WhatsApp aparecerán en esta bandeja."
                />
              ) : (
filteredConversations.map((conv) => (
  <ConversationCard
    key={conv.id}
    conv={conv}
    selectedId={selectedId}
    onSelect={selectConversation}
  />
))              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white/80 shadow-sm">
            {!selectedConversation ? (
              <div className="flex h-full items-center justify-center p-8">
                <EmptyState
                  title="Seleccioná una conversación"
                  subtitle="Acá vas a ver el chat, datos del pasajero, oportunidad y acciones de Cande/NIA."
                />
              </div>
            ) : (
              <>
                <div className="shrink-0 border-b border-black/10 bg-white px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4f7c90] text-sm font-black text-white">
                          {getInitials(getDisplayName(selectedContacto, selectedConversation))}
                        </div>

                        <div className="min-w-0">
                          {editingContactName ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={contactNameDraft}
                                onChange={(event) => setContactNameDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    void saveContactDisplayName();
                                  }

                                  if (event.key === "Escape") {
                                    setEditingContactName(false);
                                    setContactNameDraft(getDisplayName(selectedContacto, selectedConversation));
                                  }
                                }}
                                className="h-9 min-w-[240px] rounded-2xl border border-[#4f7c90]/30 bg-white px-3 text-sm font-black text-[#142033] outline-none focus:border-[#4f7c90]"
                                autoFocus
                              />

                              <button
                                type="button"
                                onClick={saveContactDisplayName}
                                disabled={actionLoading}
                                className="h-9 rounded-2xl bg-[#4f7c90] px-3 text-xs font-black text-white hover:bg-[#406b7d] disabled:opacity-50"
                              >
                                Guardar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContactName(false);
                                  setContactNameDraft(getDisplayName(selectedContacto, selectedConversation));
                                }}
                                className="h-9 rounded-2xl bg-[#f1f5f9] px-3 text-xs font-black text-[#64748b] hover:bg-[#e2e8f0]"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setContactNameDraft(getDisplayName(selectedContacto, selectedConversation));
                                setEditingContactName(true);
                              }}
                              className="group flex max-w-full items-center gap-2 text-left"
                              title="Editar nombre del contacto"
                            >
                              <h2 className="truncate text-lg font-black text-[#142033]">
                                {getDisplayName(selectedContacto, selectedConversation)}
                              </h2>

                              <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-black text-[#94a3b8] opacity-0 transition group-hover:opacity-100">
                                Editar
                              </span>
                            </button>
                          )}

                          <p className="text-xs font-bold text-[#64748b]">
                            {selectedConversation.wa_phone} · {selectedConversation.channel}
                            {selectedContacto?.profile_name ? ` · WhatsApp: ${selectedContacto.profile_name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusPill conv={selectedConversation} />
                        <Pill>{getVendedorName(selectedVendedor)}</Pill>
                        <Pill>{getWindowRemainingLabel(selectedConversation)}</Pill>
                        {selectedOportunidad ? <Pill>Score {selectedOportunidad.score}</Pill> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!selectedConversation.assigned_to ? (
                        <HeaderButton onClick={takeConversation} disabled={actionLoading} variant="primary">
                          <UserCheck size={14} />
                          Tomar
                        </HeaderButton>
                      ) : null}

                      <HeaderButton onClick={toggleCande} disabled={actionLoading || !selectedOportunidad}>
                        <Bot size={14} />
                        {selectedOportunidad?.cande_activa ? "Pausar Cande" : "Activar Cande"}
                      </HeaderButton>

                      {selectedConversation.archived_at ||
                      selectedConversation.deleted_at ||
                      selectedConversation.closed_at ? (
                        <HeaderButton onClick={restoreConversation} disabled={actionLoading}>
                          <RefreshCcw size={14} />
                          Restaurar
                        </HeaderButton>
                      ) : (
                        <>
                          <HeaderButton onClick={closeConversation} disabled={actionLoading}>
                            <CheckCircle2 size={14} />
                            Cerrar
                          </HeaderButton>

                          <HeaderButton onClick={archiveConversation} disabled={actionLoading}>
                            <Archive size={14} />
                            Archivar
                          </HeaderButton>

                          <HeaderButton onClick={deleteConversation} disabled={actionLoading} variant="danger">
                            <Trash2 size={14} />
                            Eliminar
                          </HeaderButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_330px] overflow-hidden">
                  <div
                    className="relative flex min-h-0 flex-col overflow-hidden"
                    onDragOver={handleChatDragOver}
                    onDragLeave={handleChatDragLeave}
                    onDrop={handleChatDrop}
                  >
                    {isDraggingFile ? (
                      <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-[28px] border-2 border-dashed border-[#4f7c90]/50 bg-[#eef6f7]/85 backdrop-blur-sm">
                        <div className="rounded-[26px] bg-white px-6 py-5 text-center shadow-xl ring-1 ring-black/10">
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90]">
                            <Paperclip size={26} />
                          </div>

                          <div className="text-sm font-black text-[#142033]">
                            Soltá el archivo para adjuntarlo
                          </div>

                          <div className="mt-1 text-xs font-bold text-[#64748b]">
                            Imágenes como imagen · audios como audio · el resto como documento
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div
                      ref={timelineRef}
                      onScroll={updateStickToBottom}
                      className="min-h-0 flex-1 space-y-4 overflow-auto bg-[radial-gradient(circle_at_10%_10%,rgba(79,124,144,0.06),transparent_28%),linear-gradient(180deg,#eef6f7,#e8f0f2)] p-5"
                      onClick={() => {
                        if (openMessageMenuId) setOpenMessageMenuId(null);
                      }}
                    >
                      {timeline.length === 0 ? (
                        <EmptyState title="Sin mensajes" subtitle="No hay actividad cargada para esta conversación." />
                      ) : (
                        timeline.map((item) => renderTimelineItem(item))
                      )}
                    </div>

                    <div className="shrink-0 border-t border-black/10 bg-white p-4">
                      {replyToMessage ? (
                        <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-[#4f7c90]/20 bg-[#eef6f7] px-3 py-2">
                          <div className="min-w-0">
                            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-[#4f7c90]">
                              Respondiendo
                            </div>
                            <div className="truncate text-xs font-bold text-[#142033]">
                              {replyToMessage.text || `[${replyToMessage.type}]`}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setReplyToMessage(null)}
                            className="shrink-0 rounded-xl px-2 py-1 text-xs font-black text-[#64748b] hover:bg-white"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : null}

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(event) => handleSelectedFile(event.target.files?.[0] || null, "file")}
                      />

                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleSelectedFile(event.target.files?.[0] || null, "image")}
                      />

                      {pendingAttachment ? (
                        <div className="mb-3 rounded-2xl border border-[#4f7c90]/20 bg-[#eef6f7] p-3">
                          <div className="flex items-center gap-3">
                            {pendingAttachment.kind === "image" && pendingAttachment.previewUrl ? (
                              <img
                                src={pendingAttachment.previewUrl}
                                alt={pendingAttachment.file.name}
                                className="h-16 w-16 rounded-2xl object-cover"
                              />
                            ) : pendingAttachment.kind === "audio" && pendingAttachment.previewUrl ? (
                              <div className="min-w-0 flex-1 rounded-2xl bg-white p-3">
                                <div className="mb-2 text-xs font-black text-[#142033]">
                                  {pendingAttachment.file.name}
                                </div>
                                <audio controls className="w-full" src={pendingAttachment.previewUrl} />
                              </div>
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#4f7c90]">
                                <FileText size={24} />
                              </div>
                            )}

                            {pendingAttachment.kind !== "audio" ? (
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-black text-[#142033]">
                                  {pendingAttachment.file.name}
                                </div>

                                <div className="text-xs font-bold text-[#64748b]">
                                  {pendingAttachment.kind === "image" ? "Imagen" : "Archivo"} ·{" "}
                                  {formatFileSize(pendingAttachment.file.size)}
                                </div>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={clearPendingAttachment}
                              className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#64748b] hover:bg-[#f8fafc]"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2">
                        <ComposerIconButton
                          title="Emojis"
                          active={showEmojiPanel}
                          onClick={() => {
                            setShowEmojiPanel((current) => !current);
                            setShowQuickRepliesPanel(false);
                          }}
                        >
                          <Smile size={20} />
                        </ComposerIconButton>

                        <ComposerIconButton
                          title="Respuestas rápidas"
                          active={showQuickRepliesPanel}
                          onClick={() => {
                            setShowQuickRepliesPanel((current) => !current);
                            setShowEmojiPanel(false);
                          }}
                        >
                          <MessageCircle size={20} />
                        </ComposerIconButton>

                        <ComposerIconButton title="Acción rápida / IA" onClick={openNiaFromLiveNos}>
                          <Wand2 size={20} />
                        </ComposerIconButton>

                        <ComposerIconButton title="Enviar imagen" onClick={() => handleFileButtonClick("image")}>
                          <Image size={20} />
                        </ComposerIconButton>

                        <ComposerIconButton title="Adjuntar archivo" onClick={() => handleFileButtonClick("file")}>
                          <Paperclip size={20} />
                        </ComposerIconButton>

                        <div className="relative min-w-0 flex-1">
                          {showEmojiPanel ? (
                            <div className="absolute bottom-14 left-0 z-30 w-[360px] rounded-[24px] border border-black/10 bg-white p-3 shadow-2xl">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="text-xs font-black text-[#142033]">Emoticones</div>

                                <button
                                  type="button"
                                  onClick={() => setShowEmojiPanel(false)}
                                  className="rounded-full px-2 py-1 text-xs font-black text-[#94a3b8] hover:bg-[#f1f5f9]"
                                >
                                  Cerrar
                                </button>
                              </div>

                              <div className="space-y-3">
                                {EMOJI_GROUPS.map((group) => (
                                  <div key={group.label}>
                                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                                      {group.label}
                                    </div>

                                    <div className="grid grid-cols-12 gap-1">
                                      {group.emojis.map((emoji) => (
                                        <button
                                          key={`${group.label}-${emoji}`}
                                          type="button"
                                          onClick={() => {
                                            setComposerText((current) => `${current}${emoji}`);
                                          }}
                                          className="flex h-7 w-7 items-center justify-center rounded-lg text-lg hover:bg-[#f1f5f9]"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {showQuickRepliesPanel ? (
                            <div className="absolute bottom-14 left-0 z-30 w-[420px] rounded-[24px] border border-black/10 bg-white p-3 shadow-2xl">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-xs font-black text-[#142033]">Respuestas rápidas</div>
                                  <div className="text-[10px] font-bold text-[#94a3b8]">
                                    Insertan texto en el mensaje, no envían automáticamente.
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setShowQuickRepliesPanel(false)}
                                  className="rounded-full px-2 py-1 text-xs font-black text-[#94a3b8] hover:bg-[#f1f5f9]"
                                >
                                  Cerrar
                                </button>
                              </div>

                              <input
                                value={quickReplySearch}
                                onChange={(event) => setQuickReplySearch(event.target.value)}
                                placeholder="Buscar por título, categoría o atajo..."
                                className="mb-3 h-10 w-full rounded-2xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-bold text-[#142033] outline-none placeholder:text-[#94a3b8] focus:border-[#4f7c90]"
                              />

                              <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
                                {filteredQuickReplies.length === 0 ? (
                                  <div className="rounded-2xl bg-[#f8fafc] p-3 text-xs font-bold text-[#94a3b8]">
                                    No hay respuestas rápidas para esa búsqueda.
                                  </div>
                                ) : (
                                  filteredQuickReplies.map((reply) => (
                                    <button
                                      key={reply.id}
                                      type="button"
                                      onClick={() => insertQuickReply(reply)}
                                      className="w-full rounded-2xl border border-black/10 bg-white p-3 text-left hover:border-[#4f7c90]/40 hover:bg-[#f8fbfc]"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="truncate text-xs font-black text-[#142033]">
                                            {reply.titulo}
                                          </div>

                                          <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-relaxed text-[#64748b]">
                                            {reply.contenido}
                                          </div>
                                        </div>

                                        {reply.categoria ? (
                                          <span className="shrink-0 rounded-full bg-[#eef6f7] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#4f7c90]">
                                            {reply.categoria}
                                          </span>
                                        ) : null}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>

                              <div className="mt-3 rounded-2xl border border-dashed border-black/10 bg-[#f8fafc] p-3">
                                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8]">
                                  Crear nueva
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    value={quickReplyTitle}
                                    onChange={(event) => setQuickReplyTitle(event.target.value)}
                                    placeholder="Título"
                                    className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold outline-none"
                                  />

                                  <input
                                    value={quickReplyCategory}
                                    onChange={(event) => setQuickReplyCategory(event.target.value)}
                                    placeholder="Categoría"
                                    className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold outline-none"
                                  />
                                </div>

                                <textarea
                                  value={quickReplyContent}
                                  onChange={(event) => setQuickReplyContent(event.target.value)}
                                  placeholder="Texto de la respuesta rápida..."
                                  className="mt-2 min-h-[68px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold outline-none"
                                />

                                <button
                                  type="button"
                                  onClick={createQuickReply}
                                  disabled={actionLoading || !quickReplyTitle.trim() || !quickReplyContent.trim()}
                                  className="mt-2 h-9 w-full rounded-xl bg-[#4f7c90] text-xs font-black text-white hover:bg-[#406b7d] disabled:opacity-50"
                                >
                                  Guardar respuesta rápida
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <input
                            value={composerText}
                            onPaste={handleComposerPaste}
                            onChange={(event) => {
                              const value = event.target.value;
                              setComposerText(value);

                              if (value.endsWith("/")) {
                                setShowQuickRepliesPanel(true);
                                setShowEmojiPanel(false);
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void sendLocalMessage();
                              }

                              if (event.key === "Escape") {
                                setShowEmojiPanel(false);
                                setShowQuickRepliesPanel(false);
                              }
                            }}
                            placeholder={
                              pendingAttachment
                                ? "Agregá un comentario opcional para el archivo..."
                                : "Escribí un mensaje al pasajero"
                            }
                            className="h-12 w-full rounded-full border border-black/10 bg-white px-5 text-sm font-bold text-[#142033] outline-none placeholder:text-[#94a3b8] focus:border-[#4f7c90]"
                          />
                        </div>

         <button
  type="button"
  onClick={composerText.trim() || pendingAttachment ? sendLocalMessage : handleMicButtonClick}
  disabled={actionLoading}
  className={[
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
    audioRecording
      ? "bg-red-500 hover:bg-red-600 animate-pulse"
      : "bg-[#4f7c90] hover:bg-[#406b7d]"
  ].join(" ")}
  title={
    composerText.trim() || pendingAttachment
      ? "Enviar por WhatsApp"
      : audioRecording
        ? "Detener grabación"
        : "Grabar audio"
  }
>
  {actionLoading ? (
    <Loader2 size={18} className="animate-spin" />
  ) : composerText.trim() || pendingAttachment ? (
    <Send size={19} />
  ) : audioRecording ? (
    <span className="h-3.5 w-3.5 rounded-sm bg-white" />
  ) : (
    <Mic size={20} />
  )}
</button>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleTemplateButton}
                          className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-bold text-[#64748b] hover:bg-[#f8fafc] hover:text-[#142033]"
                        >
                          <FileText size={14} />
                          Enviar plantilla
                        </button>
                      </div>

                      <div className="mt-3 border-t border-dashed border-amber-200 pt-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                            <MessageCircle size={18} />
                          </div>

                          <input
                            value={internalText}
                            onChange={(event) => setInternalText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void sendInternalMessage();
                              }
                            }}
                            placeholder="Mensaje interno para el equipo..."
                            className="h-10 min-w-0 flex-1 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-[#142033] outline-none placeholder:text-[#b69362] focus:border-amber-300"
                          />

                          <button
                            type="button"
                            onClick={sendInternalMessage}
                            disabled={actionLoading || !internalText.trim()}
                            className="h-10 rounded-full bg-amber-300 px-4 text-xs font-black text-white shadow-sm hover:bg-amber-400 disabled:opacity-50"
                          >
                            Enviar interno
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-[#94a3b8]">
                        <span>Enter envía · El mensaje interno no se envía al pasajero.</span>

                        <button
                          type="button"
                          onClick={() => setShowAgentName((current) => !current)}
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-black",
                            showAgentName
                              ? "bg-[#eaf7f1] text-[#4f7c90]"
                              : "bg-[#f1f5f9] text-[#64748b]"
                          ].join(" ")}
                        >
                          {showAgentName ? "Mostrar nombre agente" : "Ocultar nombre agente"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="min-h-0 overflow-auto border-l border-black/10 bg-white p-4">
                    {renderRightTabs()}

                    <div className="mt-4">{renderRightPanelContent()}</div>
                  </aside>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

