import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Edit3,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Filter,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Upload,
  X
} from "lucide-react";
import {
  createInitialFileDraft,
  createInitialFolderDraft,
  formatFileSize,
  getDocumentFileLabel,
  getDocumentFolderLabel,
  getDocumentTipoLabel,
  useDocumentosStore,
  type DocumentFile,
  type DocumentFolder,
  type FileDraft,
  type FolderDraft,
  type SucursalLite,
  type UploadDocumentInput
} from "../../store/documentosStore";

/* =========================================================
   TIPOS / OPCIONES
========================================================= */

type DocumentosState = ReturnType<typeof useDocumentosStore.getState>;

type SelectOption = {
  value: string;
  label: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type ModalMode = "folder" | "upload" | "file-edit" | "file-detail" | null;

const TIPO_ARCHIVO_OPTIONS: SelectOption[] = [
  { value: "todos", label: "Todos" },
  { value: "pdf", label: "PDF" },
  { value: "word", label: "Word" },
  { value: "excel", label: "Excel" },
  { value: "imagen", label: "Imágenes" },
  { value: "texto", label: "Texto" },
  { value: "otros", label: "Otros" }
];

const ACTIVO_OPTIONS: SelectOption[] = [
  { value: "activos", label: "Activos" },
  { value: "inactivos", label: "Archivados" },
  { value: "todos", label: "Todos" }
];

const FOLDER_COLOR_OPTIONS: SelectOption[] = [
  { value: "#ff7a1a", label: "Naranja NOSTUR" },
  { value: "#2563eb", label: "Azul" },
  { value: "#16a34a", label: "Verde" },
  { value: "#9333ea", label: "Violeta" },
  { value: "#dc2626", label: "Rojo" },
  { value: "#334155", label: "Gris" }
];

/* =========================================================
   HELPERS VISUALES
========================================================= */

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const clean = value.slice(0, 10);
  const [year, month, day] = clean.split("-");

  if (!year || !month || !day) return "—";

  return `${day}/${month}/${year}`;
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
  disabled = false,
  inputMode = "text"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      className="h-9 w-full rounded-xl border border-black/10 bg-[#f8fafc] px-3 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="min-h-[86px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[#111827] outline-none transition focus:border-nostur-orange"
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
          : "border-black/10 bg-white/70 text-[#64748b]"
      ].join(" ")}
    >
      {checked ? <CheckCircle2 size={15} /> : <Plus size={15} />}
      {label}
    </button>
  );
}

