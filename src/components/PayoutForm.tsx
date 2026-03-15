import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { CalendarIcon, Banknote, Lock, AlertTriangle, ShieldCheck, CalendarCheck, Flame, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

interface Account {
    id: string;
    account_name: string;
    account_type: string;
    initial_capital: number;
    current_capital: number;
    drawdown_type?: 'fixed' | 'trailing' | null;
    drawdown_amount?: number | null;
    consistency_min_profit_days?: number | null;
    consistency_withdrawal_pct?: number | null;
    evaluation_passed_at?: string | null;
}

export const PayoutForm = () => {
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [payoutDate, setPayoutDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const queryClient = useQueryClient();

    // Fetch accounts — exclude evaluation accounts
    const { data: accounts = [] } = useQuery({
        queryKey: ["accounts"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const { data } = await supabase
                .from('accounts')
                .select('id, account_name, account_type, initial_capital, current_capital, drawdown_type, drawdown_amount, consistency_min_profit_days, consistency_withdrawal_pct, evaluation_passed_at')
                .eq('user_id', user.id)
                .neq('account_type', 'evaluation')
                .order('created_at', { ascending: false });
            return (data ?? []) as Account[];
        },
    });

    // Fetch trades for selected account (with entry_time for profit days calc)
    const { data: trades = [] } = useQuery({
        queryKey: ["payout-trades", selectedAccountId],
        enabled: !!selectedAccountId,
        queryFn: async () => {
            const { data } = await supabase
                .from("trades")
                .select("pnl_neto, entry_time")
                .eq("account_id", selectedAccountId);
            return data ?? [];
        },
    });

    // Fetch payouts for selected account
    const { data: existingPayouts = [] } = useQuery({
        queryKey: ["payouts", selectedAccountId],
        enabled: !!selectedAccountId,
        queryFn: async () => {
            const { data } = await supabase
                .from("payouts")
                .select("amount")
                .eq("account_id", selectedAccountId);
            return data ?? [];
        },
    });

    // Auto-select first account
    useEffect(() => {
        if (!selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts, selectedAccountId]);

    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    // Calculate profit days for consistency rule
    const profitDaysInfo = useMemo(() => {
        if (!selectedAccount) return null;
        const minDays = selectedAccount.consistency_min_profit_days;
        const pct = selectedAccount.consistency_withdrawal_pct;
        if (!minDays || minDays <= 0) return null;

        // Group trades by date → sum PnL per day → count positive days
        // Only count trades AFTER evaluation passed date
        const passDate = selectedAccount.evaluation_passed_at;
        const dailyPnL = new Map<string, number>();
        trades.forEach((t: any) => {
            if (!t.entry_time) return;
            if (passDate && new Date(t.entry_time).getTime() <= new Date(passDate).getTime()) return;
            const dateStr = new Date(t.entry_time).toISOString().split('T')[0];
            dailyPnL.set(dateStr, (dailyPnL.get(dateStr) || 0) + Number(t.pnl_neto ?? 0));
        });

        // Sort days chronologically and count CONSECUTIVE profit days
        // A losing day resets the streak to 0
        const sortedDays = [...dailyPnL.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        let consecutiveProfitDays = 0;
        for (const [, pnl] of sortedDays) {
            if (pnl > 0) {
                consecutiveProfitDays++;
            } else {
                consecutiveProfitDays = 0; // Reset on losing/breakeven day
            }
        }

        return {
            profitDays: consecutiveProfitDays,
            minDays,
            isCompleted: consecutiveProfitDays >= minDays,
            withdrawalPct: pct || 100,
        };
    }, [selectedAccount, trades]);

    // Compute real balance = initial + trades PnL - payouts
    // Umbral de retiro = capital inicial (para TODOS los tipos de cuenta)
    const { realBalance, withdrawalThreshold, maxWithdrawal, canWithdraw, thresholdLabel } = useMemo(() => {
        if (!selectedAccount) {
            return { realBalance: 0, withdrawalThreshold: 0, maxWithdrawal: 0, canWithdraw: false, thresholdLabel: '' };
        }

        const initial = selectedAccount.initial_capital;
        const totalPnL = trades.reduce((sum: number, t: any) => sum + Number(t.pnl_neto ?? 0), 0);
        const totalPayouts = existingPayouts.reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);
        const balance = initial + totalPnL - totalPayouts;

        // Umbral siempre es el capital inicial
        const threshold = initial;
        const label = `Capital Inicial ($${initial.toLocaleString('en-US', { minimumFractionDigits: 0 })})`;

        let max = Math.max(0, balance - threshold);

        // Apply consistency rule: limit max withdrawal to % of profit
        if (profitDaysInfo && profitDaysInfo.withdrawalPct < 100) {
            const profitAmount = balance - initial;
            const allowedByPct = Math.max(0, profitAmount * (profitDaysInfo.withdrawalPct / 100));
            max = Math.min(max, allowedByPct);
        }

        // If consistency rule not met, block withdrawals
        const consistencyBlocked = profitDaysInfo && !profitDaysInfo.isCompleted;
        const eligible = balance > threshold && !consistencyBlocked;

        return {
            realBalance: balance,
            withdrawalThreshold: threshold,
            maxWithdrawal: eligible ? max : 0,
            canWithdraw: eligible,
            thresholdLabel: label,
        };
    }, [selectedAccount, trades, existingPayouts, profitDaysInfo]);

    // Pre-validate and show confirmation dialog
    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedAccountId) {
            toast.error("Seleccioná una cuenta");
            return;
        }

        const amountValue = parseFloat(amount);
        if (!amountValue || amountValue <= 0) {
            toast.error("El monto debe ser mayor a 0");
            return;
        }

        if (amountValue > maxWithdrawal) {
            toast.error(`El monto máximo de retiro es $${maxWithdrawal.toFixed(2)}`);
            return;
        }

        setShowConfirmDialog(true);
    };

    // Execute the actual withdrawal after user confirms
    const handleConfirmedSubmit = async () => {
        setShowConfirmDialog(false);
        const amountValue = parseFloat(amount);

        setIsSubmitting(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Usuario no autenticado");
                return;
            }

            const { error: payoutError } = await supabase
                .from('payouts')
                .insert({
                    user_id: user.id,
                    account_id: selectedAccountId,
                    amount: amountValue,
                    payout_date: payoutDate.toISOString(),
                    notes: notes.trim() || null,
                });

            if (payoutError) {
                console.error('Error saving payout:', payoutError);
                toast.error("Error al registrar el retiro");
                return;
            }

            // Update account current_capital
            if (selectedAccount) {
                const newCapital = selectedAccount.current_capital - amountValue;
                await supabase
                    .from('accounts')
                    .update({ current_capital: newCapital })
                    .eq('id', selectedAccountId);
            }

            queryClient.invalidateQueries({ queryKey: ['trades'] });
            queryClient.invalidateQueries({ queryKey: ['accounts'] });
            queryClient.invalidateQueries({ queryKey: ['payouts'] });
            queryClient.invalidateQueries({ queryKey: ['payouts-list'] });

            toast.success(`Retiro de $${amountValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} registrado correctamente`);

            setAmount("");
            setNotes("");
            setPayoutDate(new Date());
        } catch (error) {
            console.error('Error:', error);
            toast.error("Error al registrar el retiro");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (val: number) =>
        `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <Card className="max-w-lg mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    Registrar Retiro / Payout
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handlePreSubmit} className="space-y-6">
                    {/* Account Selector — evaluation accounts are excluded from fetch */}
                    <div className="space-y-2">
                        <Label>Cuenta</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.account_type === 'live' ? '🏦 ' : '👤 '}
                                        {acc.account_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Balance & Eligibility Info */}
                    {selectedAccount && (
                        <div className="rounded-lg border border-border/50 p-4 space-y-3 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance Actual</span>
                                <span className="text-base font-bold">{formatCurrency(realBalance)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Umbral de Retiro</span>
                                <span className="text-sm font-medium text-muted-foreground">{formatCurrency(withdrawalThreshold)}</span>
                            </div>

                            {/* Profit Days Progress (for accounts with consistency rules) */}
                            {profitDaysInfo && (
                                <div className={`rounded-md p-3 border space-y-2 ${
                                    profitDaysInfo.isCompleted
                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                        : 'bg-sky-500/10 border-sky-500/30'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarCheck className="h-3.5 w-3.5 text-sky-400" />
                                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Días Profit</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {profitDaysInfo.isCompleted
                                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                                : <Flame className="h-3.5 w-3.5 text-sky-400" />
                                            }
                                            <span className={`text-sm font-bold ${profitDaysInfo.isCompleted ? 'text-emerald-400' : 'text-sky-400'}`}>
                                                {profitDaysInfo.profitDays} / {profitDaysInfo.minDays}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${profitDaysInfo.isCompleted ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                            style={{ width: `${Math.min(100, (profitDaysInfo.profitDays / profitDaysInfo.minDays) * 100)}%` }}
                                        />
                                    </div>
                                    {!profitDaysInfo.isCompleted && (
                                        <p className="text-[10px] text-muted-foreground">
                                            Necesitás {profitDaysInfo.minDays - profitDaysInfo.profitDays} días profit más para poder retirar
                                        </p>
                                    )}
                                    {profitDaysInfo.isCompleted && profitDaysInfo.withdrawalPct < 100 && (
                                        <p className="text-[10px] text-muted-foreground">
                                            Podés retirar hasta el {profitDaysInfo.withdrawalPct}% de tu profit
                                        </p>
                                    )}
                                </div>
                            )}

                            {canWithdraw ? (
                                <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-emerald-400">Retiro habilitado</p>
                                        <p className="text-xs text-muted-foreground">
                                            Máximo retirable: <span className="font-bold text-emerald-400">{formatCurrency(maxWithdrawal)}</span>
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                                    <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-amber-400">Retiro bloqueado</p>
                                        <p className="text-xs text-muted-foreground">
                                            {profitDaysInfo && !profitDaysInfo.isCompleted
                                                ? `Necesitás cumplir ${profitDaysInfo.minDays} días profit (tenés ${profitDaysInfo.profitDays}).`
                                                : `Tu balance debe superar ${thresholdLabel} para poder retirar.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedAccount.drawdown_type === 'trailing' && canWithdraw && (
                                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/30">
                                    <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-amber-400">⚠️ Cuenta con Drawdown Trailing</p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Al retirar fondos, tu margen de drawdown se reducirá proporcionalmente.
                                            Drawdown actual: <span className="font-bold text-amber-400">{formatCurrency(selectedAccount.drawdown_amount || 0)}</span>.
                                            Se te pedirá confirmación antes de procesar el retiro.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Monto del Retiro ($)</Label>
                        <Input
                            id="amount"
                            type="number"
                            min="0"
                            step="0.01"
                            max={maxWithdrawal}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={canWithdraw ? `Máx: ${maxWithdrawal.toFixed(2)}` : "0.00"}
                            className="text-lg"
                            disabled={!canWithdraw}
                        />
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <Label>Fecha del Retiro</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal"
                                    disabled={!canWithdraw}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(payoutDate, "PPP", { locale: es })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={payoutDate}
                                    onSelect={(date) => date && setPayoutDate(date)}
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notas (opcional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Primer payout de la cuenta fondeada"
                            rows={3}
                            disabled={!canWithdraw}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={isSubmitting || !canWithdraw}
                    >
                        {!canWithdraw ? (
                            <>
                                <Lock className="h-4 w-4" />
                                Retiro Bloqueado
                            </>
                        ) : (
                            <>
                                <Banknote className="h-4 w-4" />
                                {isSubmitting ? "Registrando..." : "Registrar Retiro"}
                            </>
                        )}
                    </Button>
                </form>

                {/* Confirmation Dialog */}
                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-400">
                                <AlertTriangle className="h-5 w-5" />
                                Confirmar Retiro
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3 pt-2">
                                    <p className="text-sm text-muted-foreground">
                                        Estás por retirar <span className="font-bold text-foreground">{formatCurrency(parseFloat(amount) || 0)}</span> de tu cuenta.
                                    </p>

                                    <div className="rounded-lg border border-border/50 p-3 space-y-2 bg-muted/30">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Balance actual</span>
                                            <span className="font-medium">{formatCurrency(realBalance)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Monto del retiro</span>
                                            <span className="font-medium text-red-400">- {formatCurrency(parseFloat(amount) || 0)}</span>
                                        </div>
                                        <hr className="border-border/30" />
                                        <div className="flex justify-between text-xs">
                                            <span className="text-muted-foreground">Balance post-retiro</span>
                                            <span className="font-bold text-foreground">{formatCurrency(realBalance - (parseFloat(amount) || 0))}</span>
                                        </div>
                                    </div>

                                    {selectedAccount?.drawdown_type === 'trailing' && selectedAccount.drawdown_amount && selectedAccount.drawdown_amount > 0 && (
                                        <div className="rounded-lg border border-amber-500/30 p-3 space-y-2 bg-amber-500/5">
                                            <p className="text-xs font-medium text-amber-400">⚠️ Impacto en Drawdown Trailing</p>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Drawdown actual</span>
                                                <span className="font-medium">{formatCurrency(selectedAccount.drawdown_amount)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Drawdown post-retiro</span>
                                                <span className="font-bold text-amber-400">
                                                    {formatCurrency(Math.max(0, selectedAccount.drawdown_amount - (parseFloat(amount) || 0)))}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-amber-400/80 leading-relaxed">
                                                Al retirar, tu margen de drawdown se reduce. Esto significa que tendrás menos margen antes de alcanzar el límite de pérdida.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmedSubmit}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Confirmar Retiro
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
};
