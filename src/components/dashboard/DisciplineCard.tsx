import { Card, CardContent } from "@/components/ui/card";
import { Flame, Calendar, Zap } from "lucide-react";
import { DisciplineMetrics } from "@/hooks/useDisciplineMetrics";

interface DisciplineCardProps {
    metrics: DisciplineMetrics;
    hasPlan: boolean;
}

export const DisciplineCard = ({ metrics, hasPlan }: DisciplineCardProps) => {
    if (!hasPlan) {
        return (
            <Card className="border-border bg-card/80 backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Flame className="h-5 w-5 text-orange-400" />
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Disciplina</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Crea un Trading Plan para ver métricas de disciplina.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-5 w-5 text-orange-400" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Disciplina</h3>
                </div>
                <div className="space-y-3">
                    {/* Trades inside plan */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Trades dentro del plan</span>
                        <span className={`text-lg font-bold ${metrics.tradesInsidePlanPercent >= 80 ? 'text-profit' : metrics.tradesInsidePlanPercent >= 50 ? 'text-yellow-400' : 'text-loss'}`}>
                            {metrics.tradesInsidePlanPercent.toFixed(0)}%
                        </span>
                    </div>

                    {/* Days respecting plan */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Días respetando plan
                        </span>
                        <span className="text-lg font-bold text-foreground">
                            {metrics.daysRespectingPlan}
                        </span>
                    </div>

                    {/* Current streak */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Racha actual
                        </span>
                        <span className="text-lg font-bold text-primary">
                            {metrics.currentDisciplineStreak} {metrics.currentDisciplineStreak === 1 ? 'día' : 'días'}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
