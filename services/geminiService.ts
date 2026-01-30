import { GoogleGenAI, Type } from "@google/genai";
import type { DashboardConfig } from "../types";

// Inicialización directa usando la variable inyectada por Vite
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

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
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) throw new Error("No response text");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error (Analysis):", error);
    return {
      summary: "Análisis operativo disponible localmente por el momento.",
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" },
        { label: "Servicio", value: "Local Mode" }
      ]
    };
  }
};

export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  if (!rawText || rawText.length < 5) return rawText;
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Actúa como un experto en logística minera de SQM. 
      Reescribe de forma profesional, técnica y concisa la siguiente nota de justificación para el producto ${product}.
      
      REGLAS CRÍTICAS:
      1. RESPONDE ÚNICAMENTE con el texto refinado.
      2. No des opciones, no expliques nada y no incluyas introducciones ni conclusiones.
      3. El tono debe ser de gestión de activos y productividad (ej: "Saturación de infraestructura", "Restricción de flujo").
      
      Texto a refinar: "${rawText}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvedText = response.text();

    return improvedText?.trim() || rawText;
  } catch (error) {
    console.error("Gemini Error (Refine):", error);
    return rawText;
  }
};