
import { GoogleGenAI, Type } from "@google/genai";
import type { DashboardConfig } from "../components/types";

/**
 * Obtiene la API Key desde cualquier fuente disponible.
 */
const getApiKey = (): string | null => {
  try {
    const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey !== "") return viteKey;
  } catch (_) { }

  try {
    const processKey = (globalThis as any).process?.env?.VITE_GEMINI_API_KEY;
    if (processKey && processKey !== "") return processKey;
  } catch (_) { }

  try {
    const apiKey = (globalThis as any).process?.env?.API_KEY;
    if (apiKey && apiKey !== "") return apiKey;
  } catch (_) { }

  return null;
};

/**
 * Analiza los datos logísticos usando Gemini.
 */
export const analyzeLogisticsWithGemini = async (
  data: any[],
  date: string,
  frontendKPIs?: { avgSda: string, avgPang: string }
): Promise<DashboardConfig> => {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("[GeminiService] No se encontró API Key.");
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
    const ai = new GoogleGenAI({ apiKey });
    console.log("[GeminiService] Iniciando análisis...");

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `Analiza los siguientes datos de la jornada ${date}: ${JSON.stringify(cleanedData)}` }]
      }],
      config: {
        systemInstruction: "Actúa como un Gerente de Operaciones experto de SQM Litio. Analiza el cumplimiento de la jornada y entrega un resumen ejecutivo técnico en JSON. REGLA: Resumen conciso, enfocado en desviaciones.",
        responseMimeType: "application/json",
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
    console.error("[GeminiService] Error en análisis:", error);
    if (error?.message?.includes("403") || error?.message?.includes("PERMISSION_DENIED") || error?.message?.includes("not found")) {
      throw new Error("API_KEY_INVALID");
    }
    return {
      summary: "Análisis técnico no disponible actualmente.",
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" }
      ]
    };
  }
};

/**
 * Refina justificaciones operacionales usando Gemini.
 */
export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  const apiKey = getApiKey();

  if (!rawText || rawText.length < 5) return rawText;
  if (!apiKey) throw new Error("MISSING_API_KEY");

  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log(`[GeminiService] Refinando para: ${product}`);

    // SDK v1 requiere estructura contents: [{ role, parts: [{ text }] }]
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `Refina el siguiente texto de justificación operativa para un informe profesional de SQM Litio. El producto es "${product}". Texto original: "${rawText}"` }]
      }],
      config: {
        systemInstruction: `Eres un redactor técnico profesional para SQM Litio.
        REGLAS:
        1. Responde ÚNICAMENTE con el texto refinado, sin prefijos ni el nombre del producto al inicio.
        2. El tono debe ser profesional y técnico.
        3. No incluyas frases como "Aquí tienes el texto refinado" ni nada parecido.`
      }
    });

    const result = response.text?.trim();
    if (!result) return rawText;
    return result;
  } catch (error: any) {
    console.error("[GeminiService] Error refinando:", error);
    if (error?.message?.includes("403") || error?.message?.includes("PERMISSION_DENIED") || error?.message?.includes("not found")) {
      throw new Error("API_KEY_INVALID");
    }
    throw new Error(error?.message || "Error desconocido en Gemini");
  }
};
