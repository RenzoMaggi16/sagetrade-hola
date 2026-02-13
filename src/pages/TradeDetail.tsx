import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, Pencil, CheckCircle, AlertTriangle, XCircle, Ban } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TradeForm } from "@/components/TradeForm";
import { Label } from "@/components/ui/label";

interface Trade {
  id: string;
  account_id: string | null;
  par: string | null;
  pnl_neto: number;
  riesgo: number | null;
  trade_type: "buy" | "sell";
  setup_rating: string | null;
  entry_time: string;
  exit_time: string;
  pre_trade_notes: string | null;
  post_trade_notes: string | null;
  image_url_m1: string | null;
  image_url_m5: string | null;
  image_url_m15: string | null;
  is_outside_plan: boolean;
  setup_compliance: 'full' | 'partial' | 'none' | null;
  accounts?: {
    account_name: string;
  };
}

// Componente auxiliar para mostrar información en tarjetas
const InfoCard = ({ title, value, isProfit = false, isLoss = false }: {
  title: string;
  value: string | number;
  isProfit?: boolean;
  isLoss?: boolean;
}) => (
  <div className="bg-neutral-800 p-4 rounded-lg">
    <h4 className="text-sm text-neutral-400 mb-1">{title}</h4>
    <p className={`text-xl font-bold ${isProfit ? 'text-[var(--profit-color)]' : isLoss ? 'text-[var(--loss-color)]' : 'text-muted-foreground'}`}>
      {value}
    </p>
  </div>
);

// Componente auxiliar para mostrar notas
const NotesBox = ({ title, notes }: { title: string; notes: string | null }) => (
  <div className="bg-neutral-800 p-4 rounded-lg h-full">
    <h4 className="text-md font-semibold text-neutral-300 mb-2">{title}</h4>
    <p className="text-sm text-neutral-100 whitespace-pre-wrap">{notes || 'Sin notas.'}</p>
  </div>
);

// Componente auxiliar para las miniaturas
const ImageThumbnail = ({ src, label, onImageClick }: { src: string, label: string, onImageClick: (src: string) => void }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <button
      onClick={() => onImageClick(src)}
      className="block w-full h-48 rounded-md overflow-hidden border border-neutral-700 hover:opacity-80 transition-opacity bg-neutral-900"
    >
      <img
        src={src}
        alt={`Gráfico ${label}`}
        className="w-full h-full object-cover"
      />
    </button>
  </div>
);

