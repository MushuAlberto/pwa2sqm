
/**
 * Servicio para integrar OpenRouter AI con el Protocolo de Redacción Técnica de SQM Litio.
 */

export const refineJustificationWithAI = async (text: string, product: string, destination?: string): Promise<string> => {
    const apiKey = (process.env as any).VITE_OPENROUTER_API_KEY;
    const model = (process.env as any).VITE_OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";

    if (!apiKey) {
        throw new Error("OpenRouter API Key no configurada");
    }

    const prompt = `
Eres un Analista Senior de Transporte y Estrategia Logística para SQM Litio. 
Tu misión es transformar reportes de campo informales en Justificaciones Técnicas de Nivel Ejecutivo para informes de gestión de transporte.

DIRECTRICES CRÍTICAS:
1. **Síntesis Inteligente**: Combina los "Motivos técnicos seleccionados", la "Observación manual", el "Destino" y respeta el **Glosario SQM**.
2. **Glosario SQM (Acrónimos)**: Expande siempre estas siglas a su término formal:
   - **SLIT** -> Salmuera de Litio
   - **LSI (S)** -> Sulfato de litio
   - **TPO SDA** -> Tiempo SQM Li
   - **TPO PANG** -> Tiempo SQM NY
   - **CF** -> Cargador Frontal
   - **CS** -> Coya Sur
3. **Contexto Geográfico**: Utiliza el "Destino" para dar precisión técnica (ej. si es un puerto, usa términos portuarios; si es un paso fronterizo, usa términos de aduana/tránsito).
4. **Terminología Logística**: Utiliza términos precisos (ej. "ciclo logístico", "saturación de flujo", "concurrencia de activos", "dwell time", "lead time").
5. **Concisión**: Máximo 2 oraciones. Evita redundancias.

CONTEXTO:
- Producto: ${product}
- Destino Operativo: ${destination || 'No especificado'}
- Datos del Reporte: "${text}"

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
