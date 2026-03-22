import { useMemo, memo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
  format,
  startOfWeek,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";
import type { CalendarDisplayMode } from "@/components/Dashboard";

interface Trade {
  id: string;
  entry_time: string;
  pnl_neto: number;
}

interface Payout {
  id: string;
  payout_date: string;
  amount: number;
}

interface DayPnL {
  date: Date;
  pnl: number;
  tradeCount: number;
  payoutAmount: number;
}

export interface MonthCardProps {
  month: Date;
  trades: Trade[];
  payouts?: Payout[];
  displayMode?: CalendarDisplayMode;
  initialCapital?: number;
  mode: "full" | "mini";
  onDayClick?: (date: Date, tradeIds: string[]) => void;
}

const DAY_LABELS_ES = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

const MonthCardComponent = ({
  month,
  trades = [],
  payouts = [],
  displayMode = "dollars",
  initialCapital = 0,
  mode,
  onDayClick,
}: MonthCardProps) => {
  // Calculate daily PnL for the month
  const dailyPnL = useMemo<DayPnL[]>(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dayTrades = trades.filter((trade) =>
        isSameDay(new Date(trade.entry_time), day)
      );
      const totalPnL = dayTrades.reduce(
        (sum, trade) => sum + Number(trade.pnl_neto),
        0
      );
      const dayPayouts = payouts.filter((p) =>
        isSameDay(new Date(p.payout_date), day)
      );
      const totalPayout = dayPayouts.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );
      return {
        date: day,
        pnl: totalPnL,
        tradeCount: dayTrades.length,
        payoutAmount: totalPayout,
      };
    });
  }, [month, trades, payouts]);

  // Build 6-row × 7-col calendar grid
  const calendarGrid = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const days = eachDayOfInterval({ start, end });

    // Find the start of the week for the first day of the month
    const weekStart = startOfWeek(start, { weekStartsOn: 0 }); // Sunday start

    const grid: (Date | null)[][] = [];
    let currentDay = weekStart;

    for (let row = 0; row < 6; row++) {
      const week: (Date | null)[] = [];
      for (let col = 0; col < 7; col++) {
        if (
          currentDay.getMonth() === month.getMonth() &&
          currentDay.getFullYear() === month.getFullYear()
        ) {
          week.push(new Date(currentDay));
        } else {
          week.push(null); // outside current month
        }
        currentDay = addDays(currentDay, 1);
      }
      // Only include rows that have at least one valid day
      if (week.some((d) => d !== null)) {
        grid.push(week);
      }
    }

    return grid;
  }, [month]);

  const getDayData = (date: Date) => {
    return dailyPnL.find((d) => isSameDay(d.date, date));
  };

  const handleDayClick = (date: Date) => {
    if (!onDayClick) return;
    const dayData = getDayData(date);
    if (dayData && dayData.tradeCount > 0) {
      const dayTradeIds = trades
        .filter((t) => isSameDay(new Date(t.entry_time), date))
        .map((t) => t.id);
      onDayClick(date, dayTradeIds);
    }
  };

  // ─── MINI MODE ───────────────────────────────────
  if (mode === "mini") {
    return (
      <div className="month-card-mini-grid">
        {/* Day headers */}
        <div className="mini-day-headers">
          {DAY_LABELS_ES.map((label) => (
            <div key={label} className="mini-day-header">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="mini-calendar-rows">
          {calendarGrid.map((week, weekIdx) => (
            <div key={weekIdx} className="mini-calendar-row">
              {week.map((day, dayIdx) => {
                if (!day) {
                  return <div key={dayIdx} className="mini-day-cell empty" />;
                }

                const dayData = getDayData(day);
                const hasTrades = dayData && dayData.tradeCount > 0;
                const isProfitable = hasTrades && dayData.pnl > 0;
                const isLoss = hasTrades && dayData.pnl < 0;
                const isNeutral = hasTrades && dayData.pnl === 0;
                const hasPayout = dayData && dayData.payoutAmount > 0;
                const isCurrentDay = isToday(day);

                let dotClass = "mini-day-cell";
                if (isProfitable) dotClass += " profit";
                else if (isLoss) dotClass += " loss";
                else if (isNeutral) dotClass += " neutral";
                else if (hasPayout) dotClass += " payout";
                if (isCurrentDay) dotClass += " today";

                return (
                  <div key={dayIdx} className={dotClass}>
                    <span className="mini-day-number">{format(day, "d")}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── FULL MODE ───────────────────────────────────
  return (
    <div className="month-card-full-grid">
      {/* Day headers */}
      <div className="full-day-headers">
        {DAY_LABELS_ES.map((label) => (
          <div key={label} className="full-day-header">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="full-calendar-rows">
        {calendarGrid.map((week, weekIdx) => (
          <div key={weekIdx} className="full-calendar-row">
            {week.map((day, dayIdx) => {
              if (!day) {
                return <div key={dayIdx} className="full-day-cell empty" />;
              }

              const dayData = getDayData(day);
              const hasTrades = dayData && dayData.tradeCount > 0;
              const isProfitable = hasTrades && dayData.pnl > 0;
              const isLoss = hasTrades && dayData.pnl < 0;
              const isNeutral = hasTrades && dayData.pnl === 0;
              const hasPayout = dayData && dayData.payoutAmount > 0;
              const isCurrentDay = isToday(day);

              // Border classes
              let borderClass = "border border-border";
              if (hasPayout && !hasTrades) {
                borderClass = "border border-violet-500";
              } else if (isProfitable) {
                borderClass = "border border-profit-custom";
              } else if (isLoss) {
                borderClass = "border border-loss-custom";
              } else if (isNeutral) {
                borderClass = "border border-neutral-500";
              }

              const bgClass = hasTrades
                ? isProfitable
                  ? "bg-calendar-profit"
                  : isLoss
                  ? "bg-calendar-loss"
                  : "bg-neutral-800"
                : hasPayout
                ? "bg-violet-500/10"
                : "bg-card";

              return (
                <div
                  key={dayIdx}
                  className={`rounded-lg ${borderClass} relative flex items-center justify-center flex-col p-0.5 md:p-1 h-14 md:h-24 w-full ${bgClass} ${
                    hasTrades
                      ? "cursor-pointer hover:scale-[1.03] hover:ring-1 hover:ring-primary/40 transition-all duration-200"
                      : "transition-all duration-200"
                  }`}
                  onClick={() => handleDayClick(day)}
                >
                  {/* Day number */}
                  <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                    {isCurrentDay ? (
                      <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-4 h-4 md:w-5 md:h-5 text-[9px] md:text-xs shadow-[0_0_8px_rgba(139,92,246,0.3)]">
                        {format(day, "d")}
                      </span>
                    ) : (
                      <span className="text-[9px] md:text-xs text-primary/70">
                        {format(day, "d")}
                      </span>
                    )}
                  </div>

                  {/* PnL content */}
                  <div className="flex flex-col items-center justify-center gap-0">
                    {hasTrades ? (
                      <span
                        className={`text-[10px] md:text-sm font-medium ${
                          isNeutral ? "text-neutral-300" : ""
                        }`}
                      >
                        {displayMode === "percentage" && initialCapital > 0
                          ? `${((dayData.pnl / initialCapital) * 100).toFixed(1)}%`
                          : `$${Math.abs(dayData.pnl).toFixed(0)}`}
                      </span>
                    ) : null}
                    {hasPayout && (
                      <span className="text-[8px] md:text-[10px] font-semibold text-violet-400">
                        💸 -${dayData!.payoutAmount.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export const MonthCard = memo(MonthCardComponent);
