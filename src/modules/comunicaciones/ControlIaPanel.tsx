import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ComunicacionesPageShell, MetricCard } from "./comunicacionesShared";

type Metrics = {
  conversaciones: number;
  mensajes: number;
  oportunidades: number;
  calientes: number;
  candeActivas: number;
};

export function ControlIaPanel() {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    conversaciones: 0,
    mensajes: 0,
    oportunidades: 0,
    calientes: 0,
    candeActivas: 0
  });
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [convRes, msgRes, oppRes, hotRes, candeRes] = await Promise.all([
      supabase.from("conversaciones").select("id", { count: "exact", head: true }),
      supabase.from("mensajes").select("id", { count: "exact", head: true }),
      supabase.from("lead_oportunidades").select("id", { count: "exact", head: true }),
      supabase.from("lead_oportunidades").select("id", { count: "exact", head: true }).gte("score", 70),
      supabase.from("lead_oportunidades").select("id", { count: "exact", head: true }).eq("cande_activa", true)
    ]);

    const firstError = convRes.error || msgRes.error || oppRes.error || hotRes.error || candeRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setMetrics({
      conversaciones: convRes.count || 0,
      mensajes: msgRes.count || 0,
      oportunidades: oppRes.count || 0,
      calientes: hotRes.count || 0,
      candeActivas: candeRes.count || 0
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <ComunicacionesPageShell
      title="Control comercial IA"
      subtitle="Métricas operativas de atención, oportunidades y asistencia IA."
      badge="Control"
      onRefresh={loadData}
      loading={loading}
    >
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="Conversaciones" value={metrics.conversaciones} />
        <MetricCard label="Mensajes" value={metrics.mensajes} />
        <MetricCard label="Oportunidades" value={metrics.oportunidades} />
        <MetricCard label="Calientes" value={metrics.calientes} hint="Score 70+" />
        <MetricCard label="Cande activa" value={metrics.candeActivas} />
      </div>

      <section className="mt-5 rounded-[28px] border border-black/10 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
        <h2 className="text-lg font-black text-[#142033]">Próximas métricas</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Clientes esperando respuesta",
            "Gap 24 horas",
            "Gap 48 horas",
            "Tiempo promedio de primera respuesta",
            "Cande pidió intervención humana",
            "Ranking de vendedores",
            "Uso de NIA por usuario",
            "Oportunidades ganadas/perdidas",
            "Conversaciones reactivadas"
          ].map((item) => (
            <div key={item} className="rounded-2xl border border-dashed border-black/10 bg-white/70 p-4 text-sm font-black text-[#475569]">
              {item}
            </div>
          ))}
        </div>
      </section>
    </ComunicacionesPageShell>
  );
}
