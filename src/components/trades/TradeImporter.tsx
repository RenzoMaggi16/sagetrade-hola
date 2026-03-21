import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { APP_FIELDS, transformCSVRow, CSVMapperInfo } from "@/utils/csvTransformation";

interface TradeImporterProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function TradeImporter({ isOpen, onOpenChange, onSuccess }: TradeImporterProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // AppField id -> CSVHeader
  const [accounts, setAccounts] = useState<{id: string; account_name: string}[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
      // Load saved mapping from local storage
      const savedMapping = localStorage.getItem("csv_importer_mapping");
      if (savedMapping) {
        try {
          setMapping(JSON.parse(savedMapping));
        } catch(e) {}
      }
    } else {
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    // Do not reset mapping to allow preserving local storage defaults
    setSelectedAccountId("");
    setIsLoading(false);
  };

  const loadAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('accounts').select('id, account_name').eq('user_id', user.id);
    if (data) setAccounts(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setCsvHeaders(results.meta.fields.filter(h => h && h.trim() !== ""));
          setCsvData(results.data as Record<string, string>[]);
          setStep(2);
        } else {
          toast.error("Could not read CSV headers");
        }
        setIsLoading(false);
      },
      error: (error) => {
        toast.error("Error parsing CSV: " + error.message);
        setIsLoading(false);
      }
    });
  };

  const handleMappingChange = (appFieldId: string, csvHeader: string) => {
    setMapping(prev => {
      const newMapping = { ...prev };
      if (csvHeader === "none") {
        delete newMapping[appFieldId];
      } else {
        newMapping[appFieldId] = csvHeader;
      }
      return newMapping;
    });
  };

  const proceedToPreview = () => {
    if (!selectedAccountId) {
      toast.error("Por favor, selecciona una cuenta destino");
      return;
    }
    
    // Save mapping to localStorage
    localStorage.setItem("csv_importer_mapping", JSON.stringify(mapping));
    setStep(3);
  };

  const handleImport = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // Transform data
      const config: CSVMapperInfo[] = Object.keys(mapping).map(appField => ({
        appField,
        csvField: mapping[appField],
      }));

      const transformedData = csvData.map(row => 
        transformCSVRow(row, config, user.id, selectedAccountId)
      ).filter(row => row !== null); // maybe add some required field checks

      // Validate required fields explicitly: must have a valid non-null entry_time
      const validRows = transformedData.filter(row => row.entry_time);
      const invalidCount = transformedData.length - validRows.length;
      
      if (validRows.length === 0) {
        throw new Error("Ninguna fila válida para importar. Asegúrate de mapear la 'Fecha Entrada' al formato correcto (ej: dd/MM/yyyy HH:mm).");
      }
      
      if (invalidCount > 0) {
        // Just warning, or we could throw. Let's just warn if some fail, but proceed with valid.
        // Actually, let's throw if ALL but a few fail suspiciously.
        console.warn(`${invalidCount} filas ignoradas por falta de fecha válida.`);
      }

      // Bulk Insert
      const { error, count } = await supabase
        .from('trades')
        // @ts-expect-error - Row mapping is completely dynamic and generated from user CSV
        .insert(validRows);

      if (error) {
         console.error("Insert Error", error);
         throw error;
      }

      toast.success(`¡Importación exitosa! ${validRows.length} trades importados.`);
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      const e = error as Error;
      toast.error("Error durante la importación: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Preview Data: Transform first 3 rows
  const generatePreview = () => {
     const config: CSVMapperInfo[] = Object.keys(mapping).map(appField => ({
        appField,
        csvField: mapping[appField],
      }));
     return csvData.slice(0, 3).map(row => transformCSVRow(row, config, "preview_user", selectedAccountId));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Operaciones desde CSV</DialogTitle>
          <DialogDescription>
            Sube tu archivo CSV e importa masivamente tus trades.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* STEP 1: UPLOAD */}
          {step === 1 && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 text-center">
              <div className="mb-4">
                <Label htmlFor="csv-upload" className="mb-2 block text-sm font-medium">Selecciona tu archivo .csv</Label>
                <Input 
                  id="csv-upload" 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload} 
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isLoading}
                >
                  {isLoading ? "Leyendo..." : "Elegir Archivo"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">O arrastra y suelta tu archivo aquí</p>
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === 2 && (
            <div className="space-y-6">
               <div className="grid gap-2">
                <Label>Cuenta Destino</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm">Mapear Columnas (Aplicación {'<-'} CSV)</h4>
                {APP_FIELDS.map(field => (
                  <div key={field.id} className="grid grid-cols-2 gap-4 items-center">
                    <Label className={field.required ? "font-bold" : ""}>
                      {field.label} {field.required && "*"}
                    </Label>
                    <Select 
                      value={mapping[field.id] || "none"} 
                      onValueChange={(val) => handleMappingChange(field.id, val)}
                    >
                      <SelectTrigger>
                         <SelectValue placeholder="Ignorar columna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Ignorar --</SelectItem>
                        {csvHeaders.map((header, i) => (
                          header ? <SelectItem key={i} value={header}>{header}</SelectItem> : null
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
                <Button onClick={proceedToPreview}>Continuar a Vista Previa</Button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW */}
          {step === 3 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm">Vista Previa (Primeras 3 filas)</h4>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha Entrada</TableHead>
                      <TableHead>Par</TableHead>
                      <TableHead className="text-right">PnL</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatePreview().map((row, idx) => (
                      <TableRow key={idx}>
                         <TableCell className={!row.entry_time ? "text-red-500 font-bold" : ""}>
                           {row.entry_time ? new Date(String(row.entry_time)).toLocaleString() : "FECHA INVÁLIDA o VACÍA"}
                         </TableCell>
                         <TableCell>{String(row.par ?? '')}</TableCell>
                         <TableCell className="text-right">${String(row.pnl_neto ?? '')}</TableCell>
                         <TableCell>{String(row.trade_type ?? '')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <div className="bg-muted p-4 rounded-md mt-4">
                 <p className="text-sm">Total de filas leídas: <strong>{csvData.length}</strong></p>
                 <p className="text-xs text-muted-foreground mt-1 text-yellow-600 dark:text-yellow-400">
                    * Cualquier fila que diga "FECHA INVÁLIDA o VACÍA" será ignorada. Asegúrate de mapear correctamente la columna original.
                 </p>
              </div>
            </div>
          )}
        </div>

        {step === 3 && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? "Importando..." : "Confirmar Importación"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
