import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Edit3,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import {
  usePendientesStore,
  type Pendiente,
  type PendienteDraft,
  type PrioridadPendiente
} from "../../store/pendientesStore";
import { IconButton } from "../ui/IconButton";

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;
type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
} | null;

function ConfirmModal({
  confirm,
  saving,
  onClose
}: {
  confirm: ConfirmState;
  saving: boolean;
  onClose: () => void;
}) {
  if (!confirm) return null;

  return (
    <div className="fixed inset-0 z-[280] flex items-start justify-center bg-black/25 px-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#111827]">{confirm.title}</h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#64748b]">
              {confirm.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827] disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827] disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={confirm.onConfirm}
            className={[
              "h-9 rounded-xl px-5 text-xs font-black text-white shadow-sm disabled:opacity-50",
              confirm.danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-nostur-orange hover:bg-nostur-orangeSoft"
            ].join(" ")}
          >
            {saving ? "Procesando..." : confirm.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const PRIORIDAD_OPTIONS: SelectOption[] = [
  { value: "BAJA", label: "Baja" },
  { value: "MEDIA", label: "Media" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" }
];

const PRIORIDAD_FILTER_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todas" },
  ...PRIORIDAD_OPTIONS
];

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "abiertos", label: "Abiertos" },
  { value: "resueltos", label: "Resueltos" }
];

