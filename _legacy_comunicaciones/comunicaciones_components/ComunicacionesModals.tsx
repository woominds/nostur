// src/components/comunicaciones/ComunicacionesModals.tsx

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Search, Trash2, X } from "lucide-react";

import {
  createInitialConversationDraft,
  getComunicacionDisplayName,
  getQuickReplyCategoriaLabel,
  type ComunicacionConversation,
  type ConversationNote,
  type ConversationTag,
  type CreateConversationDraft,
  type EstadoComercial,
  type EstadoGestion,
  type PrioridadConversacion,
  type ProfileLite,
  type QuickReply,
  type QuickReplyDraft,
  type SucursalLite,
  type WhatsappTemplate
} from "../../store/comunicacionesStore";

import {
  CHANNEL_OPTIONS,
  ESTADO_COMERCIAL_OPTIONS,
  ESTADO_GESTION_OPTIONS,
  PRIORIDAD_OPTIONS,
  QUICK_REPLY_CATEGORY_OPTIONS,
  type SelectOption
} from "./comunicacionesPanel.constants";

import {
  createEmptyQuickReplyDraft,
  formatLongDateTime
} from "./comunicacionesPanel.helpers";

import {
  FieldLabel,
  InlineError,
  NosturSelect,
  TextArea,
  TextInput
} from "./comunicacionesPanel.ui";

import { WindowBadge } from "./ComunicacionesBadges";

/* =========================================================
   NUEVA CONVERSACIÓN
========================================================= */

