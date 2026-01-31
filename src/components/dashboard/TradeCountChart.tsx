import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface TradeCountChartProps {
    data: { date: string; count: number }[];
}

export const TradeCountChart = ({ data }: TradeCountChartProps) => {
    return (
        <div className="h-[50px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--chart-color)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--chart-color)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="count"
                        stroke="var(--chart-color)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
