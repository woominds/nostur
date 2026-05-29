import { useEffect, useMemo, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import {
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Database,
  Eye,
  EyeOff,
  KeyRound,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UploadCloud,
  UserRound,
  X
} from "lucide-react";
import { appRegistry } from "../../registry/appRegistry";
import {
  useConfigStore,
  type AppRole,
  type Caja,
  type CategoriaFinanciera,
  type CategoriaTipo,
  type Destino,
  type FormaPago,
  type MetodoContacto,
  type Operador,
  type Profile,
  type Proveedor,
  type Servicio,
  type Sucursal,
  type UserCredential
} from "../../store/configStore";
import { ImportadorCatalogosPanel } from "./ImportadorCatalogosPanel";

type ConfigTab =
  | "sucursales"
  | "profiles"
  | "metodos_contacto"
  | "destinos"
  | "formas_pago"
  | "cajas"
  | "categorias_financieras"
  | "operadores"
  | "proveedores"
  | "servicios"
  | "credenciales"
  | "importador";

type SelectOption = {
  value: string;
  label: string;
};

type FormState = Record<string, string | boolean | number | null | undefined>;

type NoticeState = {
  type: "info" | "error" | "success";
  title: string;
  message: string;
} | null;

const tabs: Array<{
  id: ConfigTab;
  label: string;
  icon: typeof Building2;
}> = [
  { id: "sucursales", label: "Sucursales", icon: Building2 },
  { id: "profiles", label: "Usuarios", icon: UserRound },
  { id: "metodos_contacto", label: "Métodos", icon: Tag },
  { id: "destinos", label: "Destinos", icon: MapPin },
  { id: "formas_pago", label: "Pagos", icon: CreditCard },
  { id: "cajas", label: "Cajas", icon: Landmark },
  { id: "categorias_financieras", label: "Categorías", icon: CircleDollarSign },
  { id: "operadores", label: "Operadores", icon: BriefcaseBusiness },
  { id: "proveedores", label: "Proveedores", icon: Database },
  { id: "servicios", label: "Servicios", icon: Tag },
  { id: "credenciales", label: "Credenciales", icon: KeyRound },
  { id: "importador", label: "Importador", icon: UploadCloud }
];

const appRoleOptions: SelectOption[] = [
  { value: "vendedor", label: "Vendedor" },
  { value: "administracion", label: "Administración" },
  { value: "gerencia", label: "Gerencia" },
  { value: "admin_general", label: "Admin general" }
];

const categoriaTipoOptions: SelectOption[] = [
  { value: "ingreso", label: "Ingreso" },
  { value: "egreso", label: "Egreso" }
];

const cajaTipoOptions: SelectOption[] = [
  { value: "CAJA", label: "Caja" },
  { value: "BANCO", label: "Banco" },
  { value: "BILLETERA", label: "Billetera" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "ALMUNDO", label: "Almundo" },
  { value: "OTRA", label: "Otra" }
];

const monedaOptions: SelectOption[] = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" }
];

