
/**
 * Servicio para integrar OpenRouter AI con el Protocolo de Redacción Técnica de SQM Litio.
 */

export const refineJustificationWithAI = async (text: string, product: string): Promise<string> => {
    const apiKey = (process.env as any).VITE_OPENROUTER_API_KEY;
    const model = (process.env as any).VITE_OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

    if (!apiKey) {
        throw new Error("OpenRouter API Key no configurada");
    }

    const prompt = `
Eres un Analista Senior de Transporte y Estrategia Logística para SQM Litio. 
Tu misión es transformar reportes de campo informales en Justificaciones Técnicas de Nivel Ejecutivo para informes de gestión de transporte.

DIRECTRICES CRÍTICAS:
1. **Síntesis Inteligente**: Combina los "Motivos técnicos seleccionados" y la "Observación anual del operador" en una única justificación técnica coherente y fluida.
2. **Terminología Logística**: Utiliza términos precisos (ej. "ciclo de transporte", "saturación de flujo operativo", "concurrencia de activos", "tasa de carguío").
3. **Tono Ejecutivo**: El resultado debe ser directo, profesional y apto para gerencia senior.
4. **Concisión**: Máximo 2 oraciones. Evita redundancias.

CONTEXTO:
- Producto: ${product}
- Datos Recibidos: "${text}"

Responde EXCLUSIVAMENTE con el resultado formalizado.
`.trim();

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://sqm-logistics.vercel.app", // Opcional para OpenRouter
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

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenRouter Error:", errorData);
            throw new Error(`Error de API: ${response.status}`);
        }

        const data = await response.json();
        let result = data.choices[0]?.message?.content?.trim();

        // Limpieza básica por si la IA agrega comillas
        if (result.startsWith('"') && result.endsWith('"')) {
            result = result.substring(1, result.length - 1);
        }

        return result || text;
    } catch (error) {
        console.error("Error en refineJustificationWithAI:", error);
        throw error;
    }
};
