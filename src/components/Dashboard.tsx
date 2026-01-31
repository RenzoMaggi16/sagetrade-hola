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
import { format, isSameDay, parseISO } from "date-fns";

interface Trade {
  id: string;
  pnl_neto: number;
  entry_time: string;
  par: string;
  reglas_cumplidas?: boolean;
  emocion?: string;
  account_id: string; // Ensure we have this for debugging if needed, though we filter in query
}

interface Account {
  id: string;
  account_name: string;
  account_type: 'personal' | 'evaluation' | 'live';
  initial_capital: number;
}

export const Dashboard = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // 1. Fetch Accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, initial_capital')
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
  const { data: trades = [] } = useQuery({
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

  // Calculate Metrics
  const metrics = useMemo(() => {
    if (!trades.length) return null;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    const today = new Date();

    // 1. Global Stats
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.pnl_neto > 0);
    const losses = trades.filter(t => t.pnl_neto <= 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / losses.length) : 0;
    const ratio = avgLoss > 0 ? avgWin / avgLoss : avgWin;

    // 2. Daily Stats
    const dailyTrades = trades.filter(t => isSameDay(parseISO(t.entry_time), today));
    const dailyWins = dailyTrades.filter(t => t.pnl_neto > 0);
    const dailyLosses = dailyTrades.filter(t => t.pnl_neto <= 0);

    const dailyWinRate = dailyTrades.length > 0 ? (dailyWins.length / dailyTrades.length) * 100 : 0;
    const dayAvgWin = dailyWins.length > 0 ? dailyWins.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / dailyWins.length : 0;
    const dayAvgLoss = dailyLosses.length > 0 ? Math.abs(dailyLosses.reduce((sum, t) => sum + Number(t.pnl_neto), 0) / dailyLosses.length) : 0;

    // 3. Streak Logic
    let currentStreakCount = 0;
    let currentStreakType: 'win' | 'loss' | 'neutral' = 'neutral';
    let bestStreak = 0;
    let worstStreak = 0;

    let streakVal = 0;
    sortedTrades.forEach(t => {
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

    // 4. Trade Count Chart Data
    const tradeCountsByDay = new Map<string, number>();
    sortedTrades.forEach(t => {
      const dateStr = format(parseISO(t.entry_time), 'yyyy-MM-dd');
      tradeCountsByDay.set(dateStr, (tradeCountsByDay.get(dateStr) || 0) + 1);
    });

    const countChartData = Array.from(tradeCountsByDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


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
      countChartData
    };
  }, [trades]);

  // Equity Curve Data & Current Balance Calculation
  // Formula: Current Balance = SelectedAccount.InitialCapital + Sum(AllSelectedAccountTrades.PnL)
  const { equityCurveData, currentBalance } = useMemo(() => {
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);
    const initialCapital = selectedAccount?.initial_capital || 0;

    if (!trades || trades.length === 0) {
      // If no trades, balance is just initial capital
      return { equityCurveData: [], currentBalance: initialCapital };
    }

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime());
    let runningPnl = 0;

    const curve = sortedTrades.map(trade => {
      runningPnl += Number(trade.pnl_neto);
      return {
        date: new Date(trade.entry_time).toLocaleDateString(),
        cumulativePnl: runningPnl, // Display PnL relative to 0
        balance: initialCapital + runningPnl // Actual Balance
      };
    });

    return {
      equityCurveData: curve, // If we want to show balance curve, we use 'balance' prop, but EquityChart might expect cumulativePnl
      currentBalance: initialCapital + runningPnl
    };
  }, [trades, accounts, selectedAccountId]);

  // If no account is selected (loading or empty), show friendly state
  if (!selectedAccountId && !isLoadingAccounts) {
    if (accounts.length === 0) return <div className="p-4">No accounts found. Create one to get started.</div>;
  }

  return (
    <div className="space-y-4">
      <DashboardHeader
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        accounts={accounts} // Passing full account objects
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <StatCard title="Avg Win / Avg Loss" value={metrics?.ratio.toFixed(2) || '0.00'}>
          <WinLossRatioBar
            winValue={metrics?.avgWin || 0}
            lossValue={metrics?.avgLoss || 0}
            label="Average RRR"
            className="mt-4"
          />
        </StatCard>

        {/* Trade Count Card */}
        <StatCard title="Trade Count" value={metrics?.totalTrades || 0}>
          <div className="mt-2 text-xs text-muted-foreground flex justify-between mb-1">
            <span>Last 1D</span>
            <span>1W</span>
            <span>1M</span>
          </div>
          <TradeCountChart data={metrics?.countChartData || []} />
        </StatCard>

        {/* Winstreak Card */}
        <StatCard title="Streak">
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
          {/* Daily Winrate */}
          <StatCard title="Daily Winrate" value={`${metrics?.dailyWinRate.toFixed(1) || '0.0'}%`}>
            <div className="h-2 w-full bg-secondary rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-profit" style={{ width: `${metrics?.dailyWinRate || 0}%` }} />
            </div>
          </StatCard>

          {/* Day Ratio */}
          <StatCard title="Day Win / Day Loss" value={(metrics?.dayAvgWin && metrics?.dayAvgLoss) ? (metrics.dayAvgWin / metrics.dayAvgLoss).toFixed(2) : "0.00"}>
            <WinLossRatioBar
              winValue={metrics?.dayAvgWin || 0}
              lossValue={metrics?.dayAvgLoss || 0}
              label="Today's Ratio"
              className="mt-2"
            />
          </StatCard>

          {/* Balance Filtered */}
          <StatCard title="Balance" value={`$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} className="flex-grow flex flex-col">
            <div className="flex-grow min-h-[150px]">
              {/* Pass simply cumulativePnl for now to keep chart logic simple, or update EquityChart to take absolute balance */}
              <EquityChart data={equityCurveData.map(d => ({ date: d.date, cumulativePnl: d.cumulativePnl }))} />
            </div>
          </StatCard>
        </div>

        {/* Right Column: Calendar */}
        <div className="col-span-1 md:col-span-3">
          <PnLCalendar selectedAccountId={selectedAccountId} />
        </div>
      </div>
    </div>
  );
};
