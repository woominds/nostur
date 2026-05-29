import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock3,
  Eye,
  FileText,
  Filter,
  Plus,
  RefreshCcw,
  Repeat,
  Search,
  Trash2,
  Wallet,
  X
} from "lucide-react";
import {
  createInitialFacturaDraft,
  createInitialPagoDraft,
  createInitialRecurrenteDraft,
  useFacturasPagarStore,
  type CajaLite,
  type FacturaCuotaDraft,
  type FacturaPagar,
  type FacturaPagarCuota,
  type FacturaPagarDraft,
  type FacturaPagarPago,
  type FacturaPagarPagoDraft,
  type GastoRecurrente,
  type GastoRecurrenteDraft,
  type ProveedorLite
} from "../../store/facturasPagarStore";
import { formatMoneyAR } from "../../lib/formatters";

type FacturasPagarState = ReturnType<typeof useFacturasPagarStore.getState>;

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ModalMode = "factura" | "pago" | "recurrente" | "detalle" | "anular-pago" | null;

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "pendientes", label: "Pendientes" },
  { value: "vencidas", label: "Vencidas" },
  { value: "por_vencer", label: "Por vencer" },
  { value: "proyectadas", label: "Proyectadas" },
  { value: "pagadas", label: "Pagadas" },
  { value: "todas", label: "Todas" }
];

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "todas", label: "Todas" },
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
];

const MONEDA_FORM_OPTIONS: SelectOption[] = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
];

const FRECUENCIA_OPTIONS: SelectOption[] = [
  { value: "MENSUAL", label: "Mensual" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "ANUAL", label: "Anual" }
];

const IVA_OPTIONS: SelectOption[] = [
  { value: "21", label: "21%" },
  { value: "10.5", label: "10,5%" },
  { value: "27", label: "27%" },
  { value: "0", label: "0%" }
];

