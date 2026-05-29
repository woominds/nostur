// src/components/comunicaciones/ComunicacionesSidebar.tsx

import { Bot, Search } from "lucide-react";

import {
  CHANNEL_OPTIONS,
  PRIORIDAD_OPTIONS,
  TAB_OPTIONS,
  type SelectOption
} from "./comunicacionesPanel.constants";

import { FieldLabel, NosturSelect } from "./comunicacionesPanel.ui";

import type {
  ComunicacionesFilters,
  ComunicacionesMetrics,
  ComunicacionesTab
} from "../../store/comunicacionesStore";

function getSidebarMetricValue(
  metrics: ComunicacionesMetrics,
  tab: ComunicacionesTab
): number {
const map: Record<ComunicacionesTab, number> = {
  nia: metrics.nia,
  cande_atendiendo: metrics.candeAtendiendo,
  derivado_nuevo: metrics.derivadoNuevo,
  mis_conversaciones: metrics.misConversaciones,
  en_colaboracion: metrics.enColaboracion,
  abiertas: metrics.abiertas,
  cerradas: metrics.cerradas,
  archivadas: metrics.archivadas,
  eliminadas: metrics.eliminadas
};

  return map[tab] || 0;
}

function getCompactTabDescription(tab: ComunicacionesTab): string {
const map: Record<ComunicacionesTab, string> = {
  nia: "Asistente comercial",
  derivado_nuevo: "Para tomar",
  mis_conversaciones: "En trabajo humano",
  cande_atendiendo: "Filtrando pasajeros",
  en_colaboracion: "Compartidas",
  abiertas: "Todas abiertas",
  cerradas: "Finalizadas",
  archivadas: "Archivadas",
  eliminadas: "Eliminadas"
};

  return map[tab] || "";
}

