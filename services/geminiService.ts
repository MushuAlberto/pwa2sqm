import { GoogleGenAI } from "@google/genai";
import type { DashboardConfig } from "../types";

// Inicialización directa usando la variable inyectada por Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process.env.VITE_GEMINI_API_KEY || (process as any).env.API_KEY) : "") || "";
console.log("Gemini Config: API Key detection check:", !!apiKey);

let genAI: any = null;
try {
  if (apiKey) {
    genAI = new GoogleGenAI(apiKey);
    console.log("Gemini SDK inicializado correctamente.");
  } else {
    console.warn("Gemini: VITE_GEMINI_API_KEY no encontrada.");
  }
} catch (err) {
  console.error("Gemini SDK Error de Inicialización:", err);
}

const cleanDataForGemini = (data: any[]) => {
  return data.map(item => ({
    Fecha: item.Fecha,
    Producto: item.Producto,
    Destino: item.Destino,
    Ton_Prog: item.Ton_Prog,
    Ton_Real: item.Ton_Real,
    Eq_Prog: item.Eq_Prog,
    Eq_Real: item.Eq_Real,
    Regulacion_Real: item.Regulacion_Real
  }));
};

export const analyzeLogisticsWithGemini = async (
  data: any[],
  date: string,
  frontendKPIs?: { avgSda: string, avgPang: string }
): Promise<DashboardConfig> => {
  const cleanedData = cleanDataForGemini(data);
  const prompt = `Analiza la jornada del ${date}. Datos: ${JSON.stringify(cleanedData.slice(0, 30))}. Genera un resumen ejecutivo de máximo 3 líneas y sugiere 5 KPIs clave.`;

  try {
    if (!genAI) throw new Error("IA no inicializada.");

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("Respuesta vacía de la IA.");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Error (Análisis):", error);
    return {
      summary: "Análisis operativo disponible localmente. " + (error.message ? `(${error.message})` : ""),
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" },
        { label: "Modo", value: "Local" }
      ]
    };
  }
};

export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  if (!rawText || rawText.length < 5) return rawText;
  try {
    if (!genAI) throw new Error("IA no inicializada.");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Actúa como un experto en logística minera de SQM. 
      Reescribe de forma profesional, técnica y concisa la siguiente nota de justificación para el producto ${product}.
      
      REGLAS:
      1. SOLO entrega el texto refinado.
      2. No des opciones ni explicaciones.
      3. Tono técnico SQM (ej: "restricción de flujo", "saturación").
      
      Texto: "${rawText}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvedText = response.text();

    return improvedText?.trim() || rawText;
  } catch (error: any) {
    console.error("Gemini Error (Refine):", error);
    return rawText;
  }
};