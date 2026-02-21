import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────
export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string | null;
}

interface Trade {
    id: string;
    pnl_neto: number;
    entry_time: string | null;
    exit_time: string | null;
    par: string | null;
    riesgo: number | null;
    trade_type: "buy" | "sell";
    is_outside_plan: boolean;
    pre_trade_notes: string | null;
    post_trade_notes: string | null;
    emocion: string | null;
    account_id: string | null;
}

interface Account {
    id: string;
    account_name: string;
    initial_capital: number;
    current_capital: number;
}

// ── System Prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un mentor profesional de rendimiento en trading integrado en un journal avanzado.
Analizas métricas cuantitativas y reflexiones psicológicas.
Detectas patrones de disciplina, sesgos emocionales y errores repetitivos.
Eres directo, preciso y honesto.
No usas frases motivacionales vacías.
Te basas en datos reales.
Das máximo 3 recomendaciones accionables.
Respondes de forma clara y concisa.

REGLAS DE ANÁLISIS:
- Detecta: FOMO, revenge trading, overtrading, romper el plan, mala gestión de riesgo, incoherencias entre texto y métricas.
- Compara: winrate vs profit factor, RR promedio vs narrativa, trades fuera del plan vs resultados, rachas negativas vs disciplina.
- Señala directamente: si la disciplina es el problema principal, si el riesgo está mal ajustado, si el trader se autoengaña.
- Limita tu respuesta a 150-250 palabras salvo que el usuario pida análisis profundo.
- Responde siempre en español.`;

// ── Helpers ────────────────────────────────────────────────────
function buildMetricsSummary(trades: Trade[], accounts: Account[]): string {
    if (!trades.length) return "No hay trades registrados aún.";

    const total = trades.length;
    const wins = trades.filter((t) => t.pnl_neto > 0);
    const losses = trades.filter((t) => t.pnl_neto < 0);
    const nonBE = wins.length + losses.length;
    const winRate = nonBE > 0 ? ((wins.length / nonBE) * 100).toFixed(1) : "0";

    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl_neto, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl_neto, 0) / losses.length) : 0;

    const grossProfit = trades.reduce((s, t) => s + (t.pnl_neto > 0 ? t.pnl_neto : 0), 0);
    const grossLoss = Math.abs(trades.reduce((s, t) => s + (t.pnl_neto < 0 ? t.pnl_neto : 0), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0";

    // Streak
    let streak = 0;
    const sorted = [...trades].sort((a, b) => new Date(a.entry_time || "").getTime() - new Date(b.entry_time || "").getTime());
    sorted.forEach((t) => {
        if (t.pnl_neto === 0) return;
        if (t.pnl_neto > 0) streak = streak >= 0 ? streak + 1 : 1;
        else streak = streak <= 0 ? streak - 1 : -1;
    });

    // Discipline
    const insidePlan = trades.filter((t) => !t.is_outside_plan).length;
    const disciplinePercent = ((insidePlan / total) * 100).toFixed(1);

    // Balance
    const account = accounts[0];
    const initialCap = account?.initial_capital || 0;
    const totalPnl = trades.reduce((s, t) => s + t.pnl_neto, 0);
    const balance = initialCap + totalPnl;

    // Daily averages
    const byDay = new Map<string, number>();
    trades.forEach((t) => {
        const day = t.entry_time?.split("T")[0] || "unknown";
        byDay.set(day, (byDay.get(day) || 0) + t.pnl_neto);
    });
    const dailyPnls = Array.from(byDay.values());
    const winDays = dailyPnls.filter((v) => v > 0);
    const lossDays = dailyPnls.filter((v) => v < 0);
    const avgDailyWin = winDays.length > 0 ? (winDays.reduce((a, b) => a + b, 0) / winDays.length).toFixed(2) : "0";
    const avgDailyLoss = lossDays.length > 0 ? (Math.abs(lossDays.reduce((a, b) => a + b, 0)) / lossDays.length).toFixed(2) : "0";

    return `📊 MÉTRICAS ACTUALES:
- Winrate: ${winRate}%
- Promedio de victoria: $${avgWin.toFixed(2)}
- Promedio de derrota: $${avgLoss.toFixed(2)}
- Total de operaciones: ${total}
- Racha actual: ${streak > 0 ? `+${streak} victorias` : streak < 0 ? `${streak} derrotas` : "neutral"}
- Profit Factor: ${profitFactor}
- Ganancia promedio diaria: $${avgDailyWin}
- Pérdida promedio diaria: $${avgDailyLoss}
- Balance: $${balance.toFixed(2)}
- Trades dentro del plan: ${insidePlan}/${total} (${disciplinePercent}%)

