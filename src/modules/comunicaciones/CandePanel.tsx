import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  HelpCircle,
  ListChecks,
  Loader2,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  X
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ComunicacionesPageShell, EmptyState, MetricCard, Pill } from "./comunicacionesShared";

type TabKey = "general" | "identidad" | "campos" | "faqs" | "scoring" | "pipeline";

type CandeConfig = {
  id: string;
  enabled: boolean;
  modo: string;
  horario_inicio: string;
  horario_fin: string;
  dias_laborales: number[];
  espera_minutos: number;
  nombre_ia: string;
  tono: string;
  prompt_base: string;
  reglas_duras: string;
  modelo: string;
  umbral_transferencia: number;
  mensaje_despedida: string;
  plantilla_resumen: string;

  marca_visible?: string | null;
  mensaje_inicial?: string | null;
  mensaje_falta_info?: string | null;
  mensaje_fuera_horario?: string | null;
  mensaje_no_entiende?: string | null;
  datos_a_relevar?: string[] | null;
  cosas_prohibidas?: string[] | null;

  max_mensajes_antes_derivar?: number | null;
  derivar_si_pide_humano?: boolean | null;
  derivar_si_urgente?: boolean | null;
  derivar_si_score_supera_umbral?: boolean | null;

  pedir_presupuesto_antes_derivar?: boolean | null;
  origen_sugerido_suma_score?: boolean | null;
  confirmar_origen_sugerido?: boolean | null;
  minimo_score_para_derivar?: number | null;
  mensaje_confirmar_origen_sugerido?: string | null;
  mensaje_datos_completos?: string | null;

  updated_at: string;
};

type CandeCampo = {
  id: string;
  clave: string;
  etiqueta: string;
  pregunta_sugerida: string | null;
  requerido: boolean;
  peso: number;
  orden: number;
};

type CandeFaq = {
  id: string;
  pregunta: string;
  respuesta: string;
  orden: number;
};

type PalabraClave = {
  id: string;
  palabra: string;
  peso: number;
};

type PipelineEstado = {
  id: string;
  nombre: string;
  color: string;
  orden: number;
  es_final: boolean;
  resultado: string | null;
  es_sin_atender: boolean;
};

type CampoDraft = {
  id?: string;
  clave: string;
  etiqueta: string;
  pregunta_sugerida: string;
  requerido: boolean;
  peso: string;
  orden: string;
};

type FaqDraft = {
  id?: string;
  pregunta: string;
  respuesta: string;
  orden: string;
};

type PalabraDraft = {
  id?: string;
  palabra: string;
  peso: string;
};

type PipelineDraft = {
  id?: string;
  nombre: string;
  color: string;
  orden: string;
  es_final: boolean;
  resultado: string;
  es_sin_atender: boolean;
};

const MODE_OPTIONS = [
  {
    value: "apagada",
    label: "Apagada",
    description: "Cande no responde automáticamente."
  },
  {
    value: "manual",
    label: "Manual",
    description: "Se activa por conversación o por acción de NIA."
  },
  {
    value: "sugerida",
    label: "Sugerida",
    description: "Cande sugiere respuestas para revisión humana."
  },
  {
    value: "automatica",
    label: "Automática",
    description: "Cande puede responder cuando corresponde."
  },
  {
    value: "fuera_horario",
    label: "Fuera de horario",
    description: "Actúa principalmente cuando la agencia no está atendiendo."
  }
];

const DAY_OPTIONS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 7, label: "Dom" }
];

const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"];

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTime(value?: string | null): string {
  if (!value) return "09:00";
  return value.slice(0, 5);
}

function cleanText(value: unknown): string {
  return String(value || "").trim();
}

function textToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  const text = cleanText(value);
  if (!text) return [];

  return text
    .split("\n")
    .map((item) => item.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean);
}

function arrayToText(value: unknown): string {
  return textToArray(value).join("\n");
}

function formatDays(days?: number[] | null) {
  if (!days || days.length === 0) return "—";

  const labels: Record<number, string> = {
    1: "Lun",
    2: "Mar",
    3: "Mié",
    4: "Jue",
    5: "Vie",
    6: "Sáb",
    7: "Dom"
  };

  return days.map((day) => labels[day] || String(day)).join(", ");
}

function emptyCampoDraft(): CampoDraft {
  return {
    clave: "",
    etiqueta: "",
    pregunta_sugerida: "",
    requerido: true,
    peso: "10",
    orden: "1"
  };
}

function emptyFaqDraft(): FaqDraft {
  return {
    pregunta: "",
    respuesta: "",
    orden: "1"
  };
}

function emptyPalabraDraft(): PalabraDraft {
  return {
    palabra: "",
    peso: "10"
  };
}

function emptyPipelineDraft(): PipelineDraft {
  return {
    nombre: "",
    color: "#8b5cf6",
    orden: "1",
    es_final: false,
    resultado: "",
    es_sin_atender: false
  };
}

function Card({
  title,
  subtitle,
  children,
  icon
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/10 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90]">
                {icon}
              </span>
            ) : null}

            <h2 className="text-lg font-black text-[#142033]">{title}</h2>
          </div>

          {subtitle ? <p className="mt-1 text-sm font-semibold text-[#64748b]">{subtitle}</p> : null}
        </div>
      </div>

      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-[#64748b]">
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
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm font-bold text-[#142033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#4f7c90] disabled:opacity-50"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold leading-relaxed text-[#142033] outline-none transition placeholder:text-[#94a3b8] focus:border-[#4f7c90] disabled:opacity-50"
    />
  );
}

function ToggleButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-10 items-center justify-center rounded-2xl border px-4 text-xs font-black transition",
        active
          ? "border-[#4f7c90] bg-[#4f7c90] text-white shadow-sm"
          : "border-black/10 bg-white text-[#475569] hover:border-[#4f7c90]/40 hover:text-[#142033]"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  danger = false,
  type = "button"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50",
        danger ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-[#4f7c90] text-white hover:bg-[#406b7d]"
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function CandePanel() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [, setConfig] = useState<CandeConfig | null>(null);
  const [configDraft, setConfigDraft] = useState<CandeConfig | null>(null);

  const [datosARelevarDraft, setDatosARelevarDraft] = useState("");
  const [cosasProhibidasDraft, setCosasProhibidasDraft] = useState("");

  const [campos, setCampos] = useState<CandeCampo[]>([]);
  const [faqs, setFaqs] = useState<CandeFaq[]>([]);
  const [palabras, setPalabras] = useState<PalabraClave[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEstado[]>([]);

  const [campoDraft, setCampoDraft] = useState<CampoDraft>(emptyCampoDraft());
  const [faqDraft, setFaqDraft] = useState<FaqDraft>(emptyFaqDraft());
  const [palabraDraft, setPalabraDraft] = useState<PalabraDraft>(emptyPalabraDraft());
  const [pipelineDraft, setPipelineDraft] = useState<PipelineDraft>(emptyPipelineDraft());

  const [editingCampoId, setEditingCampoId] = useState<string | null>(null);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [editingPalabraId, setEditingPalabraId] = useState<string | null>(null);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatus(null);

    const [configRes, camposRes, faqsRes, palabrasRes, pipelineRes] = await Promise.all([
      supabase
        .from("cande_config")
        .select("*")
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("cande_campos")
        .select("id,clave,etiqueta,pregunta_sugerida,requerido,peso,orden")
        .order("orden", { ascending: true }),
      supabase.from("cande_faqs").select("id,pregunta,respuesta,orden").order("orden", { ascending: true }),
      supabase.from("cande_palabras_clave").select("id,palabra,peso").order("peso", { ascending: false }),
      supabase
        .from("pipeline_estados")
        .select("id,nombre,color,orden,es_final,resultado,es_sin_atender")
        .order("orden", { ascending: true })
    ]);

    const firstError = configRes.error || camposRes.error || faqsRes.error || palabrasRes.error || pipelineRes.error;

    if (firstError) {
      setError(firstError.message || "Error cargando configuración de Cande.");
      setLoading(false);
      return;
    }

    const nextConfig = (configRes.data || null) as CandeConfig | null;

    setConfig(nextConfig);
    setConfigDraft(nextConfig);
    setDatosARelevarDraft(arrayToText(nextConfig?.datos_a_relevar));
    setCosasProhibidasDraft(arrayToText(nextConfig?.cosas_prohibidas));

    setCampos((camposRes.data || []) as CandeCampo[]);
    setFaqs((faqsRes.data || []) as CandeFaq[]);
    setPalabras((palabrasRes.data || []) as PalabraClave[]);
    setPipeline((pipelineRes.data || []) as PipelineEstado[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedCampos = useMemo(() => [...campos].sort((a, b) => a.orden - b.orden), [campos]);
  const sortedFaqs = useMemo(() => [...faqs].sort((a, b) => a.orden - b.orden), [faqs]);
  const sortedPipeline = useMemo(() => [...pipeline].sort((a, b) => a.orden - b.orden), [pipeline]);

  const totalScoreCampos = useMemo(() => {
    return sortedCampos.reduce((acc, campo) => acc + Number(campo.peso || 0), 0);
  }, [sortedCampos]);

  function updateDraft<K extends keyof CandeConfig>(key: K, value: CandeConfig[K]) {
    setConfigDraft((current) => {
      if (!current) return current;
      return { ...current, [key]: value };
    });
  }

  function toggleDay(day: number) {
    setConfigDraft((current) => {
      if (!current) return current;

      const currentDays = Array.isArray(current.dias_laborales) ? current.dias_laborales : [];
      const exists = currentDays.includes(day);
      const nextDays = exists ? currentDays.filter((item) => item !== day) : [...currentDays, day].sort((a, b) => a - b);

      return { ...current, dias_laborales: nextDays };
    });
  }

  async function getUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || null;
  }

  async function saveConfig() {
    if (!configDraft) return;

    setSaving(true);
    setError(null);
    setStatus(null);

    const userId = await getUserId();

    const payload = {
      enabled: configDraft.enabled,
      modo: configDraft.modo,
      horario_inicio: normalizeTime(configDraft.horario_inicio),
      horario_fin: normalizeTime(configDraft.horario_fin),
      dias_laborales: configDraft.dias_laborales,
      espera_minutos: toNumber(configDraft.espera_minutos, 5),

      nombre_ia: cleanText(configDraft.nombre_ia) || "Cande",
      marca_visible: cleanText(configDraft.marca_visible) || "ALMUNDO Franquicia Córdoba",
      tono: cleanText(configDraft.tono),
      prompt_base: cleanText(configDraft.prompt_base),
      reglas_duras: cleanText(configDraft.reglas_duras),
      modelo: cleanText(configDraft.modelo) || "gpt-4o-mini",

      mensaje_inicial: cleanText(configDraft.mensaje_inicial),
      mensaje_falta_info: cleanText(configDraft.mensaje_falta_info),
      mensaje_fuera_horario: cleanText(configDraft.mensaje_fuera_horario),
      mensaje_no_entiende: cleanText(configDraft.mensaje_no_entiende),
      mensaje_despedida: cleanText(configDraft.mensaje_despedida),
      mensaje_confirmar_origen_sugerido: cleanText(configDraft.mensaje_confirmar_origen_sugerido),
      mensaje_datos_completos: cleanText(configDraft.mensaje_datos_completos),
      plantilla_resumen: cleanText(configDraft.plantilla_resumen),

      datos_a_relevar: textToArray(datosARelevarDraft),
      cosas_prohibidas: textToArray(cosasProhibidasDraft),

      umbral_transferencia: toNumber(configDraft.umbral_transferencia, 70),
      minimo_score_para_derivar: toNumber(configDraft.minimo_score_para_derivar, 85),
      max_mensajes_antes_derivar: toNumber(configDraft.max_mensajes_antes_derivar, 0),

      derivar_si_pide_humano: Boolean(configDraft.derivar_si_pide_humano),
      derivar_si_urgente: Boolean(configDraft.derivar_si_urgente),
      derivar_si_score_supera_umbral: Boolean(configDraft.derivar_si_score_supera_umbral),

      pedir_presupuesto_antes_derivar: Boolean(configDraft.pedir_presupuesto_antes_derivar),
      origen_sugerido_suma_score: Boolean(configDraft.origen_sugerido_suma_score),
      confirmar_origen_sugerido: Boolean(configDraft.confirmar_origen_sugerido),

      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { error: saveError } = await supabase.from("cande_config").update(payload).eq("id", configDraft.id);

    if (saveError) {
      setError(saveError.message || "No se pudo guardar Cande.");
      setSaving(false);
      return;
    }

    setStatus("Configuración de Cande guardada.");
    await loadData();
    setSaving(false);
  }

  function editCampo(campo: CandeCampo) {
    setEditingCampoId(campo.id);
    setCampoDraft({
      id: campo.id,
      clave: campo.clave,
      etiqueta: campo.etiqueta,
      pregunta_sugerida: campo.pregunta_sugerida || "",
      requerido: campo.requerido,
      peso: String(campo.peso || 0),
      orden: String(campo.orden || 0)
    });
    setActiveTab("campos");
  }

  function resetCampoDraft() {
    setEditingCampoId(null);
    setCampoDraft(emptyCampoDraft());
  }

  async function saveCampo() {
    const clave = campoDraft.clave.trim().toLowerCase().replace(/\s+/g, "_");
    const etiqueta = campoDraft.etiqueta.trim();

    if (!clave || !etiqueta) {
      setError("Completá clave y etiqueta del campo.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    const payload = {
      clave,
      etiqueta,
      pregunta_sugerida: campoDraft.pregunta_sugerida.trim() || null,
      requerido: campoDraft.requerido,
      peso: toNumber(campoDraft.peso, 0),
      orden: toNumber(campoDraft.orden, campos.length + 1)
    };

    const response = editingCampoId
      ? await supabase.from("cande_campos").update(payload).eq("id", editingCampoId)
      : await supabase.from("cande_campos").insert(payload);

    if (response.error) {
      setError(response.error.message || "No se pudo guardar el campo.");
      setSaving(false);
      return;
    }

    resetCampoDraft();
    setStatus("Campo guardado.");
    await loadData();
    setSaving(false);
  }

  async function deleteCampo(id: string) {
    setSaving(true);
    setError(null);
    setStatus(null);

    const { error: deleteError } = await supabase.from("cande_campos").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message || "No se pudo eliminar el campo.");
      setSaving(false);
      return;
    }

    setStatus("Campo eliminado.");
    await loadData();
    setSaving(false);
  }

  function editFaq(faq: CandeFaq) {
    setEditingFaqId(faq.id);
    setFaqDraft({
      id: faq.id,
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      orden: String(faq.orden || 0)
    });
    setActiveTab("faqs");
  }

  function resetFaqDraft() {
    setEditingFaqId(null);
    setFaqDraft(emptyFaqDraft());
  }

  async function saveFaq() {
    const pregunta = faqDraft.pregunta.trim();
    const respuesta = faqDraft.respuesta.trim();

    if (!pregunta || !respuesta) {
      setError("Completá pregunta y respuesta.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    const payload = {
      pregunta,
      respuesta,
      orden: toNumber(faqDraft.orden, faqs.length + 1)
    };

    const response = editingFaqId
      ? await supabase.from("cande_faqs").update(payload).eq("id", editingFaqId)
      : await supabase.from("cande_faqs").insert(payload);

    if (response.error) {
      setError(response.error.message || "No se pudo guardar la FAQ.");
      setSaving(false);
      return;
    }

    resetFaqDraft();
    setStatus("FAQ guardada.");
    await loadData();
    setSaving(false);
  }

  async function deleteFaq(id: string) {
    setSaving(true);
    setError(null);
    setStatus(null);

    const { error: deleteError } = await supabase.from("cande_faqs").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la FAQ.");
      setSaving(false);
      return;
    }

    setStatus("FAQ eliminada.");
    await loadData();
    setSaving(false);
  }

  function editPalabra(item: PalabraClave) {
    setEditingPalabraId(item.id);
    setPalabraDraft({
      id: item.id,
      palabra: item.palabra,
      peso: String(item.peso || 0)
    });
    setActiveTab("scoring");
  }

  function resetPalabraDraft() {
    setEditingPalabraId(null);
    setPalabraDraft(emptyPalabraDraft());
  }

  async function savePalabra() {
    const palabra = palabraDraft.palabra.trim();

    if (!palabra) {
      setError("Completá la palabra clave.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    const payload = {
      palabra,
      peso: toNumber(palabraDraft.peso, 10)
    };

    const response = editingPalabraId
      ? await supabase.from("cande_palabras_clave").update(payload).eq("id", editingPalabraId)
      : await supabase.from("cande_palabras_clave").insert(payload);

    if (response.error) {
      setError(response.error.message || "No se pudo guardar la palabra clave.");
      setSaving(false);
      return;
    }

    resetPalabraDraft();
    setStatus("Palabra clave guardada.");
    await loadData();
    setSaving(false);
  }

  async function deletePalabra(id: string) {
    setSaving(true);
    setError(null);
    setStatus(null);

    const { error: deleteError } = await supabase.from("cande_palabras_clave").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message || "No se pudo eliminar la palabra clave.");
      setSaving(false);
      return;
    }

    setStatus("Palabra clave eliminada.");
    await loadData();
    setSaving(false);
  }

  function editPipeline(estado: PipelineEstado) {
    setEditingPipelineId(estado.id);
    setPipelineDraft({
      id: estado.id,
      nombre: estado.nombre,
      color: estado.color || "#8b5cf6",
      orden: String(estado.orden || 0),
      es_final: estado.es_final,
      resultado: estado.resultado || "",
      es_sin_atender: estado.es_sin_atender
    });
    setActiveTab("pipeline");
  }

  function resetPipelineDraft() {
    setEditingPipelineId(null);
    setPipelineDraft(emptyPipelineDraft());
  }

  async function savePipeline() {
    const nombre = pipelineDraft.nombre.trim();

    if (!nombre) {
      setError("Completá el nombre del estado.");
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);

    const payload = {
      nombre,
      color: pipelineDraft.color.trim() || "#8b5cf6",
      orden: toNumber(pipelineDraft.orden, pipeline.length + 1),
      es_final: pipelineDraft.es_final,
      resultado: pipelineDraft.resultado.trim() || null,
      es_sin_atender: pipelineDraft.es_sin_atender
    };

    const response = editingPipelineId
      ? await supabase.from("pipeline_estados").update(payload).eq("id", editingPipelineId)
      : await supabase.from("pipeline_estados").insert(payload);

    if (response.error) {
      setError(response.error.message || "No se pudo guardar el estado del pipeline.");
      setSaving(false);
      return;
    }

    resetPipelineDraft();
    setStatus("Estado de pipeline guardado.");
    await loadData();
    setSaving(false);
  }

  async function deletePipeline(id: string) {
    setSaving(true);
    setError(null);
    setStatus(null);

    const { error: deleteError } = await supabase.from("pipeline_estados").delete().eq("id", id);

    if (deleteError) {
      setError(deleteError.message || "No se pudo eliminar el estado. Puede estar usado por oportunidades existentes.");
      setSaving(false);
      return;
    }

    setStatus("Estado eliminado.");
    await loadData();
    setSaving(false);
  }

  const tabs: { id: TabKey; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings2 size={14} /> },
    { id: "identidad", label: "Identidad", icon: <Sparkles size={14} /> },
    { id: "campos", label: "Campos", icon: <ListChecks size={14} /> },
    { id: "faqs", label: "FAQs", icon: <HelpCircle size={14} /> },
    { id: "scoring", label: "Scoring", icon: <Target size={14} /> },
    { id: "pipeline", label: "Pipeline", icon: <SlidersHorizontal size={14} /> }
  ];

  return (
    <ComunicacionesPageShell
      title="Cande"
      subtitle="Configuración editable de la asistente IA de primera atención."
      badge="IA pasajero"
      onRefresh={loadData}
      loading={loading}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Estado" value={configDraft?.enabled ? "Activa" : "Apagada"} />
        <MetricCard label="Modo" value={configDraft?.modo || "—"} />
        <MetricCard label="Campos" value={`${campos.length} · ${totalScoreCampos} pts`} />
        <MetricCard label="Deriva por score" value={configDraft?.derivar_si_score_supera_umbral ? "Sí" : "No"} />
      </div>

      {error ? (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-500">
            <X size={16} />
          </button>
        </div>
      ) : null}

      {status ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          <Check size={16} />
          {status}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 rounded-[24px] border border-white/70 bg-white/45 p-2 shadow-sm backdrop-blur-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "flex h-10 items-center gap-2 rounded-2xl px-4 text-xs font-black transition",
              activeTab === tab.id ? "bg-[#4f7c90] text-white shadow-sm" : "text-[#475569] hover:bg-white hover:text-[#142033]"
            ].join(" ")}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 flex min-h-[260px] items-center justify-center rounded-[28px] border border-black/10 bg-white/65">
          <Loader2 className="animate-spin text-[#4f7c90]" size={24} />
        </div>
      ) : null}

      {!loading && !configDraft ? (
        <div className="mt-5">
          <EmptyState title="No hay configuración de Cande" subtitle="Revisá el seed inicial de cande_config." />
        </div>
      ) : null}

      {!loading && configDraft ? (
        <div className="mt-5">
          {activeTab === "general" ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Card
                title="Modo de operación"
                subtitle="Definí cuándo Cande puede responder, indagar o derivar."
                icon={<Settings2 size={16} />}
              >
                <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
                  <div>
                    <div className="text-sm font-black text-[#142033]">
                      Cande está {configDraft.enabled ? "ACTIVA" : "APAGADA"}
                    </div>
                    <p className="mt-1 text-xs font-bold text-[#64748b]">
                      Toggle maestro. Si está apagada, Cande no responde en ninguna conversación.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateDraft("enabled", !configDraft.enabled)}
                    className={[
                      "relative h-8 w-14 rounded-full transition",
                      configDraft.enabled ? "bg-emerald-500" : "bg-slate-300"
                    ].join(" ")}
                    title="Activar o apagar Cande"
                  >
                    <span
                      className={[
                        "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition",
                        configDraft.enabled ? "left-7" : "left-1"
                      ].join(" ")}
                    />
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateDraft("modo", option.value)}
                      className={[
                        "rounded-2xl border p-4 text-left transition",
                        configDraft.modo === option.value
                          ? "border-[#4f7c90] bg-[#eef6f7]"
                          : "border-black/10 bg-white hover:border-[#4f7c90]/40"
                      ].join(" ")}
                    >
                      <div className="text-sm font-black text-[#142033]">{option.label}</div>
                      <div className="mt-1 text-xs font-bold leading-relaxed text-[#64748b]">{option.description}</div>
                    </button>
                  ))}
                </div>
              </Card>

              <aside className="space-y-5">
                <Card title="Horario y demora" icon={<Clock3 size={16} />}>
                  <div className="grid gap-3">
                    <div>
                      <FieldLabel>Horario inicio</FieldLabel>
                      <TextInput
                        value={normalizeTime(configDraft.horario_inicio)}
                        onChange={(value) => updateDraft("horario_inicio", value)}
                        placeholder="09:00"
                      />
                    </div>

                    <div>
                      <FieldLabel>Horario fin</FieldLabel>
                      <TextInput
                        value={normalizeTime(configDraft.horario_fin)}
                        onChange={(value) => updateDraft("horario_fin", value)}
                        placeholder="22:00"
                      />
                    </div>

                    <div>
                      <FieldLabel>Espera antes de responder en minutos</FieldLabel>
                      <TextInput
                        value={String(configDraft.espera_minutos)}
                        onChange={(value) => updateDraft("espera_minutos", toNumber(value, 0))}
                        placeholder="5"
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Días laborales">
                  <div className="grid grid-cols-4 gap-2">
                    {DAY_OPTIONS.map((day) => (
                      <ToggleButton
                        key={day.value}
                        active={(configDraft.dias_laborales || []).includes(day.value)}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </ToggleButton>
                    ))}
                  </div>

                  <p className="mt-3 text-xs font-bold text-[#64748b]">Activos: {formatDays(configDraft.dias_laborales)}</p>
                </Card>
              </aside>

              <div className="xl:col-span-2 flex justify-end">
                <ActionButton onClick={saveConfig} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar configuración general
                </ActionButton>
              </div>
            </div>
          ) : null}

          {activeTab === "identidad" ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
              <Card
                title="Identidad, tono y reglas"
                subtitle="Esto define cómo habla Cande y qué límites comerciales tiene."
                icon={<Sparkles size={16} />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <FieldLabel>Nombre IA</FieldLabel>
                    <TextInput value={configDraft.nombre_ia} onChange={(value) => updateDraft("nombre_ia", value)} placeholder="Cande" />
                  </div>

                  <div>
                    <FieldLabel>Marca visible</FieldLabel>
                    <TextInput
                      value={cleanText(configDraft.marca_visible)}
                      onChange={(value) => updateDraft("marca_visible", value)}
                      placeholder="ALMUNDO Franquicia Córdoba"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel>Modelo</FieldLabel>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {MODEL_OPTIONS.map((model) => (
                      <ToggleButton key={model} active={configDraft.modelo === model} onClick={() => updateDraft("modelo", model)}>
                        {model}
                      </ToggleButton>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <FieldLabel>Tono</FieldLabel>
                  <TextArea value={configDraft.tono} onChange={(value) => updateDraft("tono", value)} rows={3} />
                </div>

                <div className="mt-4">
                  <FieldLabel>Prompt base</FieldLabel>
                  <TextArea value={configDraft.prompt_base} onChange={(value) => updateDraft("prompt_base", value)} rows={7} />
                </div>

                <div className="mt-4">
                  <FieldLabel>Reglas duras</FieldLabel>
                  <TextArea value={configDraft.reglas_duras} onChange={(value) => updateDraft("reglas_duras", value)} rows={5} />
                </div>
              </Card>

              <aside className="space-y-5">
                <Card title="Mensajes base">
                  <div className="grid gap-3">
                    <div>
                      <FieldLabel>Mensaje inicial</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_inicial)}
                        onChange={(value) => updateDraft("mensaje_inicial", value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <FieldLabel>Falta información</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_falta_info)}
                        onChange={(value) => updateDraft("mensaje_falta_info", value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <FieldLabel>No entiende</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_no_entiende)}
                        onChange={(value) => updateDraft("mensaje_no_entiende", value)}
                        rows={3}
                      />
                    </div>

                    <div>
                      <FieldLabel>Fuera de horario</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_fuera_horario)}
                        onChange={(value) => updateDraft("mensaje_fuera_horario", value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Datos a relevar">
                  <FieldLabel>Uno por línea</FieldLabel>
                  <TextArea value={datosARelevarDraft} onChange={setDatosARelevarDraft} rows={7} />
                </Card>

                <Card title="Cosas prohibidas">
                  <FieldLabel>Una por línea</FieldLabel>
                  <TextArea value={cosasProhibidasDraft} onChange={setCosasProhibidasDraft} rows={7} />
                </Card>
              </aside>

              <div className="xl:col-span-2 flex justify-end">
                <ActionButton onClick={saveConfig} disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar identidad y reglas
                </ActionButton>
              </div>
            </div>
          ) : null}

          {activeTab === "campos" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <Card
                title={editingCampoId ? "Editar campo" : "Nuevo campo a relevar"}
                subtitle="Definí qué datos debe pedir Cande antes de derivar."
                icon={<ListChecks size={16} />}
              >
                <div className="grid gap-3">
                  <div>
                    <FieldLabel>Clave interna</FieldLabel>
                    <TextInput
                      value={campoDraft.clave}
                      onChange={(value) => setCampoDraft((current) => ({ ...current, clave: value }))}
                      placeholder="destino"
                    />
                  </div>

                  <div>
                    <FieldLabel>Etiqueta visible</FieldLabel>
                    <TextInput
                      value={campoDraft.etiqueta}
                      onChange={(value) => setCampoDraft((current) => ({ ...current, etiqueta: value }))}
                      placeholder="Destino"
                    />
                  </div>

                  <div>
                    <FieldLabel>Pregunta sugerida</FieldLabel>
                    <TextArea
                      value={campoDraft.pregunta_sugerida}
                      onChange={(value) => setCampoDraft((current) => ({ ...current, pregunta_sugerida: value }))}
                      rows={3}
                      placeholder="¿A dónde te gustaría viajar?"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Peso score</FieldLabel>
                      <TextInput
                        value={campoDraft.peso}
                        onChange={(value) => setCampoDraft((current) => ({ ...current, peso: value }))}
                        placeholder="10"
                      />
                    </div>

                    <div>
                      <FieldLabel>Orden</FieldLabel>
                      <TextInput
                        value={campoDraft.orden}
                        onChange={(value) => setCampoDraft((current) => ({ ...current, orden: value }))}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <ToggleButton
                    active={campoDraft.requerido}
                    onClick={() => setCampoDraft((current) => ({ ...current, requerido: !current.requerido }))}
                  >
                    {campoDraft.requerido ? "Requerido" : "Opcional"}
                  </ToggleButton>

                  <div className="flex gap-2">
                    <ActionButton onClick={saveCampo} disabled={saving}>
                      <Save size={14} />
                      {editingCampoId ? "Guardar cambios" : "Agregar campo"}
                    </ActionButton>

                    {editingCampoId ? (
                      <ActionButton onClick={resetCampoDraft} disabled={saving} danger>
                        <X size={14} />
                        Cancelar
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card
                title="Campos configurados"
                subtitle={`Estos campos alimentan la oportunidad comercial y el score. Total actual: ${totalScoreCampos}/100.`}
              >
                <div className="space-y-3">
                  {sortedCampos.length === 0 ? <EmptyState title="Sin campos" subtitle="Agregá el primer campo a relevar." /> : null}

                  {sortedCampos.map((campo) => (
                    <article key={campo.id} className="rounded-2xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-[#142033]">{campo.etiqueta}</h3>
                            <Pill>{campo.clave}</Pill>
                            {campo.requerido ? <Pill>Requerido</Pill> : <Pill>Opcional</Pill>}
                            <Pill>{campo.peso || 0} pts</Pill>
                            <Pill>Orden {campo.orden}</Pill>
                          </div>

                          <p className="mt-2 text-xs font-bold leading-relaxed text-[#64748b]">
                            {campo.pregunta_sugerida || "Sin pregunta sugerida"}
                          </p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => editCampo(campo)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90] hover:bg-[#dcecef]"
                            title="Editar"
                          >
                            <Settings2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteCampo(campo.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "faqs" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <Card title={editingFaqId ? "Editar FAQ" : "Nueva FAQ"} subtitle="Respuestas autorizadas que Cande puede usar." icon={<HelpCircle size={16} />}>
                <div className="grid gap-3">
                  <div>
                    <FieldLabel>Pregunta</FieldLabel>
                    <TextArea
                      value={faqDraft.pregunta}
                      onChange={(value) => setFaqDraft((current) => ({ ...current, pregunta: value }))}
                      rows={3}
                      placeholder="¿Venden paquetes a Brasil?"
                    />
                  </div>

                  <div>
                    <FieldLabel>Respuesta permitida</FieldLabel>
                    <TextArea
                      value={faqDraft.respuesta}
                      onChange={(value) => setFaqDraft((current) => ({ ...current, respuesta: value }))}
                      rows={6}
                      placeholder="Sí, podemos ayudarte con paquetes..."
                    />
                  </div>

                  <div>
                    <FieldLabel>Orden</FieldLabel>
                    <TextInput value={faqDraft.orden} onChange={(value) => setFaqDraft((current) => ({ ...current, orden: value }))} placeholder="1" />
                  </div>

                  <div className="flex gap-2">
                    <ActionButton onClick={saveFaq} disabled={saving}>
                      <Save size={14} />
                      {editingFaqId ? "Guardar cambios" : "Agregar FAQ"}
                    </ActionButton>

                    {editingFaqId ? (
                      <ActionButton onClick={resetFaqDraft} disabled={saving} danger>
                        <X size={14} />
                        Cancelar
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card title="FAQs cargadas" subtitle="Base de respuestas comerciales permitidas.">
                <div className="space-y-3">
                  {sortedFaqs.length === 0 ? <EmptyState title="Sin FAQs" subtitle="Agregá la primera pregunta frecuente." /> : null}

                  {sortedFaqs.map((faq) => (
                    <article key={faq.id} className="rounded-2xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-[#142033]">{faq.pregunta}</h3>
                            <Pill>Orden {faq.orden}</Pill>
                          </div>

                          <p className="mt-2 text-xs font-bold leading-relaxed text-[#64748b]">{faq.respuesta}</p>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => editFaq(faq)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90] hover:bg-[#dcecef]"
                            title="Editar"
                          >
                            <Settings2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteFaq(faq.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}

          {activeTab === "scoring" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="space-y-5">
                <Card title={editingPalabraId ? "Editar palabra clave" : "Nueva palabra clave"} subtitle="Cuando el pasajero use estas palabras o frases, Cande suma score." icon={<Target size={16} />}>
                  <div className="grid gap-3">
                    <div>
                      <FieldLabel>Palabra o frase</FieldLabel>
                      <TextInput
                        value={palabraDraft.palabra}
                        onChange={(value) => setPalabraDraft((current) => ({ ...current, palabra: value }))}
                        placeholder="quiero reservar"
                      />
                    </div>

                    <div>
                      <FieldLabel>Peso</FieldLabel>
                      <TextInput
                        value={palabraDraft.peso}
                        onChange={(value) => setPalabraDraft((current) => ({ ...current, peso: value }))}
                        placeholder="10"
                      />
                    </div>

                    <div className="flex gap-2">
                      <ActionButton onClick={savePalabra} disabled={saving}>
                        <Save size={14} />
                        {editingPalabraId ? "Guardar cambios" : "Agregar palabra"}
                      </ActionButton>

                      {editingPalabraId ? (
                        <ActionButton onClick={resetPalabraDraft} disabled={saving} danger>
                          <X size={14} />
                          Cancelar
                        </ActionButton>
                      ) : null}
                    </div>
                  </div>
                </Card>

                <Card title="Derivación y score">
                  <div className="grid gap-3">
                    <div>
                      <FieldLabel>Umbral de transferencia histórico</FieldLabel>
                      <TextInput
                        value={String(configDraft.umbral_transferencia || 0)}
                        onChange={(value) => updateDraft("umbral_transferencia", toNumber(value, 0))}
                        placeholder="70"
                      />
                    </div>

                    <div>
                      <FieldLabel>Mínimo score para derivar</FieldLabel>
                      <TextInput
                        value={String(configDraft.minimo_score_para_derivar || 0)}
                        onChange={(value) => updateDraft("minimo_score_para_derivar", toNumber(value, 0))}
                        placeholder="85"
                      />
                    </div>

                    <div>
                      <FieldLabel>Máximo mensajes antes de derivar</FieldLabel>
                      <TextInput
                        value={String(configDraft.max_mensajes_antes_derivar || 0)}
                        onChange={(value) => updateDraft("max_mensajes_antes_derivar", toNumber(value, 0))}
                        placeholder="0"
                      />
                      <p className="mt-1 text-[11px] font-bold text-[#64748b]">0 significa que no deriva por cantidad de mensajes.</p>
                    </div>

                    <div className="grid gap-2">
                      <ToggleButton
                        active={Boolean(configDraft.derivar_si_pide_humano)}
                        onClick={() => updateDraft("derivar_si_pide_humano", !configDraft.derivar_si_pide_humano)}
                      >
                        {configDraft.derivar_si_pide_humano ? "Deriva si pide humano: SÍ" : "Deriva si pide humano: NO"}
                      </ToggleButton>

                      <ToggleButton
                        active={Boolean(configDraft.derivar_si_urgente)}
                        onClick={() => updateDraft("derivar_si_urgente", !configDraft.derivar_si_urgente)}
                      >
                        {configDraft.derivar_si_urgente ? "Deriva si es urgente: SÍ" : "Deriva si es urgente: NO"}
                      </ToggleButton>

                      <ToggleButton
                        active={Boolean(configDraft.derivar_si_score_supera_umbral)}
                        onClick={() => updateDraft("derivar_si_score_supera_umbral", !configDraft.derivar_si_score_supera_umbral)}
                      >
                        {configDraft.derivar_si_score_supera_umbral ? "Deriva por score: SÍ" : "Deriva por score: NO"}
                      </ToggleButton>

                      <ToggleButton
                        active={Boolean(configDraft.pedir_presupuesto_antes_derivar)}
                        onClick={() => updateDraft("pedir_presupuesto_antes_derivar", !configDraft.pedir_presupuesto_antes_derivar)}
                      >
                        {configDraft.pedir_presupuesto_antes_derivar ? "Pide presupuesto antes de derivar: SÍ" : "Pide presupuesto antes de derivar: NO"}
                      </ToggleButton>

                      <ToggleButton
                        active={Boolean(configDraft.confirmar_origen_sugerido)}
                        onClick={() => updateDraft("confirmar_origen_sugerido", !configDraft.confirmar_origen_sugerido)}
                      >
                        {configDraft.confirmar_origen_sugerido ? "Confirma origen sugerido: SÍ" : "Confirma origen sugerido: NO"}
                      </ToggleButton>

                      <ToggleButton
                        active={Boolean(configDraft.origen_sugerido_suma_score)}
                        onClick={() => updateDraft("origen_sugerido_suma_score", !configDraft.origen_sugerido_suma_score)}
                      >
                        {configDraft.origen_sugerido_suma_score ? "Origen sugerido suma score: SÍ" : "Origen sugerido suma score: NO"}
                      </ToggleButton>
                    </div>

                    <ActionButton onClick={saveConfig} disabled={saving}>
                      <Save size={14} />
                      Guardar reglas de derivación
                    </ActionButton>
                  </div>
                </Card>
              </div>

              <div className="space-y-5">
                <Card title="Mensajes de derivación e indagación">
                  <div className="grid gap-4">
                    <div>
                      <FieldLabel>Confirmar origen sugerido</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_confirmar_origen_sugerido)}
                        onChange={(value) => updateDraft("mensaje_confirmar_origen_sugerido", value)}
                        rows={3}
                        placeholder="Por tu número, pareciera que estás en zona {{origen_sugerido}}. ¿Saldrían desde {{origen_sugerido}} o desde otra ciudad?"
                      />
                    </div>

                    <div>
                      <FieldLabel>Datos completos / seguir indagando</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_datos_completos)}
                        onChange={(value) => updateDraft("mensaje_datos_completos", value)}
                        rows={3}
                        placeholder="Perfecto, ya tengo los datos principales. ¿Querés contarme si tienen preferencia de hotel, zona o cantidad de noches?"
                      />
                    </div>

                    <div>
                      <FieldLabel>Mensaje de despedida al transferir</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.mensaje_despedida)}
                        onChange={(value) => updateDraft("mensaje_despedida", value)}
                        rows={4}
                      />
                    </div>

                    <div>
                      <FieldLabel>Plantilla resumen interno</FieldLabel>
                      <TextArea
                        value={cleanText(configDraft.plantilla_resumen)}
                        onChange={(value) => updateDraft("plantilla_resumen", value)}
                        rows={5}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="Palabras clave" subtitle="Ajustá manualmente la temperatura del lead.">
                  <div className="grid gap-3 md:grid-cols-2">
                    {palabras.length === 0 ? <EmptyState title="Sin palabras clave" subtitle="Agregá frases que indiquen intención comercial." /> : null}

                    {palabras.map((item) => (
                      <article key={item.id} className="rounded-2xl border border-black/10 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-black text-[#142033]">{item.palabra}</h3>
                            <p className="mt-1 text-xs font-bold text-[#64748b]">+{item.peso || 0} puntos</p>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editPalabra(item)}
                              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90] hover:bg-[#dcecef]"
                              title="Editar"
                            >
                              <Settings2 size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => deletePalabra(item.id)}
                              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100"
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {activeTab === "pipeline" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
              <Card title={editingPipelineId ? "Editar estado" : "Nuevo estado"} subtitle="Estados del pipeline comercial generado por Cande." icon={<SlidersHorizontal size={16} />}>
                <div className="grid gap-3">
                  <div>
                    <FieldLabel>Nombre</FieldLabel>
                    <TextInput
                      value={pipelineDraft.nombre}
                      onChange={(value) => setPipelineDraft((current) => ({ ...current, nombre: value }))}
                      placeholder="Presupuestada"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Color</FieldLabel>
                      <TextInput
                        value={pipelineDraft.color}
                        onChange={(value) => setPipelineDraft((current) => ({ ...current, color: value }))}
                        placeholder="#8b5cf6"
                      />
                    </div>

                    <div>
                      <FieldLabel>Orden</FieldLabel>
                      <TextInput
                        value={pipelineDraft.orden}
                        onChange={(value) => setPipelineDraft((current) => ({ ...current, orden: value }))}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Resultado</FieldLabel>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "", label: "Ninguno" },
                        { value: "ganada", label: "Ganada" },
                        { value: "perdida", label: "Perdida" }
                      ].map((item) => (
                        <ToggleButton
                          key={item.value}
                          active={pipelineDraft.resultado === item.value}
                          onClick={() => setPipelineDraft((current) => ({ ...current, resultado: item.value }))}
                        >
                          {item.label}
                        </ToggleButton>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <ToggleButton
                      active={pipelineDraft.es_final}
                      onClick={() => setPipelineDraft((current) => ({ ...current, es_final: !current.es_final }))}
                    >
                      {pipelineDraft.es_final ? "Estado final" : "No final"}
                    </ToggleButton>

                    <ToggleButton
                      active={pipelineDraft.es_sin_atender}
                      onClick={() => setPipelineDraft((current) => ({ ...current, es_sin_atender: !current.es_sin_atender }))}
                    >
                      {pipelineDraft.es_sin_atender ? "Sin atender" : "Normal"}
                    </ToggleButton>
                  </div>

                  <div className="flex gap-2">
                    <ActionButton onClick={savePipeline} disabled={saving}>
                      <Save size={14} />
                      {editingPipelineId ? "Guardar cambios" : "Agregar estado"}
                    </ActionButton>

                    {editingPipelineId ? (
                      <ActionButton onClick={resetPipelineDraft} disabled={saving} danger>
                        <X size={14} />
                        Cancelar
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </Card>

              <Card title="Pipeline de oportunidades" subtitle="Orden y comportamiento de cada columna.">
                <div className="space-y-3">
                  {sortedPipeline.length === 0 ? <EmptyState title="Sin pipeline" subtitle="Agregá los estados comerciales." /> : null}

                  {sortedPipeline.map((estado) => (
                    <article key={estado.id} className="rounded-2xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: estado.color || "#8b5cf6" }} />
                            <h3 className="text-sm font-black text-[#142033]">{estado.nombre}</h3>
                            <Pill>Orden {estado.orden}</Pill>
                            {estado.es_final ? <Pill>Final</Pill> : null}
                            {estado.es_sin_atender ? <Pill>Sin atender</Pill> : null}
                            {estado.resultado ? <Pill>{estado.resultado}</Pill> : null}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => editPipeline(estado)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef6f7] text-[#4f7c90] hover:bg-[#dcecef]"
                            title="Editar"
                          >
                            <Settings2 size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePipeline(estado.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-100"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}
    </ComunicacionesPageShell>
  );
}