export function NuevaConversacionModal({
  profile,
  vendedores,
  sucursales,
  saving,
  onClose,
  onCreate
}: {
  profile: ProfileLite | null;
  vendedores: ProfileLite[];
  sucursales: SucursalLite[];
  saving: boolean;
  onClose: () => void;
  onCreate: (draft: CreateConversationDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<CreateConversationDraft>(() => createInitialConversationDraft(profile));
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof CreateConversationDraft>(key: K, value: CreateConversationDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const vendedorOptions: SelectOption[] = [
    { value: "sin_asignar", label: "Sin asignar" },
    ...vendedores.map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre} ${vendedor.apellido}`.trim() || vendedor.email
    }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "sin_sucursal", label: "Sin sucursal" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  function validate(): string | null {
    if (!draft.contacto_nombre.trim() && !draft.telefono.trim() && !draft.email.trim()) {
      return "Ingresá al menos nombre, teléfono o email.";
    }

    if (draft.channel === "whatsapp" && !draft.telefono.trim()) {
      return "Para WhatsApp necesitás cargar un teléfono.";
    }

    if (draft.channel === "email" && !draft.email.trim()) {
      return "Para Email necesitás cargar un correo.";
    }

    return null;
  }

  async function handleCreate() {
    const validationError = validate();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    await onCreate(draft);
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Nueva conversación</h2>
            <p className="text-xs text-[#64748b]">Iniciá una comunicación manual y asignala al equipo.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Canal</FieldLabel>
            <NosturSelect
              value={draft.channel}
              onChange={(value) => setField("channel", value as CreateConversationDraft["channel"])}
              options={CHANNEL_OPTIONS.filter((item) => item.value !== "todos")}
            />
          </div>

          <div>
            <FieldLabel>Nombre / contacto</FieldLabel>
            <TextInput
              value={draft.contacto_nombre}
              onChange={(value) => setField("contacto_nombre", value)}
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <FieldLabel>Teléfono</FieldLabel>
            <TextInput
              value={draft.telefono}
              onChange={(value) => setField("telefono", value)}
              placeholder="+549..."
              inputMode="tel"
            />
          </div>

          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput
              value={draft.email}
              onChange={(value) => setField("email", value)}
              placeholder="cliente@email.com"
              inputMode="email"
            />
          </div>

          <div>
            <FieldLabel>Asignado a</FieldLabel>
            <NosturSelect
              value={draft.assigned_to || "sin_asignar"}
              onChange={(value) => setField("assigned_to", value === "sin_asignar" ? null : value)}
              options={vendedorOptions}
            />
          </div>

          <div>
            <FieldLabel>Sucursal</FieldLabel>
            <NosturSelect
              value={draft.sucursal_id || "sin_sucursal"}
              onChange={(value) => setField("sucursal_id", value === "sin_sucursal" ? null : value)}
              options={sucursalOptions}
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>{draft.channel === "whatsapp" ? "Nota interna inicial" : "Primer mensaje / nota"}</FieldLabel>
            <TextArea
              value={draft.initial_message}
              onChange={(value) => setField("initial_message", value)}
              placeholder={
                draft.channel === "whatsapp"
                  ? "Para WhatsApp no se enviará mensaje libre inicial. Usá plantilla luego de crear la conversación."
                  : "Mensaje inicial opcional..."
              }
              minHeight={110}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleCreate}
            className="h-9 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
          >
            {saving ? "Creando..." : "Crear conversación"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ETIQUETAS
========================================================= */

export function TagsModal({
  conversation,
  tags,
  saving,
  onClose,
  onToggle
}: {
  conversation: ComunicacionConversation | null;
  tags: ConversationTag[];
  saving: boolean;
  onClose: () => void;
  onToggle: (tagId: string) => Promise<void>;
}) {
  const activeTagIds = new Set((conversation?.tags || []).map((tagItem) => tagItem.id));

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Etiquetas</h2>
            <p className="text-xs text-[#64748b]">
              {conversation ? getComunicacionDisplayName(conversation) : "Sin conversación"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-2">
          {tags.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
              Todavía no hay etiquetas cargadas.
            </div>
          ) : (
            tags.map((tagItem) => {
              const active = activeTagIds.has(tagItem.id);

              return (
                <button
                  key={tagItem.id}
                  type="button"
                  disabled={saving || !conversation}
                  onClick={() => onToggle(tagItem.id)}
                  className={[
                    "flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left text-xs font-black transition",
                    active
                      ? "border-[#4f7c90]/30 bg-[#4f7c90]/10 text-[#111827]"
                      : "border-black/10 bg-[#f8fafc] text-[#334155] hover:bg-white"
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tagItem.color || "#64748b" }} />
                    {tagItem.nombre}
                  </span>

                  {active ? <CheckCircle2 size={15} className="text-[#4f7c90]" /> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TRANSFERIR
========================================================= */

export function TransferirModal({
  conversation,
  vendedores,
  saving,
  onClose,
  onTransfer
}: {
  conversation: ComunicacionConversation | null;
  vendedores: ProfileLite[];
  saving: boolean;
  onClose: () => void;
  onTransfer: (profileId: string, note: string) => Promise<void>;
}) {
  const [profileId, setProfileId] = useState("");
  const [note, setNote] = useState("");

  const options: SelectOption[] = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: `${vendedor.nombre} ${vendedor.apellido}`.trim() || vendedor.email
  }));

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Transferir conversación</h2>
            <p className="text-xs text-[#64748b]">
              {conversation ? getComunicacionDisplayName(conversation) : "Sin conversación"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-3">
          <div>
            <FieldLabel>Nuevo responsable</FieldLabel>
            <NosturSelect
              value={profileId}
              onChange={setProfileId}
              options={options}
              placeholder="Seleccionar vendedor"
            />
          </div>

          <div>
            <FieldLabel>Nota opcional</FieldLabel>
            <TextArea
              value={note}
              onChange={setNote}
              placeholder="Motivo o indicaciones para el compañero..."
              minHeight={90}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving || !profileId}
            onClick={() => onTransfer(profileId, note)}
            className="h-9 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
          >
            Transferir
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COLABORADORES
========================================================= */

export function ColaboradoresModal({
  conversation,
  vendedores,
  saving,
  onClose,
  onAdd,
  onRemove,
  onTransfer
}: {
  conversation: ComunicacionConversation | null;
  vendedores: ProfileLite[];
  saving: boolean;
  onClose: () => void;
  onAdd: (profileId: string) => Promise<void>;
  onRemove: (profileId: string) => Promise<void>;
  onTransfer?: (profileId: string, note: string) => Promise<void>;
}) {
  const [profileId, setProfileId] = useState("");
  const [transferProfileId, setTransferProfileId] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const participants = conversation?.participants || [];
  const collaboratorIds = new Set(participants.map((item) => item.profile_id));

  const collaboratorOptions: SelectOption[] = vendedores
    .filter((vendedor) => vendedor.id !== conversation?.assigned_to && !collaboratorIds.has(vendedor.id))
    .map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre} ${vendedor.apellido}`.trim() || vendedor.email
    }));

  const transferOptions: SelectOption[] = vendedores
    .filter((vendedor) => vendedor.id !== conversation?.assigned_to)
    .map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre} ${vendedor.apellido}`.trim() || vendedor.email
    }));

  async function handleTransfer() {
    if (!onTransfer || !transferProfileId) return;
    await onTransfer(transferProfileId, transferNote);
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-4xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Colaboradores y transferencia</h2>
            <p className="text-xs text-[#64748b]">
              Sumá colaboradores o transferí la responsabilidad principal de la conversación.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-1 text-sm font-black text-[#111827]">Agregar colaborador</h3>
            <p className="mb-3 text-[11px] font-semibold text-[#64748b]">
              El colaborador puede participar sin quitarle la conversación al responsable.
            </p>

            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <NosturSelect
                  value={profileId}
                  onChange={setProfileId}
                  options={collaboratorOptions}
                  placeholder="Seleccionar compañero"
                />
              </div>

              <button
                type="button"
                disabled={saving || !profileId}
                onClick={() => onAdd(profileId)}
                className="h-9 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white hover:bg-[#416a7a] disabled:opacity-50"
              >
                Agregar
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {participants.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-white p-4 text-center text-xs font-semibold text-[#64748b]">
                  Sin colaboradores.
                </div>
              ) : (
                participants.map((item) => (
                  <div
                    key={`${item.profile_id}-${item.rol}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white p-3 text-xs"
                  >
                    <div>
                      <div className="font-black text-[#111827]">
                        {`${item.nombre || ""} ${item.apellido || ""}`.trim() || item.email || item.profile_id}
                      </div>
                      <div className="mt-0.5 font-bold uppercase text-[#64748b]">{item.rol}</div>
                    </div>

                    {item.rol !== "PRINCIPAL" ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onRemove(item.profile_id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-1 text-sm font-black text-[#111827]">Transferir responsable</h3>
            <p className="mb-3 text-[11px] font-semibold text-[#64748b]">
              Cambia el responsable principal de la conversación.
            </p>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Nuevo responsable</FieldLabel>
                <NosturSelect
                  value={transferProfileId}
                  onChange={setTransferProfileId}
                  options={transferOptions}
                  placeholder="Seleccionar vendedor"
                />
              </div>

              <div>
                <FieldLabel>Nota de transferencia</FieldLabel>
                <TextArea
                  value={transferNote}
                  onChange={setTransferNote}
                  placeholder="Motivo o indicaciones para el nuevo responsable..."
                  minHeight={100}
                />
              </div>

              <button
                type="button"
                disabled={saving || !transferProfileId || !onTransfer}
                onClick={handleTransfer}
                className="h-10 rounded-2xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
              >
                Transferir conversación
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DETALLE
========================================================= */

export function DetalleModal({
  conversation,
  notes,
  vendedores,
  sucursales,
  saving,
  onClose,
  onUpdate,
  onAddNote,
  onDeleteNote
}: {
  conversation: ComunicacionConversation | null;
  notes: ConversationNote[];
  vendedores: ProfileLite[];
  sucursales: SucursalLite[];
  saving: boolean;
  onClose: () => void;
  onUpdate: (patch: Partial<ComunicacionConversation>) => Promise<void>;
  onAddNote: (note: string, tipo?: string, scheduledAt?: string | null) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [noteMode, setNoteMode] = useState<"NOTA_INTERNA" | "RECORDATORIO_INTERNO" | "MENSAJE_CLIENTE_PROGRAMADO">("NOTA_INTERNA");
  const [scheduledAt, setScheduledAt] = useState("");

  const [clienteDraft, setClienteDraft] = useState({
    contacto_nombre: "",
    telefono: "",
    email: "",
    subject: "",
    assigned_to: "sin_asignar",
    sucursal_id: "sin_sucursal",
    estado_gestion: "SIN_ATENDER",
    estado_comercial: "NUEVO",
    prioridad: "NORMAL",
    mostrar_agente: true
  });

  useEffect(() => {
    if (!conversation) return;

    setClienteDraft({
      contacto_nombre: conversation.contacto_nombre || "",
      telefono: conversation.telefono || "",
      email: conversation.email || "",
      subject: conversation.subject || "",
      assigned_to: conversation.assigned_to || "sin_asignar",
      sucursal_id: conversation.sucursal_id || "sin_sucursal",
      estado_gestion: conversation.estado_gestion || "SIN_ATENDER",
      estado_comercial: conversation.estado_comercial || "NUEVO",
      prioridad: conversation.prioridad || "NORMAL",
      mostrar_agente: conversation.mostrar_agente
    });
  }, [conversation]);

  if (!conversation) return null;

  const vendedorOptions: SelectOption[] = [
    { value: "sin_asignar", label: "Sin asignar" },
    ...vendedores.map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre} ${vendedor.apellido}`.trim() || vendedor.email
    }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "sin_sucursal", label: "Sin sucursal" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  function setClienteField<K extends keyof typeof clienteDraft>(key: K, value: (typeof clienteDraft)[K]) {
    setClienteDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSaveConversationData() {
    await onUpdate({
      contacto_nombre: clienteDraft.contacto_nombre || null,
      titulo: clienteDraft.contacto_nombre || null,
      telefono: clienteDraft.telefono || null,
      email: clienteDraft.email || null,
      subject: clienteDraft.subject || null,
      assigned_to: clienteDraft.assigned_to === "sin_asignar" ? null : clienteDraft.assigned_to,
      sucursal_id: clienteDraft.sucursal_id === "sin_sucursal" ? null : clienteDraft.sucursal_id,
      estado_gestion: clienteDraft.estado_gestion as EstadoGestion,
      estado_comercial: clienteDraft.estado_comercial as EstadoComercial,
      prioridad: clienteDraft.prioridad as PrioridadConversacion,
      mostrar_agente: clienteDraft.mostrar_agente
    });

    onClose();
  }

  async function handleAddNote() {
    if (!note.trim()) return;

    await onAddNote(note, noteMode, scheduledAt || null);

    setNote("");
    setScheduledAt("");
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-56px)] w-full max-w-5xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">{getComunicacionDisplayName(conversation)}</h2>
            <p className="text-xs text-[#64748b]">
              Detalle, asignación, ciclo comercial, notas internas y programaciones.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <main className="grid gap-4">
            <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-[#111827]">Datos del cliente</h3>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveConversationData}
                  className="h-8 rounded-xl bg-[#4f7c90] px-4 text-[11px] font-black text-white hover:bg-[#416a7a] disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar datos"}
                </button>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Nombre / contacto</FieldLabel>
                  <TextInput
                    value={clienteDraft.contacto_nombre}
                    onChange={(value) => setClienteField("contacto_nombre", value)}
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div>
                  <FieldLabel>Teléfono</FieldLabel>
                  <TextInput
                    value={clienteDraft.telefono}
                    onChange={(value) => setClienteField("telefono", value)}
                    placeholder="+549..."
                    inputMode="tel"
                  />
                </div>

                <div>
                  <FieldLabel>Email</FieldLabel>
                  <TextInput
                    value={clienteDraft.email}
                    onChange={(value) => setClienteField("email", value)}
                    placeholder="cliente@email.com"
                    inputMode="email"
                  />
                </div>

                <div>
                  <FieldLabel>Asunto / referencia</FieldLabel>
                  <TextInput
                    value={clienteDraft.subject}
                    onChange={(value) => setClienteField("subject", value)}
                    placeholder="Referencia interna opcional"
                  />
                </div>
              </div>

              <h3 className="mb-3 text-sm font-black text-[#111827]">Gestión</h3>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Asignado a</FieldLabel>
                  <NosturSelect
                    value={clienteDraft.assigned_to}
                    onChange={(value) => setClienteField("assigned_to", value)}
                    options={vendedorOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Sucursal</FieldLabel>
                  <NosturSelect
                    value={clienteDraft.sucursal_id}
                    onChange={(value) => setClienteField("sucursal_id", value)}
                    options={sucursalOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Estado gestión</FieldLabel>
                  <NosturSelect
                    value={clienteDraft.estado_gestion}
                    onChange={(value) => setClienteField("estado_gestion", value)}
                    options={ESTADO_GESTION_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Estado comercial</FieldLabel>
                  <NosturSelect
                    value={clienteDraft.estado_comercial}
                    onChange={(value) => setClienteField("estado_comercial", value)}
                    options={ESTADO_COMERCIAL_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Prioridad</FieldLabel>
                  <NosturSelect
                    value={clienteDraft.prioridad}
                    onChange={(value) => setClienteField("prioridad", value)}
                    options={PRIORIDAD_OPTIONS.filter((item) => item.value !== "todas")}
                  />
                </div>

                <div>
                  <FieldLabel>Mostrar agente al cliente</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setClienteField("mostrar_agente", !clienteDraft.mostrar_agente)}
                    className={[
                      "flex h-9 w-full items-center justify-center rounded-xl border text-xs font-black",
                      clienteDraft.mostrar_agente
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    ].join(" ")}
                  >
                    {clienteDraft.mostrar_agente ? "Sí, mostrar nombre" : "No mostrar nombre"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveConversationData}
                  className="h-9 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar y cerrar"}
                </button>
              </div>
            </section>

            <section className="rounded-[24px] border border-black/10 bg-white p-4">
              <h3 className="mb-3 text-sm font-black text-[#111827]">Notas y programaciones</h3>

              <div className="mb-3 grid gap-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel>Tipo</FieldLabel>
                    <NosturSelect
                      value={noteMode}
                      onChange={(value) => setNoteMode(value as typeof noteMode)}
                      options={[
                        { value: "NOTA_INTERNA", label: "Nota interna" },
                        { value: "RECORDATORIO_INTERNO", label: "Recordatorio vendedor" },
                        { value: "MENSAJE_CLIENTE_PROGRAMADO", label: "Mensaje cliente programado" }
                      ]}
                    />
                  </div>

                  <div>
                    <FieldLabel>Fecha programada</FieldLabel>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      className="h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[#111827] outline-none focus:border-[#4f7c90]"
                    />
                  </div>
                </div>

                <TextArea
                  value={note}
                  onChange={setNote}
                  placeholder="Agregar nota o mensaje programado..."
                  minHeight={80}
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={saving || !note.trim()}
                    onClick={handleAddNote}
                    className="h-8 rounded-xl bg-[#4f7c90] px-4 text-[11px] font-black text-white hover:bg-[#416a7a] disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Agregar nota"}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                {notes.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
                    Sin notas internas.
                  </div>
                ) : (
                  notes.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase text-[#64748b]">
                          <span>
                            {item.created_by_full_name || "Usuario"} · {formatLongDateTime(item.created_at)}
                          </span>

                          <span className="rounded-lg border border-black/10 bg-white px-2 py-0.5">
                            {item.tipo || "NOTA_INTERNA"}
                          </span>

                          {item.scheduled_at ? (
                            <span className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-0.5 text-blue-700">
                              Prog. {formatLongDateTime(item.scheduled_at)}
                            </span>
                          ) : null}
                        </div>

                        {onDeleteNote ? (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => onDeleteNote(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                            title="Eliminar nota"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : null}
                      </div>

                      <div className="whitespace-pre-wrap text-xs font-semibold leading-5 text-[#334155]">
                        {item.note}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </main>

          <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Datos</h3>

            <div className="grid gap-3 text-xs">
              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <FieldLabel>Responsable</FieldLabel>
                <div className="font-black text-[#111827]">{conversation.assigned_full_name || "Sin asignar"}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <FieldLabel>Teléfono</FieldLabel>
                <div className="font-black text-[#111827]">{conversation.telefono || "—"}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <FieldLabel>Ventana WhatsApp</FieldLabel>
                <div className="mt-1">
                  <WindowBadge conversation={conversation} />
                </div>
                <div className="mt-2 text-[11px] font-semibold text-[#64748b]">
                  Expira: {formatLongDateTime(conversation.whatsapp_24h_expires_at)}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <FieldLabel>Colaboradores</FieldLabel>

                <div className="grid gap-1">
                  {(conversation.participants || []).length === 0 ? (
                    <span className="text-[#64748b]">Sin colaboradores</span>
                  ) : null}

                  {(conversation.participants || []).map((item) => (
                    <div key={`${item.profile_id}-${item.rol}`} className="font-bold text-[#334155]">
                      {`${item.nombre || ""} ${item.apellido || ""}`.trim() || item.email || item.profile_id} · {item.rol}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <FieldLabel>Etiquetas</FieldLabel>

                <div className="flex flex-wrap gap-1">
                  {(conversation.tags || []).length === 0 ? (
                    <span className="text-[#64748b]">Sin etiquetas</span>
                  ) : null}

                  {(conversation.tags || []).map((item) => (
                    <span key={item.id} className="rounded-xl border border-black/10 px-2 py-1 text-[10px] font-black">
                      {item.nombre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   RESPUESTAS RÁPIDAS
========================================================= */

export function QuickRepliesModal({
  quickReplies,
  canManageComunicaciones,
  currentProfile,
  saving,
  onClose,
  onCreate,
  onUpdate,
  onToggleActive
}: {
  quickReplies: QuickReply[];
  canManageComunicaciones: boolean;
  currentProfile: ProfileLite | null;
  saving: boolean;
  onClose: () => void;
  onCreate: (draft: QuickReplyDraft) => Promise<void>;
  onUpdate: (draft: QuickReplyDraft & { id: string }) => Promise<void>;
  onToggleActive: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todas");
  const [activeFilter, setActiveFilter] = useState<"todas" | "activas" | "inactivas">("activas");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuickReplyDraft>(() =>
    createEmptyQuickReplyDraft(canManageComunicaciones, currentProfile?.id || null)
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const filteredReplies = useMemo(() => {
    const normalizedSearch = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    return quickReplies
      .filter((reply) => category === "todas" || reply.categoria === category)
      .filter((reply) => {
        if (activeFilter === "activas") return reply.activo;
        if (activeFilter === "inactivas") return !reply.activo;
        return true;
      })
      .filter((reply) => {
        if (!normalizedSearch) return true;

        const text = `${reply.titulo} ${reply.contenido} ${reply.categoria}`
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();

        return text.includes(normalizedSearch);
      })
      .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0) || a.titulo.localeCompare(b.titulo));
  }, [quickReplies, search, category, activeFilter]);

  function resetDraft() {
    setEditingId(null);
    setDraft(createEmptyQuickReplyDraft(canManageComunicaciones, currentProfile?.id || null));
    setLocalError(null);
  }

  function startEdit(reply: QuickReply) {
    setEditingId(reply.id);
    setDraft({
      id: reply.id,
      titulo: reply.titulo || "",
      contenido: reply.contenido || "",
      categoria: reply.categoria || "generales",
      global: Boolean(reply.global),
      profile_id: reply.profile_id || null,
      activo: reply.activo,
      orden: Number(reply.orden || 0)
    });
    setLocalError(null);
  }

  function setDraftField<K extends keyof QuickReplyDraft>(key: K, value: QuickReplyDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave() {
    if (!draft.titulo.trim()) {
      setLocalError("Ingresá un título.");
      return;
    }

    if (!draft.contenido.trim()) {
      setLocalError("Ingresá el contenido.");
      return;
    }

    if (editingId) {
      await onUpdate({
        ...draft,
        id: editingId
      });
      resetDraft();
      return;
    }

    await onCreate(draft);
    resetDraft();
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-56px)] w-full max-w-6xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Respuestas rápidas</h2>
            <p className="text-xs text-[#64748b]">ABM de textos frecuentes para usar dentro del chat.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#111827]">
                  {editingId ? "Editar respuesta" : "Nueva respuesta"}
                </h3>
                <p className="text-[11px] font-semibold text-[#64748b]">
                  {canManageComunicaciones
                    ? "Podés crear respuestas globales para todo el equipo."
                    : "Podés crear respuestas personales."}
                </p>
              </div>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetDraft}
                  className="h-8 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f1f5f9]"
                >
                  Nueva
                </button>
              ) : null}
            </div>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Título</FieldLabel>
                <TextInput
                  value={draft.titulo}
                  onChange={(value) => setDraftField("titulo", value)}
                  placeholder="Ej: Pedido de datos"
                />
              </div>

              <div>
                <FieldLabel>Categoría</FieldLabel>
                <NosturSelect
                  value={draft.categoria || "generales"}
                  onChange={(value) => setDraftField("categoria", value)}
                  options={QUICK_REPLY_CATEGORY_OPTIONS.filter((item) => item.value !== "todas")}
                />
              </div>

              <div>
                <FieldLabel>Contenido</FieldLabel>
                <TextArea
                  value={draft.contenido}
                  onChange={(value) => setDraftField("contenido", value)}
                  placeholder="Texto que se insertará en el mensaje..."
                  minHeight={170}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Orden</FieldLabel>
                  <TextInput
                    value={String(draft.orden || 0)}
                    onChange={(value) => setDraftField("orden", Number(value.replace(/\D/g, "")) || 0)}
                    inputMode="numeric"
                  />
                </div>

                <div>
                  <FieldLabel>Estado</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setDraftField("activo", !draft.activo)}
                    className={[
                      "flex h-9 w-full items-center justify-center rounded-xl border text-xs font-black",
                      draft.activo
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    ].join(" ")}
                  >
                    {draft.activo ? "Activa" : "Inactiva"}
                  </button>
                </div>
              </div>

              <div>
                <FieldLabel>Alcance</FieldLabel>
                <button
                  type="button"
                  disabled={!canManageComunicaciones}
                  onClick={() => setDraftField("global", !draft.global)}
                  className={[
                    "flex h-9 w-full items-center justify-center rounded-xl border text-xs font-black disabled:cursor-not-allowed disabled:opacity-60",
                    draft.global
                      ? "border-[#4f7c90]/30 bg-[#4f7c90]/10 text-[#31596a]"
                      : "border-violet-200 bg-violet-50 text-violet-700"
                  ].join(" ")}
                >
                  {draft.global ? "Global para todo el equipo" : "Personal"}
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="h-10 rounded-2xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
              >
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear respuesta"}
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <div className="mb-3 grid gap-2 md:grid-cols-[1fr_180px_150px]">
              <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                <Search size={14} className="text-[#64748b]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por título o contenido..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
                />
              </div>

              <NosturSelect value={category} onChange={setCategory} options={QUICK_REPLY_CATEGORY_OPTIONS} />

              <NosturSelect
                value={activeFilter}
                onChange={(value) => setActiveFilter(value as typeof activeFilter)}
                options={[
                  { value: "activas", label: "Activas" },
                  { value: "inactivas", label: "Inactivas" },
                  { value: "todas", label: "Todas" }
                ]}
              />
            </div>

            <div className="grid max-h-[calc(100vh-245px)] gap-2 overflow-auto pr-1">
              {filteredReplies.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs font-semibold text-[#64748b]">
                  No hay respuestas rápidas para este filtro.
                </div>
              ) : (
                filteredReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className={[
                      "rounded-2xl border p-3",
                      reply.activo ? "border-black/10 bg-[#f8fafc]" : "border-slate-200 bg-slate-50 opacity-70"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-xs font-black text-[#111827]">{reply.titulo}</div>

                          <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black text-[#64748b]">
                            {getQuickReplyCategoriaLabel(reply.categoria || "generales")}
                          </span>

                          <span
                            className={[
                              "rounded-xl border px-2 py-1 text-[10px] font-black",
                              reply.global
                                ? "border-[#4f7c90]/20 bg-[#4f7c90]/10 text-[#31596a]"
                                : "border-violet-200 bg-violet-50 text-violet-700"
                            ].join(" ")}
                          >
                            {reply.global ? "Global" : "Personal"}
                          </span>

                          <span
                            className={[
                              "rounded-xl border px-2 py-1 text-[10px] font-black",
                              reply.activo
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            ].join(" ")}
                          >
                            {reply.activo ? "Activa" : "Inactiva"}
                          </span>
                        </div>

                        <div className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-[#475569]">
                          {reply.contenido}
                        </div>

                        <div className="mt-2 text-[10px] font-black uppercase text-[#94a3b8]">
                          Orden {Number(reply.orden || 0)} · {Number(reply.uso_contador || 0)} usos
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(reply)}
                          className="h-8 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f1f5f9]"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onToggleActive(reply.id)}
                          className={[
                            "h-8 rounded-xl px-3 text-[11px] font-black disabled:opacity-50",
                            reply.activo
                              ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                          ].join(" ")}
                        >
                          {reply.activo ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PLANTILLAS
========================================================= */

export function TemplatesModal({
  templates,
  onClose
}: {
  templates: WhatsappTemplate[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Plantillas WhatsApp</h2>
            <p className="text-xs text-[#64748b]">
              Fuera de la ventana de 24h se deben usar plantillas aprobadas por Meta.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-2">
          {templates.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs font-semibold text-[#64748b]">
              Todavía no hay plantillas cargadas.
            </div>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black text-[#111827]">{template.name}</div>

                  <span
                    className={[
                      "rounded-xl border px-2 py-1 text-[10px] font-black",
                      template.status === "APPROVED"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    ].join(" ")}
                  >
                    {template.status}
                  </span>
                </div>

                <div className="mt-1 text-[11px] font-bold text-[#64748b]">
                  {template.language} · {template.category || "Sin categoría"}
                </div>

                <div className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-[#475569]">
                  {template.body || "Sin contenido visible"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ENVIAR PLANTILLA
========================================================= */

export function EnviarTemplateModal({
  conversation,
  templates,
  saving,
  onClose,
  onSendTemplate
}: {
  conversation: ComunicacionConversation | null;
  templates: WhatsappTemplate[];
  saving: boolean;
  onClose: () => void;
  onSendTemplate: (template: WhatsappTemplate, variables: string[]) => Promise<void>;
}) {
  const approvedTemplates = templates.filter((template) => template.status === "APPROVED");
  const [selectedTemplateId, setSelectedTemplateId] = useState(approvedTemplates[0]?.id || "");
  const [variablesText, setVariablesText] = useState("");

  const selectedTemplate = approvedTemplates.find((template) => template.id === selectedTemplateId) || null;

  const templateOptions: SelectOption[] = approvedTemplates.map((template) => ({
    value: template.id,
    label: `${template.name} · ${template.language}`
  }));

  const variables = variablesText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  async function handleSend() {
    if (!selectedTemplate) return;
    await onSendTemplate(selectedTemplate, variables);
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Enviar plantilla aprobada</h2>
            <p className="text-xs text-[#64748b]">
              {conversation ? `WhatsApp a ${getComunicacionDisplayName(conversation)}` : "Sin conversación seleccionada"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        {approvedTemplates.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-bold text-amber-800">
            No hay plantillas aprobadas cargadas en el sistema.
          </div>
        ) : (
          <div className="grid gap-4">
            <div>
              <FieldLabel>Plantilla</FieldLabel>
              <NosturSelect
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                options={templateOptions}
                placeholder="Seleccionar plantilla"
              />
            </div>

            {selectedTemplate ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">
                    APPROVED
                  </span>

                  <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black text-[#64748b]">
                    {selectedTemplate.language}
                  </span>

                  <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black text-[#64748b]">
                    {selectedTemplate.category || "Sin categoría"}
                  </span>
                </div>

                <div className="whitespace-pre-wrap rounded-2xl border border-black/10 bg-white p-3 text-xs font-semibold leading-5 text-[#334155]">
                  {selectedTemplate.body || "La plantilla no tiene body cargado en la base."}
                </div>
              </div>
            ) : null}

            <div>
              <FieldLabel>Variables</FieldLabel>
              <TextArea
                value={variablesText}
                onChange={setVariablesText}
                placeholder={"Una variable por línea.\nEjemplo:\nJorge\nCancún\n15 de junio"}
                minHeight={110}
              />
            </div>

            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={!selectedTemplate || saving}
                className="h-9 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Enviando..." : "Enviar plantilla"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}