import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, ArrowLeft, TrendingUp, TrendingDown, Minus, Clock, Target, Star, AlertTriangle, CheckCircle, Ban, XCircle, ImageIcon, Search, ZoomIn, ZoomOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useEntryTypes } from "@/hooks/useEntryTypes";

interface DayTradesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  accountTradeIds: string[]; // IDs of trades on that day for the selected account
}

interface TradeFull {
  id: string;
  par: string | null;
  pnl_neto: number;
  riesgo: number | null;
  trade_type: "buy" | "sell";
  setup_rating: string | null;
  entry_time: string;
  exit_time: string | null;
  pre_trade_notes: string | null;
  post_trade_notes: string | null;
  is_outside_plan: boolean;
  setup_compliance: 'full' | 'partial' | 'none' | null;
  entry_types: string[] | null;
  emocion: string | null;
  image_url_m1?: string | null;
  image_url_m5?: string | null;
  image_url_m15?: string | null;
  is_trade_of_day?: boolean;
  trade_of_day_image?: string | null;
  trade_of_day_notes?: string | null;
  accounts?: {
    account_name: string;
  };
}

export const DayTradesModal = ({ open, onOpenChange, date, accountTradeIds }: DayTradesModalProps) => {
  const [trades, setTrades] = useState<TradeFull[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<TradeFull | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!open || !date || accountTradeIds.length === 0) {
      setTrades([]);
      setSelectedTrade(null);
      return;
    }

    const fetchTrades = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("trades")
          .select("*, accounts(account_name)")
          .in("id", accountTradeIds)
          .order("entry_time", { ascending: true });

        if (error) throw error;
        setTrades((data as any[]) || []);
      } catch (e) {
        console.error("Error fetching day trades:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [open, date, accountTradeIds]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTrade(null);
    }
    onOpenChange(isOpen);
  };

  const totalPnL = trades.reduce((sum, t) => sum + Number(t.pnl_neto), 0);

  const { entryTypes: userEntryTypes } = useEntryTypes();

  // Dynamic entry type colors
  const getEntryTypeColor = (typeName: string) => {
    const found = userEntryTypes.find((et) => et.name === typeName);
    return found?.color || '#06b6d4';
  };
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '6, 182, 212';
  };

  // ─── Trade Detail View ───
  if (selectedTrade) {
    const trade = selectedTrade;
    const isPnlPositive = trade.pnl_neto > 0;
    const isPnlNegative = trade.pnl_neto < 0;

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTrade(null)}
                className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>
            <DialogTitle className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{trade.par || "Sin par"}</span>
                <Badge variant="outline" className={`text-xs ${trade.trade_type === 'buy' ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'}`}>
                  {trade.trade_type === 'buy' ? '▲ Buy' : '▼ Sell'}
                </Badge>
              </div>
              <span className={`text-xl font-bold ${isPnlPositive ? 'text-emerald-400' : isPnlNegative ? 'text-red-400' : 'text-neutral-400'}`}>
                {isPnlPositive ? '+' : ''}{trade.pnl_neto.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-800/60 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Cuenta</p>
                <p className="text-sm font-semibold">{trade.accounts?.account_name || "—"}</p>
              </div>
              <div className="bg-neutral-800/60 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Riesgo</p>
                <p className="text-sm font-semibold">{trade.riesgo != null ? `$${trade.riesgo.toLocaleString()}` : "—"}</p>
              </div>
              <div className="bg-neutral-800/60 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Entrada</p>
                <p className="text-sm font-semibold">{trade.entry_time ? format(new Date(trade.entry_time), "HH:mm", { locale: es }) : "—"}</p>
              </div>
              <div className="bg-neutral-800/60 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Salida</p>
                <p className="text-sm font-semibold">{trade.exit_time ? format(new Date(trade.exit_time), "HH:mm", { locale: es }) : "—"}</p>
              </div>
            </div>

            {/* Calificación del Setup */}
            {trade.setup_rating && (
              <div className="bg-neutral-800/60 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Calificación del Setup</p>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold">{trade.setup_rating}</span>
                </div>
              </div>
            )}

            {/* Entry Types */}
            {trade.entry_types && trade.entry_types.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">Tipo de Entrada</p>
                <div className="flex flex-wrap gap-1.5">
                  {trade.entry_types.map((type) => {
                    const color = getEntryTypeColor(type);
                    const rgb = hexToRgb(color);
                    return (
                      <Badge
                        key={type}
                        variant="outline"
                        className="px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: `rgba(${rgb}, 0.15)`,
                          borderColor: `rgba(${rgb}, 0.4)`,
                          color: color,
                        }}
                      >
                        {type}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Emotion */}
            {trade.emocion && (
              <div className="bg-neutral-800/60 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Emoción</p>
                <p className="text-sm font-semibold">{trade.emocion}</p>
              </div>
            )}

            {/* Plan Evaluation */}
            <div className={`rounded-lg p-3 border ${!trade.is_outside_plan ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <div className="flex items-center gap-2">
                {!trade.is_outside_plan ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm font-medium">
                  {!trade.is_outside_plan ? 'Dentro del plan' : 'Fuera del plan'}
                </span>
              </div>
              {trade.setup_compliance && (
                <div className="flex items-center gap-1.5 mt-2 ml-6">
                  {trade.setup_compliance === 'full' && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  {trade.setup_compliance === 'partial' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                  {trade.setup_compliance === 'none' && <XCircle className="h-3.5 w-3.5 text-red-400" />}
                  <span className="text-xs text-muted-foreground">
                    Setup: {trade.setup_compliance === 'full' ? 'Completo' : trade.setup_compliance === 'partial' ? 'Parcial' : 'No cumplido'}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {(trade.pre_trade_notes || trade.post_trade_notes) && (
              <div className="space-y-3">
                {trade.pre_trade_notes && (
                  <div className="bg-neutral-800/60 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Análisis Pre-Trade</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{trade.pre_trade_notes}</p>
                  </div>
                )}
                {trade.post_trade_notes && (
                  <div className="bg-neutral-800/60 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Análisis Post-Trade</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{trade.post_trade_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Trade Images (M1, M5, M15) */}
            {((trade as any).image_url_m1 || (trade as any).image_url_m5 || (trade as any).image_url_m15) && (
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Imágenes del Trade
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(trade as any).image_url_m1 && (
                    <button
                      onClick={() => setSelectedImageUrl((trade as any).image_url_m1)}
                      className="relative rounded-md overflow-hidden border border-border bg-neutral-900 aspect-video group"
                    >
                      <img src={(trade as any).image_url_m1} alt="M1" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/70 px-1 py-0.5 rounded text-white z-10">M1</span>
                    </button>
                  )}
                  {(trade as any).image_url_m5 && (
                    <button
                      onClick={() => setSelectedImageUrl((trade as any).image_url_m5)}
                      className="relative rounded-md overflow-hidden border border-border bg-neutral-900 aspect-video group"
                    >
                      <img src={(trade as any).image_url_m5} alt="M5" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/70 px-1 py-0.5 rounded text-white z-10">M5</span>
                    </button>
                  )}
                  {(trade as any).image_url_m15 && (
                    <button
                      onClick={() => setSelectedImageUrl((trade as any).image_url_m15)}
                      className="relative rounded-md overflow-hidden border border-border bg-neutral-900 aspect-video group"
                    >
                      <img src={(trade as any).image_url_m15} alt="M15" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <span className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/70 px-1 py-0.5 rounded text-white z-10">M15</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Trade del Día */}
            {(trade as any).is_trade_of_day && (
              <div className="rounded-lg p-3 border border-yellow-500/40 bg-yellow-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-300">Trade del Día</span>
                </div>
                {(trade as any).trade_of_day_image && (
                  <button
                    onClick={() => setSelectedImageUrl((trade as any).trade_of_day_image)}
                    className="relative block w-full max-w-md h-40 rounded-md overflow-hidden border border-yellow-500/30 bg-neutral-900 mb-2 group"
                  >
                    <img src={(trade as any).trade_of_day_image} alt="Trade del Día" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Search className="h-5 w-5 text-yellow-400" />
                    </div>
                  </button>
                )}
                {(trade as any).trade_of_day_notes && (
                  <p className="text-xs text-neutral-200 whitespace-pre-wrap">{(trade as any).trade_of_day_notes}</p>
                )}
              </div>
            )}
          </div>

          {/* Image Lightbox */}
          {selectedImageUrl && (
            <Dialog open={!!selectedImageUrl} onOpenChange={(open) => {
              if (!open) {
                setSelectedImageUrl(null);
                setIsZoomed(false);
              }
            }}>
              <DialogContent className="max-w-[95vw] md:max-w-5xl h-[90vh] bg-black/95 border-0 shadow-2xl flex items-center justify-center p-0 overflow-hidden ring-1 ring-white/10">
                <div className={`relative w-full h-full flex items-center justify-center ${isZoomed ? 'cursor-zoom-out overflow-auto' : 'cursor-zoom-in'}`}>
                  <img
                    src={selectedImageUrl}
                    alt="Vista detallada"
                    onClick={() => setIsZoomed(!isZoomed)}
                    className={`transition-all duration-300 ${
                      isZoomed 
                        ? 'max-w-none min-w-full scale-150' 
                        : 'max-w-full max-h-full object-contain'
                    }`}
                  />
                  <div className="absolute top-4 right-16 z-50">
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/70 backdrop-blur-md"
                      onClick={() => setIsZoomed(!isZoomed)}
                    >
                      {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Trade List View ───
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {date ? format(date, "EEEE d 'de' MMMM, yyyy", { locale: es }) : ""}
            </span>
            <span className={`text-lg font-bold ${totalPnL > 0 ? 'text-emerald-400' : totalPnL < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
              {totalPnL > 0 ? '+' : ''}{totalPnL.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {trades.length} {trades.length === 1 ? 'operación' : 'operaciones'} en este día
          </p>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))
          ) : trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No hay trades registrados este día</p>
            </div>
          ) : (
            trades.map((trade) => {
              const isPnlPositive = trade.pnl_neto > 0;
              const isPnlNegative = trade.pnl_neto < 0;
              return (
                <div
                  key={trade.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/30 ${
                    isPnlPositive
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : isPnlNegative
                        ? 'border-red-500/20 bg-red-500/5'
                        : 'border-border bg-muted/10'
                  }`}
                >
                  {/* Left: icon + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                      isPnlPositive ? 'bg-emerald-500/15' : isPnlNegative ? 'bg-red-500/15' : 'bg-neutral-700'
                    }`}>
                      {isPnlPositive ? <TrendingUp className="h-4 w-4 text-emerald-400" /> 
                        : isPnlNegative ? <TrendingDown className="h-4 w-4 text-red-400" /> 
                        : <Minus className="h-4 w-4 text-neutral-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{trade.par || "—"}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${trade.trade_type === 'buy' ? 'border-emerald-500/30 text-emerald-400' : 'border-red-500/30 text-red-400'}`}>
                          {trade.trade_type === 'buy' ? 'Buy' : 'Sell'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {trade.entry_time ? format(new Date(trade.entry_time), "HH:mm") : "—"}
                        </span>
                        <span>•</span>
                        <span className="truncate">{trade.accounts?.account_name || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: PnL + eye */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold ${
                      isPnlPositive ? 'text-emerald-400' : isPnlNegative ? 'text-red-400' : 'text-neutral-400'
                    }`}>
                      {isPnlPositive ? '+' : ''}${Math.abs(trade.pnl_neto).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
