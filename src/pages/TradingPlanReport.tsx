import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    ShieldAlert,
    BrainCircuit,
    CheckCircle,
    XCircle,
    Ban,
    AlertTriangle
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import { Progress } from "@/components/ui/progress";

// --- Interfaces ---
interface Trade {
    id: string;
    pnl_neto: number;
    riesgo: number | null;
    entry_time: string;
    is_outside_plan: boolean;
    setup_compliance: 'full' | 'partial' | 'none' | null;
}

interface TradingPlan {
    risk_per_trade: number | null;
    max_trades_per_day: number | null;
    min_rr: number | null;
}

interface ReportStats {
    volume: {
        total_trades: number;
        wins: number;
        losses: number;
        breakeven: number;
    };
    discipline: {
        inside_plan_count: number;
        outside_plan_count: number;
        inside_plan_pct: number;
        days_respecting_plan: number;
        days_breaking_plan: number;
    };
    risk: {
        avg_rr: number;
        avg_risk: number;
        risk_breaches: number; // Trades > risk_per_trade
    };
    psychology: {
        full_compliance_count: number;
        partial_compliance_count: number;
        none_compliance_count: number;
        pnl_full: number;
        pnl_partial: number;
        pnl_none: number;
    };
    performance: {
        win_rate: number;
        profit_factor: number;
        max_drawdown: number;
        best_day_pnl: number;
        worst_day_pnl: number;
        total_pnl: number;
    };
    consistency: {
        max_streak_inside: number;
        max_streak_outside: number;
    };
}

const StatCard = ({ title, value, subtext, icon: Icon, valueColor }: {
    title: string;
    value: string | number;
    subtext?: string;
    icon?: any;
    valueColor?: string;
}) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </CardHeader>
        <CardContent>
            <div className={`text-2xl font-bold ${valueColor || ''}`}>{value}</div>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        </CardContent>
    </Card>
);