function getDateLabel(value?: string | null): string {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function getPrioridadBadgeClass(prioridad: string): string {
  if (prioridad === "URGENTE") return "border-red-200 bg-red-50 text-red-700";
  if (prioridad === "ALTA") return "border-orange-200 bg-orange-50 text-orange-700";
  if (prioridad === "MEDIA") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function getPrioridadLabel(prioridad: string): string {
  const labels: Record<string, string> = {
    BAJA: "Baja",
    MEDIA: "Media",
    ALTA: "Alta",
    URGENTE: "Urgente"
  };

  return labels[prioridad] || prioridad;
}

function createInitialDraft(): PendienteDraft {
  return {
    titulo: "",
    descripcion: "",
    prioridad: "MEDIA"
  };
}

function createDraftFromPendiente(pendiente: Pendiente | null): PendienteDraft {
  if (!pendiente) return createInitialDraft();

  return {
    titulo: pendiente.titulo || "",
    descripcion: pendiente.descripcion || "",
    prioridad: pendiente.prioridad
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[100px] w-full resize-none rounded-xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
    />
  );
}

function NosturSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar"
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={["relative", open ? "z-[130]" : "z-0"].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-left text-xs font-semibold text-[#111827] outline-none transition hover:bg-white"
      >
        <span className={selected ? "truncate" : "truncate text-[#94a3b8]"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className={["shrink-0 text-[#64748b] transition", open ? "rotate-180" : ""].join(" ")}
        />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />

          <div className="absolute left-0 right-0 top-[44px] z-[150] max-h-56 overflow-auto rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs font-bold text-[#94a3b8]">Sin opciones</div>
            ) : (
              options.map((option) => {
                const active = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={[
                      "flex h-8 w-full items-center rounded-xl px-3 text-left text-xs font-bold transition",
                      active
                        ? "bg-nostur-orange text-white"
                        : "text-[#334155] hover:bg-[#f1f5f9]"
                    ].join(" ")}
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[260] w-[320px] rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={[
              "mb-1 font-black",
              toast.type === "success" ? "text-green-700" : "text-red-700"
            ].join(" ")}
          >
            {toast.type === "success" ? "Operación exitosa" : "Atención"}
          </div>
          <div className="font-semibold text-[#334155]">{toast.message}</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string | number;
  icon: typeof AlertTriangle;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nostur-orange/15 text-nostur-orange">
          <Icon size={17} strokeWidth={1.8} />
        </div>

        <div className="min-w-0">
          <div className="truncate text-lg font-black text-[#111827]">{value}</div>
          <div className="text-[11px] font-bold text-[#64748b]">{label}</div>
        </div>
      </div>
    </div>
  );
}

function PendienteModal({
  pendiente,
  saving,
  onClose,
  onSave
}: {
  pendiente: Pendiente | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: PendienteDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PendienteDraft>(() => createDraftFromPendiente(pendiente));

  function setField<K extends keyof PendienteDraft>(key: K, value: PendienteDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-start justify-center bg-black/25 px-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {pendiente ? "Editar pendiente" : "Nuevo pendiente"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Texto libre, prioridad y seguimiento simple.
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
            <FieldLabel>Pendiente</FieldLabel>
            <TextInput
              value={draft.titulo}
              onChange={(value) => setField("titulo", value)}
              placeholder="Ej: llamar a cliente, revisar reserva, enviar comprobante..."
            />
          </div>

          <div>
            <FieldLabel>Prioridad</FieldLabel>
            <NosturSelect
              value={draft.prioridad}
              onChange={(value) => setField("prioridad", value as PrioridadPendiente)}
              options={PRIORIDAD_OPTIONS}
            />
          </div>

          <div>
            <FieldLabel>Detalle opcional</FieldLabel>
            <TextArea
              value={draft.descripcion}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Agregá contexto, teléfono, carrito, horario o cualquier nota útil..."
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
            onClick={() => onSave(draft)}
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PendienteCard({
  pendiente,
  saving,
  onEdit,
  onResolve,
  onReopen,
  onDelete
}: {
  pendiente: Pendiente;
  saving: boolean;
  onEdit: (pendiente: Pendiente) => void;
  onResolve: (pendiente: Pendiente) => void;
  onReopen: (pendiente: Pendiente) => void;
  onDelete: (pendiente: Pendiente) => void;
}) {
  return (
    <div
      className={[
        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[130px_minmax(0,1fr)_180px_160px_112px]",
        pendiente.resuelto
          ? "border-green-200 bg-green-50/60"
          : "border-black/10 bg-[#f8fafc] hover:bg-white"
      ].join(" ")}
    >
      <div className="min-w-0">
        <span
          className={[
            "inline-flex rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
            getPrioridadBadgeClass(pendiente.prioridad)
          ].join(" ")}
        >
          {getPrioridadLabel(pendiente.prioridad)}
        </span>

        <div className="mt-2 text-[10px] font-bold text-[#64748b]">
          {pendiente.resuelto ? "Resuelto" : "Abierto"}
        </div>
      </div>

      <div className="min-w-0">
        <div
          className={[
            "truncate text-sm font-black",
            pendiente.resuelto
              ? "text-green-800 line-through decoration-green-700/50"
              : "text-[#111827]"
          ].join(" ")}
        >
          {pendiente.titulo}
        </div>

        {pendiente.descripcion ? (
          <div className="mt-1 line-clamp-2 text-xs font-semibold text-[#64748b]">
            {pendiente.descripcion}
          </div>
        ) : (
          <div className="mt-1 text-xs font-semibold text-[#94a3b8]">
            Sin detalle adicional
          </div>
        )}
      </div>

      <div className="min-w-0 text-xs">
        <div className="truncate font-black text-[#111827]">
          {pendiente.vendedor || "Sin vendedor"}
        </div>
        <div className="truncate text-[#64748b]">
          {pendiente.sucursal || "Sin sucursal"}
        </div>
      </div>

      <div className="min-w-0 text-xs">
        <div className="font-black text-[#111827]">
          {getDateLabel(pendiente.created_at)}
        </div>
        <div className="text-[#64748b]">
          {pendiente.resuelto
            ? `Resuelto: ${getDateLabel(pendiente.resuelto_at)}`
            : "Creado"}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <IconButton
          icon={Edit3}
          label="Editar"
          disabled={saving}
          onClick={() => onEdit(pendiente)}
        />

        {pendiente.resuelto ? (
          <IconButton
            icon={Undo2}
            label="Reabrir"
            disabled={saving}
            className="text-blue-700"
            onClick={() => onReopen(pendiente)}
          />
        ) : (
          <IconButton
            icon={CheckCircle2}
            label="Resolver"
            disabled={saving}
            className="text-green-700"
            onClick={() => onResolve(pendiente)}
          />
        )}

        <IconButton
          icon={Trash2}
          label="Eliminar definitivamente"
          disabled={saving}
          className="text-red-600"
          onClick={() => onDelete(pendiente)}
        />
      </div>
    </div>
  );
}

export function PendientesPanel() {
  const loading = usePendientesStore((state) => state.loading);
  const saving = usePendientesStore((state) => state.saving);
  const error = usePendientesStore((state) => state.error);
  const filters = usePendientesStore((state) => state.filters);
  const canManagePendientes = usePendientesStore((state) => state.canManagePendientes);
  const catalogos = usePendientesStore((state) => state.catalogos);

  const loadPendientes = usePendientesStore((state) => state.loadPendientes);
  const createPendiente = usePendientesStore((state) => state.createPendiente);
  const updatePendiente = usePendientesStore((state) => state.updatePendiente);
  const resolvePendiente = usePendientesStore((state) => state.resolvePendiente);
  const reopenPendiente = usePendientesStore((state) => state.reopenPendiente);
  const deletePendiente = usePendientesStore((state) => state.deletePendiente);
  const setFilter = usePendientesStore((state) => state.setFilter);
  const clearError = usePendientesStore((state) => state.clearError);
  const getPendientesFiltrados = usePendientesStore((state) => state.getPendientesFiltrados);
  const getMetrics = usePendientesStore((state) => state.getMetrics);
const [confirm, setConfirm] = useState<ConfirmState>(null);
  const pendientes = getPendientesFiltrados();
  const metrics = getMetrics();

  const vendedorOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    ...catalogos.vendedores.map((item) => ({
      value: item.id,
      label: `${item.nombre} ${item.apellido}`.trim()
    }))
  ];

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalPendiente, setModalPendiente] = useState<Pendiente | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    loadPendientes();
  }, [loadPendientes]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function openCreateModal() {
    setModalPendiente(null);
    setModalOpen(true);
  }

  function openEditModal(pendiente: Pendiente) {
    setModalPendiente(pendiente);
    setModalOpen(true);
  }

  async function handleSave(draft: PendienteDraft) {
    const ok = modalPendiente
      ? await updatePendiente(modalPendiente, draft)
      : await createPendiente(draft);

    if (ok) {
      setModalOpen(false);
      setModalPendiente(null);
      showToast(modalPendiente ? "Pendiente actualizado." : "Pendiente creado.");
    }
  }

  async function handleResolve(pendiente: Pendiente) {
    const ok = await resolvePendiente(pendiente);

    if (ok) showToast("Pendiente marcado como resuelto.");
  }

  async function handleReopen(pendiente: Pendiente) {
    const ok = await reopenPendiente(pendiente);

    if (ok) showToast("Pendiente reabierto.");
  }

  async function handleDelete(pendiente: Pendiente) {
  setConfirm({
    title: "Eliminar pendiente",
    message: `¿Querés eliminar definitivamente el pendiente "${pendiente.titulo}"? Esta acción no se puede deshacer.`,
    confirmLabel: "Eliminar",
    danger: true,
    onConfirm: async () => {
      const ok = await deletePendiente(pendiente);

      if (ok) {
        setConfirm(null);
        showToast("Pendiente eliminado definitivamente.");
      }
    }
  });
}

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Pendientes</h1>
          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            SIMPLE
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            Tareas libres por vendedor, prioridad y resolución.
          </span>
        </div>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        ) : null}

        <section className="relative z-[30] mb-4 rounded-[24px] border border-black/10 bg-white/55 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((current) => !current)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={15} className="text-nostur-orange" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#475569]">
                  Filtros
                </h2>
                <span className="text-[11px] font-semibold text-nostur-orange">
                  {filters.estado} · {filters.prioridad}
                  {canManagePendientes && filters.vendedorId !== "todos"
                    ? ` · ${vendedorOptions.find((item) => item.value === filters.vendedorId)?.label || "Vendedor"}`
                    : ""}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Ordenados por prioridad: urgente, alta, media y baja.
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={loadPendientes}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={13} strokeWidth={1.8} />
                Nuevo pendiente
              </button>

              <button
                type="button"
                onClick={() => setFiltersOpen((current) => !current)}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white"
              >
                {filtersOpen ? "Ocultar" : "Mostrar"}
                <ChevronsUpDown size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {filtersOpen ? (
            <div
              className={[
                "mt-4 grid gap-3",
                canManagePendientes
                  ? "lg:grid-cols-[180px_180px_220px_minmax(0,1fr)]"
                  : "lg:grid-cols-[180px_180px_minmax(0,1fr)]"
              ].join(" ")}
            >
              <div>
                <FieldLabel>Estado</FieldLabel>
                <NosturSelect
                  value={filters.estado}
                  onChange={(value) => setFilter("estado", value as typeof filters.estado)}
                  options={ESTADO_OPTIONS}
                />
              </div>

              <div>
                <FieldLabel>Prioridad</FieldLabel>
                <NosturSelect
                  value={filters.prioridad}
                  onChange={(value) => setFilter("prioridad", value as typeof filters.prioridad)}
                  options={PRIORIDAD_FILTER_OPTIONS}
                />
              </div>

              {canManagePendientes ? (
                <div>
                  <FieldLabel>Vendedor</FieldLabel>
                  <NosturSelect
                    value={filters.vendedorId}
                    onChange={(value) => setFilter("vendedorId", value)}
                    options={vendedorOptions}
                  />
                </div>
              ) : null}

              <div>
                <FieldLabel>Buscar</FieldLabel>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por texto, vendedor, sucursal o prioridad..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total visibles" value={metrics.total} icon={Filter} />
          <MetricCard label="Abiertos" value={metrics.abiertos} icon={AlertTriangle} />
          <MetricCard label="Urgentes" value={metrics.urgentes} icon={AlertTriangle} />
          <MetricCard label="Altos" value={metrics.altas} icon={AlertTriangle} />
          <MetricCard label="Resueltos 10 días" value={metrics.resueltos} icon={CheckCircle2} />
        </section>

        <section className="relative z-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#111827]">Listado de pendientes</h2>
              <p className="text-[11px] text-[#64748b]">
                {loading ? "Cargando..." : `${pendientes.length} pendientes encontrados`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
              Cargando pendientes...
            </div>
          ) : pendientes.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
              No hay pendientes para los filtros seleccionados.
            </div>
          ) : (
            <div className="grid gap-2">
              {pendientes.map((pendiente) => (
                <PendienteCard
                  key={pendiente.id}
                  pendiente={pendiente}
                  saving={saving}
                  onEdit={openEditModal}
                  onResolve={handleResolve}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {modalOpen ? (
        <PendienteModal
          pendiente={modalPendiente}
          saving={saving}
          onClose={() => {
            setModalOpen(false);
            setModalPendiente(null);
          }}
          onSave={handleSave}
        />
      ) : null}
<ConfirmModal confirm={confirm} saving={saving} onClose={() => setConfirm(null)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}