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
Actúa como un Especialista Senior en Supply Chain, Logística y Transporte con amplia experiencia en gestión de despachos. 
Tu misión es redactar una justificación profesional, ejecutiva y analítica basada en la observación proporcionada.

TONO Y ESTILO:
- Profesional, fluido y experto. Debe parecer escrito por un humano especialista, no por una IA.
- Usa terminología de la industria (p.ej., flujo logístico, ciclo de carga, disponibilidad de activos, optimización de jornada) de forma natural y pertinente.
- Evita estructuras robóticas o excesivamente rígidas.

REGLAS CRÍTICAS:
- Entrega ÚNICAMENTE el texto final de la justificación. SIN etiquetas, SIN comentarios, SIN comillas.
- OMITA menciones directas al destino específico; enfócate en la causa raíz operativa y la gestión de la flota.
- NO incluyas frases de relleno o redundantes (p.ej., "se reporta que", "debido a lo anterior").
- Traducción de acrónimos (SOLO si están en el original): "SdA" -> "Salar de Atacama", "CS" -> "Coya Sur", "CF" -> "Cargador Frontal".

CONTEXTO:
- Producto: ${product}
- Observación original: "${text}"
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
                        { "role": "system", "content": "Eres un Especialista Senior en Logística y Supply Chain de SQM Litio." },
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
