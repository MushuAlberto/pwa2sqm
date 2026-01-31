import { GoogleGenAI } from "@google/genai";
import type { DashboardConfig } from "../types";

// Helper to get the API Key with extensive debugging
const getApiKey = () => {
  const key = import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof process !== 'undefined' ? (process.env.VITE_GEMINI_API_KEY || (process as any).env?.API_KEY) : undefined) ||
    (window as any).VITE_GEMINI_API_KEY;

  if (key && key !== "undefined") return key;
  return "";
};

let genAIInstance: any = null;

const getGenAI = () => {
  if (genAIInstance) return genAIInstance;
  const key = getApiKey();

  if (!key) {
    console.warn("Gemini: API Key no encontrada en ninguna fuente.");
    return null;
  }

  try {
    genAIInstance = new GoogleGenAI(key);
    console.log("Gemini: SDK configurado correctamente.");
    return genAIInstance;
  } catch (err) {
    console.error("Gemini: Error inicializando SDK:", err);
    return null;
  }
};

const cleanDataForGemini = (data: any[]) => {
  return (data || []).map(item => ({
    Producto: item.Producto,
    Ton_Prog: item.Ton_Prog,
    Ton_Real: item.Ton_Real,
    SD_Prog: item.SD_Prog,
    SD_Real: item.SD_Real,
    Diferencia: (item.Ton_Real || 0) - (item.Ton_Prog || 0)
  }));
};

export const analyzeLogisticsWithGemini = async (
  data: any[],
  date: string,
  frontendKPIs?: { avgSda: string, avgPang: string }
): Promise<DashboardConfig> => {
  const cleanedData = cleanDataForGemini(data);
  const prompt = `Actúa como Gerente SQM. Analiza: ${JSON.stringify(cleanedData.slice(0, 30))}.
  Responde con un resumen de 3 líneas técnico y ejecutivo.
  Responde únicamente en JSON: {"summary": "...", "suggestedKPIs": [{"label": "...", "value": "..."}]}`;

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
    const prompt = `Reescribe técnico para SQM: ${rawText}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || rawText;
  } catch (error) {
    return rawText;
  }
};