// @ts-ignore
import { GoogleGenerativeAI } from "@google/genai";

/**
 * Servicio para integrar OpenRouter AI y Gemini AI con el Protocolo de Redacción Técnica de SQM Litio.
 */

// Función auxiliar para obtener variables de entorno en Vite (compatibilidad define)
const getEnvVar = (key: string): string => {
    return (import.meta as any).env?.[key] || (window as any).process?.env?.[key] || "";
};

export const refineJustificationWithAI = async (text: string, product: string, destination?: string): Promise<string> => {
    const openRouterKey = getEnvVar("VITE_OPENROUTER_API_KEY");
    const geminiKey = getEnvVar("VITE_GEMINI_API_KEY");
    const model = getEnvVar("VITE_OPENROUTER_MODEL") || "meta-llama/llama-3.3-70b-instruct:free";

    console.log("DEBUG: Iniciando formalización IA...");
    if (!openRouterKey && !geminiKey) {
        console.error("DEBUG: No se detectaron API Keys (OpenRouter o Gemini)");
        throw new Error("Configuración de IA incompleta");
    }

    const prompt = `
Eres un Analista Senior de Transporte y Estrategia Logística para SQM Litio. 
Tu misión es transformar reportes de campo informales en Justificaciones Técnicas de Nivel Ejecutivo para informes de gestión de transporte.

DIRECTRICES CRÍTICAS:
1. **SÍNTESIS INTELIGENTE**: Combina los "Motivos técnicos seleccionados", la "Observación manual" y el "Destino".
2. **GLOSARIO SQM**: Usa siempre: SLIT -> Salmuera de Litio, LSI (S) -> Sulfato de litio, TPO SDA -> Tiempo SQM Li, TPO PANG -> Tiempo SQM NY, CF -> Cargador Frontal, CS -> Coya Sur.
3. **TONO PROFESIONAL**: Usa términos como "ciclo logístico", "saturación de flujo", "dwell time", "latencia operativa".
4. **CONCISIÓN**: Máximo 2 oraciones. No saludes ni des explicaciones.

CONTEXTO:
- Producto: ${product}
- Destino Operativo: ${destination || 'No especificado'}
- Datos del Reporte: "${text}"

Responde EXCLUSIVAMENTE con el resultado formalizado.
`.trim();

    // --- INTENTO 1: OPENROUTER ---
    if (openRouterKey) {
        try {
            console.log("DEBUG: Intentando con OpenRouter...");
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                    "X-Title": "SQM Logistics Management"
                },
                body: JSON.stringify({
                    "model": model,
                    "messages": [
                        { "role": "system", "content": "Eres un redactor técnico profesional de SQM Litio." },
                        { "role": "user", "content": prompt }
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                let result = data.choices?.[0]?.message?.content?.trim();
                if (result) {
                    console.log("DEBUG: Éxito con OpenRouter");
                    return result.replace(/^["']|["']$/g, '');
                }
            }
            console.warn("DEBUG: OpenRouter falló o devolvió vacío");
        } catch (error) {
            console.error("DEBUG: Error en OpenRouter:", error);
        }
    }

    // --- INTENTO 2: GEMINI (FALLBACK) ---
    if (geminiKey) {
        try {
            console.log("DEBUG: Intentando con Gemini Fallback...");
            const genAI = new GoogleGenerativeAI(geminiKey);
            const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await geminiModel.generateContent(prompt);
            const response = await result.response;
            const textResult = response.text().trim();
            if (textResult) {
                console.log("DEBUG: Éxito con Gemini");
                return textResult.replace(/^["']|["']$/g, '');
            }
        } catch (error) {
            console.error("DEBUG: Error en Gemini Fallback:", error);
        }
    }

    throw new Error("Todos los servicios de IA fallaron");
};