const MONTH_NAMES = [
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

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function getToday(): string {
  const now = new Date();
  const argentinaNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Cordoba" }));
  const year = argentinaNow.getFullYear();
  const month = String(argentinaNow.getMonth() + 1).padStart(2, "0");
  const day = String(argentinaNow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDisplayDate(value?: string | null): string {
  if (!value) return "";

  const clean = value.slice(0, 10);
  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return "";

  return `${day}/${month}/${year}`;
}

function toStorageDate(value: string): string {
  const clean = value.trim();

  if (!clean) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return "";

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}

function formatDateInputMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function createDateFromStorage(value?: string | null): Date {
  if (!value) return new Date();

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) return new Date();

  return new Date(year, month - 1, day);
}

function formatCalendarStorageDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCalendarDays(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const days: Date[] = [];

  for (let index = firstWeekDay - 1; index >= 0; index -= 1) {
    days.push(new Date(year, month, -index));
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    const next = days.length - firstWeekDay - lastDay.getDate() + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
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



function formatDate(value?: string | null): string {
  const display = toDisplayDate(value);
  return display || "—";
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getProveedorLabel(proveedor: ProveedorLite): string {
  return proveedor.nombre_comercial || proveedor.nombre || proveedor.razon_social || "Proveedor sin nombre";
}

function getCajaLabel(caja: CajaLite): string {
  return [caja.nombre, caja.moneda, caja.tipo].filter(Boolean).join(" · ");
}

function isVencida(factura: FacturaPagar): boolean {
  if (!factura.fecha_vencimiento) return false;
  if (factura.estado === "PAGADA" || factura.estado === "CANCELADA") return false;
  return factura.fecha_vencimiento < getToday();
}

function getEstadoLabel(factura: FacturaPagar): string {
  if (factura.estado === "PAGADA") return "Pagada";
  if (factura.estado === "CANCELADA") return "Cancelada";
  if (isVencida(factura)) return "Vencida";
  if (factura.estado === "PROYECTADA") return "Proyectada";
  return "Pendiente";
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
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      disabled={disabled}
      className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange disabled:cursor-not-allowed disabled:opacity-60"
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
      className="min-h-[86px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
    />
  );
}

function NosturDateInput({
  value,
  onChange,
  min
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
}) {
  const [displayValue, setDisplayValue] = useState(() => toDisplayDate(value));
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => createDateFromStorage(value || min));

  useEffect(() => {
    setDisplayValue(toDisplayDate(value));

    if (value) {
      setVisibleMonth(createDateFromStorage(value));
    }
  }, [value]);

  function commit(nextDisplayValue: string) {
    const storageValue = toStorageDate(nextDisplayValue);

    if (!storageValue) {
      onChange("");
      return;
    }

    if (min && storageValue < min) {
      onChange(min);
      setDisplayValue(toDisplayDate(min));
      setVisibleMonth(createDateFromStorage(min));
      return;
    }

    onChange(storageValue);
    setVisibleMonth(createDateFromStorage(storageValue));
  }

  function selectDate(date: Date) {
    const storageValue = formatCalendarStorageDate(date);

    if (min && storageValue < min) return;

    onChange(storageValue);
    setDisplayValue(toDisplayDate(storageValue));
    setVisibleMonth(date);
    setOpen(false);
  }

  const days = getCalendarDays(visibleMonth);
  const selectedStorageDate = value || "";
  const todayStorageDate = getToday();

  return (
    <div className={["relative", open ? "z-[130]" : "z-0"].join(" ")}>
      <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 focus-within:border-nostur-orange">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="shrink-0 text-[#64748b] hover:text-nostur-orange"
          title="Abrir calendario"
        >
          <CalendarDays size={14} strokeWidth={1.8} />
        </button>

        <input
          value={displayValue}
          onChange={(event) => {
            const masked = formatDateInputMask(event.target.value);
            setDisplayValue(masked);

            if (masked.length === 10) commit(masked);
            if (masked.length === 0) onChange("");
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => commit(displayValue)}
          placeholder="dd/mm/aaaa"
          inputMode="numeric"
          className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
        />
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[80] cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />

          <div className="absolute right-0 top-[42px] z-[120] w-[260px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="text-xs font-black text-[#111827]">
                {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </div>

              <button
                type="button"
                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#94a3b8]">
              {WEEK_DAYS.map((day, index) => (
                <div key={`${day}-${index}`}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date) => {
                const storageDate = formatCalendarStorageDate(date);
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const isSelected = storageDate === selectedStorageDate;
                const isToday = storageDate === todayStorageDate;
                const isDisabled = Boolean(min && storageDate < min);

                return (
                  <button
                    key={storageDate}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDate(date)}
                    className={[
                      "flex h-7 items-center justify-center rounded-lg text-[11px] font-black transition",
                      isSelected
                        ? "bg-nostur-orange text-white"
                        : isToday
                          ? "bg-nostur-orange/15 text-nostur-orange"
                          : isCurrentMonth
                            ? "text-[#334155] hover:bg-[#f1f5f9]"
                            : "text-[#cbd5e1] hover:bg-[#f8fafc]",
                      isDisabled ? "cursor-not-allowed opacity-30 hover:bg-transparent" : ""
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
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
                      active ? "bg-nostur-orange text-white" : "text-[#334155] hover:bg-[#f1f5f9]"
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

function BooleanChip({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black transition",
        checked
          ? "border-nostur-orange/40 bg-nostur-orange/20 text-[#111827]"
          : "border-black/10 bg-white/70 text-[#64748b]"
      ].join(" ")}
    >
      {checked ? <CheckCircle2 size={15} /> : <Plus size={15} />}
      {label}
    </button>
  );
}

function InlineError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>

      <button type="button" onClick={onClose} className="text-red-500 hover:text-red-700">
        <X size={14} />
      </button>
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
  icon: typeof Wallet;
  tone?: "orange" | "blue" | "green" | "red" | "amber";
}) {
  const toneClass = {
    orange: "bg-nostur-orange/15 text-nostur-orange",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700"
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

function EstadoBadge({ factura }: { factura: FacturaPagar }) {
  const label = getEstadoLabel(factura);

  const className =
    label === "Pagada"
      ? "border-green-200 bg-green-50 text-green-700"
      : label === "Vencida"
        ? "border-red-200 bg-red-50 text-red-700"
        : label === "Proyectada"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : label === "Cancelada"
            ? "border-slate-200 bg-slate-50 text-slate-700"
            : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={["rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", className].join(" ")}>
      {label}
    </span>
  );
}

function ProveedorInlineSelect({
  value,
  onChange,
  proveedores,
  onCreate
}: {
  value: string;
  onChange: (value: string) => void;
  proveedores: ProveedorLite[];
  onCreate: (nombre: string) => Promise<ProveedorLite | null>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = proveedores.find((proveedor) => proveedor.id === value) || null;

  useEffect(() => {
    setQuery(selected ? getProveedorLabel(selected) : "");
  }, [selected]);

  const filtered = proveedores.filter((proveedor) =>
    normalizeText(getProveedorLabel(proveedor)).includes(normalizeText(query))
  );

  async function handleCreate() {
    const cleanName = query.trim();

    if (!cleanName) return;

    setCreating(true);
    const created = await onCreate(cleanName);
    setCreating(false);

    if (created) {
      onChange(created.id);
      setQuery(getProveedorLabel(created));
      setOpen(false);
    }
  }

  const canCreate =
    query.trim().length >= 2 &&
    !proveedores.some((proveedor) => normalizeText(getProveedorLabel(proveedor)) === normalizeText(query));

  return (
    <div className={["relative", open ? "z-[130]" : "z-0"].join(" ")}>
      <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 focus-within:border-nostur-orange">
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (!event.target.value.trim()) onChange("");
          }}
          placeholder="Buscar o crear proveedor"
          className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
        />

        <button type="button" onClick={() => setOpen((current) => !current)} className="shrink-0 text-[#64748b]">
          <ChevronDown size={14} strokeWidth={1.8} className={["transition", open ? "rotate-180" : ""].join(" ")} />
        </button>
      </div>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-transparent" onClick={() => setOpen(false)} tabIndex={-1} />

          <div className="absolute left-0 right-0 top-[42px] z-[150] max-h-64 overflow-auto rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
            {filtered.map((proveedor) => (
              <button
                key={proveedor.id}
                type="button"
                onClick={() => {
                  onChange(proveedor.id);
                  setQuery(getProveedorLabel(proveedor));
                  setOpen(false);
                }}
                className={[
                  "flex h-8 w-full items-center rounded-xl px-3 text-left text-xs font-bold transition",
                  proveedor.id === value ? "bg-nostur-orange text-white" : "text-[#334155] hover:bg-[#f1f5f9]"
                ].join(" ")}
              >
                <span className="truncate">{getProveedorLabel(proveedor)}</span>
              </button>
            ))}

            {canCreate ? (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="mt-1 flex h-9 w-full items-center rounded-xl bg-nostur-orange px-3 text-left text-xs font-black text-white transition hover:bg-nostur-orangeSoft disabled:opacity-50"
              >
                {creating ? "Creando..." : `+ Crear proveedor “${query.trim()}”`}
              </button>
            ) : null}

            {filtered.length === 0 && !canCreate ? (
              <div className="px-3 py-2 text-xs font-bold text-[#94a3b8]">
                Escribí al menos 2 letras para crear un proveedor.
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function FacturaCard({
  factura,
  selected,
  onSelect,
  onDetail,
  onPay,
  onEdit
}: {
  factura: FacturaPagar;
  selected: boolean;
  onSelect: () => void;
  onDetail: () => void;
  onPay: () => void;
  onEdit: () => void;
}) {
  const saldo = parseMoney(factura.saldo_pendiente);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[1.2fr_1.4fr_130px_130px_120px_110px]",
        selected
          ? "border-nostur-orange/50 bg-nostur-orange/10"
          : isVencida(factura)
            ? "border-red-200 bg-red-50/70 hover:bg-red-50"
            : "border-black/10 bg-[#f8fafc] hover:bg-white"
      ].join(" ")}
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-black text-[#111827]">
          {factura.proveedor_nombre || "Sin proveedor"}
        </div>
        <div className="truncate text-[11px] font-semibold text-[#64748b]">
          {factura.numero_factura || "Sin número"}
        </div>
        <div className="truncate text-[11px] font-black text-nostur-orange">
          {factura.origen || "MANUAL"}
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-xs font-black text-[#111827]">
          {factura.descripcion || "Sin descripción"}
        </div>
        <div className="truncate text-[11px] text-[#64748b]">Período: {factura.periodo || "—"}</div>
        <div className="truncate text-[11px] text-[#64748b]">Emisión: {formatDate(factura.fecha_emision)}</div>
      </div>

      <div className="min-w-0">
        <div className="text-xs font-black text-[#111827]">{formatMoneyAR(factura.total, factura.moneda)}</div>
        <div className="text-[11px] text-[#64748b]">Total</div>
      </div>

      <div className="min-w-0">
        <div className={["text-xs font-black", saldo > 0 ? "text-red-700" : "text-green-700"].join(" ")}>
          {formatMoneyAR(factura.saldo_pendiente, factura.moneda)}
        </div>
        <div className="text-[11px] text-[#64748b]">Saldo</div>
      </div>

      <div className="min-w-0">
        <EstadoBadge factura={factura} />
        <div className="mt-1 text-[10px] font-bold text-[#64748b]">
          Vence: {formatDate(factura.fecha_vencimiento)}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDetail();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
          title="Ver detalle"
        >
          <Eye size={14} />
        </button>

        {saldo > 0.009 ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPay();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-green-700 hover:bg-white"
            title="Registrar pago"
          >
            <Wallet size={14} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-nostur-orange hover:bg-white"
          title="Editar"
        >
          <FileText size={14} />
        </button>
      </div>
    </button>
  );
}

function FacturaModal({
  factura,
  cuotas,
  proveedores,
  saving,
  onClose,
  onSave,
  onCreateProveedor
}: {
  factura: FacturaPagar | null;
  cuotas: FacturaPagarCuota[];
  proveedores: ProveedorLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: FacturaPagarDraft) => Promise<void>;
  onCreateProveedor: (nombre: string) => Promise<ProveedorLite | null>;
}) {
  const [draft, setDraft] = useState<FacturaPagarDraft>(() => {
    const initial = createInitialFacturaDraft(factura);

    if (factura?.plan_pago && cuotas.length > 0) {
      initial.cuotas = cuotas.map((cuota) => ({
        id: cuota.id,
        numero_cuota: cuota.numero_cuota,
        descripcion: cuota.descripcion || "",
        fecha_vencimiento: cuota.fecha_vencimiento,
        importe: String(cuota.importe || "0").replace(".", ",")
      }));
    }

    return initial;
  });

  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof FacturaPagarDraft>(key: K, value: FacturaPagarDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateCuota(index: number, patch: Partial<FacturaCuotaDraft>) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      cuotas: current.cuotas.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  }

  function addCuota() {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      plan_pago: true,
      cuotas: [
        ...current.cuotas,
        {
          id: null,
          numero_cuota: current.cuotas.length + 1,
          descripcion: "",
          fecha_vencimiento: current.fecha_vencimiento || getToday(),
          importe: "0"
        }
      ]
    }));
  }

  function removeCuota(index: number) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      cuotas: current.cuotas
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({
          ...item,
          numero_cuota: itemIndex + 1
        }))
    }));
  }

  const neto = parseMoney(draft.neto_gravado);
  const ivaImporte = parseMoney(draft.iva_importe);
  const noGravado = parseMoney(draft.no_gravado);
  const exento = parseMoney(draft.exento);
  const total = parseMoney(draft.total);

  function validate(): string | null {
    if (!draft.proveedor_id) return "Seleccioná o creá un proveedor.";
    if (!draft.descripcion.trim()) return "Ingresá una descripción.";
    if (!draft.fecha_vencimiento) return "Seleccioná fecha de vencimiento.";
    if (parseMoney(draft.total) <= 0) return "El total debe ser mayor a cero.";

    if (draft.plan_pago) {
      if (draft.cuotas.length === 0) return "Agregá al menos una cuota.";
      if (draft.cuotas.some((cuota) => !cuota.fecha_vencimiento || parseMoney(cuota.importe) <= 0)) {
        return "Completá vencimiento e importe en todas las cuotas.";
      }
    }

    return null;
  }

  function handleSave() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-56px)] w-full max-w-6xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {factura ? "Editar factura a pagar" : "Nueva factura a pagar"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Carga de deuda con proveedor. Luego se refleja en Cashflow.
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

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="rounded-[24px] border border-black/10 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Número de factura</FieldLabel>
                <TextInput
                  value={draft.numero_factura}
                  onChange={(value) => setField("numero_factura", value)}
                  placeholder="Ej: A-001-00001234"
                />
              </div>

              <div>
                <FieldLabel>Proveedor *</FieldLabel>
                <ProveedorInlineSelect
                  value={draft.proveedor_id || ""}
                  onChange={(value) => {
                    const proveedor = proveedores.find((item) => item.id === value);
                    setDraft((current) => ({
                      ...current,
                      proveedor_id: value || null,
                      proveedor_nombre: proveedor ? getProveedorLabel(proveedor) : current.proveedor_nombre
                    }));
                  }}
                  proveedores={proveedores}
                  onCreate={onCreateProveedor}
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Descripción *</FieldLabel>
                <TextInput
                  value={draft.descripcion}
                  onChange={(value) => setField("descripcion", value)}
                  placeholder="Ej: Factura de luz - Mayo 2026"
                />
              </div>

              <div>
                <FieldLabel>Fecha de emisión</FieldLabel>
                <NosturDateInput value={draft.fecha_emision} onChange={(value) => setField("fecha_emision", value)} />
              </div>

              <div>
                <FieldLabel>Fecha de vencimiento *</FieldLabel>
                <NosturDateInput value={draft.fecha_vencimiento} onChange={(value) => setField("fecha_vencimiento", value)} />
              </div>

              <div>
                <FieldLabel>Moneda</FieldLabel>
                <NosturSelect value={draft.moneda} onChange={(value) => setField("moneda", value)} options={MONEDA_FORM_OPTIONS} />
              </div>

              <div>
                <FieldLabel>Período</FieldLabel>
                <TextInput value={draft.periodo || ""} onChange={(value) => setField("periodo", value || null)} placeholder="2026-05" />
              </div>

              <div>
                <FieldLabel>Neto gravado</FieldLabel>
                <TextInput
                  value={String(draft.neto_gravado || "").replace(".", ",")}
                  onChange={(value) => setField("neto_gravado", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <FieldLabel>IVA %</FieldLabel>
                <NosturSelect
                  value={String(draft.iva_porcentaje || "21").replace(",", ".")}
                  onChange={(value) => {
                    const nextIva = String(value).replace(".", ",");
                    const nextIvaImporte = ((parseMoney(draft.neto_gravado) * parseMoney(value)) / 100).toFixed(2).replace(".", ",");
                    const nextTotal = (
                      parseMoney(draft.neto_gravado) +
                      parseMoney(nextIvaImporte) +
                      parseMoney(draft.no_gravado) +
                      parseMoney(draft.exento)
                    )
                      .toFixed(2)
                      .replace(".", ",");

                    setDraft((current) => ({
                      ...current,
                      iva_porcentaje: nextIva,
                      iva_importe: nextIvaImporte,
                      total: nextTotal
                    }));
                  }}
                  options={IVA_OPTIONS}
                />
              </div>

              <div>
                <FieldLabel>IVA $</FieldLabel>
                <TextInput
                  value={String(draft.iva_importe || "").replace(".", ",")}
                  onChange={(value) => setField("iva_importe", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <FieldLabel>No gravado</FieldLabel>
                <TextInput
                  value={String(draft.no_gravado || "").replace(".", ",")}
                  onChange={(value) => setField("no_gravado", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <FieldLabel>Exento</FieldLabel>
                <TextInput
                  value={String(draft.exento || "").replace(".", ",")}
                  onChange={(value) => setField("exento", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <FieldLabel>Total *</FieldLabel>
                <TextInput
                  value={String(draft.total || "").replace(".", ",")}
                  onChange={(value) => setField("total", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div className="md:col-span-2">
                <BooleanChip
                  checked={draft.no_impacta_caja}
                  onChange={(value) => setField("no_impacta_caja", value)}
                  label="No impacta caja / pagada por terceros"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Observaciones</FieldLabel>
                <TextArea
                  value={draft.observaciones}
                  onChange={(value) => setField("observaciones", value)}
                  placeholder="Observaciones adicionales..."
                />
              </div>

              <div className="md:col-span-2">
                <BooleanChip
                  checked={draft.plan_pago}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      plan_pago: value,
                      cuotas: value
                        ? current.cuotas.length > 0
                          ? current.cuotas
                          : [
                              {
                                id: null,
                                numero_cuota: 1,
                                descripcion: "",
                                fecha_vencimiento: current.fecha_vencimiento || getToday(),
                                importe: String(current.total || "0")
                              }
                            ]
                        : []
                    }))
                  }
                  label="Plan de pago"
                />
              </div>

              {draft.plan_pago ? (
                <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-[#111827]">Cuotas</h3>
                      <p className="text-[11px] text-[#64748b]">Dividí la factura en vencimientos parciales.</p>
                    </div>

                    <button type="button" onClick={addCuota} className="h-8 rounded-xl bg-blue-600 px-3 text-[11px] font-black text-white hover:bg-blue-700">
                      + Cuota
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {draft.cuotas.map((cuota, index) => (
                      <div
                        key={`cuota-${index}`}
                        className="grid gap-2 rounded-2xl border border-blue-200 bg-white/80 p-3 md:grid-cols-[80px_1fr_150px_150px_auto]"
                      >
                        <div>
                          <FieldLabel>Nº</FieldLabel>
                          <TextInput
                            value={String(cuota.numero_cuota || index + 1)}
                            onChange={(value) => updateCuota(index, { numero_cuota: Number(value) || index + 1 })}
                            inputMode="numeric"
                          />
                        </div>

                        <div>
                          <FieldLabel>Descripción</FieldLabel>
                          <TextInput
                            value={cuota.descripcion || ""}
                            onChange={(value) => updateCuota(index, { descripcion: value })}
                            placeholder="Cuota"
                          />
                        </div>

                        <div>
                          <FieldLabel>Vencimiento</FieldLabel>
                          <NosturDateInput
                            value={cuota.fecha_vencimiento || ""}
                            onChange={(value) => updateCuota(index, { fecha_vencimiento: value })}
                          />
                        </div>

                        <div>
                          <FieldLabel>Importe</FieldLabel>
                          <TextInput
                            value={String(cuota.importe || "").replace(".", ",")}
                            onChange={(value) => updateCuota(index, { importe: value })}
                            inputMode="decimal"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeCuota(index)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </main>

          <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Resumen</h3>

            <div className="grid gap-3 text-xs">
              <div className="rounded-2xl border border-black/10 bg-white p-3">
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748b]">Neto gravado</span>
                  <strong>{formatMoneyAR(neto, draft.moneda)}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748b]">IVA</span>
                  <strong>{formatMoneyAR(ivaImporte, draft.moneda)}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748b]">No gravado</span>
                  <strong>{formatMoneyAR(noGravado, draft.moneda)}</strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#64748b]">Exento</span>
                  <strong>{formatMoneyAR(exento, draft.moneda)}</strong>
                </div>
                <div className="mt-2 flex justify-between gap-3 border-t border-black/10 pt-2">
                  <span className="font-black text-[#111827]">Total</span>
                  <strong className="text-[#111827]">{formatMoneyAR(total, draft.moneda)}</strong>
                </div>
              </div>

              {draft.plan_pago ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-700">
                  <div className="font-black">{draft.cuotas.length} cuotas</div>
                  <div className="text-[11px] font-bold">
                    Total cuotas:{" "}
                    {formatMoneyAR(
                      draft.cuotas.reduce((sum, cuota) => sum + parseMoney(cuota.importe), 0),
                      draft.moneda
                    )}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
                Esta pantalla registra la obligación a pagar. El seguimiento financiero consolidado se verá en Cashflow.
              </div>
            </div>
          </aside>
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
            onClick={handleSave}
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {saving ? "Guardando..." : factura ? "Guardar cambios" : "Crear factura"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PagoModal({
  factura,
  cuotas,
  cajas,
  saving,
  onClose,
  onSave
}: {
  factura: FacturaPagar | null;
  cuotas: FacturaPagarCuota[];
  cajas: CajaLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: FacturaPagarPagoDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FacturaPagarPagoDraft>(() => createInitialPagoDraft(factura));
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof FacturaPagarPagoDraft>(key: K, value: FacturaPagarPagoDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  const cajaOptions: SelectOption[] = cajas
    .filter((caja) => !factura || !caja.moneda || caja.moneda === factura.moneda)
    .map((caja) => ({
      value: caja.id,
      label: getCajaLabel(caja)
    }));

  const cuotaOptions: SelectOption[] = [
    { value: "", label: "Factura completa / sin cuota específica" },
    ...cuotas.map((cuota) => ({
      value: cuota.id,
      label: `Cuota ${cuota.numero_cuota} · ${formatDate(cuota.fecha_vencimiento)} · ${formatMoneyAR(cuota.saldo_pendiente, cuota.moneda)}`
    }))
  ];

  function validate(): string | null {
    if (!factura) return "No hay factura seleccionada.";
    if (!draft.fecha_pago) return "Seleccioná fecha de pago.";
    if (!draft.no_impacta_caja && !draft.caja_id) return "Seleccioná la caja desde donde se pagó.";
    if (!draft.forma_pago.trim()) return "Indicá la forma de pago.";
    if (parseMoney(draft.importe) <= 0) return "El importe debe ser mayor a cero.";
    if (parseMoney(draft.importe) > parseMoney(factura.saldo_pendiente) + 0.009) {
      return "El pago no puede superar el saldo pendiente.";
    }

    return null;
  }

  function handleSave() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Registrar pago</h2>
            <p className="text-xs text-[#64748b]">
              {factura ? `${factura.proveedor_nombre || "Proveedor"} · ${factura.descripcion || "Factura"}` : "Seleccioná una factura"}
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

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        {!factura ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
            No hay factura seleccionada.
          </div>
        ) : (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Total</FieldLabel>
                <div className="text-sm font-black text-[#111827]">
                  {formatMoneyAR(factura.total, factura.moneda)}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Saldo</FieldLabel>
                <div className="text-sm font-black text-red-700">
                  {formatMoneyAR(factura.saldo_pendiente, factura.moneda)}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Vence</FieldLabel>
                <div className="text-sm font-black text-[#111827]">
                  {formatDate(factura.fecha_vencimiento)}
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Fecha de pago</FieldLabel>
                <NosturDateInput value={draft.fecha_pago} onChange={(value) => setField("fecha_pago", value)} />
              </div>

              <div>
                <FieldLabel>Importe</FieldLabel>
                <TextInput
                  value={String(draft.importe || "").replace(".", ",")}
                  onChange={(value) => setField("importe", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              {cuotas.length > 0 ? (
                <div className="md:col-span-2">
                  <FieldLabel>Cuota</FieldLabel>
                  <NosturSelect
                    value={draft.cuota_id || ""}
                    onChange={(value) => setField("cuota_id", value || null)}
                    options={cuotaOptions}
                  />
                </div>
              ) : null}

              <div>
                <FieldLabel>Caja</FieldLabel>
                <NosturSelect
                  value={draft.caja_id || ""}
                  onChange={(value) => {
                    const caja = cajas.find((item) => item.id === value);
                    setDraft((current) => ({
                      ...current,
                      caja_id: value || null,
                      caja_nombre: caja ? getCajaLabel(caja) : ""
                    }));
                  }}
                  options={cajaOptions}
                  placeholder="Seleccionar caja"
                />
              </div>

              <div>
                <FieldLabel>Forma de pago</FieldLabel>
                <TextInput
                  value={draft.forma_pago}
                  onChange={(value) => setField("forma_pago", value)}
                  placeholder="Transferencia, efectivo..."
                />
              </div>

              <div>
                <FieldLabel>Moneda</FieldLabel>
                <TextInput value={draft.moneda || factura.moneda} onChange={(value) => setField("moneda", value)} disabled />
              </div>

              <div>
                <FieldLabel>Impacto</FieldLabel>
                <BooleanChip
                  checked={draft.no_impacta_caja}
                  onChange={(value) => setField("no_impacta_caja", value)}
                  label="No impacta caja"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Observaciones</FieldLabel>
                <TextArea
                  value={draft.observaciones}
                  onChange={(value) => setField("observaciones", value)}
                  placeholder="Detalle del pago..."
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700">
              Este pago genera un EGRESO en Caja si no está marcado como “No impacta caja”.
            </div>
          </>
        )}

        <div className="mt-5 flex justify-between gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]">
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving || !factura}
            onClick={handleSave}
            className="h-9 rounded-xl bg-green-600 px-5 text-xs font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecurrenteModal({
  recurrente,
  proveedores,
  saving,
  onClose,
  onSave,
  onCreateProveedor
}: {
  recurrente: GastoRecurrente | null;
  proveedores: ProveedorLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: GastoRecurrenteDraft) => Promise<void>;
  onCreateProveedor: (nombre: string) => Promise<ProveedorLite | null>;
}) {
  const [draft, setDraft] = useState<GastoRecurrenteDraft>(() => createInitialRecurrenteDraft(recurrente));
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof GastoRecurrenteDraft>(key: K, value: GastoRecurrenteDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function validate(): string | null {
    if (!draft.proveedor_id) return "Seleccioná o creá un proveedor.";
    if (!draft.descripcion.trim()) return "Ingresá una descripción.";
    if (parseMoney(draft.importe_estimado) <= 0) return "El importe estimado debe ser mayor a cero.";
    if (Number(draft.dia_vencimiento) < 1 || Number(draft.dia_vencimiento) > 31) {
      return "El día de vencimiento debe estar entre 1 y 31.";
    }

    return null;
  }

  function handleSave() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {recurrente ? "Editar gasto recurrente" : "Nuevo gasto recurrente"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Para gastos previsibles como alquileres, luz, internet, agua o servicios mensuales.
            </p>
          </div>

          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]">
            <X size={17} />
          </button>
        </div>

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Proveedor *</FieldLabel>
            <ProveedorInlineSelect
              value={draft.proveedor_id || ""}
              onChange={(value) => {
                const proveedor = proveedores.find((item) => item.id === value);
                setDraft((current) => ({
                  ...current,
                  proveedor_id: value || null,
                  proveedor_nombre: proveedor ? getProveedorLabel(proveedor) : current.proveedor_nombre
                }));
              }}
              proveedores={proveedores}
              onCreate={onCreateProveedor}
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Descripción *</FieldLabel>
            <TextInput value={draft.descripcion} onChange={(value) => setField("descripcion", value)} placeholder="Ej: Alquiler Local General Paz" />
          </div>

          <div>
            <FieldLabel>Importe estimado *</FieldLabel>
            <TextInput
              value={String(draft.importe_estimado || "").replace(".", ",")}
              onChange={(value) => setField("importe_estimado", value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div>
            <FieldLabel>Moneda</FieldLabel>
            <NosturSelect value={draft.moneda} onChange={(value) => setField("moneda", value)} options={MONEDA_FORM_OPTIONS} />
          </div>

          <div>
            <FieldLabel>Frecuencia</FieldLabel>
            <NosturSelect
              value={draft.frecuencia}
              onChange={(value) => setField("frecuencia", value as GastoRecurrenteDraft["frecuencia"])}
              options={FRECUENCIA_OPTIONS}
            />
          </div>

          <div>
            <FieldLabel>Día de vencimiento</FieldLabel>
            <TextInput
              value={String(draft.dia_vencimiento || "")}
              onChange={(value) => setField("dia_vencimiento", value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="10"
            />
          </div>

          <div>
            <FieldLabel>Inicio</FieldLabel>
            <NosturDateInput value={draft.fecha_inicio} onChange={(value) => setField("fecha_inicio", value)} />
          </div>

          <div>
            <FieldLabel>Fin</FieldLabel>
            <NosturDateInput value={draft.fecha_fin || ""} onChange={(value) => setField("fecha_fin", value)} />
          </div>

          <div className="md:col-span-2">
            <BooleanChip
              checked={draft.generar_automatico}
              onChange={(value) => setField("generar_automatico", value)}
              label={draft.generar_automatico ? "Generar automáticamente" : "No generar automáticamente"}
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Observaciones</FieldLabel>
            <TextArea value={draft.observaciones} onChange={(value) => setField("observaciones", value)} placeholder="Notas internas..." />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
          Cuando llegue la factura real, desde Facturas a pagar podés ajustar importe, número de comprobante y datos fiscales.
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]">
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-9 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : recurrente ? "Guardar cambios" : "Crear recurrente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleModal({
  factura,
  pagos,
  cuotas,
  onClose,
  onPay,
  onEdit,
  onAnularPago
}: {
  factura: FacturaPagar | null;
  pagos: FacturaPagarPago[];
  cuotas: FacturaPagarCuota[];
  onClose: () => void;
  onPay: () => void;
  onEdit: () => void;
  onAnularPago: (pago: FacturaPagarPago) => void;
}) {
  if (!factura) return null;

  const saldo = parseMoney(factura.saldo_pendiente);
  const total = parseMoney(factura.total);
  const pagado = Math.max(total - saldo, 0);

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-64px)] w-full max-w-5xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">{factura.proveedor_nombre || "Factura a pagar"}</h2>
            <p className="text-xs text-[#64748b]">
              {factura.descripcion || "Sin descripción"} · {factura.numero_factura || "Sin comprobante"}
            </p>
          </div>

          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]">
            <X size={17} />
          </button>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Total</FieldLabel>
            <div className="text-sm font-black text-[#111827]">{formatMoneyAR(factura.total, factura.moneda)}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Pagado</FieldLabel>
            <div className="text-sm font-black text-green-700">{formatMoneyAR(pagado, factura.moneda)}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Saldo</FieldLabel>
            <div className={["text-sm font-black", saldo > 0 ? "text-red-700" : "text-green-700"].join(" ")}>
              {formatMoneyAR(saldo, factura.moneda)}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Estado</FieldLabel>
            <div className="mt-1">
              <EstadoBadge factura={factura} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="grid gap-4">
            <section className="rounded-[24px] border border-black/10 bg-white p-4">
              <h3 className="mb-3 text-sm font-black text-[#111827]">Datos de la factura</h3>

              <div className="grid gap-3 text-xs md:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Proveedor</FieldLabel>
                  <div className="font-black text-[#111827]">{factura.proveedor_nombre || "—"}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Comprobante</FieldLabel>
                  <div className="font-black text-[#111827]">{factura.numero_factura || "—"}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Emisión</FieldLabel>
                  <div className="font-black text-[#111827]">{formatDate(factura.fecha_emision)}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Vencimiento</FieldLabel>
                  <div className="font-black text-[#111827]">{formatDate(factura.fecha_vencimiento)}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Origen</FieldLabel>
                  <div className="font-black text-[#111827]">{factura.origen || "MANUAL"}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Período</FieldLabel>
                  <div className="font-black text-[#111827]">{factura.periodo || "—"}</div>
                </div>

                {factura.observaciones ? (
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3 md:col-span-2">
                    <FieldLabel>Observaciones</FieldLabel>
                    <div className="font-semibold text-[#334155]">{factura.observaciones}</div>
                  </div>
                ) : null}
              </div>
            </section>

            {factura.plan_pago ? (
              <section className="rounded-[24px] border border-black/10 bg-white p-4">
                <h3 className="mb-3 text-sm font-black text-[#111827]">Plan de pagos</h3>

                {cuotas.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
                    Sin cuotas registradas.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {cuotas.map((cuota) => (
                      <div key={cuota.id} className="grid gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 md:grid-cols-[80px_1fr_140px_140px_120px]">
                        <div>
                          <FieldLabel>Cuota</FieldLabel>
                          <div className="text-xs font-black text-[#111827]">{cuota.numero_cuota}</div>
                        </div>

                        <div>
                          <FieldLabel>Descripción</FieldLabel>
                          <div className="truncate text-xs font-black text-[#111827]">{cuota.descripcion || "—"}</div>
                        </div>

                        <div>
                          <FieldLabel>Vence</FieldLabel>
                          <div className="text-xs font-black text-[#111827]">{formatDate(cuota.fecha_vencimiento)}</div>
                        </div>

                        <div>
                          <FieldLabel>Importe</FieldLabel>
                          <div className="text-xs font-black text-[#111827]">{formatMoneyAR(cuota.importe, factura.moneda)}</div>
                        </div>

                        <div>
                          <FieldLabel>Estado</FieldLabel>
                          <div className="text-xs font-black text-[#334155]">{cuota.estado || "PENDIENTE"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </main>

          <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#111827]">Pagos</h3>
                <p className="text-[11px] text-[#64748b]">{pagos.length} registrados</p>
              </div>

              {saldo > 0.009 ? (
                <button type="button" onClick={onPay} className="h-8 rounded-xl bg-green-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-green-700">
                  Pagar
                </button>
              ) : null}
            </div>

            {pagos.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white p-4 text-center text-xs font-semibold text-[#64748b]">
                Sin pagos registrados.
              </div>
            ) : (
              <div className="grid max-h-[420px] gap-2 overflow-auto pr-1">
                {pagos.map((pago) => (
                  <div key={pago.id} className={["rounded-2xl border p-3", pago.anulado ? "border-red-200 bg-red-50" : "border-black/10 bg-white"].join(" ")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">{formatMoneyAR(pago.importe, pago.moneda)}</div>
                        <div className="text-[11px] font-semibold text-[#64748b]">
                          {formatDate(pago.fecha_pago)} · {pago.caja_nombre || "Sin caja"}
                        </div>
                        <div className="text-[11px] font-semibold text-[#64748b]">{pago.forma_pago || "Sin forma"}</div>
                      </div>

                      {!pago.anulado ? (
                        <button
                          type="button"
                          onClick={() => onAnularPago(pago)}
                          className="h-7 rounded-lg border border-red-200 bg-red-50 px-2 text-[10px] font-black text-red-700 hover:bg-red-100"
                        >
                          Anular
                        </button>
                      ) : (
                        <span className="rounded-lg border border-red-200 bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">
                          Anulado
                        </span>
                      )}
                    </div>

                    {pago.observaciones ? (
                      <div className="mt-1 text-[11px] font-semibold text-[#64748b]">{pago.observaciones}</div>
                    ) : null}

                    {pago.motivo_anulacion ? (
                      <div className="mt-1 text-[11px] font-bold text-red-700">{pago.motivo_anulacion}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="h-10 rounded-xl border border-nostur-orange/30 bg-nostur-orange/10 text-xs font-black text-nostur-orange hover:bg-nostur-orange/15"
              >
                Editar factura
              </button>

              <button type="button" onClick={onClose} className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]">
                Cerrar
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function AnularPagoModal({
  pago,
  saving,
  onClose,
  onSave
}: {
  pago: FacturaPagarPago | null;
  saving: boolean;
  onClose: () => void;
  onSave: (pago: FacturaPagarPago, motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSave() {
    if (!pago) {
      setLocalError("No hay pago seleccionado.");
      return;
    }

    if (!motivo.trim()) {
      setLocalError("Indicá el motivo de anulación.");
      return;
    }

    onSave(pago, motivo);
  }

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Anular pago</h2>
            <p className="text-xs text-[#64748b]">
              {pago ? `${formatMoneyAR(pago.importe, pago.moneda)} · ${formatDate(pago.fecha_pago)}` : "Sin pago seleccionado"}
            </p>
          </div>

          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]">
            <X size={17} />
          </button>
        </div>

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
          Esta acción anula el pago registrado y también el egreso asociado en Caja.
        </div>

        <FieldLabel>Motivo de anulación</FieldLabel>
        <TextArea
          value={motivo}
          onChange={(value) => {
            setLocalError(null);
            setMotivo(value);
          }}
          placeholder="Indicá el motivo..."
        />

        <div className="mt-5 flex justify-between gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]">
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving || !pago}
            onClick={handleSave}
            className="h-9 rounded-xl bg-red-600 px-5 text-xs font-black text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Anulando..." : "Anular pago"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FacturasPagarPanel() {
  const loading = useFacturasPagarStore((state: FacturasPagarState) => state.loading);
  const saving = useFacturasPagarStore((state: FacturasPagarState) => state.saving);
  const error = useFacturasPagarStore((state: FacturasPagarState) => state.error);
  const currentProfile = useFacturasPagarStore((state: FacturasPagarState) => state.currentProfile);
  const canManageFacturas = useFacturasPagarStore((state: FacturasPagarState) => state.canManageFacturas);

  const pagos = useFacturasPagarStore((state: FacturasPagarState) => state.pagos);
  const cuotas = useFacturasPagarStore((state: FacturasPagarState) => state.cuotas);
  const recurrentes = useFacturasPagarStore((state: FacturasPagarState) => state.recurrentes);
  const catalogos = useFacturasPagarStore((state: FacturasPagarState) => state.catalogos);
  const filters = useFacturasPagarStore((state: FacturasPagarState) => state.filters);
  const selectedFacturaId = useFacturasPagarStore((state: FacturasPagarState) => state.selectedFacturaId);

  const loadFacturas = useFacturasPagarStore((state: FacturasPagarState) => state.loadFacturas);
  const saveFactura = useFacturasPagarStore((state: FacturasPagarState) => state.saveFactura);
  const registrarPago = useFacturasPagarStore((state: FacturasPagarState) => state.registrarPago);
  const anularPago = useFacturasPagarStore((state: FacturasPagarState) => state.anularPago);
  const saveRecurrente = useFacturasPagarStore((state: FacturasPagarState) => state.saveRecurrente);
  const createProveedorInline = useFacturasPagarStore((state: FacturasPagarState) => state.createProveedorInline);
  const generarRecurrentesMes = useFacturasPagarStore((state: FacturasPagarState) => state.generarRecurrentesMes);

  const setFilter = useFacturasPagarStore((state: FacturasPagarState) => state.setFilter);
  const resetFilters = useFacturasPagarStore((state: FacturasPagarState) => state.resetFilters);
  const selectFactura = useFacturasPagarStore((state: FacturasPagarState) => state.selectFactura);
  const clearError = useFacturasPagarStore((state: FacturasPagarState) => state.clearError);

  const getFilteredFacturas = useFacturasPagarStore((state: FacturasPagarState) => state.getFilteredFacturas);
  const getMetrics = useFacturasPagarStore((state: FacturasPagarState) => state.getMetrics);

  const proveedores = catalogos.proveedores;
  const cajas = catalogos.cajas;
  const filteredFacturas = getFilteredFacturas();
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingFactura, setEditingFactura] = useState<FacturaPagar | null>(null);
  const [editingRecurrente, setEditingRecurrente] = useState<GastoRecurrente | null>(null);
  const [pagoToAnular, setPagoToAnular] = useState<FacturaPagarPago | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const selectedFactura = useMemo<FacturaPagar | null>(() => {
    return filteredFacturas.find((factura) => factura.id === selectedFacturaId) || filteredFacturas[0] || null;
  }, [filteredFacturas, selectedFacturaId]);

  const selectedPagos = useMemo<FacturaPagarPago[]>(() => {
    if (!selectedFactura) return [];
    return pagos.filter((pago) => pago.factura_id === selectedFactura.id);
  }, [pagos, selectedFactura]);

  const selectedCuotas = useMemo<FacturaPagarCuota[]>(() => {
    if (!selectedFactura) return [];
    return cuotas.filter((cuota) => cuota.factura_id === selectedFactura.id);
  }, [cuotas, selectedFactura]);

  useEffect(() => {
    loadFacturas();
  }, [loadFacturas]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function openNewFactura() {
    setEditingFactura(null);
    setModalMode("factura");
  }

  function openEditFactura(factura: FacturaPagar) {
    setEditingFactura(factura);
    selectFactura(factura.id);
    setModalMode("factura");
  }

  function openPago(factura: FacturaPagar | null) {
    if (!factura) {
      showToast("Seleccioná una factura para registrar el pago.", "error");
      return;
    }

    selectFactura(factura.id);
    setModalMode("pago");
  }

  function openDetalle(factura: FacturaPagar) {
    selectFactura(factura.id);
    setModalMode("detalle");
  }

  function openNewRecurrente() {
    setEditingRecurrente(null);
    setModalMode("recurrente");
  }

  function openEditRecurrente(recurrente: GastoRecurrente) {
    setEditingRecurrente(recurrente);
    setModalMode("recurrente");
  }

  async function handleSaveFactura(draft: FacturaPagarDraft) {
    const ok = await saveFactura(draft);

    if (ok) {
      setModalMode(null);
      setEditingFactura(null);
      showToast(editingFactura ? "Factura actualizada correctamente." : "Factura creada correctamente.");
    }
  }

  async function handleRegistrarPago(draft: FacturaPagarPagoDraft) {
    const ok = await registrarPago(draft);

    if (ok) {
      setModalMode(null);
      showToast("Pago registrado correctamente.");
    }
  }

  async function handleSaveRecurrente(draft: GastoRecurrenteDraft) {
    const ok = await saveRecurrente(draft);

    if (ok) {
      setModalMode(null);
      setEditingRecurrente(null);
      showToast(editingRecurrente ? "Gasto recurrente actualizado." : "Gasto recurrente creado.");
    }
  }

  async function handleAnularPago(pago: FacturaPagarPago, motivo: string) {
    const ok = await anularPago(pago, motivo);

    if (ok) {
      setPagoToAnular(null);
      setModalMode(null);
      showToast("Pago anulado correctamente.");
    }
  }

  async function handleGenerarRecurrentes() {
    const generated = await generarRecurrentesMes();

    if (generated >= 0) {
      showToast(`Recurrentes generados: ${generated}.`);
    }
  }

  const proveedorOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    ...proveedores.map((proveedor) => ({
      value: proveedor.id,
      label: getProveedorLabel(proveedor)
    }))
  ];

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Facturas a pagar</h1>
          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            PROVEEDORES
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            {canManageFacturas
              ? "Pendientes, vencidas, pagadas, recurrentes y planes de pago"
              : `Facturas de ${currentProfile?.nombre || "tu usuario"}`}
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
            <button type="button" onClick={() => setFiltersOpen((current) => !current)} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={15} className="text-nostur-orange" />
                <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#475569]">Filtros</h2>
                <span className="text-[11px] font-semibold text-nostur-orange">
                  {filters.desde} → {filters.hasta}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Estado: {filters.estado} · Moneda: {filters.moneda} · Proveedor: {filters.proveedorId}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadFacturas}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={openNewFactura}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={13} strokeWidth={1.8} />
                Factura
              </button>

              <button
                type="button"
                onClick={openNewRecurrente}
                className="flex h-8 items-center gap-2 rounded-xl bg-blue-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-blue-700"
              >
                <Repeat size={13} strokeWidth={1.8} />
                Recurrente
              </button>

              <button
                type="button"
                onClick={handleGenerarRecurrentes}
                disabled={saving}
                className="flex h-8 items-center gap-2 rounded-xl bg-green-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
              >
                <CalendarDays size={13} strokeWidth={1.8} />
                Generar mes
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_160px_160px_1fr]">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-nostur-orange/20 bg-white/70 p-2">
                  <div>
                    <FieldLabel>Desde</FieldLabel>
                    <NosturDateInput value={filters.desde} onChange={(value) => setFilter("desde", value)} />
                  </div>

                  <div>
                    <FieldLabel>Hasta</FieldLabel>
                    <NosturDateInput value={filters.hasta} onChange={(value) => setFilter("hasta", value)} />
                  </div>
                </div>

                <div>
                  <FieldLabel>Estado</FieldLabel>
                  <NosturSelect
                    value={filters.estado}
                    onChange={(value) => setFilter("estado", value as FacturasPagarState["filters"]["estado"])}
                    options={ESTADO_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Moneda</FieldLabel>
                  <NosturSelect
                    value={filters.moneda}
                    onChange={(value) => setFilter("moneda", value as FacturasPagarState["filters"]["moneda"])}
                    options={MONEDA_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Proveedor</FieldLabel>
                  <NosturSelect value={filters.proveedorId} onChange={(value) => setFilter("proveedorId", value)} options={proveedorOptions} />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por proveedor, comprobante, descripción, período..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button type="button" onClick={loadFacturas} className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white">
                  Aplicar filtros
                </button>

                <button type="button" onClick={resetFilters} className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white">
                  Limpiar
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Pendiente ARS" value={formatMoneyAR(metrics.pendienteArs, "ARS")} icon={FileText} tone="orange" />
          <MetricCard label="Pendiente USD" value={formatMoneyAR(metrics.pendienteUsd, "USD")} icon={Wallet} tone="green" />
          <MetricCard label="Vencidas" value={metrics.vencidas} icon={AlertTriangle} tone="red" />
          <MetricCard label="Por vencer" value={metrics.porVencer} icon={Clock3} tone="amber" />
          <MetricCard label="Pagadas mes" value={metrics.pagadasMes} icon={CheckCircle2} tone="green" />
          <MetricCard label="Recurrentes" value={metrics.recurrentes} icon={Repeat} tone="blue" />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Listado de facturas</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${filteredFacturas.length} facturas encontradas`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando facturas...
              </div>
            ) : filteredFacturas.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay facturas para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredFacturas.map((factura) => (
                  <FacturaCard
                    key={factura.id}
                    factura={factura}
                    selected={selectedFactura?.id === factura.id}
                    onSelect={() => selectFactura(factura.id)}
                    onDetail={() => openDetalle(factura)}
                    onPay={() => openPago(factura)}
                    onEdit={() => openEditFactura(factura)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
            {!selectedFactura ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná una factura.
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-black text-[#111827]">
                      {selectedFactura.proveedor_nombre || "Sin proveedor"}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-[#64748b]">
                      {selectedFactura.descripcion || "Sin descripción"}
                    </p>
                  </div>

                  <EstadoBadge factura={selectedFactura} />
                </div>

                <div className="grid gap-3 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>Saldo pendiente</FieldLabel>
                    <div className={["text-2xl font-black", parseMoney(selectedFactura.saldo_pendiente) > 0 ? "text-red-700" : "text-green-700"].join(" ")}>
                      {formatMoneyAR(selectedFactura.saldo_pendiente, selectedFactura.moneda)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Datos</FieldLabel>
                    <div className="flex justify-between gap-3">
                      <span>Total</span>
                      <strong>{formatMoneyAR(selectedFactura.total, selectedFactura.moneda)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Vencimiento</span>
                      <strong>{formatDate(selectedFactura.fecha_vencimiento)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Origen</span>
                      <strong>{selectedFactura.origen || "MANUAL"}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Pagos</span>
                      <strong>{selectedFactura.cantidad_pagos || 0}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {parseMoney(selectedFactura.saldo_pendiente) > 0.009 ? (
                      <button
                        type="button"
                        onClick={() => openPago(selectedFactura)}
                        className="h-10 rounded-xl bg-green-600 px-4 text-xs font-black text-white shadow-sm hover:bg-green-700"
                      >
                        Registrar pago
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => openDetalle(selectedFactura)}
                      className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Ver detalle
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditFactura(selectedFactura)}
                      className="h-10 rounded-xl border border-nostur-orange/30 bg-nostur-orange/10 px-4 text-xs font-black text-nostur-orange hover:bg-nostur-orange/15"
                    >
                      Editar factura
                    </button>
                  </div>

                  {recurrentes.length > 0 ? (
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
                      <FieldLabel>Recurrentes activos</FieldLabel>
                      <div className="grid max-h-[180px] gap-2 overflow-auto pr-1">
                        {recurrentes.slice(0, 6).map((recurrente) => (
                          <button
                            key={recurrente.id}
                            type="button"
                            onClick={() => openEditRecurrente(recurrente)}
                            className="rounded-xl border border-blue-200 bg-white/70 p-2 text-left hover:bg-white"
                          >
                            <div className="truncate text-[11px] font-black text-[#111827]">{recurrente.descripcion}</div>
                            <div className="text-[10px] font-bold text-blue-700">
                              {formatMoneyAR(recurrente.importe_estimado, recurrente.moneda)} · día {recurrente.dia_vencimiento}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
                    Facturas a pagar funciona como pantalla intermedia. El seguimiento financiero se consolida luego en Cashflow.
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {modalMode === "factura" ? (
        <FacturaModal
          factura={editingFactura}
          cuotas={editingFactura ? cuotas.filter((cuota) => cuota.factura_id === editingFactura.id) : []}
          proveedores={proveedores}
          saving={saving}
          onClose={() => {
            setModalMode(null);
            setEditingFactura(null);
          }}
          onSave={handleSaveFactura}
          onCreateProveedor={createProveedorInline}
        />
      ) : null}

      {modalMode === "pago" ? (
        <PagoModal
          factura={selectedFactura}
          cuotas={selectedCuotas}
          cajas={cajas}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSave={handleRegistrarPago}
        />
      ) : null}

      {modalMode === "recurrente" ? (
        <RecurrenteModal
          recurrente={editingRecurrente}
          proveedores={proveedores}
          saving={saving}
          onClose={() => {
            setModalMode(null);
            setEditingRecurrente(null);
          }}
          onSave={handleSaveRecurrente}
          onCreateProveedor={createProveedorInline}
        />
      ) : null}

      {modalMode === "detalle" ? (
        <DetalleModal
          factura={selectedFactura}
          pagos={selectedPagos}
          cuotas={selectedCuotas}
          onClose={() => setModalMode(null)}
          onPay={() => setModalMode("pago")}
          onEdit={() => {
            if (selectedFactura) {
              setEditingFactura(selectedFactura);
              setModalMode("factura");
            }
          }}
          onAnularPago={(pago) => {
            setPagoToAnular(pago);
            setModalMode("anular-pago");
          }}
        />
      ) : null}

      {modalMode === "anular-pago" ? (
        <AnularPagoModal
          pago={pagoToAnular}
          saving={saving}
          onClose={() => {
            setPagoToAnular(null);
            setModalMode("detalle");
          }}
          onSave={handleAnularPago}
        />
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}