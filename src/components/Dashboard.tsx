import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CardContent } from "@/components/ui/card";
import { PnLCalendar } from "./PnLCalendar";
import EquityChart from "./EquityChart";
import { useMemo, useState, useEffect } from "react";
import { WinRateDonutChart } from "@/components/charts/WinRateDonutChart";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { StatCard } from "./dashboard/StatCard";
import { WinLossRatioBar } from "./dashboard/WinLossRatioBar";
import { StreakStats } from "./dashboard/StreakStats";
import { TradeCountChart } from "./dashboard/TradeCountChart";
import { ProfitFactorChart } from "./dashboard/ProfitFactorChart";
import { DailyPerformanceStats } from "@/components/DailyPerformanceStats";
import { TradingPlanCard } from "./dashboard/TradingPlanCard";
import { TradingPlanEditModal } from "./dashboard/TradingPlanEditModal";
import { DisciplineCard } from "./dashboard/DisciplineCard";
import { useTradingPlan } from "@/hooks/useTradingPlan";
import { useDisciplineMetrics } from "@/hooks/useDisciplineMetrics";
import { DailyPsychologyQuote } from "@/components/dashboard/DailyPsychologyQuote";
import { RiskAccountCard } from "@/components/dashboard/RiskAccountCard";
import { format, isSameDay, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

export type CalendarDisplayMode = 'dollars' | 'percentage';
import { DateRange } from "react-day-picker";

interface Trade {
  id: string;
  pnl_neto: number;
  entry_time: string;
  par: string;
  emocion?: string;
  account_id: string;
  is_outside_plan?: boolean;
}

interface Account {
  id: string;
  account_name: string;
  account_type: 'personal' | 'evaluation' | 'live';
  initial_capital: number;
  current_capital: number;
  drawdown_type?: 'fixed' | 'trailing' | null;
  drawdown_amount?: number | null;
  highest_balance?: number | null;
}

export const Dashboard = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>(() => {
    const saved = localStorage.getItem('calendar-display-mode');
    return (saved === 'percentage' ? 'percentage' : 'dollars') as CalendarDisplayMode;
  });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Trading Plan hook
  const { plan, isLoading: isLoadingPlan, savePlan, isSaving } = useTradingPlan();

  const handleDisplayModeChange = (mode: CalendarDisplayMode) => {
    setDisplayMode(mode);
    localStorage.setItem('calendar-display-mode', mode);
  };

  // 1. Fetch Accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, initial_capital, current_capital, drawdown_type, drawdown_amount, highest_balance')
        .order('created_at', { ascending: true }); // Oldest first = "First Created"

      if (error) throw error;
      return data as Account[];
    },
  });

  // 2. Set Default Account (First one)
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // 3. Fetch Trades (Filtered by selectedAccountId)
  const { data: allTrades = [] } = useQuery({
    queryKey: ["trades", selectedAccountId],
    enabled: !!selectedAccountId, // Only run if an account is selected
    queryFn: async () => {
      if (!selectedAccountId) return [];

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("account_id", selectedAccountId) // Filter by Account
        .order("entry_time", { ascending: true });

      if (error) throw error;
      return data as Trade[];
    },
  });

  // 3b. Fetch Payouts (Filtered by selectedAccountId)
  const { data: payouts = [] } = useQuery({
    queryKey: ["payouts", selectedAccountId],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      if (!selectedAccountId) return [];

      const { data, error } = await supabase
        .from("payouts")
        .select("id, payout_date, amount")
        .eq("account_id", selectedAccountId)
        .order("payout_date", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  // 4. Filter Trades by Date Range
  const filteredTrades = useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return allTrades;
    }

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);

    return allTrades.filter((trade) => {
      const tradeDate = parseISO(trade.entry_time);
      return isWithinInterval(tradeDate, { start: from, end: to });
    });
  }, [allTrades, dateRange]);

  // Make sure we use filteredTrades primarily, but sometimes we might want global context?
  // User requested "all elements should adapt to the filter".
  const trades = filteredTrades;

  // Calculate Metrics
  const metrics = useMemo(() => {
    if (!trades.length) return null;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    const today = new Date();

    // 1. Global Stats
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl_neto > 0);
    const losses = trades.filter(t => t.pnl_neto < 0); // Breakeven (0) is neutral, not a loss
    const nonBreakevenTrades = wins.length + losses.length; // Only count wins and losses for win rate
    const winRate = nonBreakevenTrades > 0 ? (wins.length / nonBreakevenTrades) * 100 : 0;

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / losses.length) : 0;
    const ratio = avgLoss > 0 ? avgWin / avgLoss : avgWin;

    // 2. Daily Stats
    const dailyTrades = trades.filter(t => isSameDay(parseISO(t.entry_time), today));
    const dailyWins = dailyTrades.filter(t => t.pnl_neto > 0);
    const dailyLosses = dailyTrades.filter(t => t.pnl_neto < 0); // Breakeven is neutral
    const dailyNonBreakeven = dailyWins.length + dailyLosses.length;

    const dailyWinRate = dailyNonBreakeven > 0 ? (dailyWins.length / dailyNonBreakeven) * 100 : 0;
    const dayAvgWin = dailyWins.length > 0 ? dailyWins.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / dailyWins.length : 0;
    const dayAvgLoss = dailyLosses.length > 0 ? Math.abs(dailyLosses.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / dailyLosses.length) : 0;

    // 3. Streak Logic (Breakeven trades are skipped - they don't affect streaks)
    let currentStreakCount = 0;
    let currentStreakType: 'win' | 'loss' | 'neutral' = 'neutral';
    let bestStreak = 0;
    let worstStreak = 0;

    let streakVal = 0;
    sortedTrades.forEach(t => {
      // Skip breakeven trades - they don't affect streaks
      if (t.pnl_neto === 0) return;

      const isWin = t.pnl_neto > 0;
      if (isWin) {
        if (streakVal >= 0) streakVal++;
        else streakVal = 1;
      } else {
        if (streakVal <= 0) streakVal--;
        else streakVal = -1;
      }
      if (streakVal > bestStreak) bestStreak = streakVal;
      if (streakVal < worstStreak) worstStreak = streakVal;
    });

    currentStreakCount = Math.abs(streakVal);
    currentStreakType = streakVal > 0 ? 'win' : streakVal < 0 ? 'loss' : 'neutral';

    // 4. Profit Factor Logic
    const grossProfit = trades.reduce((sum, t) => sum + (Number(t.pnl_neto) > 0 ? Number(t.pnl_neto) : 0), 0);
    const grossLoss = Math.abs(trades.reduce((sum, t) => sum + (Number(t.pnl_neto) < 0 ? Number(t.pnl_neto) : 0), 0));

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 100 : 0; // If loss is 0 but visible profit, big number. Can adjust visualization.


    // 5. Best Day Logic (Current Week) - THIS SHOULD PROBABLY BE BEST DAY OF THE SELECTED PERIOD IF FILTERED?
    // User asked: "si elije para que se muestren la ultima semana de operaciones... los elementos se deben ajustar a esa ultima semana"
    // So "Best Day" should be best day within the filtered range.

    // Logic below was calculating based on "Start of Current Week" always. Let's adapt it to use the full filtered range.
    // If we are filtering, we look at the filtered trades.

    const profitsByDay = new Array(7).fill(0);
    trades.forEach(t => {
      const date = parseISO(t.entry_time);
      const dayIndex = getDay(date);
      profitsByDay[dayIndex] += Number(t.pnl_neto);
    });

    let bestDayIndex = -1;
    let maxDayProfit = -Infinity;

    profitsByDay.forEach((profit, index) => {
      if (profit > maxDayProfit) {
        maxDayProfit = profit;
        bestDayIndex = index;
      }
    });

    if (maxDayProfit <= 0) {
      bestDayIndex = -1;
    }

    const bestDayName = bestDayIndex >= 0 ? format(new Date().setDate(new Date().getDate() - new Date().getDay() + bestDayIndex), 'EEEE', { locale: es }) : "N/A";
    const capital = accounts.find(a => a.id === selectedAccountId)?.initial_capital || 1;
    const bestDayPercentage = bestDayIndex >= 0 ? (maxDayProfit / capital) * 100 : 0;


    // 6. Trade Count Chart Data (Based on filtered range or Last 30 Days if no filter?)
    // If Filter is active, show chart for that range. If not, show last 30 days.

    const tradeCountsByDay = new Map<string, number>();
    sortedTrades.forEach(t => {
      const dateStr = format(parseISO(t.entry_time), 'yyyy-MM-dd');
      tradeCountsByDay.set(dateStr, (tradeCountsByDay.get(dateStr) || 0) + 1);
    });

    let intervalStart = subDays(today, 29);
    let intervalEnd = today;

    if (dateRange && dateRange.from) {
      intervalStart = dateRange.from;
      intervalEnd = dateRange.to || dateRange.from;
    }

    // Handle case where interval is small or large. eachDayOfInterval throws if start > end
    if (intervalStart > intervalEnd) intervalEnd = intervalStart;

    const chartInterval = eachDayOfInterval({
      start: intervalStart,
      end: intervalEnd
    });

    const countChartData = chartInterval.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: dateStr,
        count: tradeCountsByDay.get(dateStr) || 0
      };
    });


    return {
      totalTrades,
      winRate,
      avgWin,
      avgLoss,
      ratio,
      dailyWinRate,
      dayAvgWin,
      dayAvgLoss,
      currentStreakCount,
      currentStreakType,
      bestStreak,
      worstStreak: Math.abs(worstStreak),
      countChartData,
      grossProfit,
      grossLoss,
      profitFactor,
      bestDayName,
      bestDayPercentage,
      bestDayProfit: maxDayProfit,
      bestDayIndex
    };
  }, [trades, accounts, selectedAccountId, dateRange]); // Dependencies include dateRange now implicitly via trades, but safer to list

  // Equity Curve Data & Current Balance Calculation
  // Formula: Current Balance = SelectedAccount.InitialCapital + Sum(AllSelectedAccountTrades.PnL)
  // NOTE: Equity Curve typically shows history. If I filter to "Last Week", should equity curve show only last week's curve starting from ???
  // Usually Equity curve shows "Account Performance". If we filter to a range, usually we show the curve FOR THAT RANGE.
  // But the "Current Balance" stat usually implies "Right Now". 
  // User said: "los elementos se deben ajustar".
  // Let's make the Stats show the PnL for the period, and the Equity Curve show the curve for the period.
  // BUT "Balance" card title implies total balance. 
  // Let's keep "Current Balance" as the TOTAL account balance (using allTrades), but maybe the chart only shows the filtered period?
  // Or maybe "Balance" in this context means "Balance at end of period" vs "Balance at start".
  // Let's stick to standard behavior: filtered range affects the displayed data points.
  // For Equity Curve: We need the running balance.
  // We should calculate the running balance from the BEGINNING of time up to the start of the filter, to get the "Opening Balance" for the chart.

  const { equityCurveData, currentBalance, highWaterMark } = useMemo(() => {
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const initialCapital = selectedAccount?.initial_capital || 0;

    // We need ALL trades to calculate absolute balance
    if (!allTrades || allTrades.length === 0) {
      return { equityCurveData: [], currentBalance: initialCapital, highWaterMark: initialCapital };
    }

    const sortedAllTrades = [...allTrades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

    // Calculate PnL up to the start of the filter
    let startBalance = initialCapital;
    let filteredCurveTrades = sortedAllTrades;

    if (dateRange && dateRange.from) {
      const fromTime = startOfDay(dateRange.from).getTime();
      const toTime = dateRange.to ? endOfDay(dateRange.to).getTime() : endOfDay(dateRange.from).getTime();

      const preTrades = sortedAllTrades.filter(t => new Date(t.entry_time).getTime() < fromTime);
      const prePnL = preTrades.reduce((sum, t) => sum + Number(t.pnl_neto), 0);
      startBalance = initialCapital + prePnL;

      filteredCurveTrades = sortedAllTrades.filter(t => {
        const tTime = new Date(t.entry_time).getTime();
        return tTime >= fromTime && tTime <= toTime;
      });
    }

    let runningPnl = 0; // Relative to startBalance
    const curve = filteredCurveTrades.map(trade => {
      runningPnl += Number(trade.pnl_neto);
      return {
        date: new Date(trade.entry_time).toLocaleDateString(),
        cumulativePnl: runningPnl,
        balance: startBalance + runningPnl
      };
    });

    // Current Balance = initial + sum of ALL trades PnL - sum of ALL payouts
    const totalPnL = sortedAllTrades.reduce((sum, t) => sum + Number(t.pnl_neto), 0);
    const totalPayouts = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const computedBalance = initialCapital + totalPnL - totalPayouts;

    // High Water Mark = maximum running balance ever reached (computed from ALL trades)
    // This is the source of truth — no DB dependency.
    let hwm = initialCapital;
    let runningBalance = initialCapital;
    for (const trade of sortedAllTrades) {
      runningBalance += Number(trade.pnl_neto);
      if (runningBalance > hwm) {
        hwm = runningBalance;
      }
    }

    return {
      equityCurveData: curve,
      currentBalance: computedBalance,
      highWaterMark: hwm
    };
  }, [allTrades, payouts, accounts, selectedAccountId, dateRange]);

  // If no account is selected (loading or empty), show friendly state
  if (!selectedAccountId && !isLoadingAccounts) {
    if (accounts.length === 0) return <div className="p-4">No accounts found. Create one to get started.</div>;
  }

  // Discipline metrics
  const disciplineMetrics = useDisciplineMetrics(
    trades.map(t => ({ id: t.id, pnl_neto: t.pnl_neto, entry_time: t.entry_time, is_outside_plan: t.is_outside_plan }))
  );

  return (
    <div className="space-y-4">
      <DashboardHeader
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        accounts={accounts}
        dateRange={dateRange}
        setDateRange={setDateRange}
        displayMode={displayMode}
        setDisplayMode={handleDisplayModeChange}
      />

      <DailyPsychologyQuote />

      {/* Main Flex Layout: Metrics (left) + Trading Plan (right) */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left Column: All existing dashboard content */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Winrate Card */}
            <StatCard title="Winrate" value={`${metrics?.winRate.toFixed(2) || '0.00'}%`}>
              <div className="h-[60px] flex items-center justify-center mt-2">
                <WinRateDonutChart
                  wins={trades.filter(t => t.pnl_neto > 0).length}
                  losses={trades.filter(t => t.pnl_neto <= 0).length}
                  breakeven={0}
                  hideLegend
                />
              </div>
            </StatCard>

            {/* Ratio Card */}
            <StatCard title="Promedio de victorias / Promedio de derrotas" value={metrics?.ratio.toFixed(2) || '0.00'}>
              <WinLossRatioBar
                winValue={metrics?.avgWin || 0}
                lossValue={metrics?.avgLoss || 0}
                label="Average RR"
                className="mt-4"
              />
            </StatCard>

            {/* Trade Count Card */}
            <StatCard title="Número total de operaciones" value={metrics?.totalTrades || 0}>
              <div className="mt-2 text-xs text-muted-foreground flex justify-between mb-1">
                <span>{dateRange ? 'Inicio' : ''}</span>
                <span>{dateRange ? 'Rango' : ''}</span>
                <span>{dateRange ? 'Fin' : ''}</span>
              </div>
              <TradeCountChart data={metrics?.countChartData || []} />
            </StatCard>

            {/* Winstreak Card */}
            <StatCard title="Racha">
              <StreakStats
                currentStreak={metrics?.currentStreakCount || 0}
                bestStreak={metrics?.bestStreak || 0}
                worstStreak={metrics?.worstStreak || 0}
                type={metrics?.currentStreakType || 'neutral'}
              />
            </StatCard>
          </div>

          {/* Main Grid: Left Stats + Right Calendar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Left Column */}
            <div className="col-span-1 flex flex-col gap-4">
              {/* Risk Account Card */}
              {selectedAccountId && accounts.find(a => a.id === selectedAccountId) && (
                <RiskAccountCard
                  account={accounts.find(a => a.id === selectedAccountId)!}
                  currentBalance={currentBalance}
                  highWaterMark={highWaterMark}
                />
              )}

              {/* Profit Factor Card — improved aesthetics */}
              <StatCard title="Profit Factor" value={metrics?.profitFactor ? (metrics.profitFactor === 100 && metrics.grossLoss === 0 ? "∞" : metrics.profitFactor.toFixed(2)) : "0.00"}>
                <div className="flex flex-col items-center gap-3 mt-2">
                  {/* Chart */}
                  <div className="h-16 w-16">
                    <ProfitFactorChart
                      grossProfit={metrics?.grossProfit || 0}
                      grossLoss={metrics?.grossLoss || 0}
                    />
                  </div>
                  {/* Profit / Loss row */}
                  <div className="flex items-center justify-center gap-3 w-full">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--profit-color) 15%, transparent)' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--profit-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--profit-color)' }}>
                        ${metrics?.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md" style={{ backgroundColor: 'color-mix(in srgb, var(--loss-color) 15%, transparent)' }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--loss-color)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--loss-color)' }}>
                        -${metrics?.grossLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                      </span>
                    </div>
                  </div>
                </div>
              </StatCard>

              {/* Best Day Card — improved aesthetics */}
              <StatCard title="Mejor Día">
                <div className="flex flex-col gap-2">
                  <div className="text-2xl font-bold capitalize text-foreground tracking-tight">
                    {metrics?.bestDayIndex !== -1 ? metrics?.bestDayName : "N/A"}
                  </div>
                  <div className="flex items-center gap-3">
                    {metrics?.bestDayPercentage > 0 && (
                      <span className="inline-flex items-center px-3 py-9 rounded-full text-lg font-bold" style={{ color: 'var(--profit-color)' }}>
                        +{metrics?.bestDayPercentage?.toFixed(2)}%
                      </span>
                    )}
                    <span className="text-lg font-medium text-muted-foreground">
                      ${metrics?.bestDayProfit?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}
                    </span>
                  </div>
                </div>
              </StatCard>
            </div>

            {/* Right Column: Calendar + Daily Stats */}
            <div className="col-span-1 md:col-span-3 space-y-4">
              <PnLCalendar
                trades={trades}
                payouts={payouts}
                displayMode={displayMode}
                initialCapital={accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0}
              />
              <DailyPerformanceStats
                trades={trades}
                displayMode={displayMode}
                initialCapital={accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Trading Plan Sidebar */}
        <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 space-y-4">
          <TradingPlanCard
            plan={plan}
            isLoading={isLoadingPlan}
            onEdit={() => setIsPlanModalOpen(true)}
          />
          <DisciplineCard
            metrics={disciplineMetrics}
            hasPlan={!!plan}
          />
        </div>
      </div>

      {/* Balance Card — full width, below all content */}
      <StatCard title="Balance" value={
        displayMode === 'percentage' && (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0) > 0
          ? `${(((currentBalance - (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0)) / (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 1)) * 100).toFixed(2)}%`
          : `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
      }>
        <div className="min-h-[280px]">
          <EquityChart data={equityCurveData.map(d => ({ date: d.date, cumulativePnl: d.cumulativePnl }))} />
        </div>
      </StatCard>

      {/* Trading Plan Edit Modal */}
      <TradingPlanEditModal
        open={isPlanModalOpen}
        onOpenChange={setIsPlanModalOpen}
        plan={plan}
        onSave={savePlan}
        isSaving={isSaving}
      />
    </div>
  );
};
