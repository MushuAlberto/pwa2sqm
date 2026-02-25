
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
Eres un Consultor Senior de Estrategia y Operaciones para SQM Litio. 
Tu misión es transformar "inputs" de campo informales, con posibles errores ortográficos o de redacción, en Justificaciones Técnicas de Nivel Ejecutivo.

DIRECTRICES CRÍTICAS:
1. **Precisión Técnica**: Sustituye términos vagos por precisión operativa (ej. "falla" → "anomalía en subsistema", "mucha gente" → "saturación de dotación operativa", "camión lento" → "desactivación de parámetros de velocidad nominal").
2. **Corrección Ortográfica Total**: Identifica y corrige errores de ortografía, puntuación y tildes del texto original del usuario.
3. **Tono Ejecutivo**: El resultado debe sonar como un reporte de gerencia: directo, analítico y profesional.
4. **Respeto al Contexto**: Asegura que la justificación técnica tenga sentido con el producto mencionado.
5. **Concisión Extrema**: Máximo 2 oraciones. Evita preámbulos.

CONTEXTO:
- Producto: ${product}
- Observación del operador: "${text}"

Responde EXCLUSIVAMENTE con el resultado formalizado, sin introducir comentarios adicionales ni encomillados.
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
