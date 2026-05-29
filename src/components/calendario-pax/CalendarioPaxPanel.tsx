import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  RefreshCcw,
  Search,
  UsersRound,
  X
} from "lucide-react";
import {
  useCalendarioPaxStore,
  type CalendarioPaxEvento
} from "../../store/calendarioPaxStore";


type SelectOption = {
  value: string;
  label: string;
};

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

const WEEK_DAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

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

function getMonthDate(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function getCalendarDays(monthKey: string): Date[] {
  const monthDate = getMonthDate(monthKey);
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekDay = (firstDay.getDay() + 6) % 7;
  const days: Date[] = [];

  for (let index = firstWeekDay - 1; index >= 0; index -= 1) {
    days.push(new Date(year, month, -index));
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length < 42) {
    const next = days.length - firstWeekDay - lastDay.getDate() + 1;
    days.push(new Date(year, month + 1, next));
  }

  return days;
}

function formatStorageDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateAR(value?: string | null): string {
  if (!value) return "—";

  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
}

function getMonthTitle(monthKey: string): string {
  const date = getMonthDate(monthKey);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function normalizeOriginLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace("CARRITO", "Carrito")
    .replace("FILE", "File");
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

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "orange"
}: {
  label: string;
  value: string | number;
  icon: typeof Plane;
  tone?: "orange" | "green" | "amber" | "blue";
}) {
  const toneClass = {
    orange: "bg-nostur-orange/15 text-nostur-orange",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700"
  }[tone];

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={["flex h-9 w-9 items-center justify-center rounded-xl", toneClass].join(" ")}>
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

function EventPill({
  event,
  compact = false,
  selected,
  onClick
}: {
  event: CalendarioPaxEvento;
  compact?: boolean;
  selected?: boolean;
  onClick: () => void;
}) {
  const isIn = event.tipo_evento === "IN";

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${event.pasajero || "Sin pasajero"} · ${event.destinos || "Sin destino"}`}
      className={[
        "flex min-w-0 items-center gap-1 rounded-lg border px-1.5 py-1 text-left transition",
        isIn
          ? "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
          : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
        selected ? "ring-2 ring-nostur-orange/40" : ""
      ].join(" ")}
    >
      {isIn ? (
        <PlaneTakeoff size={12} className="shrink-0" />
      ) : (
        <PlaneLanding size={12} className="shrink-0" />
      )}

      <span
        className={[
          "min-w-0 truncate font-black",
          compact ? "text-[10px]" : "text-[11px]"
        ].join(" ")}
      >
        {event.pasajero || "Sin pasajero"}
      </span>

      {event.cantidad_servicios > 1 ? (
        <span className="ml-auto shrink-0 rounded-md bg-white/70 px-1 text-[9px] font-black">
          +{event.cantidad_servicios}
        </span>
      ) : null}
    </button>
  );
}

function EventDetailCard({ event }: { event: CalendarioPaxEvento }) {
  const isIn = event.tipo_evento === "IN";

  return (
    <div
      className={[
        "rounded-2xl border p-3 text-xs",
        isIn ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
      ].join(" ")}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide">
            {isIn ? <PlaneTakeoff size={13} /> : <PlaneLanding size={13} />}
            {isIn ? "Pax saliendo" : "Pax regresando"}
          </div>

          <div className="mt-1 truncate text-sm font-black text-[#111827]">
            {event.pasajero || "Sin pasajero"}
          </div>
          <div className="truncate text-[#64748b]">{event.destinos || "Sin destino"}</div>
        </div>

        <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black text-[#334155]">
          {formatDateAR(event.fecha)}
        </span>
      </div>

      <div className="grid gap-1">
        <div className="flex justify-between gap-3">
          <span className="text-[#64748b]">Origen</span>
          <strong>{normalizeOriginLabel(event.origenes)}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#64748b]">Números</span>
          <strong className="max-w-[190px] truncate text-right">{event.numeros || "—"}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#64748b]">Servicios</span>
          <strong className="max-w-[190px] truncate text-right">{event.servicios || "—"}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#64748b]">Vendedor</span>
          <strong className="max-w-[190px] truncate text-right">{event.vendedor || "—"}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-[#64748b]">Teléfono</span>
          <strong>{event.telefono || "—"}</strong>
        </div>
        <div className="mt-1 flex justify-between gap-3 border-t border-black/10 pt-2">
          <span className="font-black text-[#111827]">Servicios agrupados</span>
          <strong>{event.cantidad_servicios}</strong>
        </div>
      </div>
    </div>
  );
}

export function CalendarioPaxPanel() {
  const loading = useCalendarioPaxStore((state) => state.loading);
  const error = useCalendarioPaxStore((state) => state.error);
  const currentProfile = useCalendarioPaxStore((state) => state.currentProfile);
  const canManageCalendario = useCalendarioPaxStore((state) => state.canManageCalendario);
  const catalogos = useCalendarioPaxStore((state) => state.catalogos);
  const filters = useCalendarioPaxStore((state) => state.filters);
  const selectedDate = useCalendarioPaxStore((state) => state.selectedDate);
  const selectedEventId = useCalendarioPaxStore((state) => state.selectedEventId);
  const currentMonth = useCalendarioPaxStore((state) => state.currentMonth);

  const loadCalendario = useCalendarioPaxStore((state) => state.loadCalendario);
  const setFilter = useCalendarioPaxStore((state) => state.setFilter);
  const setSelectedDate = useCalendarioPaxStore((state) => state.setSelectedDate);
  const selectEvent = useCalendarioPaxStore((state) => state.selectEvent);
  const clearError = useCalendarioPaxStore((state) => state.clearError);
  const resetFilters = useCalendarioPaxStore((state) => state.resetFilters);
  const goToPreviousMonth = useCalendarioPaxStore((state) => state.goToPreviousMonth);
  const goToNextMonth = useCalendarioPaxStore((state) => state.goToNextMonth);
  const goToToday = useCalendarioPaxStore((state) => state.goToToday);

  const getEventosByDate = useCalendarioPaxStore((state) => state.getEventosByDate);
  const getSelectedDateEventos = useCalendarioPaxStore((state) => state.getSelectedDateEventos);
  const getSelectedEvent = useCalendarioPaxStore((state) => state.getSelectedEvent);
  const getMetrics = useCalendarioPaxStore((state) => state.getMetrics);

  const [filtersOpen, setFiltersOpen] = useState(false);

  const monthDays = useMemo(() => getCalendarDays(currentMonth), [currentMonth]);
  const monthDate = getMonthDate(currentMonth);
  const today = getToday();
  const selectedDateEventos = getSelectedDateEventos();
  const selectedEvent = getSelectedEvent();
  const metrics = getMetrics();

  useEffect(() => {
    loadCalendario();
  }, [loadCalendario]);

  useEffect(() => {
    loadCalendario();
  }, [currentMonth]);

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

  const tipoOptions: SelectOption[] = [
    { value: "todos", label: "Todos" },
    { value: "IN", label: "Pax saliendo" },
    { value: "OUT", label: "Pax regresando" }
  ];

  function handleRefresh() {
    loadCalendario();
  }

  function handleToday() {
    goToToday();
    window.setTimeout(() => loadCalendario(), 0);
  }

  function handlePreviousMonth() {
    goToPreviousMonth();
  }

  function handleNextMonth() {
    goToNextMonth();
  }

  function handleReset() {
    resetFilters();
    window.setTimeout(() => loadCalendario(), 0);
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Calendario Pax</h1>
          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            IN / OUT
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            {canManageCalendario
              ? "Pasajeros saliendo y regresando por carritos y files"
              : `Calendario de ${currentProfile?.nombre || "tu usuario"}`}
          </span>
        </div>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            <span>{error}</span>
            <button type="button" onClick={clearError} className="text-red-500 hover:text-red-700">
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
                  {getMonthTitle(currentMonth)}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Vendedor: {filters.vendedorId} · Sucursal: {filters.sucursalId} · Tipo: {filters.tipoEvento}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white"
              >
                Hoy
              </button>

              <button
                type="button"
                onClick={handleRefresh}
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.5fr]">
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

                <div>
                  <FieldLabel>Tipo</FieldLabel>
                  <NosturSelect
                    value={filters.tipoEvento}
                    onChange={(value) => setFilter("tipoEvento", value as typeof filters.tipoEvento)}
                    options={tipoOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Buscar</FieldLabel>
                  <div className="flex h-9 items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                    <Search size={14} className="shrink-0 text-[#64748b]" />
                    <input
                      value={filters.search}
                      onChange={(event) => setFilter("search", event.target.value)}
                      placeholder="Pasajero, destino, carrito, file..."
                      className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-9 rounded-xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="h-9 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                >
                  Aplicar filtros
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Eventos" value={metrics.totalEventos} icon={CalendarDays} />
          <MetricCard label="Pax saliendo" value={metrics.totalIn} icon={PlaneTakeoff} tone="green" />
          <MetricCard label="Pax regresando" value={metrics.totalOut} icon={PlaneLanding} tone="amber" />
          <MetricCard label="Pasajeros únicos" value={metrics.totalPasajeros} icon={UsersRound} tone="blue" />
          <MetricCard label="Próximas salidas" value={metrics.proximasSalidas} icon={PlaneTakeoff} tone="green" />
          <MetricCard label="Próximos regresos" value={metrics.proximosRegresos} icon={PlaneLanding} tone="amber" />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 overflow-hidden rounded-[24px] border border-black/10 bg-white/70 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays size={17} className="text-nostur-orange" />
                <h2 className="truncate text-sm font-black text-[#111827]">
                  {getMonthTitle(currentMonth)}
                </h2>
                {loading ? (
                  <span className="rounded-xl bg-white px-2 py-1 text-[10px] font-black text-[#64748b]">
                    Cargando...
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePreviousMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827]"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827]"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-black/10 bg-[#f8fafc]">
              {WEEK_DAYS.map((day) => (
                <div
                  key={day}
                  className="border-r border-black/10 px-2 py-2 text-center text-[10px] font-black uppercase tracking-wide text-[#64748b] last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((date) => {
                const storageDate = formatStorageDate(date);
                const isCurrentMonth = date.getMonth() === monthDate.getMonth();
                const isToday = storageDate === today;
                const isSelected = storageDate === selectedDate;
                const dayEvents = getEventosByDate(storageDate);
                const visibleEvents = dayEvents.slice(0, 4);
                const hiddenCount = Math.max(0, dayEvents.length - visibleEvents.length);

                return (
                  <button
                    key={storageDate}
                    type="button"
                    onClick={() => setSelectedDate(storageDate)}
                    className={[
                      "min-h-[112px] border-r border-b border-black/10 p-1.5 text-left transition last:border-r-0",
                      isCurrentMonth ? "bg-white/70 hover:bg-white" : "bg-[#f8fafc]/70 text-[#94a3b8]",
                      isSelected ? "bg-nostur-orange/10 ring-2 ring-inset ring-nostur-orange/35" : "",
                      isToday ? "shadow-[inset_0_0_0_1px_rgba(255,122,26,0.35)]" : ""
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black",
                          isToday ? "bg-[#111827] text-white" : isCurrentMonth ? "text-[#111827]" : "text-[#94a3b8]"
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </span>

                      {dayEvents.length > 0 ? (
                        <span className="rounded-lg bg-white/80 px-1.5 py-0.5 text-[9px] font-black text-[#64748b]">
                          {dayEvents.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="grid gap-1">
                      {visibleEvents.map((event) => (
                        <EventPill
                          key={event.id}
                          event={event}
                          compact
                          selected={event.id === selectedEventId}
                          onClick={() => {
                            setSelectedDate(storageDate);
                            selectEvent(event.id);
                          }}
                        />
                      ))}

                      {hiddenCount > 0 ? (
                        <span className="px-1 text-[10px] font-black text-[#64748b]">
                          +{hiddenCount} más
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="min-w-0 space-y-3">
            <section className="rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#64748b]">
                  {formatDateAR(selectedDate)}
                </div>
                <div className="text-2xl font-black text-[#111827]">
                  {selectedDate.slice(8, 10)}
                </div>
                <div className="text-xs font-semibold text-[#64748b]">
                  {selectedDateEventos.length} eventos
                </div>
              </div>

              <div className="grid gap-2">
                {selectedDateEventos.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
                    No hay pasajeros para esta fecha.
                  </div>
                ) : (
                  selectedDateEventos.map((event) => (
                    <EventPill
                      key={event.id}
                      event={event}
                      selected={event.id === selectedEventId}
                      onClick={() => selectEvent(event.id)}
                    />
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-[#111827]">Detalle</h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-green-400" />
                    IN
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                    OUT
                  </span>
                </div>
              </div>

              {selectedEvent ? (
                <EventDetailCard event={selectedEvent} />
              ) : selectedDateEventos[0] ? (
                <EventDetailCard event={selectedDateEventos[0]} />
              ) : (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
                  Seleccioná un pasajero para ver el detalle.
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <PlaneTakeoff size={15} className="text-green-700" />
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">
                  Próximas salidas
                </h2>
              </div>

              <div className="grid max-h-[220px] gap-2 overflow-auto pr-1">
                {useCalendarioPaxStore
                  .getState()
                  .getFilteredEventos()
                  .filter((event) => event.tipo_evento === "IN" && event.fecha >= today)
                  .slice(0, 8)
                  .map((event) => (
                    <EventPill
                      key={`next-in-${event.id}`}
                      event={event}
                      compact
                      selected={event.id === selectedEventId}
                      onClick={() => {
                        setSelectedDate(event.fecha);
                        selectEvent(event.id);
                      }}
                    />
                  ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center gap-2">
                <PlaneLanding size={15} className="text-amber-700" />
                <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">
                  Próximos regresos
                </h2>
              </div>

              <div className="grid max-h-[220px] gap-2 overflow-auto pr-1">
                {useCalendarioPaxStore
                  .getState()
                  .getFilteredEventos()
                  .filter((event) => event.tipo_evento === "OUT" && event.fecha >= today)
                  .slice(0, 8)
                  .map((event) => (
                    <EventPill
                      key={`next-out-${event.id}`}
                      event={event}
                      compact
                      selected={event.id === selectedEventId}
                      onClick={() => {
                        setSelectedDate(event.fecha);
                        selectEvent(event.id);
                      }}
                    />
                  ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}