import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save } from "lucide-react";
import { TradingPlan, TradingPlanInput, PsychologicalRule, SetupRule, MonthlyGoals } from "@/hooks/useTradingPlan";

interface TradingPlanEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plan: TradingPlan | null;
    onSave: (data: TradingPlanInput) => Promise<void>;
    isSaving: boolean;
}

export const TradingPlanEditModal = ({ open, onOpenChange, plan, onSave, isSaving }: TradingPlanEditModalProps) => {
    // General
    const [market, setMarket] = useState("");
    const [instrument, setInstrument] = useState("");
    const [tradingType, setTradingType] = useState("");
    const [session, setSession] = useState("");
    const [hoursStart, setHoursStart] = useState("");
    const [hoursEnd, setHoursEnd] = useState("");

    // Risk
    const [riskPerTrade, setRiskPerTrade] = useState("");
    const [maxDailyRisk, setMaxDailyRisk] = useState("");
    const [maxTradesPerDay, setMaxTradesPerDay] = useState("");
    const [minRR, setMinRR] = useState("");
    const [stopAfterLosses, setStopAfterLosses] = useState("");

    // Dynamic
    const [psychRules, setPsychRules] = useState<PsychologicalRule[]>([]);
    const [setupRules, setSetupRules] = useState<SetupRule[]>([]);
    const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoals>({
        discipline_goal: "",
        performance_goal: "",
        consistency_goal: "",
    });

    // Populate from existing plan
    useEffect(() => {
        if (plan) {
            setMarket(plan.market || "");
            setInstrument(plan.instrument || "");
            setTradingType(plan.trading_type || "");
            setSession(plan.session || "");
            setHoursStart(plan.allowed_hours_start?.substring(0, 5) || "");
            setHoursEnd(plan.allowed_hours_end?.substring(0, 5) || "");
            setRiskPerTrade(plan.risk_per_trade?.toString() || "");
            setMaxDailyRisk(plan.max_daily_risk?.toString() || "");
            setMaxTradesPerDay(plan.max_trades_per_day?.toString() || "");
            setMinRR(plan.min_rr?.toString() || "");
            setStopAfterLosses(plan.stop_after_consecutive_losses?.toString() || "");
            setPsychRules(plan.psychological_rules?.length ? plan.psychological_rules : []);
            setSetupRules(plan.setup_rules?.length ? plan.setup_rules : []);
            setMonthlyGoals(plan.monthly_goals || { discipline_goal: "", performance_goal: "", consistency_goal: "" });
        } else {
            // Defaults for new plan
            setMarket("");
            setInstrument("");
            setTradingType("");
            setSession("");
            setHoursStart("");
            setHoursEnd("");
            setRiskPerTrade("");
            setMaxDailyRisk("");
            setMaxTradesPerDay("");
            setMinRR("");
            setStopAfterLosses("");
            setPsychRules([
                { rule: "No mover Stop Loss", active: true },
                { rule: "No revenge trading", active: true },
            ]);
            setSetupRules([]);
            setMonthlyGoals({ discipline_goal: "", performance_goal: "", consistency_goal: "" });
        }
    }, [plan, open]);

    // Psych rules handlers
    const addPsychRule = () => {
        setPsychRules(prev => [...prev, { rule: "", active: true }]);
    };
    const removePsychRule = (index: number) => {
        setPsychRules(prev => prev.filter((_, i) => i !== index));
    };
    const updatePsychRule = (index: number, field: keyof PsychologicalRule, value: any) => {
        setPsychRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    };

    // Setup rules handlers
    const addSetupRule = () => {
        setSetupRules(prev => [...prev, { name: "", conditions: [""] }]);
    };
    const removeSetupRule = (index: number) => {
        setSetupRules(prev => prev.filter((_, i) => i !== index));
    };
    const updateSetupName = (index: number, name: string) => {
        setSetupRules(prev => prev.map((s, i) => i === index ? { ...s, name } : s));
    };
    const addCondition = (setupIndex: number) => {
        setSetupRules(prev => prev.map((s, i) => i === setupIndex ? { ...s, conditions: [...s.conditions, ""] } : s));
    };
    const removeCondition = (setupIndex: number, condIndex: number) => {
        setSetupRules(prev => prev.map((s, i) =>
            i === setupIndex ? { ...s, conditions: s.conditions.filter((_, ci) => ci !== condIndex) } : s
        ));
    };
    const updateCondition = (setupIndex: number, condIndex: number, value: string) => {
        setSetupRules(prev => prev.map((s, i) =>
            i === setupIndex ? { ...s, conditions: s.conditions.map((c, ci) => ci === condIndex ? value : c) } : s
        ));
    };

    const handleSave = async () => {
        const data: TradingPlanInput = {
            market: market || null,
            instrument: instrument || null,
            trading_type: tradingType || null,
            session: session || null,
            allowed_hours_start: hoursStart ? hoursStart + ":00" : null,
            allowed_hours_end: hoursEnd ? hoursEnd + ":00" : null,
            risk_per_trade: riskPerTrade ? parseFloat(riskPerTrade) : null,
            max_daily_risk: maxDailyRisk ? parseFloat(maxDailyRisk) : null,
            max_trades_per_day: maxTradesPerDay ? parseInt(maxTradesPerDay) : null,
            min_rr: minRR ? parseFloat(minRR) : null,
            stop_after_consecutive_losses: stopAfterLosses ? parseInt(stopAfterLosses) : null,
            psychological_rules: psychRules.filter(r => r.rule.trim()),
            setup_rules: setupRules.filter(s => s.name.trim()).map(s => ({
                ...s,
                conditions: s.conditions.filter(c => c.trim()),
            })),
            monthly_goals: monthlyGoals,
        };

        await onSave(data);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {plan ? "Editar Trading Plan" : "Crear Trading Plan"}
                    </DialogTitle>
                    <DialogDescription>
                        Define tu plan de trading para mantener disciplina y consistencia.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="general" className="mt-2">
                    <TabsList className="grid grid-cols-5 w-full bg-muted/30">
                        <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
                        <TabsTrigger value="risk" className="text-xs">Riesgo</TabsTrigger>
                        <TabsTrigger value="setups" className="text-xs">Setups</TabsTrigger>
                        <TabsTrigger value="psych" className="text-xs">Psicología</TabsTrigger>
                        <TabsTrigger value="goals" className="text-xs">Objetivos</TabsTrigger>
                    </TabsList>

                    {/* Tab 1: General */}
                    <TabsContent value="general" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Mercado</Label>
                                <Input
                                    placeholder="Ej: Futuros, Forex, Crypto"
                                    value={market}
                                    onChange={e => setMarket(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Instrumento</Label>
                                <Input
                                    placeholder="Ej: ES, NQ, EURUSD"
                                    value={instrument}
                                    onChange={e => setInstrument(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Trading</Label>
                                <Select value={tradingType} onValueChange={setTradingType}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="scalping">Scalping</SelectItem>
                                        <SelectItem value="intraday">Intraday</SelectItem>
                                        <SelectItem value="swing">Swing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sesión</Label>
                                <Input
                                    placeholder="Ej: New York, London, Asian"
                                    value={session}
                                    onChange={e => setSession(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Horario Permitido (Inicio)</Label>
                                <Input
                                    type="time"
                                    value={hoursStart}
                                    onChange={e => setHoursStart(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Horario Permitido (Fin)</Label>
                                <Input
                                    type="time"
                                    value={hoursEnd}
                                    onChange={e => setHoursEnd(e.target.value)}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 2: Risk */}
                    <TabsContent value="risk" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Riesgo por Trade (%)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="Ej: 1"
                                    value={riskPerTrade}
                                    onChange={e => setRiskPerTrade(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Riesgo Diario Máximo (%)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="Ej: 3"
                                    value={maxDailyRisk}
                                    onChange={e => setMaxDailyRisk(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Max Trades/Día</Label>
                                <Input
                                    type="number"
                                    placeholder="Ej: 3"
                                    value={maxTradesPerDay}
                                    onChange={e => setMaxTradesPerDay(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>R:R Mínimo</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="Ej: 2"
                                    value={minRR}
                                    onChange={e => setMinRR(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Stop tras N pérdidas</Label>
                                <Input
                                    type="number"
                                    placeholder="Ej: 2"
                                    value={stopAfterLosses}
                                    onChange={e => setStopAfterLosses(e.target.value)}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Tab 3: Setups */}
                    <TabsContent value="setups" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Agrega tus setups y condiciones de entrada</p>
                            <Button variant="outline" size="sm" onClick={addSetupRule} className="gap-1">
                                <Plus className="h-3 w-3" />
                                Agregar Setup
                            </Button>
                        </div>

                        {setupRules.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                No hay setups definidos. Haz clic en "Agregar Setup".
                            </div>
                        )}

                        {setupRules.map((setup, si) => (
                            <div key={si} className="p-4 rounded-lg border border-border bg-muted/10 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={setup.name}
                                        onChange={e => updateSetupName(si, e.target.value)}
                                        placeholder="Nombre del setup (ej: Breakout Pullback)"
                                        className="font-medium"
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeSetupRule(si)} className="text-destructive h-8 w-8 shrink-0">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Condiciones</Label>
                                    {setup.conditions.map((cond, ci) => (
                                        <div key={ci} className="flex items-center gap-2">
                                            <Input
                                                value={cond}
                                                onChange={e => updateCondition(si, ci, e.target.value)}
                                                placeholder={`Condición ${ci + 1}`}
                                                className="text-sm"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeCondition(si, ci)} className="text-muted-foreground h-7 w-7 shrink-0">
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => addCondition(si)}>
                                        <Plus className="h-3 w-3" />
                                        Agregar condición
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </TabsContent>

                    {/* Tab 4: Psychological Rules */}
                    <TabsContent value="psych" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">Define reglas psicológicas a respetar</p>
                            <Button variant="outline" size="sm" onClick={addPsychRule} className="gap-1">
                                <Plus className="h-3 w-3" />
                                Agregar Regla
                            </Button>
                        </div>

                        {psychRules.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                No hay reglas definidas. Haz clic en "Agregar Regla".
                            </div>
                        )}

                        {psychRules.map((rule, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                                <Switch
                                    checked={rule.active}
                                    onCheckedChange={checked => updatePsychRule(i, "active", checked)}
                                />
                                <Input
                                    value={rule.rule}
                                    onChange={e => updatePsychRule(i, "rule", e.target.value)}
                                    placeholder="Ej: No mover Stop Loss"
                                    className="flex-1"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removePsychRule(i)} className="text-destructive h-8 w-8 shrink-0">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </TabsContent>

                    {/* Tab 5: Goals */}
                    <TabsContent value="goals" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Objetivo de Disciplina</Label>
                            <Input
                                placeholder="Ej: 90% trades dentro del plan"
                                value={monthlyGoals.discipline_goal}
                                onChange={e => setMonthlyGoals(prev => ({ ...prev, discipline_goal: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Objetivo de Rendimiento</Label>
                            <Input
                                placeholder="Ej: 3% mensual"
                                value={monthlyGoals.performance_goal}
                                onChange={e => setMonthlyGoals(prev => ({ ...prev, performance_goal: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Objetivo de Consistencia</Label>
                            <Input
                                placeholder="Ej: No romper reglas psicológicas"
                                value={monthlyGoals.consistency_goal}
                                onChange={e => setMonthlyGoals(prev => ({ ...prev, consistency_goal: e.target.value }))}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                {/* Save button */}
                <div className="flex justify-end pt-4 border-t border-border mt-4">
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        <Save className="h-4 w-4" />
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
