import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Edit3,
  Eye,
  Filter,
  FolderOpen,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react";
import {
  formatFileSize,
  getColaborativoEstadoLabel,
  useColaborativoStore,
  type ColaborativoAdjunto,
  type ColaborativoComentario,
  type ColaborativoHistorial,
  type ColaborativoProcedimiento,
  type ColaborativoProcedimientoDraft,
  type ColaborativoProyecto,
  type ColaborativoProyectoDraft
} from "../../store/colaborativoStore";

/* =========================================================
   TIPOS LOCALES
========================================================= */

type ColaborativoState = ReturnType<typeof useColaborativoStore.getState>;

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ModalMode = "proyecto" | "procedimiento" | "adjunto" | null;

type ProcedimientoFlexible = ColaborativoProcedimiento & {
  proyecto_id?: string | null;
  titulo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  contenido?: string | null;
  contenido_html?: string | null;
  estado?: string | null;
  tags?: string[] | null;
  version?: number | null;
  imagenes_count?: number | null;
  adjuntos_count?: number | null;
  comentarios_count?: number | null;
  activo?: boolean | null;
  archivado?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProyectoFlexible = ColaborativoProyecto & {
  id: string;
  nombre?: string | null;
  descripcion?: string | null;
  color?: string | null;
  icono?: string | null;
  orden?: number | null;
  activo?: boolean | null;
  cantidad_procedimientos?: number | null;
  publicados?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type AdjuntoFlexible = ColaborativoAdjunto & {
  id: string;
  procedimiento_id?: string | null;
  nombre?: string | null;
  archivo_nombre?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  tipo?: string | null;
  url?: string | null;
  public_url?: string | null;
  archivo_url?: string | null;
  tamano_bytes?: number | null;
  size_bytes?: number | null;
  created_at?: string | null;
};

type HistorialFlexible = ColaborativoHistorial & {
  id?: string;
  accion?: string | null;
  detalle?: string | null;
  created_by_nombre?: string | null;
  created_at?: string | null;
};

type ComentarioFlexible = ColaborativoComentario & {
  id: string;
  procedimiento_id?: string | null;
  comentario?: string | null;
  contenido?: string | null;
  created_by_nombre?: string | null;
  created_at?: string | null;
};

type ProyectoDraftLocal = ColaborativoProyectoDraft & {
  id?: string | null;
  nombre?: string;
  descripcion?: string;
  color?: string;
  icono?: string;
  activo?: boolean;
};

type ProcedimientoDraftLocal = ColaborativoProcedimientoDraft & {
  id?: string | null;
  proyecto_id?: string | null;
  titulo?: string;
  descripcion?: string;
  contenido?: string;
  contenido_html?: string;
  estado?: string;
  tags?: string[];
  activo?: boolean;
};

/* =========================================================
   CONSTANTES
========================================================= */

const ESTADO_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "PUBLICADO", label: "Publicados" },
  { value: "BORRADOR", label: "Borradores" },
  { value: "ARCHIVADO", label: "Archivados" }
];

const PROJECT_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#f97316",
  "#0f766e",
  "#334155",
  "#16a34a",
  "#dc2626",
  "#0891b2"
];

/* =========================================================
   HELPERS
========================================================= */

