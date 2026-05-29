import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  Filter,
  Landmark,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Wallet,
  X
} from "lucide-react";
import {
  createInitialConciliacionDraft,
  createInitialMovimientoDraft,
  createInitialPaseCajaDraft,
  getCajaDisplayName,
  useCajaStore,
  type CajaLite,
  type CajaMovimiento,
  type CajaSaldo,
  type ConciliacionDraft,
  type MovimientoDraft,
  type PaseCajaDraft
} from "../../store/cajaStore";
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

type ModalMode = "movimiento" | "pase" | "conciliacion" | null;
type AnularMovimientoState = CajaMovimiento | null;

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todas" },
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
];

const TIPO_FILTER_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "INGRESO", label: "Ingresos" },
  { value: "EGRESO", label: "Egresos" },
  { value: "PASE_INGRESO", label: "Pases ingreso" },
  { value: "PASE_EGRESO", label: "Pases egreso" },
  { value: "CONCILIACION", label: "Conciliaciones" }
];

const ANULADO_OPTIONS: SelectOption[] = [
  { value: "no", label: "No anulados" },
  { value: "si", label: "Anulados" },
  { value: "todos", label: "Todos" }
];

const MOVIMIENTO_TIPO_OPTIONS: SelectOption[] = [
  { value: "INGRESO", label: "Ingreso" },
  { value: "EGRESO", label: "Egreso" }
];

const CATEGORIA_OPTIONS: SelectOption[] = [
  { value: "Cobro cliente", label: "Cobro cliente" },
  { value: "Pago proveedor", label: "Pago proveedor" },
  { value: "Gastos oficina", label: "Gastos oficina" },
  { value: "Sueldos / adelantos", label: "Sueldos / adelantos" },
  { value: "Impuestos", label: "Impuestos" },
  { value: "Ajuste manual", label: "Ajuste manual" },
  { value: "Otros", label: "Otros" }
];

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
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
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
      className="min-h-[90px] w-full resize-none rounded-xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
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

function TipoBadge({ movimiento }: { movimiento: CajaMovimiento }) {
  const signed = parseMoney(movimiento.importe_con_signo);
  const isIngreso = signed >= 0;

  return (
    <span
      className={[
        "rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide",
        movimiento.anulado
          ? "border-red-200 bg-red-50 text-red-700"
          : isIngreso
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      ].join(" ")}
    >
      {movimiento.anulado ? "ANULADO" : isIngreso ? "INGRESO" : "EGRESO"}
    </span>
  );
}

