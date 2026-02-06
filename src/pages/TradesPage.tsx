import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const TradesPage = () => {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPar, setFilterPar] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();

  useEffect(() => {
    const fetchTrades = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("get_trades_list");
      if (error) {
        toast.error("Error al cargar trades: " + error.message);
      } else {
        setTrades(data || []);
      }
      setLoading(false);
    };
    fetchTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const tradeDate = trade?.entry_time ? new Date(trade.entry_time) : undefined;
      const matchPar = filterPar
        ? (trade?.par || "").toLowerCase().includes(filterPar.toLowerCase())
        : true;
      const matchStart = filterStartDate && tradeDate ? tradeDate >= filterStartDate : true;
      const matchEnd = filterEndDate && tradeDate ? tradeDate <= filterEndDate : true;
      return matchPar && matchStart && matchEnd;
    });
  }, [trades, filterPar, filterStartDate, filterEndDate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Mis Trades</h1>
          <p className="text-sm text-muted-foreground mt-1">Historial de operaciones</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="grid gap-2">
            <Label htmlFor="filterPar">Filtrar por Par</Label>
            <Input
              id="filterPar"
              placeholder="Ej: ES, EURUSD, BTCUSD"
              value={filterPar}
              onChange={(e) => setFilterPar(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filterStart">Desde fecha</Label>
            <Input
              id="filterStart"
              type="date"
              value={filterStartDate ? format(filterStartDate, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setFilterStartDate(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="filterEnd">Hasta fecha</Label>
            <Input
              id="filterEnd"
              type="date"
              value={filterEndDate ? format(filterEndDate, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setFilterEndDate(e.target.value ? new Date(e.target.value + "T23:59:59") : undefined)
              }
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Par</TableHead>
                <TableHead>PnL</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>% Reglas</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Cargando trades...
                  </TableCell>
                </TableRow>
              ) : filteredTrades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay resultados para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrades.map((trade) => {
                  const pnl = Number(trade?.pnl_neto ?? 0);
                  const isBuy = trade?.trade_type === "buy";
                  return (
                    <TableRow key={trade.id}>
                      <TableCell>
                        {trade?.entry_time ? format(new Date(trade.entry_time), "dd/MM/yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell>{trade?.par ?? "-"}</TableCell>
                      <TableCell className={pnl > 0 ? "text-green-600" : pnl < 0 ? "text-red-600" : "text-muted-foreground"}>
                        {pnl.toLocaleString("es-ES", { style: "currency", currency: "USD" })}
                      </TableCell>
                      <TableCell className={isBuy ? "text-green-600" : "text-red-600"}>
                        {isBuy ? "Compra" : "Venta"}
                      </TableCell>
                      <TableCell>{trade?.account_name ?? "-"}</TableCell>
                      <TableCell>
                        {typeof trade?.rules_compliance_pct === "number"
                          ? `${Math.round(trade.rules_compliance_pct)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/trade/${trade.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default TradesPage;


