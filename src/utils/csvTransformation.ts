import { format, parse } from "date-fns";

export interface CSVMapperInfo {
  appField: string;
  csvField: string;
}

export const APP_FIELDS = [
  { id: 'entry_date', label: 'Fecha de Entrada (ej: 25/09/2025)', type: 'date', required: true },
  { id: 'entry_time', label: 'Hora de Entrada (ej: 15:06 o 1506)', type: 'string', required: false },
  { id: 'exit_date', label: 'Fecha de Salida', type: 'date', required: false },
  { id: 'exit_time', label: 'Hora de Salida', type: 'string', required: false },
  { id: 'par', label: 'Pair/Asset (par)', type: 'string', required: false },
  { id: 'pnl_neto', label: 'Net PnL (pnl_neto)', type: 'number', required: true },
  { id: 'riesgo', label: 'Risk (riesgo)', type: 'number', required: false },
  { id: 'trade_type', label: 'Trade Type (buy/sell)', type: 'string', required: true },
  { id: 'setup_rating', label: 'Setup Rating', type: 'string', required: false },
  { id: 'setup_compliance', label: 'Setup Compliance (full/partial/none)', type: 'string', required: false },
  { id: 'emocion', label: 'Emotion', type: 'string', required: false },
  { id: 'entry_types', label: 'Entry Types (Comma separated)', type: 'array', required: false },
  { id: 'is_outside_plan', label: 'Outside Plan?', type: 'boolean', required: false },
];

/**
 * Clean a number string by removing currency symbols, commas, and converting to float
 */
export const cleanNumber = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  
  // Remove spaces, currency symbols, and handle commas vs dots
  const strVal = String(val).trim().replace(/[$€£a-zA-Z\s]/g, '');
  
  // If we have a format like 1.234,56 (European), we convert comma to dot
  // and remove the dot thousand separator.
  // If we have a format like 1,234.56 (US), we remove the comma.
  let cleanedStr = strVal;
  
  // Check if it looks European (has comma near the end but dot earlier)
  // or US (has dot near the end but comma earlier)
  if (cleanedStr.includes(',') && cleanedStr.includes('.')) {
    if (cleanedStr.indexOf(',') > cleanedStr.indexOf('.')) {
      // European 1.234,56 -> 1234.56
      cleanedStr = cleanedStr.replace(/\./g, '').replace(',', '.');
    } else {
      // US 1,234.56 -> 1234.56
      cleanedStr = cleanedStr.replace(/,/g, '');
    }
  } else if (cleanedStr.includes(',')) {
    // Only comma. Could be either "12,50" -> 12.50 or "1,234" -> 1234
    // We assume if 2 decimal places after comma, it's a decimal separator
    if (/\,\d{1,2}$/.test(cleanedStr)) {
      cleanedStr = cleanedStr.replace(',', '.');
    } else {
      cleanedStr = cleanedStr.replace(',', '');
    }
  }

  const num = parseFloat(cleanedStr);
  return isNaN(num) ? 0 : num;
};

/**
 * Handle different date formats or raw Date objects from CSV and merge with time
 */
export const cleanDate = (dateVal: unknown, timeVal?: unknown): string | null => {
  if (!dateVal) return null;
  const dateStr = String(dateVal).trim();
  const timeStr = timeVal ? String(timeVal).trim() : '12:00:00';
  
  // parse timeStr which could be "15:06", "1506", "15:06:00", etc.
  let formattedTime = '12:00:00';
  if (/^\d{4}$/.test(timeStr)) {
    // "1506" -> "15:06:00"
    formattedTime = `${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:00`;
  } else if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    // "15:06" -> "15:06:00"
    const parts = timeStr.split(':');
    formattedTime = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) {
    // "15:06:00" -> "15:06:00"
    const parts = timeStr.split(':');
    formattedTime = `${parts[0].padStart(2, '0')}:${parts[1]}:${parts[2]}`;
  }

  // now parse dateStr. It could be yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy, etc.
  
  // if it's already a full ISO string
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // Try parsing with date-fns
  const formatsToTry = [
    'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'dd-MM-yyyy', 'yyyy/MM/dd'
  ];
  
  for (const fmt of formatsToTry) {
     try {
       const parsed = parse(`${dateStr} ${formattedTime}`, `${fmt} HH:mm:ss`, new Date());
       if (!isNaN(parsed.getTime())) return parsed.toISOString();
     } catch(e) {
       // Ignore and try next format
     }
  }
  
  // Last resort: native JS Date
  const fallback = new Date(`${dateStr} ${formattedTime}`);
  if (!isNaN(fallback.getTime())) return fallback.toISOString();

  return null;
};

/**
 * Process Trade Type
 */
export const cleanTradeType = (val: unknown): 'buy' | 'sell' => {
  if (!val) return 'buy'; // default
  const lowerVal = String(val).toLowerCase().trim();
  if (lowerVal.includes('sell') || lowerVal.includes('venta') || lowerVal.includes('short')) return 'sell';
  if (lowerVal.includes('buy') || lowerVal.includes('compra') || lowerVal.includes('long')) return 'buy';
  return 'buy'; // default
};

/**
 * Transform a CSV row using the defined mapping into the App's Database Schema
 */
export const transformCSVRow = (row: Record<string, string>, mapping: CSVMapperInfo[], userId: string, accountId: string | null) => {
  const transformed: Record<string, unknown> = {
    user_id: userId,
    account_id: accountId,
    strategy_id: null,
    is_outside_plan: false,
    is_trade_of_day: false,
  };

  let entryDateVal: string | undefined;
  let entryTimeVal: string | undefined;
  let exitDateVal: string | undefined;
  let exitTimeVal: string | undefined;

  mapping.forEach(m => {
    const csvValue = row[m.csvField];
    if (csvValue === undefined || csvValue === null || csvValue === '') return;

    switch (m.appField) {
      case 'pnl_neto':
      case 'riesgo':
        transformed[m.appField] = cleanNumber(csvValue);
        break;
      case 'entry_date': entryDateVal = csvValue; break;
      case 'entry_time': entryTimeVal = csvValue; break;
      case 'exit_date': exitDateVal = csvValue; break;
      case 'exit_time': exitTimeVal = csvValue; break;
      case 'trade_type':
        transformed[m.appField] = cleanTradeType(csvValue);
        break;
      case 'entry_types':
        // Split by comma if string, or just wrap in array
        transformed[m.appField] = String(csvValue).split(',').map(s => s.trim()).filter(Boolean);
        break;
      case 'is_outside_plan': {
        const strVal = String(csvValue).toLowerCase().trim();
        transformed[m.appField] = (strVal === 'true' || strVal === 'yes' || strVal === 'si' || strVal === 'sí');
        break;
      }
      default:
        // strings, par, setup_rating, emocion, setup_compliance
        transformed[m.appField] = String(csvValue).trim();
    }
  });

  // Combine date and time
  if (entryDateVal) {
    transformed.entry_time = cleanDate(entryDateVal, entryTimeVal);
  }
  if (exitDateVal) {
    transformed.exit_time = cleanDate(exitDateVal, exitTimeVal);
  }

  // Ensure required fields
  if (transformed.pnl_neto === undefined) transformed.pnl_neto = 0;
  if (!transformed.trade_type) transformed.trade_type = 'buy';

  return transformed;
};
