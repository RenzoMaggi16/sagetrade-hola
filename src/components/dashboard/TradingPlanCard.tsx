import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TradingPlan } from "@/hooks/useTradingPlan";
import { BookOpen, Shield, Target, Clock, TrendingUp, AlertTriangle, Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TradingPlanCardProps {
    plan: TradingPlan | null;
    isLoading: boolean;
    onEdit: () => void;
}

export const TradingPlanCard = ({ plan, isLoading, onEdit }: TradingPlanCardProps) => {
    if (isLoading) {
        return (
            <Card className="border-border bg-card/50 backdrop-blur-sm animate-pulse">
                <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                    <div className="space-y-3">
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!plan) {
        return (
            <Card className="border-border bg-card/50 backdrop-blur-sm border-dashed">
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">Sin Trading Plan</h3>
                        <p className="text-sm text-muted-foreground">
                            Define tu plan de trading para mejorar tu disciplina y consistencia.
                        </p>
                    </div>
                    <Button onClick={onEdit} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Crear Plan
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const tradingTypeLabels: Record<string, string> = {
        scalping: "Scalping",
        intraday: "Intraday",
        swing: "Swing",
    };

    const activeRules = (plan.psychological_rules || []).filter((r: any) => r.active);
    const mainSetup = (plan.setup_rules || [])[0];

    return (
        <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Trading Plan
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
                <ScrollArea className="max-h-[calc(100vh-250px)]">
                    <div className="space-y-4 pr-3">
                        {/* General Info */}
                        <div className="space-y-2">
                            {plan.market && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Mercado</span>
                                    <span className="font-medium text-foreground">{plan.market}</span>
                                </div>
                            )}
                            {plan.instrument && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Instrumento</span>
                                    <span className="font-medium text-foreground">{plan.instrument}</span>
                                </div>
                            )}
                            {plan.trading_type && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Tipo</span>
                                    <Badge variant="outline" className="text-xs">
                                        {tradingTypeLabels[plan.trading_type] || plan.trading_type}
                                    </Badge>
                                </div>
                            )}
                            {plan.session && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Sesión</span>
                                    <span className="font-medium text-foreground">{plan.session}</span>
                                </div>
                            )}
                            {(plan.allowed_hours_start || plan.allowed_hours_end) && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Horario
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {plan.allowed_hours_start?.substring(0, 5) || '--:--'} — {plan.allowed_hours_end?.substring(0, 5) || '--:--'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Separator className="bg-border/50" />

                        {/* Risk Management */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5" />
                                Gestión de Riesgo
                            </h4>
                            {plan.risk_per_trade != null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Riesgo/trade</span>
                                    <span className="font-semibold text-loss">{plan.risk_per_trade}%</span>
                                </div>
                            )}
                            {plan.max_daily_risk != null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Riesgo diario máx</span>
                                    <span className="font-semibold text-loss">{plan.max_daily_risk}%</span>
                                </div>
                            )}
                            {plan.max_trades_per_day != null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Max trades/día</span>
                                    <span className="font-semibold text-foreground">{plan.max_trades_per_day}</span>
                                </div>
                            )}
                            {plan.min_rr != null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">R:R mínimo</span>
                                    <span className="font-semibold text-profit">1:{plan.min_rr}</span>
                                </div>
                            )}
                            {plan.stop_after_consecutive_losses != null && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Stop tras pérdidas</span>
                                    <span className="font-semibold text-foreground">{plan.stop_after_consecutive_losses} consecutivas</span>
                                </div>
                            )}
                        </div>

                        {/* Psychological Rules */}
                        {activeRules.length > 0 && (
                            <>
                                <Separator className="bg-border/50" />
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Reglas Psicológicas
                                    </h4>
                                    <div className="space-y-1.5">
                                        {activeRules.map((rule: any, i: number) => (
                                            <div key={i} className="flex items-start gap-2 text-sm">
                                                <span className="text-primary mt-0.5">•</span>
                                                <span className="text-foreground/80">{rule.rule}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Main Setup */}
                        {mainSetup && (
                            <>
                                <Separator className="bg-border/50" />
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Target className="h-3.5 w-3.5" />
                                        Setup Principal
                                    </h4>
                                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                                        <p className="font-medium text-sm text-foreground mb-1.5">{mainSetup.name}</p>
                                        {mainSetup.conditions?.length > 0 && (
                                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                                {mainSetup.conditions.map((c: string, i: number) => (
                                                    <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <TrendingUp className="h-3 w-3 text-primary/60" />
                                                        {c}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Additional Setups */}
                        {(plan.setup_rules || []).length > 1 && (
                            <div className="space-y-1.5">
                                {(plan.setup_rules || []).slice(1).map((setup: any, i: number) => (
                                    <div key={i} className="p-2 rounded bg-muted/30 text-sm">
                                        <span className="font-medium">{setup.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Monthly Goals */}
                        {plan.monthly_goals && Object.keys(plan.monthly_goals).length > 0 && (
                            <>
                                <Separator className="bg-border/50" />
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        🎯 Objetivos Mensuales
                                    </h4>
                                    <div className="space-y-1.5 text-sm">
                                        {plan.monthly_goals.discipline_goal && (
                                            <p className="text-foreground/80">
                                                <span className="text-muted-foreground">Disciplina:</span> {plan.monthly_goals.discipline_goal}
                                            </p>
                                        )}
                                        {plan.monthly_goals.performance_goal && (
                                            <p className="text-foreground/80">
                                                <span className="text-muted-foreground">Rendimiento:</span> {plan.monthly_goals.performance_goal}
                                            </p>
                                        )}
                                        {plan.monthly_goals.consistency_goal && (
                                            <p className="text-foreground/80">
                                                <span className="text-muted-foreground">Consistencia:</span> {plan.monthly_goals.consistency_goal}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Edit button at bottom */}
                        <div className="pt-2">
                            <Button onClick={onEdit} variant="outline" className="w-full gap-2">
                                <Pencil className="h-4 w-4" />
                                Editar Plan
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
