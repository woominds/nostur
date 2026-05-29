// src/components/comunicaciones/components/AiFeedbackModal.tsx

import { useEffect, useState } from "react";
import {
  Loader2,
  Star,
  ThumbsDown,
  ThumbsUp,
  X
} from "lucide-react";

import type { AiAssistantMessage } from "../../../store/comunicacionesStore";

export type AiFeedbackType = "POSITIVO" | "NEGATIVO";

export type AiFeedbackModalState = {
  feedbackType: AiFeedbackType;
  message: AiAssistantMessage;
  originalAnswer: string;
} | null;

type AiFeedbackModalProps = {
  state: AiFeedbackModalState;
  saving: boolean;
  onClose: () => void;
  onSave: (rating: number, comment: string) => Promise<void>;
};

export function AiFeedbackModal({
  state,
  saving,
  onClose,
  onSave
}: AiFeedbackModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!state) return;

    setRating(state.feedbackType === "POSITIVO" ? 5 : 2);
    setComment("");
  }, [state]);

  if (!state) return null;

  const isPositive = state.feedbackType === "POSITIVO";

  return (
    <div className="fixed inset-0 z-[340] flex items-start justify-center bg-black/35 px-4 pt-20 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />

      <div className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[28px] border border-black/10 bg-white text-[#1f2937] shadow-2xl">
        <div
          className={[
            "border-b border-black/10 px-5 py-4",
            isPositive ? "bg-green-50" : "bg-red-50"
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className={[
                  "mb-1 flex items-center gap-2 text-sm font-black",
                  isPositive ? "text-green-800" : "text-red-800"
                ].join(" ")}
              >
                {isPositive ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                Evaluar respuesta IA
              </div>

              <p className="text-xs font-semibold leading-5 text-[#64748b]">
                Este comentario ayuda a mejorar el comportamiento del Asistente Comercial.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#64748b] hover:bg-white hover:text-[#111827]"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-5">
          <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
            <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-[#64748b]">
              Respuesta evaluada
            </div>

            <div className="line-clamp-5 whitespace-pre-wrap text-xs font-semibold leading-5 text-[#334155]">
              {state.originalAnswer}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-black text-[#111827]">
              Calificación
            </div>

            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[#f8fafc]"
                  title={`${star} estrella${star === 1 ? "" : "s"}`}
                >
                  <Star
                    size={22}
                    className={
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-[#cbd5e1]"
                    }
                  />
                </button>
              ))}

              <span className="ml-2 text-xs font-black text-[#64748b]">
                {rating}/5
              </span>
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-black text-[#111827]">
              Comentario para mejorar la IA
            </div>

            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={
                isPositive
                  ? "¿Qué hizo bien la IA? Ej: buen tono, respuesta clara, entendió la necesidad..."
                  : "¿Qué debería mejorar? Ej: inventó datos, fue muy larga, no entendió el pedido, faltó empatía..."
              }
              className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-[#f8fafc] px-3 py-2 text-xs font-semibold text-[#111827] outline-none focus:border-[#4f7c90]"
            />
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-semibold leading-5 text-violet-800">
            Este feedback queda guardado para auditoría y para mejorar prompts,
            tono, criterios de scoring y respuestas futuras del Asistente Comercial.
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-black/10 bg-[#f8fafc] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-xl px-4 text-xs font-black text-[#64748b] hover:bg-white hover:text-[#111827] disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onSave(rating, comment)}
            disabled={saving}
            className={[
              "flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-black text-white shadow-sm disabled:opacity-50",
              isPositive
                ? "bg-green-700 hover:bg-green-800"
                : "bg-red-700 hover:bg-red-800"
            ].join(" ")}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Guardar feedback
          </button>
        </div>
      </div>
    </div>
  );
}