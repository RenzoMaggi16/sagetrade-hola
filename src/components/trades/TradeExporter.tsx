import { useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { APP_FIELDS } from "@/utils/csvTransformation";

interface TradeExporterProps {
  buttonVariant?: "default" | "outline" | "ghost";
  className?: string;
}

export function TradeExporter({ buttonVariant = "outline", className }: TradeExporterProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Fetch trades
      const { data: tradesData, error: tradesError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('entry_time', { ascending: false });

      if (tradesError) throw tradesError;
      if (!tradesData || tradesData.length === 0) {
        toast.info("No hay datos para exportar.");
        setIsExporting(false);
        return;
      }

      // Fetch accounts to map account_name
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, account_name')
        .eq('user_id', user.id);

      const accountMap = new Map(accountsData?.map(acc => [acc.id, acc.account_name]) || []);

      // Format data for human consumption based on APP_FIELDS definitions
      const formattedData = tradesData.map(trade => {
        const rowData: Record<string, unknown> = {};
        
        // Custom formatting for CSV readability
        APP_FIELDS.forEach(field => {
          let value = trade[field.id as keyof typeof trade];
          
          if (field.type === 'array' && Array.isArray(value)) {
            value = value.join(', ');
          } else if (field.type === 'boolean') {
            value = value ? 'Yes' : 'No';
          }
          
          rowData[field.label] = value;
        });

        // Add Account Name
        rowData['Account Name'] = trade.account_id ? (accountMap.get(trade.account_id) || 'N/A') : 'N/A';
        // Add Notes
        rowData['Pre Trade Notes'] = trade.pre_trade_notes || '';
        rowData['Post Trade Notes'] = trade.post_trade_notes || '';

        return rowData;
      });

      // Generate CSV
      const csv = Papa.unparse(formattedData);
      
      // Trigger Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `trades_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Trades exportados correctamente!");
    } catch (error: unknown) {
      console.error(error);
      const e = error as Error;
      toast.error("Error al exportar: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button 
      variant={buttonVariant} 
      onClick={handleExport}
      disabled={isExporting}
      className={className}
    >
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exportando..." : "Exportar CSV"}
    </Button>
  );
}
