import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthCard } from "./MonthCard";
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

interface YearViewProps {
  baseDate: Date;
  trades: Trade[];
  payouts?: Payout[];
  displayMode?: CalendarDisplayMode;
  initialCapital?: number;
  onMonthSelect: (month: Date) => void;
  onNavigate: (direction: -1 | 1) => void;
  onDayClick?: (date: Date, tradeIds: string[]) => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export const YearView = ({
  baseDate,
  trades = [],
  payouts = [],
  displayMode = "dollars",
  initialCapital = 0,
  onMonthSelect,
  onNavigate,
  onDayClick,
}: YearViewProps) => {
  const [slideDirection, setSlideDirection] = useState(1);

  // Generate 4 consecutive months from baseDate
  const months = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => addMonths(baseDate, i));
  }, [baseDate]);

  // Build label from month range, e.g. "Ene – Abr 2026" or "Nov 2025 – Feb 2026"
  const headerLabel = useMemo(() => {
    const first = months[0];
    const last = months[3];
    const firstLabel = format(first, "MMM", { locale: es });
    const lastLabel = format(last, "MMM", { locale: es });

    if (first.getFullYear() === last.getFullYear()) {
      return `${firstLabel} – ${lastLabel} ${first.getFullYear()}`;
    }
    return `${firstLabel} ${first.getFullYear()} – ${lastLabel} ${last.getFullYear()}`;
  }, [months]);

  // Animation key from baseDate
  const animKey = `${baseDate.getFullYear()}-${baseDate.getMonth()}`;

  const handleNavigate = (dir: -1 | 1) => {
    setSlideDirection(dir);
    onNavigate(dir);
  };

  return (
    <div className="year-view-container">
      {/* Header */}
      <div className="year-view-header">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleNavigate(-1)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="year-view-title">
          <span className="text-lg font-medium text-foreground capitalize">
            {headerLabel}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => handleNavigate(1)}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 2x2 Grid */}
      <AnimatePresence mode="wait" custom={slideDirection}>
        <motion.div
          key={animKey}
          custom={slideDirection}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="year-view-grid"
        >
          {months.map((monthDate) => (
            <motion.div
              key={`${monthDate.getFullYear()}-${monthDate.getMonth()}`}
              className="year-view-month-card"
              onClick={() => onMonthSelect(monthDate)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {/* Month label */}
              <div className="month-card-label">
                {format(monthDate, "MMMM yyyy", { locale: es })}
              </div>

              {/* Mini calendar */}
              <MonthCard
                month={monthDate}
                trades={trades}
                payouts={payouts}
                displayMode={displayMode}
                initialCapital={initialCapital}
                mode="mini"
              />
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
