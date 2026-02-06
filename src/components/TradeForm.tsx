import { useState, useEffect, ChangeEvent, FormEvent } from "react"; // Added FormEvent
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner"; // Assuming you use sonner for toasts
import { useQueryClient } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountFormDialog } from "@/components/AccountFormDialog";
import { StrategyFormDialog } from "@/components/StrategyFormDialog";

// --- Types (Define these properly if you have them elsewhere) ---
interface Strategy {
  id: string;
  name: string;
}
interface Rule {
  id: string;
  rule_text: string;
  strategy_id: string;
}
// --- End Types ---


// Lista de símbolos predefinidos
const simbolosOptions = [
  { value: "NAS100", label: "NAS100" },
  { value: "SP500", label: "SP500" },
  { value: "US30", label: "US30" },
  { value: "RTY", label: "Russell 2K" },
  { value: "XAUUSD", label: "XAUUSD" },
  { value: "EURUSD", label: "EURUSD" },
  { value: "GBPUSD", label: "GBPUSD" },
  { value: "AUDUSD", label: "AUDUSD" },
];

// Opciones para Emoción
const emocionOptions = [
  { value: "Confianza", label: "Confianza" },
  { value: "Paciencia", label: "Paciencia" },
  { value: "Euforia", label: "Euforia" },
  { value: "Neutral", label: "Neutral" },
  { value: "Ansiedad", label: "Ansiedad" },
  { value: "Miedo", label: "Miedo" },
  { value: "Frustración", label: "Frustración" },
  { value: "Venganza", label: "Venganza" },
];

interface TradeFormProps {
  tradeToEdit?: any; // Trade a editar (opcional)
  onSaveSuccess?: () => void; // Callback cuando se guarda exitosamente
}

