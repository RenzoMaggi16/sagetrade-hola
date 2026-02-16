import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProfitFactorChartProps {
    grossProfit: number;
    grossLoss: number;
}

export const ProfitFactorChart = ({ grossProfit, grossLoss }: ProfitFactorChartProps) => {
    const [profitColor, setProfitColor] = useState('#22c55e');
    const [lossColor, setLossColor] = useState('#ef4444');

    useEffect(() => {
        const root = document.documentElement;
        const update = () => {
            const pc = getComputedStyle(root).getPropertyValue('--profit-color').trim();
            const lc = getComputedStyle(root).getPropertyValue('--loss-color').trim();
            if (pc) setProfitColor(pc);
            if (lc) setLossColor(lc);
        };
        update();
        const observer = new MutationObserver(update);
        observer.observe(root, { attributes: true, attributeFilter: ['style'] });
        return () => observer.disconnect();
    }, []);

    const data = [
        { name: 'Gross Profit', value: grossProfit },
        { name: 'Gross Loss', value: grossLoss },
    ];

    const COLORS = [profitColor, lossColor];

    // If both are 0, show a gray ring
    if (grossProfit === 0 && grossLoss === 0) {
        return (
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-neutral-800" />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="65%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
