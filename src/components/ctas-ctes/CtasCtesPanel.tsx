import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  Copy,
  ExternalLink,
  Eye,
  Filter,
  RefreshCcw,
  Search,
  UserRound,
  Wallet,
  X
} from "lucide-react";
import {
  createInitialPagoDraft,
  useCtasCtesStore,
  type CajaLite,
  type CtaCteItem,
  type CtaCtePago,
  type PagoCtaCteDraft
} from "../../store/ctasCtesStore";
import { IconButton } from "../ui/IconButton";
import { formatMoneyAR } from "../../lib/formatters";

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const ORIGEN_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "CARRITO", label: "Carritos" },
  { value: "FILE", label: "Files" }
];

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todas" },
  { value: "ARS", label: "Pesos" },
  { value: "USD", label: "Dólares" }
];

const METODO_PAGO_OPTIONS: SelectOption[] = [
  { value: "Transferencia bancaria", label: "Transferencia bancaria" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Tarjeta", label: "Tarjeta" },
  { value: "Mercado Pago", label: "Mercado Pago" },
  { value: "Otro", label: "Otro" }
];

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";

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

function toDisplayDate(value?: string | null): string {
  if (!value) return "";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "";

  return `${day}/${month}/${year}`;
}

function formatDateInputMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.slice(0, 1).toUpperCase())
    .join("");
}

function getOrigenLabel(origen: string): string {
  if (origen === "CARRITO") return "Carrito";
  if (origen === "FILE") return "File";
  return origen;
}

function getAbacoUrl(numero: string): string {
  return `https://abaco.almundo.com/bo/cart/${numero}`;
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
      className="min-h-[82px] w-full resize-none rounded-xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
    />
  );
}

