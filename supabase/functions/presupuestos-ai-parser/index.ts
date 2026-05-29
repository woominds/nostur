/// <reference lib="deno.ns" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type ParserRequest = {
  adjunto_id: string;
  file_url: string;
  entidad_tipo: "PRESUPUESTO" | "VUELO" | "HOTEL" | "SERVICIO" | "COMBINACION";
  titulo?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function getPrompt(entidadTipo: ParserRequest["entidad_tipo"]) {
  if (entidadTipo === "VUELO") {
    return `
Analizá esta captura o archivo de una cotización aérea.

Devolvé SOLO JSON válido, sin markdown, con esta estructura:
{
  "tipo": "VUELO",
  "confianza": 0.0,
  "vuelo": {
    "titulo": "",
    "aerolinea": "",
    "ruta_resumen": "",
    "ida_origen": "",
    "ida_destino": "",
    "ida_fecha": "",
    "ida_hora_salida": "",
    "ida_hora_llegada": "",
    "ida_escalas": "",
    "ida_detalle": "",
    "vuelta_origen": "",
    "vuelta_destino": "",
    "vuelta_fecha": "",
    "vuelta_hora_salida": "",
    "vuelta_hora_llegada": "",
    "vuelta_escalas": "",
    "vuelta_detalle": "",
    "equipaje": "",
    "tarifa_familia": "",
    "condiciones": "",
    "precio_total": null,
    "moneda": "USD"
  },
  "resumen": "",
  "observaciones": []
}

Reglas:
- Fechas en formato YYYY-MM-DD si se pueden detectar.
- Si no estás seguro, dejá el campo vacío.
- precio_total debe ser número o null.
- moneda debe ser USD, ARS, EUR, BRL, UYU u OTRA.
- No inventes datos.
`;
  }

  if (entidadTipo === "HOTEL") {
    return `
Analizá esta captura o archivo de hotelería.

Devolvé SOLO JSON válido, sin markdown, con esta estructura:
{
  "tipo": "HOTEL",
  "confianza": 0.0,
  "hotel": {
    "titulo": "",
    "nombre": "",
    "destino": "",
    "zona": "",
    "categoria": "",
    "regimen": "",
    "habitacion": "",
    "ocupacion": "",
    "check_in": "",
    "check_out": "",
    "descripcion": "",
    "beneficios": "",
    "condiciones": "",
    "politica_cancelacion": "",
    "precio_total": null,
    "moneda": "USD"
  },
  "resumen": "",
  "observaciones": []
}

Reglas:
- Fechas en formato YYYY-MM-DD si se pueden detectar.
- Si no estás seguro, dejá el campo vacío.
- precio_total debe ser número o null.
- moneda debe ser USD, ARS, EUR, BRL, UYU u OTRA.
- No inventes datos.
`;
  }

  return `
Analizá esta cotización turística general.

Devolvé SOLO JSON válido, sin markdown, con esta estructura:
{
  "tipo": "PRESUPUESTO",
  "confianza": 0.0,
  "resumen": "",
  "incluye": "",
  "no_incluye": "",
  "condiciones": "",
  "opciones": [],
  "observaciones": []
}

Reglas:
- Ordená la información para usarla en un presupuesto de viaje.
- Si detectás precios, indicá moneda y monto.
- Si no estás seguro, aclaralo en observaciones.
- No inventes datos.
`;
}

function extractOutputText(openaiData: any): string {
  if (typeof openaiData?.output_text === "string") {
    return openaiData.output_text;
  }

  const output = openaiData?.output;

  if (Array.isArray(output)) {
    for (const item of output) {
      const content = item?.content;

      if (Array.isArray(content)) {
        for (const contentItem of content) {
          if (typeof contentItem?.text === "string") {
            return contentItem.text;
          }

          if (typeof contentItem?.content === "string") {
            return contentItem.content;
          }
        }
      }
    }
  }

  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Método no permitido."
      },
      405
    );
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return jsonResponse(
        {
          error: "Falta configurar OPENAI_API_KEY en Supabase Secrets."
        },
        500
      );
    }

    const body = (await req.json()) as ParserRequest;

    if (!body.adjunto_id || !body.file_url || !body.entidad_tipo) {
      return jsonResponse(
        {
          error: "Faltan datos para procesar el archivo."
        },
        400
      );
    }

    const prompt = getPrompt(body.entidad_tipo);

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: prompt
              },
              {
                type: "input_image",
                image_url: body.file_url
              }
            ]
          }
        ],
        temperature: 0.1,
        max_output_tokens: 1800
      })
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();

      return jsonResponse(
        {
          error: "OpenAI no pudo procesar el archivo.",
          detail: errorText
        },
        500
      );
    }

    const openaiData = await openaiRes.json();
    const text = extractOutputText(openaiData);

    if (!text) {
      return jsonResponse(
        {
          error: "OpenAI respondió vacío.",
          detail: openaiData
        },
        500
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        tipo: body.entidad_tipo,
        confianza: 0,
        resumen: text,
        observaciones: ["La IA respondió, pero no devolvió JSON válido."]
      };
    }

    return jsonResponse({
      ok: true,
      adjunto_id: body.adjunto_id,
      parsed
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Error inesperado."
      },
      500
    );
  }
});