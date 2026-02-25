
/**
 * Servicio para integrar OpenRouter AI con el Protocolo de Redacción Técnica de SQM Litio.
 */

export const refineJustificationWithAI = async (text: string, product: string): Promise<string> => {
    const apiKey = (process.env as any).VITE_OPENROUTER_API_KEY;
    const model = (process.env as any).VITE_OPENROUTER_MODEL || "nousresearch/hermes-3-llama-3.1-405b:free";

    if (!apiKey) {
        throw new Error("OpenRouter API Key no configurada");
    }

    const prompt = `
Eres un Asistente Experto en Logística y Operaciones para SQM Litio. 
Tu tarea es transformar una justificación operativa informal en un reporte técnico profesional siguiendo el Protocolo de Redacción Técnica de la compañía.

REGLAS DE ORO:
1. Usa terminología técnica (ej. "latencia operativa" en lugar de "se demoró", "desviación en tiempos de ciclo" en lugar de "tardó").
2. Evita la subjetividad ("creo que", "parece"). 
3. Mantén un tono formal, ejecutivo y preciso.
4. No menciones que eres una IA.
5. Mantén la respuesta breve (máximo 2-3 oraciones).

CONTEXTO:
- Producto: ${product}
- Observación del operador: "${text}"

Responde ÚNICAMENTE con la justificación formalizada.
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
