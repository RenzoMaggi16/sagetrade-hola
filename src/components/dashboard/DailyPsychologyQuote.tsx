import { useQuery } from "@tanstack/react-query";
import { Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { startOfDay, differenceInDays } from "date-fns";

export const DailyPsychologyQuote = () => {
    const { data: messages = [] } = useQuery({
        queryKey: ["daily-psychology-messages"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("daily_psychology_messages" as any)
                .select("message")
                .order("created_at", { ascending: true }); // Ensure deterministic order

            if (error) {
                console.error("Error fetching psychology messages:", error);
                return [];
            }
            return data;
        },
        staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    });

    const messageOfTheDay = useMemo(() => {
        if (!messages.length) return null;

        // Use day of year to select a message deterministically
        const startOfYear = new Date(new Date().getFullYear(), 0, 0);
        const diff = differenceInDays(startOfDay(new Date()), startOfYear);
        const dayOfYear = Math.floor(diff);

        // Rotate through messages
        const index = dayOfYear % messages.length;
        return messages[index]?.message;
    }, [messages]);

    if (!messageOfTheDay) return null;

    return (
        <Card className="bg-primary/5 border-primary/20 shadow-sm mb-6">
            <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                <div className="flex-shrink-0 p-3 bg-background rounded-full border border-primary/20 shadow-sm">
                    <Brain className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="flex-1">
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                        Mensaje del día
                    </h3>
                    <p className="text-base sm:text-lg font-medium text-foreground italic">
                        "{messageOfTheDay}"
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
