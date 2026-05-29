import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronsUpDown,
  Eye,
  FilePenLine,
  Filter,
  RefreshCcw,
  Search,
  UserRound,
  Wallet,
  X
} from "lucide-react";
import {
  useControlVentasStore,
  type CarritoControlItem,
  type ControlDraft,
  type ControlVenta
} from "../../store/controlVentasStore";
import { IconButton } from "../ui/IconButton";
import { NosturDateInput } from "../ui/NosturDateInput";
import { formatMoneyAR } from "../../lib/formatters";

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type AnularControlState = ControlVenta | null;

type SelectedResumen = ReturnType<
  ReturnType<typeof useControlVentasStore.getState>["getSelectedResumen"]
>;

const ESTADO_CONTROL_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "controlado", label: "Controlados" }
];

const SI_NO_TODOS_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "si", label: "Sí" },
  { value: "no", label: "No" }
];

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todas" },
  { value: "ARS", label: "Pesos" },
  { value: "USD", label: "Dólares" }
];

const ANULADO_OPTIONS: SelectOption[] = [
  { value: "no", label: "No anulados" },
  { value: "si", label: "Anulados" },
  { value: "todos", label: "Todos" }
];

function getMonthOptions(): SelectOption[] {
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const options: SelectOption[] = [];

  for (let year = currentYear - 2; year <= currentYear + 1; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const value = `${year}-${String(month).padStart(2, "0")}`;

      options.push({
        value,
        label: `${monthNames[month - 1]} ${year}`
      });
    }
  }

  return options.reverse();
}

function getCurrentMonthValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function shiftMonthValue(monthValue: string, offset: number): string {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!year || !month) return getCurrentMonthValue();

  const date = new Date(year, month - 1 + offset, 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");

  return `${nextYear}-${nextMonth}`;
}

function toDisplayDate(value?: string | null): string {
  if (!value) return "";

  const clean = value.slice(0, 10);
  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return "";

  return `${day}/${month}/${year}`;
}