function getInitialForm(tab: ConfigTab): FormState {
  if (tab === "sucursales") {
    return {
      nombre: "",
      color: "#FF6A00",
      activa: true,
      activo: true
    };
  }

  if (tab === "profiles") {
    return {
      id: "",
      nombre: "",
      apellido: "",
      email: "",
      sucursal_id: "",
      rol: "vendedor",
      color: "#FF6A00",
      activo: true
    };
  }

  if (tab === "metodos_contacto") {
    return {
      nombre: "",
      color: "#FF6A00",
      activo: true
    };
  }

  if (tab === "destinos") {
    return {
      nombre: "",
      pais: "Argentina",
      activo: true
    };
  }

  if (tab === "formas_pago") {
    return {
      nombre: "",
      impacta_tesoreria: true,
      activo: true
    };
  }

  if (tab === "cajas") {
    return {
      nombre: "",
      tipo: "CAJA",
      moneda: "ARS",
      sucursal_id: "",
      descripcion: "",
      orden: "100",
      activa: true,
      activo: true
    };
  }

  if (tab === "categorias_financieras") {
    return {
      nombre: "",
      tipo: "egreso",
      activa: true,
      activo: true
    };
  }

  if (tab === "operadores") {
    return {
      nombre: "",
      color: "#FF6A00",
      razon_social: "",
      cuit: "",
      activo: true
    };
  }

  if (tab === "proveedores") {
    return {
      nombre_comercial: "",
      razon_social: "",
      cuit: "",
      telefono: "",
      activo: true
    };
  }

  if (tab === "servicios") {
    return {
      nombre: "",
      color: "#FF6A00",
      activo: true
    };
  }

  if (tab === "credenciales") {
    return {
      service_key: "experts",
      username: "",
      password_encrypted: "",
      autofill_enabled: true,
      auto_submit_enabled: false
    };
  }

  return {};
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getItemName(tab: ConfigTab, item: Record<string, unknown>): string {
  if (tab === "profiles") {
    return `${String(item.nombre || "")} ${String(item.apellido || "")}`.trim();
  }

  if (tab === "proveedores") {
    return String(item.nombre_comercial || "");
  }

  if (tab === "credenciales") {
    const serviceKey = String(item.service_key || "");
    const app = appRegistry.find((registeredApp) => registeredApp.id === serviceKey);
    return app?.name || serviceKey;
  }

  return String(item.nombre || "");
}

function getItemSubtitle(tab: ConfigTab, item: Record<string, unknown>): string {
  if (tab === "profiles") {
    return `${String(item.email || "")} · ${String(item.rol || "")}`;
  }

  if (tab === "destinos") {
    return String(item.pais || "Sin especificar");
  }

  if (tab === "formas_pago") {
    return Boolean(item.impacta_tesoreria) ? "Impacta tesorería" : "No impacta tesorería";
  }

  if (tab === "cajas") {
    return [
      item.tipo || "CAJA",
      item.moneda || "ARS",
      item.descripcion,
      item.orden ? `Orden ${item.orden}` : null
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (tab === "categorias_financieras") {
    return String(item.tipo || "");
  }

  if (tab === "operadores") {
    return [item.razon_social, item.cuit].filter(Boolean).join(" · ");
  }

  if (tab === "proveedores") {
    return [item.razon_social, item.cuit, item.telefono].filter(Boolean).join(" · ");
  }

  if (tab === "credenciales") {
    return String(item.username || "Sin usuario cargado");
  }

  return "";
}

function getIsActive(tab: ConfigTab, item: Record<string, unknown>): boolean {
  if (tab === "sucursales" || tab === "cajas" || tab === "categorias_financieras") {
    return Boolean(item.activa ?? item.activo);
  }

  if (tab === "credenciales") {
    return Boolean(item.autofill_enabled);
  }

  return Boolean(item.activo);
}

function getColor(tab: ConfigTab, item: Record<string, unknown>): string {
  if (typeof item.color === "string" && item.color) {
    return item.color;
  }

  if (tab === "profiles") return "#3b82f6";
  if (tab === "destinos") return "#22c55e";
  if (tab === "formas_pago") return "#f97316";
  if (tab === "cajas") return "#64748b";
  if (tab === "categorias_financieras") return "#a855f7";
  if (tab === "proveedores") return "#0ea5e9";
  if (tab === "credenciales") return "#ff6a00";

  return "#FF6A00";
}

function asString(value: unknown): string {
  return String(value || "");
}

function asBoolean(value: unknown): boolean {
  return Boolean(value);
}

function asNumber(value: unknown, fallback = 100): number {
  const parsed = Number(String(value || "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
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
  type = "text",
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange disabled:opacity-60"
      placeholder={placeholder}
      type={type}
      disabled={disabled}
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
    <div className={["relative", open ? "z-[160]" : "z-0"].join(" ")}>
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

          <div className="absolute left-0 right-0 top-[42px] z-[180] rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
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
          : "border-black/10 bg-white/60 text-[#64748b]"
      ].join(" ")}
    >
      {checked ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
      {label}
    </button>
  );
}

export function ConfigPanel() {
  const loading = useConfigStore((state) => state.loading);
  const saving = useConfigStore((state) => state.saving);
  const error = useConfigStore((state) => state.error);
  const clearError = useConfigStore((state) => state.clearError);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const currentProfile = useConfigStore((state) => state.currentProfile);
  const canManageConfig = useConfigStore((state) => state.canManageConfig);

  const sucursales = useConfigStore((state) => state.sucursales);
  const profiles = useConfigStore((state) => state.profiles);
  const metodosContacto = useConfigStore((state) => state.metodosContacto);
  const destinos = useConfigStore((state) => state.destinos);
  const formasPago = useConfigStore((state) => state.formasPago);
  const cajas = useConfigStore((state) => state.cajas);
  const categoriasFinancieras = useConfigStore((state) => state.categoriasFinancieras);
  const operadores = useConfigStore((state) => state.operadores);
  const proveedores = useConfigStore((state) => state.proveedores);
  const servicios = useConfigStore((state) => state.servicios);
  const userCredentials = useConfigStore((state) => state.userCredentials);

  const upsertSucursal = useConfigStore((state) => state.upsertSucursal);
  const upsertProfile = useConfigStore((state) => state.upsertProfile);
  const upsertMetodoContacto = useConfigStore((state) => state.upsertMetodoContacto);
  const upsertDestino = useConfigStore((state) => state.upsertDestino);
  const upsertFormaPago = useConfigStore((state) => state.upsertFormaPago);
  const upsertCaja = useConfigStore((state) => state.upsertCaja);
  const upsertCategoriaFinanciera = useConfigStore((state) => state.upsertCategoriaFinanciera);
  const upsertOperador = useConfigStore((state) => state.upsertOperador);
  const upsertProveedor = useConfigStore((state) => state.upsertProveedor);
  const upsertServicio = useConfigStore((state) => state.upsertServicio);
  const upsertUserCredential = useConfigStore((state) => state.upsertUserCredential);

  const toggleSucursal = useConfigStore((state) => state.toggleSucursal);
  const toggleProfile = useConfigStore((state) => state.toggleProfile);
  const toggleMetodoContacto = useConfigStore((state) => state.toggleMetodoContacto);
  const toggleDestino = useConfigStore((state) => state.toggleDestino);
  const toggleFormaPago = useConfigStore((state) => state.toggleFormaPago);
  const toggleCaja = useConfigStore((state) => state.toggleCaja);
  const toggleCategoriaFinanciera = useConfigStore((state) => state.toggleCategoriaFinanciera);
  const toggleOperador = useConfigStore((state) => state.toggleOperador);
  const toggleProveedor = useConfigStore((state) => state.toggleProveedor);
  const toggleServicio = useConfigStore((state) => state.toggleServicio);
  const toggleUserCredentialAutofill = useConfigStore((state) => state.toggleUserCredentialAutofill);
  const deleteUserCredential = useConfigStore((state) => state.deleteUserCredential);

  const [activeTab, setActiveTab] = useState<ConfigTab>("sucursales");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => getInitialForm("sucursales"));
  const [showCredentialPassword, setShowCredentialPassword] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!canManageConfig && activeTab !== "credenciales") {
      setActiveTab("credenciales");
      setEditingId(null);
      setForm(getInitialForm("credenciales"));
      setShowCredentialPassword(false);
      setListSearch("");
    }
  }, [canManageConfig, activeTab]);

  const visibleTabs = useMemo(() => {
    if (canManageConfig) return tabs;
    return tabs.filter((tab) => tab.id === "credenciales");
  }, [canManageConfig]);

  const currentItems = useMemo(() => {
    if (activeTab === "sucursales") return sucursales;
    if (activeTab === "profiles") return profiles;
    if (activeTab === "metodos_contacto") return metodosContacto;
    if (activeTab === "destinos") return destinos;
    if (activeTab === "formas_pago") return formasPago;
    if (activeTab === "cajas") return cajas;
    if (activeTab === "categorias_financieras") return categoriasFinancieras;
    if (activeTab === "operadores") return operadores;
    if (activeTab === "proveedores") return proveedores;
    if (activeTab === "servicios") return servicios;
    if (activeTab === "credenciales") return userCredentials;

    return [];
  }, [
    activeTab,
    sucursales,
    profiles,
    metodosContacto,
    destinos,
    formasPago,
    cajas,
    categoriasFinancieras,
    operadores,
    proveedores,
    servicios,
    userCredentials
  ]);

  const filteredItems = useMemo(() => {
    const q = normalizeText(listSearch);

    if (!q) return currentItems;

    return currentItems.filter((rawItem) => {
      const item = rawItem as Record<string, unknown>;

      return normalizeText(
        [
          getItemName(activeTab, item),
          getItemSubtitle(activeTab, item),
          item.email,
          item.nombre,
          item.apellido,
          item.pais,
          item.tipo,
          item.moneda,
          item.descripcion,
          item.razon_social,
          item.cuit,
          item.telefono,
          item.username,
          item.service_key
        ]
          .filter(Boolean)
          .join(" ")
      ).includes(q);
    });
  }, [activeTab, currentItems, listSearch]);

  function showNotice(type: "info" | "error" | "success", title: string, message: string) {
    setNotice({ type, title, message });

    window.setTimeout(() => {
      setNotice(null);
    }, 4200);
  }

  function setField(field: string, value: string | boolean | number | null | undefined) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function resetForm(nextTab = activeTab) {
    setEditingId(null);
    setForm(getInitialForm(nextTab));
    setShowCredentialPassword(false);
    clearError();
  }

  function handleChangeTab(tab: ConfigTab) {
    setActiveTab(tab);
    setListSearch("");
    resetForm(tab);
  }

  function handleEdit(item: Record<string, unknown>) {
    const nextForm: FormState = {};

    Object.entries(item).forEach(([key, value]) => {
      if (
        typeof value === "string" ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        value === null
      ) {
        nextForm[key] = value;
      }
    });

    setEditingId(String(item.id || ""));
    setForm({
      ...getInitialForm(activeTab),
      ...nextForm
    });
    clearError();
  }

  async function handleToggle(item: Record<string, unknown>) {
    if (activeTab === "sucursales") await toggleSucursal(item as Sucursal);
    if (activeTab === "profiles") await toggleProfile(item as Profile);
    if (activeTab === "metodos_contacto") await toggleMetodoContacto(item as MetodoContacto);
    if (activeTab === "destinos") await toggleDestino(item as Destino);
    if (activeTab === "formas_pago") await toggleFormaPago(item as FormaPago);
    if (activeTab === "cajas") await toggleCaja(item as Caja);
    if (activeTab === "categorias_financieras") await toggleCategoriaFinanciera(item as CategoriaFinanciera);
    if (activeTab === "operadores") await toggleOperador(item as Operador);
    if (activeTab === "proveedores") await toggleProveedor(item as Proveedor);
    if (activeTab === "servicios") await toggleServicio(item as Servicio);
    if (activeTab === "credenciales") await toggleUserCredentialAutofill(item as UserCredential);
  }

  async function handleDeleteCredential(id: string) {
    await deleteUserCredential(id);

    if (editingId === id) {
      resetForm();
    }
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    let ok = false;

    if (activeTab === "sucursales") {
      ok = await upsertSucursal({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        color: asString(form.color) || "#FF6A00",
        activa: asBoolean(form.activa),
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "profiles") {
      if (!editingId && !form.id) {
        showNotice(
          "info",
          "Usuario requerido",
          "Para crear un usuario/perfil nuevo necesitás primero crear el usuario en Supabase Auth y usar su UUID como ID del perfil."
        );
        return;
      }

      ok = await upsertProfile({
        id: editingId || asString(form.id),
        nombre: asString(form.nombre),
        apellido: asString(form.apellido),
        email: asString(form.email),
        sucursal_id: asString(form.sucursal_id) || null,
        rol: asString(form.rol) as AppRole,
        color: asString(form.color) || "#FF6A00",
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "metodos_contacto") {
      ok = await upsertMetodoContacto({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        color: asString(form.color) || "#FF6A00",
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "destinos") {
      ok = await upsertDestino({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        pais: asString(form.pais) || "Sin especificar",
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "formas_pago") {
      ok = await upsertFormaPago({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        impacta_tesoreria: asBoolean(form.impacta_tesoreria),
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "cajas") {
      ok = await upsertCaja({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        tipo: asString(form.tipo) || "CAJA",
        moneda: asString(form.moneda) || "ARS",
        sucursal_id: asString(form.sucursal_id) || null,
        descripcion: asString(form.descripcion) || null,
        orden: asNumber(form.orden, 100),
        activa: asBoolean(form.activa),
        activo: asBoolean(form.activo)
      } as Partial<Caja> & { nombre: string });
    }

    if (activeTab === "categorias_financieras") {
      ok = await upsertCategoriaFinanciera({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        tipo: asString(form.tipo) as CategoriaTipo,
        activa: asBoolean(form.activa),
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "operadores") {
      ok = await upsertOperador({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        color: asString(form.color) || "#FF6A00",
        razon_social: asString(form.razon_social),
        cuit: asString(form.cuit),
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "proveedores") {
      ok = await upsertProveedor({
        id: editingId || undefined,
        nombre_comercial: asString(form.nombre_comercial),
        razon_social: asString(form.razon_social),
        cuit: asString(form.cuit),
        telefono: asString(form.telefono),
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "servicios") {
      ok = await upsertServicio({
        id: editingId || undefined,
        nombre: asString(form.nombre),
        color: asString(form.color) || "#FF6A00",
        activo: asBoolean(form.activo)
      });
    }

    if (activeTab === "credenciales") {
      ok = await upsertUserCredential({
        id: editingId || undefined,
        service_key: asString(form.service_key),
        username: asString(form.username),
        password_encrypted: asString(form.password_encrypted),
        autofill_enabled: asBoolean(form.autofill_enabled),
        auto_submit_enabled: asBoolean(form.auto_submit_enabled)
      });
    }

    if (ok) {
      resetForm();
    }
  }

  function renderFormFields() {
    if (activeTab === "sucursales") {
      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="Barrio Jardín"
            />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <TextInput
              value={asString(form.color)}
              onChange={(value) => setField("color", value)}
              placeholder="#FF6A00"
            />
          </div>

          <BooleanChip
            checked={asBoolean(form.activa)}
            onChange={(value) => {
              setField("activa", value);
              setField("activo", value);
            }}
            label="Sucursal activa"
          />
        </>
      );
    }

    if (activeTab === "profiles") {
      const sucursalOptions: SelectOption[] = [
        { value: "", label: "Sin sucursal" },
        ...sucursales.map((sucursal) => ({
          value: sucursal.id,
          label: sucursal.nombre
        }))
      ];

      return (
        <>
          {!editingId ? (
            <div>
              <FieldLabel>ID usuario Supabase</FieldLabel>
              <TextInput
                value={asString(form.id)}
                onChange={(value) => setField("id", value)}
                placeholder="UUID del usuario de Auth"
              />
              <p className="mt-1 text-[10px] text-[#64748b]">
                Para crear un perfil nuevo, primero creá el usuario en Supabase Auth.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <TextInput
                value={asString(form.nombre)}
                onChange={(value) => setField("nombre", value)}
              />
            </div>

            <div>
              <FieldLabel>Apellido</FieldLabel>
              <TextInput
                value={asString(form.apellido)}
                onChange={(value) => setField("apellido", value)}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Email</FieldLabel>
            <TextInput value={asString(form.email)} onChange={(value) => setField("email", value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Rol</FieldLabel>
              <NosturSelect
                value={asString(form.rol)}
                onChange={(value) => setField("rol", value)}
                options={appRoleOptions}
              />
            </div>

            <div>
              <FieldLabel>Sucursal</FieldLabel>
              <NosturSelect
                value={asString(form.sucursal_id)}
                onChange={(value) => setField("sucursal_id", value || null)}
                options={sucursalOptions}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <TextInput value={asString(form.color)} onChange={(value) => setField("color", value)} />
          </div>

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Usuario activo"
          />
        </>
      );
    }

    if (activeTab === "metodos_contacto") {
      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="WhatsApp, Aivo, Referido..."
            />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <TextInput value={asString(form.color)} onChange={(value) => setField("color", value)} />
          </div>

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Método activo"
          />
        </>
      );
    }

    if (activeTab === "destinos") {
      return (
        <>
          <div>
            <FieldLabel>Destino / ciudad</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="Cancún"
            />
          </div>

          <div>
            <FieldLabel>País</FieldLabel>
            <TextInput
              value={asString(form.pais)}
              onChange={(value) => setField("pais", value)}
              placeholder="México"
            />
          </div>

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Destino activo"
          />
        </>
      );
    }

    if (activeTab === "formas_pago") {
      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="Transferencia, efectivo..."
            />
          </div>

          <BooleanChip
            checked={asBoolean(form.impacta_tesoreria)}
            onChange={(value) => setField("impacta_tesoreria", value)}
            label="Impacta tesorería"
          />

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Forma activa"
          />
        </>
      );
    }

    if (activeTab === "cajas") {
      const sucursalOptions: SelectOption[] = [
        { value: "", label: "Sin sucursal" },
        ...sucursales.map((sucursal) => ({
          value: sucursal.id,
          label: sucursal.nombre
        }))
      ];

      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="Caja pesos, banco 1..."
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Tipo</FieldLabel>
              <NosturSelect
                value={asString(form.tipo) || "CAJA"}
                onChange={(value) => setField("tipo", value)}
                options={cajaTipoOptions}
              />
            </div>

            <div>
              <FieldLabel>Moneda</FieldLabel>
              <NosturSelect
                value={asString(form.moneda) || "ARS"}
                onChange={(value) => setField("moneda", value)}
                options={monedaOptions}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Sucursal</FieldLabel>
            <NosturSelect
              value={asString(form.sucursal_id)}
              onChange={(value) => setField("sucursal_id", value || null)}
              options={sucursalOptions}
            />
          </div>

          <div>
            <FieldLabel>Descripción</FieldLabel>
            <TextInput
              value={asString(form.descripcion)}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Uso interno, cuenta, observación..."
            />
          </div>

          <div>
            <FieldLabel>Orden</FieldLabel>
            <TextInput
              value={asString(form.orden || "100")}
              onChange={(value) => setField("orden", value)}
              placeholder="100"
              type="number"
            />
          </div>

          <BooleanChip
            checked={asBoolean(form.activa)}
            onChange={(value) => {
              setField("activa", value);
              setField("activo", value);
            }}
            label="Caja activa"
          />
        </>
      );
    }

    if (activeTab === "categorias_financieras") {
      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="Alquileres, proveedores..."
            />
          </div>

          <div>
            <FieldLabel>Tipo</FieldLabel>
            <NosturSelect
              value={asString(form.tipo)}
              onChange={(value) => setField("tipo", value)}
              options={categoriaTipoOptions}
            />
          </div>

          <BooleanChip
            checked={asBoolean(form.activa)}
            onChange={(value) => {
              setField("activa", value);
              setField("activo", value);
            }}
            label="Categoría activa"
          />
        </>
      );
    }

    if (activeTab === "operadores") {
      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput value={asString(form.nombre)} onChange={(value) => setField("nombre", value)} />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <TextInput value={asString(form.color)} onChange={(value) => setField("color", value)} />
          </div>

          <div>
            <FieldLabel>Razón social</FieldLabel>
            <TextInput
              value={asString(form.razon_social)}
              onChange={(value) => setField("razon_social", value)}
            />
          </div>

          <div>
            <FieldLabel>CUIT</FieldLabel>
            <TextInput value={asString(form.cuit)} onChange={(value) => setField("cuit", value)} />
          </div>

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Operador activo"
          />
        </>
      );
    }

    if (activeTab === "proveedores") {
      return (
        <>
          <div>
            <FieldLabel>Nombre comercial</FieldLabel>
            <TextInput
              value={asString(form.nombre_comercial)}
              onChange={(value) => setField("nombre_comercial", value)}
            />
          </div>

          <div>
            <FieldLabel>Razón social</FieldLabel>
            <TextInput
              value={asString(form.razon_social)}
              onChange={(value) => setField("razon_social", value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>CUIT</FieldLabel>
              <TextInput value={asString(form.cuit)} onChange={(value) => setField("cuit", value)} />
            </div>

            <div>
              <FieldLabel>Teléfono</FieldLabel>
              <TextInput
                value={asString(form.telefono)}
                onChange={(value) => setField("telefono", value)}
              />
            </div>
          </div>

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Proveedor activo"
          />
        </>
      );
    }

    if (activeTab === "servicios") {
      return (
        <>
          <div>
            <FieldLabel>Nombre</FieldLabel>
            <TextInput
              value={asString(form.nombre)}
              onChange={(value) => setField("nombre", value)}
              placeholder="Hoteles, vuelos, traslados..."
            />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <TextInput value={asString(form.color)} onChange={(value) => setField("color", value)} />
          </div>

          <BooleanChip
            checked={asBoolean(form.activo)}
            onChange={(value) => setField("activo", value)}
            label="Servicio activo"
          />
        </>
      );
    }

    const appOptions: SelectOption[] = appRegistry.map((app) => ({
      value: app.id,
      label: app.name
    }));

    return (
      <>
        <div>
          <FieldLabel>Aplicativo</FieldLabel>
          <NosturSelect
            value={asString(form.service_key)}
            onChange={(value) => setField("service_key", value)}
            options={appOptions}
          />
        </div>

        <div>
          <FieldLabel>Usuario</FieldLabel>
          <TextInput
            value={asString(form.username)}
            onChange={(value) => setField("username", value)}
          />
        </div>

        <div>
          <FieldLabel>Contraseña</FieldLabel>
          <div className="flex gap-2">
            <input
              value={asString(form.password_encrypted)}
              onChange={(event) => setField("password_encrypted", event.target.value)}
              className="h-9 min-w-0 flex-1 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
              type={showCredentialPassword ? "text" : "password"}
            />

            <button
              type="button"
              onClick={() => setShowCredentialPassword((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-[#64748b] hover:bg-white"
            >
              {showCredentialPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <BooleanChip
          checked={asBoolean(form.autofill_enabled)}
          onChange={(value) => setField("autofill_enabled", value)}
          label="Autofill habilitado"
        />

        <BooleanChip
          checked={asBoolean(form.auto_submit_enabled)}
          onChange={(value) => setField("auto_submit_enabled", value)}
          label="Auto submit habilitado"
        />
      </>
    );
  }

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="w-full rounded-[24px] border border-black/10 bg-white/55 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-[#475569]">
            Configuración
          </h2>
          <p className="mt-0.5 text-[11px] text-[#64748b]">
            {canManageConfig
              ? "ABM central conectado a Supabase."
              : "Configuración personal: credenciales de autofill."}
            {currentProfile ? ` Usuario: ${currentProfile.nombre} · ${currentProfile.rol}` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={loadConfig}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-xs font-bold text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
        >
          <RefreshCcw size={14} strokeWidth={1.8} />
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <span>{error}</span>

          <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div
          className={[
            "mb-4 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold",
            notice.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : notice.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          ].join(" ")}
        >
          <div>
            <div className="mb-0.5 font-black">{notice.title}</div>
            <div>{notice.message}</div>
          </div>

          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-current opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      <div
        className={[
          "mb-4 grid gap-1.5 pb-1",
          canManageConfig ? "grid-cols-2 md:grid-cols-4 xl:grid-cols-12" : "grid-cols-1"
        ].join(" ")}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleChangeTab(tab.id)}
              className={[
                "flex h-8 min-w-0 items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-bold transition",
                active
                  ? "bg-nostur-orange text-white shadow-md"
                  : "bg-white/70 text-[#334155] hover:bg-white"
              ].join(" ")}
            >
              <Icon size={13} strokeWidth={1.8} className="shrink-0" />
              <span className="min-w-0 truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === "importador" ? (
        <ImportadorCatalogosPanel />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="min-w-0 rounded-2xl border border-black/10 bg-white/75 p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#111827]">
                  {editingId ? "Editar" : "Nuevo"}
                </h3>
                <p className="text-[11px] text-[#64748b]">{activeTabMeta.label}</p>
              </div>

              {editingId ? (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5"
                >
                  <X size={15} />
                </button>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-nostur-orange/20 text-[#111827]">
                  <Plus size={15} />
                </div>
              )}
            </div>

            <div className="grid gap-3">{renderFormFields()}</div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-nostur-orange text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
            >
              <Save size={14} strokeWidth={1.8} />
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </form>

          <div className="min-w-0 rounded-2xl border border-black/10 bg-white/75 p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#111827]">{activeTabMeta.label}</h3>
                <p className="text-[11px] text-[#64748b]">
                  {loading
                    ? "Cargando..."
                    : `${filteredItems.length} de ${currentItems.length} registros`}
                </p>
              </div>

              <div className="flex h-9 min-w-[240px] items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                <Search size={14} className="shrink-0 text-[#94a3b8]" />
                <input
                  value={listSearch}
                  onChange={(event) => setListSearch(event.target.value)}
                  placeholder="Buscar..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-black/10 bg-[#f8fafc] p-4 text-xs text-[#64748b]">
                Cargando configuración...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-xl border border-black/10 bg-[#f8fafc] p-4 text-xs text-[#64748b]">
                No hay registros para mostrar.
              </div>
            ) : (
              <div className="grid max-h-[calc(100vh-310px)] gap-2 overflow-auto pr-1">
                {filteredItems.map((rawItem) => {
                  const item = rawItem as Record<string, unknown>;
                  const id = String(item.id);
                  const active = getIsActive(activeTab, item);
                  const color = getColor(activeTab, item);

                  return (
                    <div
                      key={id}
                      className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#f8fafc] p-3"
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                        style={{ backgroundColor: color }}
                      >
                        {getItemName(activeTab, item).slice(0, 1).toUpperCase() || "N"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-black text-[#111827]">
                          {getItemName(activeTab, item)}
                        </div>
                        <div className="truncate text-[11px] text-[#64748b]">
                          {getItemSubtitle(activeTab, item) || "Sin detalle"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        className={[
                          "flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold",
                          active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                        ].join(" ")}
                        title={active ? "Activo" : "Inactivo"}
                      >
                        {active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {active ? "Activo" : "Inactivo"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
                        title="Editar"
                      >
                        <Pencil size={14} strokeWidth={1.8} />
                      </button>

                      {activeTab === "credenciales" ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteCredential(id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-red-100 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}