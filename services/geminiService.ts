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
  const prompt = `Analiza la jornada del ${date}. Datos: ${JSON.stringify(cleanedData.slice(0, 30))}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
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

    const text = response.text;
    if (!text) throw new Error("No response text");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      summary: "Análisis operativo disponible localmente.",
      suggestedKPIs: [
        { label: "Tiempo SdA", value: frontendKPIs?.avgSda || "0:00" },
        { label: "Tiempo PANG", value: frontendKPIs?.avgPang || "0:00" },
        { label: "Estado", value: "Offline" }
      ]
    };
  }
};

export const refineJustification = async (product: string, rawText: string): Promise<string> => {
  if (!rawText || rawText.length < 5) return rawText;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Actúa como un experto en logística minera de SQM. 
      Reescribe de forma profesional, técnica y concisa la siguiente nota de justificación para el producto ${product}.
      
      REGLAS CRÍTICAS:
      1. RESPONDE ÚNICAMENTE con el texto refinado.
      2. No des opciones, no expliques nada y no incluyas introducciones ni conclusiones.
      3. El tono debe ser de gestión de activos y productividad (ej: "Saturación de infraestructura", "Restricción de flujo").
      
      Texto a refinar: "${rawText}"`,
    });
    return response.text?.trim() || rawText;
  } catch (error) {
    return rawText;
  }
};