function formatDateAR(value?: string | null): string {
  if (!value) return "—";
  return toDisplayDate(value) || "—";
}

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const normalized = String(value || "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}



function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function getTravelLabel(carrito: CarritoControlItem): string {
  return `${formatDateAR(carrito.fecha_in)} → ${
    carrito.solo_ida ? "Solo ida" : formatDateAR(carrito.fecha_out)
  }`;
}

function calculatePreview(utilidadAlmundo: string, importeRegalia: string) {
  const utilidad = parseMoney(utilidadAlmundo);
  const rawRegalia = importeRegalia.trim() ? parseMoney(importeRegalia) : utilidad * 0.36;

  const regalia =
    rawRegalia > 0 && rawRegalia <= 1 && utilidad > 1 ? utilidad * rawRegalia : rawRegalia;

  const pct = utilidad > 0 ? (regalia / utilidad) * 100 : 36;
  const nossix = utilidad - regalia;
  const aFacturar = nossix * 1.21;

  return {
    utilidad,
    pct,
    regalia,
    nossix,
    aFacturar
  };
}

function formatDraftMoney(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0);
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
  inputMode = "text"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      value={value}
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
      className="min-h-[82px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
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
  const [search, setSearch] = useState("");
  const selected = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const q = normalizeText(search);

    if (!q) return options;

    return options.filter((option) => normalizeText(`${option.label} ${option.value}`).includes(q));
  }, [options, search]);

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
            onClick={() => {
              setOpen(false);
              setSearch("");
            }}
            tabIndex={-1}
          />

          <div className="absolute left-0 right-0 top-[42px] z-[150] rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
            {options.length > 8 ? (
              <div className="mb-2 flex h-8 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-2">
                <Search size={13} className="text-[#94a3b8]" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar..."
                  autoFocus
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
                />
              </div>
            ) : null}

            <div className="max-h-56 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs font-bold text-[#94a3b8]">Sin opciones</div>
              ) : (
                filteredOptions.map((option) => {
                  const active = option.value === value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                        setSearch("");
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
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatusBadge({
  children,
  type
}: {
  children: ReactNode;
  type: "ok" | "pending" | "danger" | "neutral";
}) {
  const className = {
    ok: "border-green-200 bg-green-50 text-green-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-black/10 bg-white text-[#334155]"
  }[type];

  return (
    <span
      className={[
        "rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
        className
      ].join(" ")}
    >
      {children}
    </span>
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

function buildInitialDraft(control: ControlVenta | null): ControlDraft {
  const utilidad = parseMoney(control?.utilidad_almundo || 0);
  const storedRegalia = parseMoney(control?.importe_regalia || 0);

  const normalizedRegalia =
    storedRegalia > 0 && storedRegalia <= 1 && utilidad > 1
      ? utilidad * storedRegalia
      : storedRegalia;

  return {
    utilidad_almundo: control?.utilidad_almundo
      ? String(control.utilidad_almundo).replace(".", ",")
      : "",
    importe_regalia: normalizedRegalia > 0 ? formatDraftMoney(normalizedRegalia) : "",
    controlado: true,
    facturado: Boolean(control?.facturado),
    cobrado: Boolean(control?.cobrado),
    observaciones: control?.observaciones || ""
  };
}

function MotivoAnulacionControlModal({
  control,
  saving,
  onClose,
  onConfirm
}: {
  control: ControlVenta | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    setMotivo("");
  }, [control?.id]);

  if (!control) return null;

  const canConfirm = motivo.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[280] flex items-start justify-center bg-black/25 px-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#111827]">Anular control</h2>

            <p className="mt-1 text-xs font-semibold leading-relaxed text-[#64748b]">
              Indicá el motivo de anulación del control. Quedará guardado como respaldo
              administrativo.
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

        <div>
          <FieldLabel>Motivo</FieldLabel>

          <TextArea
            value={motivo}
            onChange={setMotivo}
            placeholder="Ej: diferencia detectada, control cargado por error, importes incorrectos..."
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
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
            disabled={saving || !canConfirm}
            onClick={() => onConfirm(motivo.trim())}
            className="h-9 rounded-xl bg-red-600 px-5 text-xs font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Anulando..." : "Anular control"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ControlSidePanel({
  selected,
  saving,
  onSave,
  onAnular
}: {
  selected: SelectedResumen;
  saving: boolean;
  onSave: (draft: ControlDraft) => Promise<void>;
  onAnular: (control: ControlVenta) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ControlDraft>(() =>
    buildInitialDraft(selected?.control || null)
  );

  useEffect(() => {
    setDraft(buildInitialDraft(selected?.control || null));
  }, [selected?.carrito.id, selected?.control?.id]);

  if (!selected) {
    return (
      <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
          Seleccioná un carrito para controlar.
        </div>
      </aside>
    );
  }

  const carrito = selected.carrito;
  const cliente = carrito.clientes;
  const preview = calculatePreview(draft.utilidad_almundo, draft.importe_regalia);
  const locked = selected.controlado || selected.facturado || selected.cobrado || selected.anulado;

  function setField<K extends keyof ControlDraft>(key: K, value: ControlDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white">
            {getInitials(cliente?.nombre_completo || "C")}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-[#111827]">
              {carrito.numero_carrito}
            </h2>

            <p className="truncate text-xs text-[#64748b]">
              {cliente?.nombre_completo || "Sin cliente"}
            </p>
          </div>
        </div>

        {selected.anulado ? (
          <StatusBadge type="danger">ANULADO</StatusBadge>
        ) : selected.controlado ? (
          <StatusBadge type="ok">CONTROLADO</StatusBadge>
        ) : (
          <StatusBadge type="pending">PENDIENTE</StatusBadge>
        )}
      </div>

      <div className="grid gap-4 text-xs">
        {locked ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-xs font-bold text-green-700">
            Este carrito ya está controlado/cerrado. No se puede volver a controlar ni
            descontrolar.
          </div>
        ) : null}

        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
          <div className="mb-2 flex items-center gap-2">
            <UserRound size={14} className="text-nostur-orange" />

            <span className="truncate font-black text-[#111827]">
              {cliente?.nombre_completo || "Sin cliente"}
            </span>
          </div>

          <div className="text-[#64748b]">{cliente?.telefono || "—"}</div>
          <div className="text-[#64748b]">{cliente?.email || "Sin email"}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
          <FieldLabel>Datos del carrito</FieldLabel>

          <div className="font-black text-[#111827]">{carrito.destino || "Sin destino"}</div>

          <div className="text-[#64748b]">
            {carrito.servicio || "Sin servicio"} · {getTravelLabel(carrito)}
          </div>

          <div className="mt-1 text-[#64748b]">
            Venta: <strong>{formatMoneyAR(carrito.importe_final, carrito.moneda)}</strong>
          </div>

          <div className="text-[#64748b]">
            Fecha venta: <strong>{formatDateAR(carrito.fecha_venta)}</strong>
          </div>

          <div className="text-[#64748b]">
            Vendedor: <strong>{carrito.vendedor || "—"}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
          <FieldLabel>Control económico</FieldLabel>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Utilidad bruta</FieldLabel>

              <div className={locked ? "pointer-events-none opacity-60" : ""}>
                <TextInput
                  value={draft.utilidad_almundo}
                  onChange={(value) => {
                    const utilidadAnterior = parseMoney(draft.utilidad_almundo);
                    const regaliaActual = parseMoney(draft.importe_regalia);
                    const regaliaAutomaticaAnterior =
                      utilidadAnterior > 0 ? utilidadAnterior * 0.36 : 0;

                    const utilidadNueva = parseMoney(value);

                    const debeRecalcularRegalia =
                      !draft.importe_regalia.trim() ||
                      regaliaActual <= 1 ||
                      Math.abs(regaliaActual - regaliaAutomaticaAnterior) < 0.01;

                    setField("utilidad_almundo", value);

                    if (utilidadNueva > 0 && debeRecalcularRegalia) {
                      setField("importe_regalia", formatDraftMoney(utilidadNueva * 0.36));
                    }
                  }}
                  placeholder={locked ? "Control cerrado. No se puede modificar." : "0,00"}
                  inputMode="decimal"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Regalías</FieldLabel>

              <div className={locked ? "pointer-events-none opacity-60" : ""}>
                <TextInput
                  value={draft.importe_regalia}
                  onChange={(value) => {
                    const utilidad = parseMoney(draft.utilidad_almundo);
                    const regalia = parseMoney(value);

                    if (utilidad > 0 && regalia > 0 && regalia <= 1) {
                      setField("importe_regalia", formatDraftMoney(utilidad * regalia));
                      return;
                    }

                    setField("importe_regalia", value);
                  }}
                  placeholder={
                    locked
                      ? "Control cerrado. No se puede modificar."
                      : "Importe automático: 36%"
                  }
                  inputMode="decimal"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
            <div className="flex justify-between gap-3">
              <span className="text-[#64748b]">Regalías</span>
              <strong>{formatMoneyAR(preview.regalia, carrito.moneda)}</strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-[#64748b]">% regalía ref.</span>

              <strong>
                {new Intl.NumberFormat("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }).format(preview.pct)}
                %
              </strong>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-[#64748b]">Utilidad neta</span>

              <strong className="text-green-700">
                {formatMoneyAR(preview.nossix, carrito.moneda)}
              </strong>
            </div>

            <div className="mt-2 flex justify-between gap-3 border-t border-black/10 pt-2">
              <span className="font-black text-[#111827]">Facturación</span>

              <strong className="text-nostur-orange">
                {formatMoneyAR(preview.aFacturar, carrito.moneda)}
              </strong>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Observaciones</FieldLabel>

          <div className={locked ? "pointer-events-none opacity-60" : ""}>
            <TextArea
              value={draft.observaciones}
              onChange={(value) => setField("observaciones", value)}
              placeholder={
                locked
                  ? "Control cerrado. No se puede modificar."
                  : "Notas de control, factura, cobro o diferencias..."
              }
            />
          </div>
        </div>

        <button
          type="button"
          disabled={saving || locked}
          onClick={() => onSave(draft)}
          className="h-10 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
        >
          {saving ? "Guardando..." : locked ? "Control cerrado" : "Guardar control"}
        </button>

        {selected.control && !selected.controlado ? (
          <button
            type="button"
            disabled={saving || selected.anulado}
            onClick={() => onAnular(selected.control as ControlVenta)}
            className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            Anular control
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export function ControlVentasPanel() {
  const loading = useControlVentasStore((state) => state.loading);
  const saving = useControlVentasStore((state) => state.saving);
  const error = useControlVentasStore((state) => state.error);
  const currentProfile = useControlVentasStore((state) => state.currentProfile);
  const canManageControlVentas = useControlVentasStore((state) => state.canManageControlVentas);
  const filters = useControlVentasStore((state) => state.filters);
  const catalogos = useControlVentasStore((state) => state.catalogos);
  const selectedCarritoId = useControlVentasStore((state) => state.selectedCarritoId);

  const loadControlVentas = useControlVentasStore((state) => state.loadControlVentas);
  const saveControlVenta = useControlVentasStore((state) => state.saveControlVenta);
  const anularControlVenta = useControlVentasStore((state) => state.anularControlVenta);
  const setFilter = useControlVentasStore((state) => state.setFilter);
  const clearError = useControlVentasStore((state) => state.clearError);
  const selectCarrito = useControlVentasStore((state) => state.selectCarrito);

  const getResumen = useControlVentasStore((state) => state.getResumen);
  const getSelectedResumen = useControlVentasStore((state) => state.getSelectedResumen);
  const getMetrics = useControlVentasStore((state) => state.getMetrics);

  const resumen = getResumen();
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [controlAnular, setControlAnular] = useState<AnularControlState>(null);

  const selectedResumen = useMemo(
    () => getSelectedResumen(),
    [resumen, selectedCarritoId, getSelectedResumen]
  );

  const monthOptions = useMemo(() => getMonthOptions(), []);

  const selectedMonthLabel =
    monthOptions.find((option) => option.value === filters.mes)?.label || filters.mes;

  const currentMonthValue = getCurrentMonthValue();

  
 function applyMonthAndReload(monthValue: string) {
  setFilter("mes", monthValue);

  window.setTimeout(() => {
    loadControlVentas();
  }, 0);
}

function goToPreviousMonth() {
  applyMonthAndReload(shiftMonthValue(filters.mes, -1));
}

function goToNextMonth() {
  applyMonthAndReload(shiftMonthValue(filters.mes, 1));
}

function goToCurrentMonth() {
  applyMonthAndReload(currentMonthValue);
}

  useEffect(() => {
    loadControlVentas();
  }, [loadControlVentas]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function handleSave(draft: ControlDraft) {
    if (!selectedResumen) return;

    const ok = await saveControlVenta(selectedResumen.carrito, draft);

    if (ok) showToast("Control guardado correctamente.");
  }

  async function handleAnular(control: ControlVenta) {
    setControlAnular(control);
  }

  async function confirmAnularControl(motivo: string) {
    if (!controlAnular) return;

    const ok = await anularControlVenta(controlAnular, motivo);

    if (ok) {
      setControlAnular(null);
      showToast("Control anulado correctamente.");
    }
  }

  const vendedorOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    ...catalogos.vendedores.map((item) => ({
      value: item.id,
      label: `${item.nombre} ${item.apellido}`.trim()
    }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "todos", label: "Todas" },
    ...catalogos.sucursales.map((item) => ({
      value: item.id,
      label: item.nombre
    }))
  ];

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">
            Control de ventas
          </h1>

          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            ALMUNDO
          </span>

          <span className="text-xs font-semibold text-[#64748b]">
            {canManageControlVentas
              ? "Liquidación, regalías, facturación y cobro"
              : `Carritos asignados a ${currentProfile?.nombre || "tu usuario"}`}
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
                  Mes operativo obligatorio
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                {selectedMonthLabel} · {filters.desde} → {filters.hasta} · Moneda:{" "}
                {filters.moneda} · Control: {filters.estadoControl} · Facturado:{" "}
                {filters.facturado} · Cobrado: {filters.cobrado}
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
  <div className="flex items-center gap-1.5 rounded-2xl border border-black/10 bg-white/70 p-1 shadow-sm">
    <button
      type="button"
      onClick={goToPreviousMonth}
      className="h-8 rounded-xl px-3 text-[11px] font-black text-[#334155] transition hover:bg-[#f8fafc]"
    >
      Mes anterior
    </button>

    <div className="flex h-8 min-w-[112px] items-center justify-center rounded-xl bg-[#111827] px-3 text-center text-[11px] font-black text-white">
      {selectedMonthLabel}
    </div>

    <button
      type="button"
      onClick={goToNextMonth}
      className="h-8 rounded-xl px-3 text-[11px] font-black text-[#334155] transition hover:bg-[#f8fafc]"
    >
      Mes siguiente
    </button></div>

    <button
      type="button"
      onClick={goToCurrentMonth}
      className={[
        "h-8 rounded-xl px-3 text-[11px] font-black transition",
        filters.mes === currentMonthValue
          ? "bg-nostur-orange text-white"
          : "text-[#334155] hover:bg-[#f8fafc]"
      ].join(" ")}
    >
      Este mes
    </button>
  </div>
              <button
                type="button"
                onClick={loadControlVentas}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
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
            <>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_1.1fr_1fr_1fr_1fr]">
                <div className="rounded-2xl border border-nostur-orange/20 bg-white/70 p-2">
                  <FieldLabel>Mes operativo</FieldLabel>

                  <div className="flex h-9 items-center rounded-xl border border-black/10 bg-[#111827] px-3 text-xs font-black text-white">
                    {selectedMonthLabel}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-white/70 p-2">
                  <div>
                    <FieldLabel>Desde</FieldLabel>

                    <NosturDateInput
                      value={filters.desde}
                      onChange={(value) => setFilter("desde", value)}
                    />
                  </div>

                  <div>
                    <FieldLabel>Hasta</FieldLabel>

                    <NosturDateInput
                      value={filters.hasta}
                      onChange={(value) => setFilter("hasta", value)}
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Moneda</FieldLabel>

                  <NosturSelect
                    value={filters.moneda}
                    onChange={(value) => setFilter("moneda", value as typeof filters.moneda)}
                    options={MONEDA_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Estado control</FieldLabel>

                  <NosturSelect
                    value={filters.estadoControl}
                    onChange={(value) =>
                      setFilter("estadoControl", value as typeof filters.estadoControl)
                    }
                    options={ESTADO_CONTROL_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Facturado</FieldLabel>

                  <NosturSelect
                    value={filters.facturado}
                    onChange={(value) =>
                      setFilter("facturado", value as typeof filters.facturado)
                    }
                    options={SI_NO_TODOS_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Cobrado</FieldLabel>

                  <NosturSelect
                    value={filters.cobrado}
                    onChange={(value) => setFilter("cobrado", value as typeof filters.cobrado)}
                    options={SI_NO_TODOS_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Anulado</FieldLabel>

                  <NosturSelect
                    value={filters.anulado}
                    onChange={(value) => setFilter("anulado", value as typeof filters.anulado)}
                    options={ANULADO_OPTIONS}
                  />
                </div>

                {canManageControlVentas ? (
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
                  <FieldLabel>Sucursal</FieldLabel>

                  <NosturSelect
                    value={filters.sucursalId}
                    onChange={(value) => setFilter("sucursalId", value)}
                    options={sucursalOptions}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />

                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por cliente, teléfono, carrito, destino..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadControlVentas}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Aplicar filtros
                </button>

                <button
                  type="button"
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                  title="La exportación se agrega en la próxima etapa."
                >
                  Exportar Excel
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 xl:grid-cols-2">
          <div className="rounded-[24px] border border-blue-200 bg-blue-50/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <Wallet size={17} className="text-blue-700" />

              <h2 className="text-sm font-black text-blue-800">Resumen Facturación ARS</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-200 bg-white/60 p-4">
                <div className="text-[12px] font-black text-blue-600">Total facturado ARS</div>

                <div className="mt-1 text-xl font-black text-blue-800">
                  {formatMoneyAR(metrics.ars.totalFacturado, "ARS")}
                </div>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50/70 p-4">
                <div className="text-[12px] font-black text-green-600">Cobrado Mes ARS</div>

                <div className="mt-1 text-xl font-black text-green-800">
                  {formatMoneyAR(metrics.ars.cobradoMes, "ARS")}
                </div>
              </div>

              <div className="rounded-2xl border border-nostur-orange/30 bg-nostur-orange/10 p-4">
                <div className="text-[12px] font-black text-nostur-orange">
                  A Cobrar Semana ARS
                </div>

                <div className="mt-1 text-xl font-black text-orange-900">
                  {formatMoneyAR(metrics.ars.aCobrarSemana, "ARS")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-blue-200 bg-blue-50/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-2">
              <Wallet size={17} className="text-blue-700" />

              <h2 className="text-sm font-black text-blue-800">Resumen Facturación USD</h2>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-200 bg-white/60 p-4">
                <div className="text-[12px] font-black text-blue-600">Total facturado USD</div>

                <div className="mt-1 text-xl font-black text-blue-800">
                  {formatMoneyAR(metrics.usd.totalFacturado, "USD")}
                </div>
              </div>

              <div className="rounded-2xl border border-green-200 bg-green-50/70 p-4">
                <div className="text-[12px] font-black text-green-600">Cobrado Mes USD</div>

                <div className="mt-1 text-xl font-black text-green-800">
                  {formatMoneyAR(metrics.usd.cobradoMes, "USD")}
                </div>
              </div>

              <div className="rounded-2xl border border-nostur-orange/30 bg-nostur-orange/10 p-4">
                <div className="text-[12px] font-black text-nostur-orange">
                  A Cobrar Semana USD
                </div>

                <div className="mt-1 text-xl font-black text-orange-900">
                  {formatMoneyAR(metrics.usd.aCobrarSemana, "USD")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">
                  Listado de carritos para control
                </h2>

                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${resumen.length} carritos encontrados`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando carritos...
              </div>
            ) : resumen.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay carritos para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {resumen.map((item) => {
                  const carrito = item.carrito;
                  const selected = selectedResumen?.carrito.id === carrito.id;
                  const cliente = carrito.clientes;

                  return (
                    <button
                      key={carrito.id}
                      onClick={() => selectCarrito(carrito.id)}
                      className={[
                        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[1.25fr_1.1fr_1fr_1fr_1.1fr_138px_60px]",
                        selected
                          ? "border-nostur-orange/50 bg-nostur-orange/10"
                          : "border-black/10 bg-[#f8fafc] hover:bg-white"
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {cliente?.nombre_completo || "Sin cliente"}
                        </div>

                        <div className="truncate text-[11px] font-semibold text-[#64748b]">
                          {cliente?.telefono || "—"}
                        </div>

                        <div className="truncate text-[11px] font-black text-nostur-orange">
                          {carrito.numero_carrito}
                        </div>

                        <div className="truncate text-[10px] font-black text-[#64748b]">
                          {carrito.moneda === "USD" ? "DÓLARES" : "PESOS"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {carrito.destino || "Sin destino"}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          {getTravelLabel(carrito)}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          Fecha venta: {formatDateAR(carrito.fecha_venta)}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          {carrito.servicio || "Sin servicio"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">
                          {formatMoneyAR(carrito.importe_final, carrito.moneda)}
                        </div>

                        <div className="text-[11px] text-[#64748b]">Venta</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">
                          {formatMoneyAR(item.utilidadAlmundo, carrito.moneda)}
                        </div>

                        <div className="text-[11px] text-[#64748b]">Utilidad bruta</div>

                        <div className="text-[11px] text-red-600">
                          Regalías {formatMoneyAR(item.importeRegalia, carrito.moneda)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-green-700">
                          {formatMoneyAR(item.utilidadNossix, carrito.moneda)}
                        </div>

                        <div className="text-[11px] text-[#64748b]">Utilidad neta</div>

                        <div className="text-[11px] font-bold text-nostur-orange">
                          Facturar {formatMoneyAR(item.importeAFacturar, carrito.moneda)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        {item.anulado ? (
                          <StatusBadge type="danger">ANULADO</StatusBadge>
                        ) : item.controlado ? (
                          <StatusBadge type="ok">CONTROLADO</StatusBadge>
                        ) : (
                          <StatusBadge type="pending">PENDIENTE</StatusBadge>
                        )}

                        {item.facturado ? <StatusBadge type="ok">FACTURADO</StatusBadge> : null}
                        {item.cobrado ? <StatusBadge type="ok">COBRADO</StatusBadge> : null}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon={Eye}
                          label="Ver detalle"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectCarrito(carrito.id);
                          }}
                        />

                        <IconButton
                          icon={FilePenLine}
                          label={item.controlado ? "Control cerrado" : "Editar control"}
                          className={item.controlado ? "text-green-600" : "text-nostur-orange"}
                          onClick={(event) => {
                            event.stopPropagation();
                            selectCarrito(carrito.id);
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <ControlSidePanel
            selected={selectedResumen}
            saving={saving}
            onSave={handleSave}
            onAnular={handleAnular}
          />
        </div>
      </div>

      <MotivoAnulacionControlModal
        control={controlAnular}
        saving={saving}
        onClose={() => setControlAnular(null)}
        onConfirm={confirmAnularControl}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}