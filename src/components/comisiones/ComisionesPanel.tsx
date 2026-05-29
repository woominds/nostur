import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  Filter,
  RefreshCcw,
  Search,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
  Wallet,
  X
} from "lucide-react";
import {
  useComisionesStore,
  type ComisionMensual,
  type MatrizVendedorAnual,
  type VentaComision
} from "../../store/comisionesStore";

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type TabKey = "mis-comisiones" | "todos" | "matriz";
type MatrizMetric = "utilidad" | "facturacion";

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

const MONTH_SHORT_NAMES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const normalized = String(value || "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUsd(value: string | number | null | undefined): string {
  const parsed = parseMoney(value);

  return `USD ${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsed)}`;
}

function formatUsdCompact(value: string | number | null | undefined): string {
  const parsed = parseMoney(value);

  if (!parsed) return "—";

  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(parsed);
}

function formatPct(value: string | number | null | undefined): string {
  const parsed = parseMoney(value);

  return `${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsed)}%`;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function getNivelType(nivel: string): "ok" | "pending" | "danger" | "neutral" {
  if (nivel === "LOGRADO") return "ok";
  if (nivel === "MEDIO") return "neutral";
  if (nivel === "PISO") return "pending";
  return "danger";
}

function getNivelLabel(nivel: string): string {
  const labels: Record<string, string> = {
    SIN_META: "Sin meta",
    PISO: "Piso",
    MEDIO: "Medio",
    LOGRADO: "Logrado"
  };

  return labels[nivel] || nivel;
}

function getOrigenLabel(origen: string): string {
  if (origen === "CARRITO") return "Carrito";
  if (origen === "FILE") return "File";
  return origen;
}

function getMonthLabel(mes: string, anio: string): string {
  const index = Number(mes) - 1;
  return `${MONTH_NAMES[index] || mes} ${anio}`;
}

function getVentaFacturacion(venta: VentaComision): number {
  return parseMoney(venta.facturacion_usd);
}

function getVentaPorcentajeBruto(venta: VentaComision): number {
  const utilidad = parseMoney(venta.utilidad_usd);
  const facturacion = getVentaFacturacion(venta);

  if (facturacion <= 0) return 0;

  return (utilidad / facturacion) * 100;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
      {children}
    </label>
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
    neutral: "border-blue-200 bg-blue-50 text-blue-700"
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

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string | number;
  icon: typeof Target;
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

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-black/10">
      <div
        className="h-full rounded-full bg-nostur-orange transition-all"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Target;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 items-center gap-2 rounded-xl px-3 text-[11px] font-black transition",
        active ? "bg-nostur-orange text-white shadow-sm" : "bg-white/80 text-[#334155] hover:bg-white"
      ].join(" ")}
    >
      <Icon size={13} strokeWidth={1.8} />
      {label}
    </button>
  );
}

