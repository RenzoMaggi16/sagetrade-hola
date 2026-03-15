import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Flame, CheckCircle2 } from "lucide-react";

interface Trade {
  pnl_neto: number;
  entry_time: string;
}

interface ProfitDaysTrackerProps {
  trades: Trade[];
  minProfitDays: number;
  withdrawalPct: number;
  initialCapital: number;
  currentBalance: number;
}

export const ProfitDaysTracker = ({ trades, minProfitDays, withdrawalPct, initialCapital, currentBalance }: ProfitDaysTrackerProps) => {
  const { profitDays, totalDays, isCompleted } = useMemo(() => {
    // Group trades by date, sum PnL per day
    const dailyPnL = new Map<string, number>();

    trades.forEach(trade => {
      if (!trade.entry_time) return;
      const dateStr = new Date(trade.entry_time).toISOString().split('T')[0];
      dailyPnL.set(dateStr, (dailyPnL.get(dateStr) || 0) + Number(trade.pnl_neto ?? 0));
    });

    // Count total days where net PnL > 0
    let totalProfitDays = 0;
    dailyPnL.forEach((pnl) => {
      if (pnl > 0) totalProfitDays++;
    });

    return {
      profitDays: totalProfitDays,
      totalDays: dailyPnL.size,
      isCompleted: totalProfitDays >= minProfitDays,
    };
  }, [trades, minProfitDays]);

  const progressPct = Math.min(100, (profitDays / minProfitDays) * 100);
  const withdrawableProfit = Math.max(0, currentBalance - initialCapital);
  const nextWithdrawalEstimate = withdrawableProfit * (withdrawalPct / 100);

  return (
    <Card className={`border-l-4 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md ${isCompleted ? 'border-l-emerald-500' : 'border-l-sky-500'}`}>
      <CardHeader className="pb-2 pt-3 px-4 border-b border-border/50 bg-muted/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
            <CalendarCheck className="h-3.5 w-3.5" />
            Regla de Consistencia
          </CardTitle>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
            isCompleted 
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
              : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
          }`}>
            {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
            {isCompleted ? 'Cumplida' : 'En Progreso'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-4 pb-4 space-y-3">
        {/* Days Profit Counter */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Días Profit</span>
          <div className="flex items-center gap-1.5">
            <span className={`text-2xl font-bold ${isCompleted ? 'text-emerald-400' : 'text-sky-400'}`}>
              {profitDays}
            </span>
            <span className="text-sm text-muted-foreground font-medium">/ {minProfitDays}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-sky-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{progressPct.toFixed(0)}% completado</span>
            <span>{minProfitDays - profitDays > 0 ? `Faltan ${minProfitDays - profitDays} días` : '✓ Completado'}</span>
          </div>
        </div>

        {/* Withdrawal Percentage Info */}
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <span className="text-xs text-muted-foreground">% retirable del profit</span>
          <span className="text-sm font-bold text-foreground">{withdrawalPct}%</span>
        </div>

        {/* Total trading days info */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Días operados totales</span>
          <span className="text-sm font-medium text-muted-foreground">{totalDays}</span>
        </div>

        <div className="border-t border-border/30 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Próximo retiro estimado</span>
            <span className="text-sm font-bold text-violet-400">{nextWithdrawalEstimate.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Aplicando {withdrawalPct}% sobre el balance actual.</p>
        </div>
      </CardContent>
    </Card>
  );
};
