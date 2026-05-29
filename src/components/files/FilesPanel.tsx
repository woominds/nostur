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
  Eye,
  FileText,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  ToggleLeft,
  ToggleRight,
  UserRound,
  X
} from "lucide-react";
import {
  useFilesStore,
  type FileItem,
  type FileWizardInput,
  type Cliente,
  type MovimientoTesoreria,
  type PagoComercial
} from "../../store/filesStore";
import { IconButton } from "../ui/IconButton";
import { formatMoneyAR } from "../../lib/formatters";

type SelectOption = {
  value: string;
  label: string;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type WizardDraft = {
  phonePrefix: string;
  phoneLocal: string;
  cliente: {
    id?: string;
    nombre_completo: string;
    telefono: string;
    email: string;
    origen: string;
    vendedor_id: string;
    sucursal_id: string;
  };
  venta: {
    numero_file: string;
    operador_id: string;
    operador: string;
    fecha_venta: string;
    fecha_in: string;
    fecha_out: string;
    solo_ida: boolean;
    servicio_id: string;
    servicio: string;
    destinos: string[];
    importe_bruto: string;
    moneda: string;
    neto_operador: string;
    observaciones: string;
  };
  pagosComerciales: PagoComercial[];
  pagoParcial: boolean;
  movimientosTesoreria: MovimientoTesoreria[];
  riesgo: boolean;
  importe_riesgo: string;
  riesgo_motivo: string;
  confirmado: boolean;
};

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "CARGADO", label: "Cargado" },
  { value: "PENDIENTE_OPERADOR", label: "Pendiente operador" },
  { value: "CONTROLADO", label: "Controlado" },
  { value: "FACTURADO", label: "Facturado" },
  { value: "COBRADO", label: "Cobrado" },
  { value: "CANCELADO", label: "Cancelado" }
];

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
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
  const argentinaNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Argentina/Cordoba" })
  );
  const year = argentinaNow.getFullYear();
  const month = String(argentinaNow.getMonth() + 1).padStart(2, "0");
  const day = String(argentinaNow.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthValue(): string {
  const today = getToday();
  return today.slice(0, 7);
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

function getMonthLabel(monthValue: string): string {
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!year || !month) return monthValue;

  const monthName = MONTH_NAMES[month - 1] || monthRaw;

  return `${monthName} ${year}`;
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

function formatDateAR(value?: string | null): string {
  if (!value) return "—";
  return toDisplayDate(value) || "—";
}

function isDateBefore(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a < b;
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

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function maskFile(value: string): string {
  return value.replace(/\D/g, "").slice(0, 12);
}

function isValidFile(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function joinDestinos(destinos: string[]): string {
  return destinos
    .map((destino) => destino.trim())
    .filter(Boolean)
    .filter(
      (destino, index, array) =>
        array.findIndex((item) => normalizeText(item) === normalizeText(destino)) === index
    )
    .join(", ");
}

function createInitialDraft(): WizardDraft {
  return {
    phonePrefix: "+549",
    phoneLocal: "",
    cliente: {
      nombre_completo: "",
      telefono: "+549",
      email: "",
      origen: "",
      vendedor_id: "",
      sucursal_id: ""
    },
    venta: {
      numero_file: "",
      operador_id: "",
      operador: "",
      fecha_venta: getToday(),
      fecha_in: getToday(),
      fecha_out: getToday(),
      solo_ida: false,
      servicio_id: "",
      servicio: "",
      destinos: [],
      importe_bruto: "",
      moneda: "ARS",
      neto_operador: "",
      observaciones: ""
    },
    pagosComerciales: [
      {
        importe: 0,
        moneda: "ARS",
        forma_pago: ""
      }
    ],
    pagoParcial: false,
    movimientosTesoreria: [
      {
        importe: 0,
        moneda: "ARS",
        forma_pago: "",
        caja: ""
      }
    ],
    riesgo: false,
    importe_riesgo: "",
    riesgo_motivo: "",
    confirmado: false
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
      className="min-h-[86px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
    />
  );
}

function NosturDateInput({
  value,
  onChange,
  min,
  align = "right"
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  align?: "left" | "right";
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

          <div
            className={[
              "absolute top-[42px] z-[120] w-[260px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl",
              align === "left" ? "left-0" : "right-0"
            ].join(" ")}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="text-xs font-black text-[#111827]">
                {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </div>

              <button
                type="button"
                onClick={() =>
                  setVisibleMonth(
                    new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#111827]"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-[#94a3b8]">
              {WEEK_DAYS.map((day) => (
                <div key={day}>{day}</div>
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

function DestinosInlineMultiSelect({
  values,
  onChange,
  options,
  onCreate
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: SelectOption[];
  onCreate: (name: string, pais?: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pais, setPais] = useState("Sin especificar");
  const [creating, setCreating] = useState(false);

  const cleanQuery = query.trim();

  const selectedValues = values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter(
      (value, index, array) =>
        array.findIndex((item) => normalizeText(item) === normalizeText(value)) === index
    );

  const filteredOptions = options.filter((option) => {
    const matchesQuery =
      !cleanQuery || normalizeText(option.label).includes(normalizeText(cleanQuery));

    const alreadySelected = selectedValues.some(
      (value) => normalizeText(value) === normalizeText(option.value)
    );

    return matchesQuery && !alreadySelected;
  });

  const exactExists = options.some(
    (option) => normalizeText(option.value) === normalizeText(cleanQuery)
  );

  const alreadySelected = selectedValues.some(
    (value) => normalizeText(value) === normalizeText(cleanQuery)
  );

  const canCreate = cleanQuery.length >= 2 && !exactExists && !alreadySelected;

  function addDestino(destino: string) {
    const cleanDestino = destino.trim();

    if (!cleanDestino) return;

    const nextValues = [...selectedValues, cleanDestino].filter(
      (value, index, array) =>
        array.findIndex((item) => normalizeText(item) === normalizeText(value)) === index
    );

    onChange(nextValues);
    setQuery("");
    setOpen(false);
  }

  function removeDestino(destino: string) {
    onChange(selectedValues.filter((value) => normalizeText(value) !== normalizeText(destino)));
  }

  async function handleCreate() {
    if (!canCreate || creating) return;

    setCreating(true);
    const createdName = await onCreate(cleanQuery, pais.trim() || "Sin especificar");
    setCreating(false);

    if (createdName) {
      addDestino(createdName);
      setPais("Sin especificar");
    }
  }

  return (
    <div className={["relative", open ? "z-[130]" : "z-0"].join(" ")}>
      <div className="min-h-9 rounded-xl border border-black/10 bg-[#f8fafc] px-2 py-1.5 focus-within:border-nostur-orange">
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedValues.map((destino) => (
            <span
              key={destino}
              className="flex h-7 max-w-full items-center gap-1 rounded-xl bg-nostur-orange/15 px-2 text-[11px] font-black text-[#111827]"
            >
              <span className="truncate">{destino}</span>

              <button
                type="button"
                onClick={() => removeDestino(destino)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[#64748b] hover:bg-white hover:text-red-600"
              >
                <X size={11} />
              </button>
            </span>
          ))}

          <input
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            placeholder={selectedValues.length === 0 ? "Buscar o crear destino" : "Agregar otro destino"}
            className="h-7 min-w-[160px] flex-1 bg-transparent px-1 text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
          />

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#64748b] hover:bg-white"
          >
            <ChevronDown
              size={14}
              strokeWidth={1.8}
              className={["transition", open ? "rotate-180" : ""].join(" ")}
            />
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />

          <div className="absolute left-0 right-0 top-[46px] z-[150] max-h-[380px] overflow-auto rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
            {filteredOptions.length > 0 ? (
              <div className="grid gap-1">
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => addDestino(option.value)}
                    className="flex h-9 w-full items-center rounded-xl px-3 text-left text-xs font-bold text-[#334155] transition hover:bg-[#f1f5f9]"
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-3 px-1 text-xs font-bold text-[#94a3b8]">
                {cleanQuery ? "No encontramos ese destino." : "Escribí para buscar destinos."}
              </div>
            )}

            {canCreate ? (
              <div className="mt-3 rounded-2xl border border-nostur-orange/20 bg-orange-50/30 p-3">
                <div className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#64748b]">
                  Crear destino nuevo
                </div>

                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Destino"
                    className="h-10 rounded-xl border border-black/5 bg-white px-3 text-xs font-black text-[#111827] outline-none transition focus:border-nostur-orange"
                  />

                  <input
                    value={pais}
                    onChange={(event) => setPais(event.target.value)}
                    placeholder="País"
                    className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-[#111827] outline-none transition focus:border-nostur-orange"
                  />

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="h-10 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm transition hover:bg-nostur-orangeSoft disabled:opacity-50"
                  >
                    {creating ? "Creando..." : "Crear"}
                  </button>
                </div>
              </div>
            ) : null}

            {cleanQuery.length > 0 && cleanQuery.length < 2 ? (
              <div className="px-1 py-2 text-xs font-bold text-[#94a3b8]">
                Escribí al menos 2 letras para crear un destino.
              </div>
            ) : null}
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
      {checked ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
      {label}
    </button>
  );
}

function CardMetric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string | number;
  icon: typeof ShoppingCart;
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

function WizardError({ message, onClose }: { message: string | null; onClose: () => void }) {
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

function LineButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 rounded-xl border border-black/10 bg-white px-3 text-[11px] font-black text-[#334155] hover:bg-[#f8fafc]"
    >
      {children}
    </button>
  );
}

function WizardStepper({ step }: { step: WizardStep }) {
  const steps = ["Cliente", "File / Operador", "Pagos comerciales", "Tesorería", "Confirmar"];

  return (
    <div className="mb-4 grid grid-cols-5 gap-2">
      {steps.map((label, index) => {
        const number = index + 1;
        const active = step === number;
        const done = step > number;

        return (
          <div
            key={label}
            className={[
              "rounded-2xl border px-3 py-2 text-center text-[11px] font-black",
              active
                ? "border-nostur-orange bg-nostur-orange text-white"
                : done
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-black/10 bg-[#f8fafc] text-[#64748b]"
            ].join(" ")}
          >
            {number}. {label}
          </div>
        );
      })}
    </div>
  );
}

function WizardSummary({
  draft,
  totalFinal,
  totalComercial,
  totalTesoreria,
  saldo
}: {
  draft: WizardDraft;
  totalFinal: number;
  totalComercial: number;
  totalTesoreria: number;
  saldo: number;
}) {
  const destinosLabel = joinDestinos(draft.venta.destinos);

  return (
    <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
      <h3 className="mb-3 text-sm font-black text-[#111827]">Resumen rápido</h3>

      <div className="grid gap-3 text-xs">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
            Cliente
          </div>
          <div className="truncate font-black text-[#111827]">
            {draft.cliente.nombre_completo || "Sin cliente"}
          </div>
          <div className="truncate text-[#64748b]">{draft.cliente.telefono || "—"}</div>
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
            File
          </div>
          <div className="font-black text-[#111827]">{draft.venta.numero_file || "—"}</div>
          <div className="text-[#64748b]">{destinosLabel || "Sin destino"}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-3">
          <div className="flex justify-between gap-3">
            <span className="text-[#64748b]">Final</span>
            <strong>{formatMoneyAR(totalFinal, draft.venta.moneda)}</strong>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-[#64748b]">Comercial</span>
            <strong>{formatMoneyAR(totalComercial, draft.venta.moneda)}</strong>
          </div>

          <div className="flex justify-between gap-3">
            <span className="text-[#64748b]">Tesorería</span>
            <strong>{formatMoneyAR(totalTesoreria, draft.venta.moneda)}</strong>
          </div>

          <div className="mt-1 flex justify-between gap-3 border-t border-black/10 pt-1">
            <span className="text-[#64748b]">Saldo pasajero</span>
            <strong className={saldo > 0 ? "text-red-600" : "text-green-700"}>
              {formatMoneyAR(saldo, draft.venta.moneda)}
            </strong>
          </div>
        </div>

        <div
          className={[
            "rounded-2xl border p-3 text-center text-[11px] font-black",
            saldo > 0
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-green-200 bg-green-50 text-green-700"
          ].join(" ")}
        >
          {saldo > 0 ? "Va a Cta Cte" : "Queda en Files"}
        </div>

        {draft.riesgo ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-[11px] font-black text-red-700">
            Riesgo operador marcado
          </div>
        ) : null}
      </div>
    </aside>
  );
}
function FileWizard({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const saving = useFilesStore((state) => state.saving);
  const clientesSearch = useFilesStore((state) => state.clientesSearch);
  const catalogos = useFilesStore((state) => state.catalogos);
  const currentProfile = useFilesStore((state) => state.currentProfile);
  const canManageFiles = useFilesStore((state) => state.canManageFiles);
  const searchClientesByPhone = useFilesStore((state) => state.searchClientesByPhone);
  const createDestinoInline = useFilesStore((state) => state.createDestinoInline);
  const saveFileWizard = useFilesStore((state) => state.saveFileWizard);

  const [step, setStep] = useState<WizardStep>(1);
  const [wizardError, setWizardError] = useState<string | null>(null);

  const [draft, setDraft] = useState<WizardDraft>(() => {
    const initial = createInitialDraft();

    initial.cliente.vendedor_id = currentProfile?.id || "";
    initial.cliente.sucursal_id = currentProfile?.sucursal_id || "";
    initial.venta.moneda = "ARS";
    initial.pagosComerciales[0].moneda = "ARS";
    initial.movimientosTesoreria[0].moneda = "ARS";

    return initial;
  });

  const bruto = parseMoney(draft.venta.importe_bruto);
  const netoOperador = parseMoney(draft.venta.neto_operador);
  const totalFinal = bruto;
  const margenEstimado = totalFinal - netoOperador;

  const totalPagosComerciales = draft.pagosComerciales.reduce(
    (total, pago) => total + parseMoney(pago.importe),
    0
  );

  const importeRiesgo = draft.riesgo ? parseMoney(draft.importe_riesgo) : 0;
  const totalComercial = totalPagosComerciales + importeRiesgo;

  const totalTesoreria = draft.movimientosTesoreria.reduce(
    (total, movimiento) => total + parseMoney(movimiento.importe),
    0
  );

  const saldo = Math.max(0, totalFinal - totalTesoreria);
  const saldoComercial = Math.max(0, totalFinal - totalComercial);
  const visibleEnFiles = saldo <= 0.009;

  function setCliente<K extends keyof WizardDraft["cliente"]>(
    key: K,
    value: WizardDraft["cliente"][K]
  ) {
    setWizardError(null);
    setDraft((current) => ({
      ...current,
      cliente: {
        ...current.cliente,
        [key]: value
      }
    }));
  }

  function setVenta<K extends keyof WizardDraft["venta"]>(
    key: K,
    value: WizardDraft["venta"][K]
  ) {
    setWizardError(null);
    setDraft((current) => ({
      ...current,
      venta: {
        ...current.venta,
        [key]: value
      }
    }));
  }

  function setPhone(prefix: string, local: string) {
    setWizardError(null);

    const cleanPrefix = prefix.startsWith("+") ? prefix : `+${prefix}`;
    const cleanLocal = local.replace(/\D/g, "");

    setDraft((current) => ({
      ...current,
      phonePrefix: cleanPrefix,
      phoneLocal: cleanLocal,
      cliente: {
        ...current.cliente,
        telefono: `${cleanPrefix}${cleanLocal}`
      }
    }));

    if (cleanLocal.length >= 3) {
      searchClientesByPhone(`${cleanPrefix}${cleanLocal}`);
    }
  }

  function selectCliente(cliente: Cliente) {
    setWizardError(null);

    setDraft((current) => ({
      ...current,
      phonePrefix: cliente.telefono.startsWith("+549") ? "+549" : current.phonePrefix,
      phoneLocal: cliente.telefono.replace(current.phonePrefix, "").replace("+549", ""),
      cliente: {
        id: cliente.id,
        nombre_completo: cliente.nombre_completo,
        telefono: cliente.telefono,
        email: cliente.email || "",
        origen: cliente.origen || "",
        vendedor_id: cliente.vendedor_id || currentProfile?.id || "",
        sucursal_id: cliente.sucursal_id || currentProfile?.sucursal_id || ""
      }
    }));
  }

  function updatePago(index: number, patch: Partial<PagoComercial>) {
    setWizardError(null);

    setDraft((current) => ({
      ...current,
      pagosComerciales: current.pagosComerciales.map((pago, itemIndex) =>
        itemIndex === index ? { ...pago, ...patch } : pago
      )
    }));
  }

  function updateMovimiento(index: number, patch: Partial<MovimientoTesoreria>) {
    setWizardError(null);

    setDraft((current) => ({
      ...current,
      movimientosTesoreria: current.movimientosTesoreria.map((movimiento, itemIndex) =>
        itemIndex === index ? { ...movimiento, ...patch } : movimiento
      )
    }));
  }

  function validateStep(currentStep: WizardStep): string | null {
    if (currentStep === 1) {
      if (!draft.cliente.telefono.trim() || draft.phoneLocal.length < 3) {
        return "Ingresá un teléfono válido.";
      }

      if (!draft.cliente.id && !draft.cliente.nombre_completo.trim()) {
        return "Ingresá el nombre completo del cliente.";
      }
    }

    if (currentStep === 2) {
      if (!isValidFile(draft.venta.numero_file)) return "El número de file debe ser numérico.";
      if (!draft.venta.fecha_in) return "Seleccioná fecha IN.";
      if (!draft.venta.solo_ida && !draft.venta.fecha_out) return "Seleccioná fecha OUT.";

      if (!draft.venta.solo_ida && isDateBefore(draft.venta.fecha_out, draft.venta.fecha_in)) {
        return "La fecha OUT no puede ser anterior a la fecha IN.";
      }

      if (!draft.venta.operador.trim()) return "Seleccioná el operador.";
      if (!draft.venta.servicio.trim()) return "Seleccioná o cargá el servicio.";
      if (draft.venta.destinos.length === 0) return "Seleccioná o cargá al menos un destino.";
      if (totalFinal <= 0) return "El importe final debe ser mayor a cero.";
    }

    if (currentStep === 3) {
      const pagosConImporte = draft.pagosComerciales.filter(
        (pago) => parseMoney(pago.importe) > 0
      );

      if (pagosConImporte.some((pago) => !pago.forma_pago)) {
        return "Completá la forma de pago comercial en todas las líneas con importe.";
      }

      if (draft.riesgo) {
        if (importeRiesgo <= 0) return "Indicá el importe imputado a riesgo operador.";

        if (!draft.riesgo_motivo.trim()) {
          return "Indicá el motivo u observación del riesgo operador.";
        }
      }

      if (totalComercial <= 0) {
        return "Completá al menos un pago comercial o un importe imputado a riesgo operador.";
      }

      if (totalComercial > totalFinal + 0.009) {
        return "La imputación comercial no puede superar el total del cliente.";
      }

      if (!draft.pagoParcial && Math.abs(totalComercial - totalFinal) > 0.009) {
        return "La imputación comercial debe igualar el total del cliente. Si queda saldo del pasajero, marcá pago parcial.";
      }

      if (draft.pagoParcial && totalComercial >= totalFinal) {
        return "Si marcás pago parcial, la imputación comercial debe ser menor al total cliente.";
      }
    }

    if (currentStep === 4) {
      if (
        draft.movimientosTesoreria.some(
          (movimiento) =>
            parseMoney(movimiento.importe) <= 0 || !movimiento.caja || !movimiento.forma_pago
        )
      ) {
        return "Completá caja, forma real de pago e importe en todas las líneas de tesorería.";
      }

      if (totalTesoreria <= 0) return "Cargá el ingreso real del cliente en Tesorería.";

      if (totalTesoreria > totalFinal + 0.009) {
        return "Tesorería no puede superar el total cliente.";
      }

      if (!draft.pagoParcial && Math.abs(totalTesoreria - totalFinal) > 0.009) {
        return "Si no es pago parcial, Tesorería debe igualar el total cliente.";
      }

      if (draft.pagoParcial && totalTesoreria >= totalFinal) {
        return "Si marcás pago parcial, Tesorería debe ser menor al total cliente.";
      }
    }

    if (currentStep === 5) {
      if (!draft.confirmado) return "Confirmá que los datos son correctos.";
    }

    return null;
  }

  async function nextStep() {
    const error = validateStep(step);

    if (error) {
      setWizardError(error);
      return;
    }

    setWizardError(null);
    setStep((current) => Math.min(5, current + 1) as WizardStep);
  }

  async function submit() {
    const error = validateStep(5);

    if (error) {
      setWizardError(error);
      return;
    }

    setWizardError(null);

    const payload: FileWizardInput = {
      cliente: {
        id: draft.cliente.id,
        nombre_completo: draft.cliente.nombre_completo,
        telefono: draft.cliente.telefono,
        email: draft.cliente.email,
        origen: draft.cliente.origen,
        vendedor_id: draft.cliente.vendedor_id || currentProfile?.id || null,
        sucursal_id: draft.cliente.sucursal_id || currentProfile?.sucursal_id || null
      },
      file: {
        numero_file: draft.venta.numero_file,
        fecha_venta: draft.venta.fecha_venta,
        operador_id: draft.venta.operador_id || null,
        operador: draft.venta.operador || null,
        servicio_id: draft.venta.servicio_id || null,
        servicio: draft.venta.servicio,
        destino: joinDestinos(draft.venta.destinos),
        fecha_in: draft.venta.fecha_in,
        fecha_out: draft.venta.fecha_out,
        solo_ida: draft.venta.solo_ida,
        importe_bruto: bruto,
        importe_final: totalFinal,
        moneda: draft.venta.moneda,
        neto_operador: netoOperador,
        pago_parcial: draft.pagoParcial,
        total_pagado: totalTesoreria,
        saldo_cta_cte: saldo,
        visible_en_files: visibleEnFiles,
        riesgo: draft.riesgo,
        importe_riesgo: importeRiesgo,
        riesgo_motivo: draft.riesgo_motivo,
        confirmado_vendedor: draft.confirmado,
        observaciones: draft.venta.observaciones,
        vendedor_id: draft.cliente.vendedor_id || currentProfile?.id || null,
        sucursal_id: draft.cliente.sucursal_id || currentProfile?.sucursal_id || null
      },
      pagosComerciales: draft.pagosComerciales.filter((pago) => parseMoney(pago.importe) > 0),
      movimientosTesoreria: draft.movimientosTesoreria
    };

    const ok = await saveFileWizard(payload);

    if (ok) {
      onSaved(visibleEnFiles ? "File cargado correctamente." : "Venta creada y enviada a Cta Cte.");
      onClose();
    }
  }

  const operadorOptions: SelectOption[] = catalogos.operadores.map((item) => ({
    value: item.id,
    label: item.nombre
  }));

  const servicioOptions: SelectOption[] = catalogos.servicios.map((item) => ({
    value: item.nombre,
    label: item.nombre
  }));

  const destinoOptions: SelectOption[] = catalogos.destinos.map((item) => ({
    value: item.nombre,
    label: item.pais ? `${item.nombre} · ${item.pais}` : item.nombre
  }));

  const formaPagoOptions: SelectOption[] = catalogos.formasPago.map((item) => ({
    value: item.nombre,
    label: item.nombre
  }));

  const cajaOptions: SelectOption[] = catalogos.cajas.map((item) => ({
    value: item.nombre,
    label: item.nombre
  }));

  const vendedorOptions: SelectOption[] = catalogos.vendedores.map((item) => ({
    value: item.id,
    label: `${item.nombre} ${item.apellido}`.trim()
  }));

  const sucursalOptions: SelectOption[] = catalogos.sucursales.map((item) => ({
    value: item.id,
    label: item.nombre
  }));

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-56px)] w-full max-w-7xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Nuevo file</h2>

            <p className="text-xs text-[#64748b]">
              Cliente → File / Operador → Pagos comerciales → Tesorería → Confirmar
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

        <WizardStepper step={step} />

        <WizardError message={wizardError} onClose={() => setWizardError(null)} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <main className="rounded-[24px] border border-black/10 bg-white p-4">
            {step === 1 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">Paso 1 · Cliente</h3>

                <div className="grid gap-4 lg:grid-cols-[120px_1fr]">
                  <div>
                    <FieldLabel>Prefijo</FieldLabel>
                    <TextInput
                      value={draft.phonePrefix}
                      onChange={(value) => setPhone(value, draft.phoneLocal)}
                      placeholder="+549"
                    />
                  </div>

                  <div>
                    <FieldLabel>Teléfono</FieldLabel>
                    <TextInput
                      value={draft.phoneLocal}
                      onChange={(value) => setPhone(draft.phonePrefix, value)}
                      placeholder="3516892764"
                      inputMode="tel"
                    />
                  </div>
                </div>

                {clientesSearch.length > 0 ? (
                  <div className="mt-4">
                    <FieldLabel>Clientes encontrados</FieldLabel>

                    <div className="grid gap-2">
                      {clientesSearch.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => selectCliente(cliente)}
                          className={[
                            "rounded-2xl border p-3 text-left transition",
                            draft.cliente.id === cliente.id
                              ? "border-nostur-orange bg-nostur-orange/10"
                              : "border-black/10 bg-[#f8fafc] hover:bg-white"
                          ].join(" ")}
                        >
                          <div className="text-xs font-black text-[#111827]">
                            {cliente.nombre_completo}
                          </div>

                          <div className="text-[11px] font-semibold text-[#64748b]">
                            {cliente.telefono} · {cliente.email || "sin email"}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel>Nombre completo *</FieldLabel>
                    <TextInput
                      value={draft.cliente.nombre_completo}
                      onChange={(value) => setCliente("nombre_completo", value)}
                      placeholder="Nombre y apellido"
                    />
                  </div>

                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <TextInput
                      value={draft.cliente.email}
                      onChange={(value) => setCliente("email", value)}
                      placeholder="cliente@email.com"
                      inputMode="email"
                    />
                  </div>

                  <div>
                    <FieldLabel>Método de contacto</FieldLabel>
                    <TextInput
                      value={draft.cliente.origen}
                      onChange={(value) => setCliente("origen", value)}
                      placeholder="Retail, referido, web..."
                    />
                  </div>

                  {canManageFiles ? (
                    <>
                      <div>
                        <FieldLabel>Vendedor</FieldLabel>
                        <NosturSelect
                          value={draft.cliente.vendedor_id}
                          onChange={(value) => setCliente("vendedor_id", value)}
                          options={vendedorOptions}
                        />
                      </div>

                      <div>
                        <FieldLabel>Sucursal</FieldLabel>
                        <NosturSelect
                          value={draft.cliente.sucursal_id}
                          onChange={(value) => setCliente("sucursal_id", value)}
                          options={sucursalOptions}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">Paso 2 · File / Operador</h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel>Número file *</FieldLabel>
                    <TextInput
                      value={draft.venta.numero_file}
                      onChange={(value) => setVenta("numero_file", maskFile(value))}
                      placeholder="123456"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <FieldLabel>Fecha venta</FieldLabel>
                    <NosturDateInput
                      value={draft.venta.fecha_venta}
                      onChange={(value) => setVenta("fecha_venta", value)}
                    />
                  </div>

                  <div>
                    <FieldLabel>Operador responsable</FieldLabel>
                    <NosturSelect
                      value={draft.venta.operador_id}
                      onChange={(value) => {
                        const selected = catalogos.operadores.find((item) => item.id === value);
                        setVenta("operador_id", value);
                        setVenta("operador", selected?.nombre || "");
                      }}
                      options={operadorOptions}
                      placeholder="Seleccionar operador"
                    />
                  </div>

                  <div>
                    <FieldLabel>Neto operador</FieldLabel>
                    <TextInput
                      value={draft.venta.neto_operador}
                      onChange={(value) => setVenta("neto_operador", value)}
                      placeholder="0,00"
                      inputMode="decimal"
                    />
                  </div>

                  <div>
                    <FieldLabel>Fecha IN</FieldLabel>
                    <NosturDateInput
                      value={draft.venta.fecha_in}
                      onChange={(value) => {
                        setVenta("fecha_in", value);

                        if (
                          draft.venta.fecha_out &&
                          value &&
                          isDateBefore(draft.venta.fecha_out, value)
                        ) {
                          setVenta("fecha_out", value);
                        }
                      }}
                      min={getToday()}
                    />
                  </div>

                  <div>
                    <FieldLabel>Fecha OUT</FieldLabel>
                    {draft.venta.solo_ida ? (
                      <div className="flex h-9 items-center rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-bold text-[#94a3b8]">
                        Solo ida
                      </div>
                    ) : (
                      <NosturDateInput
                        value={draft.venta.fecha_out}
                        onChange={(value) => setVenta("fecha_out", value)}
                        min={draft.venta.fecha_in || getToday()}
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <BooleanChip
                      checked={draft.venta.solo_ida}
                      onChange={(value) => {
                        setVenta("solo_ida", value);
                        if (value) setVenta("fecha_out", "");
                      }}
                      label="Solo ida"
                    />
                  </div>

                  <div>
                    <FieldLabel>Tipo de servicio</FieldLabel>
                    <NosturSelect
                      value={draft.venta.servicio}
                      onChange={(value) => setVenta("servicio", value)}
                      options={servicioOptions}
                      placeholder="Seleccionar servicio"
                    />
                  </div>

                  <div>
                    <FieldLabel>Destino / destinos</FieldLabel>
                    <DestinosInlineMultiSelect
                      values={draft.venta.destinos}
                      onChange={(values) => setVenta("destinos", values)}
                      options={destinoOptions}
                      onCreate={createDestinoInline}
                    />
                  </div>

                  <div>
                    <FieldLabel>Importe bruto</FieldLabel>
                    <TextInput
                      value={draft.venta.importe_bruto}
                      onChange={(value) => setVenta("importe_bruto", value)}
                      placeholder="61.148,00"
                      inputMode="decimal"
                    />
                  </div>

                  <div>
                    <FieldLabel>Moneda</FieldLabel>
                    <NosturSelect
                      value={draft.venta.moneda}
                      onChange={(value) => {
                        setVenta("moneda", value);
                        setDraft((current) => ({
                          ...current,
                          pagosComerciales: current.pagosComerciales.map((pago) => ({
                            ...pago,
                            moneda: value
                          })),
                          movimientosTesoreria: current.movimientosTesoreria.map((movimiento) => ({
                            ...movimiento,
                            moneda: value
                          }))
                        }));
                      }}
                      options={MONEDA_OPTIONS}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FieldLabel>Observaciones</FieldLabel>
                    <TextArea
                      value={draft.venta.observaciones}
                      onChange={(value) => setVenta("observaciones", value)}
                      placeholder="Notas comerciales o de control..."
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Importe bruto</span>
                    <strong>{formatMoneyAR(bruto, draft.venta.moneda)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Neto operador</span>
                    <strong>{formatMoneyAR(netoOperador, draft.venta.moneda)}</strong>
                  </div>

                  <div className="mt-2 flex justify-between border-t border-black/10 pt-2">
                    <span className="font-black text-[#111827]">Margen estimado</span>
                    <strong className="text-[#111827]">
                      {formatMoneyAR(margenEstimado, draft.venta.moneda)}
                    </strong>
                  </div>
                </div>
              </section>
            ) : null}

                        {step === 3 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">
                  Paso 3 · Pagos comerciales
                </h3>

                <div className="mb-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs font-bold text-[#334155]">
                  Total cliente: {formatMoneyAR(totalFinal, draft.venta.moneda)}
                </div>

                <div className="grid gap-2">
                  {draft.pagosComerciales.map((pago, index) => (
                    <div
                      key={`pago-comercial-${index}`}
                      className="grid gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 md:grid-cols-[1fr_120px_1fr_auto]"
                    >
                      <div>
                        <FieldLabel>Importe</FieldLabel>
                        <TextInput
                          value={pago.importe ? String(pago.importe).replace(".", ",") : ""}
                          onChange={(value) => updatePago(index, { importe: parseMoney(value) })}
                          placeholder="0,00"
                          inputMode="decimal"
                        />
                      </div>

                      <div>
                        <FieldLabel>Moneda</FieldLabel>
                        <NosturSelect
                          value={pago.moneda || draft.venta.moneda}
                          onChange={(value) => updatePago(index, { moneda: value })}
                          options={MONEDA_OPTIONS}
                        />
                      </div>

                      <div>
                        <FieldLabel>Forma pago</FieldLabel>
                        <NosturSelect
                          value={pago.forma_pago || ""}
                          onChange={(value) => updatePago(index, { forma_pago: value })}
                          options={formaPagoOptions}
                        />
                      </div>

                      <div className="flex items-end">
                        <LineButton
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              pagosComerciales: current.pagosComerciales.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                            }))
                          }
                        >
                          Eliminar
                        </LineButton>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <LineButton
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        pagosComerciales: [
                          ...current.pagosComerciales,
                          { importe: 0, moneda: current.venta.moneda, forma_pago: "" }
                        ]
                      }))
                    }
                  >
                    + Agregar pago comercial
                  </LineButton>

                  <BooleanChip
                    checked={draft.pagoParcial}
                    onChange={(value) => {
                      setWizardError(null);
                      setDraft((current) => ({ ...current, pagoParcial: value }));
                    }}
                    label="Pago parcial / enviar saldo a Cta Cte"
                  />

                  <BooleanChip
                    checked={draft.riesgo}
                    onChange={(value) => {
                      setWizardError(null);
                      setDraft((current) => ({
                        ...current,
                        riesgo: value,
                        importe_riesgo: value
                          ? current.importe_riesgo ||
                            String(Math.max(totalFinal - totalPagosComerciales, 0)).replace(
                              ".",
                              ","
                            )
                          : "",
                        riesgo_motivo: value ? current.riesgo_motivo : ""
                      }));
                    }}
                    label="Imputar a riesgo operador"
                  />
                </div>

                {draft.riesgo ? (
                  <div className="mt-3 grid gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                      <FieldLabel>Importe riesgo operador</FieldLabel>
                      <TextInput
                        value={draft.importe_riesgo}
                        onChange={(value) => {
                          setWizardError(null);
                          setDraft((current) => ({ ...current, importe_riesgo: value }));
                        }}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </div>

                    <div>
                      <FieldLabel>Motivo / observación riesgo</FieldLabel>
                      <TextInput
                        value={draft.riesgo_motivo}
                        onChange={(value) => {
                          setWizardError(null);
                          setDraft((current) => ({ ...current, riesgo_motivo: value }));
                        }}
                        placeholder="Ej: saldo con operador a cancelar luego"
                      />
                    </div>

                    <div className="rounded-xl border border-red-200 bg-white/70 p-3 text-[11px] font-bold text-red-700 md:col-span-2">
                      Riesgo operador significa que el cliente nos paga a NOSSIX, pero la deuda
                      con el operador queda pendiente para cancelarla luego.
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Imputación comercial</span>
                    <strong>{formatMoneyAR(totalComercial, draft.venta.moneda)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Pago comercial</span>
                    <strong>{formatMoneyAR(totalPagosComerciales, draft.venta.moneda)}</strong>
                  </div>

                  {draft.riesgo ? (
                    <div className="flex justify-between">
                      <span className="text-[#64748b]">Riesgo operador</span>
                      <strong className="text-red-700">
                        {formatMoneyAR(importeRiesgo, draft.venta.moneda)}
                      </strong>
                    </div>
                  ) : null}

                  <div className="mt-2 flex justify-between border-t border-black/10 pt-2">
                    <span className="text-[#64748b]">Saldo comercial</span>
                    <strong className={saldoComercial > 0 ? "text-red-600" : "text-green-700"}>
                      {formatMoneyAR(saldoComercial, draft.venta.moneda)}
                    </strong>
                  </div>

                  {saldoComercial > 0 ? (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 font-bold text-amber-700">
                      Si este saldo corresponde a deuda del pasajero, marcá pago parcial. Si
                      corresponde a deuda con el operador, usá riesgo operador.
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">
                  Paso 4 · Tesorería real
                </h3>

                <div className="mb-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs font-bold text-[#334155]">
                  Total cliente a cobrar hoy: {formatMoneyAR(totalFinal, draft.venta.moneda)}
                </div>

                <div className="grid gap-2">
                  {draft.movimientosTesoreria.map((movimiento, index) => (
                    <div
                      key={`movimiento-${index}`}
                      className="grid gap-2 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 md:grid-cols-[1fr_1fr_110px_1fr_110px_auto]"
                    >
                      <div>
                        <FieldLabel>Caja</FieldLabel>
                        <NosturSelect
                          value={movimiento.caja || ""}
                          onChange={(value) => updateMovimiento(index, { caja: value })}
                          options={cajaOptions}
                        />
                      </div>

                      <div>
                        <FieldLabel>Forma real</FieldLabel>
                        <NosturSelect
                          value={movimiento.forma_pago || ""}
                          onChange={(value) => updateMovimiento(index, { forma_pago: value })}
                          options={formaPagoOptions}
                        />
                      </div>

                      <div>
                        <FieldLabel>Moneda</FieldLabel>
                        <NosturSelect
                          value={movimiento.moneda || draft.venta.moneda}
                          onChange={(value) => updateMovimiento(index, { moneda: value })}
                          options={MONEDA_OPTIONS}
                        />
                      </div>

                      <div>
                        <FieldLabel>Importe</FieldLabel>
                        <TextInput
                          value={
                            movimiento.importe
                              ? String(movimiento.importe).replace(".", ",")
                              : ""
                          }
                          onChange={(value) =>
                            updateMovimiento(index, { importe: parseMoney(value) })
                          }
                          placeholder="0,00"
                          inputMode="decimal"
                        />
                      </div>

                      <div>
                        <FieldLabel>TC</FieldLabel>
                        <TextInput
                          value={
                            movimiento.tipo_cambio
                              ? String(movimiento.tipo_cambio).replace(".", ",")
                              : ""
                          }
                          onChange={(value) =>
                            updateMovimiento(index, { tipo_cambio: parseMoney(value) })
                          }
                          placeholder="—"
                          inputMode="decimal"
                        />
                      </div>

                      <div className="flex items-end">
                        <LineButton
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              movimientosTesoreria: current.movimientosTesoreria.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                            }))
                          }
                        >
                          Eliminar
                        </LineButton>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <LineButton
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        movimientosTesoreria: [
                          ...current.movimientosTesoreria,
                          { importe: 0, moneda: current.venta.moneda, forma_pago: "", caja: "" }
                        ]
                      }))
                    }
                  >
                    + Agregar movimiento
                  </LineButton>
                </div>

                <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Total imputado</span>
                    <strong>{formatMoneyAR(totalTesoreria, draft.venta.moneda)}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Diferencia contra total cliente</span>
                    <strong
                      className={
                        Math.abs(totalTesoreria - totalFinal) > 0.009
                          ? "text-red-600"
                          : "text-green-700"
                      }
                    >
                      {formatMoneyAR(totalTesoreria - totalFinal, draft.venta.moneda)}
                    </strong>
                  </div>

                  {draft.riesgo ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 font-bold text-red-700">
                      Este file tiene riesgo operador: el ingreso del cliente entra ahora a Caja;
                      la deuda con el operador se cancelará luego desde Riesgos.
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 5 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">
                  Paso 5 · Confirmación final
                </h3>

                <div className="grid gap-3 text-xs md:grid-cols-2">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>Cliente</FieldLabel>
                    <div className="font-black text-[#111827]">
                      {draft.cliente.nombre_completo}
                    </div>
                    <div className="text-[#64748b]">{draft.cliente.telefono}</div>
                    <div className="text-[#64748b]">{draft.cliente.email || "Sin email"}</div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>File / Operador</FieldLabel>
                    <div className="font-black text-[#111827]">{draft.venta.numero_file}</div>
                    <div className="text-[#64748b]">
                      {draft.venta.servicio} · {joinDestinos(draft.venta.destinos)}
                    </div>
                    <div className="text-[#64748b]">
                      {formatDateAR(draft.venta.fecha_in)} →{" "}
                      {draft.venta.solo_ida ? "Solo ida" : formatDateAR(draft.venta.fecha_out)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>Importes</FieldLabel>
                    <div className="flex justify-between">
                      <span>Bruto</span>
                      <strong>{formatMoneyAR(bruto, draft.venta.moneda)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Neto operador</span>
                      <strong>{formatMoneyAR(netoOperador, draft.venta.moneda)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Margen estimado</span>
                      <strong>{formatMoneyAR(margenEstimado, draft.venta.moneda)}</strong>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>Resultado</FieldLabel>
                    <div className="flex justify-between">
                      <span>Comercial</span>
                      <strong>{formatMoneyAR(totalComercial, draft.venta.moneda)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Tesorería</span>
                      <strong>{formatMoneyAR(totalTesoreria, draft.venta.moneda)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Saldo Cta Cte</span>
                      <strong>{formatMoneyAR(saldo, draft.venta.moneda)}</strong>
                    </div>
                    <div className="mt-2 font-black text-[#111827]">
                      Queda en Files: {visibleEnFiles ? "SÍ" : "NO · Va a Cta Cte"}
                    </div>
                    <div className="font-black text-[#111827]">
                      Riesgo operador: {draft.riesgo ? "SÍ" : "NO"}
                    </div>
                    {draft.riesgo ? (
                      <div className="font-black text-red-700">
                        Importe riesgo: {formatMoneyAR(importeRiesgo, draft.venta.moneda)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <BooleanChip
                    checked={draft.confirmado}
                    onChange={(value) => {
                      setWizardError(null);
                      setDraft((current) => ({ ...current, confirmado: value }));
                    }}
                    label="Confirmo que los datos son correctos"
                  />
                </div>
              </section>
            ) : null}
          </main>

          <WizardSummary
            draft={draft}
            totalFinal={totalFinal}
            totalComercial={totalComercial}
            totalTesoreria={totalTesoreria}
            saldo={saldo}
          />
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={step === 1}
              onClick={() => {
                setWizardError(null);
                setStep((current) => Math.max(1, current - 1) as WizardStep);
              }}
              className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc] disabled:opacity-40"
            >
              Atrás
            </button>

            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || !draft.confirmado}
                onClick={submit}
                className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
              >
                {saving ? "Creando..." : "Crear file"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileDetailModal({
  file,
  onClose
}: {
  file: FileItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-4xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">File {file.numero_file}</h2>
            <p className="text-xs text-[#64748b]">
              {file.clientes?.nombre_completo || "Sin cliente"} · {file.destino || "Sin destino"}
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

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Cliente</FieldLabel>
            <div className="text-sm font-black text-[#111827]">
              {file.clientes?.nombre_completo || "—"}
            </div>
            <div className="text-xs text-[#64748b]">{file.clientes?.telefono || "—"}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Viaje</FieldLabel>
            <div className="text-sm font-black text-[#111827]">{file.destino || "—"}</div>
            <div className="text-xs text-[#64748b]">
              {formatDateAR(file.fecha_in)} →{" "}
              {file.solo_ida ? "Solo ida" : formatDateAR(file.fecha_out)}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Total</FieldLabel>
            <div className="text-sm font-black text-[#111827]">
              {formatMoneyAR(file.importe_final, file.moneda)}
            </div>
            <div className="text-xs text-[#64748b]">{file.estado}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#475569]">
            <div className="mb-2">
              Servicio: <strong>{file.servicio || "—"}</strong>
            </div>
            <div className="mb-2">
              Método contacto: <strong>{file.metodo_contacto || "—"}</strong>
            </div>
            <div className="mb-2">
              Operador: <strong>{file.operador || "—"}</strong>
            </div>
            <div className="mb-2">
              Vendedor: <strong>{file.vendedor || "—"}</strong>
            </div>
            <div>
              Riesgo: <strong>{file.riesgo ? "SÍ" : "NO"}</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#475569]">
            <div className="mb-2">
              Bruto: <strong>{formatMoneyAR(file.importe_bruto, file.moneda)}</strong>
            </div>
            <div className="mb-2">
              Neto operador: <strong>{formatMoneyAR(file.neto_operador, file.moneda)}</strong>
            </div>
            <div className="mb-2">
              Pagado: <strong>{formatMoneyAR(file.total_pagado, file.moneda)}</strong>
            </div>
            <div>
              Saldo: <strong>{formatMoneyAR(file.saldo_cta_cte, file.moneda)}</strong>
            </div>
          </div>
        </div>

        {file.riesgo ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <strong>Motivo riesgo:</strong> {file.riesgo_motivo || "Sin motivo cargado"}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function FilesPanel() {
  const loading = useFilesStore((state) => state.loading);
  const saving = useFilesStore((state) => state.saving);
  const error = useFilesStore((state) => state.error);
  const currentProfile = useFilesStore((state) => state.currentProfile);
  const canManageFiles = useFilesStore((state) => state.canManageFiles);
  const filters = useFilesStore((state) => state.filters);
  const catalogos = useFilesStore((state) => state.catalogos);
  const selectedFileId = useFilesStore((state) => state.selectedFileId);

  const loadFiles = useFilesStore((state) => state.loadFiles);
  const setFilter = useFilesStore((state) => state.setFilter);
  const clearError = useFilesStore((state) => state.clearError);
  const selectFile = useFilesStore((state) => state.selectFile);
  const toggleFileActivo = useFilesStore((state) => state.toggleFileActivo);

  const getFilteredFiles = useFilesStore((state) => state.getFilteredFiles);
  const getMetrics = useFilesStore((state) => state.getMetrics);

  const files = getFilteredFiles();
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailFile, setDetailFile] = useState<FileItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) || files[0] || null,
    [files, selectedFileId]
  );

  const selectedMonthLabel = getMonthLabel(filters.mes);
  const currentMonthValue = getCurrentMonthValue();

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function applyMonthAndReload(monthValue: string) {
    setFilter("mes", monthValue);

    window.setTimeout(() => {
      loadFiles();
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

  async function handleToggle(file: FileItem) {
    const ok = await toggleFileActivo(file);

    if (ok) showToast(file.activo ? "File desactivado." : "File activado.");
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

  const operadorOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    ...catalogos.operadores.map((item) => ({
      value: item.id,
      label: item.nombre
    }))
  ];

  const activoOptions: SelectOption[] = [
    { value: "activos", label: "Activos" },
    { value: "inactivos", label: "Inactivos" },
    { value: "todos", label: "Todos" }
  ];

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Files</h1>

          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            FILES
          </span>

          <span className="text-xs font-semibold text-[#64748b]">
            {canManageFiles
              ? "Carga de files / operadores"
              : `Files asignados a ${currentProfile?.nombre || "tu usuario"}`}
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
                {selectedMonthLabel} · {filters.desde} → {filters.hasta} · Estado:{" "}
                {filters.estado === "todos" ? "Todos" : filters.estado}
              </div>
            </button>

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
                </button>
              </div>

              <button
                type="button"
                onClick={goToCurrentMonth}
                className={[
                  "h-8 rounded-xl px-3 text-[11px] font-black transition",
                  filters.mes === currentMonthValue
                    ? "bg-nostur-orange text-white"
                    : "bg-white/80 text-[#334155] shadow-sm hover:bg-white"
                ].join(" ")}
              >
                Este mes
              </button>

              <button
                type="button"
                onClick={loadFiles}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={13} strokeWidth={1.8} />
                Nuevo file
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr]">
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
                      align="left"
                    />
                  </div>

                  <div>
                    <FieldLabel>Hasta</FieldLabel>
                    <NosturDateInput
                      value={filters.hasta}
                      onChange={(value) => setFilter("hasta", value)}
                      align="left"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Estado</FieldLabel>
                  <NosturSelect
                    value={filters.estado}
                    onChange={(value) => setFilter("estado", value)}
                    options={ESTADO_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Operador</FieldLabel>
                  <NosturSelect
                    value={filters.operadorId}
                    onChange={(value) => setFilter("operadorId", value)}
                    options={operadorOptions}
                  />
                </div>

                {canManageFiles ? (
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

                <div>
                  <FieldLabel>Activo</FieldLabel>
                  <NosturSelect
                    value={filters.activo}
                    onChange={(value) => setFilter("activo", value as typeof filters.activo)}
                    options={activoOptions}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por cliente, teléfono, file, destino..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadFiles}
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

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <CardMetric label="Files" value={metrics.files} icon={ShoppingCart} />
          <CardMetric label="Total venta" value={formatMoneyAR(metrics.totalVenta)} icon={FileText} />
          <CardMetric
            label="Neto operador"
            value={formatMoneyAR(metrics.netoOperador)}
            icon={FileText}
          />
          <CardMetric
            label="Margen est."
            value={formatMoneyAR(metrics.margenEstimado)}
            icon={CheckCircle2}
          />
          <CardMetric label="Pagado" value={formatMoneyAR(metrics.totalPagado)} icon={CheckCircle2} />
          <CardMetric label="Saldo" value={formatMoneyAR(metrics.saldo)} icon={AlertTriangle} />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Listado de files</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${files.length} files cargados`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando files...
              </div>
            ) : files.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay files para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {files.map((file) => {
                  const selected = selectedFile?.id === file.id;
                  const cliente = file.clientes;

                  return (
                    <button
                      key={file.id}
                      onClick={() => selectFile(file.id)}
                      className={[
                        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[1.4fr_1.2fr_1.1fr_140px_150px]",
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
                          {file.numero_file}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {file.destino || "Sin destino"}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {formatDateAR(file.fecha_in)} →{" "}
                          {file.solo_ida ? "Solo ida" : formatDateAR(file.fecha_out)}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {file.servicio || "Sin servicio"} ·{" "}
                          {file.metodo_contacto || "Sin método"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">
                          {formatMoneyAR(file.importe_final, file.moneda)}
                        </div>
                        <div className="text-[11px] text-[#64748b]">
                          Pagado {formatMoneyAR(file.total_pagado, file.moneda)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#334155]">
                          {file.estado}
                        </span>

                        {file.riesgo ? (
                          <span className="rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                            RIESGO
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon={Eye}
                          label="Ver detalle"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailFile(file);
                          }}
                        />

                        <IconButton
                          icon={ShoppingCart}
                          label="Ver operador"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailFile(file);
                          }}
                        />

                        <IconButton
                          icon={file.activo ? ToggleRight : ToggleLeft}
                          label={file.activo ? "Desactivar" : "Activar"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggle(file);
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
            {selectedFile ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white">
                      {getInitials(selectedFile.clientes?.nombre_completo || "C")}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-[#111827]">
                        {selectedFile.numero_file}
                      </h2>
                      <p className="truncate text-xs text-[#64748b]">
                        {selectedFile.clientes?.nombre_completo || "Sin cliente"}
                      </p>
                    </div>
                  </div>

                  {selectedFile.riesgo ? (
                    <span className="rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                      RIESGO
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-4 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <UserRound size={14} className="text-nostur-orange" />
                      <span className="truncate font-black text-[#111827]">
                        {selectedFile.clientes?.nombre_completo || "Sin cliente"}
                      </span>
                    </div>
                    <div className="text-[#64748b]">
                      {selectedFile.clientes?.telefono || "—"}
                    </div>
                    <div className="text-[#64748b]">
                      {selectedFile.clientes?.email || "Sin email"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Viaje</FieldLabel>
                    <div className="font-black text-[#111827]">
                      {selectedFile.destino || "Sin destino"}
                    </div>
                    <div className="text-[#64748b]">
                      {formatDateAR(selectedFile.fecha_in)} →{" "}
                      {selectedFile.solo_ida ? "Solo ida" : formatDateAR(selectedFile.fecha_out)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Operador</FieldLabel>
                    <div className="font-black text-[#111827]">
                      {selectedFile.operador || "Sin operador"}
                    </div>
                    <div className="text-[#64748b]">{selectedFile.servicio || "Sin servicio"}</div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Importes</FieldLabel>
                    <div className="flex justify-between">
                      <span>Bruto</span>
                      <strong>
                        {formatMoneyAR(selectedFile.importe_bruto, selectedFile.moneda)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Neto operador</span>
                      <strong>
                        {formatMoneyAR(selectedFile.neto_operador, selectedFile.moneda)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Final</span>
                      <strong>
                        {formatMoneyAR(selectedFile.importe_final, selectedFile.moneda)}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Pagado</span>
                      <strong>{formatMoneyAR(selectedFile.total_pagado, selectedFile.moneda)}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDetailFile(selectedFile)}
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Ver
                    </button>

                    <button
                      onClick={() => setDetailFile(selectedFile)}
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Operador
                    </button>

                    <button
                      onClick={() => handleToggle(selectedFile)}
                      disabled={saving}
                      className="h-10 rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {selectedFile.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná un file para ver el detalle.
              </div>
            )}
          </aside>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {wizardOpen ? (
        <FileWizard
          onClose={() => setWizardOpen(false)}
          onSaved={(message) => showToast(message)}
        />
      ) : null}

      {detailFile ? <FileDetailModal file={detailFile} onClose={() => setDetailFile(null)} /> : null}
    </div>
  );
}