const TradeDetail = () => {
  const params = useParams();
  const id = params.id;
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchTradeDetails = async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 1. Obtener el trade y los nombres relacionados
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select(`
          *, 
          accounts(account_name)
        `)
        .eq('id', id)
        .single();

      if (tradeError) throw tradeError;
      setTrade(tradeData as unknown as Trade);

    } catch (error: any) {
      console.error("Error fetching trade details:", error);
      toast.error("Error al cargar los detalles del trade: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradeDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Skeleton className="h-10 w-24" />
          </div>
          <Card className="border-border">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8 text-muted-foreground">
            No se encontró la operación
          </div>
          <div className="flex justify-center mt-4">
            <Button asChild>
              <Link to="/">Volver al inicio</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Calcular RR
  const pnl = parseFloat(trade.pnl_neto?.toString() || "0");
  const risk = parseFloat(trade.riesgo?.toString() || "0");
  let calculatedRR = "N/A";
  if (risk > 0) {
    calculatedRR = `1 : ${(pnl / risk).toFixed(2)}`;
  }

  // Helpers para Setup Compliance
  const getComplianceInfo = (status: string | null) => {
    switch (status) {
      case 'full': return { text: 'Cumple completamente', icon: <CheckCircle className="h-5 w-5 text-green-500" />, color: 'text-green-500' };
      case 'partial': return { text: 'Cumple parcialmente', icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />, color: 'text-yellow-500' };
      case 'none': return { text: 'No cumple', icon: <XCircle className="h-5 w-5 text-red-500" />, color: 'text-red-500' };
      default: return { text: 'No especificado', icon: <AlertTriangle className="h-5 w-5 text-muted-foreground" />, color: 'text-muted-foreground' };
    }
  };

  const complianceInfo = getComplianceInfo(trade.setup_compliance);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6 flex justify-between items-center">
          <Button variant="outline" asChild className="gap-2">
            <Link to="/#trades">
              <ArrowLeft className="h-4 w-4" />
              Volver al Historial
            </Link>
          </Button>

          <Button variant="default" className="gap-2" onClick={() => setIsEditDialogOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar Trade
          </Button>
        </div>

        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Detalles del Trade</CardTitle>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {trade.par || 'N/A'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Información de Fechas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="text-sm text-neutral-400 mb-1">Fecha y Hora de Entrada</h4>
                <p className="text-lg font-semibold">
                  {trade.entry_time
                    ? format(new Date(trade.entry_time), "dd/MM/yyyy HH:mm:ss")
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-neutral-800 p-4 rounded-lg">
                <h4 className="text-sm text-neutral-400 mb-1">Fecha y Hora de Salida</h4>
                <p className="text-lg font-semibold">
                  {trade.exit_time
                    ? format(new Date(trade.exit_time), "dd/MM/yyyy HH:mm:ss")
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Sección de Resumen - Grid de 4 columnas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
              <InfoCard
                title="Cuenta"
                value={trade.accounts?.account_name || 'N/A'}
              />
              <InfoCard
                title="PnL Neto"
                value={`$${pnl.toFixed(2)}`}
                isProfit={pnl > 0}
                isLoss={pnl < 0}
              />
              <InfoCard
                title="Riesgo ($)"
                value={`$${risk.toFixed(2)}`}
              />
              <InfoCard
                title="RR (Calculado)"
                value={calculatedRR}
              />
              <InfoCard
                title="Dirección"
                value={trade.trade_type === 'buy' ? 'Compra' : 'Venta'}
              />
              <InfoCard
                title="Calificación Setup"
                value={trade.setup_rating || 'N/A'}
              />
            </div>

            {/* 🧠 Evaluación del Plan */}
            <div className={`mt-6 p-4 rounded-lg border flex flex-col gap-4 ${!trade.is_outside_plan
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
              }`}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">🧠 Evaluación del Plan</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cumplimiento del Setup */}
                <div className="flex items-center gap-3">
                  {complianceInfo.icon}
                  <div>
                    <h4 className="text-sm text-muted-foreground font-medium">Cumplimiento del Setup</h4>
                    <p className={`font-bold ${complianceInfo.color}`}>{complianceInfo.text}</p>
                  </div>
                </div>

                {/* Estado del Plan */}
                <div className="flex items-center gap-3">
                  {!trade.is_outside_plan ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Ban className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <h4 className="text-sm text-muted-foreground font-medium">Estado del Plan</h4>
                    {!trade.is_outside_plan ? (
                      <p className="font-bold text-green-500">🟢 Dentro del plan</p>
                    ) : (
                      <div className="flex flex-col">
                        <p className="font-bold text-red-500">🔴 Fuera del plan</p>
                        <p className="text-xs text-red-400 mt-1">
                          Este trade rompió alguna regla de tu plan (RR, riesgo, límite diario o pérdidas consecutivas).
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Sección de Notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <NotesBox
                title="Análisis Pre-Trade"
                notes={trade.pre_trade_notes}
              />
              <NotesBox
                title="Reflexión Post-Trade"
                notes={trade.post_trade_notes}
              />
            </div>

            {/* --- Sección de Imágenes (M1, M5, M15) --- */}
            {(trade.image_url_m1 || trade.image_url_m5 || trade.image_url_m15) && (
              <div className="mt-6 col-span-1 md:col-span-2">
                <h3 className="text-lg font-semibold mb-4">Imágenes del Trade</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* M1 */}
                  {trade.image_url_m1 && (
                    <ImageThumbnail
                      src={trade.image_url_m1}
                      label="M1"
                      onImageClick={setSelectedImageUrl}
                    />
                  )}
                  {/* M5 */}
                  {trade.image_url_m5 && (
                    <ImageThumbnail
                      src={trade.image_url_m5}
                      label="M5"
                      onImageClick={setSelectedImageUrl}
                    />
                  )}
                  {/* M15 */}
                  {trade.image_url_m15 && (
                    <ImageThumbnail
                      src={trade.image_url_m15}
                      label="M15"
                      onImageClick={setSelectedImageUrl}
                    />
                  )}
                </div>
              </div>
            )}
            {/* --- Fin Sección de Imágenes --- */}
          </CardContent>
        </Card>

        {/* --- Componente Modal (Lightbox) --- */}
        <Dialog open={!!selectedImageUrl} onOpenChange={() => setSelectedImageUrl(null)}>
          <DialogContent className="max-w-5xl h-[90vh] bg-transparent border-0 shadow-none flex items-center justify-center p-0">
            <img
              src={selectedImageUrl || ''}
              alt="Vista detallada del gráfico"
              className="max-w-full max-h-full object-contain"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Operación</DialogTitle>
            </DialogHeader>
            <TradeForm
              tradeToEdit={trade}
              onSaveSuccess={() => {
                setIsEditDialogOpen(false);
                fetchTradeDetails();
                toast.success("Trade actualizado con éxito");
              }}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default TradeDetail;
