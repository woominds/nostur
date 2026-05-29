import { useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Mail,
  Phone,
  RefreshCcw,
  Search,
  Tags,
  UserCheck,
  Users,
  XCircle
} from "lucide-react";
import {
  useComunicacionesHistorialStore,
  type LiveContacto
} from "./ComunicacionesHistorialLivePanel";

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getContactoName(contacto: LiveContacto): string {
  return contacto.nombre_completo || contacto.nombre || contacto.celular || contacto.email || "Contacto sin nombre";
}

function splitTags(value?: string | null): string[] {
  if (!value) return [];

  return value
    .split(/[;,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function openInternalModule(moduleId: string, title: string, params?: Record<string, unknown>) {
  window.dispatchEvent(
    new CustomEvent("nostur:open-internal", {
      detail: {
        moduleId,
        title,
        params
      }
    })
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate"
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: "slate" | "green" | "orange" | "blue";
}) {
  const className = {
    slate: "border-slate-200 bg-white text-slate-700",
    green: "border-green-200 bg-green-50 text-green-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700"
  }[tone];

  return (
    <div className={["rounded-[22px] border p-4 shadow-sm", className].join(" ")}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{label}</span>
        <Icon size={17} />
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function ContactoCard({ contacto }: { contacto: LiveContacto }) {
  const vinculado = Boolean(contacto.contacto_id || contacto.cliente_id);
  const tags = splitTags(contacto.etiquetas);
  const telefono = contacto.celular || contacto.celular_normalizado || "";

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-[#111827]">{getContactoName(contacto)}</div>
          <div className="mt-1 text-[11px] font-bold text-[#64748b]">
            Actualizado: {formatDateTime(contacto.updated_at)}
          </div>
        </div>

        <span
          className={[
            "shrink-0 rounded-xl border px-2 py-1 text-[10px] font-black uppercase",
            vinculado ? "border-green-200 bg-green-50 text-green-700" : "border-orange-200 bg-orange-50 text-orange-700"
          ].join(" ")}
        >
          {vinculado ? "Vinculado" : "Sin vincular"}
        </span>
      </div>

      <div className="grid gap-2 text-xs">
        <div className="flex items-center gap-2 rounded-2xl bg-[#f8fafc] px-3 py-2 font-bold text-[#334155]">
          <Phone size={14} className="shrink-0 text-[#64748b]" />
          <span className="truncate">{telefono || "Sin teléfono"}</span>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-[#f8fafc] px-3 py-2 font-bold text-[#334155]">
          <Mail size={14} className="shrink-0 text-[#64748b]" />
          <span className="truncate">{contacto.email || "Sin email"}</span>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-[#f8fafc] px-3 py-2 font-bold text-[#334155]">
          <Users size={14} className="shrink-0 text-[#64748b]" />
          <span className="truncate">{contacto.empresa || "Sin empresa"}</span>
        </div>
      </div>

      {tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 8).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-[#f8fafc] px-2 py-1 text-[10px] font-black text-[#475569]"
            >
              <Tags size={10} />
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {contacto.contacto_id ? (
          <button
            type="button"
            onClick={() => openInternalModule("contactos", "Contactos", { contactoId: contacto.contacto_id })}
            className="h-8 rounded-xl border border-black/10 bg-white px-3 text-[11px] font-black text-[#334155] hover:bg-[#f8fafc]"
          >
            Ver contacto
          </button>
        ) : null}

        {contacto.cliente_id ? (
          <button
            type="button"
            onClick={() => openInternalModule("clientes", "Clientes", { clienteId: contacto.cliente_id })}
            className="h-8 rounded-xl border border-black/10 bg-white px-3 text-[11px] font-black text-[#334155] hover:bg-[#f8fafc]"
          >
            Ver cliente
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ComunicacionesContactosLivePanel() {
  const loadingContactos = useComunicacionesHistorialStore((state) => state.loadingContactos);
  const error = useComunicacionesHistorialStore((state) => state.error);
  const filters = useComunicacionesHistorialStore((state) => state.filters);
  const contactos = useComunicacionesHistorialStore((state) => state.contactos);
  const loadContactos = useComunicacionesHistorialStore((state) => state.loadContactos);
  const setFilter = useComunicacionesHistorialStore((state) => state.setFilter);
  const clearError = useComunicacionesHistorialStore((state) => state.clearError);
  const getFilteredContactos = useComunicacionesHistorialStore((state) => state.getFilteredContactos);

  const filteredContactos = getFilteredContactos();

  const metrics = useMemo(() => {
    const vinculados = contactos.filter((item) => item.contacto_id || item.cliente_id).length;
    const sinVincular = contactos.length - vinculados;
    const conTelefono = contactos.filter((item) => item.celular || item.celular_normalizado).length;

    return {
      total: contactos.length,
      vinculados,
      sinVincular,
      conTelefono
    };
  }, [contactos]);

  useEffect(() => {
    void loadContactos();
  }, [loadContactos]);

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_22%_10%,rgba(79,124,144,0.12),transparent_28%),linear-gradient(135deg,#eef3f5,#dfe8ec_48%,#eef3f5)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-white/75 px-5 py-4 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#111827]">Contactos Live</h1>
                <span className="rounded-xl bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#31596a]">
                  Live Connect
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                Contactos importados desde Live Connect para vincular, revisar y reutilizar en NOSTUR.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadContactos()}
              disabled={loadingContactos}
              className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
            >
              <RefreshCcw size={14} />
              {loadingContactos ? "Actualizando..." : "Actualizar"}
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Total contactos" value={metrics.total} icon={Users} tone="blue" />
            <MetricCard label="Vinculados" value={metrics.vinculados} icon={CheckCircle2} tone="green" />
            <MetricCard label="Sin vincular" value={metrics.sinVincular} icon={XCircle} tone="orange" />
            <MetricCard label="Con teléfono" value={metrics.conTelefono} icon={UserCheck} tone="slate" />
          </div>
        </header>

        {error ? (
          <div className="shrink-0 px-5 pt-4">
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              <span>{error}</span>
              <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        <main className="min-h-0 flex-1 overflow-hidden p-5">
          <div className="mb-4 flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white px-3 shadow-sm">
            <Search size={15} className="text-[#64748b]" />
            <input
              value={filters.search}
              onChange={(event) => setFilter("search", event.target.value)}
              placeholder="Buscar por nombre, teléfono, email, empresa o tag..."
              className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
            />
          </div>

          <div className="h-[calc(100%-56px)] overflow-auto pr-1">
            {loadingContactos ? (
              <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#64748b]">
                Cargando contactos Live...
              </div>
            ) : filteredContactos.length === 0 ? (
              <div className="rounded-[24px] border border-black/10 bg-white p-8 text-center text-sm font-bold text-[#64748b]">
                No hay contactos para este filtro.
              </div>
            ) : (
              <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredContactos.map((contacto) => (
                  <ContactoCard key={contacto.id} contacto={contacto} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}