function InlineError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
      <div className="flex items-start gap-2">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>

      <button type="button" onClick={onClose} className="text-red-500 hover:text-red-700">
        <X size={14} />
      </button>
    </div>
  );
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[260] w-[320px] rounded-2xl border border-black/10 bg-white p-4 text-xs shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div
            className={[
              "mb-1 font-black",
              toast.type === "success" ? "text-green-700" : "text-red-700"
            ].join(" ")}
          >
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

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "orange"
}: {
  label: string;
  value: string | number;
  icon: typeof Folder;
  tone?: "orange" | "blue" | "green" | "red" | "amber" | "slate";
}) {
  const toneClass = {
    orange: "bg-nostur-orange/15 text-nostur-orange",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700"
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

function FileIcon({ tipo }: { tipo?: string | null }) {
  if (tipo === "pdf") return <FileText size={17} strokeWidth={1.8} />;
  if (tipo === "word") return <FileText size={17} strokeWidth={1.8} />;
  if (tipo === "excel") return <FileSpreadsheet size={17} strokeWidth={1.8} />;
  if (tipo === "imagen") return <FileImage size={17} strokeWidth={1.8} />;

  return <File size={17} strokeWidth={1.8} />;
}

function FileTypeBadge({ tipo }: { tipo?: string | null }) {
  const safeTipo = tipo || "otros";

  const className =
    safeTipo === "pdf"
      ? "border-red-200 bg-red-50 text-red-700"
      : safeTipo === "excel"
        ? "border-green-200 bg-green-50 text-green-700"
        : safeTipo === "word"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : safeTipo === "imagen"
            ? "border-purple-200 bg-purple-50 text-purple-700"
            : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span className={["rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide", className].join(" ")}>
      {getDocumentTipoLabel(safeTipo)}
    </span>
  );
}

function AccessBlocked({ error }: { error: string | null }) {
  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto flex min-h-[calc(100vh-150px)] w-full max-w-3xl items-center justify-center">
        <div className="rounded-[28px] border border-red-200 bg-white/80 p-8 text-center shadow-sm backdrop-blur">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700">
            <ShieldCheck size={26} strokeWidth={1.8} />
          </div>

          <h1 className="text-xl font-black text-[#111827]">Acceso restringido</h1>
          <p className="mt-2 text-sm font-semibold text-[#64748b]">
            El Gestor Documental es exclusivo para Administración, Gerencia y Admin General.
          </p>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL CARPETA
========================================================= */

function FolderModal({
  folder,
  folders,
  sucursales,
  saving,
  onClose,
  onSave
}: {
  folder: DocumentFolder | null;
  folders: DocumentFolder[];
  sucursales: SucursalLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: FolderDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FolderDraft>(() => createInitialFolderDraft(folder));
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof FolderDraft>(key: K, value: FolderDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function validate(): string | null {
    if (!draft.nombre.trim()) return "Ingresá el nombre de la carpeta.";
    if (draft.parent_id && draft.parent_id === draft.id) return "Una carpeta no puede ser su propia carpeta superior.";
    return null;
  }

  function handleSave() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    onSave(draft);
  }

  const folderOptions: SelectOption[] = [
    { value: "", label: "Sin carpeta superior" },
    ...folders
      .filter((item) => item.id !== draft.id && item.activa)
      .map((item) => ({
        value: item.id,
        label: getDocumentFolderLabel(item)
      }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "", label: "Todas / General" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">
              {folder ? "Editar carpeta" : "Nueva carpeta"}
            </h2>
            <p className="text-xs text-[#64748b]">
              Organizá documentos internos por área, proveedor, sucursal o proceso.
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

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Nombre *</FieldLabel>
            <TextInput
              value={draft.nombre}
              onChange={(value) => setField("nombre", value)}
              placeholder="Ej: Contratos, Operadores, Bancos..."
            />
          </div>

          <div>
            <FieldLabel>Carpeta superior</FieldLabel>
            <NosturSelect
              value={draft.parent_id || ""}
              onChange={(value) => setField("parent_id", value || null)}
              options={folderOptions}
            />
          </div>

          <div>
            <FieldLabel>Sucursal</FieldLabel>
            <NosturSelect
              value={draft.sucursal_id || ""}
              onChange={(value) => setField("sucursal_id", value || null)}
              options={sucursalOptions}
            />
          </div>

          <div>
            <FieldLabel>Color</FieldLabel>
            <NosturSelect
              value={draft.color}
              onChange={(value) => setField("color", value)}
              options={FOLDER_COLOR_OPTIONS}
            />
          </div>

          <div>
            <FieldLabel>Icono</FieldLabel>
            <TextInput
              value={draft.icono}
              onChange={(value) => setField("icono", value)}
              placeholder="folder"
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Descripción</FieldLabel>
            <TextArea
              value={draft.descripcion}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Notas internas sobre el contenido de esta carpeta..."
            />
          </div>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <BooleanChip
              checked={draft.compartida}
              onChange={(value) => setField("compartida", value)}
              label="Compartida internamente"
            />

            <BooleanChip
              checked={draft.activa}
              onChange={(value) => setField("activa", value)}
              label={draft.activa ? "Carpeta activa" : "Carpeta archivada"}
            />
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
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {saving ? "Guardando..." : folder ? "Guardar cambios" : "Crear carpeta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL SUBIR ARCHIVO
========================================================= */

function UploadModal({
  selectedFolderId,
  folders,
  sucursales,
  uploading,
  onClose,
  onUpload
}: {
  selectedFolderId: string | null;
  folders: DocumentFolder[];
  sucursales: SucursalLite[];
  uploading: boolean;
  onClose: () => void;
  onUpload: (input: UploadDocumentInput) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draft, setDraft] = useState({
    folder_id: selectedFolderId,
    nombre: "",
    descripcion: "",
    tags: "",
    sucursal_id: "",
    compartido: true
  });
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleFile(file: File | null) {
    setLocalError(null);
    setSelectedFile(file);

    if (file && !draft.nombre.trim()) {
      setDraft((current) => ({
        ...current,
        nombre: file.name
      }));
    }
  }

  function validate(): string | null {
    if (!selectedFile) return "Seleccioná un archivo.";
    if (!draft.nombre.trim()) return "Ingresá el nombre visible del archivo.";
    return null;
  }

  function handleUpload() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    if (!selectedFile) return;

    onUpload({
      file: selectedFile,
      folder_id: draft.folder_id || null,
      nombre: draft.nombre,
      descripcion: draft.descripcion,
      tags: draft.tags,
      sucursal_id: draft.sucursal_id || null,
      compartido: draft.compartido
    });
  }

  const folderOptions: SelectOption[] = [
    { value: "", label: "Sin carpeta" },
    ...folders
      .filter((folder) => folder.activa)
      .map((folder) => ({
        value: folder.id,
        label: getDocumentFolderLabel(folder)
      }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "", label: "Todas / General" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-3xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Subir archivo</h2>
            <p className="text-xs text-[#64748b]">
              PDF, Word, Excel, imágenes u otros documentos internos.
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

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mb-4 flex min-h-[110px] w-full flex-col items-center justify-center rounded-[24px] border border-dashed border-nostur-orange/40 bg-nostur-orange/5 px-4 py-6 text-center transition hover:bg-nostur-orange/10"
        >
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-nostur-orange text-white">
            <Upload size={20} strokeWidth={1.8} />
          </div>

          <div className="text-sm font-black text-[#111827]">
            {selectedFile ? selectedFile.name : "Seleccionar archivo"}
          </div>

          <div className="mt-1 text-xs font-semibold text-[#64748b]">
            {selectedFile
              ? `${formatFileSize(selectedFile.size)} · ${selectedFile.type || "tipo no informado"}`
              : "Hacé clic para elegir el documento desde tu equipo"}
          </div>
        </button>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldLabel>Nombre visible *</FieldLabel>
            <TextInput
              value={draft.nombre}
              onChange={(value) => setField("nombre", value)}
              placeholder="Nombre del documento"
            />
          </div>

          <div>
            <FieldLabel>Carpeta</FieldLabel>
            <NosturSelect
              value={draft.folder_id || ""}
              onChange={(value) => setField("folder_id", value || null)}
              options={folderOptions}
            />
          </div>

          <div>
            <FieldLabel>Sucursal</FieldLabel>
            <NosturSelect
              value={draft.sucursal_id || ""}
              onChange={(value) => setField("sucursal_id", value)}
              options={sucursalOptions}
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Tags</FieldLabel>
            <TextInput
              value={draft.tags}
              onChange={(value) => setField("tags", value)}
              placeholder="contrato, proveedor, banco..."
            />
          </div>

          <div className="md:col-span-2">
            <FieldLabel>Descripción</FieldLabel>
            <TextArea
              value={draft.descripcion}
              onChange={(value) => setField("descripcion", value)}
              placeholder="Notas internas del archivo..."
            />
          </div>

          <div className="md:col-span-2">
            <BooleanChip
              checked={draft.compartido}
              onChange={(value) => setField("compartido", value)}
              label="Compartido internamente"
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-xs font-bold text-blue-700">
          Los documentos se guardan en Storage privado. Solo roles autorizados pueden abrirlos o descargarlos.
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
            disabled={uploading}
            onClick={handleUpload}
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {uploading ? "Subiendo..." : "Subir archivo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL EDITAR ARCHIVO
========================================================= */

function FileEditModal({
  file,
  folders,
  sucursales,
  saving,
  onClose,
  onSave
}: {
  file: DocumentFile | null;
  folders: DocumentFolder[];
  sucursales: SucursalLite[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: FileDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<FileDraft>(() => createInitialFileDraft(file));
  const [localError, setLocalError] = useState<string | null>(null);

  function setField<K extends keyof FileDraft>(key: K, value: FileDraft[K]) {
    setLocalError(null);
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function validate(): string | null {
    if (!file) return "No hay archivo seleccionado.";
    if (!draft.nombre.trim()) return "Ingresá el nombre del archivo.";
    return null;
  }

  function handleSave() {
    const error = validate();

    if (error) {
      setLocalError(error);
      return;
    }

    onSave(draft);
  }

  const folderOptions: SelectOption[] = [
    { value: "", label: "Sin carpeta" },
    ...folders
      .filter((folder) => folder.activa)
      .map((folder) => ({
        value: folder.id,
        label: getDocumentFolderLabel(folder)
      }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "", label: "Todas / General" },
    ...sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-12 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-72px)] w-full max-w-2xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Editar archivo</h2>
            <p className="text-xs text-[#64748b]">
              Cambiá nombre, carpeta, tags o visibilidad interna.
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

        {!file ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
            No hay archivo seleccionado.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Nombre *</FieldLabel>
              <TextInput
                value={draft.nombre}
                onChange={(value) => setField("nombre", value)}
                placeholder="Nombre visible"
              />
            </div>

            <div>
              <FieldLabel>Carpeta</FieldLabel>
              <NosturSelect
                value={draft.folder_id || ""}
                onChange={(value) => setField("folder_id", value || null)}
                options={folderOptions}
              />
            </div>

            <div>
              <FieldLabel>Sucursal</FieldLabel>
              <NosturSelect
                value={draft.sucursal_id || ""}
                onChange={(value) => setField("sucursal_id", value || null)}
                options={sucursalOptions}
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Tags</FieldLabel>
              <TextInput
                value={draft.tags}
                onChange={(value) => setField("tags", value)}
                placeholder="contrato, proveedor, banco..."
              />
            </div>

            <div className="md:col-span-2">
              <FieldLabel>Descripción</FieldLabel>
              <TextArea
                value={draft.descripcion}
                onChange={(value) => setField("descripcion", value)}
                placeholder="Notas internas del archivo..."
              />
            </div>

            <div className="md:col-span-2">
              <BooleanChip
                checked={draft.compartido}
                onChange={(value) => setField("compartido", value)}
                label="Compartido internamente"
              />
            </div>
          </div>
        )}

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
            onClick={handleSave}
            className="h-9 rounded-xl bg-nostur-orange px-5 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MODAL DETALLE ARCHIVO
========================================================= */

function FileDetailModal({
  file,
  signedUrl,
  loadingUrl,
  onClose,
  onOpen,
  onDownload,
  onEdit,
  onArchive
}: {
  file: DocumentFile | null;
  signedUrl: string | null;
  loadingUrl: boolean;
  onClose: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  if (!file) return null;

  const isImage = file.tipo_archivo === "imagen";

  return (
    <div className="fixed inset-0 z-[230] flex items-start justify-center bg-black/25 px-4 pt-10 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-64px)] w-full max-w-5xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <FileTypeBadge tipo={file.tipo_archivo} />
              {!file.activo ? (
                <span className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700">
                  Archivado
                </span>
              ) : null}
            </div>

            <h2 className="truncate text-lg font-black text-[#111827]">
              {getDocumentFileLabel(file)}
            </h2>
            <p className="mt-1 text-xs text-[#64748b]">
              {file.folder_nombre || "Sin carpeta"} · {formatFileSize(file.size_bytes)}
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
          <main className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-black text-[#111827]">Vista rápida</h3>

              <button
                type="button"
                onClick={onOpen}
                disabled={loadingUrl}
                className="h-8 rounded-xl border border-black/10 bg-white px-3 text-[11px] font-black text-[#334155] hover:bg-[#f8fafc] disabled:opacity-50"
              >
                {loadingUrl ? "Preparando..." : "Abrir"}
              </button>
            </div>

            {isImage && signedUrl ? (
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
                <img
                  src={signedUrl}
                  alt={file.nombre}
                  className="max-h-[520px] w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-nostur-orange/15 text-nostur-orange">
                  <FileIcon tipo={file.tipo_archivo} />
                </div>

                <div className="text-sm font-black text-[#111827]">{file.nombre}</div>
                <div className="mt-1 text-xs font-semibold text-[#64748b]">
                  {loadingUrl ? "Preparando vista privada..." : "Usá Abrir o Descargar para consultar este archivo."}
                </div>
              </div>
            )}
          </main>

          <aside className="rounded-[24px] border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#111827]">Datos del archivo</h3>

            <div className="grid gap-3 text-xs">
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Nombre</FieldLabel>
                <div className="font-black text-[#111827]">{file.nombre}</div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Carpeta</FieldLabel>
                <div className="font-black text-[#111827]">{file.folder_nombre || "Sin carpeta"}</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Tipo</FieldLabel>
                  <div className="font-black text-[#111827]">{getDocumentTipoLabel(file.tipo_archivo)}</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Peso</FieldLabel>
                  <div className="font-black text-[#111827]">{formatFileSize(file.size_bytes)}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                <FieldLabel>Fecha de carga</FieldLabel>
                <div className="font-black text-[#111827]">{formatDate(file.created_at)}</div>
                <div className="mt-1 text-[#64748b]">
                  Por {file.created_by_nombre || "usuario interno"}
                </div>
              </div>

              {file.tags?.length ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Tags</FieldLabel>
                  <div className="flex flex-wrap gap-1">
                    {file.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#334155]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {file.descripcion ? (
                <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                  <FieldLabel>Descripción</FieldLabel>
                  <div className="font-semibold text-[#334155]">{file.descripcion}</div>
                </div>
              ) : null}

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={onOpen}
                  className="h-10 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                >
                  Abrir archivo
                </button>

                <button
                  type="button"
                  onClick={onDownload}
                  className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                >
                  Descargar
                </button>

                <button
                  type="button"
                  onClick={onEdit}
                  className="h-10 rounded-xl border border-nostur-orange/30 bg-nostur-orange/10 px-4 text-xs font-black text-nostur-orange hover:bg-nostur-orange/15"
                >
                  Editar datos
                </button>

                {file.activo ? (
                  <button
                    type="button"
                    onClick={onArchive}
                    className="h-10 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-black text-red-700 hover:bg-red-100"
                  >
                    Archivar archivo
                  </button>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CARDS / LISTAS
========================================================= */

function FolderCard({
  folder,
  selected,
  fileCount,
  onSelect,
  onEdit,
  onArchive
}: {
  folder: DocumentFolder;
  selected: boolean;
  fileCount: number;
  onSelect: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "rounded-2xl border p-3 text-left shadow-sm transition",
        selected
          ? "border-nostur-orange/50 bg-nostur-orange/10"
          : "border-black/10 bg-white/70 hover:bg-white",
        !folder.activa ? "opacity-60" : ""
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: folder.color || "#ff7a1a" }}
          >
            {selected ? <FolderOpen size={17} /> : <Folder size={17} />}
          </div>

          <div className="truncate text-xs font-black text-[#111827]">
            {folder.nombre}
          </div>

          <div className="mt-0.5 text-[11px] font-semibold text-[#64748b]">
            {fileCount} archivos
          </div>

          {folder.descripcion ? (
            <div className="mt-1 line-clamp-2 text-[10px] font-semibold text-[#94a3b8]">
              {folder.descripcion}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1">
          <span
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
            title="Editar carpeta"
          >
            <Edit3 size={14} />
          </span>

          {folder.activa ? (
            <span
              onClick={(event) => {
                event.stopPropagation();
                onArchive();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
              title="Archivar carpeta"
            >
              <Archive size={14} />
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function DocumentFileRow({
  file,
  selected,
  onSelect,
  onDetail,
  onOpen,
  onDownload,
  onEdit,
  onArchive
}: {
  file: DocumentFile;
  selected: boolean;
  onSelect: () => void;
  onDetail: () => void;
  onOpen: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "grid min-w-0 gap-3 rounded-2xl border p-3 text-left transition lg:grid-cols-[1.5fr_1.1fr_120px_120px_150px_150px]",
        selected
          ? "border-nostur-orange/50 bg-nostur-orange/10"
          : "border-black/10 bg-[#f8fafc] hover:bg-white",
        !file.activo ? "opacity-60" : ""
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-nostur-orange shadow-sm">
          <FileIcon tipo={file.tipo_archivo} />
        </div>

        <div className="min-w-0">
          <div className="truncate text-xs font-black text-[#111827]">{file.nombre}</div>
          <div className="truncate text-[11px] font-semibold text-[#64748b]">
            {file.descripcion || "Sin descripción"}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-xs font-black text-[#111827]">
          {file.folder_nombre || "Sin carpeta"}
        </div>
        <div className="truncate text-[11px] text-[#64748b]">
          {file.sucursal_nombre || "General"}
        </div>
      </div>

      <div>
        <FileTypeBadge tipo={file.tipo_archivo} />
        {!file.activo ? (
          <div className="mt-1 text-[10px] font-black text-red-700">Archivado</div>
        ) : null}
      </div>

      <div className="min-w-0">
        <div className="text-xs font-black text-[#111827]">{formatFileSize(file.size_bytes)}</div>
        <div className="text-[11px] text-[#64748b]">{file.extension || "—"}</div>
      </div>

      <div className="min-w-0">
        <div className="truncate text-xs font-black text-[#111827]">
          {formatDate(file.created_at)}
        </div>
        <div className="truncate text-[11px] text-[#64748b]">
          {file.created_by_nombre || "Usuario interno"}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <span
          onClick={(event) => {
            event.stopPropagation();
            onDetail();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
          title="Ver detalle"
        >
          <Eye size={14} />
        </span>

        <span
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-nostur-orange hover:bg-white"
          title="Abrir"
        >
          <FileText size={14} />
        </span>

        <span
          onClick={(event) => {
            event.stopPropagation();
            onDownload();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-green-700 hover:bg-white"
          title="Descargar"
        >
          <Download size={14} />
        </span>

        <span
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748b] hover:bg-white hover:text-[#111827]"
          title="Editar"
        >
          <Edit3 size={14} />
        </span>

        {file.activo ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              onArchive();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
            title="Archivar"
          >
            <Archive size={14} />
          </span>
        ) : null}
      </div>
    </button>
  );
}

/* =========================================================
   PANEL PRINCIPAL
========================================================= */

export function DocumentosPanel() {
  const loading = useDocumentosStore((state: DocumentosState) => state.loading);
  const saving = useDocumentosStore((state: DocumentosState) => state.saving);
  const uploading = useDocumentosStore((state: DocumentosState) => state.uploading);
  const error = useDocumentosStore((state: DocumentosState) => state.error);

  const currentProfile = useDocumentosStore((state: DocumentosState) => state.currentProfile);
  const canManageDocumentos = useDocumentosStore(
    (state: DocumentosState) => state.canManageDocumentos
  );

  const folders = useDocumentosStore((state: DocumentosState) => state.folders);
  const files = useDocumentosStore((state: DocumentosState) => state.files);
  const catalogos = useDocumentosStore((state: DocumentosState) => state.catalogos);
  const filters = useDocumentosStore((state: DocumentosState) => state.filters);
  const selectedFolderId = useDocumentosStore((state: DocumentosState) => state.selectedFolderId);
  const selectedFileId = useDocumentosStore((state: DocumentosState) => state.selectedFileId);

  const loadDocumentos = useDocumentosStore((state: DocumentosState) => state.loadDocumentos);
  const saveFolder = useDocumentosStore((state: DocumentosState) => state.saveFolder);
  const archiveFolder = useDocumentosStore((state: DocumentosState) => state.archiveFolder);

  const uploadDocument = useDocumentosStore((state: DocumentosState) => state.uploadDocument);
  const updateDocumentFile = useDocumentosStore((state: DocumentosState) => state.updateDocumentFile);
  const archiveDocumentFile = useDocumentosStore(
    (state: DocumentosState) => state.archiveDocumentFile
  );

  const getSignedUrl = useDocumentosStore((state: DocumentosState) => state.getSignedUrl);
  const downloadDocument = useDocumentosStore((state: DocumentosState) => state.downloadDocument);

  const setFilter = useDocumentosStore((state: DocumentosState) => state.setFilter);
  const resetFilters = useDocumentosStore((state: DocumentosState) => state.resetFilters);
  const selectFolder = useDocumentosStore((state: DocumentosState) => state.selectFolder);
  const selectFile = useDocumentosStore((state: DocumentosState) => state.selectFile);
  const clearError = useDocumentosStore((state: DocumentosState) => state.clearError);

  const getFilteredFolders = useDocumentosStore(
    (state: DocumentosState) => state.getFilteredFolders
  );
  const getFilteredFiles = useDocumentosStore((state: DocumentosState) => state.getFilteredFiles);
  const getMetrics = useDocumentosStore((state: DocumentosState) => state.getMetrics);

  const filteredFolders = getFilteredFolders();
  const filteredFiles = getFilteredFiles();
  const metrics = getMetrics();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null);
  const [editingFile, setEditingFile] = useState<DocumentFile | null>(null);
  const [detailFile, setDetailFile] = useState<DocumentFile | null>(null);
  const [detailSignedUrl, setDetailSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const selectedFolder = useMemo<DocumentFolder | null>(() => {
    if (!selectedFolderId) return null;
    return folders.find((folder) => folder.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  const selectedFile = useMemo<DocumentFile | null>(() => {
    return (
      filteredFiles.find((file) => file.id === selectedFileId) ||
      filteredFiles[0] ||
      null
    );
  }, [filteredFiles, selectedFileId]);

  const folderOptions: SelectOption[] = [
    { value: "todas", label: "Todas" },
    { value: "sin-carpeta", label: "Sin carpeta" },
    ...folders
      .filter((folder) => folder.activa)
      .map((folder) => ({
        value: folder.id,
        label: getDocumentFolderLabel(folder)
      }))
  ];

  const sucursalOptions: SelectOption[] = [
    { value: "todas", label: "Todas" },
    ...catalogos.sucursales.map((sucursal) => ({
      value: sucursal.id,
      label: sucursal.nombre
    }))
  ];

  useEffect(() => {
    loadDocumentos();
  }, [loadDocumentos]);

  async function hydrateDetailUrl(file: DocumentFile | null) {
    setDetailSignedUrl(null);

    if (!file) return;

    setLoadingUrl(true);
    const url = await getSignedUrl(file);
    setDetailSignedUrl(url);
    setLoadingUrl(false);
  }

  useEffect(() => {
    if (modalMode === "file-detail") {
      hydrateDetailUrl(detailFile);
    }
  }, [modalMode, detailFile]);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  }

  function openNewFolder() {
    setEditingFolder(null);
    setModalMode("folder");
  }

  function openEditFolder(folder: DocumentFolder) {
    setEditingFolder(folder);
    setModalMode("folder");
  }

  function openUpload() {
    setModalMode("upload");
  }

  function openEditFile(file: DocumentFile) {
    setEditingFile(file);
    selectFile(file.id);
    setModalMode("file-edit");
  }

  function openDetailFile(file: DocumentFile) {
    setDetailFile(file);
    selectFile(file.id);
    setModalMode("file-detail");
  }

  async function openFile(file: DocumentFile) {
    const url = await getSignedUrl(file);

    if (!url) {
      showToast("No se pudo abrir el archivo.", "error");
      return;
    }

    window.open(url, "_blank");
  }

  async function downloadFile(file: DocumentFile) {
    const url = await downloadDocument(file);

    if (!url) {
      showToast("No se pudo descargar el archivo.", "error");
      return;
    }

    window.open(url, "_blank");
  }

  async function handleSaveFolder(draft: FolderDraft) {
    const ok = await saveFolder(draft);

    if (ok) {
      setModalMode(null);
      setEditingFolder(null);
      showToast(draft.id ? "Carpeta actualizada correctamente." : "Carpeta creada correctamente.");
    }
  }

  async function handleArchiveFolder(folder: DocumentFolder) {
    const ok = await archiveFolder(folder.id);

    if (ok) {
      showToast("Carpeta archivada correctamente.");
    }
  }

  async function handleUpload(input: UploadDocumentInput) {
    const ok = await uploadDocument(input);

    if (ok) {
      setModalMode(null);
      showToast("Archivo subido correctamente.");
    }
  }

  async function handleUpdateFile(draft: FileDraft) {
    const ok = await updateDocumentFile(draft);

    if (ok) {
      setModalMode(null);
      setEditingFile(null);
      showToast("Archivo actualizado correctamente.");
    }
  }

  async function handleArchiveFile(file: DocumentFile) {
    const ok = await archiveDocumentFile(file.id);

    if (ok) {
      setModalMode(null);
      setDetailFile(null);
      showToast("Archivo archivado correctamente.");
    }
  }

  const showBlocked = !loading && currentProfile && !canManageDocumentos;

  if (showBlocked) {
    return <AccessBlocked error={error} />;
  }

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_22%_10%,rgba(255,122,26,0.10),transparent_28%),radial-gradient(circle_at_78%_18%,rgba(90,120,190,0.13),transparent_30%),linear-gradient(135deg,#eef1f6,#e1e7f0_48%,#eef1f6)] px-6 py-5 text-[#1f2937]">
      <div className="mx-auto w-full max-w-[calc(100vw-110px)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-black tracking-tight text-[#111827]">Gestor documental</h1>
          <span className="rounded-xl bg-white/80 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
            GERENCIA
          </span>
          <span className="text-xs font-semibold text-[#64748b]">
            Carpetas y archivos internos privados
          </span>
        </div>

        {error ? (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
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
                  {selectedFolder ? selectedFolder.nombre : "Todas las carpetas"}
                </span>
              </div>

              <div className="mt-1 truncate text-[11px] font-semibold text-[#64748b]">
                Tipo: {filters.tipoArchivo} · Sucursal: {filters.sucursalId} · Estado: {filters.activos}
              </div>
            </button>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={loadDocumentos}
                disabled={loading}
                className="flex h-8 items-center gap-2 rounded-xl bg-white/80 px-3 text-[11px] font-black text-[#334155] shadow-sm hover:bg-white disabled:opacity-50"
              >
                <RefreshCcw size={13} strokeWidth={1.8} />
                Actualizar
              </button>

              <button
                type="button"
                onClick={openNewFolder}
                className="flex h-8 items-center gap-2 rounded-xl bg-blue-600 px-3 text-[11px] font-black text-white shadow-sm hover:bg-blue-700"
              >
                <Folder size={13} strokeWidth={1.8} />
                Carpeta
              </button>

              <button
                type="button"
                onClick={openUpload}
                className="flex h-8 items-center gap-2 rounded-xl bg-nostur-orange px-3 text-[11px] font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Upload size={13} strokeWidth={1.8} />
                Subir archivo
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
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_180px_220px_170px]">
                <div>
                  <FieldLabel>Carpeta</FieldLabel>
                  <NosturSelect
                    value={filters.folderId}
                    onChange={(value) => {
                      setFilter("folderId", value as typeof filters.folderId);
                      selectFolder(value === "todas" || value === "sin-carpeta" ? null : value);
                    }}
                    options={folderOptions}
                  />
                </div>

                <div>
                  <FieldLabel>Tipo</FieldLabel>
                  <NosturSelect
                    value={filters.tipoArchivo}
                    onChange={(value) => setFilter("tipoArchivo", value as typeof filters.tipoArchivo)}
                    options={TIPO_ARCHIVO_OPTIONS}
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
                  <FieldLabel>Estado</FieldLabel>
                  <NosturSelect
                    value={filters.activos}
                    onChange={(value) => setFilter("activos", value as typeof filters.activos)}
                    options={ACTIVO_OPTIONS}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                <div className="flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-3">
                  <Search size={15} className="shrink-0 text-[#64748b]" />
                  <input
                    value={filters.search}
                    onChange={(event) => setFilter("search", event.target.value)}
                    placeholder="Buscar por nombre, descripción, tags, carpeta, tipo..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-[#94a3b8]"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadDocumentos}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Aplicar filtros
                </button>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-2xl bg-white/80 px-4 text-xs font-black text-[#334155] shadow-sm hover:bg-white"
                >
                  Limpiar
                </button>
              </div>
            </>
          ) : null}
        </section>

        <section className="relative z-0 mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Carpetas" value={metrics.carpetas} icon={Folder} tone="blue" />
          <MetricCard label="Archivos" value={metrics.archivos} icon={File} tone="orange" />
          <MetricCard label="PDF" value={metrics.pdf} icon={FileText} tone="red" />
          <MetricCard label="Word" value={metrics.word} icon={FileText} tone="blue" />
          <MetricCard label="Excel" value={metrics.excel} icon={FileSpreadsheet} tone="green" />
          <MetricCard label="Peso total" value={formatFileSize(metrics.pesoTotalBytes)} icon={Upload} tone="slate" />
        </section>

        <div className="relative z-0 grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)_340px]">
          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Carpetas</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${filteredFolders.length} carpetas`}
                </p>
              </div>

              <button
                type="button"
                onClick={openNewFolder}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-nostur-orange text-white shadow-sm hover:bg-nostur-orangeSoft"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                selectFolder(null);
                setFilter("folderId", "todas");
              }}
              className={[
                "mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                !selectedFolderId && filters.folderId === "todas"
                  ? "border-nostur-orange/50 bg-nostur-orange/10"
                  : "border-black/10 bg-[#f8fafc] hover:bg-white"
              ].join(" ")}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nostur-orange text-white">
                <FolderOpen size={16} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-[#111827]">Todas las carpetas</div>
                <div className="text-[11px] text-[#64748b]">{files.filter((file) => file.activo).length} archivos</div>
              </div>
            </button>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando carpetas...
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay carpetas para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid max-h-[calc(100vh-410px)] gap-2 overflow-auto pr-1">
                {filteredFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    selected={selectedFolderId === folder.id}
                    fileCount={files.filter((file) => file.activo && file.folder_id === folder.id).length}
                    onSelect={() => {
                      selectFolder(folder.id);
                      setFilter("folderId", folder.id);
                    }}
                    onEdit={() => openEditFolder(folder)}
                    onArchive={() => handleArchiveFolder(folder)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-[24px] border border-black/10 bg-white/70 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#111827]">Archivos</h2>
                <p className="text-[11px] text-[#64748b]">
                  {loading ? "Cargando..." : `${filteredFiles.length} documentos encontrados`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Cargando documentos...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                No hay archivos para los filtros seleccionados.
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredFiles.map((file) => (
                  <DocumentFileRow
                    key={file.id}
                    file={file}
                    selected={selectedFile?.id === file.id}
                    onSelect={() => selectFile(file.id)}
                    onDetail={() => openDetailFile(file)}
                    onOpen={() => openFile(file)}
                    onDownload={() => downloadFile(file)}
                    onEdit={() => openEditFile(file)}
                    onArchive={() => handleArchiveFile(file)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="min-w-0 rounded-[24px] border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur">
            {!selectedFile ? (
              <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-5 text-center text-xs text-[#64748b]">
                Seleccioná un archivo para ver el detalle.
              </div>
            ) : (
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-nostur-orange/15 text-nostur-orange">
                      <FileIcon tipo={selectedFile.tipo_archivo} />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-[#111827]">
                        {selectedFile.nombre}
                      </h2>
                      <p className="truncate text-xs text-[#64748b]">
                        {selectedFile.folder_nombre || "Sin carpeta"}
                      </p>
                    </div>
                  </div>

                  <FileTypeBadge tipo={selectedFile.tipo_archivo} />
                </div>

                <div className="grid gap-3 text-xs">
                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4">
                    <FieldLabel>Tamaño</FieldLabel>
                    <div className="text-2xl font-black text-[#111827]">
                      {formatFileSize(selectedFile.size_bytes)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <FieldLabel>Datos</FieldLabel>
                    <div className="flex justify-between gap-3">
                      <span>Tipo</span>
                      <strong>{getDocumentTipoLabel(selectedFile.tipo_archivo)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Extensión</span>
                      <strong>{selectedFile.extension || "—"}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Cargado</span>
                      <strong>{formatDate(selectedFile.created_at)}</strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Sucursal</span>
                      <strong>{selectedFile.sucursal_nombre || "General"}</strong>
                    </div>
                  </div>

                  {selectedFile.tags?.length ? (
                    <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                      <FieldLabel>Tags</FieldLabel>
                      <div className="flex flex-wrap gap-1">
                        {selectedFile.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-[#334155]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => openDetailFile(selectedFile)}
                      className="h-10 rounded-xl bg-nostur-orange px-4 text-xs font-black text-white shadow-sm hover:bg-nostur-orangeSoft"
                    >
                      Ver detalle
                    </button>

                    <button
                      type="button"
                      onClick={() => openFile(selectedFile)}
                      className="h-10 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#334155] hover:bg-[#f8fafc]"
                    >
                      Abrir archivo
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadFile(selectedFile)}
                      className="h-10 rounded-xl border border-green-200 bg-green-50 px-4 text-xs font-black text-green-700 hover:bg-green-100"
                    >
                      Descargar
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditFile(selectedFile)}
                      className="h-10 rounded-xl border border-nostur-orange/30 bg-nostur-orange/10 px-4 text-xs font-black text-nostur-orange hover:bg-nostur-orange/15"
                    >
                      Editar datos
                    </button>
                  </div>

                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 text-[11px] font-bold text-blue-700">
                    Storage privado. Los links de apertura y descarga vencen automáticamente.
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {modalMode === "folder" ? (
        <FolderModal
          folder={editingFolder}
          folders={folders}
          sucursales={catalogos.sucursales}
          saving={saving}
          onClose={() => {
            setModalMode(null);
            setEditingFolder(null);
          }}
          onSave={handleSaveFolder}
        />
      ) : null}

      {modalMode === "upload" ? (
        <UploadModal
          selectedFolderId={selectedFolderId}
          folders={folders}
          sucursales={catalogos.sucursales}
          uploading={uploading}
          onClose={() => setModalMode(null)}
          onUpload={handleUpload}
        />
      ) : null}

      {modalMode === "file-edit" ? (
        <FileEditModal
          file={editingFile}
          folders={folders}
          sucursales={catalogos.sucursales}
          saving={saving}
          onClose={() => {
            setModalMode(null);
            setEditingFile(null);
          }}
          onSave={handleUpdateFile}
        />
      ) : null}

      {modalMode === "file-detail" ? (
        <FileDetailModal
          file={detailFile}
          signedUrl={detailSignedUrl}
          loadingUrl={loadingUrl}
          onClose={() => {
            setModalMode(null);
            setDetailFile(null);
            setDetailSignedUrl(null);
          }}
          onOpen={() => detailFile && openFile(detailFile)}
          onDownload={() => detailFile && downloadFile(detailFile)}
          onEdit={() => {
            if (detailFile) {
              setEditingFile(detailFile);
              setModalMode("file-edit");
            }
          }}
          onArchive={() => detailFile && handleArchiveFile(detailFile)}
        />
      ) : null}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}