import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Search, Trash2, Eye, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { TradeForm } from "@/components/TradeForm";

interface TradeRow {
  id: string;
  entry_time: string;
  par: string | null;
  pnl_neto: number | null;
  trade_type: 'buy' | 'sell';
  account_name: string | null;
  rules_compliance_pct: number | null;
}

export const TradesTable = () => {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: async (): Promise<TradeRow[]> => {
      const { data, error } = await (supabase as any).rpc('get_trades_list');
      if (error) throw error;
      return (data ?? []) as TradeRow[];
    },
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm('¿Estás seguro de que quieres borrar esta operación?')) {
      try {
        const { error } = await supabase
          .from('trades')
          .delete()
          .eq('id', id);

        if (error) {
          console.error("Error al borrar el trade:", error);
          toast({
            title: "Error",
            description: "No se pudo borrar la operación: " + error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Éxito",
            description: "Operación borrada correctamente",
          });
          queryClient.invalidateQueries({ queryKey: ["trades"] });
        }
      } catch (error) {
        console.error("Error inesperado:", error);
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado al borrar la operación",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = async (tradeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Cargar el trade completo desde la base de datos
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('id', tradeId)
        .single();

      if (error) throw error;
      if (data) {
        setEditingTrade(data);
      }
    } catch (error: any) {
      console.error("Error al cargar el trade:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la operación para editar: " + error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const par = (trade.par ?? '').toLowerCase();
      const matchesSymbol = symbolFilter ? par.includes(symbolFilter.toLowerCase()) : true;
      const tradeDate = trade.entry_time ? new Date(trade.entry_time) : undefined;
      const matchesStartDate = startDate && tradeDate ? tradeDate >= new Date(startDate) : true;
      const matchesEndDate = endDate && tradeDate ? tradeDate <= new Date(endDate) : true;
      return matchesSymbol && matchesStartDate && matchesEndDate;
    });
  }, [trades, symbolFilter, startDate, endDate]);

  return (
    <>
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Mis Trades</CardTitle>
          <div className="grid gap-4 md:grid-cols-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="symbol-filter">Filtrar por Par</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="symbol-filter"
                  placeholder="EURUSD, NAS100..."
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha Inicio</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha Fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron operaciones
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>% Reglas</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.map((trade) => {
                    const pnl = Number(trade.pnl_neto ?? 0);
                    const isBuy = trade.trade_type === 'buy';
                    return (
                      <TableRow key={trade.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {trade.entry_time ? format(new Date(trade.entry_time), "dd/MM/yyyy HH:mm") : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{trade.par ?? '-'}</Badge>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${pnl >= 0 ? 'text-profit-custom' : 'text-loss-custom'}`}>
                          ${pnl.toFixed(2)}
                        </TableCell>
                        <TableCell className={isBuy ? 'text-green-600' : 'text-red-600'}>
                          {isBuy ? 'Compra' : 'Venta'}
                        </TableCell>
                        <TableCell>{trade.account_name ?? '-'}</TableCell>
                        <TableCell>
                          {typeof trade.rules_compliance_pct === 'number' ? `${Math.round(trade.rules_compliance_pct)}%` : '-'}
                        </TableCell>
                        <TableCell className="text-center space-x-1">
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/trade/${trade.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleEdit(trade.id, e)}
                            className="hover:bg-accent"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(trade.id, e)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edición */}
      <Dialog open={!!editingTrade} onOpenChange={(open) => !open && setEditingTrade(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <TradeForm
            tradeToEdit={editingTrade}
            onSaveSuccess={() => {
              setEditingTrade(null);
              queryClient.invalidateQueries({ queryKey: ["trades"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
