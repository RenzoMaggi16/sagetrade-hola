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
import { CalendarIcon, Banknote, Lock, AlertTriangle, ShieldCheck } from "lucide-react";
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
}

export const PayoutForm = () => {
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [payoutDate, setPayoutDate] = useState<Date>(new Date());
    const [notes, setNotes] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // Fetch accounts
    const { data: accounts = [] } = useQuery({
        queryKey: ["accounts"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            const { data } = await supabase
                .from('accounts')
                .select('id, account_name, account_type, initial_capital, current_capital, drawdown_type, drawdown_amount')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            return (data ?? []) as Account[];
        },
    });

    // Fetch trades for selected account (to compute real balance)
    const { data: trades = [] } = useQuery({
        queryKey: ["payout-trades", selectedAccountId],
        enabled: !!selectedAccountId,
        queryFn: async () => {
            const { data } = await supabase
                .from("trades")
                .select("pnl_neto")
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

    // Compute real balance = initial + trades PnL - payouts
    const { realBalance, withdrawalThreshold, maxWithdrawal, canWithdraw, thresholdLabel } = useMemo(() => {
        if (!selectedAccount) {
            return { realBalance: 0, withdrawalThreshold: 0, maxWithdrawal: 0, canWithdraw: false, thresholdLabel: '' };
        }

        const initial = selectedAccount.initial_capital;
        const totalPnL = trades.reduce((sum, t) => sum + Number(t.pnl_neto ?? 0), 0);
        const totalPayouts = existingPayouts.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
        const balance = initial + totalPnL - totalPayouts;

        const drawdownType = selectedAccount.drawdown_type || null;
        const drawdownAmount = selectedAccount.drawdown_amount || 0;

        let threshold = initial; // Default: can withdraw above initial capital
        let label = `Capital Inicial ($${initial.toLocaleString('en-US', { minimumFractionDigits: 0 })})`;

        if (drawdownType === 'trailing' && drawdownAmount > 0) {
            // Trailing: must exceed initial + drawdown before withdrawing
            threshold = initial + drawdownAmount;
            label = `Capital Inicial + Drawdown ($${initial.toLocaleString('en-US', { minimumFractionDigits: 0 })} + $${drawdownAmount.toLocaleString('en-US', { minimumFractionDigits: 0 })})`;
        } else if (drawdownType === 'fixed' && drawdownAmount > 0) {
            // Fixed: can withdraw above initial capital
            threshold = initial;
            label = `Capital Inicial ($${initial.toLocaleString('en-US', { minimumFractionDigits: 0 })})`;
        }
        // No drawdown set = no restriction (threshold = initial)

        const max = Math.max(0, balance - threshold);
        const eligible = balance > threshold;

        return {
            realBalance: balance,
            withdrawalThreshold: threshold,
            maxWithdrawal: max,
            canWithdraw: eligible,
            thresholdLabel: label,
        };
    }, [selectedAccount, trades, existingPayouts]);

    const handleSubmit = async (e: React.FormEvent) => {
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Account Selector */}
                    <div className="space-y-2">
                        <Label>Cuenta</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map((acc) => (
                                    <SelectItem key={acc.id} value={acc.id}>
                                        {acc.account_type === 'live' ? '🏦 ' : acc.account_type === 'evaluation' ? '🧪 ' : '👤 '}
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
                                            Tu balance debe superar {thresholdLabel} para poder retirar.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedAccount.drawdown_type === 'trailing' && canWithdraw && (
                                <div className="flex items-start gap-2 p-2 rounded-md bg-violet-500/10 border border-violet-500/30">
                                    <AlertTriangle className="h-4 w-4 text-violet-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-violet-400">⚠️ Precaución</p>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                                            Tu drawdown está congelado en {formatCurrency(selectedAccount.initial_capital)}.
                                            Retirar todo el margen te deja sin colchón. Se recomienda dejar al menos {formatCurrency(selectedAccount.drawdown_amount || 0)} de margen.
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
            </CardContent>
        </Card>
    );
};
