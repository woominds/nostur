import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
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
  useCarritosStore,
  type Carrito,
  type CarritoWizardInput,
  type Cliente,
  type MovimientoTesoreria,
  type PagoComercial,
  type ProfileLite
} from "../../store/carritosStore";
import { NosturDateInput } from "../ui/NosturDateInput";
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
    numero_carrito: string;
    fecha_venta: string;
    fecha_in: string;
    fecha_out: string;
    solo_ida: boolean;
    servicio_id: string;
    servicio: string;
    destinos: string[];
    importe_bruto: string;
    moneda: string;
    promocode_aplicado: boolean;
    promocode_importe: string;
    observaciones: string;
   };
  pagosComerciales: PagoComercial[];
  pagoParcial: boolean;
  fechaIngresoGastos: string;
  movimientosTesoreria: MovimientoTesoreria[];
  riesgo: boolean;
  importe_riesgo: string;
  riesgo_motivo: string;
  confirmado: boolean;
};

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "CARGADO", label: "Cargado" },
  { value: "EN_CONTROL", label: "En control" },
  { value: "CONTROLADO", label: "Controlado" },
  { value: "FACTURADO", label: "Facturado" },
  { value: "COBRADO", label: "Cobrado" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "CTA_CTE", label: "Cta Cte" }
];

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
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

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");

  const labels: Record<string, string> = {
    "01": "Enero",
    "02": "Febrero",
    "03": "Marzo",
    "04": "Abril",
    "05": "Mayo",
    "06": "Junio",
    "07": "Julio",
    "08": "Agosto",
    "09": "Septiembre",
    "10": "Octubre",
    "11": "Noviembre",
    "12": "Diciembre"
  };

  return `${labels[monthNumber] || monthNumber} ${year}`;
}