function getTodayDisplay(): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Cordoba"
  }).format(new Date());
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Cordoba"
  }).format(date);
}

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function getInitials(name?: string | null): string {
  return cleanText(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getProyectoNombre(proyecto?: ColaborativoProyecto | null): string {
  const record = proyecto as ProyectoFlexible | null | undefined;
  return record?.nombre || "Proyecto sin nombre";
}

function getProyectoDescripcion(proyecto?: ColaborativoProyecto | null): string {
  const record = proyecto as ProyectoFlexible | null | undefined;
  return record?.descripcion || "Procedimientos, comandos y operaciones frecuentes.";
}

function getProyectoColor(proyecto?: ColaborativoProyecto | null): string {
  const record = proyecto as ProyectoFlexible | null | undefined;
  return record?.color || "#2563eb";
}

function getProyectoCantidad(proyecto?: ColaborativoProyecto | null, procedimientos: ColaborativoProcedimiento[] = []): number {
  const record = proyecto as ProyectoFlexible | null | undefined;

  if (typeof record?.cantidad_procedimientos === "number") {
    return record.cantidad_procedimientos;
  }

  return procedimientos.filter((procedimiento) => {
    const item = procedimiento as ProcedimientoFlexible;
    return item.proyecto_id === record?.id && !Boolean(item.archivado);
  }).length;
}

function getProyectoPublicados(proyecto?: ColaborativoProyecto | null, procedimientos: ColaborativoProcedimiento[] = []): number {
  const record = proyecto as ProyectoFlexible | null | undefined;

  if (typeof record?.publicados === "number") {
    return record.publicados;
  }

  return procedimientos.filter((procedimiento) => {
    const item = procedimiento as ProcedimientoFlexible;
    return item.proyecto_id === record?.id && item.estado === "PUBLICADO";
  }).length;
}

function getProcedimientoTitulo(procedimiento?: ColaborativoProcedimiento | null): string {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return record?.titulo || record?.nombre || "Procedimiento sin título";
}

function getProcedimientoDescripcion(procedimiento?: ColaborativoProcedimiento | null): string {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return record?.descripcion || "Sin descripción.";
}

function getProcedimientoContenido(procedimiento?: ColaborativoProcedimiento | null): string {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return record?.contenido_html || record?.contenido || "";
}

function getProcedimientoEstado(procedimiento?: ColaborativoProcedimiento | null): string {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return record?.estado || "BORRADOR";
}

function getProcedimientoTags(procedimiento?: ColaborativoProcedimiento | null): string[] {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return Array.isArray(record?.tags) ? record.tags : [];
}

function getProcedimientoVersion(procedimiento?: ColaborativoProcedimiento | null): number {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return Number(record?.version || 1);
}

function getProcedimientoImagenesCount(procedimiento?: ColaborativoProcedimiento | null): number {
  const record = procedimiento as ProcedimientoFlexible | null | undefined;
  return Number(record?.imagenes_count || 0);
}



function getAdjuntoNombre(adjunto: ColaborativoAdjunto): string {
  const record = adjunto as AdjuntoFlexible;
  return record.nombre || record.archivo_nombre || record.file_name || "Archivo";
}

function getAdjuntoUrl(adjunto: ColaborativoAdjunto): string | null {
  const record = adjunto as AdjuntoFlexible;
  return record.url || record.public_url || record.archivo_url || null;
}

function getAdjuntoSize(adjunto: ColaborativoAdjunto): number {
  const record = adjunto as AdjuntoFlexible;
  return Number(record.tamano_bytes || record.size_bytes || 0);
}

function getComentarioTexto(comentario: ColaborativoComentario): string {
  const record = comentario as ComentarioFlexible;
  return record.comentario || record.contenido || "";
}

function getComentarioAutor(comentario: ColaborativoComentario): string {
  const record = comentario as ComentarioFlexible;
  return record.created_by_nombre || "Usuario";
}

function getHistorialAutor(item: ColaborativoHistorial): string {
  const record = item as HistorialFlexible;
  return record.created_by_nombre || "Usuario";
}

function getHistorialDetalle(item: ColaborativoHistorial): string | null {
  const record = item as HistorialFlexible;
  return record.detalle || null;
}

function getEstadoTone(estado: string): "success" | "warning" | "neutral" {
  if (estado === "PUBLICADO") return "success";
  if (estado === "BORRADOR") return "warning";
  return "neutral";
}

function EstadoBadge({ estado }: { estado: string }) {
  const tone = getEstadoTone(estado);

  const className = {
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700"
  }[tone];

  return (
    <span className={["rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", className].join(" ")}>
      {getColaborativoEstadoLabel ? getColaborativoEstadoLabel(estado) : estado}
    </span>
  );
}

/* =========================================================
   COMPONENTES UI
========================================================= */

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
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition placeholder:text-[#94a3b8] focus:border-nostur-orange disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  minHeight = 110
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{ minHeight }}
      className="w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition placeholder:text-[#94a3b8] focus:border-nostur-orange"
    />
  );
}

