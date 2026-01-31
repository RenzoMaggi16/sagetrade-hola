import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, RefreshCw, Calendar as CalendarIcon, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

interface DashboardHeaderProps {
    selectedAccountId: string | null;
    onAccountChange: (accountId: string) => void;
    accounts: { id: string; account_name: string; account_type: string }[];
}

export const DashboardHeader = ({ selectedAccountId, onAccountChange, accounts }: DashboardHeaderProps) => {
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
                    <SelectTrigger className="w-[240px] bg-card border-border/50">
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

                <div className="flex items-center bg-card border border-border/50 rounded-md px-3 py-2 text-sm gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-500" />
                    <span>01 Ene, 2024 - 31 Dic, 2024</span>
                </div>

                <Button variant="outline" size="icon" className="bg-card border-border/50 text-blue-500 border-blue-500/30">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