function CajaCard({
  saldo,
  selected,
  onSelect
}: {
  saldo: CajaSaldo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "rounded-2xl border px-4 py-3 text-left shadow-sm transition",
        selected ? "border-nostur-orange/50 bg-nostur-orange/10" : "border-black/10 bg-white/70 hover:bg-white"
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-black text-[#111827]">{saldo.caja_nombre}</div>

          <div className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            {saldo.caja_tipo} · {saldo.moneda}
          </div>

          <div className="mt-2 text-lg font-black leading-none text-[#111827]">
            {formatMoneyAR(saldo.saldo_actual, saldo.moneda)}
          </div>

          <div className="mt-2 grid gap-0.5 text-[10px] font-semibold text-[#64748b]">
            <div>Últ. mov.: {formatDate(saldo.ultimo_movimiento_fecha)}</div>
            <div>Últ. conc.: {formatDate(saldo.ultima_conciliacion_fecha)}</div>
          </div>
        </div>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-nostur-orange shadow-sm">
          {saldo.caja_tipo === "BANCO" ? <Landmark size={15} /> : <Wallet size={15} />}
        </div>
      </div>
    </button>
  );
}

function MovimientoModal({
  cajas,
  selectedCaja,
  saving,
  onClose,
  onSave
}: {
  cajas: CajaLite[];
  selectedCaja: CajaSaldo | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: MovimientoDraft) => Promise<void>;
}) {
  const cajaDefault = selectedCaja
    ? cajas.find((item) => item.id === selectedCaja.caja_id) || null
    : cajas[0] || null;

  const [draft, setDraft] = useState<MovimientoDraft>(() => createInitialMovimientoDraft(cajaDefault));

  function setField<K extends keyof MovimientoDraft>(key: K, value: MovimientoDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const cajaOptions = cajas.map((caja) => ({
    value: caja.id,
    label: getCajaDisplayName(caja)
  }));

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Nuevo movimiento</h2>
            <p className="text-xs text-[#64748b]">Ingreso o egreso manual de caja.</p>
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
            <FieldLabel>Fecha</FieldLabel>
            <NosturDateInput value={draft.fecha} onChange={(value) => setField("fecha", value)} />
          </div>

          <div>
            <FieldLabel>Tipo</FieldLabel>
            <NosturSelect
              value={draft.tipo}
              onChange={(value) => setField("tipo", value as MovimientoDraft["tipo"])}
              options={MOVIMIENTO_TIPO_OPTIONS}
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Caja</FieldLabel>
            <NosturSelect
              value={draft.caja_id}
              onChange={(value) => {
                const caja = cajas.find((item) => item.id === value);
                setDraft((current) => ({
                  ...current,
                  caja_id: value,
                  moneda: caja?.moneda || current.moneda
                }));
              }}
              options={cajaOptions}
              placeholder="Seleccionar caja"
            />
          </div>

          <div>
            <FieldLabel>Categoría</FieldLabel>
            <NosturSelect
              value={draft.categoria}
              onChange={(value) => setField("categoria", value)}
              options={CATEGORIA_OPTIONS}
              placeholder="Seleccionar categoría"
            />
          </div>

          <div>
            <FieldLabel>Importe</FieldLabel>
            <TextInput
              value={draft.importe}
              onChange={(value) => setField("importe", value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Descripción</FieldLabel>
            <TextInput
              value={draft.descripcion}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Detalle del movimiento"
            />
          </div>

          <div>
            <FieldLabel>Forma de pago</FieldLabel>
            <TextInput
              value={draft.forma_pago}
              onChange={(value) => setField("forma_pago", value)}
              placeholder="Efectivo, transferencia, tarjeta..."
            />
          </div>

          <div>
            <FieldLabel>Referencia</FieldLabel>
            <TextInput
              value={draft.referencia_texto}
              onChange={(value) => setField("referencia_texto", value)}
              placeholder="Comprobante, recibo, nota interna..."
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Observaciones</FieldLabel>
            <TextArea
              value={draft.observaciones}
              onChange={(value) => setField("observaciones", value)}
              placeholder="Detalle adicional del movimiento..."
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
            {saving ? "Guardando..." : "Guardar movimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaseModal({
  cajas,
  saving,
  onClose,
  onSave
}: {
  cajas: CajaLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: PaseCajaDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<PaseCajaDraft>(() => createInitialPaseCajaDraft());

  function setField<K extends keyof PaseCajaDraft>(key: K, value: PaseCajaDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const cajaOptions = cajas.map((caja) => ({
    value: caja.id,
    label: getCajaDisplayName(caja)
  }));

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Pase de caja</h2>
            <p className="text-xs text-[#64748b]">Mueve dinero entre cajas de la misma moneda.</p>
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
            <FieldLabel>Fecha</FieldLabel>
            <NosturDateInput value={draft.fecha} onChange={(value) => setField("fecha", value)} />
          </div>

          <div>
            <FieldLabel>Importe</FieldLabel>
            <TextInput
              value={draft.importe}
              onChange={(value) => setField("importe", value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div>
            <FieldLabel>Caja origen</FieldLabel>
            <NosturSelect
              value={draft.caja_origen_id}
              onChange={(value) => setField("caja_origen_id", value)}
              options={cajaOptions}
              placeholder="Seleccionar origen"
            />
          </div>

          <div>
            <FieldLabel>Caja destino</FieldLabel>
            <NosturSelect
              value={draft.caja_destino_id}
              onChange={(value) => setField("caja_destino_id", value)}
              options={cajaOptions}
              placeholder="Seleccionar destino"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Descripción</FieldLabel>
            <TextInput
              value={draft.descripcion}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Ej: Pase de efectivo a banco"
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
            className="h-9 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Crear pase"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConciliacionModal({
  selectedSaldo,
  saving,
  onClose,
  onSave
}: {
  selectedSaldo: CajaSaldo | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ConciliacionDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ConciliacionDraft>(() => createInitialConciliacionDraft(selectedSaldo));

  function setField<K extends keyof ConciliacionDraft>(key: K, value: ConciliacionDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  const saldoSistema = parseMoney(selectedSaldo?.saldo_actual);
  const saldoReal = parseMoney(draft.saldo_real);
  const diferencia = saldoReal - saldoSistema;

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Conciliar caja</h2>
            <p className="text-xs text-[#64748b]">
              {selectedSaldo ? `${selectedSaldo.caja_nombre} · ${selectedSaldo.moneda}` : "Seleccioná una caja"}
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

        {!selectedSaldo ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
            Seleccioná una caja antes de conciliar.
          </div>
        ) : (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Saldo sistema</FieldLabel>
                <div className="text-sm font-black text-[#111827]">
                  {formatMoneyAR(saldoSistema, selectedSaldo.moneda)}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Saldo real</FieldLabel>
                <div className="text-sm font-black text-[#111827]">
                  {formatMoneyAR(saldoReal, selectedSaldo.moneda)}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Diferencia</FieldLabel>
                <div
                  className={[
                    "text-sm font-black",
                    Math.abs(diferencia) > 0.009 ? "text-red-700" : "text-green-700"
                  ].join(" ")}
                >
                  {formatMoneyAR(diferencia, selectedSaldo.moneda)}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Fecha</FieldLabel>
                <NosturDateInput value={draft.fecha} onChange={(value) => setField("fecha", value)} />
              </div>

              <div>
                <FieldLabel>Saldo real contado</FieldLabel>
                <TextInput
                  value={draft.saldo_real}
                  onChange={(value) => setField("saldo_real", value)}
                  placeholder="0,00"
                  inputMode="decimal"
                />
              </div>

              <div>
                <FieldLabel>Observaciones</FieldLabel>
                <TextArea
                  value={draft.observaciones}
                  onChange={(value) => setField("observaciones", value)}
                  placeholder="Detalle de la conciliación o ajuste..."
                />
              </div>
            </div>
          </>
        )}

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
            disabled={saving || !selectedSaldo}
            onClick={() => onSave(draft)}
            className="h-9 rounded-xl bg-green-600 px-5 text-xs font-black text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Conciliar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MotivoAnulacionModal({
  movimiento,
  saving,
  onClose,
  onConfirm
}: {
  movimiento: CajaMovimiento | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    setMotivo("");
  }, [movimiento?.id]);

  if (!movimiento) return null;

  const canConfirm = motivo.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[280] flex items-start justify-center bg-black/25 px-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#111827]">Anular movimiento</h2>
            <p className="mt-1 text-xs font-semibold text-[#64748b]">
              Indicá el motivo de anulación. Quedará guardado en el historial.
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

        <div className="mb-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs">
          <div className="font-black text-[#111827]">{movimiento.descripcion}</div>
          <div className="mt-0.5 text-[#64748b]">
            {formatDate(movimiento.fecha)} ·{" "}
            {formatMoneyAR(Math.abs(parseMoney(movimiento.importe_con_signo)), movimiento.moneda)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[#64748b]">
            Registrado por: {movimiento.created_by_nombre || "—"}
          </div>
        </div>

        <div>
          <FieldLabel>Motivo</FieldLabel>
          <TextArea
            value={motivo}
            onChange={setMotivo}
            placeholder="Ej: carga duplicada, importe incorrecto, error administrativo..."
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
            {saving ? "Anulando..." : "Anular"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CajaPanel() {
  const loading = useCajaStore((state) => state.loading);
  const saving = useCajaStore((state) => state.saving);
  const error = useCajaStore((state) => state.error);
  const currentProfile = useCajaStore((state) => state.currentProfile);
  const canManageCaja = useCajaStore((state) => state.canManageCaja);
  const cajas = useCajaStore((state) => state.cajas);
  const saldos = useCajaStore((state) => state.saldos);
  const filters = useCajaStore((state) => state.filters);
  const selectedCajaId = useCajaStore((state) => state.selectedCajaId);

  const loadCaja = useCajaStore((state) => state.loadCaja);
  const saveMovimiento = useCajaStore((state) => state.saveMovimiento);
  const savePaseCaja = useCajaStore((state) => state.savePaseCaja);
  const saveConciliacion = useCajaStore((state) => state.saveConciliacion);
  const anularMovimiento = useCajaStore((state) => state.anularMovimiento);
  const setFilter = useCajaStore((state) => state.setFilter);
  const resetFilters = useCajaStore((state) => state.resetFilters);
  const selectCaja = useCajaStore((state) => state.selectCaja);
  const clearError = useCajaStore((state) => state.clearError);

  const getFilteredMovimientos = useCajaStore((state) => state.getFilteredMovimientos);
  const getSelectedSaldo = useCajaStore((state) => state.getSelectedSaldo);
  const getMetrics = useCajaStore((state) => state.getMetrics);

  const movimientos = getFilteredMovimientos();
  const selectedSaldo = useMemo(() => getSelectedSaldo(), [saldos, selectedCajaId, getSelectedSaldo]);
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [movimientoAnular, setMovimientoAnular] = useState<AnularMovimientoState>(null);

  const cajaOptions: SelectOption[] = [
    { value: "todos", label: "Todas" },
    ...cajas.map((caja) => ({
      value: caja.id,
      label: getCajaDisplayName(caja)
    }))
  ];

  useEffect(() => {
    loadCaja();
  }, [loadCaja]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  async function handleSaveMovimiento(draft: MovimientoDraft) {
    const ok = await saveMovimiento(draft);

    if (ok) {
      setModalMode(null);
      showToast("Movimiento guardado correctamente.");
    }
  }

  async function handleSavePase(draft: PaseCajaDraft) {
    const ok = await savePaseCaja(draft);

    if (ok) {
      setModalMode(null);
      showToast("Pase de caja creado correctamente.");
    }
  }

  async function handleSaveConciliacion(draft: ConciliacionDraft) {
    const ok = await saveConciliacion(draft);

    if (ok) {
      setModalMode(null);
      showToast("Caja conciliada correctamente.");
    }
  }

  function handleAnular(movimiento: CajaMovimiento) {
    setMovimientoAnular(movimiento);
  }

  async function confirmAnularMovimiento(motivo: string) {
    if (!movimientoAnular) return;

    const ok = await anularMovimiento(movimientoAnular, motivo);

    if (ok) {
      setMovimientoAnular(null);
      showToast("Movimiento anulado correctamente.");
    }
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Caja</h1>
          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            TESORERÍA
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            {canManageCaja
              ? "Ingresos, egresos, saldos, pases y conciliaciones"
              : `Caja de ${currentProfile?.nombre || "tu usuario"}`}
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
                  {filters.desde} → {filters.hasta}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Moneda: {filters.moneda} · Caja: {filters.cajaId} · Tipo: {filters.tipo} · Anulados:{" "}
                {filters.anulados}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadCaja}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={() => setModalMode("movimiento")}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={13} strokeWidth={1.8} />
                Movimiento
              </button>

              <button
                type="button"
                onClick={() => setModalMode("pase")}
                className="flex h-8 items-center gap-2 rounded-xl bg-blue-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-blue-700"
              >
                <ArrowLeftRight size={13} strokeWidth={1.8} />
                Pase
              </button>

              <button
                type="button"
                onClick={() => setModalMode("conciliacion")}
                className="flex h-8 items-center gap-2 rounded-xl bg-green-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-green-700"
              >
                <Settings2 size={13} strokeWidth={1.8} />
                Conciliar
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_150px_220px_180px_160px]">
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
                  <FieldLabel>Moneda</FieldLabel>
                  <NosturSelect
                    value={filters.moneda}
                    onChange={(value) => setFilter("moneda", value as typeof filters.moneda)}
                    options={MONEDA_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Caja</FieldLabel>
                  <NosturSelect value={filters.cajaId} onChange={(value) => setFilter("cajaId", value)} options={cajaOptions} />
                </div>

                <div>
                  <FieldLabel>Tipo</FieldLabel>
                  <NosturSelect
                    value={filters.tipo}
                    onChange={(value) => setFilter("tipo", value as typeof filters.tipo)}
                    options={TIPO_FILTER_OPTIONS}
                  />
                </div>

                <div>
                  <FieldLabel>Anulados</FieldLabel>
                  <NosturSelect
                    value={filters.anulados}
                    onChange={(value) => setFilter("anulados", value as typeof filters.anulados)}
                    options={ANULADO_OPTIONS}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por caja, categoría, descripción, referencia, vendedor, cliente o registrado por..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadCaja}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Aplicar filtros
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Limpiar
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Saldo ARS" value={formatMoneyAR(metrics.ars, "ARS")} icon={Wallet} tone="blue" />
          <MetricCard label="Saldo USD" value={formatMoneyAR(metrics.usd, "USD")} icon={Wallet} tone="green" />
          <MetricCard label="Cajas activas" value={metrics.cajas} icon={Landmark} />
          <MetricCard label="Movimientos" value={metrics.movimientos} icon={CalendarDays} />
          <MetricCard label="Ingresos ARS" value={formatMoneyAR(metrics.ingresosArs, "ARS")} icon={CircleDollarSign} tone="green" />
          <MetricCard label="Egresos ARS" value={formatMoneyAR(metrics.egresosArs, "ARS")} icon={AlertTriangle} tone="red" />
        </section>

        <section className="relative z-0 mb-4 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          {saldos.map((saldo) => (
            <CajaCard
              key={saldo.caja_id}
              saldo={saldo}
              selected={selectedSaldo?.caja_id === saldo.caja_id}
              onSelect={() => selectCaja(saldo.caja_id)}
            />
          ))}
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Movimientos de caja</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${movimientos.length} movimientos encontrados`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando movimientos...
              </div>
            ) : movimientos.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay movimientos para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {movimientos.map((movimiento) => {
                  const signed = parseMoney(movimiento.importe_con_signo);
                  const isIngreso = signed >= 0;

                  return (
                    <div
                      key={movimiento.id}
                      className={[
                        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition xl:grid-cols-[92px_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_130px_96px]",
                        movimiento.anulado
                          ? "border-red-200 bg-red-50/60"
                          : "border-black/10 bg-[#f8fafc] hover:bg-white"
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#111827]">{formatDate(movimiento.fecha)}</div>
                        <div className="mt-1">
                          <TipoBadge movimiento={movimiento} />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">{movimiento.descripcion}</div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {movimiento.categoria || "Sin categoría"}
                        </div>
                        {movimiento.observaciones ? (
                          <div className="mt-1 line-clamp-2 text-[10px] font-semibold text-[#94a3b8]">
                            Obs.: {movimiento.observaciones}
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {movimiento.caja_nombre || "Sin caja"}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {movimiento.caja_tipo || "—"} · {movimiento.moneda}
                        </div>
                        <div className="truncate text-[10px] font-semibold text-[#94a3b8]">
                          {movimiento.sucursal || "Sin sucursal"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                          Referencia
                        </div>
                        <div className="truncate text-xs font-semibold text-[#334155]">
                          {movimiento.referencia_texto || movimiento.referencia_tipo || "Sin referencia"}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          Origen: {movimiento.origen || "MANUAL"}
                        </div>
                        {movimiento.forma_pago ? (
                          <div className="truncate text-[10px] font-semibold text-[#94a3b8]">
                            Forma pago: {movimiento.forma_pago}
                          </div>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                          Trazabilidad
                        </div>
                        <div className="truncate text-xs font-black text-[#111827]">
                          Vendedor: {movimiento.vendedor_nombre || "—"}
                        </div>
                        <div className="truncate text-[11px] font-semibold text-[#475569]">
                          Cliente: {movimiento.cliente_nombre || "—"}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          Registró: {movimiento.created_by_nombre || "—"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={["text-xs font-black", isIngreso ? "text-green-700" : "text-red-700"].join(" ")}>
                          {formatMoneyAR(Math.abs(signed), movimiento.moneda)}
                        </div>
                        <div className="text-[11px] text-[#64748b]">{isIngreso ? "Suma" : "Resta"}</div>
                      </div>

                      <div className="flex items-center justify-end">
                        {!movimiento.anulado ? (
                          <button
                            type="button"
                            onClick={() => handleAnular(movimiento)}
                            disabled={saving}
                            className="h-8 rounded-xl border border-red-200 bg-red-50 px-3 text-[11px] font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            Anular
                          </button>
                        ) : (
                          <div className="text-right text-[10px] font-bold text-red-700">
                            {movimiento.motivo_anulacion || "Anulado"}
                            {movimiento.anulado_by_nombre ? (
                              <div className="mt-1 text-[10px] font-semibold text-red-500">
                                Por: {movimiento.anulado_by_nombre}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
            {!selectedSaldo ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná una caja.
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[#111827]">{selectedSaldo.caja_nombre}</h2>
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      {selectedSaldo.caja_tipo} · {selectedSaldo.moneda}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nostur-orange/15 text-nostur-orange">
                    {selectedSaldo.caja_tipo === "BANCO" ? <Landmark size={18} /> : <Wallet size={18} />}
                  </div>
                </div>

                <div className="grid gap-3 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>Saldo actual</FieldLabel>
                    <div className="text-2xl font-black text-[#111827]">
                      {formatMoneyAR(selectedSaldo.saldo_actual, selectedSaldo.moneda)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Control</FieldLabel>
                    <div className="flex justify-between gap-3">
                      <span>Último movimiento</span>
                      <strong>{formatDate(selectedSaldo.ultimo_movimiento_fecha)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Última conciliación</span>
                      <strong>{formatDate(selectedSaldo.ultima_conciliacion_fecha)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Saldo conciliado</span>
                      <strong>
                        {selectedSaldo.ultimo_saldo_conciliado === null
                          ? "—"
                          : formatMoneyAR(selectedSaldo.ultimo_saldo_conciliado, selectedSaldo.moneda)}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalMode("movimiento")}
                      className="h-10 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                    >
                      Nuevo movimiento
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalMode("pase")}
                      className="h-10 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 hover:bg-blue-100"
                    >
                      Pase de caja
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalMode("conciliacion")}
                      className="h-10 rounded-xl border border-green-200 bg-green-50 px-4 text-xs font-black text-green-700 hover:bg-green-100"
                    >
                      Conciliar / ajustar saldo
                    </button>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-700">
                    Los ajustes y conciliaciones quedan registrados como movimientos para mantener historial.
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {modalMode === "movimiento" ? (
        <MovimientoModal
          cajas={cajas}
          selectedCaja={selectedSaldo}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSave={handleSaveMovimiento}
        />
      ) : null}

      {modalMode === "pase" ? (
        <PaseModal cajas={cajas} saving={saving} onClose={() => setModalMode(null)} onSave={handleSavePase} />
      ) : null}

      {modalMode === "conciliacion" ? (
        <ConciliacionModal
          selectedSaldo={selectedSaldo}
          saving={saving}
          onClose={() => setModalMode(null)}
          onSave={handleSaveConciliacion}
        />
      ) : null}

      <MotivoAnulacionModal
        movimiento={movimientoAnular}
        saving={saving}
        onClose={() => setMovimientoAnular(null)}
        onConfirm={confirmAnularMovimiento}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}