function RichTextEditor({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(command: string) {
    document.execCommand(command);
    onChange(editorRef.current?.innerHTML || "");
  }

  function insertList() {
    document.execCommand("insertUnorderedList");
    onChange(editorRef.current?.innerHTML || "");
  }

  function insertOrderedList() {
    document.execCommand("insertOrderedList");
    onChange(editorRef.current?.innerHTML || "");
  }

  function insertImageFromFile(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const src = String(reader.result || "");
      if (!src) return;

      document.execCommand("insertImage", false, src);
      onChange(editorRef.current?.innerHTML || "");
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-[#f8fafc] p-2">
        <button type="button" onClick={() => exec("bold")} className="h-8 rounded-lg px-3 text-xs font-black hover:bg-white">
          B
        </button>
        <button type="button" onClick={() => exec("italic")} className="h-8 rounded-lg px-3 text-xs font-black italic hover:bg-white">
          I
        </button>
        <button type="button" onClick={() => exec("underline")} className="h-8 rounded-lg px-3 text-xs font-black underline hover:bg-white">
          U
        </button>
        <button type="button" onClick={insertList} className="h-8 rounded-lg px-3 text-xs font-black hover:bg-white">
          Lista
        </button>
        <button type="button" onClick={insertOrderedList} className="h-8 rounded-lg px-3 text-xs font-black hover:bg-white">
          1. Lista
        </button>

        <label className="ml-auto flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-black text-[#334155] hover:bg-[#f8fafc]">
          <ImageIcon size={14} />
          Imagen
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (file) insertImageFromFile(file);
            }}
          />
        </label>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || "")}
        className="prose prose-sm max-w-none min-h-[260px] rounded-b-2xl px-4 py-3 text-sm font-medium leading-relaxed text-[#111827] outline-none"
      />
    </div>
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
    <div className={["relative", open ? "z-[140]" : "z-0"].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-left text-xs font-semibold text-[#111827] outline-none transition hover:bg-white"
      >
        <span className={selected ? "truncate" : "truncate text-[#94a3b8]"}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown size={14} className={["shrink-0 text-[#64748b] transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />

          <div className="absolute left-0 right-0 top-[44px] z-[150] max-h-60 overflow-auto rounded-2xl border border-black/10 bg-white p-1 shadow-xl">
            {options.map((option) => {
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
                    "flex h-9 w-full items-center rounded-xl px-3 text-left text-xs font-bold transition",
                    active ? "bg-nostur-orange text-white" : "text-[#334155] hover:bg-[#f1f5f9]"
                  ].join(" ")}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[260] w-[320px] rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={["mb-1 font-black", toast.type === "success" ? "text-green-700" : "text-red-700"].join(" ")}>
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

function InlineError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
      <span>{message}</span>
      <button type="button" onClick={onClose} className="text-red-500 hover:text-red-700">
        <X size={14} />
      </button>
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
  icon: typeof BookOpen;
  tone?: "orange" | "blue" | "green" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    orange: "bg-nostur-orange/15 text-nostur-orange",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-50 text-slate-700"
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

/* =========================================================
   CARDS
========================================================= */

function ProyectoCard({
  proyecto,
  selected,
  procedimientos,
  onSelect,
  onEdit
}: {
  proyecto: ColaborativoProyecto;
  selected: boolean;
  procedimientos: ColaborativoProcedimiento[];
  onSelect: () => void;
  onEdit: () => void;
}) {
  const color = getProyectoColor(proyecto);
  const nombre = getProyectoNombre(proyecto);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group w-full rounded-2xl border p-3 text-left transition",
        selected
          ? "border-nostur-orange/40 bg-nostur-orange/10"
          : "border-black/10 bg-white/75 hover:border-nostur-orange/30 hover:bg-white"
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[11px] font-black text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          {getInitials(nombre)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-xs font-black text-[#111827]">{nombre}</h3>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94a3b8] opacity-0 transition hover:bg-white hover:text-nostur-orange group-hover:opacity-100"
            >
              <Edit3 size={13} />
            </button>
          </div>

          <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold text-[#64748b]">
            {getProyectoDescripcion(proyecto)}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#334155]">
              {getProyectoCantidad(proyecto, procedimientos)} procedimientos
            </span>
            <span className="rounded-lg bg-green-50 px-2 py-1 text-[10px] font-black text-green-700">
              {getProyectoPublicados(proyecto, procedimientos)} publicados
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ProcedimientoCard({
  procedimiento,
  selected,
  onSelect,
  onEdit
}: {
  procedimiento: ColaborativoProcedimiento;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const estado = getProcedimientoEstado(procedimiento);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-2xl border p-3 text-left transition",
        selected
          ? "border-nostur-orange/40 bg-nostur-orange/10"
          : "border-black/10 bg-white/70 hover:border-nostur-orange/30 hover:bg-white"
      ].join(" ")}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_auto]">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-[#111827]">
            {getProcedimientoTitulo(procedimiento)}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-[#64748b]">
            {getProcedimientoDescripcion(procedimiento)}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {getProcedimientoTags(procedimiento).slice(0, 5).map((tag) => (
              <span key={tag} className="rounded-lg bg-[#f1f5f9] px-2 py-1 text-[10px] font-black text-[#475569]">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EstadoBadge estado={estado} />
          <span className="rounded-xl bg-white px-2.5 py-1 text-[10px] font-black text-[#64748b]">
            v{getProcedimientoVersion(procedimiento)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1">
          <span className="text-[10px] font-bold text-[#64748b]">
            {getProcedimientoImagenesCount(procedimiento)} imágenes
          </span>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-nostur-orange hover:bg-white"
            title="Editar"
          >
            <Edit3 size={14} />
          </button>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   MODALES
========================================================= */

function ProyectoModal({
  proyecto,
  saving,
  onClose,
  onSave
}: {
  proyecto: ColaborativoProyecto | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ProyectoDraftLocal) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProyectoDraftLocal>(() => {
    const record = proyecto as ProyectoFlexible | null;

    return {
      id: record?.id || null,
      nombre: record?.nombre || "",
      descripcion: record?.descripcion || "",
      color: record?.color || PROJECT_COLORS[0],
      icono: record?.icono || "",
      activo: record?.activo ?? true
    } as ProyectoDraftLocal;
  });

  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof ProyectoDraftLocal>(key: K, value: ProyectoDraftLocal[K]) {
    setLocalError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    if (!cleanText(draft.nombre)) {
      setLocalError("Ingresá el nombre del proyecto.");
      return;
    }

    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {proyecto ? "Editar proyecto" : "Nuevo proyecto"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Agrupá procedimientos por aplicativo, área o proceso interno.
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

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="grid gap-3">
          <div>
            <FieldLabel>Nombre *</FieldLabel>
            <TextInput
              value={draft.nombre || ""}
              onChange={(value) => setField("nombre", value)}
              placeholder="Ej: Amadeus"
            />
          </div>

          <div>
            <FieldLabel>Descripción</FieldLabel>
            <TextArea
              value={draft.descripcion || ""}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Procedimientos, comandos y operaciones frecuentes..."
              minHeight={90}
            />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setField("color", color)}
                  className={[
                    "h-9 w-9 rounded-xl border-2 transition",
                    draft.color === color ? "border-[#111827] scale-105" : "border-white"
                  ].join(" ")}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Guardando..." : proyecto ? "Guardar cambios" : "Crear proyecto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProcedimientoModal({
  procedimiento,
  proyectoId,
  saving,
  onClose,
  onSave
}: {
  procedimiento: ColaborativoProcedimiento | null;
  proyectoId: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ProcedimientoDraftLocal) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ProcedimientoDraftLocal>(() => {
    const record = procedimiento as ProcedimientoFlexible | null;

    return {
      id: record?.id || null,
      proyecto_id: record?.proyecto_id || proyectoId,
      titulo: record?.titulo || record?.nombre || "",
      descripcion: record?.descripcion || "",
      contenido: record?.contenido || record?.contenido_html || "",
      contenido_html: record?.contenido_html || record?.contenido || "",
      estado: record?.estado || "BORRADOR",
      tags: getProcedimientoTags(procedimiento),
      activo: record?.activo ?? true
    } as ProcedimientoDraftLocal;
  });

  const [tagInput, setTagInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof ProcedimientoDraftLocal>(key: K, value: ProcedimientoDraftLocal[K]) {
    setLocalError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addTag() {
    const clean = cleanText(tagInput).toLowerCase();
    if (!clean) return;

    setDraft((current) => ({
      ...current,
      tags: Array.from(new Set([...(current.tags || []), clean]))
    }));

    setTagInput("");
  }

  function removeTag(tag: string) {
    setDraft((current) => ({
      ...current,
      tags: (current.tags || []).filter((item) => item !== tag)
    }));
  }

  function handleSave() {
    if (!draft.proyecto_id) {
      setLocalError("Seleccioná un proyecto.");
      return;
    }

    if (!cleanText(draft.titulo)) {
      setLocalError("Ingresá el título del procedimiento.");
      return;
    }

    if (!cleanText(draft.contenido_html || draft.contenido)) {
      setLocalError("Ingresá el contenido del procedimiento.");
      return;
    }

       const contenidoFinal = draft.contenido_html || draft.contenido || "";

    onSave({
      ...draft,
      contenido: contenidoFinal,
      contenido_html: contenidoFinal
    });
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-56px)] w-full max-w-6xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {procedimiento ? "Editar procedimiento" : "Nuevo procedimiento"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Base interna colaborativa con texto enriquecido e imágenes pegadas en el contenido.
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

        <InlineError message={localError} onClose={() => setLocalError(null)} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="grid gap-3">
            <div>
              <FieldLabel>Título *</FieldLabel>
              <TextInput
                value={draft.titulo || ""}
                onChange={(value) => setField("titulo", value)}
                placeholder="Ej: Crear PNR completo en Amadeus"
              />
            </div>

            <div>
              <FieldLabel>Descripción corta</FieldLabel>
              <TextInput
                value={draft.descripcion || ""}
                onChange={(value) => setField("descripcion", value)}
                placeholder="Resumen visible en el índice..."
              />
            </div>

            <div>
              <FieldLabel>Contenido *</FieldLabel>
              <RichTextEditor
                value={draft.contenido_html || draft.contenido || ""}
                onChange={(value) => {
                  setField("contenido_html", value);
                  setField("contenido", value);
                }}
              />
            </div>
          </main>

          <aside className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <div className="grid gap-3">
              <div>
                <FieldLabel>Estado</FieldLabel>
               <NosturSelect
  value={draft.estado || "BORRADOR"}
  onChange={(value) =>
    setField("estado", value as "BORRADOR" | "PUBLICADO" | "ARCHIVADO")
  }
  options={[
    { value: "BORRADOR", label: "Borrador" },
    { value: "PUBLICADO", label: "Publicado" },
    { value: "ARCHIVADO", label: "Archivado" }
  ]}
/>
              </div>

              <div>
                <FieldLabel>Tags</FieldLabel>
                <div className="flex gap-2">
                  <TextInput value={tagInput} onChange={setTagInput} placeholder="Ej: amadeus" />
                  <button
                    type="button"
                    onClick={addTag}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nostur-orange text-white"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {(draft.tags || []).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#475569] hover:bg-red-50 hover:text-red-700"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-[11px] font-bold text-blue-700">
                Podés insertar imágenes desde el botón “Imagen” del editor. Quedan embebidas dentro del procedimiento.
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex h-9 items-center gap-2 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Guardando..." : procedimiento ? "Guardar cambios" : "Crear procedimiento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjuntoModal({
  saving,
  onClose,
  onUpload
}: {
  saving: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);

  function handleUpload() {
    if (!file) return;
    onUpload(file);
  }

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Subir adjunto</h2>
            <p className="text-xs text-[#64748b]">PDF, Word, Excel, JPG, PNG u otros archivos internos.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            <X size={17} />
          </button>
        </div>

        <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-[#f8fafc] p-6 text-center hover:bg-white">
          <Upload size={24} className="mb-2 text-nostur-orange" />
          <div className="text-sm font-black text-[#111827]">
            {file ? file.name : "Seleccionar archivo"}
          </div>
          <div className="mt-1 text-xs font-semibold text-[#64748b]">
            {file ? formatFileSize(file.size) : "Arrastrá o seleccioná un archivo"}
          </div>
          <input
            type="file"
            className="hidden"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] || null;
              setFile(nextFile);
            }}
          />
        </label>

        <div className="mt-5 flex justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl px-4 text-xs font-bold text-[#64748b] hover:bg-black/5 hover:text-[#111827]"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={saving || !file}
            onClick={handleUpload}
            className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Upload size={14} />
            {saving ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   PANEL PRINCIPAL
========================================================= */

export function ColaborativoPanel() {
  const loading = useColaborativoStore((state: ColaborativoState) => state.loading);
  const saving = useColaborativoStore((state: ColaborativoState) => state.saving);
  const error = useColaborativoStore((state: ColaborativoState) => state.error);
  const currentProfile = useColaborativoStore((state: ColaborativoState) => state.currentProfile);
  const canManageColaborativo = useColaborativoStore((state: ColaborativoState) => state.canManageColaborativo);
  const canAdminColaborativo = useColaborativoStore((state: ColaborativoState) => state.canAdminColaborativo);

  const proyectos = useColaborativoStore((state: ColaborativoState) => state.proyectos);
  const procedimientos = useColaborativoStore((state: ColaborativoState) => state.procedimientos);
  const adjuntos = useColaborativoStore((state: ColaborativoState) => state.adjuntos);
  const comentarios = useColaborativoStore((state: ColaborativoState) => state.comentarios);
  const historial = useColaborativoStore((state: ColaborativoState) => state.historial);
  const filters = useColaborativoStore((state: ColaborativoState) => state.filters);
  const selectedProyectoId = useColaborativoStore((state: ColaborativoState) => state.selectedProyectoId);
  const selectedProcedimientoId = useColaborativoStore((state: ColaborativoState) => state.selectedProcedimientoId);

  const loadColaborativo = useColaborativoStore((state: ColaborativoState) => state.loadColaborativo);
  const saveProyecto = useColaborativoStore((state: ColaborativoState) => state.saveProyecto);
  const saveProcedimiento = useColaborativoStore((state: ColaborativoState) => state.saveProcedimiento);
  const setFilter = useColaborativoStore((state: ColaborativoState) => state.setFilter);
  const resetFilters = useColaborativoStore((state: ColaborativoState) => state.resetFilters);
  const selectProyecto = useColaborativoStore((state: ColaborativoState) => state.selectProyecto);
  const selectProcedimiento = useColaborativoStore((state: ColaborativoState) => state.selectProcedimiento);
  const clearError = useColaborativoStore((state: ColaborativoState) => state.clearError);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingProyecto, setEditingProyecto] = useState<ColaborativoProyecto | null>(null);
  const [editingProcedimiento, setEditingProcedimiento] = useState<ColaborativoProcedimiento | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    loadColaborativo();
  }, [loadColaborativo]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  const selectedProyecto = useMemo<ColaborativoProyecto | null>(() => {
    return proyectos.find((proyecto: ColaborativoProyecto) => {
      const record = proyecto as ProyectoFlexible;
      return record.id === selectedProyectoId;
    }) || proyectos[0] || null;
  }, [proyectos, selectedProyectoId]);

  const selectedProcedimiento = useMemo<ColaborativoProcedimiento | null>(() => {
    return procedimientos.find((procedimiento: ColaborativoProcedimiento) => {
      const record = procedimiento as ProcedimientoFlexible;
      return record.id === selectedProcedimientoId;
    }) || null;
  }, [procedimientos, selectedProcedimientoId]);

  const filteredProcedimientos = useMemo<ColaborativoProcedimiento[]>(() => {
    const search = cleanText(filters.search).toLowerCase();
    const estado = filters.estado || "todos";
    const proyectoId = selectedProyecto ? (selectedProyecto as ProyectoFlexible).id : selectedProyectoId;

    return procedimientos.filter((procedimiento: ColaborativoProcedimiento) => {
      const record = procedimiento as ProcedimientoFlexible;

      if (proyectoId && record.proyecto_id !== proyectoId) return false;

      if (estado !== "todos" && record.estado !== estado) return false;

      if (!search) return true;

      const haystack = [
        getProcedimientoTitulo(procedimiento),
        getProcedimientoDescripcion(procedimiento),
        getProcedimientoContenido(procedimiento),
        getProcedimientoTags(procedimiento).join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [filters.search, filters.estado, procedimientos, selectedProyecto, selectedProyectoId]);

  const selectedAdjuntos = useMemo<ColaborativoAdjunto[]>(() => {
    if (!selectedProcedimiento) return [];

    const selectedId = (selectedProcedimiento as ProcedimientoFlexible).id;

    return adjuntos.filter((adjunto: ColaborativoAdjunto) => {
      const record = adjunto as AdjuntoFlexible;
      return record.procedimiento_id === selectedId;
    });
  }, [adjuntos, selectedProcedimiento]);

  const selectedComentarios = useMemo<ColaborativoComentario[]>(() => {
    if (!selectedProcedimiento) return [];

    const selectedId = (selectedProcedimiento as ProcedimientoFlexible).id;

    return comentarios.filter((comentario: ColaborativoComentario) => {
      const record = comentario as ComentarioFlexible;
      return record.procedimiento_id === selectedId;
    });
  }, [comentarios, selectedProcedimiento]);

  const selectedHistorial = useMemo<ColaborativoHistorial[]>(() => {
    if (!selectedProcedimiento) return [];

    const selectedId = (selectedProcedimiento as ProcedimientoFlexible).id;

    return historial.filter((item: ColaborativoHistorial) => {
      const record = item as HistorialFlexible & { procedimiento_id?: string | null };
      return record.procedimiento_id === selectedId;
    });
  }, [historial, selectedProcedimiento]);

  const totalPublicados = procedimientos.filter((procedimiento) => getProcedimientoEstado(procedimiento) === "PUBLICADO").length;
  const totalBorradores = procedimientos.filter((procedimiento) => getProcedimientoEstado(procedimiento) === "BORRADOR").length;
  const totalArchivados = procedimientos.filter((procedimiento) => getProcedimientoEstado(procedimiento) === "ARCHIVADO").length;
  const totalImagenes = procedimientos.reduce((acc, procedimiento) => acc + getProcedimientoImagenesCount(procedimiento), 0);

  async function handleSaveProyecto(draft: ProyectoDraftLocal) {
    const result = await saveProyecto(draft as ColaborativoProyectoDraft);

    if (result) {
      setModalMode(null);
      setEditingProyecto(null);
      showToast(editingProyecto ? "Proyecto actualizado correctamente." : "Proyecto creado correctamente.");
    }
  }

  async function handleSaveProcedimiento(draft: ProcedimientoDraftLocal) {
    const result = await saveProcedimiento(draft as ColaborativoProcedimientoDraft);

    if (result) {
      setModalMode(null);
      setEditingProcedimiento(null);
      showToast(editingProcedimiento ? "Procedimiento actualizado correctamente." : "Procedimiento creado correctamente.");
    }
  }

  async function handleUploadAdjunto(_file: File) {
    showToast("La subida de adjuntos queda pendiente de conectar al store/storage.", "error");
    setModalMode(null);
  }

  function openNewProyecto() {
    setEditingProyecto(null);
    setModalMode("proyecto");
  }

  function openEditProyecto(proyecto: ColaborativoProyecto) {
    setEditingProyecto(proyecto);
    setModalMode("proyecto");
  }

  function openNewProcedimiento() {
    if (!selectedProyecto) {
      showToast("Seleccioná un proyecto antes de crear un procedimiento.", "error");
      return;
    }

    setEditingProcedimiento(null);
    setModalMode("procedimiento");
  }

  function openEditProcedimiento(procedimiento: ColaborativoProcedimiento) {
    setEditingProcedimiento(procedimiento);
    selectProcedimiento((procedimiento as ProcedimientoFlexible).id);
    setModalMode("procedimiento");
  }

  function handleSelectProyecto(proyecto: ColaborativoProyecto) {
    const proyectoId = (proyecto as ProyectoFlexible).id;
    selectProyecto(proyectoId);
    selectProcedimiento(null);
  }

  function handleSelectProcedimiento(procedimiento: ColaborativoProcedimiento) {
    selectProcedimiento((procedimiento as ProcedimientoFlexible).id);
  }

  if (!canManageColaborativo && !loading) {
    return (
      <div className="h-full overflow-auto bg-[#eef1f6] px-6 py-5 text-[#1f2937]">
        <div className="mx-auto max-w-2xl rounded-[24px] border border-red-200 bg-red-50 p-5 text-red-700">
          <h1 className="text-lg font-black">Sin acceso</h1>
          <p className="mt-1 text-sm font-semibold">
            Tu usuario no tiene permisos para ver el módulo Colaborativo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-[#111827]">Colaborativo</h1>
            <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
              PROCEDIMIENTOS
            </span>
            <span className="text-xs font-semibold text-[#64748b]">
              Base interna editable de procedimientos por proyecto
            </span>
          </div>

          <span className="rounded-xl bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#64748b] shadow-sm">
            {currentProfile?.nombre || "Usuario"} · {getTodayDisplay()}
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
                  Proyecto: {selectedProyecto ? getProyectoNombre(selectedProyecto) : "Todos"}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Estado: {filters.estado || "todos"} · Búsqueda: {filters.search || "sin búsqueda"}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadColaborativo}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              {canAdminColaborativo ? (
                <button
                  type="button"
                  onClick={openNewProyecto}
                  className="flex h-8 items-center gap-2 rounded-xl bg-blue-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-blue-700"
                >
                  <FolderOpen size={13} strokeWidth={1.8} />
                  Proyecto
                </button>
              ) : null}

              <button
                type="button"
                onClick={openNewProcedimiento}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={13} strokeWidth={1.8} />
                Procedimiento
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
            <div className="mt-4 grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_auto]">
              <div>
                <FieldLabel>Estado</FieldLabel>
                <NosturSelect
                  value={filters.estado || "todos"}
                  onChange={(value) => setFilter("estado", value as never)}
                  options={ESTADO_OPTIONS}
                />
              </div>

              <div>
                <FieldLabel>Búsqueda</FieldLabel>
                <div className="flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search || ""}
                    onChange={(event) => setFilter("search", event.target.value as never)}
                    placeholder="Buscar por título, descripción, contenido o tags..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Limpiar
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <MetricCard label="Proyectos" value={proyectos.length} icon={FolderOpen} tone="blue" />
          <MetricCard label="Procedimientos" value={procedimientos.length} icon={BookOpen} tone="orange" />
          <MetricCard label="Publicados" value={totalPublicados} icon={CheckCircle2} tone="green" />
          <MetricCard label="Borradores" value={totalBorradores} icon={Edit3} tone="amber" />
          <MetricCard label="Archivados" value={totalArchivados} icon={Archive} tone="slate" />
          <MetricCard label="Imágenes" value={totalImagenes} icon={ImageIcon} tone="blue" />
          <MetricCard label="Comentarios" value={comentarios.length} icon={MessageSquare} tone="red" />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3">
              <h2 className="text-sm font-black text-[#111827]">Proyectos</h2>
              <p className="text-[11px] text-[#64748b]">{proyectos.length} proyectos</p>
            </div>

            <div className="grid max-h-[calc(100vh-360px)] gap-2 overflow-auto pr-1">
              {proyectos.map((proyecto: ColaborativoProyecto) => (
                <ProyectoCard
                  key={(proyecto as ProyectoFlexible).id}
                  proyecto={proyecto}
                  selected={(proyecto as ProyectoFlexible).id === selectedProyectoId}
                  procedimientos={procedimientos}
                  onSelect={() => handleSelectProyecto(proyecto)}
                  onEdit={() => openEditProyecto(proyecto)}
                />
              ))}
            </div>
          </aside>

          <main className="min-w-0 grid gap-4">
            <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="mb-3">
                <h2 className="text-sm font-black text-[#111827]">Índice de procedimientos</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${filteredProcedimientos.length} procedimientos encontrados`}
                </p>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs font-semibold text-[#64748b]">
                  Cargando procedimientos...
                </div>
              ) : filteredProcedimientos.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs font-semibold text-[#64748b]">
                  No hay procedimientos para los filtros seleccionados.
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredProcedimientos.map((procedimiento: ColaborativoProcedimiento) => (
                    <ProcedimientoCard
                      key={(procedimiento as ProcedimientoFlexible).id}
                      procedimiento={procedimiento}
                      selected={(procedimiento as ProcedimientoFlexible).id === selectedProcedimientoId}
                      onSelect={() => handleSelectProcedimiento(procedimiento)}
                      onEdit={() => openEditProcedimiento(procedimiento)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur">
              {!selectedProcedimiento ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs font-semibold text-[#64748b]">
                  Seleccioná un procedimiento para verlo o editarlo.
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <EstadoBadge estado={getProcedimientoEstado(selectedProcedimiento)} />
                        <span className="rounded-xl bg-white px-2.5 py-1 text-[10px] font-black text-[#64748b]">
                          v{getProcedimientoVersion(selectedProcedimiento)}
                        </span>
                      </div>

                      <h2 className="text-lg font-black text-[#111827]">
                        {getProcedimientoTitulo(selectedProcedimiento)}
                      </h2>
                      <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                        {getProcedimientoDescripcion(selectedProcedimiento)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalMode("adjunto")}
                        className="flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                      >
                        <Paperclip size={13} />
                        Archivo
                      </button>

                      <button
                        type="button"
                        onClick={() => showToast("Comentarios pendientes de conectar al store.", "error")}
                        className="flex h-8 items-center gap-2 rounded-xl bg-white px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
                      >
                        <MessageSquare size={13} />
                        Comentario
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditProcedimiento(selectedProcedimiento)}
                        className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                      >
                        <Edit3 size={13} />
                        Editar
                      </button>
                    </div>
                  </div>

                  <div
                    className="prose prose-sm max-w-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-[#111827]"
                    dangerouslySetInnerHTML={{
                      __html: getProcedimientoContenido(selectedProcedimiento) || "<p>Sin contenido.</p>"
                    }}
                  />

                  {selectedHistorial.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                      <h3 className="mb-2 text-xs font-black text-[#111827]">Historial</h3>

                      <div className="grid gap-2">
                        {selectedHistorial.slice(0, 5).map((item: ColaborativoHistorial, index: number) => {
                          const record = item as HistorialFlexible;

                          return (
                            <div key={record.id || `historial-${index}`} className="rounded-xl bg-white p-3 text-xs">
                              <div className="font-black text-[#111827]">
                                {record.accion || "Actualización"}
                              </div>
                              <div className="text-[11px] font-semibold text-[#64748b]">
                                {getHistorialAutor(item)} · {formatDateTime(record.created_at)}
                              </div>
                              {getHistorialDetalle(item) ? (
                                <div className="mt-1 text-[11px] font-semibold text-[#334155]">
                                  {getHistorialDetalle(item)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </main>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur">
            <section>
              <h2 className="mb-3 text-sm font-black text-[#111827]">Adjuntos</h2>

              {selectedAdjuntos.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
                  Sin adjuntos.
                </div>
              ) : (
                <div className="grid gap-2">
                  {selectedAdjuntos.map((adjunto: ColaborativoAdjunto) => {
                    const record = adjunto as AdjuntoFlexible;
                    const url = getAdjuntoUrl(adjunto);

                    return (
                      <div key={record.id} className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black text-[#111827]">
                              {getAdjuntoNombre(adjunto)}
                            </div>
                            <div className="text-[11px] font-semibold text-[#64748b]">
                              {formatFileSize(getAdjuntoSize(adjunto))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => showToast("Eliminar adjunto pendiente de conectar al store.", "error")}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 flex h-8 items-center justify-center gap-2 rounded-xl bg-white text-[11px] font-black text-[#334155] hover:bg-[#eef1f6]"
                          >
                            <Eye size={13} />
                            Abrir
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-5">
              <h2 className="mb-3 text-sm font-black text-[#111827]">Comentarios</h2>

              {selectedComentarios.length === 0 ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4 text-center text-xs font-semibold text-[#64748b]">
                  Sin comentarios.
                </div>
              ) : (
                <div className="grid gap-2">
                  {selectedComentarios.map((comentario: ColaborativoComentario) => {
                    const record = comentario as ComentarioFlexible;

                    return (
                      <div key={record.id} className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3 text-xs">
                        <div className="font-black text-[#111827]">
                          {getComentarioAutor(comentario)}
                        </div>
                        <div className="text-[11px] font-semibold text-[#64748b]">
                          {formatDateTime(record.created_at)}
                        </div>
                        <div className="mt-1 font-semibold text-[#334155]">
                          {getComentarioTexto(comentario)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>

      {modalMode === "proyecto" ? (
        <ProyectoModal
          proyecto={editingProyecto}
          saving={saving}
          onClose={() => {
            setModalMode(null);
            setEditingProyecto(null);
          }}
          onSave={handleSaveProyecto}
        />
      ) : null}

      {modalMode === "procedimiento" ? (
        <ProcedimientoModal
          procedimiento={editingProcedimiento}
          proyectoId={selectedProyecto ? (selectedProyecto as ProyectoFlexible).id : selectedProyectoId}
          saving={saving}
          onClose={() => {
            setModalMode(null);
            setEditingProcedimiento(null);
          }}
          onSave={handleSaveProcedimiento}
        />
      ) : null}

      {modalMode === "adjunto" ? (
        <AdjuntoModal
          saving={saving}
          onClose={() => setModalMode(null)}
          onUpload={handleUploadAdjunto}
        />
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}