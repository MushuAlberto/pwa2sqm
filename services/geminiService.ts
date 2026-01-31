import { GoogleGenAI } from "@google/genai";
import type { DashboardConfig } from "../types";

// Modo ultra-robusto para capturar la API Key en Vite + Vercel
const getApiKey = () => {
  // Vite reemplaza estas cadenas literalmente durante el build
  const key = import.meta.env.VITE_GEMINI_API_KEY || "";
  if (key && key !== "undefined") return key;

  // Fallback para inyecciones manuales de process.env
  try {
    const pKey = (process as any).env.VITE_GEMINI_API_KEY || (process as any).env.API_KEY;
    if (pKey && pKey !== "undefined") return pKey;
  } catch (e) { }

  return "";
};

let genAIInstance: any = null;

const getGenAI = () => {
  if (genAIInstance) return genAIInstance;
  const key = getApiKey();
  if (!key) return null;
  try {
    genAIInstance = new GoogleGenAI(key);
    return genAIInstance;
  } catch (err) {
    return null;
  }
};

const cleanDataForGemini = (data: any[]) => {
  return (data || []).map(item => ({
    Producto: item.Producto,
    Ton_Prog: item.Ton_Prog,
    Ton_Real: item.Ton_Real,
    Meta_Hrs: item.faenaMetaHours,
    Real_Hrs: item.faenaRealHours,
    Dif_Ton: (item.Ton_Real || 0) - (item.Ton_Prog || 0),
    Dif_Hrs: (item.faenaRealHours || 0) - (item.faenaMetaHours || 0)
  }));
};

export const analyzeLogisticsWithGemini = async (
  data: any[],
  date: string,
  frontendKPIs?: { avgSda: string, avgPang: string }
): Promise<DashboardConfig> => {
  const cleanedData = cleanDataForGemini(data);
  const prompt = `Actúa como Gerente SQM. Analiza los datos de la jornada ${date}:
  ${JSON.stringify(cleanedData.slice(0, 40))}
  
  TU TAREA:
  Entrega un resumen TÉCNICO y EJECUTIVO de 3-4 líneas. 
  Enfócate en desviaciones de tiempo vs meta y cumplimiento de tonelaje.
  Usa tono de gestión minera.
  
  RESPONDE ÚNICAMENTE EN JSON:
  {"summary": "...", "suggestedKPIs": [{"label": "...", "value": "..."}]}`;

  try {
    const ai = getGenAI();
    if (!ai) throw new Error("Falta configuración (API Key)");

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return {
      summary: `Análisis local: ${error.message || "Error de red"}`,
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" }
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
    const prompt = `Reescribe esta justificación logística para el producto ${product} de forma profesional y técnica para gerencia SQM.
    Texto original: "${rawText}"
    REGLA: SOLO entrega el texto refinado, corto y profesional.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim() || rawText;
  } catch (error) {
    return rawText;
  }
};