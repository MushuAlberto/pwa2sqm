
import { GoogleGenAI, Type } from "@google/genai";
import type { DashboardConfig } from "../components/types";

/**
 * Analiza los datos logísticos usando Gemini 3 Pro.
 * Implementa manejo robusto para claves filtradas (403) y entidades no encontradas.
 */
export const analyzeLogisticsWithGemini = async (
  data: any[],
  date: string,
  frontendKPIs?: { avgSda: string, avgPang: string }
): Promise<DashboardConfig> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === "") {
    throw new Error("MISSING_API_KEY");
  }

  const cleanedData = (data || []).map(item => ({
    Producto: item.Producto,
    Ton_Prog: item.Ton_Prog,
    Ton_Real: item.Ton_Real,
    Meta_Hrs: item.faenaMetaHours,
    Real_Hrs: item.faenaRealHours,
    Dif_Ton: (item.Ton_Real || 0) - (item.Ton_Prog || 0)
  })).slice(0, 60);

  try {
    // Instancia nueva justo antes de la llamada para capturar cambios en process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-1.5-pro",
      contents: `Analiza los siguientes datos de la jornada ${date}: ${JSON.stringify(cleanedData)}`,
      config: {
        systemInstruction: `Actúa como un Gerente de Operaciones experto de SQM Litio. 
        Analiza el cumplimiento de la jornada y entrega un resumen ejecutivo técnico.
        REGLAS: Resumen conciso, enfocado en desviaciones. Usa formato "X horas con Y minutos" para tiempos.`,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16000 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggestedKPIs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ["label", "value"]
              }
            }
          },
          required: ["summary", "suggestedKPIs"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Gemini Service Error:", error);

    // Si la clave está filtrada (Leaked), lanzamos un error específico. 
    // Se incluye 'Requested entity was not found' para resetear el estado de la clave según guías.
    if (
      error?.message?.includes("leaked") ||
      error?.message?.includes("403") ||
      error?.message?.includes("PERMISSION_DENIED") ||
      error?.message?.includes("Requested entity was not found")
    ) {
      throw new Error("API_KEY_INVALID");
    }

    return {
      summary: "Análisis técnico no disponible. Por favor, verifique la configuración de su clave API.",
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" }
      ]
    };
  }
};

/**
 * Refina justificaciones operacionales.
 */
export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!rawText || rawText.length < 5 || !apiKey) return rawText;

  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log(`[GeminiService] Refinando justificación para: ${product}`);
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: `Texto a refinar: "${rawText}"`,
      config: {
        systemInstruction: `Eres un redactor profesional para SQM Litio.
        Tu tarea es refinar el texto de justificación operativa que se te proporciona.
        REGLA CRÍTICA: Responde ÚNICAMENTE con el texto refinado. 
        PROHIBIDO incluir encabezados, títulos o frases como "Justificación operativa:", "Justificación para...", o el nombre del producto "${product}".`
      }
    });
    return response.text?.trim() || rawText;
  } catch (error: any) {
    // Manejo de errores de clave API en refinamiento
    if (
      error?.message?.includes("leaked") ||
      error?.message?.includes("403") ||
      error?.message?.includes("Requested entity was not found")
    ) {
      throw new Error("API_KEY_INVALID");
    }
    return rawText;
  }
};