const TradingPlanReport = () => {
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [equityCurve, setEquityCurve] = useState<any[]>([]);

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Trading Plan
            const { data: plan } = await (supabase as any)
                .from('trading_plans')
                .select('*')
                .eq('user_id', user.id)
                .single();

            const tradingPlan = plan as TradingPlan;

            // 2. Fetch All Trades
            const { data: tradesData, error } = await supabase
                .from('trades')
                .select('id, pnl_neto, riesgo, entry_time, is_outside_plan, setup_compliance')
                .eq('user_id', user.id)
                .order('entry_time', { ascending: true });

            if (error) throw error;

            const trades = (tradesData || []) as unknown as Trade[];

            // 3. Calculate Stats
            const calculatedStats = calculateStats(trades, tradingPlan);
            setStats(calculatedStats);

            // 4. Calculate Equity Curve
            let runningBalance = 0;
            const curve = trades.map(t => {
                runningBalance += Number(t.pnl_neto);
                return {
                    date: t.entry_time ? format(new Date(t.entry_time), 'dd/MM') : '',
                    balance: runningBalance
                };
            });
            setEquityCurve(curve);

        } catch (err) {
            console.error("Error fetching report data:", err);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (trades: Trade[], plan: TradingPlan | null): ReportStats => {
        const totalTrades = trades.length;
        if (totalTrades === 0) {
            return {
                volume: { total_trades: 0, wins: 0, losses: 0, breakeven: 0 },
                discipline: { inside_plan_count: 0, outside_plan_count: 0, inside_plan_pct: 0, days_respecting_plan: 0, days_breaking_plan: 0 },
                risk: { avg_rr: 0, avg_risk: 0, risk_breaches: 0 },
                psychology: { full_compliance_count: 0, partial_compliance_count: 0, none_compliance_count: 0, pnl_full: 0, pnl_partial: 0, pnl_none: 0 },
                performance: { win_rate: 0, profit_factor: 0, max_drawdown: 0, best_day_pnl: 0, worst_day_pnl: 0, total_pnl: 0 },
                consistency: { max_streak_inside: 0, max_streak_outside: 0 }
            };
        }

        // --- Volume ---
        const wins = trades.filter(t => t.pnl_neto > 0).length;
        const losses = trades.filter(t => t.pnl_neto < 0).length;
        const breakeven = trades.filter(t => t.pnl_neto === 0).length;

        // --- Discipline ---
        const insidePlan = trades.filter(t => !t.is_outside_plan);
        const outsidePlan = trades.filter(t => t.is_outside_plan);
        const insidePlanPct = (insidePlan.length / totalTrades) * 100;

        // Days calculation (Group by date)
        const tradesByDay = new Map<string, Trade[]>();
        trades.forEach(t => {
            const date = t.entry_time.split('T')[0];
            if (!tradesByDay.has(date)) tradesByDay.set(date, []);
            tradesByDay.get(date)?.push(t);
        });

        let daysRespecting = 0;
        let daysBreaking = 0;
        tradesByDay.forEach((dayTrades) => {
            // If ANY trade on that day is outside plan, the day is considered "breaking" (strict view)
            // OR mostly respecting? Let's go with: if user made > 0 mistakes, day is tainted.
            const hasMistake = dayTrades.some(t => t.is_outside_plan);
            if (hasMistake) daysBreaking++;
            else daysRespecting++;
        });

        // --- Risk ---
        let totalRR = 0;
        let rrCount = 0;
        let totalRisk = 0;
        let riskCount = 0;
        let riskBreaches = 0;

        trades.forEach(t => {
            const risk = t.riesgo ? Number(t.riesgo) : 0;
            const pnl = Number(t.pnl_neto);

            if (risk > 0) {
                totalRisk += risk;
                riskCount++;
                totalRR += (pnl / risk);
                rrCount++;

                if (plan?.risk_per_trade && risk > plan.risk_per_trade) { // Assuming risk_per_trade is amount, need to check if it's % or amt logic. Using simple amt for now if defined.
                    // If plan uses %, we can't easily check without account balance history. 
                    // Skipping complex % logic for now unless we fetch context.
                }
            }
        });

        const avgRR = rrCount > 0 ? totalRR / rrCount : 0;
        const avgRisk = riskCount > 0 ? totalRisk / riskCount : 0;

        // --- Psychology (Setup Compliance) ---
        let full = 0, partial = 0, none = 0;
        let pnlFull = 0, pnlPartial = 0, pnlNone = 0;

        trades.forEach(t => {
            const compliance = t.setup_compliance || 'none';
            const pnl = Number(t.pnl_neto);

            if (compliance === 'full') { full++; pnlFull += pnl; }
            else if (compliance === 'partial') { partial++; pnlPartial += pnl; }
            else { none++; pnlNone += pnl; }
        });

        // --- Performance ---
        const winRate = (wins / totalTrades) * 100;
        const totalProfit = trades.reduce((acc, t) => acc + (t.pnl_neto > 0 ? t.pnl_neto : 0), 0);
        const totalLoss = Math.abs(trades.reduce((acc, t) => acc + (t.pnl_neto < 0 ? t.pnl_neto : 0), 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 100 : 0;
        const totalPnL = trades.reduce((acc, t) => acc + Number(t.pnl_neto), 0);

        // DD Calculation
        let peak = -Infinity;
        let maxDrawdown = 0;
        let running = 0;
        trades.forEach(t => {
            running += Number(t.pnl_neto);
            if (running > peak) peak = running;
            const dd = peak - running;
            if (dd > maxDrawdown) maxDrawdown = dd;
        });

        // Best/Worst Day
        let bestDay = -Infinity;
        let worstDay = Infinity;
        tradesByDay.forEach((dayTrades) => {
            const dailyPnL = dayTrades.reduce((acc, t) => acc + Number(t.pnl_neto), 0);
            if (dailyPnL > bestDay) bestDay = dailyPnL;
            if (dailyPnL < worstDay) worstDay = dailyPnL;
        });
        if (bestDay === -Infinity) bestDay = 0;
        if (worstDay === Infinity) worstDay = 0;


        // --- Consistency (Streaks) ---
        let maxStreakInside = 0;
        let currentStreakInside = 0;
        let maxStreakOutside = 0;
        let currentStreakOutside = 0;

        trades.forEach(t => {
            if (!t.is_outside_plan) {
                currentStreakInside++;
                currentStreakOutside = 0;
                if (currentStreakInside > maxStreakInside) maxStreakInside = currentStreakInside;
            } else {
                currentStreakOutside++;
                currentStreakInside = 0;
                if (currentStreakOutside > maxStreakOutside) maxStreakOutside = currentStreakOutside;
            }
        });

        return {
            volume: { total_trades: totalTrades, wins, losses, breakeven },
            discipline: {
                inside_plan_count: insidePlan.length,
                outside_plan_count: outsidePlan.length,
                inside_plan_pct: insidePlanPct,
                days_breaking_plan: daysBreaking,
                days_respecting_plan: daysRespecting
            },
            risk: { avg_rr: avgRR, avg_risk: avgRisk, risk_breaches: riskBreaches },
            psychology: {
                full_compliance_count: full, partial_compliance_count: partial, none_compliance_count: none,
                pnl_full: pnlFull, pnl_partial: pnlPartial, pnl_none: pnlNone
            },
            performance: {
                win_rate: winRate, profit_factor: profitFactor, max_drawdown: maxDrawdown,
                best_day_pnl: bestDay, worst_day_pnl: worstDay, total_pnl: totalPnL
            },
            consistency: { max_streak_inside: maxStreakInside, max_streak_outside: maxStreakOutside }
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                    <Skeleton className="h-12 w-48 mb-6" />
                    <div className="grid gap-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                </main>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8 max-w-7xl">
                <h1 className="text-3xl font-bold mb-2">Reporte del Plan de Trading</h1>
                <p className="text-muted-foreground mb-8">Análisis detallado de tu ejecución y disciplina.</p>

                {/* 1. Disciplina */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-purple-500" />
                        Disciplina y Apego al Plan
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard
                            title="Trades Dentro del Plan"
                            value={`${stats.discipline.inside_plan_pct.toFixed(1)}%`}
                            subtext={`${stats.discipline.inside_plan_count} / ${stats.volume.total_trades}`}
                            icon={CheckCircle}
                            valueColor="text-green-500"
                        />
                        <StatCard
                            title="Trades Fuera del Plan"
                            value={stats.discipline.outside_plan_count}
                            subtext={`Racha máxima: ${stats.consistency.max_streak_outside}`}
                            icon={Ban}
                            valueColor="text-red-500"
                        />
                        <StatCard
                            title="Días Respetando Plan"
                            value={stats.discipline.days_respecting_plan}
                            icon={CheckCircle}
                        />
                        <StatCard
                            title="Días Rompiendo Plan"
                            value={stats.discipline.days_breaking_plan}
                            icon={XCircle}
                            valueColor="text-red-500"
                        />
                    </div>
                    {/* Barra de progreso visual */}
                    <div className="mt-4 p-4 bg-secondary/20 rounded-lg">
                        <div className="flex justify-between text-sm mb-2">
                            <span>Disciplina General</span>
                            <span>{stats.discipline.inside_plan_pct.toFixed(1)}%</span>
                        </div>
                        <Progress value={stats.discipline.inside_plan_pct} className="h-2" />
                    </div>
                </div>

                {/* 2. Performance & Riesgo */}
                <div className="mb-8 ">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        Performance y Riesgo
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <StatCard title="Win Rate" value={`${stats.performance.win_rate.toFixed(1)}%`} icon={Target} />
                        <StatCard title="Profit Factor" value={stats.performance.profit_factor.toFixed(2)} icon={Activity} />
                        <StatCard title="Drawdown Máximo" value={`$${stats.performance.max_drawdown.toFixed(2)}`} valueColor="text-red-500" icon={TrendingDown} />
                        <StatCard title="PNL Total" value={`$${stats.performance.total_pnl.toFixed(2)}`} valueColor={stats.performance.total_pnl >= 0 ? "text-[var(--profit-color)]" : "text-[var(--loss-color)]"} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="RR Promedio" value={`1:${stats.performance.win_rate > 0 ? stats.risk.avg_rr.toFixed(2) : '0'}`} icon={Activity} />
                        <StatCard title="Riesgo Promedio" value={`$${stats.risk.avg_risk.toFixed(2)}`} icon={ShieldAlert} />
                        <StatCard title="Mejor Día" value={`$${stats.performance.best_day_pnl.toFixed(2)}`} valueColor="text-[var(--profit-color)]" />
                        <StatCard title="Peor Día" value={`$${stats.performance.worst_day_pnl.toFixed(2)}`} valueColor="text-[var(--loss-color)]" />
                    </div>
                </div>

                {/* 3. Equity Curve */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Curva de Crecimiento (Equity Curve)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={equityCurve}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e1e1e', border: 'none' }}
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Balance']}
                                    />
                                    <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Psicología y Setup Compliance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="h-5 w-5 text-yellow-500" />
                                Calidad de Ejecución (Setup Compliance)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded border border-green-500/20">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>Cumple Completamente</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{stats.psychology.full_compliance_count} trades</p>
                                        <p className={`text-xs ${stats.psychology.pnl_full >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            PnL: ${stats.psychology.pnl_full.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                        <span>Cumple Parcialmente</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{stats.psychology.partial_compliance_count} trades</p>
                                        <p className={`text-xs ${stats.psychology.pnl_partial >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            PnL: ${stats.psychology.pnl_partial.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded border border-red-500/20">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="h-4 w-4 text-red-500" />
                                        <span>No Cumple (Impulsivo)</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{stats.psychology.none_compliance_count} trades</p>
                                        <p className={`text-xs ${stats.psychology.pnl_none >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            PnL: ${stats.psychology.pnl_none.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-orange-500" />
                                Consistencia
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Racha Respetando Plan</p>
                                    <p className="text-3xl font-bold text-green-500">{stats.consistency.max_streak_inside}</p>
                                    <p className="text-xs text-muted-foreground">trades seguidos</p>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 bg-secondary/30 rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Racha Rompiendo Plan</p>
                                    <p className="text-3xl font-bold text-red-500">{stats.consistency.max_streak_outside}</p>
                                    <p className="text-xs text-muted-foreground">trades seguidos</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </main>
        </div>
    );
};

export default TradingPlanReport;
