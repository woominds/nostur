import { useEffect, useMemo, useState } from "react";
import type { SyntheticEvent } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  DollarSign,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  Star,
  X
} from "lucide-react";
import { appRegistry } from "../registry/appRegistry";
import { useBrowserStore } from "../store/browserStore";
import { useNotificacionesStore } from "../store/notificacionesStore";
import { getDomainFromUrl, getFaviconUrl, normalizeUrl } from "../utils/url";
import { ConfigPanel } from "./config/ConfigPanel";
import { supabase } from "../lib/supabase";
import { formatMoneyAR } from "../lib/formatters";

type TipoCambioCarga = {
  id: string;
  fecha: string;
  valor_usd_ars: string | number;
  fuente: string | null;
  observaciones: string | null;
  created_at: string;
};

type TipoCambioPromedio = {
  fecha: string;
  valor: number;
  esDelDiaSeleccionado: boolean;
};

type HomeMode = "apps" | "favorites" | "settings";

type NotificacionAny = {
  id?: string;
  key?: string;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  descripcion?: string;
  prioridad?: string;
  origen?: string;
  origen_id?: string;
  numero_operacion?: string;
  pasajero?: string;
  fecha_objetivo?: string | null;
  fecha_ingreso_gastos?: string | null;
  dias_restantes?: number | null;
  metadata?: Record<string, unknown> | null;
};

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

function getFriendlyDate(): string {
  const now = new Date();

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Argentina/Cordoba"
  }).format(now);
}

function getCurrentTimeLabel(): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Argentina/Cordoba"
  }).format(new Date());
}

