
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { isSameDay } from "date-fns";
import { useMemo } from "react";

interface Trade {
    entry_time: string;
    pnl_neto: number;
}

interface DailyPerformanceStatsProps {
    trades: Trade[];
}

export function DailyPerformanceStats({ trades }: DailyPerformanceStatsProps) {
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
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ganancia Promedio Diaria</CardTitle>
                    <TrendingUp className="h-4 w-4 text-profit-custom" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-profit-custom">
                        ${stats.avgDailyProfit.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pérdida Promedio Diaria</CardTitle>
                    <TrendingDown className="h-4 w-4 text-loss-custom" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-loss-custom">
                        -${Math.abs(stats.avgDailyLoss).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
