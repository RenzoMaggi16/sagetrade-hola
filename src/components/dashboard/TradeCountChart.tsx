import { useState, useEffect, useId } from "react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface TradeCountChartProps {
    data: { date: string; count: number }[];
}

export const TradeCountChart = ({ data }: TradeCountChartProps) => {
    const uniqueId = useId().replace(/:/g, '');
    const gradientId = `colorCount-${uniqueId}`;

    const [chartColor, setChartColor] = useState(() => {
        if (typeof window === 'undefined') return '#03fffe';
        return getComputedStyle(document.documentElement).getPropertyValue('--chart-color').trim() || '#03fffe';
    });

    useEffect(() => {
        const root = document.documentElement;
        const update = () => {
            const color = getComputedStyle(root).getPropertyValue('--chart-color').trim();
            if (color) setChartColor(color);
        };
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['style'] });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="h-[80px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColor} stopOpacity={0.5} />
                            <stop offset="50%" stopColor={chartColor} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
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
                        stroke={chartColor}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#${gradientId})`}
                        dot={false}
                        activeDot={{ r: 4, fill: chartColor, stroke: '#fff', strokeWidth: 2 }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
