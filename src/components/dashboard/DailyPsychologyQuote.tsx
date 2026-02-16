import { Brain } from "lucide-react";
import { useMemo } from "react";

const PSYCHOLOGY_MESSAGES = [
    "La disciplina es el puente entre tus metas y tus resultados.",
    "No operes por venganza. El mercado no te debe nada.",
    "Respeta tu stop loss como respetas tu capital.",
    "Un buen trader no predice, reacciona ante lo que ve.",
    "La paciencia es la habilidad más rentable en el trading.",
    "Tu peor enemigo en el mercado eres tú mismo.",
    "Proteger tu capital es más importante que generar ganancias.",
    "No confundas actividad con productividad. Menos trades, más calidad.",
    "El mercado siempre estará ahí mañana. No fuerces oportunidades.",
    "La consistencia viene de seguir tu plan, no de buscar home runs.",
    "Acepta las pérdidas como parte del costo de hacer negocios.",
    "Opera con la mente fría. Las emociones son el peor indicador.",
    "La gestión del riesgo no es opcional, es supervivencia.",
    "Un diario de trading honesto es tu mejor mentor.",
    "No necesitas ganar todos los trades, solo necesitas un edge.",
    "Cada trade es independiente. No dejes que el anterior afecte al siguiente.",
    "La sobreoperación es síntoma de falta de plan, no de oportunidad.",
    "Sé humilde ante el mercado. Nadie tiene la razón siempre.",
    "Tu tamaño de posición refleja tu nivel de disciplina.",
    "El éxito en trading se mide en meses y años, no en días.",
    "Antes de operar, pregúntate: ¿esto está en mi plan?",
    "La confianza se construye con ejecución consistente, no con resultados.",
    "No muevas tu stop loss en contra de tu análisis original.",
    "Descansar también es una estrategia de trading válida.",
    "El FOMO ha destruido más cuentas que cualquier noticia del mercado.",
    "Documenta cada operación. Lo que no se mide, no se mejora.",
    "La clave no es tener razón, es ganar más cuando aciertas que cuando fallas.",
    "Un trader rentable domina su psicología antes que su estrategia.",
    "Respeta tus reglas incluso cuando el mercado te tienta a romperlas.",
    "El verdadero progreso está en los hábitos, no en las ganancias de un día.",
    "Tradea lo que ves, no lo que esperas.",
];

export const DailyPsychologyQuote = () => {
    const messageOfTheDay = useMemo(() => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = now.getTime() - startOfYear.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        return PSYCHOLOGY_MESSAGES[dayOfYear % PSYCHOLOGY_MESSAGES.length];
    }, []);

    return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Brain className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="italic">
                {messageOfTheDay}
            </p>
        </div>
    );
};
