import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Save, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Rule {
  id: string;
  rule_text: string;
  descripcion: string | null;
  user_id: string;
}


const MisReglas = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  /* const [strategies, setStrategies] = useState<Strategy[]>([]); */
  const [loading, setLoading] = useState(true);

  // New Rule State
  const [newRule, setNewRule] = useState("");
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("general");

  // Edit Rule State
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
        return;
      }

      // Strategies fetching removed as table does not exist


      // Fetch Rules
      // @ts-ignore
      const { data: rulesData, error: rulesError } = await supabase
        .from("rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (rulesError) throw rulesError;
      setRules((rulesData || []) as any);

    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Error al cargar datos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const strategy_id = selectedStrategyId === "general" ? null : selectedStrategyId;

      // @ts-ignore
      const { error } = await supabase.from("rules").insert({
        user_id: user.id,
        rule_text: newRule,
        descripcion: null
      });

      if (error) throw error;

      toast({ title: "Éxito", description: "Regla añadida correctamente" });
      setNewRule("");
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo añadir la regla", variant: "destructive" });
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule || !editingRule.rule_text.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // @ts-ignore
      const { data, error } = await supabase
        .from("rules")
        .update({ rule_text: editingRule.rule_text })
        .eq("id", editingRule.id)
        .eq("user_id", user.id) // Security check
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo actualizar la regla (permisos o no existe)");

      toast({ title: "Éxito", description: "Regla actualizada" });
      setEditingRule(null);
      fetchData();
    } catch (error: any) {
      console.error("Update error:", error);
      toast({ title: "Error", description: "No se pudo actualizar: " + error.message, variant: "destructive" });
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("¿Eliminar esta regla?")) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // @ts-ignore
      const { data, error } = await supabase
        .from("rules")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id) // Security check
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo eliminar la regla (permisos o no existe)");

      toast({ title: "Éxito", description: "Regla eliminada" });
      fetchData();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({ title: "Error", description: "No se pudo eliminar: " + error.message, variant: "destructive" });
    }
  };

  // Group rules logic removed


  if (loading) return <p className="text-center py-8">Cargando reglas...</p>;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Link to="/" className="back-button mb-4 inline-block hover:underline">
          &larr; Volver al Dashboard
        </Link>

        {/* Add Rule Section */}
        <Card className="mb-8 border-border">
          <CardHeader>
            <CardTitle>Añadir Nueva Regla</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRule} className="flex gap-4">
              <Input
                placeholder="Descripción de la regla..."
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">
                <Plus className="mr-2 h-4 w-4" /> Añadir
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Rules List */}
        <div className="space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-card/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="secondary">Mis Reglas</Badge>
                {rules.length > 0 && `(${rules.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {rules.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
                  No hay reglas registradas.
                </div>
              ) : (
                rules.map((rule) => (
                  <RuleItem
                    key={rule.id}
                    rule={rule}
                    editingRule={editingRule}
                    setEditingRule={setEditingRule}
                    handleUpdateRule={handleUpdateRule}
                    handleDeleteRule={handleDeleteRule}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

// Subcomponent for cleaner rendering
// Subcomponent for cleaner rendering - MOVED OUTSIDE
const RuleItem = ({ rule, editingRule, setEditingRule, handleUpdateRule, handleDeleteRule }: any) => {
  if (editingRule?.id === rule.id) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
        <Input
          value={editingRule.rule_text}
          onChange={(e) => setEditingRule({ ...editingRule, rule_text: e.target.value })}
          className="flex-1"
          autoFocus
        />
        <Button size="sm" onClick={handleUpdateRule}><Save className="h-4 w-4" /></Button>
        <Button size="sm" variant="ghost" onClick={() => setEditingRule(null)}><X className="h-4 w-4" /></Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-md border border-transparent hover:border-border hover:bg-muted/30 transition-all group">
      <span className="text-sm md:text-base">{rule.rule_text}</span>
      <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingRule(rule)}>
          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteRule(rule.id)}>
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
};


export default MisReglas;