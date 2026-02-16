import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { Dashboard } from "@/components/Dashboard";
import { TradeForm } from "@/components/TradeForm";
import { TradesTable } from "@/components/TradesTable";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Plus, Table, FileBarChart, Banknote } from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import { PayoutForm } from "@/components/PayoutForm";

const Index = () => {
  const { hash } = useLocation();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Quita el '#' del hash, o usa 'dashboard' como default
  const activeTab = hash ? hash.replace('#', '') : 'dashboard';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xl mx-auto grid-cols-5 bg-transparent border border-border/50 backdrop-blur-sm">
            <TabsTrigger value="dashboard" asChild className="gap-2">
              <Link to="/#dashboard">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Link>
            </TabsTrigger>
            <TabsTrigger value="add" asChild className="gap-2">
              <Link to="/#add">
                <Plus className="h-4 w-4" />
                Nueva
              </Link>
            </TabsTrigger>
            <TabsTrigger value="trades" asChild className="gap-2">
              <Link to="/#trades">
                <Table className="h-4 w-4" />
                Trades
              </Link>
            </TabsTrigger>
            <TabsTrigger value="reportes" asChild className="gap-2">
              <Link to="/reportes">
                <span className="inline-flex items-center gap-2"><FileBarChart className="h-4 w-4" /> Reportes</span>
              </Link>
            </TabsTrigger>
            <TabsTrigger value="payout" asChild className="gap-2">
              <Link to="/#payout">
                <Banknote className="h-4 w-4" />
                Retiro
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <Dashboard />
          </TabsContent>

          <TabsContent value="add">
            <div className="max-w-2xl mx-auto">
              <TradeForm />
            </div>
          </TabsContent>

          <TabsContent value="trades">
            <TradesTable />
          </TabsContent>

          <TabsContent value="payout">
            <div className="max-w-2xl mx-auto">
              <PayoutForm />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
