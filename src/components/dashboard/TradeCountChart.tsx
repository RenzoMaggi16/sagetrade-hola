import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface TradeCountChartProps {
    data: { date: string; count: number }[];
}

export const TradeCountChart = ({ data }: TradeCountChartProps) => {
    return (
        <div className="h-[80px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#03fffe" stopOpacity={0.5} />
                            <stop offset="50%" stopColor="#03fffe" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#03fffe" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, 'dataMax + 1']} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                        labelFormatter={(label) => {
                            const date = new Date(label);
                            return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                        }}
                        formatter={(value: number) => [`${value} trades`, 'Actividad']}
                    />
                    <Area
                        type="basis"
                        dataKey="count"
                        stroke="#03fffe"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#03fffe', stroke: '#fff', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