export const TradeForm = ({ tradeToEdit, onSaveSuccess }: TradeFormProps = {}) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Estados para fecha y hora
  const [tradeDate, setTradeDate] = useState<Date | undefined>(new Date());
  const [entryTimeString, setEntryTimeString] = useState<string>('09:00:00');
  const [exitTimeString, setExitTimeString] = useState<string>('10:00:00');

  // Estados para notas y calificación
  const [preTradeNotes, setPreTradeNotes] = useState<string>('');
  const [postTradeNotes, setPostTradeNotes] = useState<string>('');
  const [setupRating, setSetupRating] = useState<string>(''); // Estado para Setup Rating

  // Estados para estrategias y reglas
  const [strategies, setStrategies] = useState<Strategy[]>([]); // Usar el tipo Strategy
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [rulesForStrategy, setRulesForStrategy] = useState<Rule[]>([]); // Usar el tipo Rule
  const [brokenRuleIds, setBrokenRuleIds] = useState<string[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Estados para cuentas
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

  // Estado para dialog de estrategia
  const [isStrategyDialogOpen, setIsStrategyDialogOpen] = useState(false);

  // Estado unificado para otros campos del formulario
  const [formData, setFormData] = useState({
    par: "", // Renombrado de simbolo
    pnl_neto: "",
    riesgo: "", // Nuevo campo, reemplaza cantidad
    emocion: "",
    trade_type: "buy" as "buy" | "sell",
    reglas_cumplidas: true, // Renombrado de broken_rules? Mejor mantenerlo simple
  });

  // Estados para URLs de imágenes de gráficos
  const [imageUrlM1, setImageUrlM1] = useState('');
  const [imageUrlM5, setImageUrlM5] = useState('');
  const [imageUrlM15, setImageUrlM15] = useState('');

  // --- Handlers ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleComboboxChange = (id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRadioChange = (value: "buy" | "sell") => {
    setFormData((prev) => ({ ...prev, trade_type: value }));
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
    // Si necesitas hacer algo específico con el checkbox 'reglas_cumplidas'
    // Aunque ahora se maneja con brokenRuleIds, mantenemos este por si acaso
    setFormData((prev) => ({ ...prev, reglas_cumplidas: !!checked }));
  };
  // --- Fin Handlers ---


  // Función para cargar estrategias (reutilizable)
  const fetchStrategies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Salir si no hay usuario

    const { data, error } = await supabase
      .from('strategies')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name'); // Ordenar por nombre

    if (error) {
      console.error("Error fetching strategies:", error);
      toast.error("No se pudieron cargar las estrategias");
    } else {
      setStrategies(data || []);
    }
  };

  // Efecto para cargar las estrategias
  useEffect(() => {
    fetchStrategies();
  }, []); // Dependencia vacía para ejecutar solo al montar

  const fetchAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('accounts')
      .select('id, account_name')
      .eq('user_id', user.id)
      .order('account_name');

    if (error) {
      console.error("Error fetching accounts:", error);
      toast.error("No se pudieron cargar las cuentas");
    } else {
      setAccounts(data || []);

      // Auto-select first account if not editing and no account selected
      if (!tradeToEdit && !selectedAccountId && data && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    }
  };

  // Efecto para cargar las cuentas del usuario
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Efecto para cargar las reglas cuando cambia la estrategia seleccionada
  useEffect(() => {
    const fetchRules = async () => {
      // 1. RESETEAR SIEMPRE las reglas rotas al cambiar de estrategia
      setBrokenRuleIds([]);

      if (!selectedStrategyId) {
        setRulesForStrategy([]); // Limpiar la lista de reglas si no hay estrategia
        return; // Salir
      }

      setLoadingRules(true); // Activar carga
      try {
        // Cargar las reglas de la NUEVA estrategia
        const { data, error } = await supabase
          .from('rules')
          .select('id, rule_text')
          .eq('strategy_id', selectedStrategyId)
          .order('created_at'); // Ordenar por creación

        if (error) throw error;

        setRulesForStrategy(data || []);

      } catch (error: any) {
        console.error("Error fetching rules:", error);
        toast.error("Error al cargar las reglas: " + error.message);
        setRulesForStrategy([]);
      } finally {
        setLoadingRules(false);
      }
    };

    fetchRules();
  }, [selectedStrategyId]); // La dependencia es correcta

  // Efecto para cargar datos del trade a editar
  useEffect(() => {
    // Función interna para cargar las reglas rotas de este trade
    const fetchBrokenRules = async (tradeId: string | number) => {
      setLoadingRules(true);
      const { data, error } = await supabase
        .from('broken_rules_by_trade')
        .select('rule_id') // Solo necesitamos los IDs
        .eq('trade_id', tradeId);

      if (error) {
        console.error("Error fetching broken rules for edit:", error);
        toast.error("Error al cargar reglas rotas: " + error.message);
        setBrokenRuleIds([]);
      } else {
        const ids = data.map((item: any) => item.rule_id);
        setBrokenRuleIds(ids);
      }
      setLoadingRules(false);
    };

    // Si estamos en modo EDICIÓN
    if (tradeToEdit) {
      // 1. Rellenar campos de formData
      setFormData({
        par: tradeToEdit.par || '',
        pnl_neto: tradeToEdit.pnl_neto?.toString() || '',
        riesgo: tradeToEdit.riesgo?.toString() || '',
        emocion: tradeToEdit.emocion || '',
        trade_type: tradeToEdit.trade_type || 'buy',
        reglas_cumplidas: true,
      });

      // 2. Rellenar estados separados (Fechas, Notas, Imágenes, Calificación)
      setTradeDate(tradeToEdit.entry_time ? new Date(tradeToEdit.entry_time) : new Date());
      setEntryTimeString(tradeToEdit.entry_time ? format(new Date(tradeToEdit.entry_time), 'HH:mm:ss') : '09:00:00');
      setExitTimeString(tradeToEdit.exit_time ? format(new Date(tradeToEdit.exit_time), 'HH:mm:ss') : '10:00:00');

      setPreTradeNotes(tradeToEdit.pre_trade_notes || '');
      setPostTradeNotes(tradeToEdit.post_trade_notes || '');
      setSetupRating(tradeToEdit.setup_rating || '');

      setImageUrlM1(tradeToEdit.image_url_m1 || '');
      setImageUrlM5(tradeToEdit.image_url_m5 || '');
      setImageUrlM15(tradeToEdit.image_url_m15 || '');

      // 3. Rellenar Dropdowns (¡LA CLAVE DEL ERROR!)
      setSelectedAccountId(tradeToEdit.account_id || null);
      setSelectedStrategyId(tradeToEdit.strategy_id || null); // Esto disparará el useEffect que carga las reglas

      // 4. Cargar reglas rotas
      if (tradeToEdit.id) {
        fetchBrokenRules(tradeToEdit.id);
      }
    } else {
      // Lógica para resetear el formulario si estamos en modo "NUEVO TRADE"
      setFormData({
        par: '',
        pnl_neto: '',
        riesgo: '',
        emocion: '',
        trade_type: 'buy',
        reglas_cumplidas: true
      });
      setTradeDate(new Date());
      setEntryTimeString('09:00:00');
      setExitTimeString('10:00:00');
      setPreTradeNotes('');
      setPostTradeNotes('');
      setSetupRating('');
      setImageUrlM1('');
      setImageUrlM5('');
      setImageUrlM15('');
      setSelectedAccountId(null);
      setSelectedStrategyId(null);
      setBrokenRuleIds([]);
    }
  }, [tradeToEdit]);

  // --- handleSubmit Corregido ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Validaciones
      if (!selectedAccountId) {
        toast.error("Debes seleccionar una cuenta.");
        setLoading(false);
        return;
      }
      if (!tradeDate || !entryTimeString || !exitTimeString) {
        toast.error("Faltan datos de fecha/hora.");
        setLoading(false);
        return;
      }

      // Combinar Fechas y Horas
      const [entryHours, entryMinutes, entrySeconds] = entryTimeString.split(':').map(Number);
      const entryTimestamp = new Date(tradeDate);
      entryTimestamp.setHours(entryHours, entryMinutes, entrySeconds || 0);

      const [exitHours, exitMinutes, exitSeconds] = exitTimeString.split(':').map(Number);
      const exitTimestamp = new Date(tradeDate);
      exitTimestamp.setHours(exitHours, exitMinutes, exitSeconds || 0);
      if (exitTimestamp < entryTimestamp) {
        exitTimestamp.setDate(exitTimestamp.getDate() + 1);
      }

      // Objeto de datos comunes (lo que se va a guardar)
      const tradeDataObject = {
        user_id: user.id,
        account_id: selectedAccountId,
        strategy_id: selectedStrategyId,
        par: formData.par.toUpperCase() || null,
        pnl_neto: formData.pnl_neto === "" ? 0 : parseFloat(formData.pnl_neto),
        riesgo: parseFloat(formData.riesgo) || null,
        trade_type: formData.trade_type,
        emocion: formData.emocion || null,
        setup_rating: setupRating || null,
        entry_time: entryTimestamp.toISOString(),
        exit_time: exitTimestamp.toISOString(),
        pre_trade_notes: preTradeNotes || null,
        post_trade_notes: postTradeNotes || null,
        image_url_m1: imageUrlM1?.trim() || null,
        image_url_m5: imageUrlM5?.trim() || null,
        image_url_m15: imageUrlM15?.trim() || null,
      };

      let tradeId: string | number; // Para guardar el ID del trade

      if (tradeToEdit) {
        // --- MODO EDICIÓN ---
        const { data: updatedTrade, error: updateError } = await supabase
          .from('trades')
          .update(tradeDataObject)
          .eq('id', tradeToEdit.id)
          .select('id') // Pedir el ID de vuelta
          .single();

        if (updateError) throw updateError;
        tradeId = updatedTrade.id;

        // 1. Borrar TODAS las reglas rotas antiguas de este trade
        const { error: deleteError } = await supabase
          .from('broken_rules_by_trade')
          .delete()
          .eq('trade_id', tradeId);

        if (deleteError) throw deleteError;

        toast.success("Trade actualizado con éxito");

      } else {
        // --- MODO CREACIÓN ---
        const { data: newTrade, error: insertError } = await supabase
          .from('trades')
          .insert(tradeDataObject)
          .select('id')
          .single();

        if (insertError) throw insertError;
        if (!newTrade?.id) throw new Error("No se pudo crear el trade.");

        tradeId = newTrade.id;

        // Actualizar Current Capital de la cuenta
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('current_capital')
          .eq('id', selectedAccountId)
          .single();

        if (accountError) throw new Error("No se pudo obtener el capital actual de la cuenta.");

        const pnlAmount = parseFloat(formData.pnl_neto);
        const newCapital = (accountData?.current_capital || 0) + pnlAmount;

        const { error: updateError } = await supabase
          .from('accounts')
          .update({ current_capital: newCapital })
          .eq('id', selectedAccountId);

        if (updateError) throw new Error("Error al actualizar el capital de la cuenta.");

        toast.success("Trade registrado con éxito");
      }

      // --- LÓGICA DE REGLAS ROTAS (PARA AMBOS MODOS) ---
      if (brokenRuleIds.length > 0) {
        const brokenRulesToInsert = brokenRuleIds.map(ruleId => ({
          trade_id: tradeId,
          rule_id: ruleId,
          user_id: user.id
        }));

        const { error: brokenRulesError } = await supabase
          .from('broken_rules_by_trade')
          .insert(brokenRulesToInsert);

        if (brokenRulesError) {
          console.error("Error guardando reglas rotas:", brokenRulesError);
          toast.error("Trade guardado, pero falló al guardar las reglas rotas.");
        }
      }

      // Éxito: Resetear formulario y refrescar datos
      queryClient.invalidateQueries({ queryKey: ["tradesList"] }); // Refresca la tabla
      queryClient.invalidateQueries({ queryKey: ["trades"] }); // Refresca la lista general
      if (tradeToEdit) {
        queryClient.invalidateQueries({ queryKey: ["trades", tradeId] }); // Refresca el detalle del trade
      }

      if (onSaveSuccess) {
        onSaveSuccess(); // Llama al callback (ej. para cerrar el modal)
      } else {
        // Si es el formulario de "Nueva", resetea los campos
        setFormData({
          par: "",
          pnl_neto: "",
          riesgo: "",
          emocion: "",
          trade_type: "buy",
          reglas_cumplidas: true,
        });
        setTradeDate(new Date());
        setEntryTimeString('09:00:00');
        setExitTimeString('10:00:00');
        setPreTradeNotes('');
        setPostTradeNotes('');
        setSetupRating('');
        setImageUrlM1('');
        setImageUrlM5('');
        setImageUrlM15('');
        setSelectedAccountId(null);
        setSelectedStrategyId(null);
        setBrokenRuleIds([]);
      }

    } catch (error: any) {
      toast.error("Error al guardar la operación: " + error.message);
      console.error("Error detallado:", error);
    } finally {
      setLoading(false);
    }
  };
  // --- Fin handleSubmit ---


  // --- JSX del Componente ---
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>{tradeToEdit ? "Editar Operación" : "Registrar Operación"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de Cuenta */}
          <div className="space-y-2">
            <Label htmlFor="account-select">Cuenta *</Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedAccountId}
                onValueChange={(value) => setSelectedAccountId(value)}
                required
              >
                <SelectTrigger id="account-select" className="flex-grow">
                  <SelectValue placeholder="Seleccionar cuenta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsAccountDialogOpen(true)}
                aria-label="Añadir nueva cuenta"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Fila Fecha y Horas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade-date">Fecha del Trade</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} id="trade-date" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tradeDate ? format(tradeDate, "PPP") : <span>Elige fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={tradeDate} onSelect={setTradeDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-time">Hora Entrada</Label>
              <Input id="entry-time" type="time" step="1" value={entryTimeString} onChange={(e) => setEntryTimeString(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit-time">Hora Salida</Label>
              <Input id="exit-time" type="time" step="1" value={exitTimeString} onChange={(e) => setExitTimeString(e.target.value)} required />
            </div>
          </div>

          {/* Fila Par y PnL Neto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="par">Par</Label>
              <Combobox
                options={simbolosOptions}
                value={formData.par}
                onChange={(value) => handleComboboxChange('par', value)}
                placeholder="Seleccionar par..."
                emptyMessage="No se encontraron pares."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pnl_neto">Resultado final del trade *</Label>
              <Input id="pnl_neto" type="number" step="0.01" placeholder="0.00" value={formData.pnl_neto} onChange={handleInputChange} required className="bg-secondary" />
            </div>
          </div>

          {/* Fila Dirección y Riesgo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dirección</Label>
              <RadioGroup value={formData.trade_type} onValueChange={handleRadioChange} className="flex space-x-4 pt-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="buy" id="buy" /><Label htmlFor="buy">Compra</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="sell" id="sell" /><Label htmlFor="sell">Venta</Label></div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="riesgo">Riesgo ($) *</Label>
              <Input id="riesgo" type="number" step="0.01" placeholder="Ej. 100" value={formData.riesgo} onChange={handleInputChange} required />
            </div>
          </div>

          {/* Fila RR Calculado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rr-calculated">RR (Calculado)</Label>
              <Input
                id="rr-calculated"
                type="text"
                value={(() => {
                  const risk = parseFloat(formData.riesgo);
                  const pnl = parseFloat(formData.pnl_neto);
                  if (risk > 0 && !isNaN(pnl)) {
                    const ratio = pnl / risk;
                    return `1 : ${ratio.toFixed(2)}`;
                  }
                  return 'N/A';
                })()}
                readOnly
                className="bg-secondary/50 border-dashed text-muted-foreground"
              />
            </div>
            <div className="space-y-2">
              {/* Campo vacío para mantener el layout */}
            </div>
          </div>

          {/* Fila Estrategia y Emoción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy-select">Estrategia Aplicada</Label>
              <div className="flex items-center gap-2">
                <Select value={selectedStrategyId || ''} onValueChange={(value) => setSelectedStrategyId(value || null)}>
                  <SelectTrigger id="strategy-select" className="bg-secondary flex-grow">
                    <SelectValue placeholder="Seleccionar estrategia..." />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsStrategyDialogOpen(true)}
                  aria-label="Añadir nueva estrategia"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emocion">Emoción</Label>
              <Combobox
                options={emocionOptions}
                value={formData.emocion}
                onChange={(value) => handleComboboxChange('emocion', value)}
                placeholder="Seleccionar emoción..."
                emptyMessage="No se encontraron emociones."
              />
            </div>
          </div>

          {/* Sección Reglas Rotas (Dinámica) */}
          {selectedStrategyId && (
            <div className="space-y-3 pt-4">
              <Label className="font-semibold text-lg">Reglas de la Estrategia (Marca las que rompiste)</Label>
              {loadingRules ? (
                <p>Cargando reglas...</p>
              ) : rulesForStrategy.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay reglas definidas para esta estrategia.</p>
              ) : (
                <div className="space-y-2 rounded-md border p-4 bg-secondary/30">
                  {rulesForStrategy.map((rule) => (
                    <div key={rule.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={`rule-${rule.id}`}
                        checked={brokenRuleIds.includes(rule.id)} // Marcar si SÍ está en la lista de rotas
                        onCheckedChange={(checked) => {
                          const isChecked = !!checked; // Asegurarse de que sea boolean
                          setBrokenRuleIds((prev) =>
                            isChecked // Si se marca (es true)
                              ? [...prev, rule.id] // Añadir a la lista de rotas
                              : prev.filter((id) => id !== rule.id) // Quitar de la lista de rotas
                          );
                        }}
                      />
                      <Label htmlFor={`rule-${rule.id}`} className="font-normal cursor-pointer leading-snug">
                        {rule.rule_text}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Calificación del Setup */}
          <div className="space-y-3 pt-4">
            <Label className="font-semibold text-lg">Calificación del Setup</Label>
            <ToggleGroup type="single" value={setupRating} onValueChange={(value) => { if (value) setSetupRating(value); }} className="grid grid-cols-5 gap-3">
              {['Malo', 'Regular', 'Aceptable', 'Bueno', 'Excelente'].map((rating) => (
                <ToggleGroupItem key={rating} value={rating} aria-label={`Calificación ${rating}`}
                  className="h-14 w-full p-2 border border-neutral-700 bg-neutral-900 text-sm md:text-base font-bold text-white data-[state=on]:bg-primary data-[state=on]:border-primary/80 data-[state=on]:text-primary-foreground hover:bg-neutral-800 transition-colors">
                  {rating}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Notas Pre y Post Trade */}
          <div className="space-y-4 pt-4 col-span-1 md:col-span-2"> {/* Ocupa todo el ancho */}
            <Label className="font-semibold text-lg">Análisis (Pre y Post Trade)</Label>
            <div className="space-y-2 p-4 rounded-lg border border-neutral-800 bg-neutral-950/50">
              <Label htmlFor="pre-trade-notes" className="text-primary font-medium">Análisis Pre-Trade</Label>
              <Textarea id="pre-trade-notes" placeholder="¿Por qué estoy tomando este trade? ¿Qué confirmaciones veo?" value={preTradeNotes} onChange={(e) => setPreTradeNotes(e.target.value)} className="bg-transparent border-0 p-0 focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 min-h-[80px]" />
            </div>
            <div className="space-y-2 p-4 rounded-lg border border-neutral-800 bg-neutral-950/50">
              <Label htmlFor="post-trade-notes" className="text-primary font-medium">Reflexión Post-Trade</Label>
              <Textarea id="post-trade-notes" placeholder="¿Qué salió bien/mal? ¿Seguí el plan? ¿Cómo me sentí?" value={postTradeNotes} onChange={(e) => setPostTradeNotes(e.target.value)} className="bg-transparent border-0 p-0 focus:ring-0 focus-visible:ring-offset-0 focus-visible:ring-0 min-h-[80px]" />
            </div>
          </div>

          {/* Sección de Enlaces de Gráficos (M1, M5, M15) */}
          <div className="space-y-2 pt-4 col-span-1 md:col-span-2">
            <Label className="font-semibold text-lg">Enlaces de Gráficos (Opcional)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* M1 */}
              <div className="space-y-1">
                <Label htmlFor="image_url_m1" className="text-sm">M1</Label>
                <Input
                  id="image_url_m1"
                  type="url"
                  placeholder="Pegar enlace a la imagen M1..."
                  value={imageUrlM1}
                  onChange={(e) => setImageUrlM1(e.target.value)}
                  className="bg-secondary"
                />
              </div>
              {/* M5 */}
              <div className="space-y-1">
                <Label htmlFor="image_url_m5" className="text-sm">M5</Label>
                <Input
                  id="image_url_m5"
                  type="url"
                  placeholder="Pegar enlace a la imagen M5..."
                  value={imageUrlM5}
                  onChange={(e) => setImageUrlM5(e.target.value)}
                  className="bg-secondary"
                />
              </div>
              {/* M15 */}
              <div className="space-y-1">
                <Label htmlFor="image_url_m15" className="text-sm">M15</Label>
                <Input
                  id="image_url_m15"
                  type="url"
                  placeholder="Pegar enlace a la imagen M15..."
                  value={imageUrlM15}
                  onChange={(e) => setImageUrlM15(e.target.value)}
                  className="bg-secondary"
                />
              </div>
            </div>
          </div>

          {/* Botón de Enviar */}
          <Button type="submit" className="w-full text-lg py-6 mt-6" disabled={loading}>
            {loading ? "Guardando..." : (tradeToEdit ? "Actualizar Operación" : "Registrar Operación")}
          </Button>
        </form>

        <AccountFormDialog
          isOpen={isAccountDialogOpen}
          onOpenChange={setIsAccountDialogOpen}
          onSaveSuccess={(newAccount) => {
            fetchAccounts();
            if (newAccount?.id) setSelectedAccountId(newAccount.id);
            setIsAccountDialogOpen(false);
          }}
        />

        <StrategyFormDialog
          isOpen={isStrategyDialogOpen}
          onOpenChange={setIsStrategyDialogOpen}
          onSaveSuccess={(newStrategy) => {
            fetchStrategies();
            if (newStrategy?.id) setSelectedStrategyId(newStrategy.id);
            setIsStrategyDialogOpen(false);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default TradeForm;
