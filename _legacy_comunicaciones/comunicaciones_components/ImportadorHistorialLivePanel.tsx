import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Search,
  Upload,
  X
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type CsvRow = Record<string, string>;

type ImportResult = {
  contactosProcesados: number;
  conversacionesProcesadas: number;
  errores: string[];
};

type ImportStatus = "idle" | "ready" | "importing" | "done" | "error";

type MetricTone = "blue" | "green" | "orange" | "slate" | "red";

const REQUIRED_CONVERSATION_COLUMNS = ["ID", "Contacto", "ID Contacto", "Telefono", "Fecha Creado", "Fecha Editado", "Último mensaje", "Url Conversación"];

function normalizeHeader(value: string): string {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .trim();
}

function normalizeText(value: unknown): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function normalizePhoneDigits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

function getCell(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function getRandomUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function detectDelimiter(headerLine: string): string {
  const delimiters = [",", ";", "\t"];
  let bestDelimiter = ",";
  let bestCount = -1;

  for (const delimiter of delimiters) {
    const count = headerLine.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseCsvText(text: string): CsvRow[] {
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = cleanText.split("\n")[0] || "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const nextChar = cleanText[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n" && !insideQuotes) {
      currentRow.push(currentCell);

      const hasContent = currentRow.some((cell) => cell.trim());
      if (hasContent) rows.push(currentRow);

      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    const hasContent = currentRow.some((cell) => cell.trim());
    if (hasContent) rows.push(currentRow);
  }

  if (rows.length <= 1) return [];

  const headers = rows[0].map(normalizeHeader);

  return rows.slice(1).map((row) => {
    const record: CsvRow = {};

    headers.forEach((header, index) => {
      record[header] = String(row[index] || "").trim();
    });

    return record;
  });
}

function parseLiveDate(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoCandidate = new Date(raw);
  if (!Number.isNaN(isoCandidate.getTime())) {
    return isoCandidate.toISOString();
  }

  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);

  const date = new Date(year, month - 1, day, hour, minute, second);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function splitNombreCompleto(nombreCompleto: string): { nombre: string | null; apellidos: string | null } {
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      nombre: null,
      apellidos: null
    };
  }

  if (parts.length === 1) {
    return {
      nombre: parts[0],
      apellidos: null
    };
  }

  return {
    nombre: parts[0],
    apellidos: parts.slice(1).join(" ")
  };
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function validateColumns(rows: CsvRow[]): string[] {
  if (rows.length === 0) return ["El archivo no tiene filas válidas."];

  const firstRow = rows[0];
  const missingColumns = REQUIRED_CONVERSATION_COLUMNS.filter((column) => !(column in firstRow));

  if (missingColumns.length === 0) return [];

  return [`Faltan columnas esperadas: ${missingColumns.join(", ")}`];
}

function buildContactosPayload(rows: CsvRow[], importacionId: string) {
  const map = new Map<string, Record<string, unknown>>();

  rows.forEach((row) => {
    const liveContactId = getCell(row, ["ID Contacto", "Id Contacto", "id_contacto", "live_contact_id"]);
    if (!liveContactId) return;

    const nombreCompleto = getCell(row, ["Contacto", "Nombre", "Nombre Completo", "nombre_completo"]);
    const telefono = getCell(row, ["Telefono", "Teléfono", "Celular", "celular"]);
    const telefonoNormalizado = normalizePhoneDigits(telefono);
    const empresa = getCell(row, ["Empresa", "empresa"]);
    const email = getCell(row, ["Email", "email"]);
    const liveFechaCreado = parseLiveDate(getCell(row, ["Fecha Creado", "Fecha creado", "fecha_creado"]));
    const liveFechaEditado = parseLiveDate(getCell(row, ["Fecha Editado", "Fecha editado", "fecha_editado"]));
    const { nombre, apellidos } = splitNombreCompleto(nombreCompleto);

    map.set(liveContactId, {
      live_contact_id: liveContactId,
      importacion_id: importacionId,
      nombre,
      apellidos,
      nombre_completo: nombreCompleto || null,
      email: email || null,
      celular: telefono || null,
      celular_normalizado: telefonoNormalizado || null,
      empresa: empresa || null,
      etiquetas: null,
      dinamicos: {},
      autoasignado: false,
      bloqueado: false,
      live_fecha_creado: liveFechaCreado,
      live_fecha_editado: liveFechaEditado,
      estado_vinculacion: "pendiente",
      metadata: {
        origen: "liveconnect_csv",
        importacion_id: importacionId
      }
    });
  });

  return Array.from(map.values());
}

function buildConversacionesPayload(rows: CsvRow[], importacionId: string) {
  const map = new Map<string, Record<string, unknown>>();

  rows.forEach((row) => {
    const liveConversationId = getCell(row, ["ID", "Id", "id", "live_conversation_id"]);
    if (!liveConversationId) return;

    const telefono = getCell(row, ["Telefono", "Teléfono", "Celular", "celular"]);
    const telefonoNormalizado = normalizePhoneDigits(telefono);

    map.set(liveConversationId, {
      live_conversation_id: liveConversationId,
      importacion_id: importacionId,
      etiqueta: getCell(row, ["Etiqueta", "etiqueta"]) || null,
      canal_nombre: getCell(row, ["Canal Nombre", "Canal nombre", "canal_nombre"]) || null,
      canal_tipo: getCell(row, ["Canal Tipo", "Canal tipo", "canal_tipo"]) || null,
      live_contact_id: getCell(row, ["ID Contacto", "Id Contacto", "id_contacto", "live_contact_id"]) || null,
      live_contacto_nombre: getCell(row, ["Contacto", "contacto", "live_contacto_nombre"]) || null,
      telefono: telefono || null,
      telefono_normalizado: telefonoNormalizado || null,
      empresa: getCell(row, ["Empresa", "empresa"]) || null,
      live_fecha_creado: parseLiveDate(getCell(row, ["Fecha Creado", "Fecha creado", "fecha_creado"])),
      live_fecha_editado: parseLiveDate(getCell(row, ["Fecha Editado", "Fecha editado", "fecha_editado"])),
      live_fecha_finalizado: parseLiveDate(getCell(row, ["Fecha Finalizado", "Fecha finalizado", "fecha_finalizado"])),
      grupo: getCell(row, ["Grupo", "grupo"]) || null,
      agente: getCell(row, ["Agente", "agente"]) || null,
      pais: getCell(row, ["País", "Pais", "pais"]) || null,
      ips: getCell(row, ["IPs", "IPS", "ips"]) || null,
      browser: getCell(row, ["Browser", "browser"]) || null,
      ultimo_mensaje: getCell(row, ["Último mensaje", "Ultimo mensaje", "ultimo_mensaje"]) || null,
      url_conversacion: getCell(row, ["Url Conversación", "URL Conversación", "Url Conversacion", "url_conversacion"]) || null,
      html_importado: false,
      html_url_original: getCell(row, ["Url Conversación", "URL Conversación", "Url Conversacion", "url_conversacion"]) || null,
      mensajes_parseados: 0,
      estado_historial: "pendiente",
      metadata: {
        origen: "liveconnect_csv",
        importacion_id: importacionId
      }
    });
  });

  return Array.from(map.values());
}

function MetricCard({
  label,
  value,
  tone = "slate"
}: {
  label: string;
  value: number;
  tone?: MetricTone;
}) {
  const className = {
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    green: "border-green-200 bg-green-50 text-green-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    slate: "border-slate-200 bg-white text-slate-700",
    red: "border-red-200 bg-red-50 text-red-700"
  }[tone];

  return (
    <div className={["rounded-[22px] border p-4 shadow-sm", className].join(" ")}>
      <div className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] opacity-80">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function InlineError({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;

  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
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

export function ImportadorHistorialLivePanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<ImportStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validationErrors = useMemo(() => validateColumns(rows), [rows]);

  const contactosPayload = useMemo(() => buildContactosPayload(rows, "00000000-0000-0000-0000-000000000000"), [rows]);
  const conversacionesPayload = useMemo(() => buildConversacionesPayload(rows, "00000000-0000-0000-0000-000000000000"), [rows]);

  const filteredRows = useMemo(() => {
    const normalized = normalizeText(search);

    if (!normalized) return rows.slice(0, 50);

    return rows
      .filter((row) => {
        const haystack = normalizeText(Object.values(row).join(" "));
        return haystack.includes(normalized);
      })
      .slice(0, 50);
  }, [rows, search]);

  const metrics = useMemo(() => {
    const conUrl = rows.filter((row) => getCell(row, ["Url Conversación", "URL Conversación", "Url Conversacion"])).length;
    const conContacto = rows.filter((row) => getCell(row, ["ID Contacto", "Id Contacto"])).length;
    const conTelefono = rows.filter((row) => getCell(row, ["Telefono", "Teléfono"])).length;

    return {
      filas: rows.length,
      contactos: contactosPayload.length,
      conversaciones: conversacionesPayload.length,
      conUrl,
      conContacto,
      conTelefono
    };
  }, [rows, contactosPayload.length, conversacionesPayload.length]);

  function resetImport() {
    setStatus("idle");
    setFileName("");
    setRows([]);
    setSearch("");
    setError(null);
    setResult(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  async function handleFile(file: File) {
    setStatus("idle");
    setError(null);
    setResult(null);
    setRows([]);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsedRows = parseCsvText(text);
      const errors = validateColumns(parsedRows);

      setRows(parsedRows);

      if (errors.length > 0) {
        setStatus("error");
        setError(errors.join(" "));
        return;
      }

      setStatus("ready");
    } catch (currentError) {
      setStatus("error");
      setError(currentError instanceof Error ? currentError.message : "No se pudo leer el archivo CSV.");
    }
  }

  async function upsertInBatches(table: string, payload: Record<string, unknown>[], onConflict: string) {
    const batches = chunkArray(payload, 500);

    for (const batch of batches) {
      const { error: batchError } = await supabase.from(table).upsert(batch, {
        onConflict,
        ignoreDuplicates: false
      });

      if (batchError) throw batchError;
    }
  }

  async function handleImport() {
    if (rows.length === 0) {
      setError("Primero cargá un archivo CSV.");
      return;
    }

    const errors = validateColumns(rows);
    if (errors.length > 0) {
      setError(errors.join(" "));
      return;
    }

    setStatus("importing");
    setError(null);
    setResult(null);

    const importacionId = getRandomUuid();
    const contactos = buildContactosPayload(rows, importacionId);
    const conversaciones = buildConversacionesPayload(rows, importacionId);
    const errores: string[] = [];

    try {
      if (contactos.length > 0) {
        await upsertInBatches("comunicaciones_live_contactos", contactos, "live_contact_id");
      }
    } catch (currentError) {
      errores.push(
        `Contactos: ${
          currentError instanceof Error
            ? currentError.message
            : "No se pudieron importar los contactos."
        }`
      );
    }

    try {
      if (conversaciones.length > 0) {
        await upsertInBatches("comunicaciones_live_conversaciones", conversaciones, "live_conversation_id");
      }
    } catch (currentError) {
      errores.push(
        `Conversaciones: ${
          currentError instanceof Error
            ? currentError.message
            : "No se pudieron importar las conversaciones."
        }`
      );
    }

    const finalResult = {
      contactosProcesados: errores.some((item) => item.startsWith("Contactos:")) ? 0 : contactos.length,
      conversacionesProcesadas: errores.some((item) => item.startsWith("Conversaciones:")) ? 0 : conversaciones.length,
      errores
    };

    setResult(finalResult);

    if (errores.length > 0) {
      setStatus("error");
      setError(errores.join(" "));
      return;
    }

    setStatus("done");
  }

  return (
    <div className="h-full overflow-hidden bg-[radial-gradient(circle_at_22%_10%,rgba(79,124,144,0.12),transparent_28%),linear-gradient(135deg,#eef3f5,#dfe8ec_48%,#eef3f5)] text-[#1f2937]">
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-black/10 bg-white/75 px-5 py-4 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#111827]">Importador Historial Live</h1>
                <span className="rounded-xl bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[#31596a]">
                  CSV Live Connect
                </span>
              </div>

              <p className="mt-0.5 text-xs font-semibold text-[#64748b]">
                Importa contactos y conversaciones históricas desde el CSV exportado de Live Connect.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={resetImport}
                className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc]"
              >
                <RefreshCcw size={14} />
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={status === "importing"}
                className="flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:opacity-50"
              >
                <Upload size={14} />
                Elegir CSV
              </button>

              <button
                type="button"
                onClick={handleImport}
                disabled={rows.length === 0 || validationErrors.length > 0 || status === "importing"}
                className="flex h-9 items-center gap-2 rounded-xl bg-[#4f7c90] px-4 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "importing" ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                {status === "importing" ? "Importando..." : "Importar a Supabase"}
              </button>

              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Filas CSV" value={metrics.filas} tone="blue" />
            <MetricCard label="Contactos únicos" value={metrics.contactos} tone="green" />
            <MetricCard label="Conversaciones" value={metrics.conversaciones} tone="orange" />
            <MetricCard label="Con URL HTML" value={metrics.conUrl} tone="slate" />
            <MetricCard label="Con ID contacto" value={metrics.conContacto} tone="slate" />
            <MetricCard label="Con teléfono" value={metrics.conTelefono} tone="slate" />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden p-5">
          <div className="mb-4 grid gap-3">
            {fileName ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs shadow-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileSpreadsheet size={16} className="shrink-0 text-[#4f7c90]" />
                  <span className="truncate font-black text-[#111827]">{fileName}</span>
                  <span className="font-semibold text-[#64748b]">· {rows.length} filas leídas</span>
                </div>

                {status === "ready" ? (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-black uppercase text-blue-700">
                    Listo para importar
                  </span>
                ) : null}

                {status === "done" ? (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-black uppercase text-green-700">
                    <CheckCircle2 size={12} />
                    Importado
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#4f7c90]/35 bg-white/80 p-8 text-center shadow-sm">
                <FileSpreadsheet size={34} className="mx-auto mb-3 text-[#4f7c90]" />
                <div className="text-base font-black text-[#111827]">Subí el CSV exportado desde Live Connect</div>
                <div className="mt-1 text-xs font-semibold text-[#64748b]">
                  Se van a importar contactos y conversaciones. Los mensajes HTML se parsean en el próximo paso.
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-4 h-10 rounded-2xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a]"
                >
                  Seleccionar archivo
                </button>
              </div>
            )}

            {error ? <InlineError message={error} onClose={() => setError(null)} /> : null}

            {result && status === "done" ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-bold text-green-700">
                Importación completada: {result.contactosProcesados} contactos y {result.conversacionesProcesadas} conversaciones.
              </div>
            ) : null}
          </div>

          {rows.length > 0 ? (
            <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-black/10 bg-white shadow-sm">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
                <div>
                  <div className="text-sm font-black text-[#111827]">Previsualización</div>
                  <div className="text-[11px] font-semibold text-[#64748b]">
                    Mostrando hasta 50 filas. La importación procesa todo el archivo.
                  </div>
                </div>

                <div className="flex h-9 min-w-[280px] items-center gap-2 rounded-xl border border-black/10 bg-[#f8fafc] px-3">
                  <Search size={14} className="text-[#64748b]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar en la previsualización..."
                    className="h-full min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#111827] outline-none placeholder:text-[#94a3b8]"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-[#f8fafc] text-[10px] font-black uppercase tracking-wide text-[#64748b]">
                    <tr>
                      <th className="border-b border-black/10 px-4 py-3">ID</th>
                      <th className="border-b border-black/10 px-4 py-3">Contacto</th>
                      <th className="border-b border-black/10 px-4 py-3">Teléfono</th>
                      <th className="border-b border-black/10 px-4 py-3">Empresa</th>
                      <th className="border-b border-black/10 px-4 py-3">Agente</th>
                      <th className="border-b border-black/10 px-4 py-3">Fecha editado</th>
                      <th className="border-b border-black/10 px-4 py-3">Último mensaje</th>
                      <th className="border-b border-black/10 px-4 py-3">URL</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, index) => {
                      const id = getCell(row, ["ID"]);
                      const url = getCell(row, ["Url Conversación", "URL Conversación", "Url Conversacion"]);

                      return (
                        <tr key={`${id}-${index}`} className="odd:bg-white even:bg-[#f8fafc]/60">
                          <td className="max-w-[120px] border-b border-black/5 px-4 py-3 font-bold text-[#334155]">
                            <span className="block truncate">{id || "—"}</span>
                          </td>
                          <td className="max-w-[180px] border-b border-black/5 px-4 py-3 font-black text-[#111827]">
                            <span className="block truncate">{getCell(row, ["Contacto"]) || "—"}</span>
                          </td>
                          <td className="max-w-[140px] border-b border-black/5 px-4 py-3 font-semibold text-[#334155]">
                            <span className="block truncate">{getCell(row, ["Telefono", "Teléfono"]) || "—"}</span>
                          </td>
                          <td className="max-w-[150px] border-b border-black/5 px-4 py-3 font-semibold text-[#334155]">
                            <span className="block truncate">{getCell(row, ["Empresa"]) || "—"}</span>
                          </td>
                          <td className="max-w-[150px] border-b border-black/5 px-4 py-3 font-semibold text-[#334155]">
                            <span className="block truncate">{getCell(row, ["Agente"]) || "—"}</span>
                          </td>
                          <td className="max-w-[150px] border-b border-black/5 px-4 py-3 font-semibold text-[#334155]">
                            <span className="block truncate">{getCell(row, ["Fecha Editado"]) || "—"}</span>
                          </td>
                          <td className="max-w-[280px] border-b border-black/5 px-4 py-3 font-semibold text-[#334155]">
                            <span className="line-clamp-2">{getCell(row, ["Último mensaje", "Ultimo mensaje"]) || "—"}</span>
                          </td>
                          <td className="max-w-[180px] border-b border-black/5 px-4 py-3 font-semibold">
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="block truncate text-[#4f7c90] underline">
                                Ver HTML
                              </a>
                            ) : (
                              <span className="text-[#94a3b8]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredRows.length === 0 ? (
                  <div className="p-8 text-center text-sm font-bold text-[#64748b]">
                    No hay filas para ese filtro.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}