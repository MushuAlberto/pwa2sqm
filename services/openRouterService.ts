// @ts-ignore
import { GoogleGenAI } from "@google/genai";

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
Eres un redactor técnico de logística. Formaliza la siguiente observación en español técnico de forma clara y profesional.

REGLAS:
- Entrega SOLO el texto formalizado. NO incluyas etiquetas como "**Observación:**", "Resultado:" ni ninguna otra.
- OMITA el destino del producto en tu redacción. Centrarse únicamente en la causa técnica.
- NO incluyas frases de relleno como "contraviniendo la regulación" o similares.
- Traduce estos acrónimos SOLO si aparecen en la observación original: "SdA" es "Salar de Atacama", "CS" es "Coya Sur", "CF" es "Cargador Frontal". No los añadas si no están presentes.
- Producto: ${product}
- Observación: "${text}"
`.trim();

    // --- INTENTO 1: PUTER (GRATUITO/ILIMITADO) ---
    try {
        if (typeof window !== 'undefined' && (window as any).puter) {
            // Verificamos si el usuario ya tiene sesión iniciada para evitar el popup de login
            const signedIn = await (window as any).puter.auth.isSignedIn();
            
            if (signedIn) {
                console.log("DEBUG: Intentando con Puter Gemini (Free/Unlimited)...");
                const response = await (window as any).puter.ai.chat(prompt, {
                    model: 'gemini-2.0-flash'
                });

                if (response) {
                    console.log("DEBUG: Éxito con Puter");
                    return response.toString().trim().replace(/^["']|["']$/g, '');
                }
            } else {
                console.log("DEBUG: Puter disponible pero no hay sesión. Saltando al respaldo silencioso...");
            }
        } else {
            console.warn("DEBUG: Puter.js no está disponible en el objeto window");
        }
    } catch (error) {
        console.error("DEBUG: Error en Puter:", error);
    }

    // --- INTENTO 2: OPENROUTER ---
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
                const result = data.choices?.[0]?.message?.content?.trim();
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

    // --- INTENTO 3: GEMINI DIRECTO (FALLBACK) ---
    if (geminiKey) {
        try {
            console.log("DEBUG: Intentando con Gemini Fallback...");
            const genAI = new GoogleGenAI({ apiKey: geminiKey });
            const result = await genAI.models.generateContent({
                model: "gemini-1.5-flash",
                contents: prompt,
            });
            const textResult = (result.text || "").trim();
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
