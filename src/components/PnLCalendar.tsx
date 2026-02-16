import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isThisMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface PnLCalendarProps {
  trades: Trade[];
  payouts?: Payout[];
  displayMode?: CalendarDisplayMode;
  initialCapital?: number;
}

export const PnLCalendar = ({ trades = [], payouts = [], displayMode = 'dollars', initialCapital = 0 }: PnLCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dailyPnL, setDailyPnL] = useState<DayPnL[]>([]);

  // Internal query removed in favor of passed props

  useEffect(() => {
    // Calcular el PnL diario
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    const pnlByDay = days.map(day => {
      const dayTrades = trades.filter(trade =>
        isSameDay(new Date(trade.entry_time), day)
      );

      const totalPnL = dayTrades.reduce(
        (sum, trade) => sum + Number(trade.pnl_neto),
        0
      );

      const dayPayouts = payouts.filter(p =>
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

    setDailyPnL(pnlByDay);
  }, [trades, payouts, currentMonth]);

  const goToPreviousMonth = () => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentMonth(prevMonth);
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  };

  const hasTrade = (day: Date) => {
    const dayPnL = dailyPnL.find(d => isSameDay(d.date, day));
    return dayPnL && dayPnL.pnl !== 0;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </CardTitle>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="w-full"
          classNames={{
            head_row: "flex w-full",
            head_cell: "text-primary font-medium text-xs uppercase text-center flex-1",
            row: "flex w-full mt-2 gap-1", // Añadido gap-1 para aumentar ligeramente la separación
            cell: "flex-1 relative p-0 mx-0.2", // Añadido mx-0.5 para aumentar la separación horizontal
            day: "h-full w-full p-0 font-normal",
            day_today: "",
            day_outside: "day-outside",
          }}
          components={{
            DayContent: (props) => {
              const date = props.date;
              const dayPnL = dailyPnL.find(d => isSameDay(d.date, date));
              const hasTrades = dayPnL && dayPnL.tradeCount > 0;
              const isProfitable = hasTrades && dayPnL.pnl > 0;
              const isLoss = hasTrades && dayPnL.pnl < 0;
              const isNeutral = hasTrades && dayPnL.pnl === 0;
              const isCurrentDay = isToday(date);
              const isCurrentMonth = isThisMonth(date);
              const hasPayout = dayPnL && dayPnL.payoutAmount > 0;

              // Determinar los estilos condicionales
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
                ? (isProfitable ? 'bg-calendar-profit' : isLoss ? 'bg-calendar-loss' : 'bg-neutral-800')
                : hasPayout ? 'bg-violet-500/10' : 'bg-card';

              return (
                <div className={`rounded-md ${borderClass} relative flex items-center justify-center flex-col p-1 h-24 w-full ${bgClass}`}>
                  {/* Número del día en la esquina superior derecha */}
                  <div className="absolute top-1 right-1">
                    {isCurrentDay ? (
                      <span className="flex items-center justify-center bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs">
                        {format(date, "d")}
                      </span>
                    ) : (
                      <span className="text-xs text-primary/70">
                        {format(date, "d")}
                      </span>
                    )}
                  </div>

                  {/* Contenido del PnL */}
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    {hasTrades ? (
                      <span className={`text-sm font-medium ${isNeutral ? 'text-neutral-300' : ''}`}>
                        {displayMode === 'percentage' && initialCapital > 0
                          ? `${((dayPnL.pnl / initialCapital) * 100).toFixed(2)}%`
                          : `$${Math.abs(dayPnL.pnl).toFixed(2)}`
                        }
                      </span>
                    ) : null}
                    {hasPayout && (
                      <span className="text-[10px] font-semibold text-violet-400">
                        💸 -${dayPnL!.payoutAmount.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }
          }}
        />
      </CardContent>
    </Card>
  );
};