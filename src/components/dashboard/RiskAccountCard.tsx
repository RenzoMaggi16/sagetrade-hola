
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, ShieldCheck, ShieldAlert, Ban, Trophy, DollarSign, Ruler } from "lucide-react";

interface Account {
  id: string;
  account_name: string;
  initial_capital: number;
  current_capital: number;
  drawdown_type?: 'fixed' | 'trailing' | null;
  drawdown_amount?: number | null;
  highest_balance?: number | null;
}

interface RiskAccountCardProps {
  account: Account;
  currentBalance: number;
  highWaterMark?: number;
}

export const RiskAccountCard = ({ account, currentBalance, highWaterMark: hwmProp }: RiskAccountCardProps) => {
  if (!account.drawdown_amount || account.drawdown_amount <= 0) {
    return null;
  }

  const drawdownAmount = account.drawdown_amount;
  const drawdownType = account.drawdown_type || 'trailing';

  // ── Calculate Logic ──────────────────────────────────────────
  let lossLimit = 0;
  let highWaterMark = account.initial_capital;

  if (drawdownType === 'fixed') {
    // Fixed: limit is always initial_capital - drawdown
    lossLimit = account.initial_capital - drawdownAmount;
  } else {
    // ── Trailing Drawdown ──
    // HWM is computed from trade history in Dashboard (source of truth).
    // Limit = HWM - drawdownAmount, but it FREEZES at initial_capital.
    // Once HWM >= initial + drawdown, the trailing stops.
    highWaterMark = hwmProp ?? account.initial_capital;
    const trailingLimit = highWaterMark - drawdownAmount;
    // Cap: the limit can never go above initial_capital (freeze point)
    lossLimit = Math.min(trailingLimit, account.initial_capital);
  }

  const distanceToLimit = currentBalance - lossLimit;
  const isBreached = distanceToLimit < 0;

  // ── Alert Zones ──────────────────────────────────────────────
  const criticalThreshold = drawdownAmount * 0.25;

  let status: 'safe' | 'warning' | 'breached' = 'safe';
  if (isBreached) status = 'breached';
  else if (distanceToLimit <= criticalThreshold) status = 'warning';

  // ── Progress bar percentage (how much margin remains) ────────
  // 100% = full drawdown amount available, 0% = at the limit
  const usedDrawdown = drawdownAmount - distanceToLimit;
  const progressPct = Math.max(0, Math.min(100, ((drawdownAmount - Math.max(0, usedDrawdown)) / drawdownAmount) * 100));

  // ── Styles ────────────────────────────────────────────────────
  let cardBorderColor = "border-l-4 border-l-emerald-500";
  let badgeClasses = "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
  let badgeIcon = <ShieldCheck className="w-3 h-3" />;
  let badgeText = "Operativo";
  let distanceTextColor = "text-emerald-400";
  let progressBarColor = "bg-emerald-500";

  if (status === 'warning') {
    cardBorderColor = "border-l-4 border-l-amber-500";
    badgeClasses = "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse";
    badgeIcon = <ShieldAlert className="w-3 h-3" />;
    badgeText = "Zona de Riesgo";
    distanceTextColor = "text-amber-400";
    progressBarColor = "bg-amber-500";
  } else if (status === 'breached') {
    cardBorderColor = "border-l-4 border-l-red-600 shadow-md shadow-red-900/20";
    badgeClasses = "bg-red-500/10 text-red-500 border-red-500/30";
    badgeIcon = <Ban className="w-3 h-3" />;
    badgeText = "Cuenta Perdida";
    distanceTextColor = "text-red-400";
    progressBarColor = "bg-red-500";
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  return (
    <Card className={`${cardBorderColor} transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md`}>
      {/* ── Header ── */}
      <CardHeader className="pb-2 pt-3 px-4 border-b border-border/50 bg-muted/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
            <TrendingDown className="h-3.5 w-3.5" />
            Riesgo ({drawdownType === 'trailing' ? 'Trailing' : 'Fijo'})
          </CardTitle>
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${badgeClasses}`}>
            {badgeIcon}
            {badgeText}
          </div>
        </div>
      </CardHeader>

      {/* ── Content ── */}
      <CardContent className="px-4 pt-4 pb-4 space-y-4">

        {/* Balance Actual — hero stat */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Balance</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {formatCurrency(currentBalance)}
          </span>
        </div>

        {/* Distancia al Límite */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Ruler className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Distancia</span>
          </div>
          <span className={`text-lg font-bold tracking-tight ${distanceTextColor}`}>
            {distanceToLimit > 0 ? '+' : ''}{formatCurrency(distanceToLimit)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Límite</span>
            <span>{progressPct.toFixed(0)}% disponible</span>
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-border/40" />

        {/* Límite de Pérdida */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Límite</span>
          </div>
          <span className="text-base font-mono font-semibold text-red-400/90">
            {formatCurrency(lossLimit)}
          </span>
        </div>

        {/* Pico Histórico (solo trailing) */}
        {drawdownType === 'trailing' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pico</span>
            </div>
            <span className="text-base font-mono font-semibold text-amber-500/90">
              {formatCurrency(highWaterMark)}
            </span>
          </div>
        )}

        {/* Capital Inicial (solo fixed) */}
        {drawdownType === 'fixed' && (
          <div className="flex items-center justify-between opacity-60">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Capital Inicial</span>
            <span className="text-base font-mono font-medium text-muted-foreground">
              {formatCurrency(account.initial_capital)}
            </span>
          </div>
        )}

      </CardContent>
    </Card>
  );
};
