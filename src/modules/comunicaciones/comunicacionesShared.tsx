import type { ReactNode } from "react";
import { RefreshCcw } from "lucide-react";

export type LoadingState = "idle" | "loading" | "error" | "success";

export function ComunicacionesPageShell({
  title,
  subtitle,
  badge,
  children,
  onRefresh,
  loading = false
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: ReactNode;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  return (
    <section className="h-full min-h-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,#d8f8ee_0,#eef3f8_34%,#f7f8fb_100%)]">
      <header className="flex items-center justify-between border-b border-black/10 bg-white/70 px-6 py-4 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#142033]">{title}</h1>
            {badge ? (
              <span className="rounded-full bg-[#e8f7f1] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#087f5b]">
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-semibold text-[#64748b]">{subtitle}</p>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-black text-[#334155] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        ) : null}
      </header>

      <div className="h-[calc(100%-73px)] min-h-0 overflow-auto p-6">{children}</div>
    </section>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-black/10 bg-white/60 p-8 text-center shadow-sm">
      <div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f7f1] text-xl">✦</div>
        <h3 className="text-lg font-black text-[#142033]">{title}</h3>
        <p className="mt-1 max-w-md text-sm font-semibold text-[#64748b]">{subtitle}</p>
      </div>
    </div>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="rounded-[24px] border border-black/10 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#64748b]">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-[#142033]">{value}</p>
      {hint ? <p className="mt-1 text-xs font-bold text-[#94a3b8]">{hint}</p> : null}
    </article>
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-black text-[#475569]">
      {children}
    </span>
  );
}
