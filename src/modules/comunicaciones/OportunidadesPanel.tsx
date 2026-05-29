import { useCallback, useEffect, useMemo, useState } from "react";
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

export function OportunidadesPanel() {
  const [loading, setLoading] = useState(false);
  const [estados, setEstados] = useState<PipelineEstado[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [estadosRes, oportunidadesRes] = await Promise.all([
      supabase
        .from("pipeline_estados")
        .select("id,nombre,color,orden,es_final,resultado,es_sin_atender")
        .order("orden", { ascending: true }),
      supabase
        .from("lead_oportunidades")
        .select("id,conversacion_id,estado_id,score,datos,assigned_to,cande_activa,transferida_at,updated_at,created_at")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(200)
    ]);

    if (estadosRes.error || oportunidadesRes.error) {
      setError(estadosRes.error?.message || oportunidadesRes.error?.message || "Error cargando oportunidades");
      setLoading(false);
      return;
    }

    setEstados((estadosRes.data || []) as PipelineEstado[]);
    setOportunidades((oportunidadesRes.data || []) as Oportunidad[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalScore = useMemo(() => {
    if (oportunidades.length === 0) return 0;
    return Math.round(oportunidades.reduce((acc, item) => acc + (item.score || 0), 0) / oportunidades.length);
  }, [oportunidades]);

  return (
    <ComunicacionesPageShell
      title="Oportunidades"
      subtitle="Pipeline comercial nacido desde conversaciones, Cande y NIA."
      badge="Pipeline IA"
      onRefresh={loadData}
      loading={loading}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Oportunidades" value={oportunidades.length} />
        <MetricCard label="Estados" value={estados.length} />
        <MetricCard label="Score promedio" value={`${totalScore}/100`} />
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-5">
        {estados.length === 0 ? (
          <div className="xl:col-span-5">
            <EmptyState title="Sin estados de pipeline" subtitle="Revisá que el seed haya cargado pipeline_estados." />
          </div>
        ) : (
          estados.map((estado) => {
            const items = oportunidades.filter((item) => item.estado_id === estado.id);
            return (
              <section key={estado.id} className="min-h-[520px] rounded-[26px] border border-black/10 bg-white/60 p-3 shadow-sm backdrop-blur-xl">
                <header className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: estado.color || "#0f766e" }} />
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
                      const nombre = getTextFromDatos(item.datos, ["nombre", "pasajero", "nombre_pasajero", "contacto"], "Sin nombre");
                      const telefono = getTextFromDatos(item.datos, ["telefono", "phone", "wa_phone"], "Sin teléfono");
                      const destino = getTextFromDatos(item.datos, ["destino", "destinos", "lugar"], "Destino sin relevar");
                      const fechas = getTextFromDatos(item.datos, ["fechas", "fechas_tentativas", "fecha", "cuando"], "Fecha sin relevar");
                      const pax = getNumberFromDatos(item.datos, ["cantidad_pasajeros", "pax", "pasajeros"]);

                      return (
                        <article key={item.id} className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-black text-[#142033]">{nombre}</h3>
                              <p className="text-xs font-bold text-[#64748b]">{telefono}</p>
                            </div>
                            <Pill>{temperaturaFromScore(score)}</Pill>
                          </div>
                          <div className="mt-3 space-y-1 text-xs font-bold text-[#475569]">
                            <p>📍 {destino}</p>
                            <p>🗓 {fechas}</p>
                            <p>👥 {pax || "—"} pax</p>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(score, 100)}%` }} />
                          </div>
                          <p className="mt-1 text-right text-[11px] font-black text-[#64748b]">{score}/100</p>
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
