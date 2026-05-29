import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  BedDouble,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Copy,
  Eye,
  FileText,
  Hotel,
  Loader2,
  MoreVertical,
  PackageCheck,
  Paperclip,
  Pencil,
  Plane,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Star,
  Trash2,
  X
} from "lucide-react";
import {
  usePresupuestosV2Store,
  type CreateCombinacionDraft,
  type CreateHotelDraft,
  type CreatePresupuestoV2Draft,
  type CreateServicioDraft,
  type CreateVueloDraft,
    type PresupuestoAdjunto,
    
  type PresupuestoAdjuntoTipo,
  type PresupuestoCombinacion,
  type PresupuestoHotel,
  type PresupuestoMarca,
  type PresupuestoServicio,
  type PresupuestoServicioTipo,
  type PresupuestoV2,
  type PresupuestoV2Resumen,
  type PresupuestoVuelo,
  type PresupuestosV2Filters,
  type ProfileLite,
  type SucursalLite
} from "../../store/presupuestosV2Store";
import { formatMoneyAR } from "../../lib/formatters";

/* =========================================================
   TYPES
========================================================= */

type PresupuestosState = ReturnType<typeof usePresupuestosV2Store.getState>;

type SelectOption = {
  value: string;
  label: string;
};

type ModalMode =
  | "nuevo"
  | "caratula"
  | "vuelo"
  | "hotel"
  | "servicio"
  | "combinacion"
  | "preview"
  | "ia"
  | null;

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type DraftVuelo = CreateVueloDraft & {
  id?: string;
};

type DraftHotel = CreateHotelDraft & {
  id?: string;
};

type DraftServicio = CreateServicioDraft & {
  id?: string;
};

type DraftCombinacion = CreateCombinacionDraft & {
  id?: string;
};

type PassengerDraft = {
  adultos: number;
  menores: number;
  edadesMenores: string;
};

/* =========================================================
   OPTIONS
========================================================= */

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "TODOS", label: "Todos" },
  { value: "BORRADOR", label: "Borrador" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "ACEPTADO", label: "Aceptado" },
  { value: "RECHAZADO", label: "Rechazado" },
  { value: "VENCIDO", label: "Vencido" },
  { value: "CANCELADO", label: "Cancelado" }
];

const MARCA_OPTIONS: SelectOption[] = [
  { value: "TODAS", label: "Todas" },
  { value: "ALMUNDO", label: "ALMUNDO" },
  { value: "NOSSIX", label: "NOSSIX" }
];

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "USD", label: "USD" },
  { value: "ARS", label: "ARS" },
  { value: "EUR", label: "EUR" },
  { value: "BRL", label: "BRL" },
  { value: "UYU", label: "UYU" },
  { value: "OTRA", label: "Otra" }
];

const SERVICIO_TIPO_OPTIONS: SelectOption[] = [
  { value: "TRASLADO", label: "Traslado" },
  { value: "ASISTENCIA", label: "Asistencia" },
  { value: "EXCURSION", label: "Excursión" },
  { value: "EQUIPAJE", label: "Equipaje" },
  { value: "SEGURO", label: "Seguro" },
  { value: "CIRCUITO", label: "Circuito" },
  { value: "AUTO", label: "Auto" },
  { value: "OTRO", label: "Otro" }
];

const COMMON_DESTINOS: SelectOption[] = [
  { value: "Cancún", label: "Cancún" },
  { value: "Playa del Carmen", label: "Playa del Carmen" },
  { value: "Punta Cana", label: "Punta Cana" },
  { value: "Aruba", label: "Aruba" },
  { value: "Porto de Galinhas", label: "Porto de Galinhas" },
  { value: "Buzios", label: "Buzios" },
  { value: "Río de Janeiro", label: "Río de Janeiro" },
  { value: "Madrid", label: "Madrid" },
  { value: "Miami", label: "Miami" },
  { value: "Orlando", label: "Orlando" }
];

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}



function toNumberOrNull(value: string): number | null {
  const cleaned = value.replace(/\./g, "").replace(",", ".").trim();
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberToInput(value?: number | null): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ",");
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return `${first}${second}`.toUpperCase() || "PX";
}

function getEstadoLabel(value: string): string {
  const option = ESTADO_OPTIONS.find((item) => item.value === value);
  return option?.label || value;
}

