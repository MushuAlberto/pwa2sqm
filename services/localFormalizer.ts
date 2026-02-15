
/**
 * Motor de formalización local (Pseudo-IA) para SQM Litio.
 * Realiza limpieza de lenguaje coloquial y traduce a terminología técnica minera/logística.
 */

const TECHNICAL_DICTIONARY: Record<string, string> = {
    // Clima
    "lluvia": "condiciones de precipitaciones climáticas adversas",
    "lluviendo": "presencia de precipitaciones en faena",
    "viento": "fuertes ráfagas de viento",
    "nieve": "acumulación de nieve en rutas",
    "frio": "temperaturas extremas bajo cero",

    // Equipos y Mecánica
    "se rompió": "desperfecto mecánico en equipo crítico",
    "falló": "falla técnica operacional",
    "pana": "detención por reporte técnico mecánico",
    "neumatico": "incidente con neumático (pinchazo/corte)",
    "motor": "anomalía en sistema de propulsión",
    "camion": "equipo de transporte",
    "maquina": "unidad de carguío",

    // Logística y Tiempos
    "llegó tarde": "demora en arribo a punto de control",
    "atraso": "desviación en tiempos programados",
    "taco": "congestión vehicular en ruta",
    "trafico": "densidad de flujo vehicular elevada",
    "esperando": "tiempo de espera en cola (standby)",
    "lento": "ritmo operacional degradado",

    // Personal
    "poca gente": "dotación de personal insuficiente",
    "enfermo": "ausentismo por motivos de salud",
    "turno": "relevo de jornada operacional",
    "almuerzo": "detención programada por colación",

    // Acciones
    "arreglando": "ejecución de mantenimiento correctivo",
    "limpiando": "labores de orden y aseo industrial",
    "cargando": "proceso de carguío de mineral",
    "pesando": "proceso de pesaje en romana",
};

const COLLOQUIAL_FILLERS = [
    "creo que", "me parece que", "la verdad", "bueno", "basicamente",
    "un poco", "mas o menos", "estaba", "como que", "o sea"
];

/**
 * Función principal para formalizar texto localmente.
 */
export const formalizeLocally = (text: string): string => {
    if (!text || text.length < 5) return text;

    let formalized = text.toLowerCase();

    // 1. Eliminar rellenos coloquiales
    COLLOQUIAL_FILLERS.forEach(filler => {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        formalized = formalized.replace(regex, '');
    });

    // 2. Aplicar diccionario técnico
    Object.entries(TECHNICAL_DICTIONARY).forEach(([colloquial, technical]) => {
        const regex = new RegExp(`\\b${colloquial}\\b`, 'gi');
        formalized = formalized.replace(regex, technical);
    });

    // 3. Limpieza de espacios y capitalización
    formalized = formalized
        .replace(/\s+/g, ' ')
        .trim();

    if (formalized.length === 0) return text;

    // 4. Estructura de informe
    const finalResult = formalized.charAt(0).toUpperCase() + formalized.slice(1);

    // Si el texto resultante es muy corto, añadir un prefijo formal
    if (finalResult.split(' ').length < 4) {
        return `Se reporta ${finalResult.toLowerCase()} afectando el ciclo normal de operación.`;
    }

    return finalResult + ".";
};