function isDateBefore(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a < b;
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

function maskCarrito(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidCarrito(value: string): boolean {
  return /^\d{3}-\d{3}-\d{3}$/.test(value);
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
      numero_carrito: "",
      fecha_venta: getToday(),
      fecha_in: getToday(),
      fecha_out: getToday(),
      solo_ida: false,
      servicio_id: "",
      servicio: "",
      destinos: [],
      importe_bruto: "",
      moneda: "ARS",
      promocode_aplicado: false,
      promocode_importe: "",
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
    fechaIngresoGastos: "",
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
function DestinosMultiSelect({
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

  const filteredOptions = useMemo(() => {
    const q = normalizeText(query);

    return options
      .filter((option) => {
        const alreadySelected = values.some(
          (value) => normalizeText(value) === normalizeText(option.value)
        );

        if (alreadySelected) return false;
        if (!q) return true;

        return normalizeText(`${option.label} ${option.value}`).includes(q);
      })
      .slice(0, 80);
  }, [options, query, values]);

  function addValue(value: string) {
    const cleanValue = value.trim();

    if (!cleanValue) return;

    const exists = values.some((item) => normalizeText(item) === normalizeText(cleanValue));

    if (exists) {
      setQuery("");
      return;
    }

    onChange([...values, cleanValue]);
    setQuery("");
  }

  function removeValue(value: string) {
    onChange(values.filter((item) => normalizeText(item) !== normalizeText(value)));
  }

  async function handleCreate() {
    const cleanName = query.trim();

    if (!cleanName || creating) return;

    setCreating(true);
    const createdName = await onCreate(cleanName, pais || "Sin especificar");
    setCreating(false);

    if (createdName) {
      addValue(createdName);
      setPais("Sin especificar");
      setOpen(false);
    }
  }

  const canCreate =
    query.trim().length >= 2 &&
    !options.some((option) => normalizeText(option.value) === normalizeText(query)) &&
    !values.some((value) => normalizeText(value) === normalizeText(query));

  return (
    <div className={["relative", open ? "z-[130]" : "z-0"].join(" ")}>
      <div className="min-h-9 rounded-xl border border-black/10 bg-[#f8fafc] px-2 py-1 focus-within:border-nostur-orange">
        <div className="flex flex-wrap items-center gap-1.5">
          {values.map((value) => (
            <span
              key={value}
              className="flex h-7 items-center gap-1 rounded-xl bg-nostur-orange/15 px-2 text-[11px] font-black text-[#111827]"
            >
              {value}

              <button
                type="button"
                onClick={() => removeValue(value)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[#64748b] hover:bg-white hover:text-red-600"
              >
                <X size={10} />
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
            placeholder={values.length === 0 ? "Buscar o crear destinos" : "Agregar destino"}
            className="h-7 min-w-[180px] flex-1 bg-transparent px-1 text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
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

          <div className="absolute left-0 right-0 top-[42px] z-[150] rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
            <div className="max-h-56 overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs font-bold text-[#94a3b8]">
                  No encontramos ese destino.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      addValue(option.value);
                      setOpen(false);
                    }}
                    className="flex h-8 w-full items-center rounded-xl px-3 text-left text-xs font-bold text-[#334155] transition hover:bg-[#f1f5f9]"
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                ))
              )}
            </div>

            {canCreate ? (
              <div className="mt-2 rounded-2xl border border-nostur-orange/20 bg-nostur-orange/5 p-2">
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
                  Crear destino nuevo
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
                  <div className="flex h-9 items-center rounded-xl bg-white px-3 text-xs font-black text-[#111827]">
                    {query.trim()}
                  </div>

                  <input
                    value={pais}
                    onChange={(event) => setPais(event.target.value)}
                    placeholder="País"
                    className="h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold outline-none focus:border-nostur-orange"
                  />

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating}
                    className="h-9 rounded-xl bg-nostur-orange px-3 text-xs font-black text-white hover:bg-nostur-orangeSoft disabled:opacity-50"
                  >
                    {creating ? "Creando..." : "Crear"}
                  </button>
                </div>
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
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
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

function SellerBadge({
  vendedorId,
  vendedorNombre,
  vendedores
}: {
  vendedorId?: string | null;
  vendedorNombre?: string | null;
  vendedores: ProfileLite[];
}) {
  const vendedor = vendedores.find((item) => item.id === vendedorId);

  const label = vendedor
    ? `${vendedor.nombre || ""} ${vendedor.apellido || ""}`.trim()
    : vendedorNombre || "Sin vendedor";

  const color = vendedor?.color || "#64748b";

  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
      style={{
        borderColor: `${color}33`,
        backgroundColor: `${color}18`,
        color
      }}
      title={label}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />

      <span className="truncate">{label}</span>
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
  const steps = ["Cliente", "Venta Ábaco", "Pagos comerciales", "Tesorería", "Confirmar"];

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
            Carrito
          </div>

          <div className="font-black text-[#111827]">{draft.venta.numero_carrito || "—"}</div>

          <div className="text-[#64748b]">
            {draft.venta.destinos.length > 0 ? draft.venta.destinos.join(", ") : "Sin destinos"}
          </div>
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
          {saldo > 0 ? "Va a Cta Cte" : "Queda en Carritos"}
        </div>

        {draft.riesgo ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-center text-[11px] font-black text-red-700">
            Riesgo Almundo marcado
          </div>
        ) : null}
      </div>
    </aside>
  );
}
function CarritoWizard({
  onClose,
  onSaved
}: {
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const saving = useCarritosStore((state) => state.saving);
  const clientesSearch = useCarritosStore((state) => state.clientesSearch);
  const catalogos = useCarritosStore((state) => state.catalogos);
  const currentProfile = useCarritosStore((state) => state.currentProfile);
  const canManageCarritos = useCarritosStore((state) => state.canManageCarritos);
  const searchClientesByPhone = useCarritosStore((state) => state.searchClientesByPhone);
  const createDestinoInline = useCarritosStore((state) => state.createDestinoInline);
  const saveCarritoWizard = useCarritosStore((state) => state.saveCarritoWizard);

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
  const promocode = draft.venta.promocode_aplicado ? parseMoney(draft.venta.promocode_importe) : 0;
  const totalFinal = Math.max(0, bruto - promocode);

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
  const visibleEnCarritos = saldo <= 0.009;

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

    const prefix = cliente.telefono.startsWith("+549") ? "+549" : draft.phonePrefix;
    const local = cliente.telefono.replace(prefix, "").replace("+549", "").replace(/\D/g, "");

    setDraft((current) => ({
      ...current,
      phonePrefix: prefix,
      phoneLocal: local,
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
      if (!isValidCarrito(draft.venta.numero_carrito)) {
        return "El número de carrito debe tener formato 000-000-000.";
      }

      if (!draft.venta.fecha_in) return "Seleccioná fecha IN.";

      if (!draft.venta.solo_ida && !draft.venta.fecha_out) {
        return "Seleccioná fecha OUT.";
      }

      if (!draft.venta.solo_ida && isDateBefore(draft.venta.fecha_out, draft.venta.fecha_in)) {
        return "La fecha OUT no puede ser anterior a la fecha IN.";
      }

      if (!draft.venta.servicio.trim()) return "Seleccioná o cargá el servicio.";

      if (draft.venta.destinos.length === 0) {
        return "Seleccioná o cargá al menos un destino.";
      }

      if (totalFinal <= 0) return "El importe final debe ser mayor a cero.";
    }

    if (currentStep === 3) {
      const pagosConImporte = draft.pagosComerciales.filter((pago) => parseMoney(pago.importe) > 0);

      if (pagosConImporte.some((pago) => !pago.forma_pago)) {
        return "Completá la forma de pago comercial en todas las líneas con importe.";
      }

      if (draft.riesgo) {
        if (importeRiesgo <= 0) return "Indicá el importe imputado a riesgo Almundo.";
        if (!draft.riesgo_motivo.trim()) return "Indicá el motivo u observación del riesgo Almundo.";
      }

      if (totalComercial <= 0) {
        return "Completá al menos un pago comercial o un importe imputado a riesgo Almundo.";
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

      if (draft.pagoParcial && !draft.fechaIngresoGastos) {
        return "Completá la fecha de ingreso a gastos para enviar el saldo a cuenta corriente.";
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

    const destinoTexto = draft.venta.destinos.join(", ");

    const payload: CarritoWizardInput = {
      cliente: {
        id: draft.cliente.id,
        nombre_completo: draft.cliente.nombre_completo,
        telefono: draft.cliente.telefono,
        email: draft.cliente.email,
        origen: draft.cliente.origen,
        vendedor_id: draft.cliente.vendedor_id || currentProfile?.id || null,
        sucursal_id: draft.cliente.sucursal_id || currentProfile?.sucursal_id || null
      },
      carrito: {
        numero_carrito: draft.venta.numero_carrito,
        fecha_venta: draft.venta.fecha_venta,
        servicio_id: draft.venta.servicio_id || null,
        servicio: draft.venta.servicio,
        metodo_contacto: draft.cliente.origen,
        destino: destinoTexto,
        fecha_in: draft.venta.fecha_in,
        fecha_out: draft.venta.solo_ida ? null : draft.venta.fecha_out,
        solo_ida: draft.venta.solo_ida,
        importe_bruto: bruto,
        moneda: draft.venta.moneda,
        promocode_aplicado: draft.venta.promocode_aplicado,
        promocode_importe: promocode,
        importe_final: totalFinal,
               pago_parcial: draft.pagoParcial,
        fecha_ingreso_gastos: draft.pagoParcial ? draft.fechaIngresoGastos : null,
        total_pagado: totalTesoreria,
        saldo_cta_cte: saldo,
        visible_en_carritos: visibleEnCarritos,
        riesgo: draft.riesgo,
        importe_riesgo: importeRiesgo,
        riesgo_motivo: draft.riesgo_motivo,
        confirmado_vendedor: draft.confirmado,
        observaciones: draft.venta.observaciones,
        vendedor_id: draft.cliente.vendedor_id || currentProfile?.id || null,
        sucursal_id: draft.cliente.sucursal_id || currentProfile?.sucursal_id || null
      },
      pagosComerciales: draft.pagosComerciales.filter((pago) => parseMoney(pago.importe) > 0),
      movimientosTesoreria: draft.movimientosTesoreria.filter(
        (movimiento) => parseMoney(movimiento.importe) > 0
      )
    };

    const ok = await saveCarritoWizard(payload);

    if (ok) {
      onSaved(
        visibleEnCarritos ? "Carrito cargado correctamente." : "Venta creada y enviada a Cta Cte."
      );
      onClose();
    }
  }

  const metodoOptions: SelectOption[] = catalogos.metodosContacto.map((item) => ({
    value: item.nombre,
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
    label: item.moneda ? `${item.nombre} · ${item.moneda}` : item.nombre
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
            <h2 className="text-lg font-black text-[#111827]">Nuevo carrito</h2>

            <p className="text-xs text-[#64748b]">
              Cliente → Venta Ábaco → Pagos comerciales → Tesorería → Confirmar
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

                    <NosturSelect
                      value={draft.cliente.origen}
                      onChange={(value) => setCliente("origen", value)}
                      options={metodoOptions}
                      placeholder="Buscar origen"
                    />
                  </div>

                  {canManageCarritos ? (
                    <>
                      <div>
                        <FieldLabel>Vendedor</FieldLabel>

                        <NosturSelect
                          value={draft.cliente.vendedor_id}
                          onChange={(value) => setCliente("vendedor_id", value)}
                          options={vendedorOptions}
                          placeholder="Buscar vendedor"
                        />
                      </div>

                      <div>
                        <FieldLabel>Sucursal</FieldLabel>

                        <NosturSelect
                          value={draft.cliente.sucursal_id}
                          onChange={(value) => setCliente("sucursal_id", value)}
                          options={sucursalOptions}
                          placeholder="Buscar sucursal"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
            ) : null}

                        {step === 2 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">Paso 2 · Venta Ábaco</h3>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel>Número carrito *</FieldLabel>

                    <TextInput
                      value={draft.venta.numero_carrito}
                      onChange={(value) => setVenta("numero_carrito", maskCarrito(value))}
                      placeholder="210-485-162"
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
                      placeholder="Buscar servicio"
                    />
                  </div>

                  <div>
                    <FieldLabel>Destinos</FieldLabel>

                    <DestinosMultiSelect
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
                          movimientosTesoreria: current.movimientosTesoreria.map(
                            (movimiento) => ({
                              ...movimiento,
                              moneda: value
                            })
                          )
                        }));
                      }}
                      options={MONEDA_OPTIONS}
                    />
                  </div>

                  <div>
                    <BooleanChip
                      checked={draft.venta.promocode_aplicado}
                      onChange={(value) => setVenta("promocode_aplicado", value)}
                      label="Tiene promocode"
                    />
                  </div>

                  {draft.venta.promocode_aplicado ? (
                    <div>
                      <FieldLabel>Importe promocode</FieldLabel>

                      <TextInput
                        value={draft.venta.promocode_importe}
                        onChange={(value) => setVenta("promocode_importe", value)}
                        placeholder="0,00"
                        inputMode="decimal"
                      />
                    </div>
                  ) : null}

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
                    <span className="text-[#64748b]">Promocode</span>
                    <strong>{formatMoneyAR(promocode, draft.venta.moneda)}</strong>
                  </div>

                  <div className="mt-2 flex justify-between border-t border-black/10 pt-2">
                    <span className="font-black text-[#111827]">Total cliente</span>

                    <strong className="text-[#111827]">
                      {formatMoneyAR(totalFinal, draft.venta.moneda)}
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
                          placeholder="Buscar forma"
                        />
                      </div>

                      <div className="flex items-end">
                        <LineButton
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              pagosComerciales:
                                current.pagosComerciales.length > 1
                                  ? current.pagosComerciales.filter(
                                      (_, itemIndex) => itemIndex !== index
                                    )
                                  : [{ importe: 0, moneda: current.venta.moneda, forma_pago: "" }]
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
                      setDraft((current) => ({
                        ...current,
                        pagoParcial: value,
                        fechaIngresoGastos: value ? current.fechaIngresoGastos || getToday() : ""
                      }));
                    }}
                    label="Pago parcial / enviar saldo a Cta Cte"
                  />

                  {draft.pagoParcial ? (
                    <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-3 md:max-w-[320px]">
                      <FieldLabel>Fecha ingreso a gastos *</FieldLabel>

                      <NosturDateInput
                        value={draft.fechaIngresoGastos}
                        onChange={(value) => {
                          setWizardError(null);
                          setDraft((current) => ({
                            ...current,
                            fechaIngresoGastos: value
                          }));
                        }}
                      />

                      <div className="mt-2 text-[11px] font-bold text-amber-700">
                        Esta fecha se usa cuando el carrito queda con saldo en Cta Cte.
                      </div>
                    </div>
                  ) : null}

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
                    label="Imputar a riesgo Almundo"
                  />
                </div>

                {draft.riesgo ? (
                  <div className="mt-3 grid gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div>
                      <FieldLabel>Importe riesgo Almundo</FieldLabel>

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
                        placeholder="Ej: pago impactado a riesgo en Almundo"
                      />
                    </div>

                    <div className="rounded-xl border border-red-200 bg-white/70 p-3 text-[11px] font-bold text-red-700 md:col-span-2">
                      Riesgo Almundo significa que el cliente nos paga a NOSSIX, pero la deuda con
                      Almundo queda pendiente para cancelarla luego desde la pantalla Riesgos.
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
                      <span className="text-[#64748b]">Riesgo Almundo</span>

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
                </div>
              </section>
            ) : null}


                        {step === 4 ? (
              <section>
                <h3 className="mb-3 text-sm font-black text-[#111827]">Paso 4 · Tesorería real</h3>

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
                          placeholder="Buscar caja"
                        />
                      </div>

                      <div>
                        <FieldLabel>Forma real</FieldLabel>

                        <NosturSelect
                          value={movimiento.forma_pago || ""}
                          onChange={(value) => updateMovimiento(index, { forma_pago: value })}
                          options={formaPagoOptions}
                          placeholder="Buscar forma"
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
                            movimiento.importe ? String(movimiento.importe).replace(".", ",") : ""
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
                              movimientosTesoreria:
                                current.movimientosTesoreria.length > 1
                                  ? current.movimientosTesoreria.filter(
                                      (_, itemIndex) => itemIndex !== index
                                    )
                                  : [
                                      {
                                        importe: 0,
                                        moneda: current.venta.moneda,
                                        forma_pago: "",
                                        caja: ""
                                      }
                                    ]
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
                          {
                            importe: 0,
                            moneda: current.venta.moneda,
                            forma_pago: "",
                            caja: ""
                          }
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
                      Este carrito tiene riesgo Almundo: el ingreso del cliente entra ahora a Caja;
                      la deuda con Almundo se cancelará luego desde Riesgos.
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
                    <FieldLabel>Venta Ábaco</FieldLabel>

                    <div className="font-black text-[#111827]">{draft.venta.numero_carrito}</div>

                    <div className="text-[#64748b]">
                      {draft.venta.servicio} · {draft.venta.destinos.join(", ")}
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
                      <span>Promo</span>
                      <strong>{formatMoneyAR(promocode, draft.venta.moneda)}</strong>
                    </div>

                    <div className="flex justify-between">
                      <span>Final</span>
                      <strong>{formatMoneyAR(totalFinal, draft.venta.moneda)}</strong>
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
                      Queda en Carritos: {visibleEnCarritos ? "SÍ" : "NO · Va a Cta Cte"}
                    </div>

                    {draft.pagoParcial ? (
                      <div className="font-black text-amber-700">
                        Ingreso a gastos: {formatDateAR(draft.fechaIngresoGastos)}
                      </div>
                    ) : null}

                    <div className="font-black text-[#111827]">
                      Riesgo Almundo: {draft.riesgo ? "SÍ" : "NO"}
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
                {saving ? "Creando..." : "Crear carrito"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function CarritoDetailModal({
  carrito,
  vendedores,
  sucursales,
  onClose
}: {
  carrito: Carrito;
  vendedores: ProfileLite[];
  sucursales: { id: string; nombre: string }[];
  onClose: () => void;
}) {
  const abacoUrl = `https://abaco.almundo.com/bo/cart/${carrito.numero_carrito}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-4xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              Carrito {carrito.numero_carrito}
            </h2>

            <p className="text-xs text-[#64748b]">
              {carrito.clientes?.nombre_completo || "Sin cliente"} ·{" "}
              {carrito.destino || "Sin destino"}
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
              {carrito.clientes?.nombre_completo || "—"}
            </div>

            <div className="text-xs text-[#64748b]">{carrito.clientes?.telefono || "—"}</div>
            <div className="text-xs text-[#64748b]">{carrito.clientes?.email || "Sin email"}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Viaje</FieldLabel>

            <div className="text-sm font-black text-[#111827]">{carrito.destino || "—"}</div>

            <div className="text-xs text-[#64748b]">
              {formatDateAR(carrito.fecha_in)} →{" "}
              {carrito.solo_ida ? "Solo ida" : formatDateAR(carrito.fecha_out)}
            </div>

            <div className="mt-1 text-xs text-[#64748b]">
              {carrito.servicio || "Sin servicio"}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Total</FieldLabel>

            <div className="text-sm font-black text-[#111827]">
              {formatMoneyAR(carrito.importe_final ?? carrito.importe, carrito.moneda)}
            </div>

            <div className="text-xs text-[#64748b]">{carrito.estado}</div>

            {carrito.riesgo ? (
              <div className="mt-2 inline-flex rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                RIESGO
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#475569]">
            <div className="mb-3">
              <FieldLabel>Vendedor</FieldLabel>

              <SellerBadge
                vendedorId={carrito.vendedor_id}
                vendedorNombre={carrito.vendedor}
                vendedores={vendedores}
              />
            </div>

  <div className="mb-2">
  Sucursal:{" "}
  <strong>
    {sucursales.find((sucursal) => sucursal.id === carrito.sucursal_id)?.nombre || "—"}
  </strong>
</div>

            <div className="mb-2">
              Método contacto: <strong>{carrito.metodo_contacto || "—"}</strong>
            </div>

            <div className="mb-2">
              Forma de pago: <strong>{carrito.forma_pago || "—"}</strong>
            </div>

            <div>
              Riesgo: <strong>{carrito.riesgo ? "SÍ" : "NO"}</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#475569]">
            <div className="mb-2 flex justify-between gap-3">
              <span>Bruto</span>
              <strong>{formatMoneyAR(carrito.importe_bruto, carrito.moneda)}</strong>
            </div>

            <div className="mb-2 flex justify-between gap-3">
              <span>Promo</span>
              <strong>{formatMoneyAR(carrito.promocode_importe, carrito.moneda)}</strong>
            </div>

            <div className="mb-2 flex justify-between gap-3">
              <span>Final</span>
              <strong>
                {formatMoneyAR(carrito.importe_final ?? carrito.importe, carrito.moneda)}
              </strong>
            </div>

            <div className="mb-2 flex justify-between gap-3">
              <span>Pagado</span>
              <strong>{formatMoneyAR(carrito.total_pagado, carrito.moneda)}</strong>
            </div>

            <div className="flex justify-between gap-3 border-t border-black/10 pt-2">
              <span>Saldo</span>
              <strong
                className={parseMoney(carrito.saldo_cta_cte) > 0 ? "text-red-600" : "text-green-700"}
              >
                {formatMoneyAR(carrito.saldo_cta_cte, carrito.moneda)}
              </strong>
            </div>
          </div>
        </div>

        {carrito.riesgo ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
            <strong>Motivo riesgo:</strong> {carrito.riesgo_motivo || "Sin motivo cargado"}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => window.open(abacoUrl, "_blank")}
            className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
          >
            Abrir Ábaco
          </button>
        </div>
      </div>
    </div>
  );
}

export function CarritosPanel() {
  const loading = useCarritosStore((state) => state.loading);
  const saving = useCarritosStore((state) => state.saving);
  const error = useCarritosStore((state) => state.error);
  const currentProfile = useCarritosStore((state) => state.currentProfile);
  const canManageCarritos = useCarritosStore((state) => state.canManageCarritos);
  const filters = useCarritosStore((state) => state.filters);
  const catalogos = useCarritosStore((state) => state.catalogos);
  const selectedCarritoId = useCarritosStore((state) => state.selectedCarritoId);

  const loadCarritos = useCarritosStore((state) => state.loadCarritos);
  const setFilter = useCarritosStore((state) => state.setFilter);
  const setMonthFilter = useCarritosStore((state) => state.setMonthFilter);
  const goToPreviousMonth = useCarritosStore((state) => state.goToPreviousMonth);
  const goToNextMonth = useCarritosStore((state) => state.goToNextMonth);
  const goToCurrentMonth = useCarritosStore((state) => state.goToCurrentMonth);
  const clearError = useCarritosStore((state) => state.clearError);
  const selectCarrito = useCarritosStore((state) => state.selectCarrito);
  const toggleCarritoActivo = useCarritosStore((state) => state.toggleCarritoActivo);
  const sendToControl = useCarritosStore((state) => state.sendToControl);

  const getFilteredCarritos = useCarritosStore((state) => state.getFilteredCarritos);
  const getMetrics = useCarritosStore((state) => state.getMetrics);

  const carritos = getFilteredCarritos();
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailCarrito, setDetailCarrito] = useState<Carrito | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const selectedCarrito = useMemo(
    () => carritos.find((carrito) => carrito.id === selectedCarritoId) || carritos[0] || null,
    [carritos, selectedCarritoId]
  );

  useEffect(() => {
    loadCarritos();
  }, [loadCarritos]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function refreshAfterPeriodChange(action: () => void) {
    action();

    window.setTimeout(() => {
      loadCarritos();
    }, 0);
  }

  async function handleToggle(carrito: Carrito) {
    const ok = await toggleCarritoActivo(carrito);

    if (ok) showToast(carrito.activo ? "Carrito desactivado." : "Carrito activado.");
  }

  async function handleSendToControl(carrito: Carrito) {
    if (["EN_CONTROL", "CONTROLADO", "FACTURADO", "COBRADO"].includes(carrito.estado)) {
      showToast("Este carrito ya fue enviado a control o ya fue controlado.", "error");
      return;
    }

    const ok = await sendToControl(carrito);

    if (ok) showToast("Carrito enviado a control.");
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

  const riesgoOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    { value: "riesgo", label: "Con riesgo" },
    { value: "normal", label: "Sin riesgo" }
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
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Carritos</h1>

          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            ALMUNDO
          </span>

          <span className="text-xs font-semibold text-[#64748b]">
            {canManageCarritos
              ? "Carga de ventas Almundo"
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
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={15} className="text-nostur-orange" />

                <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#475569]">
                  Filtros
                </h2>

                <span className="text-[11px] font-semibold text-nostur-orange">
                  Mes operativo obligatorio
                </span>

                <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                  {filters.periodMode === "mes" ? "Vista mensual" : "Rango manual"}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                {filters.periodMode === "mes"
                  ? `${formatMonthLabel(filters.month)} · ${filters.desde} → ${filters.hasta}`
                  : `Rango reportes · ${filters.desde} → ${filters.hasta}`}{" "}
                · Estado: {filters.estado === "todos" ? "Todos" : filters.estado} · Riesgo:{" "}
                {filters.riesgo}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => refreshAfterPeriodChange(goToPreviousMonth)}
                className="flex h-8 items-center rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white"
              >
                Mes anterior
              </button>

              <button
                type="button"
                className="flex h-8 items-center rounded-xl bg-[#111827] px-4 text-[11px] font-black text-white shadow-sm"
              >
                {formatMonthLabel(filters.month)}
              </button>

              <button
                type="button"
                onClick={() => refreshAfterPeriodChange(goToNextMonth)}
                className="flex h-8 items-center rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white"
              >
                Mes siguiente
              </button>

              <button
                type="button"
                onClick={() => refreshAfterPeriodChange(goToCurrentMonth)}
                className="flex h-8 items-center rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                Este mes
              </button>

              <button
                type="button"
                onClick={loadCarritos}
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
                Nuevo carrito
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-nostur-orange/20 bg-white/70 p-2">
                  <div>
                    <FieldLabel>Desde reportes</FieldLabel>

                    <NosturDateInput
                      value={filters.desde}
                      onChange={(value) => setFilter("desde", value)}
                    />
                  </div>

                  <div>
                    <FieldLabel>Hasta reportes</FieldLabel>

                    <NosturDateInput
                      value={filters.hasta}
                      onChange={(value) => setFilter("hasta", value)}
                    />
                  </div>

                  <div className="col-span-2 rounded-xl bg-nostur-orange/10 px-3 py-2 text-[10px] font-bold text-[#92400e]">
                    Si tocás Desde/Hasta, la consulta pasa a modo rango manual para reportes. Para
                    volver a operación normal usá “Este mes”.
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

                {canManageCarritos ? (
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
                  <FieldLabel>Riesgo</FieldLabel>

                  <NosturSelect
                    value={filters.riesgo}
                    onChange={(value) => setFilter("riesgo", value as typeof filters.riesgo)}
                    options={riesgoOptions}
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

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
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
                  onClick={() => {
                    setMonthFilter(filters.month);
                    window.setTimeout(loadCarritos, 0);
                  }}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Usar mes operativo
                </button>

                <button
                  type="button"
                  onClick={loadCarritos}
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
          <CardMetric label="Carritos" value={metrics.carritos} icon={ShoppingCart} />
          <CardMetric label="Total venta" value={formatMoneyAR(metrics.totalVenta)} icon={FileText} />
          <CardMetric label="Pagado" value={formatMoneyAR(metrics.totalPagado)} icon={CheckCircle2} />
          <CardMetric label="Saldo" value={formatMoneyAR(metrics.saldo)} icon={AlertTriangle} />
          <CardMetric label="Riesgos" value={metrics.riesgos} icon={AlertTriangle} />
          <CardMetric label="En control" value={metrics.enControl} icon={Eye} />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Listado de carritos</h2>

                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${carritos.length} carritos cargados`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando carritos...
              </div>
            ) : carritos.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay carritos para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {carritos.map((carrito) => {
                  const selected = selectedCarrito?.id === carrito.id;
                  const cliente = carrito.clientes;
                const tieneSaldo = parseMoney(carrito.saldo_cta_cte) > 0.009;
const estaInactivo = carrito.activo === false;

                  return (
                    <div
                      key={carrito.id}
                      onClick={() => selectCarrito(carrito.id)}
                    className={[
  "grid min-w-0 cursor-pointer gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[1.4fr_1.2fr_1.1fr_140px_150px]",
  selected
    ? "border-nostur-orange/50 bg-nostur-orange/10"
    : estaInactivo
      ? "border-black/10 bg-[#f8fafc] opacity-60 hover:bg-white"
      : "border-black/10 bg-[#f8fafc] hover:bg-white"
].join(" ")}
                      title={
                        estaInactivo
                          ? "Carrito inactivo"
                          : tieneSaldo
                            ? "Carrito con saldo pendiente / Cta Cte"
                            : "Carrito sin saldo pendiente"
                      }
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

                        <div className="mt-1">
                          <SellerBadge
                            vendedorId={carrito.vendedor_id}
                            vendedorNombre={carrito.vendedor}
                            vendedores={catalogos.vendedores}
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {carrito.destino || "Sin destino"}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          {formatDateAR(carrito.fecha_in)} →{" "}
                          {carrito.solo_ida ? "Solo ida" : formatDateAR(carrito.fecha_out)}
                        </div>

                        <div className="truncate text-[11px] text-[#64748b]">
                          {carrito.servicio || "Sin servicio"} ·{" "}
                          {carrito.metodo_contacto || "Sin método"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">
                          {formatMoneyAR(carrito.importe_final ?? carrito.importe, carrito.moneda)}
                        </div>

                       <div className="text-[11px] text-[#64748b]">
  Pagado {formatMoneyAR(carrito.total_pagado, carrito.moneda)}
</div>

{tieneSaldo ? (
  <div className="text-[11px] font-black text-[#64748b]">
    Saldo {formatMoneyAR(carrito.saldo_cta_cte, carrito.moneda)}
  </div>
) : null} 
                      </div>

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#334155]">
                          {carrito.estado}
                        </span>

                        {tieneSaldo ? (
                          <span className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">
                            CTA CTE
                          </span>
                        ) : null}

                        {carrito.riesgo ? (
                          <span className="rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black text-red-700">
                            RIESGO
                          </span>
                        ) : null}

                        {estaInactivo ? (
                          <span className="rounded-xl border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                            INACTIVO
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDetailCarrito(carrito);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(
                              `https://abaco.almundo.com/bo/cart/${carrito.numero_carrito}`,
                              "_blank"
                            );
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title="Abrir Ábaco"
                        >
                          <ShoppingCart size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSendToControl(carrito);
                          }}
                          className={[
                            "flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white",
                            ["EN_CONTROL", "CONTROLADO", "FACTURADO", "COBRADO"].includes(
                              carrito.estado
                            )
                              ? "text-green-600 opacity-60"
                              : "text-nostur-orange"
                          ].join(" ")}
                          title={
                            ["EN_CONTROL", "CONTROLADO", "FACTURADO", "COBRADO"].includes(
                              carrito.estado
                            )
                              ? "Ya fue enviado a control o ya fue controlado"
                              : "Enviar a control"
                          }
                        >
                          <CheckCircle2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggle(carrito);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title={carrito.activo ? "Desactivar" : "Activar"}
                        >
                          {carrito.activo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
            {selectedCarrito ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white">
                      {getInitials(selectedCarrito.clientes?.nombre_completo || "C")}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-[#111827]">
                        {selectedCarrito.numero_carrito}
                      </h2>

                      <p className="truncate text-xs text-[#64748b]">
                        {selectedCarrito.clientes?.nombre_completo || "Sin cliente"}
                      </p>
                    </div>
                  </div>

                  {selectedCarrito.riesgo ? (
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
                        {selectedCarrito.clientes?.nombre_completo || "Sin cliente"}
                      </span>
                    </div>

                    <div className="text-[#64748b]">
                      {selectedCarrito.clientes?.telefono || "—"}
                    </div>

                    <div className="text-[#64748b]">
                      {selectedCarrito.clientes?.email || "Sin email"}
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Vendedor</FieldLabel>

                    <SellerBadge
                      vendedorId={selectedCarrito.vendedor_id}
                      vendedorNombre={selectedCarrito.vendedor}
                      vendedores={catalogos.vendedores}
                    />
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Viaje</FieldLabel>

                    <div className="font-black text-[#111827]">
                      {selectedCarrito.destino || "Sin destino"}
                    </div>

                    <div className="text-[#64748b]">
                      {formatDateAR(selectedCarrito.fecha_in)} →{" "}
                      {selectedCarrito.solo_ida
                        ? "Solo ida"
                        : formatDateAR(selectedCarrito.fecha_out)}
                    </div>

                    <div className="mt-1 text-[#64748b]">
                      {selectedCarrito.servicio || "Sin servicio"} ·{" "}
                      {selectedCarrito.metodo_contacto || "Sin método"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Importes</FieldLabel>

                    <div className="flex justify-between">
                      <span>Bruto</span>

                      <strong>
                        {formatMoneyAR(selectedCarrito.importe_bruto, selectedCarrito.moneda)}
                      </strong>
                    </div>

                    <div className="flex justify-between">
                      <span>Promo</span>

                      <strong>
                        {formatMoneyAR(selectedCarrito.promocode_importe, selectedCarrito.moneda)}
                      </strong>
                    </div>

                    <div className="flex justify-between">
                      <span>Final</span>

                      <strong>
                        {formatMoneyAR(
                          selectedCarrito.importe_final ?? selectedCarrito.importe,
                          selectedCarrito.moneda
                        )}
                      </strong>
                    </div>

                    <div className="flex justify-between">
                      <span>Pagado</span>

                      <strong>
                        {formatMoneyAR(selectedCarrito.total_pagado, selectedCarrito.moneda)}
                      </strong>
                    </div>

                    <div className="mt-1 flex justify-between border-t border-black/10 pt-1">
                      <span>Saldo</span>

                      <strong
                        className={
                          parseMoney(selectedCarrito.saldo_cta_cte) > 0.009
                            ? "text-amber-700"
                            : "text-green-700"
                        }
                      >
                        {formatMoneyAR(selectedCarrito.saldo_cta_cte, selectedCarrito.moneda)}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailCarrito(selectedCarrito)}
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Ver
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          `https://abaco.almundo.com/bo/cart/${selectedCarrito.numero_carrito}`,
                          "_blank"
                        )
                      }
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Ábaco
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendToControl(selectedCarrito)}
                      disabled={
                        saving ||
                        ["EN_CONTROL", "CONTROLADO", "FACTURADO", "COBRADO"].includes(
                          selectedCarrito.estado
                        )
                      }
                      className="h-10 rounded-xl border border-nostur-orange/25 bg-nostur-orange/10 text-xs font-black text-nostur-orange hover:bg-nostur-orange/15 disabled:opacity-50"
                    >
                      Enviar a control
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggle(selectedCarrito)}
                      disabled={saving}
                      className="h-10 rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {selectedCarrito.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná un carrito para ver el detalle.
              </div>
            )}
          </aside>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {wizardOpen ? (
        <CarritoWizard
          onClose={() => setWizardOpen(false)}
          onSaved={(message) => showToast(message)}
        />
      ) : null}

{detailCarrito ? (
  <CarritoDetailModal
    carrito={detailCarrito}
    vendedores={catalogos.vendedores}
    sucursales={catalogos.sucursales}
    onClose={() => setDetailCarrito(null)}
  />
) : null} 
    </div>
  );
}

