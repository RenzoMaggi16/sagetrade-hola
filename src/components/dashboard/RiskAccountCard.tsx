import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, ShieldCheck, ShieldAlert, Ban, Trophy, DollarSign, Ruler, Target, PartyPopper, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Account {
  id: string;
  account_name: string;
  account_type: 'personal' | 'evaluation' | 'live';
  initial_capital: number;
  current_capital: number;
  drawdown_type?: 'fixed' | 'trailing' | null;
  drawdown_amount?: number | null;
  highest_balance?: number | null;
  profit_target?: number | null;
  evaluation_passed?: boolean;
}

interface RiskAccountCardProps {
  account: Account;
  currentBalance: number;
  highWaterMark?: number;
  profitTarget?: number;
  // Account filter (for "All Accounts" mode)
  accounts?: Account[];
  riskAccountId?: string | null;
  onRiskAccountChange?: (id: string) => void;
  showAccountFilter?: boolean;
}

// ── Custom Glass Dropdown for Account Filter ──
const RiskAccountFilter = ({
  accounts,
  selectedId,
  onChange,
}: {
  accounts: Account[];
  selectedId: string;
  onChange: (id: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedAccount = accounts.find(a => a.id === selectedId);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <div className="relative mt-2" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="risk-filter-trigger"
      >
        <span className="truncate text-xs">
          {selectedAccount?.account_name || 'Cuenta'}
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="risk-filter-dropdown"
          >
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => {
                  onChange(acc.id);
                  setIsOpen(false);
                }}
                className={`risk-filter-option ${acc.id === selectedId ? 'active' : ''}`}
              >
                <span className="text-[10px] opacity-50">
                  {acc.account_type === 'live' ? '🏦' : '🧪'}
                </span>
                <span className="truncate">{acc.account_name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const RiskAccountCard = ({ account, currentBalance, highWaterMark: hwmProp, profitTarget, accounts: accountsList, riskAccountId, onRiskAccountChange, showAccountFilter = false }: RiskAccountCardProps) => {
  const [showPassDialog, setShowPassDialog] = useState(false);
  const [wantsConsistency, setWantsConsistency] = useState(false);
  const [minProfitDays, setMinProfitDays] = useState(5);
  const [withdrawalPct, setWithdrawalPct] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  if (!account.drawdown_amount || account.drawdown_amount <= 0) {
    return null;
  }

  const drawdownAmount = account.drawdown_amount;
  const drawdownType = account.drawdown_type || 'trailing';

  // ── Calculate Logic ──────────────────────────────────────────
  let lossLimit = 0;
  let highWaterMark = account.initial_capital;

  if (drawdownType === 'fixed') {
    lossLimit = account.initial_capital - drawdownAmount;
  } else {
    highWaterMark = hwmProp ?? account.initial_capital;
    const trailingLimit = highWaterMark - drawdownAmount;
    lossLimit = Math.min(trailingLimit, account.initial_capital);
  }

  const distanceToLimit = currentBalance - lossLimit;
  const isBreached = distanceToLimit < 0;

  // ── Alert Zones ──────────────────────────────────────────────
  const criticalThreshold = drawdownAmount * 0.25;

  let status: 'safe' | 'warning' | 'breached' = 'safe';
  if (isBreached) status = 'breached';
  else if (distanceToLimit <= criticalThreshold) status = 'warning';

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

  // ── Profit Target Achievement ────────────────────────────────
  const profitAchievement = useMemo(() => {
    if (!profitTarget || profitTarget <= 0) return null;
    const profitSoFar = currentBalance - account.initial_capital;
    const remaining = profitTarget - profitSoFar;
    const progressPctTarget = Math.max(0, Math.min(100, (profitSoFar / profitTarget) * 100));
    const remainingPct = ((remaining / account.initial_capital) * 100);
    const isAchieved = remaining <= 0;
    const targetBalance = account.initial_capital + profitTarget;
    return { profitSoFar, remaining, progressPctTarget, remainingPct, isAchieved, targetBalance };
  }, [profitTarget, currentBalance, account.initial_capital]);

  const isEvaluation = account.account_type === 'evaluation';
  const showCongrats = isEvaluation && profitAchievement?.isAchieved && !account.evaluation_passed;

  // ── Handle Account Pass ──────────────────────────────────────
  const handleAccountPass = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado");
        setIsSubmitting(false);
        return;
      }

      // 1. Change account type to 'live' and reset balance fields
      const passedAt = new Date().toISOString();
      const updateData: Record<string, any> = {
        evaluation_passed: true,
        evaluation_passed_at: passedAt,
        account_type: 'live',
        current_capital: account.initial_capital,
        highest_balance: account.initial_capital,
      };

      if (wantsConsistency) {
        updateData.consistency_min_profit_days = minProfitDays;
        updateData.consistency_withdrawal_pct = withdrawalPct;
      }

      const { error: updateError } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', account.id);

      if (updateError) {
        console.error('Error updating account:', updateError);
        toast.error("Error al actualizar la cuenta");
        return;
      }

      // 2. Insert a reset payout to zero out accumulated PnL
      //    Balance = initial + trades_pnl - payouts. To make it = initial,
      //    we insert a payout equal to (currentBalance - initial_capital).
      const accumulatedProfit = currentBalance - account.initial_capital;
      if (accumulatedProfit > 0) {
        const { error: payoutError } = await supabase
          .from('payouts')
          .insert({
            user_id: user.id,
            account_id: account.id,
            amount: accumulatedProfit,
            payout_date: new Date().toISOString(),
            notes: '🔄 Reset automático por aprobación de evaluación',
          });

        if (payoutError) {
          console.error('Error inserting reset payout:', payoutError);
          // Non-critical: account type is already updated
        }
      }

      toast.success("🎉 ¡Felicitaciones! Tu cuenta ahora es fondeada (Live).");
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['payouts-list'] });
      setShowPassDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Error al procesar la aprobación");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        {/* Account filter dropdown — only in 'All Accounts' mode */}
        {showAccountFilter && accountsList && accountsList.length > 0 && onRiskAccountChange && (
          <RiskAccountFilter
            accounts={accountsList}
            selectedId={riskAccountId || ''}
            onChange={onRiskAccountChange}
          />
        )}
      </CardHeader>

      {/* ── Content ── */}
      <CardContent className="px-4 pt-4 pb-4 space-y-4">

        {/* 🎉 Congratulations Banner */}
        {showCongrats && (
          <div className="rounded-lg border-2 border-emerald-500/50 p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-2 mb-2">
              <PartyPopper className="h-5 w-5 text-emerald-400 animate-bounce" />
              <span className="text-sm font-bold text-emerald-400">🎉 ¡Objetivo Alcanzado!</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              ¡Felicitaciones! Alcanzaste el profit objetivo de {formatCurrency(profitTarget!)}. 
              ¿Aprobaste la prueba de fondeo?
            </p>
            <Button
              size="sm"
              className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => setShowPassDialog(true)}
            >
              <Trophy className="h-4 w-4" />
              ¡Aprobé la cuenta!
            </Button>
          </div>
        )}

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

        {/* Objetivo de Profit */}
        {profitAchievement && (() => {
          const { remaining, progressPctTarget, remainingPct, isAchieved, targetBalance } = profitAchievement;
          return (
            <>
              <div className="border-t border-border/40" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Objetivo</span>
                </div>
                <span className="text-base font-mono font-semibold text-sky-400/90">
                  {formatCurrency(targetBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Faltan</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isAchieved ? 'text-emerald-400' : 'text-sky-300'}`}>
                    {isAchieved ? '✓ Logrado' : `${formatCurrency(remaining)} (${remainingPct.toFixed(1)}%)`}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isAchieved ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    style={{ width: `${progressPctTarget}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{progressPctTarget.toFixed(0)}% completado</span>
                  <span>{formatCurrency(profitTarget!)}</span>
                </div>
              </div>
            </>
          );
        })()}

      </CardContent>

      {/* ── Account Pass Dialog ── */}
      <AlertDialog open={showPassDialog} onOpenChange={setShowPassDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-400">
              <PartyPopper className="h-5 w-5" />
              ¡Felicitaciones! 🎉
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  ¡Aprobaste la prueba de fondeo de <span className="font-bold text-foreground">{account.account_name}</span>!
                  El balance se reseteará a {formatCurrency(account.initial_capital)}.
                </p>

                {/* Consistency Rule Toggle */}
                <div className="rounded-lg border border-border/50 p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Regla de Consistencia</Label>
                      <p className="text-[11px] text-muted-foreground">
                        ¿Tu empresa de fondeo pide regla de consistencia para retirar?
                      </p>
                    </div>
                    <Switch
                      checked={wantsConsistency}
                      onCheckedChange={setWantsConsistency}
                    />
                  </div>

                  {wantsConsistency && (
                    <div className="space-y-3 pt-2 border-t border-border/30">
                      <div className="space-y-1.5">
                        <Label htmlFor="min-profit-days" className="text-xs">
                          Mínimo de días profit para retirar
                        </Label>
                        <Input
                          id="min-profit-days"
                          type="number"
                          min="1"
                          max="30"
                          value={minProfitDays}
                          onChange={(e) => setMinProfitDays(parseInt(e.target.value) || 1)}
                          className="h-8"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ej: 5 = necesitás al menos 5 días con ganancia para poder retirar
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="withdrawal-pct" className="text-xs">
                          % del profit retirable
                        </Label>
                        <Input
                          id="withdrawal-pct"
                          type="number"
                          min="1"
                          max="100"
                          value={withdrawalPct}
                          onChange={(e) => setWithdrawalPct(parseInt(e.target.value) || 1)}
                          className="h-8"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Ej: 50 = podés retirar hasta el 50% del profit generado
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccountPass}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Procesando..." : "Confirmar Aprobación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