function VentaCard({ venta }: { venta: VentaComision }) {
  const facturacion = getVentaFacturacion(venta);
  const porcentajeBruto = getVentaPorcentajeBruto(venta);

  return (
    <div className="grid min-w-0 gap-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-left transition hover:bg-white lg:grid-cols-[1fr_1.2fr_1fr_1fr_110px]">
      <div className="min-w-0">
        <div className="truncate text-xs font-black text-[#111827]">{venta.numero}</div>
        <div className="truncate text-[11px] font-black text-nostur-orange">
          {getOrigenLabel(venta.origen)}
        </div>
        <div className="truncate text-[10px] text-[#64748b]">{formatDate(venta.fecha)}</div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-xs font-black text-[#111827]">
          {venta.pasajero || "Sin pasajero"}
        </div>
        <div className="truncate text-[11px] text-[#64748b]">
          {venta.vendedor || "Sin vendedor"}
        </div>
        <div className="truncate text-[10px] text-[#64748b]">
          {venta.sucursal_nombre || "Sin sucursal"}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-xs font-black text-[#111827]">{formatUsd(facturacion)}</div>
        <div className="text-[11px] text-[#64748b]">Facturación</div>
      </div>

      <div className="min-w-0">
        <div className="text-xs font-black text-green-700">
          {formatUsd(venta.utilidad_usd)}
        </div>
        <div className="text-[11px] text-[#64748b]">Utilidad</div>
      </div>

      <div className="text-right">
        <div className="text-xs font-black text-nostur-orange">
          {formatPct(porcentajeBruto)}
        </div>
        <div className="text-[11px] text-[#64748b]">% bruto</div>
      </div>
    </div>
  );
}

function SelectedSellerPanel({
  selected
}: {
  selected: ComisionMensual | null;
}) {
  if (!selected) {
    return (
      <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
          Seleccioná un vendedor para ver el resumen de comisión.
        </div>
      </aside>
    );
  }

  const avance = parseMoney(selected.porcentaje_avance_piso);

  return (
    <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-[#111827]">
            {selected.vendedor || "Sin vendedor"}
          </h2>
          <p className="mt-0.5 text-xs text-[#64748b]">
            {selected.sucursal || "Sin sucursal"} · {String(selected.mes).padStart(2, "0")}/
            {selected.anio}
          </p>
        </div>

        <StatusBadge type={getNivelType(selected.nivel_alcanzado)}>
          {getNivelLabel(selected.nivel_alcanzado)}
        </StatusBadge>
      </div>

      <div className="grid gap-4 text-xs">
        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
          <FieldLabel>Avance de meta mensual</FieldLabel>
          <div className="mb-2 flex justify-between gap-3">
            <strong className="text-[#111827]">{formatUsd(selected.utilidad_total_usd)}</strong>
            <span className="font-black text-nostur-orange">{formatPct(avance)}</span>
          </div>
          <ProgressBar value={avance} />
          <div className="mt-2 text-[#64748b]">
            Faltan <strong>{formatUsd(selected.falta_para_piso_usd)}</strong> para piso.
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
            <FieldLabel>Piso</FieldLabel>
            <div className="font-black text-[#111827]">{formatUsd(selected.meta_piso_usd)}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
            <FieldLabel>Medio</FieldLabel>
            <div className="font-black text-[#111827]">{formatUsd(selected.meta_medio_usd)}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
            <FieldLabel>Logrado</FieldLabel>
            <div className="font-black text-[#111827]">
              {formatUsd(selected.meta_logrado_usd)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-green-800">
          <FieldLabel>Comisión estimada</FieldLabel>
          <div className="text-lg font-black">{formatUsd(selected.comision_estimada_usd)}</div>
          <div className="text-[11px] font-bold">
            Porcentaje aplicado: {formatPct(selected.porcentaje_comision)}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
          <FieldLabel>Detalle por origen</FieldLabel>
          <div className="flex justify-between gap-3">
            <span>Utilidad carritos</span>
            <strong>{formatUsd(selected.utilidad_carritos_usd)}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span>Utilidad files</span>
            <strong>{formatUsd(selected.utilidad_files_usd)}</strong>
          </div>
          <div className="mt-2 flex justify-between gap-3 border-t border-black/10 pt-2">
            <span className="font-black text-[#111827]">Utilidad total</span>
            <strong className="text-nostur-orange">{formatUsd(selected.utilidad_total_usd)}</strong>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
          <FieldLabel>Resumen de comisiones</FieldLabel>

          <div className="grid gap-2">
            <div className="rounded-xl border border-black/10 bg-white p-2">
              <div className="flex justify-between gap-3">
                <span className="text-[#64748b]">Nivel</span>
                <StatusBadge type={getNivelType(selected.nivel_alcanzado)}>
                  {getNivelLabel(selected.nivel_alcanzado)}
                </StatusBadge>
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-2">
              <div className="flex justify-between gap-3">
                <span className="text-[#64748b]">Utilidad total</span>
                <strong>{formatUsd(selected.utilidad_total_usd)}</strong>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#64748b]">Facturación total</span>
                <strong>{formatUsd(selected.facturacion_total_usd)}</strong>
              </div>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-2 text-green-800">
              <div className="flex justify-between gap-3">
                <span className="font-black">Comisión estimada</span>
                <strong>{formatUsd(selected.comision_estimada_usd)}</strong>
              </div>
              <div className="mt-1 text-[11px] font-bold">
                Porcentaje aplicado: {formatPct(selected.porcentaje_comision)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function VendedorResumenCard({
  item,
  selected,
  onSelect
}: {
  item: ComisionMensual;
  selected: boolean;
  onSelect: () => void;
}) {
  const avance = parseMoney(item.porcentaje_avance_piso);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "rounded-[22px] border p-4 text-left transition",
        selected
          ? "border-nostur-orange/60 bg-nostur-orange/10 shadow-sm"
          : "border-black/10 bg-white/70 hover:bg-white"
      ].join(" ")}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[#111827]">
            {item.vendedor || "Sin vendedor"}
          </div>
          <div className="truncate text-[11px] font-bold text-[#64748b]">
            {item.sucursal || "Sin sucursal"}
          </div>
        </div>

        <StatusBadge type={getNivelType(item.nivel_alcanzado)}>
          {getNivelLabel(item.nivel_alcanzado)}
        </StatusBadge>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-2">
          <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            Utilidad
          </div>
          <div className="text-xs font-black text-green-700">
            {formatUsd(item.utilidad_total_usd)}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-2">
          <div className="text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            Facturación
          </div>
          <div className="text-xs font-black text-[#111827]">
            {formatUsd(item.facturacion_total_usd)}
          </div>
        </div>
      </div>

      <div className="mb-2 flex justify-between gap-3 text-[11px] font-bold">
        <span className="text-[#64748b]">Avance piso</span>
        <span className="text-nostur-orange">{formatPct(avance)}</span>
      </div>

      <ProgressBar value={avance} />

      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="font-black text-[#64748b]">PISO</div>
          <div className="font-black text-[#111827]">{formatUsd(item.meta_piso_usd)}</div>
        </div>
        <div>
          <div className="font-black text-[#64748b]">MEDIO</div>
          <div className="font-black text-[#111827]">{formatUsd(item.meta_medio_usd)}</div>
        </div>
        <div>
          <div className="font-black text-[#64748b]">LOGRADO</div>
          <div className="font-black text-[#111827]">{formatUsd(item.meta_logrado_usd)}</div>
        </div>
      </div>
    </button>
  );
}

function MatrizAnual({ matriz }: { matriz: MatrizVendedorAnual[] }) {
  const [metric, setMetric] = useState<MatrizMetric>("utilidad");

  const totalsByMonth = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;

    return matriz.reduce((total, vendedor) => {
      const value =
        metric === "utilidad"
          ? vendedor.meses[month]?.utilidad_usd || 0
          : vendedor.meses[month]?.facturacion_usd || 0;

      return total + value;
    }, 0);
  });

  const grandTotal = totalsByMonth.reduce((total, value) => total + value, 0);

  return (
    <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-[#111827]">Matriz anual de vendedores</h2>
          <p className="text-[11px] text-[#64748b]">
            Progreso mensual por vendedor: utilidad y facturación en USD.
          </p>
        </div>

        <div className="flex h-9 overflow-hidden rounded-2xl border border-black/10 bg-white/80 p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setMetric("utilidad")}
            className={[
              "rounded-xl px-3 text-[11px] font-black transition",
              metric === "utilidad"
                ? "bg-[#111827] text-white"
                : "text-[#64748b] hover:bg-white hover:text-[#111827]"
            ].join(" ")}
          >
            Utilidad bruta
          </button>

          <button
            type="button"
            onClick={() => setMetric("facturacion")}
            className={[
              "rounded-xl px-3 text-[11px] font-black transition",
              metric === "facturacion"
                ? "bg-[#111827] text-white"
                : "text-[#64748b] hover:bg-white hover:text-[#111827]"
            ].join(" ")}
          >
            Facturación total
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-2xl border border-black/10 bg-[#f8fafc]">
        <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-black/10 bg-white/70 text-[10px] uppercase tracking-wide text-[#64748b]">
              <th className="sticky left-0 z-10 min-w-[210px] bg-white/95 px-3 py-2">Vendedor</th>
              {MONTH_SHORT_NAMES.map((month) => (
                <th key={month} className="min-w-[82px] px-3 py-2 text-right">
                  {month}
                </th>
              ))}
              <th className="min-w-[105px] bg-white/80 px-3 py-2 text-right">Total</th>
            </tr>
          </thead>

          <tbody>
            {matriz.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-3 py-6 text-center text-[#64748b]">
                  Sin datos anuales para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              matriz.map((vendedor) => {
                const rowTotal =
                  metric === "utilidad"
                    ? vendedor.total_utilidad_usd
                    : vendedor.total_facturacion_usd;

                return (
                  <tr key={vendedor.vendedor_id} className="border-b border-black/5 last:border-0">
                    <td className="sticky left-0 z-10 bg-[#f8fafc] px-3 py-2">
                      <div className="font-black text-[#111827]">
                        {vendedor.vendedor || "Sin vendedor"}
                      </div>
                      <div className="text-[10px] font-bold text-[#64748b]">
                        {vendedor.sucursal || "Sin sucursal"}
                      </div>
                    </td>

                    {Array.from({ length: 12 }, (_, index) => {
                      const month = index + 1;
                      const value =
                        metric === "utilidad"
                          ? vendedor.meses[month]?.utilidad_usd || 0
                          : vendedor.meses[month]?.facturacion_usd || 0;

                      return (
                        <td
                          key={`${vendedor.vendedor_id}-${month}`}
                          className={[
                            "px-3 py-2 text-right font-black",
                            month === new Date().getMonth() + 1
                              ? "bg-nostur-orange/10 text-[#111827]"
                              : "text-[#334155]"
                          ].join(" ")}
                        >
                          {formatUsdCompact(value)}
                        </td>
                      );
                    })}

                    <td className="bg-white/80 px-3 py-2 text-right font-black text-[#111827]">
                      {formatUsdCompact(rowTotal)}
                    </td>
                  </tr>
                );
              })
            )}

            {matriz.length > 0 ? (
              <tr className="border-t border-black/10 bg-white/80">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-black text-[#111827]">
                  TOTAL
                </td>

                {totalsByMonth.map((value, index) => (
                  <td key={index} className="px-3 py-2 text-right font-black text-[#111827]">
                    {formatUsdCompact(value)}
                  </td>
                ))}

                <td className="px-3 py-2 text-right font-black text-nostur-orange">
                  {formatUsdCompact(grandTotal)}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl border border-black/10 bg-white/70 p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={15} className="text-nostur-orange" />
          <h3 className="text-xs font-black text-[#111827]">
            Lectura rápida de {metric === "utilidad" ? "utilidad bruta" : "facturación total"}
          </h3>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {matriz.slice(0, 4).map((vendedor) => {
            const total =
              metric === "utilidad"
                ? vendedor.total_utilidad_usd
                : vendedor.total_facturacion_usd;

            return (
              <div key={vendedor.vendedor_id} className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <div className="truncate text-xs font-black text-[#111827]">
                  {vendedor.vendedor || "Sin vendedor"}
                </div>
                <div className="truncate text-[10px] font-bold text-[#64748b]">
                  {vendedor.sucursal || "Sin sucursal"}
                </div>
                <div className="mt-2 text-sm font-black text-nostur-orange">
                  {formatUsd(total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ComisionesPanel() {
  const loading = useComisionesStore((state) => state.loading);
  const error = useComisionesStore((state) => state.error);
  const currentProfile = useComisionesStore((state) => state.currentProfile);
  const canManageComisiones = useComisionesStore((state) => state.canManageComisiones);
  const filters = useComisionesStore((state) => state.filters);
  const catalogos = useComisionesStore((state) => state.catalogos);
  const selectedVendedorId = useComisionesStore((state) => state.selectedVendedorId);

  const loadComisiones = useComisionesStore((state) => state.loadComisiones);
  const setFilter = useComisionesStore((state) => state.setFilter);
  const clearError = useComisionesStore((state) => state.clearError);
  const selectVendedor = useComisionesStore((state) => state.selectVendedor);

  const getMensualFiltrado = useComisionesStore((state) => state.getMensualFiltrado);
  const getSemanalFiltrado = useComisionesStore((state) => state.getSemanalFiltrado);
  const getVentasFiltradas = useComisionesStore((state) => state.getVentasFiltradas);
  const getSelectedMensual = useComisionesStore((state) => state.getSelectedMensual);
  const getMetrics = useComisionesStore((state) => state.getMetrics);
  const getMatrizAnual = useComisionesStore((state) => state.getMatrizAnual);

  const mensual = getMensualFiltrado();
  const semanal = getSemanalFiltrado();
  const ventas = getVentasFiltradas();
  const matrizAnual = getMatrizAnual();
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("mis-comisiones");
  const [toast, setToast] = useState<ToastState>(null);

  const selectedMensual = useMemo(
    () => getSelectedMensual(),
    [mensual, selectedVendedorId, getSelectedMensual]
  );

  useEffect(() => {
    loadComisiones();
  }, [loadComisiones]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  const monthOptions: SelectOption[] = MONTH_NAMES.map((month, index) => ({
    value: String(index + 1).padStart(2, "0"),
    label: month
  }));

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

  const selectedVentas = selectedMensual
    ? ventas.filter((venta) => venta.vendedor_id === selectedMensual.vendedor_id)
    : ventas;

  const myWeekly = selectedMensual
    ? semanal.find((item) => item.vendedor_id === selectedMensual.vendedor_id) || null
    : semanal[0] || null;

  const visibleMensual = activeTab === "mis-comisiones" && currentProfile
    ? mensual.filter((item) => item.vendedor_id === currentProfile.id)
    : mensual;

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Comisiones</h1>

          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            {canManageComisiones ? "GERENCIA" : "MI PANEL"}
          </span>

          <span className="text-xs font-semibold text-[#64748b]">
            {canManageComisiones
              ? "Comisiones, metas y matriz de vendedores"
              : `Comisiones de ${currentProfile?.nombre || "tu usuario"}`}
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
                  {getMonthLabel(filters.mes, filters.anio)}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Mes: {filters.mes}/{filters.anio} · Vendedor: {filters.vendedorId} · Sucursal:{" "}
                {filters.sucursalId}
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={loadComisiones}
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_90px_1fr_1fr]">
                <div>
                  <FieldLabel>Mes</FieldLabel>
                  <NosturSelect
                    value={filters.mes}
                    onChange={(value) => setFilter("mes", value)}
                    options={monthOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Año</FieldLabel>
                  <input
                    value={filters.anio}
                    onChange={(event) =>
                      setFilter("anio", event.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="2026"
                    inputMode="numeric"
                    className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
                  />
                </div>

                {canManageComisiones ? (
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

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por vendedor, sucursal, pasajero, carrito o file..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    loadComisiones();
                    showToast("Comisiones actualizadas.");
                  }}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Aplicar filtros
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Vendedores" value={metrics.vendedores} icon={UsersRound} />
          <MetricCard label="Utilidad" value={formatUsd(metrics.utilidadTotalUsd)} icon={TrendingUp} />
          <MetricCard
            label="Facturación"
            value={formatUsd(metrics.facturacionTotalUsd)}
            icon={BarChart3}
          />
          <MetricCard
            label="Comisión"
            value={formatUsd(metrics.comisionTotalUsd)}
            icon={CircleDollarSign}
          />
          <MetricCard label="Logrados" value={metrics.logrados} icon={Trophy} />
          <MetricCard label="Sin meta" value={metrics.sinMeta} icon={Target} />
        </section>

        <section className="relative z-0 mb-4 flex flex-wrap items-center gap-2">
          <TabButton
            active={activeTab === "mis-comisiones"}
            icon={Wallet}
            label="Mis comisiones"
            onClick={() => {
              setActiveTab("mis-comisiones");
              if (currentProfile?.id) selectVendedor(currentProfile.id);
            }}
          />

          {canManageComisiones ? (
            <>
              <TabButton
                active={activeTab === "todos"}
                icon={UsersRound}
                label="Todos los vendedores"
                onClick={() => {
                  setActiveTab("todos");
                  selectVendedor(null);
                }}
              />
              <TabButton
                active={activeTab === "matriz"}
                icon={CalendarDays}
                label="Matriz"
                onClick={() => {
                  setActiveTab("matriz");
                  selectVendedor(null);
                }}
              />
            </>
          ) : null}
        </section>

        {activeTab === "matriz" && canManageComisiones ? (
          <MatrizAnual matriz={matrizAnual} />
        ) : activeTab === "todos" && canManageComisiones ? (
          <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
            <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-[#111827]">Progreso por vendedor</h2>
                  <p className="text-[11px] text-[#64748b]">
                    {loading ? "Cargando..." : `${visibleMensual.length} vendedores encontrados`}
                  </p>
                </div>

                <div className="rounded-xl bg-white/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                  {getMonthLabel(filters.mes, filters.anio)}
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                  Cargando vendedores...
                </div>
              ) : visibleMensual.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                  No hay vendedores con datos para el período seleccionado.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleMensual.map((item) => (
                    <VendedorResumenCard
                      key={item.vendedor_id}
                      item={item}
                      selected={selectedMensual?.vendedor_id === item.vendedor_id}
                      onSelect={() => selectVendedor(item.vendedor_id)}
                    />
                  ))}
                </div>
              )}
            </section>

            <SelectedSellerPanel selected={selectedMensual} />
          </div>
        ) : (
          <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
            <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-[#111827]">
                    Últimas ventas del vendedor
                  </h2>
                  <p className="text-[11px] text-[#64748b]">
                    {loading ? "Cargando..." : `${selectedVentas.length} ventas encontradas`}
                  </p>
                </div>

                {myWeekly ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-right text-[11px]">
                    <div className="font-black text-blue-700">Meta semanal</div>
                    <div className="font-black text-blue-900">
                      {formatUsd(myWeekly.utilidad_semana_usd)} /{" "}
                      {formatUsd(myWeekly.meta_unica_usd)}
                    </div>
                  </div>
                ) : null}
              </div>

              {loading ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                  Cargando ventas...
                </div>
              ) : selectedVentas.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                  No hay ventas para el vendedor y período seleccionados.
                </div>
              ) : (
                <div className="grid gap-2">
                  {selectedVentas.map((venta) => (
                    <VentaCard key={`${venta.origen}-${venta.origen_id}`} venta={venta} />
                  ))}
                </div>
              )}
            </section>

            <SelectedSellerPanel selected={selectedMensual} />
          </div>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}