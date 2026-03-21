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
import { ProfitDaysTracker } from "@/components/dashboard/ProfitDaysTracker";
import { DayTradesModal } from "@/components/dashboard/DayTradesModal";
import { format, isSameDay, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, eachDayOfInterval, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

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
  profit_target?: number | null;
  funding_target_1?: number | null;
  consistency_min_profit_days?: number | null;
  consistency_withdrawal_pct?: number | null;
  evaluation_passed?: boolean;
  evaluation_passed_at?: string | null;
}

export const Dashboard = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    return localStorage.getItem('dashboard-selected-account') || null;
  });

  useEffect(() => {
    if (selectedAccountId) {
      localStorage.setItem('dashboard-selected-account', selectedAccountId);
    }
  }, [selectedAccountId]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>(() => {
    const saved = localStorage.getItem('calendar-display-mode');
    return (saved === 'percentage' ? 'percentage' : 'dollars') as CalendarDisplayMode;
  });
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Day trades modal state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalTradeIds, setDayModalTradeIds] = useState<string[]>([]);

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
        .select('id, account_name, account_type, initial_capital, current_capital, drawdown_type, drawdown_amount, highest_balance, profit_target, funding_target_1, consistency_min_profit_days, consistency_withdrawal_pct, evaluation_passed, evaluation_passed_at')
        .order('created_at', { ascending: true }); // Oldest first = "First Created"

      if (error) throw error;
      return data as Account[];
    },
  });

  // 2. Set Default Account (First one or all)
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId('all');
    } else if (selectedAccountId && selectedAccountId !== 'all' && accounts.length > 0) {
      const exists = accounts.some(a => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountId('all');
      }
    }
  }, [accounts, selectedAccountId]);

  // 3. Fetch Trades (Filtered by selectedAccountId)
  const { data: allTrades = [] } = useQuery({
    queryKey: ["trades", selectedAccountId],
    enabled: !!selectedAccountId, // Only run if an account is selected
    queryFn: async () => {
      if (!selectedAccountId) return [];

      let query = supabase.from("trades").select("*").order("entry_time", { ascending: true });
      if (selectedAccountId !== "all") {
        query = query.eq("account_id", selectedAccountId); // Filter by Account
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Trade[]).filter(t => t.entry_time);
    },
  });

  // 3b. Fetch Payouts (Filtered by selectedAccountId)
  const { data: payouts = [] } = useQuery({
    queryKey: ["payouts", selectedAccountId],
    enabled: !!selectedAccountId,
    queryFn: async () => {
      if (!selectedAccountId) return [];

      let query = supabase.from("payouts").select("id, payout_date, amount, account_id").order("payout_date", { ascending: true });
      if (selectedAccountId !== "all") {
        query = query.eq("account_id", selectedAccountId);
      }

      const { data, error } = await query;
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

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 100 : 0;


    // 5. Best Day Logic
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
    const capital = selectedAccountId === 'all'
      ? (accounts.length > 0 ? Math.max(...accounts.map(a => a.initial_capital || 0)) : 1)
      : (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 1);
    const bestDayPercentage = bestDayIndex >= 0 ? (maxDayProfit / capital) * 100 : 0;


    // 6. Trade Count Chart Data
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
  }, [trades, accounts, selectedAccountId, dateRange]);

  const { weeklySummaries, monthlyWinRate, monthlyPayout, monthlyDailyData, monthlyTotalPnl, monthlyProfitTotal, monthlyLossTotal } = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const monthlyTrades = trades.filter(t => {
      const d = parseISO(t.entry_time);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });

    // Helper: group trades by day and compute daily PnL
    const groupByDay = (tradeList: Trade[]) => {
      const dayMap = new Map<string, number>();
      tradeList.forEach(t => {
        const ds = format(parseISO(t.entry_time), 'yyyy-MM-dd');
        dayMap.set(ds, (dayMap.get(ds) || 0) + Number(t.pnl_neto));
      });
      return dayMap;
    };

    // Weekly summaries with winrate calculated per DAY
    const byWeek = new Map<string, { weekStart: Date; pnl: number; trades: Trade[] }>();
    monthlyTrades.forEach(t => {
      const d = parseISO(t.entry_time);
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const key = format(ws, 'yyyy-MM-dd');
      const cur = byWeek.get(key) || { weekStart: ws, pnl: 0, trades: [] };
      cur.pnl += Number(t.pnl_neto);
      cur.trades.push(t);
      byWeek.set(key, cur);
    });
    const weeklySummaries = Array.from(byWeek.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime()).map(w => {
      const end = endOfWeek(w.weekStart, { weekStartsOn: 0 });
      const weekDayPnls = groupByDay(w.trades);
      let weekWinDays = 0;
      let weekLossDays = 0;
      weekDayPnls.forEach(pnl => {
        if (pnl > 0) weekWinDays++;
        else if (pnl < 0) weekLossDays++;
      });
      const weekNonBE = weekWinDays + weekLossDays;
      const wr = weekNonBE > 0 ? (weekWinDays / weekNonBE) * 100 : 0;
      return {
        label: `${format(w.weekStart, 'd MMM', { locale: es })} - ${format(end, 'd MMM', { locale: es })}`,
        pnl: w.pnl,
        winRate: wr,
      };
    });

    // Monthly winrate calculated per DAY
    const monthlyDayPnls = groupByDay(monthlyTrades);
    let monthWinDays = 0;
    let monthLossDays = 0;
    monthlyDayPnls.forEach(pnl => {
      if (pnl > 0) monthWinDays++;
      else if (pnl < 0) monthLossDays++;
    });
    const monthNonBE = monthWinDays + monthLossDays;
    const monthlyWinRate = monthNonBE > 0 ? (monthWinDays / monthNonBE) * 100 : 0;

    const monthlyPayout = payouts.filter(p => {
      const d = parseISO(p.payout_date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    }).reduce((sum, p) => sum + Number(p.amount), 0);
    const dailyMap = new Map<string, number>();
    monthlyTrades.forEach(t => {
      const ds = format(parseISO(t.entry_time), 'dd/MM');
      dailyMap.set(ds, (dailyMap.get(ds) || 0) + Number(t.pnl_neto));
    });
    const monthlyDailyData = Array.from(dailyMap.entries()).map(([day, pnl]) => ({ day, pnl }));
    const monthlyTotalPnl = monthlyTrades.reduce((sum, t) => sum + Number(t.pnl_neto), 0);
    const monthlyProfitTotal = monthlyTrades.reduce((sum, t) => sum + (t.pnl_neto > 0 ? Number(t.pnl_neto) : 0), 0);
    const monthlyLossTotal = Math.abs(monthlyTrades.reduce((sum, t) => sum + (t.pnl_neto < 0 ? Number(t.pnl_neto) : 0), 0));
    return { weeklySummaries, monthlyWinRate, monthlyPayout, monthlyDailyData, monthlyTotalPnl, monthlyProfitTotal, monthlyLossTotal };
  }, [trades, payouts, calendarMonth]);
  // Equity Curve Data & Current Balance Calculation
  const { equityCurveData, currentBalance, highWaterMark } = useMemo(() => {
    let initialCapital = 0;
    if (selectedAccountId === 'all') {
      initialCapital = accounts.length > 0 ? Math.max(...accounts.map(a => a.initial_capital || 0)) : 0;
    } else {
      initialCapital = accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0;
    }

    if (!allTrades || allTrades.length === 0) {
      return { equityCurveData: [], currentBalance: initialCapital, highWaterMark: initialCapital };
    }

    const sortedAllTrades = [...allTrades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());

    // For passed accounts, filter to only post-pass trades
    const effectiveTrades = selectedAccountId === 'all'
      ? sortedAllTrades.filter(t => {
          const acc = accounts.find(a => a.id === t.account_id);
          if (acc?.evaluation_passed_at) {
            return new Date(t.entry_time).getTime() > new Date(acc.evaluation_passed_at).getTime();
          }
          return true;
        })
      : (() => {
          const passedAt = accounts.find(a => a.id === selectedAccountId)?.evaluation_passed_at;
          return passedAt
            ? sortedAllTrades.filter(t => new Date(t.entry_time).getTime() > new Date(passedAt).getTime())
            : sortedAllTrades;
        })();

    let startBalance = initialCapital;
    let filteredCurveTrades = effectiveTrades;

    if (dateRange && dateRange.from) {
      const fromTime = startOfDay(dateRange.from).getTime();
      const toTime = dateRange.to ? endOfDay(dateRange.to).getTime() : endOfDay(dateRange.from).getTime();

      const preTrades = effectiveTrades.filter(t => new Date(t.entry_time).getTime() < fromTime);
      const prePnL = preTrades.reduce((sum, t) => sum + Number(t.pnl_neto), 0);
      startBalance = initialCapital + prePnL;

      filteredCurveTrades = effectiveTrades.filter(t => {
        const tTime = new Date(t.entry_time).getTime();
        return tTime >= fromTime && tTime <= toTime;
      });
    }

    let runningPnl = 0;
    const curve = filteredCurveTrades.map(trade => {
      runningPnl += Number(trade.pnl_neto);
      return {
        date: new Date(trade.entry_time).toLocaleDateString(),
        cumulativePnl: runningPnl,
        balance: startBalance + runningPnl
      };
    });

    // Balance calculation
    let computedBalance = initialCapital;
    if (selectedAccountId === 'all') {
      const globalNetPnL = accounts.reduce((sum, acc) => {
        const passedAt = acc.evaluation_passed_at;
        const accTrades = sortedAllTrades.filter(t => t.account_id === acc.id);
        const accPayouts = payouts.filter(p => p.account_id === acc.id).reduce((s, p) => s + Number(p.amount), 0);
        
        if (passedAt) {
          const accEffectivePnL = accTrades.filter(t => new Date(t.entry_time).getTime() > new Date(passedAt).getTime()).reduce((s, t) => s + Number(t.pnl_neto), 0);
          return sum + accEffectivePnL;
        } else {
          return sum + accTrades.reduce((s, t) => s + Number(t.pnl_neto), 0) - accPayouts;
        }
      }, 0);
      computedBalance = initialCapital + globalNetPnL;
    } else {
      const passedAt = accounts.find(a => a.id === selectedAccountId)?.evaluation_passed_at;
      const effectivePnL = effectiveTrades.reduce((sum, t) => sum + Number(t.pnl_neto), 0);
      const totalPayouts = payouts.reduce((sum, p) => sum + Number(p.amount), 0);
      computedBalance = passedAt
        ? initialCapital + effectivePnL
        : initialCapital + sortedAllTrades.reduce((sum, t) => sum + Number(t.pnl_neto), 0) - totalPayouts;
    }

    // HWM calculation
    let hwm = initialCapital;
    let runningBalance = initialCapital;
    for (const trade of effectiveTrades) {
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

  // Discipline metrics - MUST be called before any conditional returns to maintain hook order
  const disciplineMetrics = useDisciplineMetrics(
    trades.map(t => ({ id: t.id, pnl_neto: t.pnl_neto, entry_time: t.entry_time, is_outside_plan: t.is_outside_plan }))
  );

  // If no account is selected (loading or empty), show friendly state
  if (!selectedAccountId && !isLoadingAccounts) {
    if (accounts.length === 0) return <div className="p-4">No accounts found. Create one to get started.</div>;
  }

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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Left Column */}
            <div className="md:col-span-1 flex flex-col gap-4 min-w-0">
              {/* Risk Account Card */}
              {selectedAccountId && accounts.find(a => a.id === selectedAccountId) && (
                <RiskAccountCard
                  account={accounts.find(a => a.id === selectedAccountId)!}
                  currentBalance={currentBalance}
                  highWaterMark={highWaterMark}
                  profitTarget={
                    (() => {
                      const acc = accounts.find(a => a.id === selectedAccountId)!;
                      return acc.account_type === 'evaluation'
                        ? (acc.funding_target_1 ?? undefined)
                        : (acc.profit_target ?? undefined);
                    })()
                  }
                />
              )}

              {/* Profit Days Tracker (for live accounts with consistency rules) */}
              {selectedAccountId && (() => {
                const acc = accounts.find(a => a.id === selectedAccountId);
                if (!acc || acc.account_type !== 'live' || !acc.consistency_min_profit_days || acc.consistency_min_profit_days <= 0) return null;
                // Only count trades AFTER account was passed AND AFTER the latest payout
                const passDateStr = acc.evaluation_passed_at
                  ? acc.evaluation_passed_at.split('T')[0]
                  : null;

                // Find latest payout for this account
                const accountPayouts = payouts.filter(p => p.account_id === acc.id);
                let lastPayoutDateStr: string | null = null;
                if (accountPayouts.length > 0) {
                  // payouts is sorted ascending, so last is most recent
                  const latestPayout = accountPayouts[accountPayouts.length - 1];
                  if (latestPayout.payout_date) {
                    lastPayoutDateStr = latestPayout.payout_date.split('T')[0];
                  }
                }

                const postPassTrades = allTrades.filter(t => {
                  if (!t.entry_time) return false;
                  const tradeDateStr = t.entry_time.split('T')[0];

                  let includeTrade = true;
                  if (passDateStr && tradeDateStr <= passDateStr) {
                    includeTrade = false;
                  }
                  if (lastPayoutDateStr && tradeDateStr <= lastPayoutDateStr) {
                    includeTrade = false;
                  }
                  return includeTrade;
                });
                return (
                  <ProfitDaysTracker
                    trades={postPassTrades.map(t => ({ pnl_neto: t.pnl_neto, entry_time: t.entry_time }))}
                    minProfitDays={acc.consistency_min_profit_days}
                    withdrawalPct={acc.consistency_withdrawal_pct || 100}
                    initialCapital={acc.initial_capital}
                    currentBalance={currentBalance}
                  />
                );
              })()}

              {/* Profit Factor Card — improved aesthetics */}
              <StatCard title="Profit Factor" value={metrics?.profitFactor ? (metrics.profitFactor === 100 && metrics.grossLoss === 0 ? "∞" : metrics.profitFactor.toFixed(2)) : "0.00"}>
                <div className="flex flex-col items-center gap-12 mt-2">
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

            </div>

            <div className="md:col-span-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-4">
                  <PnLCalendar
                    trades={trades}
                    payouts={payouts}
                    displayMode={displayMode}
                    initialCapital={selectedAccountId === 'all' ? (accounts.length > 0 ? Math.max(...accounts.map(a => a.initial_capital || 0)) : 0) : (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0)}
                    onDayClick={(date, tradeIds) => {
                      setDayModalDate(date);
                      setDayModalTradeIds(tradeIds);
                      setDayModalOpen(true);
                    }}
                    onMonthChange={(m) => setCalendarMonth(m)}
                  />
                  <DailyPerformanceStats
                    trades={trades}
                    displayMode={displayMode}
                    initialCapital={selectedAccountId === 'all' ? (accounts.length > 0 ? Math.max(...accounts.map(a => a.initial_capital || 0)) : 0) : (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0)}
                  />
                </div>
                <div className="md:col-span-1 md:min-h-[640px] flex flex-col space-y-4 min-w-0">
                  <StatCard title="PNL por Semana" className="flex-1">
                    <div className="space-y-2">
                      {weeklySummaries.map((w, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3">
                          <div className="text-sm text-muted-foreground">{w.label}</div>
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-semibold ${w.pnl >= 0 ? 'text-[var(--profit-color)]' : 'text-[var(--loss-color)]'}`}>
                              ${Math.abs(w.pnl).toFixed(2)}
                            </span>
                            <span className="text-sm font-medium">{w.winRate.toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                      {weeklySummaries.length === 0 && (
                        <div className="text-xs text-muted-foreground">Sin datos en el mes seleccionado</div>
                      )}
                    </div>
                  </StatCard>
                  <StatCard
                    title="Resumen Mensual"
                    value={<span className="text-2xl font-bold">{monthlyWinRate.toFixed(1)}%</span>}
                    subValue="Win Rate del mes"
                    className="flex-1"
                  >
                    <div className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3">
                      <span className="text-sm text-muted-foreground">Retiros</span>
                      <span className="text-base font-semibold text-violet-400">
                        ${monthlyPayout.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-3 rounded-md border border-border/30 bg-muted/10 p-2">
                      <div className="text-xs text-muted-foreground mb-1">PNL diario</div>
                      <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyDailyData}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                            <YAxis hide />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#1e1e1e', border: 'none', color: '#e5e7eb' }}
                              labelStyle={{ color: '#e5e7eb' }}
                              itemStyle={{ color: '#e5e7eb' }}
                              formatter={(value: number) => [`$${Number(value).toFixed(2)}`, 'PnL']}
                            />
                            <Bar dataKey="pnl">
                              {monthlyDailyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-md border border-border/30 p-2 text-center">
                          <div className="text-muted-foreground">Total</div>
                          <div className={`font-semibold ${monthlyTotalPnl >= 0 ? 'text-[var(--profit-color)]' : 'text-[var(--loss-color)]'}`}>
                            ${(Math.abs(monthlyTotalPnl)).toFixed(2)}
                          </div>
                        </div>
                        <div className="rounded-md border border-border/30 p-2 text-center">
                          <div className="text-muted-foreground">Profit</div>
                          <div className="font-semibold text-[var(--profit-color)]">
                            ${monthlyProfitTotal.toFixed(2)}
                          </div>
                        </div>
                        <div className="rounded-md border border-border/30 p-2 text-center">
                          <div className="text-muted-foreground">Loss</div>
                          <div className="font-semibold text-[var(--loss-color)]">
                            -${monthlyLossTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </StatCard>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Trading Plan + Balance side-by-side (full width row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        <div className="max-h-[700px] overflow-y-auto pr-2">
          <TradingPlanCard
            plan={plan}
            isLoading={isLoadingPlan}
            onEdit={() => setIsPlanModalOpen(true)}
          />
        </div>
        {(() => {
          const displayInitialCapital = selectedAccountId === 'all' 
            ? (accounts.length > 0 ? Math.max(...accounts.map(a => a.initial_capital || 0)) : 0)
            : (accounts.find(a => a.id === selectedAccountId)?.initial_capital || 0);
            
          return (
            <StatCard
              title="Balance"
              value={
                displayMode === 'percentage' && displayInitialCapital > 0
                  ? `${(((currentBalance - displayInitialCapital) / (displayInitialCapital || 1)) * 100).toFixed(2)}%`
                  : `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              }
              titleClassName="text-sm md:text-base font-semibold text-foreground text-center"
              contentClassName="flex flex-col items-center justify-center gap-4 text-center"
            >
              <div className="min-h-[500px] md:min-h-[560px] w-full">
                <EquityChart data={equityCurveData.map(d => ({ date: d.date, cumulativePnl: d.cumulativePnl }))} />
              </div>
            </StatCard>
          );
        })()}
      </div>


      {/* Trading Plan Edit Modal */}
      <TradingPlanEditModal
        open={isPlanModalOpen}
        onOpenChange={setIsPlanModalOpen}
        plan={plan}
        onSave={savePlan}
        isSaving={isSaving}
      />

      <DayTradesModal
        open={dayModalOpen}
        onOpenChange={setDayModalOpen}
        date={dayModalDate}
        accountTradeIds={dayModalTradeIds}
      />
    </div>
  );
};
