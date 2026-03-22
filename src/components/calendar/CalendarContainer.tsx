import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays, Grid2x2 } from "lucide-react";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { PnLCalendar } from "@/components/PnLCalendar";
import { YearView } from "./YearView";
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

interface CalendarContainerProps {
  trades: Trade[];
  payouts?: Payout[];
  displayMode?: CalendarDisplayMode;
  initialCapital?: number;
  onDayClick?: (date: Date, tradeIds: string[]) => void;
  onMonthChange?: (date: Date) => void;
}

type ViewMode = "month" | "year";

export const CalendarContainer = ({
  trades = [],
  payouts = [],
  displayMode = "dollars",
  initialCapital = 0,
  onDayClick,
  onMonthChange,
}: CalendarContainerProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Year View base date: 1st day of the starting month for the 4-month block
  const [yearViewBaseDate, setYearViewBaseDate] = useState(() => {
    const now = new Date();
    const pageIndex = Math.floor(now.getMonth() / 4);
    return new Date(now.getFullYear(), pageIndex * 4, 1);
  });

  // Handle transitioning from Year View to Month View
  const handleMonthSelect = useCallback(
    (month: Date) => {
      setCurrentDate(month);
      setViewMode("month");
      onMonthChange?.(month);
    },
    [onMonthChange]
  );

  // Handle Year View page navigation — shifts ±4 months, crossing years naturally
  const handleYearNavigate = useCallback((direction: -1 | 1) => {
    setYearViewBaseDate((prev) => addMonths(prev, direction * 4));
  }, []);

  // Handle month change from PnLCalendar (internal navigation)
  const handleMonthViewChange = useCallback(
    (month: Date) => {
      setCurrentDate(month);
      onMonthChange?.(month);
    },
    [onMonthChange]
  );

  // Month view prev/next
  const goToPreviousMonth = useCallback(() => {
    const prev = addMonths(currentDate, -1);
    setCurrentDate(prev);
    onMonthChange?.(prev);
  }, [currentDate, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    const next = addMonths(currentDate, 1);
    setCurrentDate(next);
    onMonthChange?.(next);
  }, [currentDate, onMonthChange]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium capitalize">
          {viewMode === "month"
            ? format(currentDate, "MMMM yyyy", { locale: es })
            : `Calendario ${yearViewBaseDate.getFullYear()}`}
        </CardTitle>

        <div className="flex items-center space-x-2">
          {/* Month navigation arrows — only in Month View */}
          {viewMode === "month" && (
            <div className="flex space-x-1">
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
          )}

          {/* View Toggle */}
          <div className="view-toggle-container">
            <button
              onClick={() => setViewMode("month")}
              className={`view-toggle-btn ${viewMode === "month" ? "active" : ""}`}
              title="Vista mensual"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => {
                if (viewMode !== "year") {
                  // Snap to the 4-month block containing current month
                  const pageIndex = Math.floor(currentDate.getMonth() / 4);
                  setYearViewBaseDate(new Date(currentDate.getFullYear(), pageIndex * 4, 1));
                }
                setViewMode("year");
              }}
              className={`view-toggle-btn ${viewMode === "year" ? "active" : ""}`}
              title="Vista anual"
            >
              <Grid2x2 className="h-3.5 w-3.5" />
              <span>Año</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 md:p-2">
        <AnimatePresence mode="wait">
          {viewMode === "month" ? (
            <motion.div
              key="month-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <PnLCalendar
                trades={trades}
                payouts={payouts}
                displayMode={displayMode}
                initialCapital={initialCapital}
                onDayClick={onDayClick}
                onMonthChange={handleMonthViewChange}
                controlledMonth={currentDate}
                embedded={true}
              />
            </motion.div>
          ) : (
            <motion.div
              key="year-view"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <YearView
                baseDate={yearViewBaseDate}
                trades={trades}
                payouts={payouts}
                displayMode={displayMode}
                initialCapital={initialCapital}
                onMonthSelect={handleMonthSelect}
                onNavigate={handleYearNavigate}
                onDayClick={onDayClick}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
