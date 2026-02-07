import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, RefreshCw, Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
    selectedAccountId: string | null;
    onAccountChange: (accountId: string) => void;
    accounts: { id: string; account_name: string; account_type: string }[];
    dateRange: DateRange | undefined;
    setDateRange: (range: DateRange | undefined) => void;
}

export const DashboardHeader = ({ selectedAccountId, onAccountChange, accounts, dateRange, setDateRange }: DashboardHeaderProps) => {
    const [userName, setUserName] = useState<string>("Trader");
    const [lastSync, setLastSync] = useState<string>("Ahora mismo");

    useEffect(() => {
        // Fetch user name
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata?.first_name) {
                setUserName(user.user_metadata.first_name);
            }
        };
        getUser();

        // Simulate sync timer
        const interval = setInterval(() => {
            const seconds = Math.floor(Math.random() * 60);
            setLastSync(`hace ${seconds} segundos`);
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const handlePresetChange = (preset: string) => {
        const today = new Date();
        if (preset === "last_7_days") {
            setDateRange({ from: subDays(today, 7), to: today });
        } else if (preset === "last_30_days") {
            setDateRange({ from: subDays(today, 30), to: today });
        } else if (preset === "this_month") {
            setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
        } else if (preset === "last_month") {
            const lastMonth = subMonths(today, 1);
            setDateRange({ from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) });
        } else if (preset === "this_year") {
            setDateRange({ from: startOfYear(today), to: endOfYear(today) });
        }
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    Bienvenido <span className="text-profit-custom">{userName}</span>
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>Ultima Sinc.: {lastSync}</span>
                    <RefreshCw className="h-3 w-3" />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select
                    value={selectedAccountId || ""}
                    onValueChange={onAccountChange}
                >
                    <SelectTrigger className="w-[180px] bg-card border-border/50">
                        <SelectValue placeholder="Seleccionar Cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* All Accounts option removed as per request */}
                        {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                                {acc.account_type === 'live' ? '🏦 ' : '🧪 '}
                                {acc.account_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="outline" size="icon" className="bg-card border-border/50" asChild>
                    <Link to="/reglas">
                        <Settings className="h-4 w-4" />
                    </Link>
                </Button>

                {/* Date Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "justify-start text-left font-normal bg-card border-border/50 min-w-[240px]",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y", { locale: es })
                                )
                            ) : (
                                <span>Filtrar por fecha</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <div className="flex">
                            <div className="p-2 border-r border-border space-y-2 min-w-[140px]">
                                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Predefinidos</div>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handlePresetChange("last_7_days")}>Últimos 7 días</Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handlePresetChange("last_30_days")}>Últimos 30 días</Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handlePresetChange("this_month")}>Este mes</Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handlePresetChange("last_month")}>Mes pasado</Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => handlePresetChange("this_year")}>Este año</Button>
                                <div className="border-t border-border my-2"></div>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-destructive hover:text-destructive" onClick={() => setDateRange(undefined)}>
                                    <X className="mr-2 h-3 w-3" /> Limpiar filtro
                                </Button>
                            </div>
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                                locale={es}
                            />
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Filter Icon button kept for UI consistency or future features */}
                {/* <Button variant="outline" size="icon" className="bg-card border-border/50 text-blue-500 border-blue-500/30">
                    <Filter className="h-4 w-4" />
                </Button> */}
            </div>
        </div>
    );
};
