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
  strategy_id: string | null;
}

interface Strategy {
  id: string;
  name: string;
}

const MisReglas = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
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

      // Fetch Strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (strategiesError) throw strategiesError;
      setStrategies(strategiesData || []);

      // Fetch Rules
      const { data: rulesData, error: rulesError } = await supabase
        .from("rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (rulesError) throw rulesError;
      setRules(rulesData || []);

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

      const { error } = await supabase.from("rules").insert({
        user_id: user.id,
        rule_text: newRule,
        strategy_id: strategy_id
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
      const { error } = await supabase
        .from("rules")
        .update({ rule_text: editingRule.rule_text })
        .eq("id", editingRule.id);

      if (error) throw error;

      toast({ title: "Éxito", description: "Regla actualizada" });
      setEditingRule(null);
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm("¿Eliminar esta regla?")) return;
    try {
      const { error } = await supabase.from("rules").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Éxito", description: "Regla eliminada" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  // Group rules by strategy
  const groupedRules = rules.reduce((acc, rule) => {
    const key = rule.strategy_id || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rule);
    return acc;
  }, {} as Record<string, Rule[]>);

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
            <form onSubmit={handleAddRule} className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-1/3">
                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Estrategia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Generales (Todas)</SelectItem>
                    {strategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

        {/* Strategies Lists */}
        <div className="space-y-8">
          {/* General Rules */}
          {groupedRules["general"] && groupedRules["general"].length > 0 && (
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border/50 bg-card/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="secondary">Generales</Badge>
                  Reglas Globales
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {groupedRules["general"].map((rule) => (
                  <RuleItem
                    key={rule.id}
                    rule={rule}
                    editingRule={editingRule}
                    setEditingRule={setEditingRule}
                    handleUpdateRule={handleUpdateRule}
                    handleDeleteRule={handleDeleteRule}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Strategy Specific Rules */}
          {strategies.map((strategy) => {
            const strategyRules = groupedRules[strategy.id] || [];
            if (strategyRules.length === 0) return null;

            return (
              <Card key={strategy.id} className="border-border">
                <CardHeader className="pb-3 border-b border-border/50 bg-card/50">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Estrategia</Badge>
                    {strategy.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  {strategyRules.map((rule) => (
                    <RuleItem
                      key={rule.id}
                      rule={rule}
                      editingRule={editingRule}
                      setEditingRule={setEditingRule}
                      handleUpdateRule={handleUpdateRule}
                      handleDeleteRule={handleDeleteRule}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {rules.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
              No hay reglas registradas. Comienza añadiendo una regla general o para una estrategia.
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Subcomponent for cleaner rendering
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