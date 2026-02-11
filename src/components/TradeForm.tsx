import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Combobox } from "@/components/ui/combobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountFormDialog } from "@/components/AccountFormDialog";
import { useTradingPlan } from "@/hooks/useTradingPlan";


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

  // Estados para cuentas
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);

  // Estado para evaluación de setup compliance
  const [setupCompliance, setSetupCompliance] = useState<'full' | 'partial' | 'none'>('full');
  const [outsidePlanWarning, setOutsidePlanWarning] = useState(false);

  // Trading Plan hook
  const { plan: tradingPlan } = useTradingPlan();

  // Estados unificado para otros campos del formulario
  const [formData, setFormData] = useState({
    par: "",
    pnl_neto: "",
    riesgo: "",
    emocion: "",
    trade_type: "buy" as "buy" | "sell",
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

  // --- Fin Handlers ---

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

  // Efecto para cargar cuentas
  useEffect(() => {
    fetchAccounts();
  }, []);


  // Efecto para cargar datos del trade a editar
  useEffect(() => {
    // Si estamos en modo EDICIÓN
    if (tradeToEdit) {
      // 1. Rellenar campos de formData
      setFormData({
        par: tradeToEdit.par || '',
        pnl_neto: tradeToEdit.pnl_neto?.toString() || '',
        riesgo: tradeToEdit.riesgo?.toString() || '',
        emocion: tradeToEdit.emocion || '',
        trade_type: tradeToEdit.trade_type || 'buy',
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

      // 3. Rellenar Dropdowns
      setSelectedAccountId(tradeToEdit.account_id || null);

      // Setup compliance
      setSetupCompliance(tradeToEdit.setup_compliance || 'full');
      setOutsidePlanWarning(tradeToEdit.is_outside_plan || false);

    } else {
      // Lógica para resetear el formulario si estamos en modo "NUEVO TRADE"
      setFormData({
        par: '',
        pnl_neto: '',
        riesgo: '',
        emocion: '',
        trade_type: 'buy',
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
      setSetupCompliance('full');
      setOutsidePlanWarning(false);

      // Auto-seleccionar cuenta si hay cuentas disponibles
      if (accounts.length > 0) {
        setSelectedAccountId(accounts[0].id);
      } else {
        setSelectedAccountId(null);
      }
    }
  }, [tradeToEdit, accounts]);

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
      const pnlValue = formData.pnl_neto === "" ? 0 : parseFloat(formData.pnl_neto);
      const riesgoValue = parseFloat(formData.riesgo) || null;

      // --- Validación contra Trading Plan ---
      let isOutsidePlan = setupCompliance !== 'full';

      try {
        const { data: planData } = await (supabase as any)
          .from("trading_plans")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (planData) {
          // Check max_trades_per_day
          if (planData.max_trades_per_day != null && !tradeToEdit) {
            const todayStr = entryTimestamp.toISOString().split('T')[0];
            const { count } = await supabase
              .from("trades")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .gte("entry_time", todayStr + "T00:00:00")
              .lte("entry_time", todayStr + "T23:59:59");

            if ((count || 0) >= planData.max_trades_per_day) {
              isOutsidePlan = true;
            }
          }

          // Check min_rr
          if (planData.min_rr != null && riesgoValue && riesgoValue > 0) {
            const rr = pnlValue / riesgoValue;
            if (rr < planData.min_rr && pnlValue > 0) {
              isOutsidePlan = true;
            }
          }

          // Check risk_per_trade (percentage-based)
          if (planData.risk_per_trade != null && riesgoValue && riesgoValue > 0) {
            // Get account initial capital to calculate percentage
            const acct = await supabase
              .from('accounts')
              .select('initial_capital')
              .eq('id', selectedAccountId)
              .single();
            if (acct.data && acct.data.initial_capital > 0) {
              const riskPct = (riesgoValue / acct.data.initial_capital) * 100;
              if (riskPct > planData.risk_per_trade) {
                isOutsidePlan = true;
              }
            }
          }

          // Check stop_after_consecutive_losses
          if (planData.stop_after_consecutive_losses != null && !tradeToEdit) {
            const { data: recentTrades } = await supabase
              .from("trades")
              .select("pnl_neto")
              .eq("user_id", user.id)
              .order("entry_time", { ascending: false })
              .limit(planData.stop_after_consecutive_losses);

            if (recentTrades && recentTrades.length >= planData.stop_after_consecutive_losses) {
              const allLosses = recentTrades.every((t: any) => t.pnl_neto < 0);
              if (allLosses) {
                isOutsidePlan = true;
              }
            }
          }
        }
      } catch (planError) {
        console.error("Error validating against trading plan:", planError);
      }

      const tradeDataObject = {
        user_id: user.id,
        account_id: selectedAccountId,
        strategy_id: null,
        par: formData.par.toUpperCase() || null,
        pnl_neto: pnlValue,
        riesgo: riesgoValue,
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
        is_outside_plan: isOutsidePlan,
        setup_compliance: setupCompliance,
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

      // Broken rules insertion removed

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
        setSetupCompliance('full');
        setOutsidePlanWarning(false);

        // Mantener la cuenta seleccionada o seleccionar la primera
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        } else {
          setSelectedAccountId(null);
        }
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

          {/* Evaluación del Setup */}
          {tradingPlan && (
            <div className="space-y-3 p-4 border rounded-md bg-muted/10">
              <div className="flex items-center gap-2">
                <Label className="text-base font-semibold">🧠 Evaluación del Setup</Label>
              </div>
              {tradingPlan.setup_rules?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Setup principal: <span className="font-medium text-foreground">{tradingPlan.setup_rules[0].name}</span>
                </p>
              )}
              <p className="text-sm text-muted-foreground">¿Este trade cumple tu Setup Principal?</p>
              <RadioGroup
                value={setupCompliance}
                onValueChange={(value) => {
                  setSetupCompliance(value as 'full' | 'partial' | 'none');
                  setOutsidePlanWarning(value !== 'full');
                }}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="full" id="setup-full" />
                  <Label htmlFor="setup-full" className="cursor-pointer flex-1">
                    <span className="text-profit font-medium">✔️ Sí, cumple completamente</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="partial" id="setup-partial" />
                  <Label htmlFor="setup-partial" className="cursor-pointer flex-1">
                    <span className="text-yellow-400 font-medium">⚠️ Parcialmente</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="none" id="setup-none" />
                  <Label htmlFor="setup-none" className="cursor-pointer flex-1">
                    <span className="text-loss font-medium">❌ No cumple</span>
                  </Label>
                </div>
              </RadioGroup>

              {outsidePlanWarning && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 mt-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                  <p className="text-sm text-yellow-200">
                    Estás registrando un trade fuera de tu plan de trading.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Fila Emoción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
              {/* Empty placeholder to keep alignment if needed, or just remove grid */}
            </div>
          </div>


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


      </CardContent>
    </Card>
  );
};

export default TradeForm;
