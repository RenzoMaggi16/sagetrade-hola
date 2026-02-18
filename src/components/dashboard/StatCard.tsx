import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value?: string | number | React.ReactNode;
  subValue?: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const StatCard = ({
  title,
  value,
  subValue,
  children,
  className,
  headerClassName,
  contentClassName,
}: StatCardProps) => {
  return (
    <Card className={cn("bg-card border-border/50 shadow-sm", className)}>
      <CardHeader className={cn("pb-2", headerClassName)}>
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-1", contentClassName)}>
        {value && <div className="text-xl font-bold">{value}</div>}
        {subValue && (
          <p className="text-xs text-muted-foreground">{subValue}</p>
        )}
        {children}
      </CardContent>
    </Card>
  );
};
