import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value?: string | number | React.ReactNode;
  subValue?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  animationDelay?: number;
}

export const StatCard = ({
  title,
  value,
  subValue,
  children,
  className,
  headerClassName,
  titleClassName,
  contentClassName,
  animationDelay = 0,
}: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: animationDelay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg h-full",
        className
      )}>
        {/* Subtle gradient accent line at top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
        
        <CardHeader className={cn("pb-2", headerClassName)}>
          <CardTitle className={titleClassName || "text-xs font-medium text-muted-foreground uppercase tracking-wider"}>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-1", contentClassName)}>
          {value && <div className="text-2xl font-bold tracking-tight">{value}</div>}
          {subValue && (
            <p className="text-xs text-muted-foreground">{subValue}</p>
          )}
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};
