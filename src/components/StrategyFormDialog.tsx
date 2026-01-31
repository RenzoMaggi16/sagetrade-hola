import { useState, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface StrategyFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveSuccess: (newStrategy: { id: string; name: string }) => void;
}

export const StrategyFormDialog = ({
  isOpen,
  onOpenChange,
  onSaveSuccess,
}: StrategyFormDialogProps) => {
  const [strategyName, setStrategyName] = useState('');
  const [currentRuleText, setCurrentRuleText] = useState('');
  const [rulesList, setRulesList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Función interna para añadir reglas a la LISTA (solo frontend)
  const handleAddRuleToList = () => {
    if (currentRuleText.trim()) {
      setRulesList((prev) => [...prev, currentRuleText.trim()]);
      setCurrentRuleText(''); // Limpiar input
    }
  };

  // Función para borrar una regla de la LISTA (solo frontend)
  const handleRemoveRuleFromList = (indexToRemove: number) => {
    setRulesList((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // Función principal para guardar la ESTRATEGIA y sus REGLAS en Supabase
  const handleSaveStrategy = async (e: FormEvent) => {
    e.preventDefault();
    if (!strategyName.trim()) {
      toast.error("El nombre de la estrategia no puede estar vacío.");
      return;
    }
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado.");

      // 1. Insertar la ESTRATEGIA primero para obtener su ID
      const { data: strategyData, error: strategyError } = await supabase
        .from('strategies')
        .insert({
          name: strategyName,
          user_id: user.id,
        })
        .select('id, name')
        .single();

      if (strategyError) throw strategyError;
      if (!strategyData?.id) throw new Error("No se pudo crear la estrategia.");
      
      const newStrategyId = strategyData.id;

      // 2. Insertar las REGLAS (si hay alguna)
      if (rulesList.length > 0) {
        const rulesToInsert = rulesList.map(ruleText => ({
          rule_text: ruleText,
          strategy_id: newStrategyId,
          user_id: user.id,
        }));

        const { error: rulesError } = await supabase
          .from('rules')
          .insert(rulesToInsert);

        if (rulesError) throw rulesError;
      }

      // 3. Éxito
      toast.success(`Estrategia "${strategyName}" creada con ${rulesList.length} regla(s).`);
      resetFormAndClose();
      onSaveSuccess(strategyData); // Devolver la nueva estrategia

    } catch (error: any) {
      console.error("Error al guardar la estrategia:", error);
      toast.error("Error al guardar: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Resetea el formulario y cierra el modal
  const resetFormAndClose = () => {
    setStrategyName('');
    setCurrentRuleText('');
    setRulesList([]);
    onOpenChange(false); // Cierra el diálogo
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Nueva Estrategia</DialogTitle>
          <DialogDescription>
            Define el nombre de tu estrategia y añade las reglas que la componen.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSaveStrategy} className="space-y-6 py-4">
          {/* Nombre de la Estrategia */}
          <div className="space-y-2">
            <Label htmlFor="strategy-name" className="text-base font-medium">Nombre de la Estrategia *</Label>
            <Input
              id="strategy-name"
              placeholder="Ej: Scalping 1m (Londres)"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Sección de Reglas */}
          <div className="space-y-3">
            <Label htmlFor="rule-text" className="text-base font-medium">Reglas de la Estrategia</Label>
            
            {/* Input para añadir regla */}
            <div className="flex gap-2">
              <Input
                id="rule-text"
                placeholder="Ej: Rompimiento de estructura (BOS)"
                value={currentRuleText}
                onChange={(e) => setCurrentRuleText(e.target.value)}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRuleToList();
                  }
                }}
              />
              <Button 
                type="button" // Previene submit del formulario
                variant="outline" 
                size="icon"
                onClick={handleAddRuleToList}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Lista de reglas añadidas */}
            {rulesList.length > 0 && (
              <div className="space-y-2 rounded-md border p-4 max-h-[200px] overflow-y-auto">
                {rulesList.map((rule, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <span className="text-sm">{rule}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleRemoveRuleFromList(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetFormAndClose}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading || !strategyName.trim()}>
              {isLoading ? "Guardando..." : "Guardar Estrategia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StrategyFormDialog;
