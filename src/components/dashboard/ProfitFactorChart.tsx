import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ProfitFactorChartProps {
    grossProfit: number;
    grossLoss: number;
}

// Helper to calculate percentages for the donut chunks
// to visually represent the ratio.
// If actual values are used directly, the pie chart works automatically.

const getCssVariableValue = (variableName: string) => {
    if (typeof window === 'undefined') return '#888888';
    return getComputedStyle(document.documentElement).getPropertyValue(variableName).trim() || '#888888';
};

export const ProfitFactorChart = ({ grossProfit, grossLoss }: ProfitFactorChartProps) => {
    const profitColor = getCssVariableValue('--profit-color') || '#22c55e';
    const lossColor = getCssVariableValue('--loss-color') || '#ef4444';

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
