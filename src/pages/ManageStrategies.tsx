import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Save, X, LineChart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Strategy {
  id: string;
  name: string;
}

interface Rule {
  id: string;
  rule_text: string;
  strategy_id: string;
}

export default function ManageStrategies() {
  // Estados principales
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [rulesForSelectedStrategy, setRulesForSelectedStrategy] = useState<Rule[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(true);
  const [isLoadingRules, setIsLoadingRules] = useState(false);

  // Estados para inputs
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newRuleText, setNewRuleText] = useState('');
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { toast } = useToast();

  // Cargar estrategias al iniciar
  useEffect(() => {
    fetchStrategies();
  }, []);

  // Función para obtener las estrategias del usuario
  const fetchStrategies = async () => {
    try {
      setIsLoadingStrategies(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para ver tus estrategias",
          variant: "destructive",
        });
        return;
      }

      // @ts-ignore
      const { data, error } = await supabase
        .from("strategies")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;

      setStrategies((data || []) as any[]);

      // Si hay estrategias, seleccionar la primera por defecto
      if (data && data.length > 0) {
        setSelectedStrategy(data[0]);
        fetchRulesForStrategy(data[0].id);
      }
    } catch (error) {
      console.error("Error al cargar las estrategias:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus estrategias",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStrategies(false);
    }
  };

  // Función para obtener las reglas de una estrategia
  const fetchRulesForStrategy = async (strategyId: string) => {
    try {
      setIsLoadingRules(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // @ts-ignore
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .eq("user_id", user.id)
        .eq("strategy_id", strategyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRulesForSelectedStrategy((data || []) as any[]);
    } catch (error) {
      console.error("Error al cargar las reglas:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reglas para esta estrategia",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRules(false);
    }
  };

  // Función para crear una nueva estrategia
  const handleCreateStrategy = async () => {
    if (!newStrategyName.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la estrategia no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para crear estrategias",
          variant: "destructive",
        });
        return;
      }

      // @ts-ignore
      const { data, error } = await supabase
        .from("strategies")
        .insert({
          user_id: user.id,
          name: newStrategyName,
        })
        .select();

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Estrategia creada correctamente",
      });

      setNewStrategyName('');
      setIsDialogOpen(false);

      // Actualizar la lista de estrategias
      fetchStrategies();
    } catch (error) {
      console.error("Error al crear la estrategia:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la estrategia",
        variant: "destructive",
      });
    }
  };

  // Función para añadir una nueva regla
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newRuleText.trim() || !selectedStrategy) {
      toast({
        title: "Error",
        description: "La regla no puede estar vacía y debes seleccionar una estrategia",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "Debes iniciar sesión para añadir reglas",
          variant: "destructive",
        });
        return;
      }

      // @ts-ignore
      const { data, error } = await supabase
        .from("rules")
        .insert({
          user_id: user.id,
          rule_text: newRuleText,
          strategy_id: selectedStrategy.id,
        })
        .select();

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("No se pudo crear la regla.");

      toast({
        title: "Éxito",
        description: "Regla añadida correctamente",
      });

      setNewRuleText('');

      // Actualizar la lista de reglas
      fetchRulesForStrategy(selectedStrategy.id);
    } catch (error: any) {
      console.error("Error al añadir la regla:", error);
      toast({
        title: "Error",
        description: "No se pudo añadir la regla: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Función para actualizar una regla
  const handleUpdateRule = async () => {
    if (!editingRule || !editingRule.rule_text.trim()) {
      toast({
        title: "Error",
        description: "La regla no puede estar vacía",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      console.log("Intentando actualizar regla:", {
        ruleId: editingRule.id,
        userId: user.id,
        newText: editingRule.rule_text
      });

      // PROBE: Check if rule exists and is visible
      // @ts-ignore
      const { data: probeData, error: probeError } = await supabase
        .from("rules")
        .select("*")
        .eq("id", editingRule.id)
        .maybeSingle();

      if (probeError) {
        console.error("Error en PROBE (lectura previa):", probeError);
        throw new Error("Error al verificar existencia de la regla: " + probeError.message);
      }

      if (!probeData) {
        console.error("PROBE falló: La regla no se encontró con este ID (posible bloqueo RLS SELECT).");
        throw new Error("La regla no se encuentra o no tienes permisos para verla.");
      }

      console.log("PROBE exitoso. Regla encontrada:", probeData);

      // PERFORM UPDATE
      // @ts-ignore
      const { data, error } = await supabase
        .from("rules")
        .update({ rule_text: editingRule.rule_text })
        .eq("id", editingRule.id)
        .select();

      console.log("Resultado actualización:", { data, error });

      if (error) throw error;

      // Check if rows were affected
      if (!data || data.length === 0) {
        console.error("Update falló: Operación exitosa en SQL pero 0 filas afectadas. Posible bloqueo RLS UPDATE.");
        throw new Error("No se pudo actualizar la regla. Tienes permiso de lectura pero NO de escritura (RLS Policy).");
      }

      toast({
        title: "Éxito",
        description: "Regla actualizada correctamente",
      });

      setEditingRule(null);

      // Actualizar la lista de reglas
      if (selectedStrategy) {
        fetchRulesForStrategy(selectedStrategy.id);
      }
    } catch (error: any) {
      console.error("Error al actualizar la regla:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la regla: " + error.message,
        variant: "destructive",
      });
    }
  };

  // Función para eliminar una regla
  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar esta regla?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      console.log("Intentando eliminar regla:", { ruleId, userId: user.id });

      // PROBE: Check if rule exists and is visible
      // @ts-ignore
      const { data: probeData, error: probeError } = await supabase
        .from("rules")
        .select("*")
        .eq("id", ruleId)
        .maybeSingle();

      if (probeError) {
        console.error("Error en PROBE (lectura previa):", probeError);
        throw new Error("Error al verificar existencia de la regla: " + probeError.message);
      }

      if (!probeData) {
        console.error("PROBE falló: La regla no se encontró con este ID (posible bloqueo RLS SELECT).");
        throw new Error("La regla no se encuentra o no tienes permisos para verla.");
      }

      console.log("PROBE exitoso. Regla encontrada:", probeData);

      // PERFORM DELETE
      // @ts-ignore
      const { data, error } = await supabase
        .from("rules")
        .delete()
        .eq("id", ruleId)
        .select();

      console.log("Resultado eliminación:", { data, error });

      if (error) throw error;

      // Check if rows were affected
      if (!data || data.length === 0) {
        console.error("Delete falló: Operación exitosa en SQL pero 0 filas afectadas. Posible bloqueo RLS DELETE.");
        throw new Error("No se pudo eliminar la regla. Tienes permiso de lectura pero NO de eliminación (RLS Policy).");
      }

      toast({
        title: "Éxito",
        description: "Regla eliminada correctamente",
      });

      // Actualizar la lista de reglas
      if (selectedStrategy) {
        fetchRulesForStrategy(selectedStrategy.id);
      }
    } catch (error: any) {
      console.error("Error al eliminar la regla:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la regla: " + error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Gestionar Estrategias</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna Izquierda: Estrategias */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Mis Estrategias</CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Estrategia
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Estrategia</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Nombre de la estrategia"
                      value={newStrategyName}
                      onChange={(e) => setNewStrategyName(e.target.value)}
                    />
                    <Button onClick={handleCreateStrategy}>Crear Estrategia</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoadingStrategies ? (
                <p>Cargando estrategias...</p>
              ) : strategies.length === 0 ? (
                <p className="text-muted-foreground">No tienes estrategias creadas. Crea una para comenzar.</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {strategies.map((strategy) => (
                      <div
                        key={strategy.id}
                        className={`p-3 rounded-md transition-colors ${selectedStrategy?.id === strategy.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span
                            className="cursor-pointer flex-1 mr-2"
                            onClick={() => {
                              setSelectedStrategy(strategy);
                              fetchRulesForStrategy(strategy.id);
                            }}
                          >
                            {strategy.name}
                          </span>

                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Columna Derecha: Reglas */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedStrategy
                  ? `Reglas de la Estrategia: ${selectedStrategy.name}`
                  : "Selecciona una estrategia"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedStrategy ? (
                <>
                  <form onSubmit={handleAddRule} className="flex space-x-2 mb-4">
                    <Input
                      placeholder="Nueva regla"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                    />
                    <Button type="submit">
                      <Plus className="mr-2 h-4 w-4" />
                      Añadir Regla
                    </Button>
                  </form>
                  <Separator className="my-4" />
                  {isLoadingRules ? (
                    <p>Cargando reglas...</p>
                  ) : rulesForSelectedStrategy.length === 0 ? (
                    <p className="text-muted-foreground">No hay reglas para esta estrategia. Añade una para comenzar.</p>
                  ) : (
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-4">
                        {rulesForSelectedStrategy.map((rule) => (
                          <div key={rule.id} className="bg-muted p-3 rounded-md">
                            {editingRule?.id === rule.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingRule.rule_text}
                                  onChange={(e) =>
                                    setEditingRule({
                                      ...editingRule,
                                      rule_text: e.target.value,
                                    })
                                  }
                                />
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={handleUpdateRule}
                                  >
                                    <Save className="mr-2 h-4 w-4" />
                                    Guardar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingRule(null)}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <p className="flex-1">{rule.rule_text}</p>
                                <div className="flex space-x-1 ml-2">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setEditingRule(rule)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteRule(rule.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">
                  Selecciona una estrategia para ver o añadir reglas.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}