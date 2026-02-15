
import { GoogleGenAI, Type } from "@google/genai";
import type { DashboardConfig } from "../components/types";

/**
 * Obtiene la API Key desde cualquier fuente disponible.
 */
const getApiKey = (): string | null => {
  // Intentar import.meta.env (Vite build)
  try {
    const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (viteKey && viteKey !== "") return viteKey;
  } catch (_) { /* ignorar */ }

  // Intentar process.env (Vite define)
  try {
    const processKey = (globalThis as any).process?.env?.VITE_GEMINI_API_KEY;
    if (processKey && processKey !== "") return processKey;
  } catch (_) { /* ignorar */ }

  // Intentar process.env.API_KEY
  try {
    const apiKey = (globalThis as any).process?.env?.API_KEY;
    if (apiKey && apiKey !== "") return apiKey;
  } catch (_) { /* ignorar */ }

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
    console.error("[GeminiService] No se encontró API Key en ninguna fuente.");
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
    console.log("[GeminiService] Iniciando análisis con modelo gemini-2.0-flash...");
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analiza los siguientes datos de la jornada ${date}: ${JSON.stringify(cleanedData)}`,
      config: {
        systemInstruction: `Actúa como un Gerente de Operaciones experto de SQM Litio. 
        Analiza el cumplimiento de la jornada y entrega un resumen ejecutivo técnico.
        REGLAS: Resumen conciso, enfocado en desviaciones. Usa formato "X horas con Y minutos" para tiempos.`,
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
    console.log("[GeminiService] Análisis completado exitosamente.");
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("[GeminiService] Error en análisis:", error?.message || error);

    if (
      error?.message?.includes("leaked") ||
      error?.message?.includes("403") ||
      error?.message?.includes("PERMISSION_DENIED") ||
      error?.message?.includes("Requested entity was not found") ||
      error?.message?.includes("not found")
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
 * Refina justificaciones operacionales usando Gemini.
 */
export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  const apiKey = getApiKey();

  if (!rawText || rawText.length < 5) {
    console.log("[GeminiService] Texto muy corto, no se refina.");
    return rawText;
  }

  if (!apiKey) {
    console.error("[GeminiService] No se puede refinar: falta API Key.");
    throw new Error("MISSING_API_KEY");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    console.log(`[GeminiService] Refinando justificación para: "${product}" | Texto: "${rawText.substring(0, 50)}..."`);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Refina el siguiente texto de justificación operativa para un informe profesional de minería de litio. El producto es "${product}". Texto original: "${rawText}"`,
      config: {
        systemInstruction: `Eres un redactor técnico profesional para informes operativos de SQM Litio.
        Tu ÚNICA tarea es refinar y formalizar el texto de justificación operativa que recibes.
        
        REGLAS ESTRICTAS:
        1. Responde ÚNICAMENTE con el texto refinado, sin ningún prefijo ni encabezado.
        2. PROHIBIDO incluir frases como "Justificación operativa:", "Justificación para...", "Informe:", etc.
        3. PROHIBIDO incluir el nombre del producto al inicio.
        4. Mantén el significado original pero mejora la redacción profesional.
        5. Usa terminología técnica minera cuando sea apropiado.
        6. El texto debe ser conciso y directo (máximo 3 oraciones).
        7. Responde SOLO con el texto mejorado, nada más.`
      }
    });

    const result = response.text?.trim();
    console.log(`[GeminiService] Refinamiento exitoso: "${result?.substring(0, 80)}..."`);

    if (!result || result.length === 0) {
      console.warn("[GeminiService] Respuesta vacía de Gemini, retornando texto original.");
      return rawText;
    }

    return result;
  } catch (error: any) {
    console.error("[GeminiService] Error refinando justificación:", error?.message || error);

    if (
      error?.message?.includes("leaked") ||
      error?.message?.includes("403") ||
      error?.message?.includes("PERMISSION_DENIED") ||
      error?.message?.includes("Requested entity was not found") ||
      error?.message?.includes("not found")
    ) {
      throw new Error("API_KEY_INVALID");
    }

    // IMPORTANTE: Lanzar el error en lugar de retornar rawText silenciosamente
    throw new Error(`REFINEMENT_FAILED: ${error?.message || 'Error desconocido'}`);
  }
};
