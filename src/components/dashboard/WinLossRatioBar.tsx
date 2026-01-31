import { cn } from "@/lib/utils";

interface WinLossRatioBarProps {
    winValue: number;
    lossValue: number;
    label: string;
    className?: string;
}

export const WinLossRatioBar = ({
    winValue,
    lossValue,
    label,
    className
}: WinLossRatioBarProps) => {
    const total = winValue + lossValue;
    // Evitar división por cero
    const winPercentage = total > 0 ? (winValue / total) * 100 : 50;
    const lossPercentage = total > 0 ? (lossValue / total) * 100 : 50;

    return (
        <div className={cn("w-full space-y-2", className)}>
            <div className="flex justify-between items-center text-sm">
                <span className="font-medium">{winValue.toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="font-medium">{lossValue.toFixed(2)}</span>
            </div>

            <div className="h-3 w-full flex rounded-full overflow-hidden bg-secondary">
                <div
                    className="bg-profit h-full transition-all duration-500 ease-in-out"
                    style={{ width: `${winPercentage}%` }}
                />
                <div
                    className="bg-loss h-full transition-all duration-500 ease-in-out"
                    style={{ width: `${lossPercentage}%` }}
                />
            </div>
        </div>
    );
};
