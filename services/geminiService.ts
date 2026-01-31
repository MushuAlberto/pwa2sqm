import { GoogleGenAI } from "@google/genai";
import type { DashboardConfig } from "../types";

// Helper to get the API Key from various possible sources in Vite/Vercel
const getApiKey = () => {
  const vKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (vKey) return vKey;

  // Literal process.env.API_KEY para que Vite lo inyecte
  try {
    const pKey = process.env.API_KEY;
    if (pKey && pKey !== "undefined") return pKey;
  } catch (e) { }

  return "";
};

let genAIInstance: any = null;

const getGenAI = () => {
  if (genAIInstance) return genAIInstance;
  const key = getApiKey();
  if (!key) {
    console.warn("Gemini: No se encontró API Key en ninguna fuente conocida.");
    return null;
  }
  try {
    genAIInstance = new GoogleGenAI(key);
    console.log("Gemini: SDK inicializado con éxito.");
    return genAIInstance;
  } catch (err) {
    console.error("Gemini: Error al instanciar SDK:", err);
    return null;
  }
};

const cleanDataForGemini = (data: any[]) => {
  return data.map(item => ({
    Fecha: item.Fecha,
    Producto: item.Producto,
    Destino: item.Destino,
    Ton_Prog: item.Ton_Prog,
    Ton_Real: item.Ton_Real,
    Eq_Prog: item.Eq_Prog,
    Eq_Real: item.Eq_Real,
    Regulacion_Real: item.Regulacion_Real,
    Tiempos: {
      SdA: item.sdaHours,
      PANG: item.pangHours,
      FaenaReal: item.faenaRealHours,
      FaenaMeta: item.faenaMetaHours
    }
  }));
};

export const analyzeLogisticsWithGemini = async (
  data: any[],
  date: string,
  frontendKPIs?: { avgSda: string, avgPang: string }
): Promise<DashboardConfig> => {
  const cleanedData = cleanDataForGemini(data);
  const prompt = `Actúa como un Gerente de Logística y Operaciones de SQM. 
  Analiza el desempeño operativo del día ${date} basado en estos datos: ${JSON.stringify(cleanedData.slice(0, 40))}.

  TU TAREA:
  Genera un "Resumen de Gestión de IA" que sea altamente TÉCNICO, EJECUTIVO y PROFESIONAL para la alta gerencia.
  
  REGLAS DE SALIDA:
  1. El resumen debe identificar causas raíz de desviaciones (si las hay) y destacar logros de eficiencia.
  2. Usa términos como "Throughput", "Ciclo Operativo", "Restricciones de flujo", "Cumplimiento de Plan".
  3. No menciones que eres una IA.
  4. Responde ÚNICAMENTE en JSON con el formato:
  {
    "summary": "Texto del resumen ejecutivo (máx 3-4 líneas)",
    "suggestedKPIs": [
      {"label": "KPI 1", "value": "valor"}, 
      {"label": "KPI 2", "value": "valor"},
      {"label": "KPI 3", "value": "valor"},
      {"label": "KPI 4", "value": "valor"},
      {"label": "KPI 5", "value": "valor"}
    ]
  }`;

  try {
    const ai = getGenAI();
    if (!ai) throw new Error("IA no inicializada (Falta API Key)");

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text) throw new Error("La IA no devolvió texto.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Error (Análisis):", error);
    return {
      summary: "Análisis operativo disponible localmente. " + (error.message ? `(${error.message})` : "Error de conexión."),
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" },
        { label: "Estado", value: "Modo Local" }
      ]
    };
  }
};

export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  if (!rawText || rawText.length < 5) return rawText;
  try {
    const ai = getGenAI();
    if (!ai) return rawText;

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Reescribe esta justificación para el producto ${product} de forma profesional y técnica para gerencia SQM.
    Texto original: "${rawText}"
    Regla: Solo entrega el texto refinado, corto y profesional.`;

    const result = await model.generateContent(prompt);
    return result.response.text()?.trim() || rawText;
  } catch (error: any) {
    console.error("Gemini Error (Refine):", error);
    return rawText;
  }
};