function getEstadoClass(value: string): string {
  if (value === "ACEPTADO") return "border-green-200 bg-green-50 text-green-700";
  if (value === "ENVIADO") return "border-blue-200 bg-blue-50 text-blue-700";
  if (value === "RECHAZADO" || value === "CANCELADO") return "border-red-200 bg-red-50 text-red-700";
  if (value === "VENCIDO") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getDisplayName(presupuesto?: PresupuestoV2Resumen | PresupuestoV2 | null): string {
  if (!presupuesto) return "Sin presupuesto";

  return (
    presupuesto.cliente_nombre ||
    presupuesto.destino_principal ||
    presupuesto.titulo ||
    presupuesto.numero ||
    "Sin nombre"
  );
}

function todayIsoDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function addDaysIsoDate(baseDate: string, days: number): string {
  if (!baseDate) return "";

  const date = new Date(`${baseDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  date.setDate(date.getDate() + days);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function diffNights(fechaSalida?: string | null, fechaRegreso?: string | null): number | null {
  if (!fechaSalida || !fechaRegreso) return null;

  const salida = new Date(`${fechaSalida}T00:00:00`);
  const regreso = new Date(`${fechaRegreso}T00:00:00`);

  if (Number.isNaN(salida.getTime()) || Number.isNaN(regreso.getTime())) return null;

  const diff = regreso.getTime() - salida.getTime();
  if (diff <= 0) return null;

  return Math.round(diff / 86_400_000);
}

/* =========================================================
   UI BASE
========================================================= */

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
  disabled = false,
  inputMode = "text"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-[#4f7c90] disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  minHeight = 90,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ minHeight }}
      className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-[#4f7c90] disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function NosturSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={["relative", open ? "z-[160]" : "z-0"].join(" ")}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-left text-xs font-semibold text-[#111827] outline-none transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="absolute left-0 right-0 top-[42px] z-[170] max-h-60 overflow-auto rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
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
                      active ? "bg-[#4f7c90] text-white" : "text-[#334155] hover:bg-[#f1f5f9]"
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

function NosturDatePicker({
  value,
  onChange,
  min,
  placeholder = "Seleccionar fecha"
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = value || min || todayIsoDate();
    const date = new Date(`${base}T00:00:00`);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  });

  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const selectedLabel =
    selectedDate && !Number.isNaN(selectedDate.getTime())
      ? new Intl.DateTimeFormat("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }).format(selectedDate)
      : "";

  const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();

  const cells: Array<string | null> = [];
  for (let index = 0; index < firstWeekday; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const yyyy = monthCursor.getFullYear();
    const mm = String(monthCursor.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    cells.push(`${yyyy}-${mm}-${dd}`);
  }

  function moveMonth(delta: number) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function isDisabled(dayValue: string): boolean {
    if (!min) return false;
    return dayValue < min;
  }

  return (
    <div className={["relative", open ? "z-[170]" : "z-0"].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-left text-xs font-semibold text-[#111827] outline-none transition hover:bg-white"
      >
        <span className={selectedLabel ? "truncate" : "truncate text-[#94a3b8]"}>
          {selectedLabel || placeholder}
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

          <div className="absolute left-0 top-[42px] z-[180] w-[292px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f8fafc] text-[#64748b] hover:bg-[#eef2f7]"
              >
                ‹
              </button>

              <div className="text-xs font-black capitalize text-[#111827]">
                {new Intl.DateTimeFormat("es-AR", {
                  month: "long",
                  year: "numeric"
                }).format(monthCursor)}
              </div>

              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f8fafc] text-[#64748b] hover:bg-[#eef2f7]"
              >
                ›
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-[#94a3b8]">
              <span>D</span>
              <span>L</span>
              <span>M</span>
              <span>M</span>
              <span>J</span>
              <span>V</span>
              <span>S</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, index) => {
                if (!cell) return <div key={`empty-${index}`} className="h-8" />;

                const active = cell === value;
                const disabled = isDisabled(cell);
                const date = new Date(`${cell}T00:00:00`);
                const day = date.getDate();

                return (
                  <button
                    key={cell}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(cell);
                      setOpen(false);
                    }}
                    className={[
                      "flex h-8 items-center justify-center rounded-xl text-xs font-black transition",
                      active
                        ? "bg-[#4f7c90] text-white"
                        : disabled
                          ? "cursor-not-allowed text-[#cbd5e1]"
                          : "text-[#334155] hover:bg-[#f1f5f9]"
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const today = todayIsoDate();
                if (!min || today >= min) {
                  onChange(today);
                  setMonthCursor(new Date(`${today}T00:00:00`));
                  setOpen(false);
                }
              }}
              className="mt-3 h-8 w-full rounded-xl bg-[#f8fafc] text-[11px] font-black text-[#334155] hover:bg-[#eef2f7]"
            >
              Hoy
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DestinoAutocomplete({
  value,
  onChange,
  options = COMMON_DESTINOS,
  placeholder = "Buscar destino"
}: {
  value: string;
  onChange: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const query = value.trim().toLowerCase();
  const filtered = options
    .filter((option) => option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query))
    .slice(0, 10);

  return (
    <div className={["relative", open ? "z-[165]" : "z-0"].join(" ")}>
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-[#4f7c90]"
      />

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />

          <div className="absolute left-0 right-0 top-[42px] z-[175] max-h-64 overflow-auto rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
            {filtered.length === 0 ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="block w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-[#64748b] hover:bg-[#f8fafc]"
              >
                Usar “{value || "destino"}”
              </button>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-[#334155] hover:bg-[#f1f5f9]"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PassengerSelector({
  value,
  onChange
}: {
  value: PassengerDraft;
  onChange: (value: PassengerDraft) => void;
}) {
  const [open, setOpen] = useState(false);

  const total = value.adultos + value.menores;
  const label = `${total} pasajero${total === 1 ? "" : "s"} · ${value.adultos} adulto${value.adultos === 1 ? "" : "s"}${
    value.menores > 0 ? ` + ${value.menores} menor${value.menores === 1 ? "" : "es"}` : ""
  }`;

  function updateCounter(key: "adultos" | "menores", delta: number) {
    onChange({
      ...value,
      [key]: Math.max(key === "adultos" ? 1 : 0, Number(value[key] || 0) + delta)
    });
  }

  return (
    <div className={["relative", open ? "z-[170]" : "z-0"].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-left text-xs font-semibold text-[#111827] outline-none transition hover:bg-white"
      >
        <span className="truncate">{label}</span>
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

          <div className="absolute left-0 top-[42px] z-[180] w-[340px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
            <div className="grid gap-2">
              {[
                {
                  key: "adultos" as const,
                  title: "Adultos",
                  subtitle: "Desde 18 años"
                },
                {
                  key: "menores" as const,
                  title: "Menores",
                  subtitle: "De 2 a 17 años"
                }
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#f8fafc] px-3 py-2"
                >
                  <div>
                    <div className="text-xs font-black text-[#111827]">{item.title}</div>
                    <div className="text-[11px] font-semibold text-[#64748b]">{item.subtitle}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateCounter(item.key, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-black text-[#334155] hover:bg-[#eef2f7]"
                    >
                      −
                    </button>

                    <div className="w-7 text-center text-xs font-black text-[#111827]">
                      {value[item.key]}
                    </div>

                    <button
                      type="button"
                      onClick={() => updateCounter(item.key, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/10 bg-white text-sm font-black text-[#334155] hover:bg-[#eef2f7]"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {value.menores > 0 ? (
                <div>
                  <FieldLabel>Edades menores</FieldLabel>
                  <TextInput
                    value={value.edadesMenores}
                    onChange={(edadesMenores) => onChange({ ...value, edadesMenores })}
                    placeholder="Ej: 7 y 11 años"
                  />
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-1 h-9 rounded-xl bg-[#111827] text-xs font-black text-white hover:bg-black"
              >
                Listo
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function InlineError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
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
    <div className="fixed right-5 top-5 z-[280] w-[320px] rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-2xl">
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

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = "max-w-4xl"
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div
        className={[
          "max-h-[calc(100vh-56px)] w-full overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl",
          maxWidth
        ].join(" ")}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">{title}</h2>
            {subtitle ? <p className="text-xs font-semibold text-[#64748b]">{subtitle}</p> : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: "neutral" | "blue" | "green" | "red" | "amber" | "slate";
}) {
  const className = {
    neutral: "border-black/10 bg-white/75 text-[#334155]",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-green-200 bg-green-50 text-green-700",
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700"
  }[tone];

  return (
    <div className={["rounded-2xl border px-3 py-2 text-xs font-black shadow-sm", className].join(" ")}>
      <span className="mr-2 text-sm">{value}</span>
      {label}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={["rounded-xl border px-2 py-1 text-[10px] font-black uppercase", getEstadoClass(estado)].join(" ")}>
      {getEstadoLabel(estado)}
    </span>
  );
}

function SectionCard({
  title,
  icon,
  action,
  children
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#4f7c90]/10 text-[#31596a]">
            {icon}
          </div>

          <h3 className="text-sm font-black text-[#111827]">{title}</h3>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
      {text}
    </div>
  );
}

/* =========================================================
   ADJUNTOS / CAPTURAS
========================================================= */



function getAdjuntoTipoLabel(tipo: string): string {
  if (tipo === "CAPTURA") return "Captura";
  if (tipo === "IMAGEN") return "Imagen";
  if (tipo === "PDF") return "PDF";
  if (tipo === "DOCUMENTO") return "Documento";
  return "Archivo";
}

function getAdjuntoEntidadLabel(entidadTipo: string): string {
  if (entidadTipo === "VUELO") return "Vuelo";
  if (entidadTipo === "HOTEL") return "Hotel";
  if (entidadTipo === "SERVICIO") return "Servicio";
  if (entidadTipo === "COMBINACION") return "Opción";
  return "Presupuesto";
}

function AdjuntosCard({
  adjuntos,
  uploading,
  onUpload,
  onDelete,
onProcessIa
}: {
  adjuntos: PresupuestoAdjunto[];
  uploading: boolean;
  onUpload: (
    file: File,
    tipo: PresupuestoAdjuntoTipo,
    entidadTipo: "PRESUPUESTO" | "VUELO" | "HOTEL" | "SERVICIO" | "COMBINACION",
    tituloBase: string
  ) => void;
onDelete: (adjuntoId: string) => void;
onProcessIa: (adjunto: PresupuestoAdjunto) => void;
}) {
  const vueloInputRef = useRef<HTMLInputElement | null>(null);
  const hotelInputRef = useRef<HTMLInputElement | null>(null);
  const cotizacionInputRef = useRef<HTMLInputElement | null>(null);
  const archivoInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    tipo: PresupuestoAdjuntoTipo,
    entidadTipo: "PRESUPUESTO" | "VUELO" | "HOTEL" | "SERVICIO" | "COMBINACION",
    tituloBase: string
  ) {
    const file = event.target.files?.[0];

    if (file) {
      onUpload(file, tipo, entidadTipo, tituloBase);
    }

    event.target.value = "";
  }

  return (
    <SectionCard
      title="Capturas / Adjuntos"
      icon={<Paperclip size={16} />}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={vueloInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => handleFileChange(event, "CAPTURA", "VUELO", "Captura de vuelo")}
          />

          <input
            ref={hotelInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => handleFileChange(event, "CAPTURA", "HOTEL", "Captura de hotel")}
          />

          <input
            ref={cotizacionInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) =>
              handleFileChange(event, "CAPTURA", "PRESUPUESTO", "Cotización Almundo / operador")
            }
          />

          <input
            ref={archivoInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            className="hidden"
            onChange={(event) => handleFileChange(event, "DOCUMENTO", "PRESUPUESTO", "Archivo adjunto")}
          />

          <button
            type="button"
            disabled={uploading}
            onClick={() => vueloInputRef.current?.click()}
            className="flex h-8 items-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white hover:bg-[#416a7a] disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Plane size={13} />}
            Subir vuelo
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={() => hotelInputRef.current?.click()}
            className="flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <Hotel size={13} />
            Subir hotel
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={() => cotizacionInputRef.current?.click()}
            className="flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <FileText size={13} />
            Subir cotización
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={() => archivoInputRef.current?.click()}
            className="flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
          >
            <Paperclip size={13} />
            Archivo
          </button>
        </div>
      }
    >
      <div className="grid gap-2">
        {adjuntos.length === 0 ? (
          <EmptyState text="Todavía no hay capturas. Subí vuelos, hoteles, cotizaciones de Almundo u otros archivos del operador." />
        ) : (
          adjuntos.map((adjunto) => (
            <div
              key={adjunto.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3"
            >
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#4f7c90] shadow-sm">
                  {adjunto.entidad_tipo === "VUELO" ? (
                    <Plane size={17} />
                  ) : adjunto.entidad_tipo === "HOTEL" ? (
                    <Hotel size={17} />
                  ) : (
                    <Paperclip size={17} />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-xs font-black text-[#111827]">
                    {adjunto.titulo || adjunto.file_name || "Archivo"}
                  </div>

                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase text-[#64748b]">
                    <span>{getAdjuntoEntidadLabel(adjunto.entidad_tipo)}</span>
                    <span>·</span>
                    <span>{getAdjuntoTipoLabel(adjunto.tipo)}</span>
                    {adjunto.file_mime_type ? (
                      <>
                        <span>·</span>
                        <span>{adjunto.file_mime_type}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={adjunto.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f1f5f9]"
                >
                  <Eye size={13} />
                  Ver
                </a>

              <button
  type="button"
  onClick={() => onProcessIa(adjunto)}
  className="flex h-8 items-center gap-1.5 rounded-xl bg-[#4f7c90]/10 px-3 text-[11px] font-black text-[#31596a] hover:bg-[#4f7c90]/15"
>
  <Search size={13} />
  IA
</button>

                <button
                  type="button"
                  onClick={() => onDelete(adjunto.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm hover:bg-red-50"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}
/* =========================================================
   IA PARSER MODAL
========================================================= */

function IaParserModal({
  adjunto,
  saving,
  onClose,
  onCreateVuelo
}: {
  adjunto: PresupuestoAdjunto;
  saving: boolean;
  onClose: () => void;
  onCreateVuelo: (draft: DraftVuelo) => Promise<void>;
}) {
  const [processing, setProcessing] = useState(false);
  const [resultText, setResultText] = useState("");
  const [vueloDraft, setVueloDraft] = useState<DraftVuelo | null>(null);


 async function handleProcess() {
  setProcessing(true);
  setResultText("");

  try {
    const { data, error } = await supabase.functions.invoke("presupuestos-ai-parser", {
      body: {
        adjunto_id: adjunto.id,
        file_url: adjunto.file_url,
        entidad_tipo: adjunto.entidad_tipo,
        titulo: adjunto.titulo
      }
    });

    if (error) {
      setResultText(`No se pudo procesar con IA.\n\n${error.message}`);
      return;
    }

    if (!data) {
      setResultText("La función respondió vacía.");
      return;
    }

    if (data.error) {
      setResultText(
        `La función devolvió error:\n\n${data.error}\n\n${data.detail || ""}`
      );
      return;
    }

    const parsed = data?.parsed;

    setResultText(JSON.stringify(parsed, null, 2));

    if (parsed?.tipo === "VUELO" && parsed?.vuelo) {
      setVueloDraft({
        presupuesto_id: adjunto.presupuesto_id,
        titulo: parsed.vuelo.titulo || "Vuelo detectado por IA",
        aerolinea: parsed.vuelo.aerolinea || "",
        ruta_resumen: parsed.vuelo.ruta_resumen || "",
        ida_origen: parsed.vuelo.ida_origen || "",
        ida_destino: parsed.vuelo.ida_destino || "",
        ida_fecha: parsed.vuelo.ida_fecha || "",
        ida_hora_salida: parsed.vuelo.ida_hora_salida || "",
        ida_hora_llegada: parsed.vuelo.ida_hora_llegada || "",
        ida_escalas: parsed.vuelo.ida_escalas || "",
        ida_detalle: parsed.vuelo.ida_detalle || "",
        vuelta_origen: parsed.vuelo.vuelta_origen || "",
        vuelta_destino: parsed.vuelo.vuelta_destino || "",
        vuelta_fecha: parsed.vuelo.vuelta_fecha || "",
        vuelta_hora_salida: parsed.vuelo.vuelta_hora_salida || "",
        vuelta_hora_llegada: parsed.vuelo.vuelta_hora_llegada || "",
        vuelta_escalas: parsed.vuelo.vuelta_escalas || "",
        vuelta_detalle: parsed.vuelo.vuelta_detalle || "",
        equipaje: parsed.vuelo.equipaje || "",
        tarifa_familia: parsed.vuelo.tarifa_familia || "",
        condiciones: parsed.vuelo.condiciones || "",
        precio_total:
          typeof parsed.vuelo.precio_total === "number"
            ? parsed.vuelo.precio_total
            : null,
        moneda: parsed.vuelo.moneda || "USD",
        captura_url: adjunto.file_url,
        captura_path: adjunto.file_path,
        raw_text: JSON.stringify(parsed, null, 2)
      });
    }
  } catch (err) {
    setResultText(
      `Error inesperado al procesar con IA:\n\n${
        err instanceof Error ? err.message : "Error desconocido"
      }`
    );
  } finally {
    setProcessing(false);
  }
}

  async function handleCreateVuelo() {
    if (!vueloDraft) return;
    await onCreateVuelo(vueloDraft);
  }

  return (
    <ModalShell
      title="Procesar con IA"
      subtitle={adjunto.titulo || adjunto.file_name || "Archivo adjunto"}
      onClose={onClose}
      maxWidth="max-w-4xl"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <main className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Archivo</h3>

            <div className="rounded-2xl border border-black/10 bg-white p-3">
              <div className="mb-2 text-xs font-black text-[#111827]">
                {adjunto.titulo || adjunto.file_name || "Archivo"}
              </div>

              <div className="mb-3 text-[11px] font-semibold text-[#64748b]">
                Tipo: {getAdjuntoEntidadLabel(adjunto.entidad_tipo)} · {getAdjuntoTipoLabel(adjunto.tipo)}
              </div>

              {adjunto.file_mime_type?.startsWith("image/") ? (
                <img
                  src={adjunto.file_url}
                  alt={adjunto.titulo || "Captura"}
                  className="max-h-[420px] w-full rounded-2xl object-contain bg-[#f8fafc]"
                />
              ) : (
                <a
                  href={adjunto.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f1f5f9]"
                >
                  Abrir archivo
                </a>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Resultado IA</h3>

            {resultText ? (
              <div className="whitespace-pre-wrap rounded-2xl bg-[#f8fafc] p-4 text-xs font-semibold leading-5 text-[#334155]">
                {resultText}
              </div>
            ) : (
              <EmptyState text="Todavía no se procesó este archivo." />
            )}
          </section>
        </main>

        <aside className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#111827]">Acciones</h3>

          <div className="grid gap-2">
            <button
              type="button"
              disabled={processing}
              onClick={handleProcess}
              className="flex h-9 items-center justify-center gap-2 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white hover:bg-[#416a7a] disabled:opacity-50"
            >
              {processing ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Procesar con IA
            </button>

            {vueloDraft ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleCreateVuelo}
                className="flex h-9 items-center justify-center gap-2 rounded-xl bg-green-50 px-4 text-xs font-black text-green-700 ring-1 ring-green-200 hover:bg-green-100 disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plane size={14} />}
                Crear vuelo
              </button>
            ) : null}

            <a
              href={adjunto.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
            >
              <Eye size={14} />
              Ver original
            </a>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
            Este paso deja lista la pantalla. Después conectamos la IA real para leer la captura automáticamente.
          </div>
        </aside>
      </div>
    </ModalShell>
  );
}
/* =========================================================
   NUEVO PRESUPUESTO MODAL
========================================================= */

function NuevoPresupuestoModal({
  vendedores,
  sucursales,
  saving,
  onClose,
  onCreate
}: {
  vendedores: ProfileLite[];
  sucursales: SucursalLite[];
  saving: boolean;
  onClose: () => void;
  onCreate: (draft: CreatePresupuestoV2Draft) => Promise<void>;
}) {
  const today = todayIsoDate();

  const [localError, setLocalError] = useState<string | null>(null);

  const [draft, setDraft] = useState<CreatePresupuestoV2Draft>({
    cliente_nombre: "",
    cliente_telefono: "",
    cliente_email: "",
    destino_principal: "",
    fecha_salida: "",
    fecha_regreso: "",
    adultos: 2,
    menores: 0,
    vendedor_id: null,
    sucursal_id: null
  });

  const [passengers, setPassengers] = useState<PassengerDraft>({
    adultos: 2,
    menores: 0,
    edadesMenores: ""
  });

  const noches = diffNights(draft.fecha_salida, draft.fecha_regreso);

  const vendedorOptions: SelectOption[] = [
    { value: "sin_vendedor", label: "Sin vendedor" },
    ...vendedores.map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim() || vendedor.email || "Usuario"
    }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "sin_sucursal", label: "Sin sucursal" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  function setField<K extends keyof CreatePresupuestoV2Draft>(key: K, value: CreatePresupuestoV2Draft[K]) {
    setLocalError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function validate(): string | null {
    if (!String(draft.cliente_nombre || "").trim()) return "Ingresá el nombre del cliente.";
    if (!String(draft.destino_principal || "").trim()) return "Ingresá el destino principal.";
    if (!draft.fecha_salida) return "Seleccioná la fecha de salida.";
    if (!draft.fecha_regreso) return "Seleccioná la fecha de regreso.";
    if (draft.fecha_regreso <= draft.fecha_salida) return "La fecha de regreso debe ser posterior a la salida.";
    if (Number(passengers.adultos || 0) < 1) return "El presupuesto debe tener al menos 1 adulto.";

    return null;
  }

  async function handleCreate() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    await onCreate({
      ...draft,
      adultos: passengers.adultos,
      menores: passengers.menores,
      edades_menores: passengers.edadesMenores || null
    } as CreatePresupuestoV2Draft);
  }

  function handleSalidaChange(value: string) {
    setField("fecha_salida", value);

    if (!draft.fecha_regreso || draft.fecha_regreso <= value) {
      setField("fecha_regreso", addDaysIsoDate(value, 7));
    }
  }

  return (
    <ModalShell
      title="Nuevo presupuesto"
      subtitle="Carátula inicial del presupuesto ALMUNDO."
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <InlineError message={localError} onClose={() => setLocalError(null)} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <main className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#111827]">Datos principales</h3>
                <p className="text-[11px] font-semibold text-[#64748b]">
                  Esto arma la portada base. Después se cargan servicios, hoteles y combinaciones.
                </p>
              </div>

              <span className="rounded-xl border border-[#4f7c90]/20 bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black uppercase text-[#31596a]">
                ALMUNDO
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Cliente</FieldLabel>
                <TextInput
                  value={draft.cliente_nombre || ""}
                  onChange={(value) => setField("cliente_nombre", value)}
                  placeholder="Nombre del pasajero / familia"
                />
              </div>

              <div>
                <FieldLabel>Destino principal</FieldLabel>
                <DestinoAutocomplete
                  value={draft.destino_principal || ""}
                  onChange={(value) => setField("destino_principal", value)}
                  placeholder="Ej: Cancún, Río de Janeiro, Europa..."
                />
              </div>

              <div>
                <FieldLabel>Teléfono</FieldLabel>
                <TextInput
                  value={draft.cliente_telefono || ""}
                  onChange={(value) => setField("cliente_telefono", value)}
                  placeholder="+549..."
                  inputMode="tel"
                />
              </div>

              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  value={draft.cliente_email || ""}
                  onChange={(value) => setField("cliente_email", value)}
                  placeholder="cliente@email.com"
                  inputMode="email"
                />
              </div>

              <div>
                <FieldLabel>Fecha salida</FieldLabel>
                <NosturDatePicker
                  value={draft.fecha_salida || ""}
                  min={today}
                  onChange={handleSalidaChange}
                  placeholder="Seleccionar salida"
                />
              </div>

              <div>
                <FieldLabel>Fecha regreso</FieldLabel>
                <NosturDatePicker
                  value={draft.fecha_regreso || ""}
                  min={draft.fecha_salida || today}
                  onChange={(value) => setField("fecha_regreso", value)}
                  placeholder="Seleccionar regreso"
                />
              </div>

              <div>
                <FieldLabel>Pasajeros</FieldLabel>
                <PassengerSelector value={passengers} onChange={setPassengers} />
              </div>

              <div>
                <FieldLabel>Noches</FieldLabel>
                <div className="flex h-9 items-center rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-[#111827]">
                  {noches ? `${noches} noche${noches === 1 ? "" : "s"}` : "—"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Equipo responsable</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Vendedor</FieldLabel>
                <NosturSelect
                  value={draft.vendedor_id || "sin_vendedor"}
                  onChange={(value) => setField("vendedor_id", value === "sin_vendedor" ? null : value)}
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
            </div>
          </section>
        </main>

        <aside className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#111827]">Cómo se va a construir</h3>

          <div className="grid gap-2 text-xs font-semibold leading-5 text-[#64748b]">
            <div className="rounded-2xl bg-[#f8fafc] p-3">
              <strong className="text-[#111827]">1. Carátula:</strong> cliente, destino, fechas y pasajeros.
            </div>

            <div className="rounded-2xl bg-[#f8fafc] p-3">
              <strong className="text-[#111827]">2. Hoteles:</strong> se eligen de la base. Si no existen, se cargan una vez y quedan guardados.
            </div>

            <div className="rounded-2xl bg-[#f8fafc] p-3">
              <strong className="text-[#111827]">3. Servicios:</strong> traslados, asistencia, excursiones, adicionales y circuitos.
            </div>

            <div className="rounded-2xl bg-[#f8fafc] p-3">
              <strong className="text-[#111827]">4. Combinaciones:</strong> opción 1, 2, 3 con precio final del paquete.
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
              Vuelos manuales no van como carga pesada. La idea es resolverlos con captura/adjunto o parser.
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
          onClick={handleCreate}
          className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Crear presupuesto
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   LIST ITEM
========================================================= */

function PresupuestoListItem({
  presupuesto,
  selected,
  onClick
}: {
  presupuesto: PresupuestoV2Resumen;
  selected: boolean;
  onClick: () => void;
}) {
  const displayName = getDisplayName(presupuesto);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full border-b border-black/5 px-3 py-3 text-left transition",
        selected ? "bg-[#4f7c90]/12" : "bg-white/70 hover:bg-white"
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black",
            selected ? "bg-[#4f7c90] text-white" : "bg-[#e2e8f0] text-[#334155]"
          ].join(" ")}
        >
          {getInitials(displayName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-black text-[#111827]">{displayName}</div>
            <div className="shrink-0 text-[10px] font-bold text-[#94a3b8]">
              {formatDateTime(presupuesto.updated_at)}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[10px] font-black uppercase text-[#64748b]">
            <span>{presupuesto.numero || "Sin número"}</span>
            <span>·</span>
            <span>{presupuesto.marca}</span>
            <span>·</span>
            <span className="truncate">{presupuesto.destino_principal || "Sin destino"}</span>
          </div>

          <div className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-[#475569]">
            {formatDate(presupuesto.fecha_salida)} al {formatDate(presupuesto.fecha_regreso)} ·{" "}
            {presupuesto.adultos} adulto{presupuesto.adultos === 1 ? "" : "s"}
            {presupuesto.menores > 0
              ? ` + ${presupuesto.menores} menor${presupuesto.menores === 1 ? "" : "es"}`
              : ""}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <EstadoBadge estado={presupuesto.estado} />

            {presupuesto.precio_desde !== null ? (
              <span className="rounded-xl border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">
                Desde {formatMoneyAR(presupuesto.precio_desde, presupuesto.moneda_principal)}
              </span>
            ) : null}

            {presupuesto.cantidad_combinaciones > 0 ? (
              <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black text-[#475569]">
                {presupuesto.cantidad_combinaciones} opción{presupuesto.cantidad_combinaciones === 1 ? "" : "es"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   VUELO CARD
========================================================= */

function VueloCard({
  vuelo,
  onEdit,
  onDelete,
  onPrincipal
}: {
  vuelo: PresupuestoVuelo;
  onEdit: () => void;
  onDelete: () => void;
  onPrincipal: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-xs font-black text-[#111827]">{vuelo.titulo}</h4>

            {vuelo.es_principal ? (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                Principal
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[11px] font-semibold text-[#64748b]">
            {vuelo.aerolinea || "Aerolínea sin cargar"} · {vuelo.ruta_resumen || "Ruta sin resumen"}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onPrincipal}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm hover:bg-amber-50"
            title="Marcar principal"
          >
            <Star size={14} />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#64748b] shadow-sm hover:bg-[#f1f5f9]"
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm hover:bg-red-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid gap-2 text-[11px] font-semibold text-[#475569] md:grid-cols-2">
        <div className="rounded-xl bg-white p-2">
          <strong>Ida:</strong> {formatDate(vuelo.ida_fecha)} · {vuelo.ida_origen || "—"} →{" "}
          {vuelo.ida_destino || "—"}
        </div>

        <div className="rounded-xl bg-white p-2">
          <strong>Vuelta:</strong> {formatDate(vuelo.vuelta_fecha)} · {vuelo.vuelta_origen || "—"} →{" "}
          {vuelo.vuelta_destino || "—"}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
        <span className="text-[#64748b]">{vuelo.equipaje || "Equipaje no especificado"}</span>
        <span className="text-[#111827]">{formatMoneyAR(vuelo.precio_total, vuelo.moneda)}</span>
      </div>
    </div>
  );
}

/* =========================================================
   HOTEL CARD
========================================================= */

function HotelCard({
  hotel,
  onEdit,
  onDelete,
  onPrincipal
}: {
  hotel: PresupuestoHotel;
  onEdit: () => void;
  onDelete: () => void;
  onPrincipal: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-xs font-black text-[#111827]">{hotel.nombre}</h4>

            {hotel.es_principal ? (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                Principal
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[11px] font-semibold text-[#64748b]">
            {hotel.destino || "Destino sin cargar"} · {hotel.zona || "Zona no especificada"} ·{" "}
            {hotel.categoria || "Sin categoría"}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onPrincipal}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm hover:bg-amber-50"
            title="Marcar principal"
          >
            <Star size={14} />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#64748b] shadow-sm hover:bg-[#f1f5f9]"
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm hover:bg-red-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid gap-2 text-[11px] font-semibold text-[#475569] md:grid-cols-3">
        <div className="rounded-xl bg-white p-2">
          <strong>Check-in:</strong> {formatDate(hotel.check_in)}
        </div>

        <div className="rounded-xl bg-white p-2">
          <strong>Check-out:</strong> {formatDate(hotel.check_out)}
        </div>

        <div className="rounded-xl bg-white p-2">
          <strong>Noches:</strong> {hotel.noches ?? "—"}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
        <span className="text-[#64748b]">
          {hotel.regimen || "Régimen no especificado"} · {hotel.habitacion || "Habitación sin cargar"}
        </span>
        <span className="text-[#111827]">{formatMoneyAR(hotel.precio_total, hotel.moneda)}</span>
      </div>
    </div>
  );
}

/* =========================================================
   SERVICIO CARD
========================================================= */

function ServicioCard({
  servicio,
  onEdit,
  onDelete
}: {
  servicio: PresupuestoServicio;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-xs font-black text-[#111827]">{servicio.nombre}</h4>
            <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black text-[#64748b]">
              {servicio.tipo}
            </span>

            {servicio.opcional ? (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                Opcional
              </span>
            ) : null}

            {servicio.incluido ? (
              <span className="rounded-xl border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">
                Incluido
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[11px] font-semibold text-[#64748b]">
            {servicio.descripcion || "Sin descripción"}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#64748b] shadow-sm hover:bg-[#f1f5f9]"
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm hover:bg-red-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2 text-right text-[11px] font-black text-[#111827]">
        {servicio.incluido ? "Incluido en el paquete" : formatMoneyAR(servicio.precio_total, servicio.moneda)}
      </div>
    </div>
  );
}

/* =========================================================
   COMBINACION CARD
========================================================= */

function CombinacionCard({
  combinacion,
  vuelo,
  hotel,
  onEdit,
  onDelete,
  onRecommended
}: {
  combinacion: PresupuestoCombinacion;
  vuelo?: PresupuestoVuelo | null;
  hotel?: PresupuestoHotel | null;
  onEdit: () => void;
  onDelete: () => void;
  onRecommended: () => void;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-3",
        combinacion.destacada
          ? "border-[#4f7c90]/30 bg-[#4f7c90]/10"
          : "border-black/10 bg-[#f8fafc]"
      ].join(" ")}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-xs font-black text-[#111827]">{combinacion.nombre}</h4>

            {combinacion.destacada ? (
              <span className="rounded-xl border border-[#4f7c90]/20 bg-white px-2 py-1 text-[10px] font-black text-[#31596a]">
                Recomendada
              </span>
            ) : null}

            {combinacion.etiqueta ? (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                {combinacion.etiqueta}
              </span>
            ) : null}
          </div>

          <div className="mt-1 text-[11px] font-semibold text-[#64748b]">
            {combinacion.subtitulo || "Combinación comercial"}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onRecommended}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm hover:bg-amber-50"
            title="Marcar recomendada"
          >
            <Star size={14} />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#64748b] shadow-sm hover:bg-[#f1f5f9]"
            title="Editar"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm hover:bg-red-50"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid gap-2 text-[11px] font-semibold text-[#475569] md:grid-cols-2">
        <div className="rounded-xl bg-white p-2">
          <strong>Vuelo:</strong> {vuelo?.titulo || "Sin vuelo vinculado"}
        </div>

        <div className="rounded-xl bg-white p-2">
          <strong>Hotel:</strong> {hotel?.nombre || "Sin hotel vinculado"}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold text-[#64748b]">
          {combinacion.forma_pago_resumen || "Forma de pago sin cargar"}
        </div>

        <div className="text-base font-black text-[#111827]">
          {formatMoneyAR(combinacion.precio_total, combinacion.moneda)}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CARATULA MODAL
========================================================= */

function CaratulaModal({
  presupuesto,
  vendedores,
  sucursales,
  saving,
  onClose,
  onSave
}: {
  presupuesto: PresupuestoV2;
  vendedores: ProfileLite[];
  sucursales: SucursalLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: Partial<PresupuestoV2>) => Promise<void>;
}) {
  const today = todayIsoDate();

  const [draft, setDraft] = useState<Partial<PresupuestoV2>>({
    cliente_nombre: presupuesto.cliente_nombre || "",
    cliente_telefono: presupuesto.cliente_telefono || "",
    cliente_email: presupuesto.cliente_email || "",
    titulo: presupuesto.titulo || "",
    destino_principal: presupuesto.destino_principal || "",
    destino_detalle: presupuesto.destino_detalle || "",
    origen_ciudad: presupuesto.origen_ciudad || "",
    origen_iata: presupuesto.origen_iata || "",
    destino_ciudad: presupuesto.destino_ciudad || "",
    destino_iata: presupuesto.destino_iata || "",
    fecha_salida: presupuesto.fecha_salida || "",
    fecha_regreso: presupuesto.fecha_regreso || "",
    adultos: presupuesto.adultos,
    menores: presupuesto.menores,
    edades_menores: presupuesto.edades_menores || "",
    vendedor_id: presupuesto.vendedor_id,
    sucursal_id: presupuesto.sucursal_id,
    validez_hasta: presupuesto.validez_hasta || "",
    moneda_principal: presupuesto.moneda_principal,
    marca: presupuesto.marca,
    intro_comercial: presupuesto.intro_comercial || "",
    condiciones_generales: presupuesto.condiciones_generales || "",
    observaciones_internas: presupuesto.observaciones_internas || ""
  });

  const [passengers, setPassengers] = useState<PassengerDraft>({
    adultos: Number(presupuesto.adultos || 1),
    menores: Number(presupuesto.menores || 0),
    edadesMenores: presupuesto.edades_menores || ""
  });

  const noches = diffNights(String(draft.fecha_salida || ""), String(draft.fecha_regreso || ""));

  const vendedorOptions: SelectOption[] = [
    { value: "sin_vendedor", label: "Sin vendedor" },
    ...vendedores.map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim() || vendedor.email || "Usuario"
    }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "sin_sucursal", label: "Sin sucursal" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  function setField<K extends keyof PresupuestoV2>(key: K, value: PresupuestoV2[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSalidaChange(value: string) {
    setField("fecha_salida", value as PresupuestoV2["fecha_salida"]);

    const currentRegreso = String(draft.fecha_regreso || "");

    if (!currentRegreso || currentRegreso <= value) {
      setField("fecha_regreso", addDaysIsoDate(value, 7) as PresupuestoV2["fecha_regreso"]);
    }
  }

  async function handleSave() {
    await onSave({
      ...draft,
      adultos: passengers.adultos,
      menores: passengers.menores,
      edades_menores: passengers.edadesMenores || null
    });
  }

  return (
    <ModalShell
      title="Editar carátula"
      subtitle={`${presupuesto.numero || "Presupuesto"} · datos generales para la presentación al pasajero.`}
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <main className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Datos del cliente y viaje</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Cliente</FieldLabel>
                <TextInput
                  value={String(draft.cliente_nombre || "")}
                  onChange={(value) => setField("cliente_nombre", value)}
                  placeholder="Nombre del pasajero / familia"
                />
              </div>

              <div>
                <FieldLabel>Título comercial</FieldLabel>
                <TextInput
                  value={String(draft.titulo || "")}
                  onChange={(value) => setField("titulo", value)}
                  placeholder="Ej: Vacaciones en familia"
                />
              </div>

              <div>
                <FieldLabel>Teléfono</FieldLabel>
                <TextInput
                  value={String(draft.cliente_telefono || "")}
                  onChange={(value) => setField("cliente_telefono", value)}
                  placeholder="+549..."
                  inputMode="tel"
                />
              </div>

              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  value={String(draft.cliente_email || "")}
                  onChange={(value) => setField("cliente_email", value)}
                  placeholder="cliente@email.com"
                  inputMode="email"
                />
              </div>

              <div>
                <FieldLabel>Destino principal</FieldLabel>
                <DestinoAutocomplete
                  value={String(draft.destino_principal || "")}
                  onChange={(value) => setField("destino_principal", value)}
                  placeholder="Ej: Cancún, Río de Janeiro, Europa..."
                />
              </div>

              <div>
                <FieldLabel>Detalle destino</FieldLabel>
                <TextInput
                  value={String(draft.destino_detalle || "")}
                  onChange={(value) => setField("destino_detalle", value)}
                  placeholder="Ej: Cancún + Playa del Carmen"
                />
              </div>

              <div>
                <FieldLabel>Fecha salida</FieldLabel>
                <NosturDatePicker
                  value={String(draft.fecha_salida || "")}
                  min={today}
                  onChange={handleSalidaChange}
                  placeholder="Seleccionar salida"
                />
              </div>

              <div>
                <FieldLabel>Fecha regreso</FieldLabel>
                <NosturDatePicker
                  value={String(draft.fecha_regreso || "")}
                  min={String(draft.fecha_salida || today)}
                  onChange={(value) => setField("fecha_regreso", value)}
                  placeholder="Seleccionar regreso"
                />
              </div>

              <div>
                <FieldLabel>Pasajeros</FieldLabel>
                <PassengerSelector value={passengers} onChange={setPassengers} />
              </div>

              <div>
                <FieldLabel>Noches</FieldLabel>
                <div className="flex h-9 items-center rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-[#111827]">
                  {noches ? `${noches} noche${noches === 1 ? "" : "s"}` : "—"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Texto comercial</h3>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Introducción</FieldLabel>
                <TextArea
                  value={String(draft.intro_comercial || "")}
                  onChange={(value) => setField("intro_comercial", value)}
                  placeholder="Texto inicial para el pasajero..."
                  minHeight={100}
                />
              </div>

              <div>
                <FieldLabel>Condiciones generales</FieldLabel>
                <TextArea
                  value={String(draft.condiciones_generales || "")}
                  onChange={(value) => setField("condiciones_generales", value)}
                  placeholder="Condiciones del presupuesto, validez, disponibilidad, tarifas sujetas a cambio..."
                  minHeight={110}
                />
              </div>

              <div>
                <FieldLabel>Observaciones internas</FieldLabel>
                <TextArea
                  value={String(draft.observaciones_internas || "")}
                  onChange={(value) => setField("observaciones_internas", value)}
                  placeholder="Solo equipo interno..."
                  minHeight={80}
                />
              </div>
            </div>
          </section>
        </main>

        <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
          <h3 className="mb-3 text-sm font-black text-[#111827]">Configuración</h3>

          <div className="grid gap-3">
            <div>
              <FieldLabel>Marca</FieldLabel>
              <NosturSelect
                value={String(draft.marca || "ALMUNDO")}
                onChange={(value) => setField("marca", value as PresupuestoMarca)}
                options={[
                  { value: "ALMUNDO", label: "ALMUNDO" },
                  { value: "NOSSIX", label: "NOSSIX" }
                ]}
              />
            </div>

            <div>
              <FieldLabel>Moneda principal</FieldLabel>
              <NosturSelect
                value={String(draft.moneda_principal || "USD")}
                onChange={(value) =>
                  setField("moneda_principal", value as PresupuestoV2["moneda_principal"])
                }
                options={MONEDA_OPTIONS}
              />
            </div>

            <div>
              <FieldLabel>Vendedor</FieldLabel>
              <NosturSelect
                value={draft.vendedor_id || "sin_vendedor"}
                onChange={(value) => setField("vendedor_id", value === "sin_vendedor" ? null : value)}
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

            <div>
              <FieldLabel>Origen ciudad</FieldLabel>
              <TextInput
                value={String(draft.origen_ciudad || "")}
                onChange={(value) => setField("origen_ciudad", value)}
                placeholder="Córdoba"
              />
            </div>

            <div>
              <FieldLabel>Origen IATA</FieldLabel>
              <TextInput
                value={String(draft.origen_iata || "")}
                onChange={(value) => setField("origen_iata", value.toUpperCase())}
                placeholder="COR"
              />
            </div>

            <div>
              <FieldLabel>Destino ciudad</FieldLabel>
              <TextInput
                value={String(draft.destino_ciudad || "")}
                onChange={(value) => setField("destino_ciudad", value)}
                placeholder="Cancún"
              />
            </div>

            <div>
              <FieldLabel>Destino IATA</FieldLabel>
              <TextInput
                value={String(draft.destino_iata || "")}
                onChange={(value) => setField("destino_iata", value.toUpperCase())}
                placeholder="CUN"
              />
            </div>

            <div>
              <FieldLabel>Validez hasta</FieldLabel>
              <TextInput
                value={String(draft.validez_hasta || "")}
                onChange={(value) => setField("validez_hasta", value)}
                placeholder="YYYY-MM-DD HH:mm"
              />
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
          className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar carátula
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   VUELO MODAL
========================================================= */

function VueloModal({
  presupuestoId,
  vuelo,
  saving,
  onClose,
  onSave
}: {
  presupuestoId: string;
  vuelo: PresupuestoVuelo | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: DraftVuelo) => Promise<void>;
}) {
  const today = todayIsoDate();

  const [draft, setDraft] = useState<DraftVuelo>({
    id: vuelo?.id,
    presupuesto_id: presupuestoId,
    titulo: vuelo?.titulo || "Opción de vuelo",
    aerolinea: vuelo?.aerolinea || "",
    ruta_resumen: vuelo?.ruta_resumen || "",
    ida_origen: vuelo?.ida_origen || "",
    ida_destino: vuelo?.ida_destino || "",
    ida_fecha: vuelo?.ida_fecha || "",
    ida_hora_salida: vuelo?.ida_hora_salida || "",
    ida_hora_llegada: vuelo?.ida_hora_llegada || "",
    ida_escalas: vuelo?.ida_escalas || "",
    ida_detalle: vuelo?.ida_detalle || "",
    vuelta_origen: vuelo?.vuelta_origen || "",
    vuelta_destino: vuelo?.vuelta_destino || "",
    vuelta_fecha: vuelo?.vuelta_fecha || "",
    vuelta_hora_salida: vuelo?.vuelta_hora_salida || "",
    vuelta_hora_llegada: vuelo?.vuelta_hora_llegada || "",
    vuelta_escalas: vuelo?.vuelta_escalas || "",
    vuelta_detalle: vuelo?.vuelta_detalle || "",
    equipaje: vuelo?.equipaje || "",
    tarifa_familia: vuelo?.tarifa_familia || "",
    condiciones: vuelo?.condiciones || "",
    precio_total: vuelo?.precio_total || null,
    moneda: vuelo?.moneda || "USD"
  });

  function setField<K extends keyof DraftVuelo>(key: K, value: DraftVuelo[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    await onSave(draft);
  }

  return (
    <ModalShell
      title={vuelo ? "Editar vuelo" : "Agregar vuelo"}
      subtitle="Carga manual de respaldo. La carga principal de vuelos será por captura / parser."
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <main className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Resumen del vuelo</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Título</FieldLabel>
                <TextInput
                  value={String(draft.titulo || "")}
                  onChange={(value) => setField("titulo", value)}
                  placeholder="Ej: Vuelo Copa vía Panamá"
                />
              </div>

              <div>
                <FieldLabel>Aerolínea</FieldLabel>
                <TextInput
                  value={String(draft.aerolinea || "")}
                  onChange={(value) => setField("aerolinea", value)}
                  placeholder="Ej: Copa Airlines"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Ruta resumen</FieldLabel>
                <TextInput
                  value={String(draft.ruta_resumen || "")}
                  onChange={(value) => setField("ruta_resumen", value)}
                  placeholder="Ej: Córdoba / Panamá / Cancún / Panamá / Córdoba"
                />
              </div>

              <div>
                <FieldLabel>Equipaje</FieldLabel>
                <TextInput
                  value={String(draft.equipaje || "")}
                  onChange={(value) => setField("equipaje", value)}
                  placeholder="Ej: Carry on + equipaje en bodega"
                />
              </div>

              <div>
                <FieldLabel>Tarifa / familia</FieldLabel>
                <TextInput
                  value={String(draft.tarifa_familia || "")}
                  onChange={(value) => setField("tarifa_familia", value)}
                  placeholder="Ej: Economy Basic"
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Tramo de ida</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Origen</FieldLabel>
                <TextInput
                  value={String(draft.ida_origen || "")}
                  onChange={(value) => setField("ida_origen", value)}
                  placeholder="COR"
                />
              </div>

              <div>
                <FieldLabel>Destino</FieldLabel>
                <TextInput
                  value={String(draft.ida_destino || "")}
                  onChange={(value) => setField("ida_destino", value)}
                  placeholder="CUN"
                />
              </div>

              <div>
                <FieldLabel>Fecha ida</FieldLabel>
                <NosturDatePicker
                  value={String(draft.ida_fecha || "")}
                  min={today}
                  onChange={(value) => {
                    setField("ida_fecha", value);

                    if (!draft.vuelta_fecha || String(draft.vuelta_fecha) <= value) {
                      setField("vuelta_fecha", addDaysIsoDate(value, 7));
                    }
                  }}
                  placeholder="Seleccionar fecha"
                />
              </div>

              <div>
                <FieldLabel>Escalas</FieldLabel>
                <TextInput
                  value={String(draft.ida_escalas || "")}
                  onChange={(value) => setField("ida_escalas", value)}
                  placeholder="Ej: 1 escala en Panamá"
                />
              </div>

              <div>
                <FieldLabel>Hora salida</FieldLabel>
                <TextInput
                  value={String(draft.ida_hora_salida || "")}
                  onChange={(value) => setField("ida_hora_salida", value)}
                  placeholder="HH:mm"
                />
              </div>

              <div>
                <FieldLabel>Hora llegada</FieldLabel>
                <TextInput
                  value={String(draft.ida_hora_llegada || "")}
                  onChange={(value) => setField("ida_hora_llegada", value)}
                  placeholder="HH:mm"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Detalle ida</FieldLabel>
                <TextArea
                  value={String(draft.ida_detalle || "")}
                  onChange={(value) => setField("ida_detalle", value)}
                  placeholder="Detalle opcional del tramo de ida..."
                  minHeight={80}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Tramo de regreso</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Origen</FieldLabel>
                <TextInput
                  value={String(draft.vuelta_origen || "")}
                  onChange={(value) => setField("vuelta_origen", value)}
                  placeholder="CUN"
                />
              </div>

              <div>
                <FieldLabel>Destino</FieldLabel>
                <TextInput
                  value={String(draft.vuelta_destino || "")}
                  onChange={(value) => setField("vuelta_destino", value)}
                  placeholder="COR"
                />
              </div>

              <div>
                <FieldLabel>Fecha regreso</FieldLabel>
                <NosturDatePicker
                  value={String(draft.vuelta_fecha || "")}
                  min={String(draft.ida_fecha || today)}
                  onChange={(value) => setField("vuelta_fecha", value)}
                  placeholder="Seleccionar fecha"
                />
              </div>

              <div>
                <FieldLabel>Escalas</FieldLabel>
                <TextInput
                  value={String(draft.vuelta_escalas || "")}
                  onChange={(value) => setField("vuelta_escalas", value)}
                  placeholder="Ej: 1 escala en Panamá"
                />
              </div>

              <div>
                <FieldLabel>Hora salida</FieldLabel>
                <TextInput
                  value={String(draft.vuelta_hora_salida || "")}
                  onChange={(value) => setField("vuelta_hora_salida", value)}
                  placeholder="HH:mm"
                />
              </div>

              <div>
                <FieldLabel>Hora llegada</FieldLabel>
                <TextInput
                  value={String(draft.vuelta_hora_llegada || "")}
                  onChange={(value) => setField("vuelta_hora_llegada", value)}
                  placeholder="HH:mm"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Detalle vuelta</FieldLabel>
                <TextArea
                  value={String(draft.vuelta_detalle || "")}
                  onChange={(value) => setField("vuelta_detalle", value)}
                  placeholder="Detalle opcional del tramo de regreso..."
                  minHeight={80}
                />
              </div>
            </div>
          </section>
        </main>

        <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
          <h3 className="mb-3 text-sm font-black text-[#111827]">Precio y condiciones</h3>

          <div className="grid gap-3">
            <div>
              <FieldLabel>Precio total</FieldLabel>
              <TextInput
                value={numberToInput(draft.precio_total)}
                onChange={(value) => setField("precio_total", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>

            <div>
              <FieldLabel>Moneda</FieldLabel>
              <NosturSelect
                value={String(draft.moneda || "USD")}
                onChange={(value) => setField("moneda", value)}
                options={MONEDA_OPTIONS}
              />
            </div>

            <div>
              <FieldLabel>Condiciones</FieldLabel>
              <TextArea
                value={String(draft.condiciones || "")}
                onChange={(value) => setField("condiciones", value)}
                placeholder="Condiciones de tarifa, cambios, devolución, emisión..."
                minHeight={160}
              />
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
              Este formulario queda como respaldo. Para la operación diaria, la idea es cargar vuelos por captura o parser para evitar trabajo manual.
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
          className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar vuelo
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   HOTEL MODAL
========================================================= */

function HotelModal({
  presupuestoId,
  hotel,
  saving,
  onClose,
  onSave
}: {
  presupuestoId: string;
  hotel: PresupuestoHotel | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: DraftHotel) => Promise<void>;
}) {
  const today = todayIsoDate();

  const [draft, setDraft] = useState<DraftHotel>({
    id: hotel?.id,
    presupuesto_id: presupuestoId,
    titulo: hotel?.titulo || "Opción de hotel",
    nombre: hotel?.nombre || "",
    destino: hotel?.destino || "",
    zona: hotel?.zona || "",
    categoria: hotel?.categoria || "",
    regimen: hotel?.regimen || "",
    habitacion: hotel?.habitacion || "",
    ocupacion: hotel?.ocupacion || "",
    check_in: hotel?.check_in || "",
    check_out: hotel?.check_out || "",
    descripcion: hotel?.descripcion || "",
    beneficios: hotel?.beneficios || "",
    condiciones: hotel?.condiciones || "",
    politica_cancelacion: hotel?.politica_cancelacion || "",
    imagen_url: hotel?.imagen_url || "",
    precio_total: hotel?.precio_total || null,
    moneda: hotel?.moneda || "USD"
  });

  const noches = diffNights(String(draft.check_in || ""), String(draft.check_out || ""));

  function setField<K extends keyof DraftHotel>(key: K, value: DraftHotel[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleCheckInChange(value: string) {
    setField("check_in", value);

    if (!draft.check_out || String(draft.check_out) <= value) {
      setField("check_out", addDaysIsoDate(value, 7));
    }
  }

  async function handleSave() {
    await onSave(draft);
  }

  return (
    <ModalShell
      title={hotel ? "Editar hotel" : "Agregar hotel"}
      subtitle="Usar hotelería manual solo si el hotel no existe todavía en la base de Configuración."
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <main className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Datos del hotel</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Título de la opción</FieldLabel>
                <TextInput
                  value={String(draft.titulo || "")}
                  onChange={(value) => setField("titulo", value)}
                  placeholder="Ej: Hotel recomendado"
                />
              </div>

              <div>
                <FieldLabel>Nombre del hotel</FieldLabel>
                <TextInput
                  value={String(draft.nombre || "")}
                  onChange={(value) => setField("nombre", value)}
                  placeholder="Nombre comercial del hotel"
                />
              </div>

              <div>
                <FieldLabel>Destino</FieldLabel>
                <DestinoAutocomplete
                  value={String(draft.destino || "")}
                  onChange={(value) => setField("destino", value)}
                  placeholder="Ej: Cancún"
                />
              </div>

              <div>
                <FieldLabel>Zona</FieldLabel>
                <TextInput
                  value={String(draft.zona || "")}
                  onChange={(value) => setField("zona", value)}
                  placeholder="Ej: Zona Hotelera"
                />
              </div>

              <div>
                <FieldLabel>Categoría</FieldLabel>
                <TextInput
                  value={String(draft.categoria || "")}
                  onChange={(value) => setField("categoria", value)}
                  placeholder="Ej: 4 estrellas"
                />
              </div>

              <div>
                <FieldLabel>Régimen</FieldLabel>
                <TextInput
                  value={String(draft.regimen || "")}
                  onChange={(value) => setField("regimen", value)}
                  placeholder="Ej: All inclusive"
                />
              </div>

              <div>
                <FieldLabel>Habitación</FieldLabel>
                <TextInput
                  value={String(draft.habitacion || "")}
                  onChange={(value) => setField("habitacion", value)}
                  placeholder="Ej: Standard doble"
                />
              </div>

              <div>
                <FieldLabel>Ocupación</FieldLabel>
                <TextInput
                  value={String(draft.ocupacion || "")}
                  onChange={(value) => setField("ocupacion", value)}
                  placeholder="Ej: 2 adultos + 1 menor"
                />
              </div>

              <div>
                <FieldLabel>Check-in</FieldLabel>
                <NosturDatePicker
                  value={String(draft.check_in || "")}
                  min={today}
                  onChange={handleCheckInChange}
                  placeholder="Seleccionar check-in"
                />
              </div>

              <div>
                <FieldLabel>Check-out</FieldLabel>
                <NosturDatePicker
                  value={String(draft.check_out || "")}
                  min={String(draft.check_in || today)}
                  onChange={(value) => setField("check_out", value)}
                  placeholder="Seleccionar check-out"
                />
              </div>

              <div>
                <FieldLabel>Noches</FieldLabel>
                <div className="flex h-9 items-center rounded-xl border border-black/10 bg-white px-3 text-xs font-black text-[#111827]">
                  {noches ? `${noches} noche${noches === 1 ? "" : "s"}` : "—"}
                </div>
              </div>

              <div>
                <FieldLabel>Imagen URL</FieldLabel>
                <TextInput
                  value={String(draft.imagen_url || "")}
                  onChange={(value) => setField("imagen_url", value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Contenido para el pasajero</h3>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Descripción</FieldLabel>
                <TextArea
                  value={String(draft.descripcion || "")}
                  onChange={(value) => setField("descripcion", value)}
                  placeholder="Descripción breve del hotel, ubicación, estilo y diferencial comercial..."
                  minHeight={100}
                />
              </div>

              <div>
                <FieldLabel>Beneficios / destacados</FieldLabel>
                <TextArea
                  value={String(draft.beneficios || "")}
                  onChange={(value) => setField("beneficios", value)}
                  placeholder="Ej: Playa, piscina, kids club, desayuno, traslados..."
                  minHeight={90}
                />
              </div>

              <div>
                <FieldLabel>Condiciones</FieldLabel>
                <TextArea
                  value={String(draft.condiciones || "")}
                  onChange={(value) => setField("condiciones", value)}
                  placeholder="Condiciones específicas de esta hotelería..."
                  minHeight={80}
                />
              </div>

              <div>
                <FieldLabel>Política de cancelación</FieldLabel>
                <TextArea
                  value={String(draft.politica_cancelacion || "")}
                  onChange={(value) => setField("politica_cancelacion", value)}
                  placeholder="Cancelación, penalidades, fechas límite..."
                  minHeight={80}
                />
              </div>
            </div>
          </section>
        </main>

        <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
          <h3 className="mb-3 text-sm font-black text-[#111827]">Precio</h3>

          <div className="grid gap-3">
            <div>
              <FieldLabel>Precio total</FieldLabel>
              <TextInput
                value={numberToInput(draft.precio_total)}
                onChange={(value) => setField("precio_total", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>

            <div>
              <FieldLabel>Moneda</FieldLabel>
              <NosturSelect
                value={String(draft.moneda || "USD")}
                onChange={(value) => setField("moneda", value)}
                options={MONEDA_OPTIONS}
              />
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-800">
              La operación ideal es buscar el hotel desde la base. Si no existe, se carga desde Configuración o creación inline y queda disponible para futuros presupuestos.
            </div>

            {draft.imagen_url ? (
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                <img
                  src={String(draft.imagen_url)}
                  alt={String(draft.nombre || "Hotel")}
                  className="h-40 w-full object-cover"
                />
              </div>
            ) : null}
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
          disabled={saving || !draft.nombre}
          onClick={handleSave}
          className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar hotel
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   SERVICIO MODAL
========================================================= */

function ServicioModal({
  presupuestoId,
  servicio,
  saving,
  onClose,
  onSave
}: {
  presupuestoId: string;
  servicio: PresupuestoServicio | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: DraftServicio) => Promise<void>;
}) {
  const [draft, setDraft] = useState<DraftServicio>({
    id: servicio?.id,
    presupuesto_id: presupuestoId,
    tipo: servicio?.tipo || "OTRO",
    nombre: servicio?.nombre || "",
    descripcion: servicio?.descripcion || "",
    incluido: servicio?.incluido ?? true,
    opcional: servicio?.opcional ?? false,
    precio_total: servicio?.precio_total || null,
    moneda: servicio?.moneda || "USD"
  });

  function setField<K extends keyof DraftServicio>(key: K, value: DraftServicio[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    await onSave(draft);
  }

  return (
    <ModalShell
      title={servicio ? "Editar servicio" : "Agregar servicio"}
      subtitle="Traslados, asistencia, excursiones, circuitos, autos y adicionales."
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <NosturSelect
            value={String(draft.tipo || "OTRO")}
            onChange={(value) => setField("tipo", value as PresupuestoServicioTipo)}
            options={SERVICIO_TIPO_OPTIONS}
          />
        </div>

        <div>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput
            value={String(draft.nombre || "")}
            onChange={(value) => setField("nombre", value)}
            placeholder="Ej: Traslado aeropuerto / hotel / aeropuerto"
          />
        </div>

        <div className="md:col-span-2">
          <FieldLabel>Descripción</FieldLabel>
          <TextArea
            value={String(draft.descripcion || "")}
            onChange={(value) => setField("descripcion", value)}
            placeholder="Detalle visible para el pasajero..."
            minHeight={100}
          />
        </div>

        <div>
          <FieldLabel>Incluido</FieldLabel>
          <button
            type="button"
            onClick={() => setField("incluido", !draft.incluido)}
            className={[
              "flex h-9 w-full items-center justify-center rounded-xl border text-xs font-black",
              draft.incluido
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            ].join(" ")}
          >
            {draft.incluido ? "Sí, incluido" : "No incluido"}
          </button>
        </div>

        <div>
          <FieldLabel>Opcional</FieldLabel>
          <button
            type="button"
            onClick={() => setField("opcional", !draft.opcional)}
            className={[
              "flex h-9 w-full items-center justify-center rounded-xl border text-xs font-black",
              draft.opcional
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-600"
            ].join(" ")}
          >
            {draft.opcional ? "Sí, opcional" : "No opcional"}
          </button>
        </div>

        <div>
          <FieldLabel>Precio total</FieldLabel>
          <TextInput
            value={numberToInput(draft.precio_total)}
            onChange={(value) => setField("precio_total", toNumberOrNull(value))}
            inputMode="decimal"
            placeholder="0,00"
          />
        </div>

        <div>
          <FieldLabel>Moneda</FieldLabel>
          <NosturSelect
            value={String(draft.moneda || "USD")}
            onChange={(value) => setField("moneda", value)}
            options={MONEDA_OPTIONS}
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
          disabled={saving || !draft.nombre}
          onClick={handleSave}
          className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar servicio
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   COMBINACION MODAL
========================================================= */

function CombinacionModal({
  presupuestoId,
  combinacion,
  vuelos,
  hoteles,
  saving,
  onClose,
  onSave
}: {
  presupuestoId: string;
  combinacion: PresupuestoCombinacion | null;
  vuelos: PresupuestoVuelo[];
  hoteles: PresupuestoHotel[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: DraftCombinacion) => Promise<void>;
}) {
  const [draft, setDraft] = useState<DraftCombinacion>({
    id: combinacion?.id,
    presupuesto_id: presupuestoId,
    nombre: combinacion?.nombre || "Opción 1",
    subtitulo: combinacion?.subtitulo || "",
    descripcion: combinacion?.descripcion || "",
    etiqueta: combinacion?.etiqueta || "",
    vuelo_id: combinacion?.vuelo_id || null,
    hotel_id: combinacion?.hotel_id || null,
    precio_total: combinacion?.precio_total || 0,
    moneda: combinacion?.moneda || "USD",
    precio_contado: combinacion?.precio_contado || null,
    precio_transferencia: combinacion?.precio_transferencia || null,
    precio_tarjeta: combinacion?.precio_tarjeta || null,
    seña: combinacion?.seña || null,
    saldo: combinacion?.saldo || null,
    forma_pago_resumen: combinacion?.forma_pago_resumen || "",
    condiciones_pago: combinacion?.condiciones_pago || "",
    incluye_resumen: combinacion?.incluye_resumen || "",
    no_incluye_resumen: combinacion?.no_incluye_resumen || "",
    notas: combinacion?.notas || "",
    destacada: combinacion?.destacada || false
  });

  const vueloOptions: SelectOption[] = [
    { value: "sin_vuelo", label: "Sin vuelo vinculado" },
    ...vuelos.map((vuelo) => ({
      value: vuelo.id,
      label: vuelo.titulo
    }))
  ];

  const hotelOptions: SelectOption[] = [
    { value: "sin_hotel", label: "Sin hotel vinculado" },
    ...hoteles.map((hotel) => ({
      value: hotel.id,
      label: hotel.nombre
    }))
  ];

  function setField<K extends keyof DraftCombinacion>(key: K, value: DraftCombinacion[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    await onSave(draft);
  }

  return (
    <ModalShell
      title={combinacion ? "Editar combinación" : "Agregar combinación"}
      subtitle="Armá el precio final del paquete combinando vuelo, hotel, servicios y condiciones comerciales."
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <main className="grid gap-4">
          <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Identificación comercial</h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Nombre de opción</FieldLabel>
                <TextInput
                  value={String(draft.nombre || "")}
                  onChange={(value) => setField("nombre", value)}
                  placeholder="Ej: Opción recomendada"
                />
              </div>

              <div>
                <FieldLabel>Etiqueta</FieldLabel>
                <TextInput
                  value={String(draft.etiqueta || "")}
                  onChange={(value) => setField("etiqueta", value)}
                  placeholder="Recomendada, económica, superior..."
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Subtítulo</FieldLabel>
                <TextInput
                  value={String(draft.subtitulo || "")}
                  onChange={(value) => setField("subtitulo", value)}
                  placeholder="Ej: Hotel all inclusive + vuelos con equipaje"
                />
              </div>

              <div className="md:col-span-2">
                <FieldLabel>Descripción</FieldLabel>
                <TextArea
                  value={String(draft.descripcion || "")}
                  onChange={(value) => setField("descripcion", value)}
                  placeholder="Descripción comercial breve de esta alternativa..."
                  minHeight={90}
                />
              </div>

              <div>
                <FieldLabel>Vuelo vinculado</FieldLabel>
                <NosturSelect
                  value={draft.vuelo_id || "sin_vuelo"}
                  onChange={(value) => setField("vuelo_id", value === "sin_vuelo" ? null : value)}
                  options={vueloOptions}
                />
              </div>

              <div>
                <FieldLabel>Hotel vinculado</FieldLabel>
                <NosturSelect
                  value={draft.hotel_id || "sin_hotel"}
                  onChange={(value) => setField("hotel_id", value === "sin_hotel" ? null : value)}
                  options={hotelOptions}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Incluye / no incluye</h3>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Incluye</FieldLabel>
                <TextArea
                  value={String(draft.incluye_resumen || "")}
                  onChange={(value) => setField("incluye_resumen", value)}
                  placeholder={"Ej:\nAéreos ida y vuelta\nAlojamiento\nTraslados\nAsistencia al viajero"}
                  minHeight={110}
                />
              </div>

              <div>
                <FieldLabel>No incluye</FieldLabel>
                <TextArea
                  value={String(draft.no_incluye_resumen || "")}
                  onChange={(value) => setField("no_incluye_resumen", value)}
                  placeholder={"Ej:\nGastos personales\nExcursiones opcionales\nTasas no mencionadas"}
                  minHeight={90}
                />
              </div>

              <div>
                <FieldLabel>Notas visibles / aclaraciones</FieldLabel>
                <TextArea
                  value={String(draft.notas || "")}
                  onChange={(value) => setField("notas", value)}
                  placeholder="Aclaraciones específicas de esta opción..."
                  minHeight={80}
                />
              </div>
            </div>
          </section>
        </main>

        <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
          <h3 className="mb-3 text-sm font-black text-[#111827]">Precio y pagos</h3>

          <div className="grid gap-3">
            <div>
              <FieldLabel>Precio total paquete</FieldLabel>
              <TextInput
                value={numberToInput(draft.precio_total)}
                onChange={(value) => setField("precio_total", toNumberOrNull(value) || 0)}
                inputMode="decimal"
                placeholder="0,00"
              />
            </div>

            <div>
              <FieldLabel>Moneda</FieldLabel>
              <NosturSelect
                value={String(draft.moneda || "USD")}
                onChange={(value) => setField("moneda", value)}
                options={MONEDA_OPTIONS}
              />
            </div>

            <div>
              <FieldLabel>Precio contado</FieldLabel>
              <TextInput
                value={numberToInput(draft.precio_contado)}
                onChange={(value) => setField("precio_contado", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="Opcional"
              />
            </div>

            <div>
              <FieldLabel>Precio transferencia</FieldLabel>
              <TextInput
                value={numberToInput(draft.precio_transferencia)}
                onChange={(value) => setField("precio_transferencia", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="Opcional"
              />
            </div>

            <div>
              <FieldLabel>Precio tarjeta</FieldLabel>
              <TextInput
                value={numberToInput(draft.precio_tarjeta)}
                onChange={(value) => setField("precio_tarjeta", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="Opcional"
              />
            </div>

            <div>
              <FieldLabel>Seña</FieldLabel>
              <TextInput
                value={numberToInput(draft.seña)}
                onChange={(value) => setField("seña", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="Opcional"
              />
            </div>

            <div>
              <FieldLabel>Saldo</FieldLabel>
              <TextInput
                value={numberToInput(draft.saldo)}
                onChange={(value) => setField("saldo", toNumberOrNull(value))}
                inputMode="decimal"
                placeholder="Opcional"
              />
            </div>

            <div>
              <FieldLabel>Forma de pago resumen</FieldLabel>
              <TextArea
                value={String(draft.forma_pago_resumen || "")}
                onChange={(value) => setField("forma_pago_resumen", value)}
                placeholder="Ej: Seña para reservar y saldo antes del viaje..."
                minHeight={80}
              />
            </div>

            <div>
              <FieldLabel>Condiciones de pago</FieldLabel>
              <TextArea
                value={String(draft.condiciones_pago || "")}
                onChange={(value) => setField("condiciones_pago", value)}
                placeholder="Condiciones, vencimientos, financiación..."
                minHeight={80}
              />
            </div>

            <button
              type="button"
              onClick={() => setField("destacada", !draft.destacada)}
              className={[
                "flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-xs font-black",
                draft.destacada
                  ? "border-[#4f7c90]/30 bg-[#4f7c90]/10 text-[#31596a]"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              ].join(" ")}
            >
              <Star size={14} />
              {draft.destacada ? "Opción recomendada" : "Marcar como recomendada"}
            </button>
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
          disabled={saving || !draft.nombre}
          onClick={handleSave}
          className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Guardar combinación
        </button>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   PREVIEW MODAL
========================================================= */

function PreviewModal({
  presupuesto,
  vuelos,
  hoteles,
  servicios,
  combinaciones,
  onClose
}: {
  presupuesto: PresupuestoV2;
  vuelos: PresupuestoVuelo[];
  hoteles: PresupuestoHotel[];
  servicios: PresupuestoServicio[];
  combinaciones: PresupuestoCombinacion[];
  onClose: () => void;
}) {
  const recommended =
    combinaciones.find((item) => item.id === presupuesto.opcion_recomendada_id) ||
    combinaciones.find((item) => item.destacada) ||
    combinaciones[0] ||
    null;

  return (
    <ModalShell
      title="Vista previa operativa"
      subtitle="Primera aproximación visual. Después armamos la plantilla PDF cerrada ALMUNDO."
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
        <div className="bg-[#432918] px-7 py-6 text-white">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
            ALMUNDO Franquicia Córdoba
          </div>

          <h2 className="mt-3 text-3xl font-black tracking-tight">
            {presupuesto.titulo || presupuesto.destino_principal || "Propuesta de viaje"}
          </h2>

          <div className="mt-2 text-sm font-semibold text-white/80">
            {getDisplayName(presupuesto)} · {formatDate(presupuesto.fecha_salida)} al {formatDate(presupuesto.fecha_regreso)}
          </div>
        </div>

        <div className="grid gap-5 p-7">
          <section>
            <h3 className="mb-2 text-sm font-black text-[#111827]">Pasajeros</h3>

            <div className="rounded-2xl bg-[#f8fafc] p-4 text-sm font-semibold text-[#334155]">
              {presupuesto.adultos} adulto{presupuesto.adultos === 1 ? "" : "s"}
              {presupuesto.menores > 0
                ? ` + ${presupuesto.menores} menor${presupuesto.menores === 1 ? "" : "es"}`
                : ""}
              {presupuesto.edades_menores ? ` · ${presupuesto.edades_menores}` : ""}
            </div>
          </section>

          {recommended ? (
            <section className="rounded-[24px] border border-[#4f7c90]/20 bg-[#4f7c90]/10 p-5">
              <div className="mb-1 text-[11px] font-black uppercase tracking-wide text-[#31596a]">
                Opción recomendada
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#111827]">{recommended.nombre}</h3>

                  <p className="mt-1 text-sm font-semibold text-[#475569]">
                    {recommended.subtitulo || recommended.descripcion || "Paquete seleccionado"}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold uppercase text-[#64748b]">Precio total</div>

                  <div className="text-2xl font-black text-[#111827]">
                    {formatMoneyAR(recommended.precio_total, recommended.moneda)}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-sm font-black text-[#111827]">Opciones de paquete</h3>

            <div className="grid gap-3">
              {combinaciones.length === 0 ? (
                <EmptyState text="Todavía no hay combinaciones cargadas." />
              ) : (
                combinaciones.map((combinacion) => (
                  <div key={combinacion.id} className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-[#111827]">{combinacion.nombre}</div>

                        <div className="text-xs font-semibold text-[#64748b]">
                          {combinacion.subtitulo || "Opción de viaje"}
                        </div>
                      </div>

                      <div className="text-right text-lg font-black text-[#111827]">
                        {formatMoneyAR(combinacion.precio_total, combinacion.moneda)}
                      </div>
                    </div>

                    {combinacion.incluye_resumen ? (
                      <div className="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-3 text-xs font-semibold leading-5 text-[#475569]">
                        {combinacion.incluye_resumen}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <div className="mb-2 font-black text-[#111827]">Vuelos</div>
              <div className="text-xs font-semibold text-[#64748b]">
                {vuelos.length} opción{vuelos.length === 1 ? "" : "es"}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <div className="mb-2 font-black text-[#111827]">Hoteles</div>
              <div className="text-xs font-semibold text-[#64748b]">
                {hoteles.length} opción{hoteles.length === 1 ? "" : "es"}
              </div>
            </div>

            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <div className="mb-2 font-black text-[#111827]">Servicios</div>
              <div className="text-xs font-semibold text-[#64748b]">
                {servicios.length} cargado{servicios.length === 1 ? "" : "s"}
              </div>
            </div>
          </section>

          <footer className="whitespace-pre-wrap border-t border-black/10 pt-4 text-xs font-semibold leading-5 text-[#64748b]">
            {presupuesto.footer_text}
          </footer>
        </div>
      </div>
    </ModalShell>
  );
}

/* =========================================================
   MAIN PANEL
========================================================= */

export function PresupuestosV2Panel() {
  const loading = usePresupuestosV2Store((state: PresupuestosState) => state.loading);
  const loadingDetail = usePresupuestosV2Store((state: PresupuestosState) => state.loadingDetail);
  const saving = usePresupuestosV2Store((state: PresupuestosState) => state.saving);
  const error = usePresupuestosV2Store((state: PresupuestosState) => state.error);
  const uploading = usePresupuestosV2Store((state: PresupuestosState) => state.uploading);

  const presupuesto = usePresupuestosV2Store((state: PresupuestosState) => state.presupuesto);
  const vuelos = usePresupuestosV2Store((state: PresupuestosState) => state.vuelos);
  const hoteles = usePresupuestosV2Store((state: PresupuestosState) => state.hoteles);
  const servicios = usePresupuestosV2Store((state: PresupuestosState) => state.servicios);
  const combinaciones = usePresupuestosV2Store((state: PresupuestosState) => state.combinaciones);
  const adjuntos = usePresupuestosV2Store((state: PresupuestosState) => state.adjuntos);
  const vendedores = usePresupuestosV2Store((state: PresupuestosState) => state.vendedores);
  const sucursales = usePresupuestosV2Store((state: PresupuestosState) => state.sucursales);
  const filters = usePresupuestosV2Store((state: PresupuestosState) => state.filters);

  const loadPresupuestos = usePresupuestosV2Store((state: PresupuestosState) => state.loadPresupuestos);
  const loadPresupuestoFull = usePresupuestosV2Store((state: PresupuestosState) => state.loadPresupuestoFull);
  const loadCatalogs = usePresupuestosV2Store((state: PresupuestosState) => state.loadCatalogs);

  const createPresupuesto = usePresupuestosV2Store((state: PresupuestosState) => state.createPresupuesto);
  const updatePresupuesto = usePresupuestosV2Store((state: PresupuestosState) => state.updatePresupuesto);
  const deletePresupuesto = usePresupuestosV2Store((state: PresupuestosState) => state.deletePresupuesto);
  const duplicatePresupuesto = usePresupuestosV2Store((state: PresupuestosState) => state.duplicatePresupuesto);

  const addVuelo = usePresupuestosV2Store((state: PresupuestosState) => state.addVuelo);
  const updateVuelo = usePresupuestosV2Store((state: PresupuestosState) => state.updateVuelo);
  const deleteVuelo = usePresupuestosV2Store((state: PresupuestosState) => state.deleteVuelo);
  const setVueloPrincipal = usePresupuestosV2Store((state: PresupuestosState) => state.setVueloPrincipal);

  const addHotel = usePresupuestosV2Store((state: PresupuestosState) => state.addHotel);
  const updateHotel = usePresupuestosV2Store((state: PresupuestosState) => state.updateHotel);
  const deleteHotel = usePresupuestosV2Store((state: PresupuestosState) => state.deleteHotel);
  const setHotelPrincipal = usePresupuestosV2Store((state: PresupuestosState) => state.setHotelPrincipal);

  const addServicio = usePresupuestosV2Store((state: PresupuestosState) => state.addServicio);
  const updateServicio = usePresupuestosV2Store((state: PresupuestosState) => state.updateServicio);
  const deleteServicio = usePresupuestosV2Store((state: PresupuestosState) => state.deleteServicio);

  const addCombinacion = usePresupuestosV2Store((state: PresupuestosState) => state.addCombinacion);
  const updateCombinacion = usePresupuestosV2Store((state: PresupuestosState) => state.updateCombinacion);
  const deleteCombinacion = usePresupuestosV2Store((state: PresupuestosState) => state.deleteCombinacion);
  const setCombinacionRecomendada = usePresupuestosV2Store(
    (state: PresupuestosState) => state.setCombinacionRecomendada
  );

  const markAsSent = usePresupuestosV2Store((state: PresupuestosState) => state.markAsSent);
  const markAsAccepted = usePresupuestosV2Store((state: PresupuestosState) => state.markAsAccepted);
  const markAsRejected = usePresupuestosV2Store((state: PresupuestosState) => state.markAsRejected);
  const uploadAdjunto = usePresupuestosV2Store((state: PresupuestosState) => state.uploadAdjunto);
const deleteAdjunto = usePresupuestosV2Store((state: PresupuestosState) => state.deleteAdjunto);

  const selectPresupuesto = usePresupuestosV2Store((state: PresupuestosState) => state.selectPresupuesto);
  const setFilter = usePresupuestosV2Store((state: PresupuestosState) => state.setFilter);
  const resetFilters = usePresupuestosV2Store((state: PresupuestosState) => state.resetFilters);
  const clearError = usePresupuestosV2Store((state: PresupuestosState) => state.clearError);
  const getFilteredPresupuestos = usePresupuestosV2Store(
    (state: PresupuestosState) => state.getFilteredPresupuestos
  );
  const getMetrics = usePresupuestosV2Store((state: PresupuestosState) => state.getMetrics);

  const filteredPresupuestos = getFilteredPresupuestos();
  const metrics = getMetrics();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [editingVuelo, setEditingVuelo] = useState<PresupuestoVuelo | null>(null);
  const [editingHotel, setEditingHotel] = useState<PresupuestoHotel | null>(null);
  const [editingServicio, setEditingServicio] = useState<PresupuestoServicio | null>(null);
  const [editingCombinacion, setEditingCombinacion] = useState<PresupuestoCombinacion | null>(null);
  const [selectedAdjunto, setSelectedAdjunto] = useState<PresupuestoAdjunto | null>(null);

  const vendedorOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todos", label: "Todos" },
      ...vendedores.map((vendedor) => ({
        value: vendedor.id,
        label: `${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim() || vendedor.email || "Usuario"
      }))
    ],
    [vendedores]
  );

  const sucursalOptions = useMemo<SelectOption[]>(
    () => [
      { value: "todas", label: "Todas" },
      ...sucursales.map((sucursal) => ({
        value: sucursal.id,
        label: sucursal.nombre
      }))
    ],
    [sucursales]
  );

  useEffect(() => {
    void loadCatalogs();
    void loadPresupuestos();
  }, [loadCatalogs, loadPresupuestos]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function handleCreatePresupuesto(draft: CreatePresupuestoV2Draft) {
    const id = await createPresupuesto(draft);

    if (id) {
      setModalMode(null);
      showToast("Presupuesto creado correctamente.");
    }
  }

  async function handleSaveCaratula(draft: Partial<PresupuestoV2>) {
    if (!presupuesto) return;

    const ok = await updatePresupuesto({
      id: presupuesto.id,
      ...draft
    });

    if (ok) {
      setModalMode(null);
      showToast("Carátula guardada.");
    }
  }

  async function handleSaveVuelo(draft: DraftVuelo) {
    if (!presupuesto) return;

    const ok = draft.id
      ? await updateVuelo({ id: draft.id, ...draft })
      : Boolean(await addVuelo({ ...draft, presupuesto_id: presupuesto.id }));

    if (ok) {
      setEditingVuelo(null);
      setModalMode(null);
      showToast("Vuelo guardado.");
    }
  }

  async function handleSaveHotel(draft: DraftHotel) {
    if (!presupuesto) return;

    const ok = draft.id
      ? await updateHotel({ id: draft.id, ...draft })
      : Boolean(await addHotel({ ...draft, presupuesto_id: presupuesto.id, nombre: draft.nombre }));

    if (ok) {
      setEditingHotel(null);
      setModalMode(null);
      showToast("Hotel guardado.");
    }
  }

  async function handleSaveServicio(draft: DraftServicio) {
    if (!presupuesto) return;

    const ok = draft.id
      ? await updateServicio({ id: draft.id, ...draft })
      : Boolean(await addServicio({ ...draft, presupuesto_id: presupuesto.id, nombre: draft.nombre }));

    if (ok) {
      setEditingServicio(null);
      setModalMode(null);
      showToast("Servicio guardado.");
    }
  }

  async function handleSaveCombinacion(draft: DraftCombinacion) {
    if (!presupuesto) return;

    const id = draft.id
      ? null
      : await addCombinacion({ ...draft, presupuesto_id: presupuesto.id, nombre: draft.nombre });

    const ok = draft.id ? await updateCombinacion({ id: draft.id, ...draft }) : Boolean(id);

    if (ok) {
      const combinacionId = draft.id || id;

      if (draft.destacada && combinacionId) {
        await setCombinacionRecomendada(combinacionId);
      }

      setEditingCombinacion(null);
      setModalMode(null);
      showToast("Combinación guardada.");
    }
  }

  async function handleDeletePresupuesto() {
    if (!presupuesto) return;

    const ok = await deletePresupuesto(presupuesto.id);

    if (ok) {
      showToast("Presupuesto eliminado.");
    }
  }

  async function handleDuplicatePresupuesto() {
    if (!presupuesto) return;

    const id = await duplicatePresupuesto(presupuesto.id);

    if (id) {
      showToast("Presupuesto duplicado.");
    }
  }

  async function handleMarkAsSent() {
    if (!presupuesto) return;

    const ok = await markAsSent(presupuesto.id);

    if (ok) showToast("Presupuesto marcado como enviado.");
  }

  async function handleMarkAsAccepted() {
    if (!presupuesto) return;

    const ok = await markAsAccepted(presupuesto.id);

    if (ok) showToast("Presupuesto aceptado.");
  }

  async function handleMarkAsRejected() {
    if (!presupuesto) return;

    const ok = await markAsRejected(presupuesto.id);

    if (ok) showToast("Presupuesto rechazado.");
  }

 async function handleUploadAdjunto(
  file: File,
  tipo: PresupuestoAdjuntoTipo,
  entidadTipo: "PRESUPUESTO" | "VUELO" | "HOTEL" | "SERVICIO" | "COMBINACION",
  tituloBase: string
) {
  if (!presupuesto) return;

  const id = await uploadAdjunto({
    presupuesto_id: presupuesto.id,
    file,
    tipo,
    entidad_tipo: entidadTipo,
    titulo: `${tituloBase} · ${file.name}`,
    incluir_en_pdf: false
  });

  if (id) {
    showToast("Archivo subido correctamente.");
  }

}

async function handleDeleteAdjunto(adjuntoId: string) {
  const ok = await deleteAdjunto(adjuntoId);

  if (ok) {
    showToast("Archivo eliminado.");
  }
}

  const recommended =
    combinaciones.find((item) => item.id === presupuesto?.opcion_recomendada_id) ||
    combinaciones.find((item) => item.destacada) ||
    null;

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_22%_10%,rgba(79,124,144,0.12),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(95,72,48,0.10),transparent_30%),linear-gradient(135deg,#eef3f5,#dfe8ec_48%,#eef3f5)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-white/75 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#111827]">Presupuestos</h1>

                <span className="rounded-xl bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#31596a]">
                  Constructor ALMUNDO
                </span>
              </div>

              <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                Carátula, hoteles, servicios, combinaciones y presentación cerrada para pasajeros.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void loadPresupuestos();
                  if (presupuesto?.id) void loadPresupuestoFull(presupuesto.id, true);
                }}
                disabled={loading}
                className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
              >
                <RefreshCcw size={14} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={() => setModalMode("nuevo")}
                className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white shadow-sm hover:bg-[#416a7a]"
              >
                <Plus size={14} />
                Nuevo presupuesto
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill label="Total" value={metrics.total} />
            <MetricPill label="Borradores" value={metrics.borradores} tone="slate" />
            <MetricPill label="Enviados" value={metrics.enviados} tone="blue" />
            <MetricPill label="Aceptados" value={metrics.aceptados} tone="green" />
            <MetricPill label="Rechazados" value={metrics.rechazados} tone="red" />
            <MetricPill label="Con PDF" value={metrics.conPdf} tone="amber" />
          </div>
        </header>

        {error ? (
          <div className="shrink-0 px-4 pt-3">
            <InlineError message={error} onClose={clearError} />
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-[280px_360px_minmax(0,1fr)_320px] overflow-hidden">
          <aside className="min-h-0 overflow-auto border-r border-black/10 bg-white/55 p-3 backdrop-blur">
            <div className="mb-3 rounded-[24px] border border-black/10 bg-white/80 p-3 shadow-sm">
              <h3 className="mb-3 text-sm font-black text-[#111827]">Filtros</h3>

              <div className="grid gap-3">
                <div>
                  <FieldLabel>Buscar</FieldLabel>

                  <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-3">
                    <Search size={14} className="text-[#64748b]" />

                    <input
                      value={filters.search}
                      onChange={(event) => setFilter("search", event.target.value)}
                      placeholder="Cliente, destino, número..."
                      className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>Estado</FieldLabel>

                  <NosturSelect
                    value={filters.estado}
                    onChange={(value) => setFilter("estado", value as PresupuestosV2Filters["estado"])}
                    options={ESTADO_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Marca</FieldLabel>

                  <NosturSelect
                    value={filters.marca}
                    onChange={(value) => setFilter("marca", value as "TODAS" | PresupuestoMarca)}
                    options={MARCA_OPTIONS}
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
                  <FieldLabel>Sucursal</FieldLabel>

                  <NosturSelect
                    value={filters.sucursalId}
                    onChange={(value) => setFilter("sucursalId", value)}
                    options={sucursalOptions}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <FieldLabel>Desde</FieldLabel>

                    <NosturDatePicker
                      value={filters.desde}
                      onChange={(value) => setFilter("desde", value)}
                      placeholder="Desde"
                    />
                  </div>

                  <div>
                    <FieldLabel>Hasta</FieldLabel>

                    <NosturDatePicker
                      value={filters.hasta}
                      min={filters.desde || undefined}
                      onChange={(value) => setFilter("hasta", value)}
                      placeholder="Hasta"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-9 rounded-xl bg-white text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-black/10 bg-white/80 p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-black text-[#111827]">Modo de carga</h3>

              <div className="grid gap-2 text-[11px] font-semibold text-[#64748b]">
                <div className="rounded-2xl bg-[#f8fafc] p-3">
                  <strong className="text-[#111827]">Manual guiado:</strong> carátula, hoteles, servicios y opciones comerciales.
                </div>

                <div className="rounded-2xl bg-[#f8fafc] p-3">
                  <strong className="text-[#111827]">Capturas:</strong> preparado para adjuntar respaldo visual de vuelos / Almundo.
                </div>

                <div className="rounded-2xl bg-[#f8fafc] p-3">
                  <strong className="text-[#111827]">Copywriter / IA:</strong> queda como próximo paso para parsear texto suelto.
                </div>
              </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-hidden border-r border-black/10 bg-white/75 backdrop-blur">
            <div className="flex h-12 items-center justify-between border-b border-black/10 px-3">
              <div>
                <div className="text-sm font-black text-[#111827]">Presupuestos</div>

                <div className="text-[11px] font-semibold text-[#64748b]">
                  {loading ? "Cargando..." : `${filteredPresupuestos.length} encontrados`}
                </div>
              </div>
            </div>

            <div className="h-[calc(100%-48px)] overflow-auto">
              {loading ? (
                <div className="p-4 text-center text-xs font-semibold text-[#64748b]">Cargando presupuestos...</div>
              ) : filteredPresupuestos.length === 0 ? (
                <div className="p-4 text-center text-xs font-semibold text-[#64748b]">
                  No hay presupuestos para estos filtros.
                </div>
              ) : (
                filteredPresupuestos.map((item) => (
                  <PresupuestoListItem
                    key={item.id}
                    presupuesto={item}
                    selected={presupuesto?.id === item.id}
                    onClick={() => selectPresupuesto(item.id)}
                  />
                ))
              )}
            </div>
          </section>

          <main className="min-h-0 min-w-0 overflow-auto bg-[#eef3f5] p-4">
            {!presupuesto ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="max-w-md rounded-[24px] border border-black/10 bg-white/80 p-6 text-center shadow-sm">
                  <FileText size={34} className="mx-auto mb-3 text-[#4f7c90]" />

                  <h2 className="text-lg font-black text-[#111827]">Seleccioná o creá un presupuesto</h2>

                  <p className="mt-1 text-xs font-semibold text-[#64748b]">
                    Desde acá vas a construir la propuesta por bloques: carátula, hoteles, servicios y combinaciones comerciales.
                  </p>

                  <button
                    type="button"
                    onClick={() => setModalMode("nuevo")}
                    className="mt-4 h-9 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white shadow-sm hover:bg-[#416a7a]"
                  >
                    Crear presupuesto
                  </button>
                </div>
              </div>
            ) : loadingDetail ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black text-[#64748b] shadow-sm">
                  <Loader2 size={15} className="animate-spin" />
                  Cargando detalle...
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
                  <div className="bg-[#432918] px-5 py-4 text-white">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-xl bg-white/12 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/80">
                            {presupuesto.marca}
                          </span>

                          <span className="rounded-xl bg-white/12 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white/80">
                            {presupuesto.numero}
                          </span>
                        </div>

                        <h2 className="truncate text-2xl font-black tracking-tight">
                          {presupuesto.titulo || presupuesto.destino_principal || "Presupuesto sin título"}
                        </h2>

                        <div className="mt-1 text-xs font-semibold text-white/75">
                          {getDisplayName(presupuesto)} · {formatDate(presupuesto.fecha_salida)} al {formatDate(presupuesto.fecha_regreso)}
                        </div>
                      </div>

                      <EstadoBadge estado={presupuesto.estado} />
                    </div>
                  </div>

                  <div className="grid gap-3 p-4 md:grid-cols-4">
                    <div className="rounded-2xl bg-[#f8fafc] p-3">
                      <div className="mb-1 text-[10px] font-black uppercase text-[#64748b]">Pasajeros</div>

                      <div className="text-sm font-black text-[#111827]">
                        {presupuesto.adultos} adulto{presupuesto.adultos === 1 ? "" : "s"}
                        {presupuesto.menores > 0 ? ` + ${presupuesto.menores}` : ""}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] p-3">
                      <div className="mb-1 text-[10px] font-black uppercase text-[#64748b]">Noches</div>
                      <div className="text-sm font-black text-[#111827]">{presupuesto.noches ?? "—"}</div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] p-3">
                      <div className="mb-1 text-[10px] font-black uppercase text-[#64748b]">Opciones</div>
                      <div className="text-sm font-black text-[#111827]">{combinaciones.length}</div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] p-3">
                      <div className="mb-1 text-[10px] font-black uppercase text-[#64748b]">Recomendada</div>

                      <div className="truncate text-sm font-black text-[#111827]">
                        {recommended ? formatMoneyAR(recommended.precio_total, recommended.moneda) : "—"}
                      </div>
                    </div>
                  </div>
                </section>
<AdjuntosCard
  adjuntos={adjuntos}
  uploading={uploading}
  onUpload={(file, tipo, entidadTipo, tituloBase) => {
    void handleUploadAdjunto(file, tipo, entidadTipo, tituloBase);
  }}
  onDelete={(adjuntoId) => {
    void handleDeleteAdjunto(adjuntoId);
  }}
  onProcessIa={(adjunto) => {
    setSelectedAdjunto(adjunto);
    setModalMode("ia");
  }}
/>
                <SectionCard
                  title="Vuelos"
                  icon={<Plane size={16} />}
                  action={
                    <button
                      type="button"
                      disabled
                      className="flex h-8 items-center gap-2 rounded-xl bg-slate-100 px-3 text-[11px] font-black text-slate-400"
                      title="La carga manual de vuelos queda desactivada para la operación diaria."
                    >
                      <Plus size={13} />
                      Próximo: captura / parser
                    </button>
                  }
                >
                  <div className="grid gap-2">
                    {vuelos.length === 0 ? (
                      <EmptyState text="Los vuelos no se cargarán manualmente. En el próximo paso sumamos captura / copywriter para traerlos desde Almundo." />
                    ) : (
                      vuelos.map((vuelo) => (
                        <VueloCard
                          key={vuelo.id}
                          vuelo={vuelo}
                          onEdit={() => {
                            setEditingVuelo(vuelo);
                            setModalMode("vuelo");
                          }}
                          onDelete={() => {
                            void deleteVuelo(vuelo.id).then((ok) => {
                              if (ok) showToast("Vuelo eliminado.");
                            });
                          }}
                          onPrincipal={() => {
                            void setVueloPrincipal(vuelo.id).then((ok) => {
                              if (ok) showToast("Vuelo marcado como principal.");
                            });
                          }}
                        />
                      ))
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Hoteles"
                  icon={<Hotel size={16} />}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHotel(null);
                        setModalMode("hotel");
                      }}
                      className="flex h-8 items-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white hover:bg-[#416a7a]"
                    >
                      <Plus size={13} />
                      Agregar hotel
                    </button>
                  }
                >
                  <div className="grid gap-2">
                    {hoteles.length === 0 ? (
                      <EmptyState text="Todavía no hay hoteles cargados. Idealmente se seleccionan desde la base; si no existe, se carga y queda guardado." />
                    ) : (
                      hoteles.map((hotel) => (
                        <HotelCard
                          key={hotel.id}
                          hotel={hotel}
                          onEdit={() => {
                            setEditingHotel(hotel);
                            setModalMode("hotel");
                          }}
                          onDelete={() => {
                            void deleteHotel(hotel.id).then((ok) => {
                              if (ok) showToast("Hotel eliminado.");
                            });
                          }}
                          onPrincipal={() => {
                            void setHotelPrincipal(hotel.id).then((ok) => {
                              if (ok) showToast("Hotel marcado como principal.");
                            });
                          }}
                        />
                      ))
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Servicios"
                  icon={<PackageCheck size={16} />}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setEditingServicio(null);
                        setModalMode("servicio");
                      }}
                      className="flex h-8 items-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white hover:bg-[#416a7a]"
                    >
                      <Plus size={13} />
                      Agregar servicio
                    </button>
                  }
                >
                  <div className="grid gap-2">
                    {servicios.length === 0 ? (
                      <EmptyState text="Todavía no hay servicios cargados." />
                    ) : (
                      servicios.map((servicio) => (
                        <ServicioCard
                          key={servicio.id}
                          servicio={servicio}
                          onEdit={() => {
                            setEditingServicio(servicio);
                            setModalMode("servicio");
                          }}
                          onDelete={() => {
                            void deleteServicio(servicio.id).then((ok) => {
                              if (ok) showToast("Servicio eliminado.");
                            });
                          }}
                        />
                      ))
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Combinaciones / Opciones comerciales"
                  icon={<BadgeDollarSign size={16} />}
                  action={
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCombinacion(null);
                        setModalMode("combinacion");
                      }}
                      className="flex h-8 items-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-[11px] font-black text-white hover:bg-[#416a7a]"
                    >
                      <Plus size={13} />
                      Agregar opción
                    </button>
                  }
                >
                  <div className="grid gap-2">
                    {combinaciones.length === 0 ? (
                      <EmptyState text="Todavía no hay combinaciones. Acá se arma el precio final del paquete para pasajeros." />
                    ) : (
                      combinaciones.map((combinacion) => (
                        <CombinacionCard
                          key={combinacion.id}
                          combinacion={combinacion}
                          vuelo={vuelos.find((item) => item.id === combinacion.vuelo_id)}
                          hotel={hoteles.find((item) => item.id === combinacion.hotel_id)}
                          onEdit={() => {
                            setEditingCombinacion(combinacion);
                            setModalMode("combinacion");
                          }}
                          onDelete={() => {
                            void deleteCombinacion(combinacion.id).then((ok) => {
                              if (ok) showToast("Combinación eliminada.");
                            });
                          }}
                          onRecommended={() => {
                            void setCombinacionRecomendada(combinacion.id).then((ok) => {
                              if (ok) showToast("Opción recomendada actualizada.");
                            });
                          }}
                        />
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>
            )}
          </main>

          <aside className="min-h-0 overflow-auto border-l border-black/10 bg-white/70 p-3 backdrop-blur">
            {!presupuesto ? (
              <div className="rounded-[24px] border border-black/10 bg-white/80 p-4 text-center text-xs font-semibold text-[#64748b]">
                Sin presupuesto seleccionado.
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#111827]">Acciones</h3>
                      <p className="text-[11px] font-semibold text-[#64748b]">{presupuesto.numero}</p>
                    </div>

                    <MoreVertical size={16} className="text-[#94a3b8]" />
                  </div>

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => setModalMode("caratula")}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-[#4f7c90] px-3 text-xs font-black text-white hover:bg-[#416a7a]"
                    >
                      <Pencil size={14} />
                      Editar carátula
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalMode("preview")}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                    >
                      <Eye size={14} />
                      Vista previa
                    </button>

                    <button
                      type="button"
                      disabled
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-400"
                      title="La generación de PDF cerrado va en el siguiente paso."
                    >
                      <FileText size={14} />
                      Generar PDF
                    </button>

                    <button
                      type="button"
                      onClick={handleMarkAsSent}
                      disabled={saving}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 text-xs font-black text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Send size={14} />
                      Marcar enviado
                    </button>

                    <button
                      type="button"
                      onClick={handleMarkAsAccepted}
                      disabled={saving}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-green-50 px-3 text-xs font-black text-green-700 ring-1 ring-green-200 hover:bg-green-100 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Aceptado
                    </button>

                    <button
                      type="button"
                      onClick={handleMarkAsRejected}
                      disabled={saving}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 text-xs font-black text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-50"
                    >
                      <X size={14} />
                      Rechazado
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicatePresupuesto}
                      disabled={saving}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
                    >
                      <Copy size={14} />
                      Duplicar
                    </button>

                    <button
                      type="button"
                      onClick={handleDeletePresupuesto}
                      disabled={saving}
                      className="flex h-9 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-black text-[#111827]">Resumen</h3>

                  <div className="grid gap-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-[#64748b]">Cliente</span>
                      <strong className="text-right text-[#111827]">{presupuesto.cliente_nombre || "—"}</strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-[#64748b]">Destino</span>
                      <strong className="text-right text-[#111827]">{presupuesto.destino_principal || "—"}</strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-[#64748b]">Salida</span>
                      <strong className="text-right text-[#111827]">{formatDate(presupuesto.fecha_salida)}</strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-[#64748b]">Regreso</span>
                      <strong className="text-right text-[#111827]">{formatDate(presupuesto.fecha_regreso)}</strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-[#64748b]">Noches</span>
                      <strong className="text-right text-[#111827]">{presupuesto.noches ?? "—"}</strong>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span className="text-[#64748b]">Estado</span>
                      <strong className="text-right text-[#111827]">{getEstadoLabel(presupuesto.estado)}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-black text-[#111827]">Bloques</h3>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-[#f8fafc] p-3 text-center">
                      <Plane size={17} className="mx-auto mb-1 text-[#4f7c90]" />
                      <div className="text-lg font-black text-[#111827]">{vuelos.length}</div>
                      <div className="text-[10px] font-black uppercase text-[#64748b]">Vuelos</div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] p-3 text-center">
                      <BedDouble size={17} className="mx-auto mb-1 text-[#4f7c90]" />
                      <div className="text-lg font-black text-[#111827]">{hoteles.length}</div>
                      <div className="text-[10px] font-black uppercase text-[#64748b]">Hoteles</div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] p-3 text-center">
                      <Paperclip size={17} className="mx-auto mb-1 text-[#4f7c90]" />
                      <div className="text-lg font-black text-[#111827]">{servicios.length}</div>
                      <div className="text-[10px] font-black uppercase text-[#64748b]">Servicios</div>
                    </div>

                    <div className="rounded-2xl bg-[#f8fafc] p-3 text-center">
                      <CircleDollarSign size={17} className="mx-auto mb-1 text-[#4f7c90]" />
                      <div className="text-lg font-black text-[#111827]">{combinaciones.length}</div>
                      <div className="text-[10px] font-black uppercase text-[#64748b]">Opciones</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-sm font-black text-[#111827]">Próximo paso</h3>

                  <div className="rounded-2xl bg-[#f8fafc] p-3 text-xs font-semibold leading-5 text-[#64748b]">
                    Después de validar este constructor, armamos la plantilla PDF cerrada con estética ALMUNDO, portada, opciones de paquete, fotos de hoteles, servicios incluidos y footer oficial.
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {modalMode === "nuevo" ? (
        <NuevoPresupuestoModal
          vendedores={vendedores}
          sucursales={sucursales}
          saving={saving}
          onClose={() => setModalMode(null)}
          onCreate={handleCreatePresupuesto}
        />
      ) : null}

      {modalMode === "caratula" && presupuesto ? (
        <CaratulaModal
          presupuesto={presupuesto}
          vendedores={vendedores}
          sucursales={sucursales}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSave={handleSaveCaratula}
        />
      ) : null}

      {modalMode === "vuelo" && presupuesto ? (
        <VueloModal
          presupuestoId={presupuesto.id}
          vuelo={editingVuelo}
          saving={saving}
          onClose={() => {
            setEditingVuelo(null);
            setModalMode(null);
          }}
          onSave={handleSaveVuelo}
        />
      ) : null}

      {modalMode === "hotel" && presupuesto ? (
        <HotelModal
          presupuestoId={presupuesto.id}
          hotel={editingHotel}
          saving={saving}
          onClose={() => {
            setEditingHotel(null);
            setModalMode(null);
          }}
          onSave={handleSaveHotel}
        />
      ) : null}

      {modalMode === "servicio" && presupuesto ? (
        <ServicioModal
          presupuestoId={presupuesto.id}
          servicio={editingServicio}
          saving={saving}
          onClose={() => {
            setEditingServicio(null);
            setModalMode(null);
          }}
          onSave={handleSaveServicio}
        />
      ) : null}

      {modalMode === "combinacion" && presupuesto ? (
        <CombinacionModal
          presupuestoId={presupuesto.id}
          combinacion={editingCombinacion}
          vuelos={vuelos}
          hoteles={hoteles}
          saving={saving}
          onClose={() => {
            setEditingCombinacion(null);
            setModalMode(null);
          }}
          onSave={handleSaveCombinacion}
        />
      ) : null}

      {modalMode === "preview" && presupuesto ? (
        <PreviewModal
          presupuesto={presupuesto}
          vuelos={vuelos}
          hoteles={hoteles}
          servicios={servicios}
          combinaciones={combinaciones}
          onClose={() => setModalMode(null)}
        />
      ) : null}

      {modalMode === "ia" && selectedAdjunto ? (
  <IaParserModal
    adjunto={selectedAdjunto}
    saving={saving}
    onClose={() => {
      setSelectedAdjunto(null);
      setModalMode(null);
    }}
    onCreateVuelo={async (draft) => {
      await handleSaveVuelo(draft);
      setSelectedAdjunto(null);
      setModalMode(null);
    }}
  />
) : null} 

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
