
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { isSameDay } from "date-fns";
import { useMemo } from "react";
import type { CalendarDisplayMode } from "@/components/Dashboard";

interface Trade {
    entry_time: string;
    pnl_neto: number;
}

interface DailyPerformanceStatsProps {
    trades: Trade[];
    displayMode?: CalendarDisplayMode;
    initialCapital?: number;
}

export function DailyPerformanceStats({ trades, displayMode = 'dollars', initialCapital = 0 }: DailyPerformanceStatsProps) {
    const stats = useMemo(() => {
        // 1. Group trades by day and calculate daily PnL
        const dailyPnLMap = new Map<string, number>();

        trades.forEach(trade => {
            if (!trade.entry_time) return;
            // Use logic similar to PnLCalendar to group by local date or simple string key
            // Ensuring consistency: create a date object and format it YYYY-MM-DD
            const date = new Date(trade.entry_time).toISOString().split('T')[0];

            const currentPnL = dailyPnLMap.get(date) || 0;
            dailyPnLMap.set(date, currentPnL + Number(trade.pnl_neto));
        });

        const dailyPnLs = Array.from(dailyPnLMap.values());

        // 2. Separate into winning and losing days
        const winningDays = dailyPnLs.filter(pnl => pnl > 0);
        const losingDays = dailyPnLs.filter(pnl => pnl < 0);

        // 3. Calculate averages
        const totalWinPnL = winningDays.reduce((sum, pnl) => sum + pnl, 0);
        const totalLossPnL = losingDays.reduce((sum, pnl) => sum + pnl, 0);

        const avgDailyProfit = winningDays.length > 0 ? totalWinPnL / winningDays.length : 0;
        const avgDailyLoss = losingDays.length > 0 ? totalLossPnL / losingDays.length : 0;

        return {
            avgDailyProfit,
            avgDailyLoss
        };
    }, [trades]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                    <CardTitle className="text-sm font-large">Ganancia Promedio Diaria</CardTitle>
                    <TrendingUp className="h-5 w-5 text-profit-custom" />
                </CardHeader>
                <CardContent className="flex-1 flex items-center py-10">
                    <div className="text-3xl font-bold text-profit-custom tracking-tight">
                        {displayMode === 'percentage' && initialCapital > 0
                            ? `${((stats.avgDailyProfit / initialCapital) * 100).toFixed(2)}%`
                            : `$${stats.avgDailyProfit.toFixed(2)}`
                        }
                    </div>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                    <CardTitle className="text-sm font-large">Pérdida Promedio Diaria</CardTitle>
                    <TrendingDown className="h-5 w-5 text-loss-custom" />
                </CardHeader>
                <CardContent className="flex-1 flex items-center py-10">
                    <div className="text-3xl font-bold text-loss-custom tracking-tight">
                        {displayMode === 'percentage' && initialCapital > 0
                            ? `-${((Math.abs(stats.avgDailyLoss) / initialCapital) * 100).toFixed(2)}%`
                            : `-$${Math.abs(stats.avgDailyLoss).toFixed(2)}`
                        }
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
