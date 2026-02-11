import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PsychologicalRule {
    rule: string;
    active: boolean;
}

export interface SetupRule {
    name: string;
    conditions: string[];
}

export interface MonthlyGoals {
    discipline_goal: string;
    performance_goal: string;
    consistency_goal: string;
}

export interface TradingPlan {
    id: string;
    user_id: string;
    market: string | null;
    instrument: string | null;
    trading_type: string | null;
    session: string | null;
    allowed_hours_start: string | null;
    allowed_hours_end: string | null;
    risk_per_trade: number | null;
    max_daily_risk: number | null;
    max_trades_per_day: number | null;
    min_rr: number | null;
    stop_after_consecutive_losses: number | null;
    psychological_rules: PsychologicalRule[];
    setup_rules: SetupRule[];
    monthly_goals: MonthlyGoals | null;
    created_at: string | null;
    updated_at: string | null;
}

export type TradingPlanInput = Omit<TradingPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const useTradingPlan = () => {
    const queryClient = useQueryClient();

    const { data: plan, isLoading } = useQuery({
        queryKey: ["trading-plan"],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await (supabase as any)
                .from("trading_plans")
                .select("*")
                .eq("user_id", user.id)
                .maybeSingle();

            if (error) {
                console.error("Error fetching trading plan:", error);
                return null;
            }

            return data as TradingPlan | null;
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (planData: TradingPlanInput) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No autenticado");

            const payload = {
                ...planData,
                user_id: user.id,
                updated_at: new Date().toISOString(),
            };

            if (plan?.id) {
                // Update existing
                const { data, error } = await (supabase as any)
                    .from("trading_plans")
                    .update(payload)
                    .eq("id", plan.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } else {
                // Insert new
                const { data, error } = await (supabase as any)
                    .from("trading_plans")
                    .insert(payload)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trading-plan"] });
            toast.success("Trading Plan guardado exitosamente");
        },
        onError: (err: any) => {
            toast.error("Error al guardar el plan: " + err.message);
        },
    });

    return {
        plan: plan ?? null,
        isLoading,
        savePlan: saveMutation.mutateAsync,
        isSaving: saveMutation.isPending,
    };
};
