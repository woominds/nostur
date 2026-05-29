import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ComunicacionesPageShell, EmptyState, MetricCard, Pill } from "./comunicacionesShared";

type PipelineEstado = {
  id: string;
  nombre: string;
  color: string | null;
  orden: number | null;
  es_final: boolean | null;
  resultado: string | null;
  es_sin_atender: boolean | null;
};

type Oportunidad = {
  id: string;
  conversacion_id: string;
  estado_id: string | null;
  score: number | null;
  datos: Record<string, unknown> | null;
  assigned_to: string | null;
  cande_activa: boolean | null;
  transferida_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type ConversacionLite = {
  id: string;
  contacto_id: string | null;
  wa_phone: string | null;
  titulo: string | null;
  subject: string | null;
  estado_gestion: string | null;
  estado_comercial: string | null;
  assigned_to: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
};

type ContactoWaLite = {
  id: string;
  wa_phone: string | null;
  display_name: string | null;
  profile_name: string | null;
};

type OportunidadVM = Oportunidad & {
  conversacion?: ConversacionLite | null;
  contacto?: ContactoWaLite | null;
};

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function getTextFromDatos(datos: Record<string, unknown> | null | undefined, keys: string[], fallback = "—") {
  if (!datos) return fallback;

  for (const key of keys) {
    const value = datos[key];
    if (value === null || value === undefined) continue;

    const text = String(value).trim();
    if (text) return text;
  }

  return fallback;
}

function getNumberFromDatos(datos: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!datos) return null;

  for (const key of keys) {
    const value = datos[key];

    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function temperaturaFromScore(score: number) {
  if (score >= 75) return "Caliente";
  if (score >= 45) return "Tibia";
  return "Fría";
}

function temperaturaClass(score: number) {
  if (score >= 75) return "border-red-200 bg-red-50 text-red-700";
  if (score >= 45) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getNombreOportunidad(item: OportunidadVM) {
  const fromDatos = getTextFromDatos(
    item.datos,
    [
      "nombre",
      "contacto_nombre",
      "pasajero",
      "nombre_pasajero",
      "contacto",
      "cliente",
      "display_name",
      "profile_name"
    ],
    ""
  );

  if (fromDatos) return fromDatos;

  const fromContacto = cleanText(item.contacto?.display_name) || cleanText(item.contacto?.profile_name);
  if (fromContacto) return fromContacto;

  const fromConversacion = cleanText(item.conversacion?.titulo) || cleanText(item.conversacion?.subject);
  if (fromConversacion) return fromConversacion;

  return "Sin nombre";
}

function getTelefonoOportunidad(item: OportunidadVM) {
  const fromDatos = getTextFromDatos(item.datos, ["telefono", "phone", "wa_phone", "celular", "whatsapp"], "");

  if (fromDatos) return fromDatos;

  const fromContacto = cleanText(item.contacto?.wa_phone);
  if (fromContacto) return fromContacto;

  const fromConversacion = cleanText(item.conversacion?.wa_phone);
  if (fromConversacion) return fromConversacion;

  return "Sin teléfono";
}

function getDestinoOportunidad(item: OportunidadVM) {
  return getTextFromDatos(item.datos, ["destino", "destinos", "lugar", "ciudad", "pais", "país"], "Destino sin relevar");
}

function getFechaOportunidad(item: OportunidadVM) {
  return getTextFromDatos(
    item.datos,
    ["fechas", "fechas_tentativas", "fecha", "cuando", "cuándo", "fecha_viaje"],
    "Fecha sin relevar"
  );
}

function getPaxOportunidad(item: OportunidadVM) {
  return getNumberFromDatos(item.datos, ["cantidad_pasajeros", "pax", "pasajeros", "cantidad_pax"]);
}

function enrichDatos(item: OportunidadVM) {
  const nombre = getNombreOportunidad(item);
  const telefono = getTelefonoOportunidad(item);
  const ultimoMensaje = cleanText(item.conversacion?.last_message_preview) || cleanText(item.datos?.ultimo_mensaje) || null;

  return {
    ...(item.datos || {}),
    nombre: cleanText((item.datos || {}).nombre) || nombre,
    contacto_nombre: cleanText((item.datos || {}).contacto_nombre) || nombre,
    pasajero: cleanText((item.datos || {}).pasajero) || nombre,
    telefono: cleanText((item.datos || {}).telefono) || telefono,
    wa_phone: cleanText((item.datos || {}).wa_phone) || telefono,
    ultimo_mensaje: ultimoMensaje,
    origen_livenos: true,
    conversation_id: item.conversacion_id
  };
}

export function OportunidadesPanel() {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [estados, setEstados] = useState<PipelineEstado[]>([]);
  const [oportunidades, setOportunidades] = useState<OportunidadVM[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OportunidadVM | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverEstadoId, setDragOverEstadoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [estadosRes, oportunidadesRes, conversacionesRes, contactosRes] = await Promise.all([
      supabase
        .from("pipeline_estados")
        .select("id,nombre,color,orden,es_final,resultado,es_sin_atender")
        .order("orden", { ascending: true }),

      supabase
        .from("lead_oportunidades")
        .select("id,conversacion_id,estado_id,score,datos,assigned_to,cande_activa,transferida_at,updated_at,created_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(200),

      supabase
        .from("conversaciones")
        .select("id,contacto_id,wa_phone,titulo,subject,estado_gestion,estado_comercial,assigned_to,last_message_preview,last_message_at")
        .is("deleted_at", null)
        .limit(500),

      supabase
        .from("contactos_wa")
        .select("id,wa_phone,display_name,profile_name")
        .limit(500)
    ]);

    const firstError = estadosRes.error || oportunidadesRes.error || conversacionesRes.error || contactosRes.error;

    if (firstError) {
      setError(firstError.message || "Error cargando oportunidades");
      setLoading(false);
      return;
    }

    const conversacionesMap = new Map<string, ConversacionLite>();
    ((conversacionesRes.data || []) as ConversacionLite[]).forEach((conv) => {
      conversacionesMap.set(conv.id, conv);
    });

    const contactosMap = new Map<string, ContactoWaLite>();
    ((contactosRes.data || []) as ContactoWaLite[]).forEach((contacto) => {
      contactosMap.set(contacto.id, contacto);
    });

    const nextOportunidades = ((oportunidadesRes.data || []) as Oportunidad[]).map((opp) => {
      const conversacion = conversacionesMap.get(opp.conversacion_id) || null;
      const contacto = conversacion?.contacto_id ? contactosMap.get(conversacion.contacto_id) || null : null;

      return {
        ...opp,
        conversacion,
        contacto
      };
    });

    setEstados((estadosRes.data || []) as PipelineEstado[]);
    setOportunidades(nextOportunidades);

    setSelectedOpportunity((current) => {
      if (!current) return null;
      return nextOportunidades.find((item) => item.id === current.id) || current;
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

 useEffect(() => {
  void loadData();
}, [loadData]);

useEffect(() => {
  const channelName = `oportunidades-realtime-${Date.now()}`;

  const refresh = () => {
    void loadData();
  };

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "lead_oportunidades"
      },
      refresh
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversaciones"
      },
      refresh
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "contactos_wa"
      },
      refresh
    )
    .subscribe((status) => {
      console.log("[Oportunidades realtime]", status);
    });

  function handleNiaActionExecuted() {
    refresh();
  }

  window.addEventListener("nostur:nia-action-executed", handleNiaActionExecuted);

  return () => {
    window.removeEventListener("nostur:nia-action-executed", handleNiaActionExecuted);
    supabase.removeChannel(channel);
  };
}, [loadData]);

  const totalScore = useMemo(() => {
    if (oportunidades.length === 0) return 0;

    return Math.round(oportunidades.reduce((acc, item) => acc + (item.score || 0), 0) / oportunidades.length);
  }, [oportunidades]);

  async function moveOpportunityToEstado(item: OportunidadVM, estado: PipelineEstado) {
    if (item.estado_id === estado.id || actionLoading) return;

    setActionLoading(true);
    setError(null);
    setStatus(null);

    const previous = oportunidades;

    const nextOptimistic = oportunidades.map((opp) =>
      opp.id === item.id
        ? {
            ...opp,
            estado_id: estado.id,
            datos: enrichDatos(opp),
            updated_at: new Date().toISOString()
          }
        : opp
    );

    setOportunidades(nextOptimistic);

    const { error: updateOppError } = await supabase
      .from("lead_oportunidades")
      .update({
        estado_id: estado.id,
        datos: enrichDatos(item),
        updated_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (updateOppError) {
      setOportunidades(previous);
      setError(updateOppError.message || "No se pudo mover la oportunidad.");
      setActionLoading(false);
      return;
    }

    const { error: updateConvError } = await supabase
      .from("conversaciones")
      .update({
        estado_gestion: estado.es_sin_atender ? "sin_atender" : "en_gestion",
        estado_comercial: estado.nombre,
        updated_at: new Date().toISOString()
      })
      .eq("id", item.conversacion_id);

    if (updateConvError) {
      setError(updateConvError.message || "Se movió la oportunidad, pero no se pudo actualizar la conversación.");
    } else {
      setStatus(`Oportunidad movida a ${estado.nombre}.`);
    }

    await loadData();
    setActionLoading(false);
  }

  function handleDragStart(item: OportunidadVM) {
    setDraggingId(item.id);
  }

function handleDragOver(event: React.DragEvent<HTMLElement>, estadoId: string) {
  event.preventDefault();
  setDragOverEstadoId(estadoId);
}

function handleDragLeave(event: React.DragEvent<HTMLElement>, estadoId: string) {
  event.preventDefault();

  if (dragOverEstadoId === estadoId) {
    setDragOverEstadoId(null);
  }
}

async function handleDrop(event: React.DragEvent<HTMLElement>, estado: PipelineEstado) {
  event.preventDefault();

  const item = oportunidades.find((opp) => opp.id === draggingId);

  setDraggingId(null);
  setDragOverEstadoId(null);

  if (!item) return;

  await moveOpportunityToEstado(item, estado);
}

  function openConversation(item: OportunidadVM) {
    const detail = {
      source: "oportunidades",
      module: "comunicaciones",
      action: "open_conversation_from_opportunity",
      conversation_id: item.conversacion_id,
      conversacion_id: item.conversacion_id,
      wa_phone: getTelefonoOportunidad(item),
      contacto: getNombreOportunidad(item),
      contacto_nombre: getNombreOportunidad(item),
      oportunidad_id: item.id,
      oportunidad_score: item.score || 0,
      oportunidad_estado_id: item.estado_id,
      oportunidad_datos: item.datos || null,
      cande_activa: Boolean(item.cande_activa),
      created_at: new Date().toISOString()
    };

    window.localStorage.setItem("nostur_nia_context", JSON.stringify(detail));

    window.dispatchEvent(
      new CustomEvent("nostur:open-livenos-conversation", {
        detail
      })
    );

    window.dispatchEvent(
      new CustomEvent("nostur:open-nia-chat", {
        detail
      })
    );
  }

  function renderOpportunityModal() {
    if (!selectedOpportunity) return null;

    const item = selectedOpportunity;
    const score = item.score || 0;
    const nombre = getNombreOportunidad(item);
    const telefono = getTelefonoOportunidad(item);
    const destino = getDestinoOportunidad(item);
    const fechas = getFechaOportunidad(item);
    const pax = getPaxOportunidad(item);
    const estado = estados.find((estadoItem) => estadoItem.id === item.estado_id) || null;
    const ultimoMensaje =
      cleanText(item.datos?.ultimo_mensaje) ||
      cleanText(item.conversacion?.last_message_preview) ||
      "Sin último mensaje registrado.";

    return (
      <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
        <div className="w-full max-w-[860px] overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-black/10">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 px-7 py-6">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black text-[#142033]">{nombre}</h2>
              <p className="mt-1 text-sm font-bold text-[#64748b]">{telefono}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-xl border px-3 py-1 text-sm font-black",
                    temperaturaClass(score)
                  ].join(" ")}
                >
                  🔥 {temperaturaFromScore(score)}
                </span>

                <span className="rounded-xl bg-[#eef6f7] px-3 py-1 text-sm font-black text-[#4f7c90]">
                  Score {score}
                </span>

                {estado ? (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-1 text-sm font-black text-[#475569]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: estado.color || "#4f7c90" }}
                    />
                    {estado.nombre}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOpportunity(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#142033]"
              title="Cerrar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="max-h-[68vh] overflow-auto px-7 py-6">
            <section>
              <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">
                Temperatura del lead
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-base font-semibold text-[#334155]">Puntaje actual</span>
                <span className="text-base font-black text-[#142033]">{score} / 100</span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">
                Datos relevados
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">Nombre</div>
                  <div className="mt-1 text-base font-semibold text-[#142033]">{nombre}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">Destino</div>
                  <div className="mt-1 text-base font-semibold text-[#142033]">{destino}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">Fechas tentativas</div>
                  <div className="mt-1 text-base font-semibold text-[#142033]">{fechas}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3">
                  <div className="text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">Cantidad pasajeros</div>
                  <div className="mt-1 text-base font-semibold text-[#142033]">{pax || "—"}</div>
                </div>
              </div>
            </section>

            <section className="mt-7">
              <div className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[#64748b]">
                Último mensaje
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] px-4 py-3 text-base font-semibold text-[#334155]">
                {ultimoMensaje}
              </div>
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-black/10 bg-[#f8fafc] px-7 py-5">
            <button
              type="button"
              onClick={() => setSelectedOpportunity(null)}
              className="h-11 rounded-2xl bg-white px-5 text-sm font-black text-[#142033] shadow-sm ring-1 ring-black/10 hover:bg-[#f1f5f9]"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => openConversation(item)}
              className="h-11 rounded-2xl bg-[#4f7c90] px-5 text-sm font-black text-white shadow-sm hover:bg-[#406b7d]"
            >
              Abrir conversación
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ComunicacionesPageShell
      title="Oportunidades"
      subtitle="Pipeline comercial nacido desde conversaciones, Cande y NIA."
      badge="Pipeline IA"
      onRefresh={loadData}
      loading={loading}
    >
      {renderOpportunityModal()}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Oportunidades" value={oportunidades.length} />
        <MetricCard label="Estados" value={estados.length} />
        <MetricCard label="Score promedio" value={`${totalScore}/100`} />
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {status ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          {status}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-5">
        {estados.length === 0 ? (
          <div className="xl:col-span-5">
            <EmptyState
              title="Sin estados de pipeline"
              subtitle="Revisá que el seed haya cargado pipeline_estados."
            />
          </div>
        ) : (
          estados.map((estado) => {
            const items = oportunidades.filter((item) => item.estado_id === estado.id);
            const isOver = dragOverEstadoId === estado.id;

            return (
              <section
                key={estado.id}
                onDragOver={(event) => handleDragOver(event, estado.id)}
                onDragLeave={(event) => handleDragLeave(event, estado.id)}
                onDrop={(event) => void handleDrop(event, estado)}
                className={[
                  "min-h-[520px] rounded-[26px] border p-3 shadow-sm backdrop-blur-xl transition",
                  isOver
                    ? "border-[#4f7c90]/50 bg-[#eef6f7]"
                    : "border-black/10 bg-white/60"
                ].join(" ")}
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: estado.color || "#0f766e" }}
                    />

                    <h2 className="text-sm font-black text-[#142033]">{estado.nombre}</h2>
                  </div>

                  <span className="text-xs font-black text-[#64748b]">{items.length}</span>
                </header>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-black/10 bg-white/50 p-4 text-center text-xs font-bold text-[#94a3b8]">
                      Sin oportunidades
                    </div>
                  ) : (
                    items.map((item) => {
                      const score = item.score || 0;
                      const nombre = getNombreOportunidad(item);
                      const telefono = getTelefonoOportunidad(item);
                      const destino = getDestinoOportunidad(item);
                      const fechas = getFechaOportunidad(item);
                      const pax = getPaxOportunidad(item);
                      const isDragging = draggingId === item.id;

                      return (
                        <article
                          key={item.id}
                          draggable
                          onDragStart={() => handleDragStart(item)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverEstadoId(null);
                          }}
                          onClick={() => setSelectedOpportunity(item)}
                          className={[
                            "cursor-grab rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition active:cursor-grabbing",
                            isDragging ? "scale-[0.98] opacity-50" : "hover:-translate-y-0.5 hover:shadow-md",
                            actionLoading ? "pointer-events-none opacity-70" : ""
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-[#142033]">
                                {nombre}
                              </h3>

                              <p className="truncate text-xs font-bold text-[#64748b]">
                                {telefono}
                              </p>
                            </div>

                            <Pill>{temperaturaFromScore(score)}</Pill>
                          </div>

                          <div className="mt-3 space-y-1 text-xs font-bold text-[#475569]">
                            <p>📍 {destino}</p>
                            <p>🗓 {fechas}</p>
                            <p>👥 {pax || "—"} pax</p>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-red-500"
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>

                          <p className="mt-1 text-right text-[11px] font-black text-[#64748b]">
                            {score}/100
                          </p>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })
        )}
      </div>
    </ComunicacionesPageShell>
  );
}