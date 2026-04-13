/**
 * Servicio simplificado para integración exclusiva con OpenRouter AI.
 * Utiliza el modelo MiniMax-M2.5 (free) para redacción ejecutiva y técnica.
 */

const getEnvVar = (key: string): string => {
    return (import.meta as any).env?.[key] || (window as any).process?.env?.[key] || "";
};

// Clave de API (Se obtiene exclusivamente de variables de entorno por seguridad)
const API_KEY = getEnvVar("VITE_OPENROUTER_API_KEY");
const MODEL_ID = "minimax/minimax-m2.5:free";

export const refineJustificationWithAI = async (text: string, product: string, stats?: any): Promise<string> => {
    if (!API_KEY) {
        console.error("DEBUG: Falta VITE_OPENROUTER_API_KEY en las variables de entorno");
        throw new Error("Configuración de Seguridad: La API Key no está configurada. Por favor, revisa tu archivo .env o la configuración del servidor.");
    }

    console.log("DEBUG: Iniciando formalización con MiniMax-M2.5...");
    
    // Construcción del contexto estadístico para la IA
    const statsContext = stats ? `
ESTADÍSTICAS OPERATIVAS:
- Producto: ${product}
- Cumplimiento: ${stats.compliance?.toFixed(1)}%
- Tonelaje: ${stats.tonReal?.toLocaleString()} Real vs ${stats.tonProg?.toLocaleString()} Programado
- Desv. Tiempos: ${stats.avgFaenaReal > stats.avgFaenaMeta ? 'Retraso detectado' : 'Sin cambios significativos'}
- Destino: ${stats.mainDest}
`.trim() : "";

    const isGeneration = !text || text.trim().length === 0;

    const prompt = `
Actúa como un Especialista Senior en Supply Chain y Logística de SQM Litio. 
Tu misión es redactar una justificación profesional, BREVE y EJECUTIVA (Máximo 2 oraciones).

${isGeneration ? `
INSTRUCCIÓN: No hay observación manual. Redacta una justificación técnica basada en:
${statsContext}
Utiliza terminología logística profesional (congestión logística, demoras operativas, transición de turnos, incidencias mecánicas).
` : `
INSTRUCCIÓN: Refina y profesionaliza esta observación: "${text}"
Contexto técnico: ${statsContext}
`}

REGLAS:
- Entrega SOLO el texto de la justificación.
- NO incluyas introducciones como "Causa raíz:" o "Justificación:".
- Mantén un tono ejecutivo de alto nivel.
`.trim();

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : 'https://sqm-litio.vercel.app',
                "X-Title": "SQM Logistics Dashboard",
            },
            body: JSON.stringify({
                "model": MODEL_ID,
                "messages": [
                    { "role": "system", "content": "Eres un redactor técnico experto en logística minera." },
                    { "role": "user", "content": prompt }
                ],
                "temperature": 0.5,
                "max_tokens": 150
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("DEBUG: Error de OpenRouter:", response.status, errorData);
            throw new Error(errorData.error?.message || `Error ${response.status}`);
        }

        const data = await response.json();
        const result = data.choices?.[0]?.message?.content?.trim();
        
        if (!result) {
            throw new Error("Respuesta de IA vacía");
        }

        console.log("DEBUG: Reescritura exitosa");
        return result.replace(/^["']|["']$/g, '');
        
    } catch (error: any) {
        console.error("DEBUG: Falló el servicio de IA:", error.message);
        throw error;
    }
};
