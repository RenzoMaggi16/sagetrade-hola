import { useMemo } from "react";
import { parseISO, format, isSameDay } from "date-fns";

interface Trade {
    id: string;
    pnl_neto: number;
    entry_time: string;
    is_outside_plan?: boolean;
}

export interface DisciplineMetrics {
    tradesInsidePlanPercent: number;
    daysRespectingPlan: number;
    currentDisciplineStreak: number;
    totalTrades: number;
    tradesInsidePlan: number;
}

export const useDisciplineMetrics = (trades: Trade[]): DisciplineMetrics => {
    return useMemo(() => {
        if (!trades.length) {
            return {
                tradesInsidePlanPercent: 0,
                daysRespectingPlan: 0,
                currentDisciplineStreak: 0,
                totalTrades: 0,
                tradesInsidePlan: 0,
            };
        }

        const totalTrades = trades.length;
        const tradesInsidePlan = trades.filter(t => !t.is_outside_plan).length;
        const tradesInsidePlanPercent = totalTrades > 0 ? (tradesInsidePlan / totalTrades) * 100 : 0;

        // Group trades by day
        const tradesByDay = new Map<string, Trade[]>();
        trades.forEach(t => {
            if (!t.entry_time) return;
            const dayKey = format(parseISO(t.entry_time), 'yyyy-MM-dd');
            const existing = tradesByDay.get(dayKey) || [];
            existing.push(t);
            tradesByDay.set(dayKey, existing);
        });

        // Days where ALL trades are inside plan
        let daysRespectingPlan = 0;
        const sortedDays = Array.from(tradesByDay.keys()).sort();

        sortedDays.forEach(day => {
            const dayTrades = tradesByDay.get(day)!;
            const allInsidePlan = dayTrades.every(t => !t.is_outside_plan);
            if (allInsidePlan) daysRespectingPlan++;
        });

        // Current discipline streak (consecutive days from most recent)
        let currentDisciplineStreak = 0;
        for (let i = sortedDays.length - 1; i >= 0; i--) {
            const dayTrades = tradesByDay.get(sortedDays[i])!;
            const allInsidePlan = dayTrades.every(t => !t.is_outside_plan);
            if (allInsidePlan) {
                currentDisciplineStreak++;
            } else {
                break;
            }
        }

        return {
            tradesInsidePlanPercent,
            daysRespectingPlan,
            currentDisciplineStreak,
            totalTrades,
            tradesInsidePlan,
        };
    }, [trades]);
};