function formatDateAR(value?: string | null): string {
  if (!value) return "—";

  const clean = value.slice(0, 10);
  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
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

function normalizeAppKey(appId: string): string {
  if (appId === "presupuestos") return "presupuestos-v2";

  return appId;
}

function categoryLabel(category: string): string {
  if (category === "travel") return "Operación";
  if (category === "work") return "Trabajo";
  if (category === "ai") return "IA";
  if (category === "crm") return "NOSTUR";

  return "Web";
}

function getInitials(name?: string | null): string {
  const clean = String(name || "Jorge Luis Batica").trim();
  const parts = clean.split(" ").filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function getAppIconSrc(appId: string, homeUrl: string): string {
  if (["experts", "abaco", "krooze"].includes(appId)) {
    return "/almundo-isotipo.png";
  }

  return getFaviconUrl(homeUrl);
}

function getNotificacionId(notificacion: NotificacionAny): string {
  return String(
    notificacion.id ||
      notificacion.key ||
      `${notificacion.tipo || "AVISO"}:${notificacion.origen || ""}:${
        notificacion.origen_id || notificacion.numero_operacion || ""
      }`
  );
}

function getNotificacionTitulo(notificacion: NotificacionAny): string {
  if (notificacion.titulo) return notificacion.titulo;

  if (notificacion.tipo === "CTA_CTE_INGRESO_GASTOS") {
    return "Cuenta corriente próxima a ingresar en gastos";
  }

  return "Aviso operativo";
}

function getNotificacionMensaje(notificacion: NotificacionAny): string {
  if (notificacion.mensaje) return notificacion.mensaje;
  if (notificacion.descripcion) return notificacion.descripcion;

  const pasajero = notificacion.pasajero || "el pasajero";
  const numero = notificacion.numero_operacion ? ` del carrito ${notificacion.numero_operacion}` : "";
  const fechaGastos =
    notificacion.fecha_ingreso_gastos || notificacion.fecha_objetivo || null;
  const fechaTexto = fechaGastos ? ` antes del ${formatDateAR(fechaGastos)}` : "";

  if (notificacion.tipo === "CTA_CTE_INGRESO_GASTOS") {
    return `Recordar que ${pasajero}${numero} debe cancelar el saldo${fechaTexto}.`;
  }

  return "Tenés un aviso pendiente para revisar.";
}

export function Home() {
  const createTab = useBrowserStore((state) => state.createTab);
  const favorites = useBrowserStore((state) => state.favorites);
  const homeViewMode = useBrowserStore((state) => state.homeViewMode as HomeMode);
  const setHomeViewMode = useBrowserStore((state) => state.setHomeViewMode);
  const addFavorite = useBrowserStore((state) => state.addFavorite);
  const removeFavorite = useBrowserStore((state) => state.removeFavorite);
  const [currentTime, setCurrentTime] = useState(getCurrentTimeLabel());

  const notificacionesStore = useNotificacionesStore((state) => state as any);
  const notificaciones = Array.isArray(notificacionesStore.notificaciones)
    ? (notificacionesStore.notificaciones as NotificacionAny[])
    : [];
  const notificacionesLoading = Boolean(notificacionesStore.loading);
  const notificacionesError = notificacionesStore.error || null;

  const [search, setSearch] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [notificacionesOpen, setNotificacionesOpen] = useState(false);

  const [tcLoading, setTcLoading] = useState(false);
  const [tcSaving, setTcSaving] = useState(false);
  const [tcError, setTcError] = useState<string | null>(null);
  const [tcFecha, setTcFecha] = useState(getToday());
  const [tcValor, setTcValor] = useState("");
  const [tcFuente, setTcFuente] = useState("");
  const [tcObservaciones, setTcObservaciones] = useState("");
const [, setTcCargas] = useState<TipoCambioCarga[]>([]);
  const [tcPromedioVigente, setTcPromedioVigente] = useState<TipoCambioPromedio | null>(null);

  const externalApps = useMemo(() => {
    return appRegistry
      .filter((app) => !app.url.startsWith("internal://"))
      .filter((app) => !["web", "crm", "chatgpt"].includes(app.id));
  }, []);

  const internalApps = useMemo(() => {
    const seen = new Set<string>();

    return appRegistry
      .filter((app) => app.url.startsWith("internal://"))
      .filter((app) => {
        const key = normalizeAppKey(app.id);

        if (seen.has(key)) return false;

        seen.add(key);

        return app.id !== "presupuestos";
      });
  }, []);

const quickAccess = useMemo(() => {
  const order = [
    "livenos",
    "oportunidades",
    "cande",
    "nia",
    "control-ia",
    "contactos",
    "presupuestos-v2",
    "carritos"
  ];

  return order
    .map((id) => internalApps.find((app) => app.id === id))
    .filter(Boolean) as typeof internalApps;
}, [internalApps]);

  const modulosPrincipales = useMemo(() => {
    return internalApps.filter((app) =>
      [
        "contactos",
        "clientes",
        "presupuestos-v2",
        "carritos",
        "files",
        "ctas-ctes",
        "control-ventas",
        "tablero-control"
      ].includes(app.id)
    );
  }, [internalApps]);

  const comunicacionesIa = useMemo(() => {
  return internalApps.filter((app) =>
    [
      "livenos",
      "oportunidades",
      "cande",
      "nia",
      "control-ia"
    ].includes(app.id)
  );
}, [internalApps]);

  const administracionControl = useMemo(() => {
    return internalApps.filter((app) =>
      [
        "caja",
        "facturas-cobrar",
        "facturas-pagar",
        "cashflow",
        "pagos-operadores",
        "riesgos",
        "metas",
        "comisiones"
      ].includes(app.id)
    );
  }, [internalApps]);

  const gestionInterna = useMemo(() => {
    return internalApps.filter((app) =>
      [
        "pendientes",
        "calendario-pax",
        "horarios",
        "documentos",
        "colaborativo",
        "importador-catalogos"
      ].includes(app.id)
    );
  }, [internalApps]);

 const tcPromedio = useMemo(() => {
  return tcPromedioVigente?.valor || 0;
}, [tcPromedioVigente]);

  async function loadTipoCambio(fecha = tcFecha) {
  setTcLoading(true);
  setTcError(null);

  const { data: cargasDelDia, error: errorDelDia } = await supabase
    .from("tipos_cambio_diarios")
    .select("id, fecha, valor_usd_ars, fuente, observaciones, created_at")
    .eq("fecha", fecha)
    .order("created_at", { ascending: false });

  if (errorDelDia) {
    setTcError(errorDelDia.message || "No se pudo cargar el tipo de cambio.");
    setTcLoading(false);
    return;
  }

  const cargasExactas = (cargasDelDia || []) as TipoCambioCarga[];

  if (cargasExactas.length > 0) {
    const total = cargasExactas.reduce(
      (sum, carga) => sum + parseMoney(carga.valor_usd_ars),
      0
    );

    const promedio = total / cargasExactas.length;

    setTcCargas(cargasExactas);
    setTcPromedioVigente({
      fecha,
      valor: promedio,
      esDelDiaSeleccionado: true
    });
    setTcLoading(false);
    return;
  }

  const { data: cargasHistoricas, error: errorHistorico } = await supabase
    .from("tipos_cambio_diarios")
    .select("id, fecha, valor_usd_ars, fuente, observaciones, created_at")
    .lte("fecha", fecha)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (errorHistorico) {
    setTcError(errorHistorico.message || "No se pudo cargar el último tipo de cambio disponible.");
    setTcLoading(false);
    return;
  }

  const historicas = (cargasHistoricas || []) as TipoCambioCarga[];

  if (historicas.length === 0) {
    setTcCargas([]);
    setTcPromedioVigente(null);
    setTcLoading(false);
    return;
  }

  const ultimaFechaDisponible = historicas[0].fecha;

  const cargasUltimaFecha = historicas.filter((carga) => carga.fecha === ultimaFechaDisponible);

  const totalUltimaFecha = cargasUltimaFecha.reduce(
    (sum, carga) => sum + parseMoney(carga.valor_usd_ars),
    0
  );

  const promedioUltimaFecha = totalUltimaFecha / cargasUltimaFecha.length;

  setTcCargas([]);
  setTcPromedioVigente({
    fecha: ultimaFechaDisponible,
    valor: promedioUltimaFecha,
    esDelDiaSeleccionado: false
  });

  setTcLoading(false);
}

  async function loadNotificacionesHome() {
    if (typeof notificacionesStore.loadNotificaciones === "function") {
      await notificacionesStore.loadNotificaciones();
      return;
    }

    if (typeof notificacionesStore.load === "function") {
      await notificacionesStore.load();
      return;
    }

    if (typeof notificacionesStore.refresh === "function") {
      await notificacionesStore.refresh();
    }
  }

  async function descartarNotificacion(notificacion: NotificacionAny) {
    const id = getNotificacionId(notificacion);

    if (typeof notificacionesStore.descartarNotificacion === "function") {
      await notificacionesStore.descartarNotificacion(id);
      return;
    }

    if (typeof notificacionesStore.descartar === "function") {
      await notificacionesStore.descartar(id);
      return;
    }

    if (typeof notificacionesStore.dismiss === "function") {
      await notificacionesStore.dismiss(id);
    }
  }

  async function handleSaveTipoCambio(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const valor = parseMoney(tcValor);

    if (valor <= 0) {
      setTcError("Ingresá un tipo de cambio válido.");
      return;
    }

    setTcSaving(true);
    setTcError(null);

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("tipos_cambio_diarios").insert({
      fecha: tcFecha,
      valor_usd_ars: valor,
      fuente: tcFuente.trim() || null,
      observaciones: tcObservaciones.trim() || null,
      created_by: userData.user?.id || null
    });

    if (error) {
      setTcError(error.message || "No se pudo guardar el tipo de cambio.");
      setTcSaving(false);
      return;
    }

    setTcValor("");
    setTcFuente("");
    setTcObservaciones("");
    await loadTipoCambio(tcFecha);
    setTcSaving(false);
  }

  function handleSearch(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    createTab({
      url: normalizeUrl(search),
      activate: true
    });
  }

  function handleOpenApp(app: { id: string; url: string; name: string }) {
    const appId = normalizeAppKey(app.id);
    const url = app.id === "presupuestos" ? "internal://presupuestos-v2" : app.url;

    createTab({
      appId,
      url,
      title: app.name,
      activate: true
    });
  }

  function handleAddCustomFavorite(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();

    const finalUrl = normalizeUrl(customUrl);

    addFavorite({
      name: customName.trim() || getDomainFromUrl(finalUrl) || "Favorito",
      url: finalUrl,
      faviconUrl: getFaviconUrl(finalUrl)
    });

    setCustomName("");
    setCustomUrl("");
    setCustomOpen(false);
    setHomeViewMode("favorites");
  }

  useEffect(() => {
    loadTipoCambio(tcFecha);
  }, [tcFecha]);

  useEffect(() => {
  const interval = window.setInterval(() => {
    setCurrentTime(getCurrentTimeLabel());
  }, 1000);

  return () => window.clearInterval(interval);
}, []);

  useEffect(() => {
    loadNotificacionesHome();
  }, []);

  const friendlyDate = getFriendlyDate();

  function renderModuleColumn(title: string, items: typeof internalApps, subtitle: string) {
    return (
      <section className="min-w-0 rounded-[22px] border border-white/70 bg-white/46 p-4 shadow-sm backdrop-blur-md">
        <div className="mb-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.13em] text-[#263f60]">
            {title}
          </h3>

          <p className="mt-0.5 text-[11px] font-medium text-[#6b7d91]">{subtitle}</p>
        </div>

        <div className="grid gap-1.5">
          {items.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => handleOpenApp(app)}
              className="flex h-7 items-center justify-between rounded-xl px-2.5 text-left text-[12px] font-medium text-[#253247] transition hover:bg-white/80 hover:text-[#0f766e]"
            >
              <span className="truncate">{app.name}</span>
              <span className="text-[10px] font-medium text-[#8a9aad]">Abrir</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="relative h-full overflow-auto bg-[radial-gradient(circle_at_12%_8%,rgba(125,211,252,0.24),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(134,239,172,0.20),transparent_30%),radial-gradient(circle_at_48%_94%,rgba(147,197,253,0.22),transparent_34%),linear-gradient(135deg,#f7fbfc,#eff8f8_48%,#f4f8ff)] px-6 py-4 text-[#172033]">
      <div className="mx-auto w-full max-w-[1840px]">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f766e] text-sm font-semibold text-white shadow-lg shadow-teal-700/15">
              N
            </div>

            <div>
              <h1 className="text-[22px] font-semibold leading-none tracking-tight text-[#172033]">
                NOSTUR
              </h1>

              <p className="mt-1 text-xs font-medium text-[#64748b]">
                Navegador de trabajo para NOSSIX Travel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-2xl px-2 py-1 text-xs font-medium text-[#475569] md:flex">
              <CalendarDays size={14} className="text-[#0f766e]" strokeWidth={1.8} />
              <span className="capitalize">{friendlyDate}</span>
            </div>

           <div className="hidden items-center gap-2 rounded-2xl px-2 py-1 text-xs font-medium text-[#475569] md:flex">
  <Clock3 size={15} className="text-[#0f766e]" strokeWidth={1.8} />
  <span>Córdoba · {currentTime}</span>
</div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificacionesOpen((current) => !current)}
                className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/45 text-[#334155] shadow-sm ring-1 ring-white/70 transition hover:bg-white/75"
                title="Notificaciones"
              >
                <Bell size={15} strokeWidth={1.8} />

                {notificaciones.length > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0f766e] px-1 text-[10px] font-black text-white shadow-sm">
                    {notificaciones.length > 9 ? "9+" : notificaciones.length}
                  </span>
                ) : (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#94a3b8]" />
                )}
              </button>

              {notificacionesOpen ? (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-[80] cursor-default bg-transparent"
                    onClick={() => setNotificacionesOpen(false)}
                    tabIndex={-1}
                  />

                  <div className="absolute right-0 top-11 z-[120] w-[390px] overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-2xl">
                    <div className="flex items-start justify-between gap-3 border-b border-black/10 bg-[#f8fafc] px-4 py-3">
                      <div>
                        <h3 className="text-sm font-black text-[#111827]">Notificaciones</h3>
                        <p className="text-[11px] font-semibold text-[#64748b]">
                          Avisos operativos de Home
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => loadNotificacionesHome()}
                        disabled={notificacionesLoading}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827] disabled:opacity-50"
                        title="Actualizar"
                      >
                        <RefreshCcw
                          size={14}
                          strokeWidth={1.8}
                          className={notificacionesLoading ? "animate-spin" : ""}
                        />
                      </button>
                    </div>

                    {notificacionesError ? (
                      <div className="m-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                        {notificacionesError}
                      </div>
                    ) : null}

                    {notificacionesLoading && notificaciones.length === 0 ? (
                      <div className="p-5 text-center text-xs font-semibold text-[#64748b]">
                        Cargando avisos...
                      </div>
                    ) : notificaciones.length === 0 ? (
                      <div className="p-5 text-center text-xs font-semibold text-[#64748b]">
                        No tenés avisos pendientes.
                      </div>
                    ) : (
                      <div className="max-h-[410px] overflow-auto p-2">
                        {notificaciones.map((notificacion) => (
                          <div
                            key={getNotificacionId(notificacion)}
                            className="mb-2 rounded-2xl border border-amber-200 bg-amber-50/75 p-3 last:mb-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-black text-[#111827]">
                                  {getNotificacionTitulo(notificacion)}
                                </div>

                                <div className="mt-1 text-[11px] font-semibold leading-relaxed text-[#92400e]">
                                  {getNotificacionMensaje(notificacion)}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {notificacion.numero_operacion ? (
                                    <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black text-[#334155]">
                                      {notificacion.numero_operacion}
                                    </span>
                                  ) : null}

                                  {notificacion.fecha_ingreso_gastos ||
                                  notificacion.fecha_objetivo ? (
                                    <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black text-[#334155]">
                                      Gastos{" "}
                                      {formatDateAR(
                                        notificacion.fecha_ingreso_gastos ||
                                          notificacion.fecha_objetivo ||
                                          null
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => descartarNotificacion(notificacion)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#64748b] hover:bg-red-50 hover:text-red-600"
                                title="Descartar aviso"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-black/10 bg-[#f8fafc] px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNotificacionesOpen(false);
                          createTab({
                            appId: "tablero-control",
                            url: "internal://tablero-control",
                            title: "Tablero de Control",
                            activate: true
                          });
                        }}
                        className="h-9 w-full rounded-xl bg-[#0f766e] text-xs font-black text-white hover:bg-[#0d9488]"
                      >
                        Abrir Tablero de Control
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <button
              type="button"
              className="flex h-9 items-center gap-2 rounded-2xl bg-white/45 px-2.5 text-xs font-medium text-[#334155] shadow-sm ring-1 ring-white/70 transition hover:bg-white/75"
              title="Usuario"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-[#172033] text-[10px] font-semibold text-white">
                {getInitials("Jorge Luis Batica")}
              </span>
              <span className="hidden sm:block">Jorge</span>
            </button>
          </div>
        </header>

        <section className="mb-5 grid gap-3 xl:grid-cols-[minmax(0,1fr)_660px]">
          <form
            onSubmit={handleSearch}
            className="flex h-11 w-full items-center gap-3 rounded-[22px] border border-white/70 bg-white/52 px-4 text-black shadow-sm backdrop-blur-md transition focus-within:bg-white/80 focus-within:shadow-md"
          >
            <Search size={16} className="text-black/40" strokeWidth={1.8} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar en la web o escribir dirección"
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-black/35"
            />
          </form>

          <form
            onSubmit={handleSaveTipoCambio}
            className="flex h-11 min-w-0 items-center justify-end gap-2 rounded-[22px] border border-white/70 bg-white/45 px-3 text-xs shadow-sm backdrop-blur-md"
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#172033]">
              <DollarSign size={13} className="text-[#0f766e]" strokeWidth={2} />
              Tipo de cambio
            </div>

            <input
              type="date"
              value={tcFecha}
              onChange={(event) => setTcFecha(event.target.value)}
              className="h-8 w-[132px] rounded-xl border border-white/70 bg-white/55 px-2 text-[11px] font-medium text-[#172033] outline-none focus:border-[#0f766e]"
            />

            <input
              value={tcValor}
              onChange={(event) => setTcValor(event.target.value)}
              placeholder="1 USD = ARS"
              inputMode="decimal"
              className="h-8 w-[112px] rounded-xl border border-white/70 bg-white/55 px-2 text-[11px] font-medium text-[#172033] outline-none placeholder:text-[#94a3b8] focus:border-[#0f766e]"
            />

            <button
              type="submit"
              disabled={tcSaving}
              className="h-8 rounded-xl bg-[#0f766e] px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-[#0d9488] disabled:opacity-50"
            >
              {tcSaving ? "..." : "Guardar"}
            </button>

            <button
              type="button"
              onClick={() => loadTipoCambio(tcFecha)}
              disabled={tcLoading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/55 text-[#64748b] shadow-sm hover:bg-white/80 disabled:opacity-50"
              title="Actualizar promedio"
            >
              <RefreshCcw
                size={13}
                strokeWidth={1.8}
                className={tcLoading ? "animate-spin" : ""}
              />
            </button>

            <div className="h-5 w-px bg-black/10" />

<span className="whitespace-nowrap rounded-xl bg-teal-600/10 px-2 py-1 font-semibold text-[#172033]">
  $ {formatMoneyAR(tcPromedio)}
</span>
            <span className="whitespace-nowrap rounded-xl bg-teal-600/10 px-2 py-1 font-semibold text-[#172033]">
              $ {formatMoneyAR(tcPromedio)}
            </span>

            {tcError ? (
              <div className="absolute right-8 top-[116px] text-[11px] font-medium text-red-600">
                {tcError}
              </div>
            ) : null}
          </form>
        </section>

        <nav className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setHomeViewMode("apps")}
              className={[
                "flex h-8 items-center gap-2 rounded-xl px-3 text-xs font-medium transition",
                homeViewMode === "apps"
                  ? "bg-[#0f766e] text-white shadow-md shadow-teal-700/15"
                  : "bg-white/45 text-[#334155] hover:bg-white/75"
              ].join(" ")}
            >
              Aplicativos
            </button>

            <button
              type="button"
              onClick={() => setHomeViewMode("favorites")}
              className={[
                "flex h-8 items-center gap-2 rounded-xl px-3 text-xs font-medium transition",
                homeViewMode === "favorites"
                  ? "bg-[#0f766e] text-white shadow-md shadow-teal-700/15"
                  : "bg-white/45 text-[#334155] hover:bg-white/75"
              ].join(" ")}
            >
              <Star size={13} strokeWidth={1.8} />
              Favoritos
              <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                {favorites.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setHomeViewMode("settings")}
              className={[
                "flex h-8 items-center gap-2 rounded-xl px-3 text-xs font-medium transition",
                homeViewMode === "settings"
                  ? "bg-[#0f766e] text-white shadow-md shadow-teal-700/15"
                  : "bg-white/45 text-[#334155] hover:bg-white/75"
              ].join(" ")}
            >
              <Settings size={13} strokeWidth={1.8} />
              Configuración
            </button>
          </div>

          {homeViewMode === "favorites" ? (
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-xl bg-white/45 px-3 text-xs font-medium text-[#334155] shadow-sm hover:bg-[#0f766e] hover:text-white"
            >
              <Plus size={13} strokeWidth={1.8} />
              Agregar favorito
            </button>
          ) : null}
        </nav>

        {homeViewMode === "apps" ? (
          <main className="grid gap-5">
            <section className="min-w-0">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#263f60]">
                    Accesos rápidos
                  </h2>

                  <p className="mt-0.5 text-[11px] font-medium text-[#64748b]">
                    Módulos más usados del día a día.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                {quickAccess.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleOpenApp(app)}
                    className="group min-h-[108px] rounded-[22px] border border-white/70 bg-white/58 p-4 text-center shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/82 hover:shadow-md"
                  >
                    <div
                      className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-sm"
                      style={{ backgroundColor: app.color }}
                    >
                      {app.name.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="truncate text-[13px] font-semibold text-[#172033]">
                      {app.name}
                    </div>

                    <div className="mt-0.5 truncate text-[11px] font-medium text-[#7b8da3]">
                      NOSTUR
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-[24px] border border-white/70 bg-white/36 p-4 shadow-sm backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#263f60]">
                    Aplicaciones externas
                  </h2>

                  <p className="mt-0.5 text-[11px] font-medium text-[#64748b]">
                    Herramientas externas de operación y trabajo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9">
                {externalApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleOpenApp(app)}
                    className="group min-h-[82px] rounded-[18px] border border-white/70 bg-white/52 p-3 text-center shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/82 hover:shadow-md"
                  >
                    <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white/75 text-black shadow-sm ring-1 ring-white/80">
                      <img
                        src={getAppIconSrc(app.id, app.homeUrl)}
                        className="h-[18px] w-[18px] rounded object-contain"
                        alt=""
                      />
                    </div>

                    <div className="truncate text-[12px] font-semibold text-[#172033]">
                      {app.name}
                    </div>

                    <div className="mt-0.5 truncate text-[10px] font-medium text-[#8a9aad]">
                      {categoryLabel(app.category)}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <div className="mb-3">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#263f60]">
                  Todos los módulos
                </h2>
              </div>

   <div className="grid gap-3 xl:grid-cols-5">
  {renderModuleColumn(
    "Comunicaciones IA",
    comunicacionesIa,
    "LiveNos, oportunidades, Cande, NIA y control comercial."
  )}

  {renderModuleColumn(
    "Módulos principales",
    modulosPrincipales,
    "Operación comercial, clientes y ventas."
  )}

  {renderModuleColumn(
    "Administración y control",
    administracionControl,
    "Caja, facturación, metas, comisiones y riesgos."
  )}

  {renderModuleColumn(
    "Gestión interna",
    gestionInterna,
    "Equipo, tareas, documentos e importaciones."
  )}

  <section className="relative min-h-[250px] overflow-hidden rounded-[24px] border border-white/70 bg-[radial-gradient(circle_at_22%_15%,rgba(255,122,26,0.22),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.18),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(239,248,255,0.58))] p-5 shadow-sm backdrop-blur-md">
                  <div className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff7a1a] text-xl font-semibold text-white shadow-lg shadow-orange-500/20">
                    N
                  </div>

                  <div className="max-w-[72%]">
                    <h3 className="text-[18px] font-semibold leading-tight text-[#172033]">
                      Todo lo que necesitás, en un solo lugar.
                    </h3>

                    <p className="mt-2 text-[12px] font-medium leading-relaxed text-[#64748b]">
                      NOSTUR conecta operación, administración, ventas y gestión interna para que el
                      equipo trabaje más rápido y con menos pantallas sueltas.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white/52 p-3">
                      <div className="text-lg font-semibold text-[#0f766e]">
                        {quickAccess.length}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-[#64748b]">
                        accesos clave
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/52 p-3">
                      <div className="text-lg font-semibold text-[#0f766e]">
                        {internalApps.length}
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wide text-[#64748b]">
                        módulos activos
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </main>
        ) : homeViewMode === "favorites" ? (
          <section>
            <div className="mb-3">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#263f60]">
                Favoritos
              </h2>

              <p className="mt-0.5 text-[11px] font-medium text-[#64748b]">
                Accesos guardados por vos.
              </p>
            </div>

            {favorites.length === 0 ? (
              <div className="rounded-2xl border border-white/70 bg-white/42 p-7 text-center text-xs font-medium text-[#64748b] shadow-sm backdrop-blur-md">
                Todavía no tenés favoritos guardados. Abrí una web y tocá la estrella de la barra
                superior.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {favorites.map((favorite) => (
                  <div
                    key={favorite.id}
                    className="group relative rounded-[22px] border border-white/70 bg-white/45 p-3 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/75 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => removeFavorite(favorite.id)}
                      className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-black/45 text-white hover:bg-red-500 group-hover:flex"
                      title="Quitar favorito"
                    >
                      <X size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        createTab({
                          appId: favorite.appId,
                          url: favorite.url,
                          title: favorite.name,
                          activate: true
                        })
                      }
                      className="w-full text-left"
                    >
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/70 text-black shadow-sm ring-1 ring-white/80">
                        {favorite.faviconUrl ? (
                          <img
                            src={favorite.faviconUrl}
                            className="h-[18px] w-[18px] rounded"
                            alt=""
                          />
                        ) : (
                          <span className="text-xs font-semibold">
                            {favorite.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="truncate text-[13px] font-semibold text-[#172033]">
                        {favorite.name}
                      </div>

                      <div className="mt-0.5 truncate text-[10px] font-medium text-[#8a9aad]">
                        {getDomainFromUrl(favorite.url)}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <ConfigPanel />
        )}
      </div>

      {customOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 pt-28 backdrop-blur-sm">
          <form
            onSubmit={handleAddCustomFavorite}
            className="w-[410px] rounded-2xl border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#111827]">Nuevo favorito</h2>
                <p className="text-xs text-[#64748b]">Agregá una web con nombre customizado.</p>
              </div>

              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
              >
                <X size={16} />
              </button>
            </div>

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              Nombre
            </label>

            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              className="mb-4 h-10 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-sm text-[#111827] outline-none focus:border-[#0f766e]"
              placeholder="Ej: Banco, proveedor, hotel..."
            />

            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
              URL
            </label>

            <input
              value={customUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              className="mb-5 h-10 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-sm text-[#111827] outline-none focus:border-[#0f766e]"
              placeholder="https://..."
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="h-9 rounded-xl px-4 text-xs font-medium text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="h-9 rounded-xl bg-[#0f766e] px-4 text-xs font-semibold text-white hover:bg-[#0d9488]"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}