export function ComunicacionesSidebar({
  filters,
  metrics,
  filtersOpen,
  vendedorOptions,
  sucursalOptions,
  tagOptions,
  onToggleFilters,
  onSetFilter,
  onResetFilters
}: {
  filters: ComunicacionesFilters;
  metrics: ComunicacionesMetrics;
  filtersOpen: boolean;
  vendedorOptions: SelectOption[];
  sucursalOptions: SelectOption[];
  tagOptions: SelectOption[];
  onToggleFilters: () => void;
  onSetFilter: <K extends keyof ComunicacionesFilters>(
    key: K,
    value: ComunicacionesFilters[K]
  ) => void;
  onResetFilters: () => void;
}) {
  const activeTab = TAB_OPTIONS.find((tab) => tab.value === filters.tab);
  const sinAtenderCount = Number(metrics.derivadoNuevo || 0);
  const hasSinAtender = sinAtenderCount > 0;

  return (
    <aside className="min-h-0 overflow-auto border-r border-black/10 bg-white/55 p-3 backdrop-blur">
      <div className="mb-3 rounded-[24px] border border-black/10 bg-white/80 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748b]">
              Bandejas
            </div>

            <div className="mt-0.5 truncate text-[11px] font-semibold text-[#94a3b8]">
              {activeTab ? activeTab.label : "Seleccioná una bandeja"}
            </div>
          </div>

          <span
            className={[
              "shrink-0 rounded-xl px-2 py-1 text-[10px] font-black transition",
              hasSinAtender
                ? "bg-red-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            ].join(" ")}
          >
            {hasSinAtender ? sinAtenderCount : "OK"}
          </span>
        </div>

        <div className="grid gap-1">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = filters.tab === tab.value;
            const count = getSidebarMetricValue(metrics, tab.value);
            const isSinAtender = tab.value === "derivado_nuevo";
            const shouldAlert = isSinAtender && count > 0;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onSetFilter("tab", tab.value)}
                className={[
                  "group flex h-[52px] w-full items-center justify-between gap-2 rounded-2xl px-2.5 text-left transition",
                  shouldAlert
                    ? active
                      ? "bg-red-700 text-white shadow-sm"
                      : "bg-red-50 text-red-800 ring-1 ring-red-200 hover:bg-red-100"
                    : active
                      ? "bg-[#4f7c90] text-white shadow-sm"
                      : "bg-transparent text-[#334155] hover:bg-[#f8fafc]"
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
                      shouldAlert
                        ? active
                          ? "bg-white/20 text-white"
                          : "bg-white text-red-700 ring-1 ring-red-100"
                        : active
                          ? "bg-white/15 text-white"
                          : "bg-white text-[#4f7c90] ring-1 ring-black/5 group-hover:bg-[#eef3f5]"
                    ].join(" ")}
                  >
                    <Icon size={15} strokeWidth={1.9} />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-black leading-4">
                      {tab.label}
                    </span>

                    <span
                      className={[
                        "mt-0.5 block truncate text-[10px] font-bold leading-4",
                        shouldAlert
                          ? active
                            ? "text-white/85"
                            : "text-red-500"
                          : active
                            ? "text-white/75"
                            : "text-[#94a3b8]"
                      ].join(" ")}
                    >
                      {getCompactTabDescription(tab.value)}
                    </span>
                  </span>
                </span>

                <span
                  className={[
                    "shrink-0 rounded-xl px-2 py-1 text-[10px] font-black",
                    shouldAlert
                      ? active
                        ? "bg-white text-red-700"
                        : "bg-red-600 text-white"
                      : active
                        ? "bg-white/15 text-white"
                        : count > 0
                          ? "bg-[#4f7c90]/10 text-[#31596a]"
                          : "bg-white text-[#94a3b8] ring-1 ring-black/5"
                  ].join(" ")}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-black/10 bg-white/80 p-3 shadow-sm">
        <button
          type="button"
          onClick={onToggleFilters}
          className="mb-3 flex h-10 w-full items-center justify-between rounded-2xl bg-[#f8fafc] px-3 text-xs font-black text-[#334155] ring-1 ring-black/5 hover:bg-white"
        >
          <span>Filtros</span>

          <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#64748b] ring-1 ring-black/5">
            {filtersOpen ? "Ocultar" : "Mostrar"}
          </span>
        </button>

        {filtersOpen ? (
          <div className="grid gap-3">
            <div>
              <FieldLabel>Buscar</FieldLabel>

              <div className="flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 focus-within:border-[#4f7c90]">
                <Search size={14} className="shrink-0 text-[#64748b]" />

                <input
                  value={filters.search}
                  onChange={(event) => onSetFilter("search", event.target.value)}
                  placeholder="Cliente, teléfono, destino..."
                  className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Canal</FieldLabel>

              <NosturSelect
                value={filters.channel}
                onChange={(value) =>
                  onSetFilter("channel", value as ComunicacionesFilters["channel"])
                }
                options={CHANNEL_OPTIONS}
              />
            </div>

            <div>
              <FieldLabel>Vendedor</FieldLabel>

              <NosturSelect
                value={filters.assignedTo}
                onChange={(value) => onSetFilter("assignedTo", value)}
                options={vendedorOptions}
              />
            </div>

            <div>
              <FieldLabel>Sucursal</FieldLabel>

              <NosturSelect
                value={filters.sucursalId}
                onChange={(value) => onSetFilter("sucursalId", value)}
                options={sucursalOptions}
              />
            </div>

            <div>
              <FieldLabel>Prioridad</FieldLabel>

              <NosturSelect
                value={filters.prioridad}
                onChange={(value) =>
                  onSetFilter("prioridad", value as ComunicacionesFilters["prioridad"])
                }
                options={PRIORIDAD_OPTIONS}
              />
            </div>

            <div>
              <FieldLabel>Etiqueta</FieldLabel>

              <NosturSelect
                value={filters.tagId}
                onChange={(value) => onSetFilter("tagId", value)}
                options={tagOptions}
              />
            </div>

            <button
              type="button"
              onClick={onResetFilters}
              className="h-10 rounded-2xl bg-white text-xs font-black text-[#334155] shadow-sm ring-1 ring-black/5 hover:bg-[#f8fafc]"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}