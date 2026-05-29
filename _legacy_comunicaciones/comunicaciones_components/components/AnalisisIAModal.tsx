import { X } from "lucide-react";
import {
  getComunicacionDisplayName,
  type AiConversationAnalysis,
  type ComunicacionConversation
} from "../../../store/comunicacionesStore";

/* =========================================================
   HELPERS IA
========================================================= */

function getAiString(source: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return fallback;
}

function getAiNumber(source: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
}

function getAiStringArray(source: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }
  }

  return [];
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-[#64748b]">
      {children}
    </label>
  );
}

/* =========================================================
   MODAL ANÁLISIS IA
========================================================= */

export function AnalisisIAModal({
  conversation,
  aiAnalysis,
  aiAnalyzing,
  aiError,
  onClose,
  onAnalyze,
  onUseSuggestedResponse,
  onSaveSummaryAsNote
}: {
  conversation: ComunicacionConversation | null;
  aiAnalysis: AiConversationAnalysis | null;
  aiAnalyzing: boolean;
  aiError: string | null;
  onClose: () => void;
  onAnalyze: () => Promise<void>;
  onUseSuggestedResponse: (text: string) => void;
  onSaveSummaryAsNote: (summary: string) => Promise<void>;
}) {
  const analysis = (aiAnalysis || {}) as unknown as Record<string, unknown>;

  const summary = getAiString(analysis, ["resumen", "summary"], "Sin resumen disponible.");

  const suggestedResponse = getAiString(
    analysis,
    ["respuesta_sugerida", "suggested_response", "respuesta"],
    "Sin respuesta sugerida."
  );

  const leadScore = getAiNumber(
    analysis,
    ["score_cliente", "score", "lead_score", "puntaje", "puntaje_lead"],
    0
  );

  const leadTemperature = getAiString(
    analysis,
    ["temperatura_lead", "temperatura", "lead_temperature"],
    "Sin temperatura"
  );

  const intent = getAiString(
    analysis,
    ["intencion", "intent", "intención"],
    "Sin intención detectada"
  );

  const sentiment = getAiString(
    analysis,
    ["sentimiento", "sentiment"],
    "Sin sentimiento"
  );

  const priority = getAiString(
    analysis,
    ["prioridad_sugerida", "prioridad", "priority"],
    "NORMAL"
  );

  const missingInfo = getAiStringArray(analysis, [
    "informacion_faltante",
    "faltantes",
    "missing_info",
    "datos_faltantes"
  ]);

  const nextActions = getAiStringArray(analysis, [
    "proximas_acciones",
    "next_actions",
    "acciones_sugeridas",
    "siguientes_pasos"
  ]);

  const suggestedTags = getAiStringArray(analysis, [
    "etiquetas_sugeridas",
    "suggested_tags",
    "tags_sugeridos"
  ]);

  return (
    <div className="fixed inset-0 z-[240] flex items-start justify-center bg-black/25 px-4 pt-8 backdrop-blur-sm">
      <div className="max-h-[calc(100vh-56px)] w-full max-w-5xl overflow-auto rounded-[24px] border border-black/10 bg-white p-5 text-[#1f2937] shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#111827]">Análisis con IA</h2>
            <p className="text-xs text-[#64748b]">
              {conversation ? getComunicacionDisplayName(conversation) : "Sin conversación seleccionada"}
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

        {aiError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
            {aiError}
          </div>
        ) : null}

        {!aiAnalysis ? (
          <div className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-5">
            <div className="mb-3 text-sm font-black text-[#111827]">
              Todavía no hay análisis IA para esta conversación.
            </div>

            <p className="mb-4 text-xs font-semibold leading-5 text-[#64748b]">
              La IA va a leer los mensajes de esta conversación y devolver resumen, intención,
              temperatura del lead, datos faltantes, próximos pasos y una respuesta sugerida.
            </p>

            <button
              type="button"
              onClick={onAnalyze}
              disabled={aiAnalyzing || !conversation}
              className="h-10 rounded-2xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiAnalyzing ? "Analizando..." : "Analizar con IA"}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="grid gap-4">
              <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                <div className="mb-2 text-sm font-black text-[#111827]">Resumen</div>
                <div className="whitespace-pre-wrap text-xs font-semibold leading-5 text-[#334155]">
                  {summary}
                </div>
              </section>

              <section className="rounded-[24px] border border-black/10 bg-[#f8fafc] p-4">
                <div className="mb-2 text-sm font-black text-[#111827]">Respuesta sugerida</div>

                <div className="whitespace-pre-wrap rounded-2xl border border-black/10 bg-white p-3 text-xs font-semibold leading-5 text-[#334155]">
                  {suggestedResponse}
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveSummaryAsNote(summary)}
                    disabled={!summary.trim() || summary === "Sin resumen disponible."}
                    className="h-9 rounded-xl border border-black/10 bg-white px-4 text-[11px] font-black text-[#334155] shadow-sm hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar resumen como nota
                  </button>

                  <button
                    type="button"
                    onClick={() => onUseSuggestedResponse(suggestedResponse)}
                    disabled={!suggestedResponse.trim() || suggestedResponse === "Sin respuesta sugerida."}
                    className="h-9 rounded-xl bg-violet-600 px-4 text-[11px] font-black text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Usar respuesta sugerida
                  </button>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-black/10 bg-white p-4">
                  <div className="mb-2 text-sm font-black text-[#111827]">Datos faltantes</div>

                  {missingInfo.length === 0 ? (
                    <div className="text-xs font-semibold text-[#64748b]">
                      Sin datos faltantes detectados.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {missingInfo.map((item: string, index: number) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-black/10 bg-white p-4">
                  <div className="mb-2 text-sm font-black text-[#111827]">Próximos pasos</div>

                  {nextActions.length === 0 ? (
                    <div className="text-xs font-semibold text-[#64748b]">
                      Sin próximos pasos sugeridos.
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {nextActions.map((item: string, index: number) => (
                        <div
                          key={`${item}-${index}`}
                          className="rounded-2xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-bold text-green-800"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </main>

            <aside className="grid content-start gap-3">
              <div className="rounded-[24px] border border-black/10 bg-white p-4">
                <FieldLabel>Score lead</FieldLabel>
                <div className="text-3xl font-black text-[#111827]">{leadScore}</div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white p-4">
                <FieldLabel>Temperatura</FieldLabel>
                <div className="text-sm font-black text-[#111827]">{leadTemperature}</div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white p-4">
                <FieldLabel>Intención</FieldLabel>
                <div className="text-sm font-black text-[#111827]">{intent}</div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white p-4">
                <FieldLabel>Sentimiento</FieldLabel>
                <div className="text-sm font-black text-[#111827]">{sentiment}</div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white p-4">
                <FieldLabel>Prioridad sugerida</FieldLabel>
                <div className="text-sm font-black text-[#111827]">{priority}</div>
              </div>

              <div className="rounded-[24px] border border-black/10 bg-white p-4">
                <FieldLabel>Etiquetas sugeridas</FieldLabel>

                {suggestedTags.length === 0 ? (
                  <div className="text-xs font-semibold text-[#64748b]">
                    Sin etiquetas sugeridas.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedTags.map((tag: string, index: number) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-xl border border-[#4f7c90]/20 bg-[#4f7c90]/10 px-2 py-1 text-[10px] font-black text-[#31596a]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onAnalyze}
                disabled={aiAnalyzing || !conversation}
                className="h-10 rounded-2xl bg-[#4f7c90] px-5 text-xs font-black text-white shadow-sm hover:bg-[#416a7a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aiAnalyzing ? "Analizando..." : "Reanalizar con IA"}
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}