📈 ÚLTIMOS ${Math.min(10, trades.length)} TRADES:
${sorted
            .slice(-10)
            .map(
                (t, i) =>
                    `${i + 1}. Fecha: ${t.entry_time?.split("T")[0] || "N/A"} | PnL: $${t.pnl_neto} | Riesgo: $${t.riesgo || "N/A"} | RR: ${t.riesgo && t.riesgo > 0 ? (t.pnl_neto / t.riesgo).toFixed(2) : "N/A"} | Dir: ${t.trade_type} | Plan: ${t.is_outside_plan ? "NO" : "SÍ"} | Pre: "${t.pre_trade_notes || "—"}" | Post: "${t.post_trade_notes || "—"}"`
            )
            .join("\n")}`;
}

export function calculateDisciplineScore(trades: Trade[]): number {
    if (!trades.length) return 0;

    const total = trades.length;
    const insidePlan = trades.filter((t) => !t.is_outside_plan).length;
    const planScore = (insidePlan / total) * 40; // 40% weight

    // Consistency — standard dev of daily PnL (lower = better)
    const byDay = new Map<string, number>();
    trades.forEach((t) => {
        const day = t.entry_time?.split("T")[0] || "unknown";
        byDay.set(day, (byDay.get(day) || 0) + t.pnl_neto);
    });
    const dailyPnls = Array.from(byDay.values());
    const mean = dailyPnls.reduce((a, b) => a + b, 0) / (dailyPnls.length || 1);
    const variance = dailyPnls.reduce((s, v) => s + (v - mean) ** 2, 0) / (dailyPnls.length || 1);
    const stdDev = Math.sqrt(variance);
    const consistencyScore = Math.max(0, 30 - Math.min(30, stdDev / (Math.abs(mean) || 1) * 15)); // 30% weight

    // Risk respect — % of trades with risk defined
    const withRisk = trades.filter((t) => t.riesgo != null && t.riesgo > 0).length;
    const riskScore = (withRisk / total) * 20; // 20% weight

    // Emotional control — trades with pre/post notes
    const withNotes = trades.filter((t) => t.pre_trade_notes || t.post_trade_notes).length;
    const emotionScore = (withNotes / total) * 10; // 10% weight

    return Math.round(Math.min(100, planScore + consistencyScore + riskScore + emotionScore));
}

// ── Quick question map ─────────────────────────────────────────
export const QUICK_QUESTIONS: { emoji: string; label: string; prompt: string }[] = [
    { emoji: "📊", label: "Analiza mi semana", prompt: "Analiza mi desempeño de la última semana en base a mis métricas y trades recientes. Dame un resumen claro con fortalezas, debilidades y recomendaciones accionables." },
    { emoji: "🧠", label: "Evalúa mi disciplina", prompt: "Evalúa mi nivel de disciplina real basándote en mis métricas. ¿Estoy cumpliendo mi plan? ¿Hay incoherencias entre lo que creo y lo que muestran los datos?" },
    { emoji: "📉", label: "¿Por qué estoy perdiendo?", prompt: "Analiza mis trades perdedores recientes. ¿Cuál es la causa principal de mis pérdidas? ¿Es técnica, psicológica o de gestión de riesgo?" },
    { emoji: "🔥", label: "Detecta patrones psicológicos", prompt: "Detecta patrones psicológicos en mis operaciones: FOMO, revenge trading, overtrading, miedo a perder, autoengaño. Basándote en mis notas pre/post trade y resultados." },
    { emoji: "🎯", label: "¿Estoy respetando mi plan?", prompt: "Compara mis trades dentro y fuera del plan. ¿Los trades fuera del plan son rentables o perjudiciales? ¿Cuánto impactan en mi resultado general?" },
    { emoji: "⚠️", label: "¿Cuál es mi mayor error?", prompt: "Identifica mi mayor error recurrente ahora mismo. Sé directo y dime exactamente qué estoy haciendo mal y cómo corregirlo." },
    { emoji: "📈", label: "Mejorar consistencia", prompt: "¿Cómo puedo mejorar mi consistencia como trader? Analiza mis métricas y dame un plan concreto de mejora basado en datos." },
];

// ── Hook ───────────────────────────────────────────────────────
export const useMentorIA = () => {
    const queryClient = useQueryClient();
    const [isTyping, setIsTyping] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // ── Fetch chat history ──
    const {
        data: messages = [],
        isLoading: isLoadingMessages,
    } = useQuery({
        queryKey: ["mentor-chat"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];

            const { data, error } = await (supabase as any)
                .from("mentor_chat_messages")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching mentor messages:", error);
                return [];
            }
            return data as ChatMessage[];
        },
    });

    // ── Fetch trades & accounts for metrics ──
    const { data: tradeData } = useQuery({
        queryKey: ["mentor-trades"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { trades: [] as Trade[], accounts: [] as Account[] };

            const [tradesRes, accountsRes] = await Promise.all([
                supabase.from("trades").select("*").eq("user_id", user.id).order("entry_time", { ascending: true }),
                supabase.from("accounts").select("id, account_name, initial_capital, current_capital").eq("user_id", user.id),
            ]);

            return {
                trades: (tradesRes.data || []) as Trade[],
                accounts: (accountsRes.data || []) as Account[],
            };
        },
    });

    const trades = tradeData?.trades || [];
    const accounts = tradeData?.accounts || [];
    const disciplineScore = calculateDisciplineScore(trades);

    // ── Send message mutation ──
    const sendMutation = useMutation({
        mutationFn: async (userMessage: string) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            // 1. Save user message to DB
            await (supabase as any).from("mentor_chat_messages").insert({
                user_id: user.id,
                role: "user",
                content: userMessage,
            });

            // 2. Build context
            const metricsSummary = buildMetricsSummary(trades, accounts);

            // 3. Build conversation for Gemini API
            const recentMessages = messages.slice(-6).map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const formattedMessages = recentMessages.map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }],
            }));

            // Add new user message
            formattedMessages.push({
                role: "user",
                parts: [{ text: userMessage }],
            });

            // Prepend system prompt to the conversation history as it's more compatible
            const fullMessages = [
                {
                    role: "user",
                    parts: [{ text: `INSTRUCCIONES DEL SISTEMA:\n${SYSTEM_PROMPT}\n\nCONTEXTO DEL TRADER:\n${metricsSummary}\n\nDiscipline Score: ${disciplineScore}/100` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Entendido. Evaluaré con base en esas instrucciones y el contexto." }]
                },
                ...formattedMessages
            ];

            // 4. Call Gemini API
            const API_KEY = "AIzaSyAgbZZl6I9IVa7F-4x8tyzXl0zsxBUCj8Y";
            abortRef.current = new AbortController();

            const modelsToTry = [
                "gemini-2.5-flash",
                "gemini-1.5-flash-latest",
                "gemini-1.5-flash",
                "gemini-1.5-pro-latest",
                "gemini-1.5-pro",
                "gemini-1.0-pro-latest",
                "gemini-1.0-pro",
                "gemini-pro"
            ];

            let response;
            let errorDetails = "";

            for (const model of modelsToTry) {
                try {
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contents: fullMessages,
                        }),
                        signal: abortRef.current.signal,
                    });

                    if (res.ok) {
                        response = res;
                        break;
                    } else {
                        const txt = await res.text();
                        console.warn(`Modelo ${model} falló:`, txt);
                        errorDetails += `[${model}: ${res.status}] `;
                    }
                } catch (e: any) {
                    if (e.name === "AbortError") throw e;
                    console.warn(`Error de red con modelo ${model}:`, e);
                }
            }

            if (!response || !response.ok) {
                throw new Error(`Error de la API de IA. Detalles: ${errorDetails}`);
            }

            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("La IA no devolvió resultados.");
            }

            const assistantContent = data.candidates[0].content.parts[0].text || "Sin respuesta.";

            // 5. Save assistant response to DB
            await (supabase as any).from("mentor_chat_messages").insert({
                user_id: user.id,
                role: "assistant",
                content: assistantContent,
            });

            return assistantContent;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["mentor-chat"] });
        },
        onError: (err: any) => {
            if (err.name !== "AbortError") {
                toast.error("Error del Mentor IA: " + (err.message || "Desconocido"));
                queryClient.invalidateQueries({ queryKey: ["mentor-chat"] });
            }
        },
    });

    // ── Public API ──
    const sendMessage = useCallback(
        async (message: string) => {
            setIsTyping(true);
            try {
                await sendMutation.mutateAsync(message);
            } finally {
                setIsTyping(false);
            }
        },
        [sendMutation]
    );

    const sendQuickQuestion = useCallback(
        (prompt: string) => {
            sendMessage(prompt);
        },
        [sendMessage]
    );

    const generateWeeklyReport = useCallback(() => {
        sendMessage(
            "Genera un Informe Semanal completo de mi trading. Incluye: 1) Resumen de desempeño, 2) Patrón dominante detectado, 3) Evaluación de disciplina, 4) Plan de mejora concreto para la próxima semana. Sé detallado y directo."
        );
    }, [sendMessage]);

    const clearChat = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any)
            .from("mentor_chat_messages")
            .delete()
            .eq("user_id", user.id);

        queryClient.invalidateQueries({ queryKey: ["mentor-chat"] });
        toast.success("Historial del Mentor borrado");
    }, [queryClient]);

    return {
        messages,
        isLoadingMessages,
        isTyping,
        sendMessage,
        sendQuickQuestion,
        generateWeeklyReport,
        clearChat,
        disciplineScore,
        trades,
    };
};
