import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
  Copy,
  Edit3,
  Filter,
  RefreshCcw,
  Search,
  Sun,
  Trash2,
  Umbrella,
  UsersRound,
  X
} from "lucide-react";
import {
  useHorariosStore,
  type HorarioDraft,
  type HorarioTipo,
  type HorarioVendedor,
  type ProfileLite
} from "../../store/horariosStore";

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ModalMode = "edit" | "copy" | null;

const WEEK_DAYS_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const TIPO_OPTIONS: SelectOption[] = [
  { value: "TURNO", label: "Turno" },
  { value: "VACACIONES", label: "Vacaciones" },
  { value: "FERIADO", label: "Feriado" },
  { value: "DIA_LIBRE", label: "Día libre" }
];

function getToday(): string {
  const now = new Date();
  const argentinaNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Argentina/Cordoba" })
  );
  const year = argentinaNow.getFullYear();
  const month = String(argentinaNow.getMonth() + 1).padStart(2, "0");
  const day = String(argentinaNow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateAR(value?: string | null): string {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function formatDateShort(value?: string | null): string {
  if (!value) return "—";

  const [, month, day] = value.slice(0, 10).split("-");
  if (!month || !day) return "—";

  return `${day}/${month}`;
}

function formatHours(value: string | number | null | undefined): string {
  const parsed = Number(value || 0);

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Number.isFinite(parsed) ? parsed : 0);
}

function toTimeInput(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

function getTipoLabel(tipo: HorarioTipo): string {
  const found = TIPO_OPTIONS.find((item) => item.value === tipo);
  return found?.label || tipo;
}

function getTipoTone(tipo: HorarioTipo): string {
  if (tipo === "TURNO") return "border-blue-200 bg-blue-50 text-blue-800";
  if (tipo === "VACACIONES") return "border-green-200 bg-green-50 text-green-800";
  if (tipo === "FERIADO") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getTipoIcon(tipo: HorarioTipo) {
  if (tipo === "TURNO") return Clock3;
  if (tipo === "VACACIONES") return Umbrella;
  if (tipo === "FERIADO") return Sun;
  return CheckCircle2;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function getProfileName(profile: ProfileLite): string {
  return `${profile.nombre || ""} ${profile.apellido || ""}`.trim() || profile.email || "Sin nombre";
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
  placeholder,
  inputMode = "text",
  type = "text"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
}) {
  return (
    <input
      value={value}
      type={type}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
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
      className="min-h-[86px] w-full resize-none rounded-xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
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
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-left text-xs font-semibold text-[#111827] outline-none transition hover:bg-white"
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

          <div className="absolute left-0 right-0 top-[42px] z-[150] max-h-56 overflow-auto rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
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
          <div className={["mb-1 font-black", toast.type === "success" ? "text-green-700" : "text-red-700"].join(" ")}>
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
  icon: Icon,
  tone = "orange"
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarDays;
  tone?: "orange" | "blue" | "green" | "amber" | "slate";
}) {
  const toneClass = {
    orange: "bg-nostur-orange/15 text-nostur-orange",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700"
  }[tone];

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={["flex h-9 w-9 items-center justify-center rounded-xl", toneClass].join(" ")}>
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

function HorarioPill({
  horario,
  canManage,
  onEdit,
  onDelete
}: {
  horario: HorarioVendedor;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = getTipoIcon(horario.tipo);

  return (
    <div className={["group rounded-xl border px-2 py-1.5 text-[11px]", getTipoTone(horario.tipo)].join(" ")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 font-black">
            <Icon size={12} className="shrink-0" />
            <span className="truncate">
              {horario.tipo === "TURNO"
                ? `${toTimeInput(horario.hora_inicio)} - ${toTimeInput(horario.hora_fin)}`
                : getTipoLabel(horario.tipo)}
            </span>
          </div>

          {horario.tipo === "TURNO" ? (
            <div className="mt-0.5 text-[10px] font-bold opacity-80">
              {formatHours(horario.horas)} hs
            </div>
          ) : null}

          {horario.observaciones ? (
            <div className="mt-0.5 truncate text-[10px] font-semibold opacity-80">
              {horario.observaciones}
            </div>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/70 hover:bg-white"
              title="Editar"
            >
              <Edit3 size={12} />
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/70 text-red-600 hover:bg-white"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HorarioModal({
  open,
  saving,
  canDelete,
  vendedores,
  sucursales,
  initialDraft,
  onClose,
  onSave,
  onDelete
}: {
  open: boolean;
  saving: boolean;
  canDelete: boolean;
  vendedores: ProfileLite[];
  sucursales: SelectOption[];
  initialDraft: HorarioDraft | null;
  onClose: () => void;
  onSave: (draft: HorarioDraft) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<HorarioDraft | null>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  if (!open || !draft) return null;

  const vendedorOptions: SelectOption[] = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: getProfileName(vendedor)
  }));

  function setField<K extends keyof HorarioDraft>(key: K, value: HorarioDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {draft.id ? "Editar horario" : "Nuevo horario"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Cargá turno, vacaciones, feriado o día libre.
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

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Vendedor</FieldLabel>
            <NosturSelect
              value={draft.vendedor_id}
              onChange={(value) => {
                const vendedor = vendedores.find((item) => item.id === value);
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        vendedor_id: value,
                        sucursal_id: vendedor?.sucursal_id || current.sucursal_id
                      }
                    : current
                );
              }}
              options={vendedorOptions}
            />
          </div>

          <div>
            <FieldLabel>Sucursal</FieldLabel>
            <NosturSelect
              value={draft.sucursal_id || ""}
              onChange={(value) => setField("sucursal_id", value)}
              options={sucursales}
              placeholder="Seleccionar sucursal"
            />
          </div>

          <div>
            <FieldLabel>Fecha</FieldLabel>
            <TextInput
              value={draft.fecha}
              onChange={(value) => setField("fecha", value)}
              type="date"
            />
          </div>

          <div>
            <FieldLabel>Tipo</FieldLabel>
            <NosturSelect
              value={draft.tipo}
              onChange={(value) => setField("tipo", value as HorarioTipo)}
              options={TIPO_OPTIONS}
            />
          </div>

          {draft.tipo === "TURNO" ? (
            <>
              <div>
                <FieldLabel>Desde</FieldLabel>
                <TextInput
                  value={draft.hora_inicio}
                  onChange={(value) => setField("hora_inicio", value)}
                  type="time"
                />
              </div>

              <div>
                <FieldLabel>Hasta</FieldLabel>
                <TextInput
                  value={draft.hora_fin}
                  onChange={(value) => setField("hora_fin", value)}
                  type="time"
                />
              </div>
            </>
          ) : null}

          <div className="md:col-span-2">
            <FieldLabel>Observaciones</FieldLabel>
            <TextArea
              value={draft.observaciones}
              onChange={(value) => setField("observaciones", value)}
              placeholder="Notas internas del horario..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <div>
            {canDelete && draft.id ? (
              <button
                type="button"
                disabled={saving}
                onClick={onDelete}
                className="h-9 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Eliminar
              </button>
            ) : null}
          </div>

          <div className="flex gap-2">
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
    </div>
  );
}

function CopyWeekModal({
  open,
  saving,
  onClose,
  onCopy
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onCopy: (modo: "COMPLETAR_VACIOS" | "REEMPLAZAR") => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Copiar 2 semanas anteriores</h2>
            <p className="text-xs text-[#64748b]">
              Ejemplo: en semana 3 copia la semana 1, en semana 4 copia la semana 2.
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
          <button
            type="button"
            disabled={saving}
            onClick={() => onCopy("COMPLETAR_VACIOS")}
            className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-left transition hover:bg-white disabled:opacity-50"
          >
            <div className="text-sm font-black text-[#111827]">Completar vacíos</div>
            <div className="mt-1 text-xs font-semibold text-[#64748b]">
              Copia los turnos de 2 semanas atrás solo donde todavía no hay horarios cargados.
            </div>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => onCopy("REEMPLAZAR")}
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-left transition hover:bg-red-100 disabled:opacity-50"
          >
            <div className="text-sm font-black text-red-700">Reemplazar semana</div>
            <div className="mt-1 text-xs font-semibold text-red-700">
              Desactiva los horarios actuales de la semana y copia todo desde 2 semanas atrás.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export function HorariosPanel() {
  const loading = useHorariosStore((state) => state.loading);
  const saving = useHorariosStore((state) => state.saving);
  const error = useHorariosStore((state) => state.error);
  const currentProfile = useHorariosStore((state) => state.currentProfile);
  const canManageHorarios = useHorariosStore((state) => state.canManageHorarios);
  const catalogos = useHorariosStore((state) => state.catalogos);
  const filters = useHorariosStore((state) => state.filters);
  const horasSemanales = useHorariosStore((state) => state.horasSemanales);

  const loadHorarios = useHorariosStore((state) => state.loadHorarios);
  const saveHorario = useHorariosStore((state) => state.saveHorario);
  const deleteHorario = useHorariosStore((state) => state.deleteHorario);
  const copyPreviousWeek = useHorariosStore((state) => state.copyPreviousWeek);
  const setFilter = useHorariosStore((state) => state.setFilter);
  const clearError = useHorariosStore((state) => state.clearError);
  const resetFilters = useHorariosStore((state) => state.resetFilters);
  const selectHorario = useHorariosStore((state) => state.selectHorario);
  const goToPreviousWeek = useHorariosStore((state) => state.goToPreviousWeek);
  const goToNextWeek = useHorariosStore((state) => state.goToNextWeek);
  const goToCurrentWeek = useHorariosStore((state) => state.goToCurrentWeek);

  const getWeekDays = useHorariosStore((state) => state.getWeekDays);
  const getHorariosByCell = useHorariosStore((state) => state.getHorariosByCell);
  const getVendedoresVisibles = useHorariosStore((state) => state.getVendedoresVisibles);
  const getMetrics = useHorariosStore((state) => state.getMetrics);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [draft, setDraft] = useState<HorarioDraft | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const weekDays = getWeekDays().slice(0, 6);
  const semanaSabado = weekDays[5] || filters.semanaInicio;
  const vendedores = getVendedoresVisibles();
  const metrics = getMetrics();
  const today = getToday();

  const sucursalOptions: SelectOption[] = [
    { value: "todas", label: "Todas" },
    ...catalogos.sucursales.map((item) => ({
      value: item.id,
      label: item.nombre
    }))
  ];

  const sucursalModalOptions: SelectOption[] = catalogos.sucursales.map((item) => ({
    value: item.id,
    label: item.nombre
  }));

  const vendedorOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    ...catalogos.vendedores.map((item) => ({
      value: item.id,
      label: getProfileName(item)
    }))
  ];

  const horasByVendedor = useMemo(() => {
    return new Map(horasSemanales.map((item) => [item.vendedor_id, Number(item.horas || 0)]));
  }, [horasSemanales]);

  useEffect(() => {
    loadHorarios();
  }, [loadHorarios]);

  useEffect(() => {
    loadHorarios();
  }, [filters.semanaInicio]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function openNewHorario(vendedor?: ProfileLite, fecha?: string) {
    if (!canManageHorarios) return;

    const selectedVendedor = vendedor || catalogos.vendedores[0] || null;
    const selectedSucursalId =
      selectedVendedor?.sucursal_id ||
      (filters.sucursalId !== "todas" ? filters.sucursalId : catalogos.sucursales[0]?.id || null);

    setDraft({
      id: null,
      vendedor_id: selectedVendedor?.id || "",
      sucursal_id: selectedSucursalId,
      fecha: fecha || today,
      tipo: "TURNO",
      hora_inicio: "09:00",
      hora_fin: "15:00",
      observaciones: ""
    });
    setModalMode("edit");
  }

  function openEditHorario(horario: HorarioVendedor) {
    if (!canManageHorarios) return;

    selectHorario(horario.id);
    setDraft({
      id: horario.id,
      vendedor_id: horario.vendedor_id,
      sucursal_id: horario.sucursal_id,
      fecha: horario.fecha,
      tipo: horario.tipo,
      hora_inicio: toTimeInput(horario.hora_inicio),
      hora_fin: toTimeInput(horario.hora_fin),
      observaciones: horario.observaciones || ""
    });
    setModalMode("edit");
  }

  async function handleSave(nextDraft: HorarioDraft) {
    const ok = await saveHorario(nextDraft);

    if (ok) {
      setModalMode(null);
      setDraft(null);
      showToast("Horario guardado correctamente.");
    } else {
      showToast(useHorariosStore.getState().error || "No se pudo guardar el horario.", "error");
    }
  }

  async function handleDelete() {
    if (!draft?.id) return;

    const ok = await deleteHorario(draft.id);

    if (ok) {
      setModalMode(null);
      setDraft(null);
      showToast("Horario eliminado.");
    } else {
      showToast(useHorariosStore.getState().error || "No se pudo eliminar el horario.", "error");
    }
  }

  async function handleCopy(modo: "COMPLETAR_VACIOS" | "REEMPLAZAR") {
    const ok = await copyPreviousWeek(modo);

    if (ok) {
      setModalMode(null);
      showToast(
        modo === "REEMPLAZAR"
          ? "Semana reemplazada con los horarios de 2 semanas atrás."
          : "Horarios de 2 semanas atrás copiados en los días vacíos."
      );
    } else {
      showToast(useHorariosStore.getState().error || "No se pudo copiar la semana.", "error");
    }
  }

  function handlePreviousWeek() {
    goToPreviousWeek();
  }

  function handleNextWeek() {
    goToNextWeek();
  }

  function handleCurrentWeek() {
    goToCurrentWeek();
    window.setTimeout(() => loadHorarios(), 0);
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Horarios</h1>
          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            VENDEDORES
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            {canManageHorarios
              ? "Turnos, vacaciones, feriados y control de horas"
              : `Horarios visibles para ${currentProfile?.nombre || "tu usuario"}`}
          </span>
        </div>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
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
                  {formatDateAR(filters.semanaInicio)} → {formatDateAR(semanaSabado)}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Sucursal: {filters.sucursalId} · Vendedor: {filters.vendedorId}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCurrentWeek}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white"
              >
                Hoy
              </button>

              <button
                type="button"
                onClick={loadHorarios}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              {canManageHorarios ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalMode("copy")}
                    disabled={saving}
                    className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
                  >
                    <Copy size={13} strokeWidth={1.8} />
                    Copiar 2 semanas
                  </button>

                  <button
                    type="button"
                    onClick={() => openNewHorario()}
                    className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                  >
                    + Nuevo turno
                  </button>
                </>
              ) : null}

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
            <>
              <div className="mt-4 grid gap-3 lg:grid-cols-[160px_1fr_1fr_1.4fr]">
                <div>
                  <FieldLabel>Semana</FieldLabel>
                  <TextInput
                    value={filters.semanaInicio}
                    onChange={(value) => setFilter("semanaInicio", value)}
                    type="date"
                  />
                </div>

                <div>
                  <FieldLabel>Sucursal</FieldLabel>
                  <NosturSelect
                    value={filters.sucursalId}
                    onChange={(value) => setFilter("sucursalId", value)}
                    options={sucursalOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Vendedor</FieldLabel>
                  <NosturSelect
                    value={filters.vendedorId}
                    onChange={(value) => setFilter("vendedorId", value)}
                    options={vendedorOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Buscar</FieldLabel>
                  <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                    <Search size={14} className="shrink-0 text-[#64748b]" />
                    <input
                      value={filters.search}
                      onChange={(event) => setFilter("search", event.target.value)}
                      placeholder="Buscar vendedor, sucursal, observación..."
                      className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetFilters();
                    window.setTimeout(() => loadHorarios(), 0);
                  }}
                  className="h-9 rounded-xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  onClick={loadHorarios}
                  className="h-9 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                >
                  Aplicar filtros
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Vendedores" value={metrics.vendedores} icon={UsersRound} />
          <MetricCard label="Turnos" value={metrics.turnos} icon={Clock3} tone="blue" />
          <MetricCard label="Horas totales" value={`${formatHours(metrics.horasTotales)} hs`} icon={CalendarDays} tone="orange" />
          <MetricCard label="Vacaciones" value={metrics.vacaciones} icon={Umbrella} tone="green" />
          <MetricCard label="Feriados" value={metrics.feriados} icon={Sun} tone="amber" />
          <MetricCard label="Días libres" value={metrics.diasLibres} icon={CheckCircle2} tone="slate" />
        </section>

        <section className="relative z-0 overflow-hidden rounded-[24px] border border-black/10 bg-white/70 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays size={17} className="text-nostur-orange" />
              <h2 className="truncate text-sm font-black text-[#111827]">
                Semana {formatDateAR(filters.semanaInicio)} → {formatDateAR(semanaSabado)}
              </h2>
              {loading ? (
                <span className="rounded-xl bg-white px-2 py-1 text-[10px] font-black text-[#64748b]">
                  Cargando...
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePreviousWeek}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827]"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={handleNextWeek}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="overflow-auto">
            <div className="min-w-[1040px]">
              <div className="grid grid-cols-[230px_repeat(6,minmax(130px,1fr))_110px] border-b border-black/10 bg-[#f8fafc]">
                <div className="border-r border-black/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                  Vendedor
                </div>

                {weekDays.map((date, index) => (
                  <div
                    key={date}
                    className={[
                      "border-r border-black/10 px-2 py-2 text-center",
                      date === today ? "bg-nostur-orange/10" : ""
                    ].join(" ")}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                      {WEEK_DAYS_LABELS[index]}
                    </div>
                    <div className="text-xs font-black text-[#111827]">{formatDateShort(date)}</div>
                  </div>
                ))}

                <div className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                  Horas
                </div>
              </div>

              {vendedores.length === 0 ? (
                <div className="p-6 text-center text-xs font-semibold text-[#64748b]">
                  No hay vendedores para los filtros seleccionados.
                </div>
              ) : (
                vendedores.map((vendedor) => {
                  const vendedorNombre = getProfileName(vendedor);
                  const horas = horasByVendedor.get(vendedor.id) || 0;

                  return (
                    <div
                      key={vendedor.id}
                      className="grid grid-cols-[230px_repeat(6,minmax(130px,1fr))_110px] border-b border-black/10 last:border-b-0"
                    >
                      <div className="flex min-w-0 items-center gap-3 border-r border-black/10 bg-white/60 px-3 py-3">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                          style={{ backgroundColor: vendedor.color || "#ff7a1a" }}
                        >
                          {getInitials(vendedorNombre)}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-[#111827]">
                            {vendedorNombre}
                          </div>
                          <div className="truncate text-[11px] text-[#64748b]">
                            {vendedor.email}
                          </div>
                        </div>
                      </div>

                      {weekDays.map((date) => {
                        const cellHorarios = getHorariosByCell(vendedor.id, date);
                        const isToday = date === today;

                        return (
                          <div
                            key={`${vendedor.id}-${date}`}
                            className={[
                              "min-h-[98px] border-r border-black/10 p-2 transition",
                              isToday ? "bg-nostur-orange/5" : "bg-white/40",
                              canManageHorarios ? "cursor-pointer hover:bg-white" : ""
                            ].join(" ")}
                            onClick={() => {
                              if (canManageHorarios && cellHorarios.length === 0) {
                                openNewHorario(vendedor, date);
                              }
                            }}
                          >
                            <div className="grid gap-1.5">
                              {cellHorarios.map((horario) => (
                                <HorarioPill
                                  key={horario.id}
                                  horario={horario}
                                  canManage={canManageHorarios}
                                  onEdit={() => openEditHorario(horario)}
                                  onDelete={() => {
                                    setDraft({
                                      id: horario.id,
                                      vendedor_id: horario.vendedor_id,
                                      sucursal_id: horario.sucursal_id,
                                      fecha: horario.fecha,
                                      tipo: horario.tipo,
                                      hora_inicio: toTimeInput(horario.hora_inicio),
                                      hora_fin: toTimeInput(horario.hora_fin),
                                      observaciones: horario.observaciones || ""
                                    });
                                    window.setTimeout(() => handleDelete(), 0);
                                  }}
                                />
                              ))}

                              {cellHorarios.length === 0 && canManageHorarios ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openNewHorario(vendedor, date);
                                  }}
                                  className="flex h-8 items-center justify-center rounded-xl border border-dashed border-black/10 text-[11px] font-black text-[#94a3b8] hover:border-nostur-orange/40 hover:bg-nostur-orange/5 hover:text-nostur-orange"
                                >
                                  + Turno
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex items-center justify-end bg-white/60 px-3 py-3 text-sm font-black text-[#111827]">
                        {formatHours(horas)} hs
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 flex flex-wrap items-center gap-2 rounded-[24px] border border-black/10 bg-white/60 p-3 text-[11px] font-bold text-[#64748b] shadow-sm backdrop-blur">
          <span className="mr-1 font-black uppercase tracking-wide text-[#475569]">Leyenda:</span>
          <span className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-800">Turno</span>
          <span className="rounded-xl border border-green-200 bg-green-50 px-2.5 py-1 text-green-800">Vacaciones</span>
          <span className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-800">Feriado</span>
          <span className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">Día libre</span>
        </section>
      </div>

      <HorarioModal
        open={modalMode === "edit"}
        saving={saving}
        canDelete={Boolean(draft?.id)}
        vendedores={catalogos.vendedores}
        sucursales={sucursalModalOptions}
        initialDraft={draft}
        onClose={() => {
          setModalMode(null);
          setDraft(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <CopyWeekModal
        open={modalMode === "copy"}
        saving={saving}
        onClose={() => setModalMode(null)}
        onCopy={handleCopy}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}