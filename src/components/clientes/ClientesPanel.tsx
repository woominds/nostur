import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Edit3,
  Eye,
  FileText,
  Filter,
  Mail,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  ToggleLeft,
  ToggleRight,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { NosturDateInput, NosturDateRangePicker } from "../ui/NosturDateInput";
import { formatMoneyAR } from "../../lib/formatters";
import {
  useClientesStore,
  type Carrito,
  type CarritoInput,
  type ClienteConCarritos,
  type ClienteInput
} from "../../store/clientesStore";

type ModalMode =
  | "cliente-create"
  | "cliente-edit"
  | "carrito-create"
  | "carrito-edit"
  | "carrito-view"
  | "detalle";

type ToastState = { type: "success" | "error"; message: string } | null;

type SelectOption = {
  value: string;
  label: string;
};

const MONEDA_OPTIONS: SelectOption[] = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
];

const CARRITO_ESTADO_OPTIONS: SelectOption[] = [
  { value: "NUEVO", label: "Nuevo" },
  { value: "CONTROLADO", label: "Controlado" },
  { value: "FACTURADO", label: "Facturado" },
  { value: "COBRADO", label: "Cobrado" },
  { value: "CANCELADO", label: "Cancelado" }
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

  const clean = value.slice(0, 10);
  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function isDateBefore(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a < b;
}



function parseMoney(value: string): number {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getImporteNumber(value: string | number | null | undefined): number {
  const parsed = Number(value || 0);
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

function getLastCarrito(cliente: ClienteConCarritos): Carrito | null {
  return cliente.carritos[0] || null;
}

function getClienteTotal(cliente: ClienteConCarritos): number {
  return cliente.carritos.reduce(
    (total, carrito) => total + getImporteNumber(carrito.importe),
    0
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
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
      className="min-h-[96px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
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
  icon: typeof UsersRound;
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

function ClienteModal({
  cliente,
  onClose,
  onSaved
}: {
  cliente?: ClienteConCarritos | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const saving = useClientesStore((state) => state.saving);
  const saveCliente = useClientesStore((state) => state.saveCliente);
  const currentProfile = useClientesStore((state) => state.currentProfile);
  const canManageClientes = useClientesStore((state) => state.canManageClientes);
  const vendedores = useClientesStore((state) => state.vendedores);
  const sucursales = useClientesStore((state) => state.sucursales);

  const [form, setForm] = useState<ClienteInput>(() => ({
    id: cliente?.id,
    nombre_completo: cliente?.nombre_completo || "",
    telefono: cliente?.telefono || "",
    email: cliente?.email || "",
    origen: cliente?.origen || "",
    vendedor_id: cliente?.vendedor_id || currentProfile?.id || "",
    sucursal_id: cliente?.sucursal_id || currentProfile?.sucursal_id || "",
    activo: cliente?.activo ?? true
  }));

  function setField<K extends keyof ClienteInput>(key: K, value: ClienteInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await saveCliente(form);

    if (ok) {
      onSaved(cliente ? "Cliente actualizado correctamente." : "Cliente creado correctamente.");
      onClose();
    }
  }

  const vendedorOptions: SelectOption[] = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: `${vendedor.nombre} ${vendedor.apellido}`.trim()
  }));

  const sucursalOptions: SelectOption[] = [
    { value: "", label: "Sin sucursal" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-16 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100vh-96px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {cliente ? "Editar cliente" : "Nuevo cliente"}
            </h2>
            <p className="text-xs text-[#64748b]">Carátula comercial del cliente.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Nombre completo *</FieldLabel>
            <TextInput
              value={form.nombre_completo}
              onChange={(value) => setField("nombre_completo", value)}
              placeholder="Nombre y apellido"
            />
          </div>

          <div>
            <FieldLabel>Teléfono *</FieldLabel>
            <TextInput
              value={form.telefono}
              onChange={(value) => setField("telefono", value)}
              placeholder="+549..."
              inputMode="tel"
            />
          </div>

          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput
              value={form.email || ""}
              onChange={(value) => setField("email", value)}
              placeholder="cliente@email.com"
              inputMode="email"
            />
          </div>

          <div>
            <FieldLabel>Origen</FieldLabel>
            <TextInput
              value={form.origen || ""}
              onChange={(value) => setField("origen", value)}
              placeholder="Retail, Referido, Aivo..."
            />
          </div>

          {canManageClientes ? (
            <>
              <div>
                <FieldLabel>Vendedor</FieldLabel>
                <NosturSelect
                  value={form.vendedor_id || ""}
                  onChange={(value) => setField("vendedor_id", value || null)}
                  options={vendedorOptions}
                />
              </div>

              <div>
                <FieldLabel>Sucursal</FieldLabel>
                <NosturSelect
                  value={form.sucursal_id || ""}
                  onChange={(value) => setField("sucursal_id", value || null)}
                  options={sucursalOptions}
                />
              </div>
            </>
          ) : null}

          <div className="md:col-span-2">
            <BooleanChip
              checked={form.activo ?? true}
              onChange={(value) => setField("activo", value)}
              label="Cliente activo"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving || !form.nombre_completo.trim() || !form.telefono.trim()}
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
function CarritoModal({
  cliente,
  carrito,
  onClose,
  onSaved
}: {
  cliente: ClienteConCarritos;
  carrito?: Carrito | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const saving = useClientesStore((state) => state.saving);
  const saveCarrito = useClientesStore((state) => state.saveCarrito);
  const currentProfile = useClientesStore((state) => state.currentProfile);
  const canManageClientes = useClientesStore((state) => state.canManageClientes);
  const vendedores = useClientesStore((state) => state.vendedores);
  const sucursales = useClientesStore((state) => state.sucursales);

  const [form, setForm] = useState<CarritoInput>(() => ({
    id: carrito?.id,
    cliente_id: cliente.id,
    numero_carrito: carrito?.numero_carrito || "",
    fecha_venta: carrito?.fecha_venta || getToday(),
    servicio: carrito?.servicio || "",
    metodo_contacto: carrito?.metodo_contacto || cliente.origen || "",
    forma_pago: carrito?.forma_pago || "",
    destino: carrito?.destino || "",
    fecha_in: carrito?.fecha_in || getToday(),
    fecha_out: carrito?.fecha_out || getToday(),
    solo_ida: carrito?.solo_ida || false,
    importe: getImporteNumber(carrito?.importe),
    moneda: carrito?.moneda || "ARS",
    estado: carrito?.estado || "NUEVO",
    observaciones: carrito?.observaciones || "",
    vendedor_id: carrito?.vendedor_id || cliente.vendedor_id || currentProfile?.id || "",
    sucursal_id: carrito?.sucursal_id || cliente.sucursal_id || currentProfile?.sucursal_id || ""
  }));

  const [importeDisplay, setImporteDisplay] = useState(
    carrito
      ? new Intl.NumberFormat("es-AR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(getImporteNumber(carrito.importe))
      : ""
  );

  function setField<K extends keyof CarritoInput>(key: K, value: CarritoInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await saveCarrito({
      ...form,
      importe: parseMoney(importeDisplay)
    });

    if (ok) {
      onSaved(carrito ? "Carrito actualizado correctamente." : "Carrito creado correctamente.");
      onClose();
    }
  }

  const vendedorOptions: SelectOption[] = vendedores.map((vendedor) => ({
    value: vendedor.id,
    label: `${vendedor.nombre} ${vendedor.apellido}`.trim()
  }));

  const sucursalOptions: SelectOption[] = [
    { value: "", label: "Sin sucursal" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-16 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100vh-96px)] w-full max-w-5xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {carrito ? "Editar carrito" : "Nuevo carrito"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Cliente: <strong>{cliente.nombre_completo}</strong>
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

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-[#475569]">
              Datos de venta
            </h3>

            <div className="grid gap-3">
              <div>
                <FieldLabel>Número de carrito *</FieldLabel>
                <TextInput
                  value={form.numero_carrito}
                  onChange={(value) => setField("numero_carrito", value)}
                  placeholder="210-485-162"
                />
              </div>

              <div>
                <FieldLabel>Fecha de venta</FieldLabel>
                <NosturDateInput
                  value={form.fecha_venta || ""}
                  onChange={(value) => setField("fecha_venta", value)}
                />
              </div>

              <div>
                <FieldLabel>Servicio</FieldLabel>
                <TextInput
                  value={form.servicio || ""}
                  onChange={(value) => setField("servicio", value)}
                  placeholder="Aéreo, Hotel, Paquete..."
                />
              </div>

              <div>
                <FieldLabel>Destino</FieldLabel>
                <TextInput
                  value={form.destino || ""}
                  onChange={(value) => setField("destino", value)}
                  placeholder="Bariloche, Madrid..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Importe</FieldLabel>
                  <TextInput
                    value={importeDisplay}
                    onChange={setImporteDisplay}
                    placeholder="61.148,00"
                    inputMode="decimal"
                  />
                </div>

                <div>
                  <FieldLabel>Moneda</FieldLabel>
                  <NosturSelect
                    value={form.moneda || "ARS"}
                    onChange={(value) => setField("moneda", value)}
                    options={MONEDA_OPTIONS}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-4 text-xs font-black uppercase tracking-[0.14em] text-[#475569]">
              Viaje y gestión
            </h3>

            <div className="grid gap-3">
              <NosturDateRangePicker
                startValue={form.fecha_in || ""}
                endValue={form.fecha_out || ""}
                min={getToday()}
                disabledEnd={Boolean(form.solo_ida)}
                onStartChange={(value) => {
                  setField("fecha_in", value);

                  if (form.fecha_out && value && isDateBefore(form.fecha_out, value)) {
                    setField("fecha_out", value);
                  }
                }}
                onEndChange={(value) => setField("fecha_out", value)}
              />

              <BooleanChip
                checked={Boolean(form.solo_ida)}
                onChange={(value) => {
                  setField("solo_ida", value);

                  if (value) {
                    setField("fecha_out", null);
                  } else if (!form.fecha_out) {
                    setField("fecha_out", form.fecha_in || getToday());
                  }
                }}
                label="Solo ida"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Método contacto</FieldLabel>
                  <TextInput
                    value={form.metodo_contacto || ""}
                    onChange={(value) => setField("metodo_contacto", value)}
                    placeholder="Retail, referido..."
                  />
                </div>

                <div>
                  <FieldLabel>Forma de pago</FieldLabel>
                  <TextInput
                    value={form.forma_pago || ""}
                    onChange={(value) => setField("forma_pago", value)}
                    placeholder="Efectivo, transferencia..."
                  />
                </div>
              </div>

              <div>
                <FieldLabel>Estado</FieldLabel>
                <NosturSelect
                  value={form.estado || "NUEVO"}
                  onChange={(value) => setField("estado", value)}
                  options={CARRITO_ESTADO_OPTIONS}
                />
              </div>

              {canManageClientes ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Vendedor</FieldLabel>
                    <NosturSelect
                      value={form.vendedor_id || ""}
                      onChange={(value) => setField("vendedor_id", value || null)}
                      options={vendedorOptions}
                    />
                  </div>

                  <div>
                    <FieldLabel>Sucursal</FieldLabel>
                    <NosturSelect
                      value={form.sucursal_id || ""}
                      onChange={(value) => setField("sucursal_id", value || null)}
                      options={sucursalOptions}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <FieldLabel>Observaciones</FieldLabel>
                <TextArea
                  value={form.observaciones || ""}
                  onChange={(value) => setField("observaciones", value)}
                  placeholder="Notas comerciales o de control..."
                />
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving || !form.numero_carrito.trim()}
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {saving ? "Guardando..." : carrito ? "Actualizar carrito" : "Guardar carrito"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CarritoDetalleModal({
  cliente,
  carrito,
  onClose,
  onEdit,
  onToggle
}: {
  cliente: ClienteConCarritos;
  carrito: Carrito;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const abacoUrl = `https://abaco.almundo.com/bo/cart/${carrito.numero_carrito}`;

  return (
    <div className="fixed inset-0 z-[220] flex items-start justify-center bg-black/25 px-4 pt-16 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-96px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              Carrito {carrito.numero_carrito}
            </h2>
            <p className="text-xs text-[#64748b]">
              Cliente: <strong>{cliente.nombre_completo}</strong>
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
            <FieldLabel>Venta</FieldLabel>
            <div className="text-sm font-black text-[#111827]">
              {formatDateAR(carrito.fecha_venta)}
            </div>
            <div className="mt-1 text-xs font-semibold text-[#64748b]">{carrito.estado}</div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Destino</FieldLabel>
            <div className="text-sm font-black text-[#111827]">
              {carrito.destino || "Sin destino"}
            </div>
            <div className="mt-1 text-xs font-semibold text-[#64748b]">
              {formatDateAR(carrito.fecha_in)} →{" "}
              {carrito.solo_ida ? "Solo ida" : formatDateAR(carrito.fecha_out)}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <FieldLabel>Importe</FieldLabel>
            <div className="text-sm font-black text-[#111827]">
              {formatMoneyAR(getImporteNumber(carrito.importe), carrito.moneda)}
            </div>
            <div className="mt-1 text-xs font-semibold text-[#64748b]">
              {carrito.activo ? "Activo" : "Inactivo"}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#475569]">
            <div className="mb-2">
              Servicio: <strong>{carrito.servicio || "—"}</strong>
            </div>
            <div className="mb-2">
              Método contacto: <strong>{carrito.metodo_contacto || "—"}</strong>
            </div>
            <div className="mb-2">
              Forma de pago: <strong>{carrito.forma_pago || "—"}</strong>
            </div>
            <div>
              Vendedor: <strong>{carrito.vendedor || "—"}</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-xs font-semibold text-[#475569]">
            <FieldLabel>Observaciones</FieldLabel>
            <div className="whitespace-pre-wrap text-[#334155]">
              {carrito.observaciones || "Sin observaciones"}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => window.open(abacoUrl, "_blank")}
            className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
          >
            Abrir en Ábaco
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="h-9 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-600 hover:bg-red-100"
          >
            {carrito.activo ? "Desactivar" : "Activar"}
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="h-9 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white hover:bg-nostur-orangeSoft"
          >
            Editar carrito
          </button>
        </div>
      </div>
    </div>
  );
}
function DetalleModal({
  cliente,
  onClose,
  onEdit,
  onNewCarrito,
  onViewCarrito,
  onEditCarrito,
  onToggleCarrito
}: {
  cliente: ClienteConCarritos;
  onClose: () => void;
  onEdit: () => void;
  onNewCarrito: () => void;
  onViewCarrito: (carrito: Carrito) => void;
  onEditCarrito: (carrito: Carrito) => void;
  onToggleCarrito: (carrito: Carrito) => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-6xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              Detalle del Cliente: {cliente.nombre_completo}
            </h2>
            <p className="text-xs text-[#64748b]">
              Carátula, datos principales e historial de carritos.
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

        <section className="mb-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white">
                {getInitials(cliente.nombre_completo)}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-black text-[#111827]">
                  {cliente.nombre_completo}
                </div>
                <div className="truncate text-xs text-[#64748b]">
                  {cliente.origen || "Sin origen"}
                </div>
              </div>
            </div>

            <div className="grid gap-1 text-xs font-semibold text-[#475569]">
              <div>
                Teléfono: <strong>{cliente.telefono}</strong>
              </div>
              <div>
                Email: <strong>{cliente.email || "—"}</strong>
              </div>
              <div>
                Alta: <strong>{formatDateAR(cliente.created_at)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
              Gestión
            </h3>
            <div className="grid gap-1 text-xs font-semibold text-[#475569]">
              <div>
                Vendedor: <strong>{cliente.vendedor || "—"}</strong>
              </div>
              <div>
                Estado: <strong>{cliente.activo ? "Activo" : "Inactivo"}</strong>
              </div>
              <div>
                Carritos: <strong>{cliente.carritos.length}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
            <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
              Totales
            </h3>
            <div className="text-lg font-black text-[#111827]">
              {formatMoneyAR(getClienteTotal(cliente), cliente.carritos[0]?.moneda || "ARS")}
            </div>
            <div className="text-[11px] font-semibold text-[#64748b]">Total histórico</div>
          </div>

          <div className="grid gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="h-9 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
            >
              Editar
            </button>

            <button
              type="button"
              onClick={onNewCarrito}
              className="h-9 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white hover:bg-nostur-orangeSoft"
            >
              Nuevo carrito
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#111827]">Historial de carritos</h3>
              <p className="text-[11px] text-[#64748b]">
                {cliente.carritos.length} registros asociados.
              </p>
            </div>
          </div>

          {cliente.carritos.length === 0 ? (
            <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
              Este cliente todavía no tiene carritos.
            </div>
          ) : (
            <div className="grid gap-2">
              {cliente.carritos.map((carrito) => (
                <div
                  key={carrito.id}
                  className="grid min-w-0 gap-3 rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs lg:grid-cols-[120px_1fr_1fr_1fr_120px_110px_132px]"
                >
                  <div>
                    <div className="font-black text-[#111827]">{carrito.numero_carrito}</div>
                    <div className="text-[#64748b]">{formatDateAR(carrito.fecha_venta)}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-black text-[#111827]">
                      {carrito.destino || "Sin destino"}
                    </div>
                    <div className="truncate text-[#64748b]">
                      {formatDateAR(carrito.fecha_in)} →{" "}
                      {carrito.solo_ida ? "Solo ida" : formatDateAR(carrito.fecha_out)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#111827]">
                      {carrito.servicio || "Sin servicio"}
                    </div>
                    <div className="truncate text-[#64748b]">
                      {carrito.metodo_contacto || "Sin método"}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#111827]">
                      {carrito.forma_pago || "Sin forma pago"}
                    </div>
                    <div className="truncate text-[#64748b]">
                      {carrito.vendedor || "Sin vendedor"}
                    </div>
                  </div>

                  <div className="font-black text-[#111827]">
                    {formatMoneyAR(getImporteNumber(carrito.importe), carrito.moneda)}
                  </div>

                  <div>
                    <span className="rounded-xl border border-black/10 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#334155]">
                      {carrito.estado}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onViewCarrito(carrito)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                      title="Ver carrito"
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditCarrito(carrito)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                      title="Editar carrito"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleCarrito(carrito)}
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white",
                        carrito.activo ? "text-red-500" : "text-green-600"
                      ].join(" ")}
                      title={carrito.activo ? "Desactivar carrito" : "Activar carrito"}
                    >
                      {carrito.activo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ClientesPanel() {
  const loading = useClientesStore((state) => state.loading);
  const saving = useClientesStore((state) => state.saving);
  const error = useClientesStore((state) => state.error);
  const currentProfile = useClientesStore((state) => state.currentProfile);
  const canManageClientes = useClientesStore((state) => state.canManageClientes);

  const filters = useClientesStore((state) => state.filters);
  const vendedores = useClientesStore((state) => state.vendedores);
  const sucursales = useClientesStore((state) => state.sucursales);

  const loadClientes = useClientesStore((state) => state.loadClientes);
  const setFilter = useClientesStore((state) => state.setFilter);
  const clearError = useClientesStore((state) => state.clearError);
  const selectCliente = useClientesStore((state) => state.selectCliente);
  const selectedClienteId = useClientesStore((state) => state.selectedClienteId);
  const toggleClienteActivo = useClientesStore((state) => state.toggleClienteActivo);
  const toggleCarritoActivo = useClientesStore((state) => state.toggleCarritoActivo);

  const getFilteredClientes = useClientesStore((state) => state.getFilteredClientes);
  const getMetrics = useClientesStore((state) => state.getMetrics);

  const clientes = getFilteredClientes();
  const metrics = getMetrics();

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalCliente, setModalCliente] = useState<ClienteConCarritos | null>(null);
  const [modalCarrito, setModalCarrito] = useState<Carrito | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === selectedClienteId) || clientes[0] || null,
    [clientes, selectedClienteId]
  );

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function openCreateCliente() {
    setModalCliente(null);
    setModalCarrito(null);
    setModalMode("cliente-create");
  }

  function openEditCliente(cliente: ClienteConCarritos) {
    setModalCliente(cliente);
    setModalCarrito(null);
    setModalMode("cliente-edit");
  }

  function openNewCarrito(cliente: ClienteConCarritos) {
    setModalCliente(cliente);
    setModalCarrito(null);
    setModalMode("carrito-create");
  }

  function openEditCarrito(cliente: ClienteConCarritos, carrito: Carrito) {
    setModalCliente(cliente);
    setModalCarrito(carrito);
    setModalMode("carrito-edit");
  }

  function openViewCarrito(cliente: ClienteConCarritos, carrito: Carrito) {
    setModalCliente(cliente);
    setModalCarrito(carrito);
    setModalMode("carrito-view");
  }

  async function handleToggleCarrito(carrito: Carrito) {
    const ok = await toggleCarritoActivo(carrito);

    if (ok) {
      showToast(
        carrito.activo
          ? "Carrito desactivado correctamente."
          : "Carrito activado correctamente."
      );
    }
  }

  function openDetalle(cliente: ClienteConCarritos) {
    setModalCliente(cliente);
    setModalCarrito(null);
    setModalMode("detalle");
  }

  function closeModal() {
    setModalMode(null);
    setModalCliente(null);
    setModalCarrito(null);
  }

  const vendedorFilterOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    ...vendedores.map((vendedor) => ({
      value: vendedor.id,
      label: `${vendedor.nombre} ${vendedor.apellido}`.trim()
    }))
  ];

  const sucursalFilterOptions: SelectOption[] = [
    { value: "todos", label: "Todas" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  const activoFilterOptions: SelectOption[] = [
    { value: "activos", label: "Activos" },
    { value: "inactivos", label: "Inactivos" },
    { value: "todos", label: "Todos" }
  ];

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Clientes</h1>

          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            CRM
          </span>

          <span className="text-xs font-semibold text-[#64748b]">
            {canManageClientes
              ? "Carátulas e historial de ventas"
              : `Clientes asignados a ${currentProfile?.nombre || "tu usuario"}`}
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
                  Período obligatorio
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                {filters.desde} → {filters.hasta} · Activo: {filters.activo}
              </div>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={loadClientes}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={openCreateCliente}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={13} strokeWidth={1.8} />
                Nuevo cliente
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr_1fr]">
                <NosturDateRangePicker
                  startValue={filters.desde}
                  endValue={filters.hasta}
                  onStartChange={(value) => {
                    setFilter("desde", value);

                    if (filters.hasta && value && isDateBefore(filters.hasta, value)) {
                      setFilter("hasta", value);
                    }
                  }}
                  onEndChange={(value) => setFilter("hasta", value)}
                />

                {canManageClientes ? (
                  <>
                    <div>
                      <FieldLabel>Vendedor</FieldLabel>
                      <NosturSelect
                        value={filters.vendedorId}
                        onChange={(value) => setFilter("vendedorId", value)}
                        options={vendedorFilterOptions}
                      />
                    </div>

                    <div>
                      <FieldLabel>Sucursal</FieldLabel>
                      <NosturSelect
                        value={filters.sucursalId}
                        onChange={(value) => setFilter("sucursalId", value)}
                        options={sucursalFilterOptions}
                      />
                    </div>
                  </>
                ) : null}

                <div>
                  <FieldLabel>Activo</FieldLabel>
                  <NosturSelect
                    value={filters.activo}
                    onChange={(value) => setFilter("activo", value as typeof filters.activo)}
                    options={activoFilterOptions}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por nombre, teléfono, email, carrito o destino..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadClientes}
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
          <CardMetric label="Clientes" value={metrics.clientes} icon={UsersRound} />
          <CardMetric label="Activos" value={metrics.activos} icon={CheckCircle2} />
          <CardMetric label="Con carritos" value={metrics.conCarritos} icon={ShoppingCart} />
          <CardMetric label="Carritos" value={metrics.carritos} icon={FileText} />
          <CardMetric label="Total" value={formatMoneyAR(metrics.totalHistorico)} icon={ShoppingCart} />
          <CardMetric label="Ticket prom." value={formatMoneyAR(metrics.ticketPromedio)} icon={FileText} />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Listado de clientes</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${clientes.length} clientes encontrados`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando clientes...
              </div>
            ) : clientes.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay clientes para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {clientes.map((cliente) => {
                  const selected = selectedCliente?.id === cliente.id;
                  const lastCarrito = getLastCarrito(cliente);

                  return (
                    <button
                      key={cliente.id}
                      type="button"
                      onClick={() => selectCliente(cliente.id)}
                      className={[
                        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[1.4fr_1fr_1.2fr_120px_135px]",
                        selected
                          ? "border-nostur-orange/50 bg-nostur-orange/10"
                          : "border-black/10 bg-[#f8fafc] hover:bg-white"
                      ].join(" ")}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nostur-orange text-xs font-black text-white">
                          {getInitials(cliente.nombre_completo)}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-[#111827]">
                            {cliente.nombre_completo}
                          </div>
                          <div className="truncate text-[11px] font-semibold text-[#64748b]">
                            {cliente.telefono}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-[#111827]">
                          {cliente.email || "Sin email"}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {cliente.origen || "Sin origen"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {lastCarrito?.destino || "Sin carritos"}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {lastCarrito
                            ? `${lastCarrito.numero_carrito} · ${formatDateAR(lastCarrito.fecha_venta)}`
                            : "Sin historial"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-black text-[#111827]">
                          {cliente.carritos.length}
                        </div>
                        <div className="text-[11px] text-[#64748b]">carritos</div>
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetalle(cliente);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title="Ver detalle"
                        >
                          <Eye size={14} />
                        </span>

                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditCliente(cliente);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </span>

                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title="Crear presupuesto"
                        >
                          <FileText size={14} />
                        </span>

                        <span
                          onClick={(event) => {
                            event.stopPropagation();
                            openNewCarrito(cliente);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
                          title="Nuevo carrito"
                        >
                          <ShoppingCart size={14} />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
            {selectedCliente ? (
              <>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange text-sm font-black text-white">
                      {getInitials(selectedCliente.nombre_completo)}
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-[#111827]">
                        {selectedCliente.nombre_completo}
                      </h2>
                      <p className="truncate text-xs text-[#64748b]">{selectedCliente.telefono}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditCliente(selectedCliente)}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>

                <div className="grid gap-4 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Phone size={14} className="text-nostur-orange" />
                      <span className="font-black text-[#111827]">{selectedCliente.telefono}</span>
                    </div>

                    <div className="mb-2 flex items-center gap-2">
                      <Mail size={14} className="text-nostur-orange" />
                      <span className="truncate font-semibold text-[#475569]">
                        {selectedCliente.email || "Sin email"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <UserRound size={14} className="text-nostur-orange" />
                      <span className="truncate font-semibold text-[#475569]">
                        {selectedCliente.vendedor || "Sin vendedor"}
                      </span>
                    </div>
                  </div>

                                    <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                      <div className="text-lg font-black text-[#111827]">
                        {selectedCliente.carritos.length}
                      </div>
                      <div className="text-[11px] font-bold text-[#64748b]">Carritos</div>
                    </div>

                    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                      <div className="truncate text-lg font-black text-[#111827]">
                        {formatMoneyAR(
                          getClienteTotal(selectedCliente),
                          selectedCliente.carritos[0]?.moneda || "ARS"
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-[#64748b]">Total</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
                      Último carrito
                    </h3>

                    {getLastCarrito(selectedCliente) ? (
                      <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                        <div className="font-black text-[#111827]">
                          {getLastCarrito(selectedCliente)?.numero_carrito}
                        </div>
                        <div className="text-[#64748b]">
                          {getLastCarrito(selectedCliente)?.destino || "Sin destino"}
                        </div>
                        <div className="text-[#64748b]">
                          {formatDateAR(getLastCarrito(selectedCliente)?.fecha_venta)}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-[#64748b]">
                        Sin carritos.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openDetalle(selectedCliente)}
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Ver detalle
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditCliente(selectedCliente)}
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="h-10 rounded-xl border border-black/10 bg-white text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                      title="Se conecta en la próxima etapa."
                    >
                      Presupuesto
                    </button>

                    <button
                      type="button"
                      onClick={() => openNewCarrito(selectedCliente)}
                      className="h-10 rounded-xl bg-nostur-orange text-xs font-black text-white hover:bg-nostur-orangeSoft"
                    >
                      Nuevo carrito
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleClienteActivo(selectedCliente)}
                      disabled={saving}
                      className="col-span-2 h-10 rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {selectedCliente.activo ? "Desactivar cliente" : "Activar cliente"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná un cliente para ver el detalle.
              </div>
            )}
          </aside>
        </div>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {modalMode === "cliente-create" || modalMode === "cliente-edit" ? (
        <ClienteModal
          cliente={modalCliente}
          onClose={closeModal}
          onSaved={(message) => showToast(message)}
        />
      ) : null}

      {(modalMode === "carrito-create" || modalMode === "carrito-edit") && modalCliente ? (
        <CarritoModal
          cliente={modalCliente}
          carrito={modalMode === "carrito-edit" ? modalCarrito : null}
          onClose={closeModal}
          onSaved={(message) => showToast(message)}
        />
      ) : null}

      {modalMode === "carrito-view" && modalCliente && modalCarrito ? (
        <CarritoDetalleModal
          cliente={modalCliente}
          carrito={modalCarrito}
          onClose={closeModal}
          onEdit={() => setModalMode("carrito-edit")}
          onToggle={() => handleToggleCarrito(modalCarrito)}
        />
      ) : null}

      {modalMode === "detalle" && modalCliente ? (
        <DetalleModal
          cliente={modalCliente}
          onClose={closeModal}
          onEdit={() => setModalMode("cliente-edit")}
          onNewCarrito={() => setModalMode("carrito-create")}
          onViewCarrito={(carrito) => openViewCarrito(modalCliente, carrito)}
          onEditCarrito={(carrito) => openEditCarrito(modalCliente, carrito)}
          onToggleCarrito={(carrito) => handleToggleCarrito(carrito)}
        />
      ) : null}
    </div>
  );
}