function NosturDateInput({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [displayValue, setDisplayValue] = useState(() => toDisplayDate(value));
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => createDateFromStorage(value));

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

    onChange(storageValue);
    setVisibleMonth(createDateFromStorage(storageValue));
  }

  function selectDate(date: Date) {
    const storageValue = formatCalendarStorageDate(date);

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
      <div className="flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 focus-within:border-nostur-orange">
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

          <div className="absolute right-0 top-[44px] z-[120] w-[260px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
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
                ‹
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
                ›
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

                return (
                  <button
                    key={storageDate}
                    type="button"
                    onClick={() => selectDate(date)}
                    className={[
                      "flex h-7 items-center justify-center rounded-lg text-[11px] font-black transition",
                      isSelected
                        ? "bg-nostur-orange text-white"
                        : isToday
                          ? "bg-nostur-orange/15 text-nostur-orange"
                          : isCurrentMonth
                            ? "text-[#334155] hover:bg-[#f1f5f9]"
                            : "text-[#cbd5e1] hover:bg-[#f8fafc]"
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
  icon: Icon,
  tone = "orange"
}: {
  label: string;
  value: string | number;
  icon: typeof Wallet;
  tone?: "orange" | "blue" | "green" | "red";
}) {
  const toneClass = {
    orange: "bg-nostur-orange/15 text-nostur-orange",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700"
  }[tone];

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={["flex h-9 w-9 items-center justify-center rounded-xl", toneClass].join(" ")}
        >
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

function PagoModal({
  item,
  saving,
  cajas,
  onClose,
  onSave
}: {
  item: CtaCteItem;
  saving: boolean;
  cajas: CajaLite[];
  onClose: () => void;
  onSave: (draft: PagoCtaCteDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PagoCtaCteDraft>(() => createInitialPagoDraft(item));

  const cajaOptions: SelectOption[] = [
    { value: "", label: "Sin caja" },
    ...cajas.map((caja) => ({
      value: caja.id,
      label: caja.nombre
    }))
  ];

  function setField<K extends keyof PagoCtaCteDraft>(key: K, value: PagoCtaCteDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              Registrar pago - {item.pasajero || "Sin pasajero"}
            </h2>

            <p className="text-xs text-[#64748b]">
              {getOrigenLabel(item.origen)} · {item.numero_operacion}
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

        <div className="mb-4 grid gap-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs md:grid-cols-3">
          <div>
            <FieldLabel>Total</FieldLabel>

            <div className="text-sm font-black text-[#111827]">
              {formatMoneyAR(item.importe_total, item.moneda)}
            </div>
          </div>

          <div>
            <FieldLabel>Pagado</FieldLabel>

            <div className="text-sm font-black text-green-700">
              {formatMoneyAR(item.total_pagado, item.moneda)}
            </div>
          </div>

          <div>
            <FieldLabel>Saldo cliente</FieldLabel>

            <div className="text-sm font-black text-red-700">
              {formatMoneyAR(item.saldo_cta_cte, item.moneda)}
            </div>
          </div>
        </div>

        {item.origen === "CARRITO" ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs">
            <div className="font-black text-amber-800">Ingreso a gastos</div>
            <div className="mt-0.5 font-bold text-amber-700">
              {formatDate(item.fecha_ingreso_gastos)}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <FieldLabel>Fecha de pago</FieldLabel>

            <NosturDateInput
              value={draft.fecha_pago}
              onChange={(value) => setField("fecha_pago", value)}
            />
          </div>

          <div>
            <FieldLabel>Importe del pago</FieldLabel>

            <TextInput
              value={draft.importe}
              onChange={(value) => setField("importe", value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div>
            <FieldLabel>Método de pago</FieldLabel>

            <NosturSelect
              value={draft.metodo_pago}
              onChange={(value) => setField("metodo_pago", value)}
              options={METODO_PAGO_OPTIONS}
              placeholder="Seleccionar método"
            />
          </div>

          <div>
            <FieldLabel>Caja / banco destino</FieldLabel>

            <NosturSelect
              value={draft.caja_id}
              onChange={(value) => setField("caja_id", value)}
              options={cajaOptions}
              placeholder="Seleccionar caja"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Observaciones</FieldLabel>

            <TextArea
              value={draft.observaciones}
              onChange={(value) => setField("observaciones", value)}
              placeholder="Notas del pago..."
            />
          </div>

          <button
            type="button"
            onClick={() => setField("entrega_efectivo", !draft.entrega_efectivo)}
            className={[
              "flex h-10 items-center justify-center rounded-xl border px-3 text-xs font-black transition",
              draft.entrega_efectivo
                ? "border-nostur-orange/40 bg-nostur-orange/15 text-[#111827]"
                : "border-black/10 bg-[#f8fafc] text-[#64748b]"
            ].join(" ")}
          >
            {draft.entrega_efectivo ? "✓ Entrega efectivo" : "Entrega efectivo"}
          </button>
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
            className="h-9 rounded-xl bg-green-600 px-5 text-xs font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar pago cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleModal({
  item,
  pagos,
  onClose
}: {
  item: CtaCteItem;
  pagos: CtaCtePago[];
  onClose: () => void;
}) {
  const textoCliente = [
    `Cliente: ${item.pasajero || "Sin pasajero"}`,
    item.telefono ? `Teléfono: ${item.telefono}` : "",
    item.email ? `Email: ${item.email}` : "",
    `${getOrigenLabel(item.origen)}: ${item.numero_operacion}`,
    item.origen === "CARRITO"
      ? `Ingreso a gastos: ${formatDate(item.fecha_ingreso_gastos)}`
      : "",
    `Total: ${formatMoneyAR(item.importe_total, item.moneda)}`,
    `Pagado: ${formatMoneyAR(item.total_pagado, item.moneda)}`,
    `Saldo: ${formatMoneyAR(item.saldo_cta_cte, item.moneda)}`
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-64px)] w-full max-w-6xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              Detalle de cuenta corriente - {item.pasajero || "Sin pasajero"}
            </h2>

            <p className="text-xs text-[#64748b]">
              {getOrigenLabel(item.origen)} · {item.numero_operacion}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              icon={Copy}
              label="Copiar resumen"
              onClick={() => navigator.clipboard.writeText(textoCliente)}
            />

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserRound size={16} className="text-nostur-orange" />

              <h3 className="text-sm font-black text-[#111827]">Información del cliente</h3>
            </div>

            <div className="grid gap-1 text-xs text-[#334155]">
              <div>
                Nombre: <strong>{item.pasajero || "—"}</strong>
              </div>

              <div>
                Teléfono: <strong>{item.telefono || "—"}</strong>
              </div>

              <div>
                Email: <strong>{item.email || "—"}</strong>
              </div>

              <div>
                Vendedor: <strong>{item.vendedor || "—"}</strong>
              </div>

              <div>
                Sucursal: <strong>{item.sucursal || "—"}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={16} className="text-nostur-orange" />

              <h3 className="text-sm font-black text-[#111827]">Información de la operación</h3>
            </div>

            <div className="grid gap-1 text-xs text-[#334155]">
              <div>
                {getOrigenLabel(item.origen)}: <strong>{item.numero_operacion}</strong>

                {item.origen === "CARRITO" ? (
                  <button
                    type="button"
                    onClick={() => window.open(getAbacoUrl(item.numero_operacion), "_blank")}
                    className="ml-2 text-nostur-orange hover:underline"
                  >
                    abrir
                  </button>
                ) : null}
              </div>

              <div>
                Fecha venta: <strong>{formatDate(item.fecha_venta)}</strong>
              </div>

              {item.origen === "CARRITO" ? (
                <div>
                  Fecha ingreso a gastos:{" "}
                  <strong className="text-amber-700">
                    {formatDate(item.fecha_ingreso_gastos)}
                  </strong>
                </div>
              ) : null}

              <div>
                Fecha IN: <strong>{formatDate(item.fecha_in)}</strong>
              </div>

              <div>
                Fecha OUT:{" "}
                <strong>{item.solo_ida ? "Solo ida" : formatDate(item.fecha_out)}</strong>
              </div>

              <div>
                Servicio: <strong>{item.servicio || "—"}</strong>
              </div>

              <div>
                Destino: <strong>{item.destino || "—"}</strong>
              </div>

              <div>
                Forma de pago: <strong>{item.forma_pago || "—"}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
            <div className="text-lg font-black text-blue-800">
              {formatMoneyAR(item.importe_total, item.moneda)}
            </div>

            <div className="text-xs font-bold text-blue-700">Importe total</div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
            <div className="text-lg font-black text-green-800">
              {formatMoneyAR(item.total_pagado, item.moneda)}
            </div>

            <div className="text-xs font-bold text-green-700">Pagado por cliente</div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
            <div className="text-lg font-black text-red-800">
              {formatMoneyAR(item.saldo_cta_cte, item.moneda)}
            </div>

            <div className="text-xs font-bold text-red-700">Saldo pendiente</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center">
            <div className="text-lg font-black text-[#111827]">
              {item.cantidad_pagos || pagos.length}
            </div>

            <div className="text-xs font-bold text-[#64748b]">Pagos registrados</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/10 px-4 py-3">
            <h3 className="text-sm font-black text-[#111827]">Historial de pagos</h3>
          </div>

          {pagos.length === 0 ? (
            <div className="p-5 text-center text-xs text-[#64748b]">
              No hay pagos registrados para esta cuenta corriente.
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-black/10 bg-[#f8fafc] text-[10px] uppercase tracking-wide text-[#64748b]">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">Importe</th>
                    <th className="px-3 py-2">Método</th>
                    <th className="px-3 py-2">Efectivo</th>
                    <th className="px-3 py-2">Observaciones</th>
                  </tr>
                </thead>

                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id} className="border-b border-black/5 last:border-0">
                      <td className="px-3 py-2 font-black text-[#111827]">
                        {formatDate(pago.fecha_pago)}
                      </td>

                      <td className="px-3 py-2 text-right font-black text-green-700">
                        {formatMoneyAR(pago.importe, pago.moneda)}
                      </td>

                      <td className="px-3 py-2 text-[#334155]">{pago.metodo_pago || "—"}</td>

                      <td className="px-3 py-2 text-[#334155]">
                        {pago.entrega_efectivo ? "Sí" : "No"}
                      </td>

                      <td className="px-3 py-2 text-[#64748b]">
                        {pago.observaciones || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-black/10 bg-white px-5 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export function CtasCtesPanel() {
  const loading = useCtasCtesStore((state) => state.loading);
  const saving = useCtasCtesStore((state) => state.saving);
  const error = useCtasCtesStore((state) => state.error);
  const currentProfile = useCtasCtesStore((state) => state.currentProfile);
  const canManageCtasCtes = useCtasCtesStore((state) => state.canManageCtasCtes);
  const filters = useCtasCtesStore((state) => state.filters);
  const catalogos = useCtasCtesStore((state) => state.catalogos);

  const loadCtasCtes = useCtasCtesStore((state) => state.loadCtasCtes);
  const registrarPago = useCtasCtesStore((state) => state.registrarPago);
  const setFilter = useCtasCtesStore((state) => state.setFilter);
  const clearError = useCtasCtesStore((state) => state.clearError);
  const selectItem = useCtasCtesStore((state) => state.selectItem);

  const getFilteredItems = useCtasCtesStore((state) => state.getFilteredItems);
  const getSelectedItem = useCtasCtesStore((state) => state.getSelectedItem);
  const getPagosForItem = useCtasCtesStore((state) => state.getPagosForItem);
  const getMetrics = useCtasCtesStore((state) => state.getMetrics);

  const items = getFilteredItems();

  const selectedItem = useMemo(() => getSelectedItem(), [items, getSelectedItem]);

  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagoItem, setPagoItem] = useState<CtaCteItem | null>(null);
  const [detalleItem, setDetalleItem] = useState<CtaCteItem | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const pagosDetalle = getPagosForItem(detalleItem);

  useEffect(() => {
    loadCtasCtes();
  }, [loadCtasCtes]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
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

  async function handleSavePago(draft: PagoCtaCteDraft) {
    if (!pagoItem) return;

    const ok = await registrarPago(pagoItem, draft);

    if (ok) {
      setPagoItem(null);
      showToast("Pago registrado correctamente.");
    }
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Ctas Ctes</h1>

          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            CLIENTES
          </span>

          <span className="text-xs font-semibold text-[#64748b]">
            {canManageCtasCtes
              ? "Saldos pendientes de Carritos y Files"
              : `Cuentas corrientes asignadas a ${currentProfile?.nombre || "tu usuario"}`}
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
                  Carritos y Files juntos
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Origen: {filters.origen} · Moneda: {filters.moneda} · Vendedor:{" "}
                {filters.vendedorId} · Sucursal: {filters.sucursalId}
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={loadCtasCtes}
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
              <div
                className={[
                  "mt-4 grid gap-3",
                  canManageCtasCtes
                    ? "lg:grid-cols-[180px_180px_220px_220px]"
                    : "lg:grid-cols-[180px_180px]"
                ].join(" ")}
              >
                <div>
                  <FieldLabel>Origen</FieldLabel>

                  <NosturSelect
                    value={filters.origen}
                    onChange={(value) => setFilter("origen", value as typeof filters.origen)}
                    options={ORIGEN_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Moneda</FieldLabel>

                  <NosturSelect
                    value={filters.moneda}
                    onChange={(value) => setFilter("moneda", value as typeof filters.moneda)}
                    options={MONEDA_OPTIONS}
                  />
                </div>

                {canManageCtasCtes ? (
                  <>
                    <div>
                      <FieldLabel>Vendedor</FieldLabel>

                      <NosturSelect
                        value={filters.vendedorId}
                        onChange={(value) => setFilter("vendedorId", value)}
                        options={vendedorOptions}
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
                  </>
                ) : null}
              </div>

              <div className="mt-3 flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                <Search size={15} className="shrink-0 text-[#64748b]" />

                <input
                  value={filters.search}
                  onChange={(event) => setFilter("search", event.target.value)}
                  placeholder="Buscar por pasajero, teléfono, carrito, file, vendedor, destino..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                />
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Cuentas" value={metrics.total} icon={Wallet} />

          <MetricCard
            label="ARS pendiente"
            value={formatMoneyAR(metrics.ars.pendiente, "ARS")}
            icon={CircleDollarSign}
            tone="blue"
          />

          <MetricCard
            label="USD pendiente"
            value={formatMoneyAR(metrics.usd.pendiente, "USD")}
            icon={CircleDollarSign}
            tone="green"
          />

          <MetricCard label="Carritos" value={metrics.carritos} icon={CheckCircle2} />
          <MetricCard label="Files" value={metrics.files} icon={CheckCircle2} />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">
                  Cuentas corrientes pendientes
                </h2>

                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${items.length} cuentas encontradas`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando cuentas corrientes...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay cuentas corrientes para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {items.map((item) => {
                  const selected =
                    selectedItem?.origen === item.origen &&
                    selectedItem?.origen_id === item.origen_id;

                  return (
                    <button
                      key={`${item.origen}-${item.origen_id}`}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={[
                        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[100px_1.25fr_1fr_1fr_1fr_1fr_74px]",
                        selected
                          ? "border-nostur-orange/50 bg-nostur-orange/10"
                          : "border-black/10 bg-[#f8fafc] hover:bg-white"
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <span
                          className={[
                            "inline-flex rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
                            item.origen === "CARRITO"
                              ? "border-nostur-orange/20 bg-nostur-orange/10 text-nostur-orange"
                              : "border-blue-200 bg-blue-50 text-blue-700"
                          ].join(" ")}
                        >
                          {getOrigenLabel(item.origen)}
                        </span>

                        <div className="mt-1 text-[10px] font-bold text-[#64748b]">
                          {item.moneda}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {item.pasajero || "Sin pasajero"}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          {item.telefono || "Sin teléfono"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-nostur-orange">
                          {item.numero_operacion}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          Venta {formatDate(item.fecha_venta)}
                        </div>

                        {item.origen === "CARRITO" ? (
                          <div className="truncate text-[11px] font-black text-amber-700">
                            Ingreso a gastos {formatDate(item.fecha_ingreso_gastos)}
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {item.vendedor || "Sin vendedor"}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          {item.sucursal || "Sin sucursal"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">
                          {formatMoneyAR(item.importe_total, item.moneda)}
                        </div>

                        <div className="text-[11px] text-green-700">
                          Pagado {formatMoneyAR(item.total_pagado, item.moneda)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-red-700">
                          {formatMoneyAR(item.saldo_cta_cte, item.moneda)}
                        </div>

                        <div className="text-[11px] text-[#64748b]">Saldo cliente</div>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          icon={Eye}
                          label="Detalle"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectItem(item);
                            setDetalleItem(item);
                          }}
                        />

                        <IconButton
                          icon={CircleDollarSign}
                          label="Registrar pago"
                          className="text-green-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectItem(item);
                            setPagoItem(item);
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
            {!selectedItem ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná una cuenta corriente.
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white">
                      {getInitials(selectedItem.pasajero || "C")}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-[#111827]">
                        {selectedItem.pasajero || "Sin pasajero"}
                      </h2>

                      <p className="truncate text-xs text-[#64748b]">
                        {getOrigenLabel(selectedItem.origen)} · {selectedItem.numero_operacion}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                    Parcial
                  </span>
                </div>

                <div className="grid gap-3 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Saldo cliente</FieldLabel>

                    <div className="text-lg font-black text-red-700">
                      {formatMoneyAR(selectedItem.saldo_cta_cte, selectedItem.moneda)}
                    </div>

                    <div className="mt-1 text-[#64748b]">
                      Total {formatMoneyAR(selectedItem.importe_total, selectedItem.moneda)} ·
                      Pagado {formatMoneyAR(selectedItem.total_pagado, selectedItem.moneda)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Datos</FieldLabel>

                    <div className="font-black text-[#111827]">
                      {selectedItem.vendedor || "Sin vendedor"}
                    </div>

                    <div className="text-[#64748b]">
                      {selectedItem.sucursal || "Sin sucursal"}
                    </div>

                    <div className="text-[#64748b]">
                      Venta: {formatDate(selectedItem.fecha_venta)}
                    </div>

                    {selectedItem.origen === "CARRITO" ? (
                      <div className="font-black text-amber-700">
                        Ingreso a gastos: {formatDate(selectedItem.fecha_ingreso_gastos)}
                      </div>
                    ) : null}

                    <div className="text-[#64748b]">
                      Destino: {selectedItem.destino || "—"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        selectItem(selectedItem);
                        setPagoItem(selectedItem);
                      }}
                      className="h-10 rounded-xl bg-green-600 px-4 text-xs font-black text-white shadow-sm hover:bg-green-700"
                    >
                      Registrar pago
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        selectItem(selectedItem);
                        setDetalleItem(selectedItem);
                      }}
                      className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Ver detalle
                    </button>
                  </div>

                  {selectedItem.origen === "CARRITO" ? (
                    <button
                      type="button"
                      onClick={() => window.open(getAbacoUrl(selectedItem.numero_operacion), "_blank")}
                      className="flex h-10 items-center justify-center gap-2 rounded-xl border border-nostur-orange/20 bg-nostur-orange/10 px-4 text-xs font-black text-nostur-orange hover:bg-nostur-orange hover:text-white"
                    >
                      <ExternalLink size={14} />
                      Abrir carrito en Ábaco
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {pagoItem ? (
        <PagoModal
          item={pagoItem}
          saving={saving}
          cajas={catalogos.cajas}
          onClose={() => setPagoItem(null)}
          onSave={handleSavePago}
        />
      ) : null}

      {detalleItem ? (
        <DetalleModal
          item={detalleItem}
          pagos={pagosDetalle}
          onClose={() => setDetalleItem(null)}
        />
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}