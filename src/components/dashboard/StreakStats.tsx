import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakStatsProps {
    currentStreak: number;
    bestStreak: number;
    worstStreak: number;
    type: 'win' | 'loss' | 'neutral';
}

export const StreakStats = ({
    currentStreak,
    bestStreak,
    worstStreak,
    type
}: StreakStatsProps) => {
    return (
        <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-center">
                <span className="text-4xl font-bold flex items-center gap-2">
                    {currentStreak}
                    <Flame
                        className={cn(
                            "h-8 w-8",
                            type === 'win' ? "text-profit" : type === 'loss' ? "text-loss" : "text-muted-foreground"
                        )}
                        fill="currentColor"
                    />
                </span>
                <span className="text-xs text-muted-foreground mt-1">
                    {type === 'win' ? 'Racha de victorias' : type === 'loss' ? 'Racha de pérdidas' : 'Racha'}
                </span>
            </div>

            <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="bg-profit/20 text-profit px-2 py-0.5 rounded text-xs font-bold">
                        {bestStreak}
                    </span>
                    <span className="text-xs text-muted-foreground">Racha profit</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-loss/20 text-loss px-2 py-0.5 rounded text-xs font-bold">
                        {worstStreak}
                    </span>
                    <span className="text-xs text-muted-foreground">Racha perdidas</span>
                </div>
            </div>
        </div>
    );
};
