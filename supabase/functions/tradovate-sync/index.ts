// supabase/functions/tradovate-sync/index.ts
// Fetches fills from Tradovate, reconstructs trades, persists with deduplication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const TRADOVATE_URLS = {
  demo: 'https://demo.tradovateapi.com/v1',
  live: 'https://live.tradovateapi.com/v1',
};

// ─── Symbol Mapping ────────────────────────────────────────
// Maps Tradovate contract root symbols to readable names
const SYMBOL_MAP: Record<string, string> = {
  'NQ': 'NAS100',
  'ES': 'SP500',
  'YM': 'US30',
  'RTY': 'RTY',
  'GC': 'XAUUSD',
  'SI': 'XAGUSD',
  'CL': 'CRUDE',
  '6E': 'EURUSD',
  '6B': 'GBPUSD',
  '6A': 'AUDUSD',
  '6J': 'USDJPY',
  '6C': 'USDCAD',
  'MNQ': 'MNQ',
  'MES': 'MES',
  'MYM': 'MYM',
  'M2K': 'M2K',
  'MGC': 'MGC',
  'MCL': 'MCL',
};

// Tick values per contract root (for PnL calculation)
const TICK_VALUES: Record<string, { tickSize: number; tickValue: number }> = {
  'NQ': { tickSize: 0.25, tickValue: 5.00 },
  'ES': { tickSize: 0.25, tickValue: 12.50 },
  'YM': { tickSize: 1.0, tickValue: 5.00 },
  'RTY': { tickSize: 0.10, tickValue: 5.00 },
  'GC': { tickSize: 0.10, tickValue: 10.00 },
  'SI': { tickSize: 0.005, tickValue: 25.00 },
  'CL': { tickSize: 0.01, tickValue: 10.00 },
  '6E': { tickSize: 0.00005, tickValue: 6.25 },
  '6B': { tickSize: 0.0001, tickValue: 6.25 },
  '6A': { tickSize: 0.0001, tickValue: 10.00 },
  '6J': { tickSize: 0.0000005, tickValue: 6.25 },
  '6C': { tickSize: 0.00005, tickValue: 5.00 },
  'MNQ': { tickSize: 0.25, tickValue: 0.50 },
  'MES': { tickSize: 0.25, tickValue: 1.25 },
  'MYM': { tickSize: 1.0, tickValue: 0.50 },
  'M2K': { tickSize: 0.10, tickValue: 0.50 },
  'MGC': { tickSize: 0.10, tickValue: 1.00 },
  'MCL': { tickSize: 0.01, tickValue: 1.00 },
};

// Default per-side commission per contract (Apex/Tradovate typical)
const DEFAULT_COMMISSION_PER_CONTRACT = 2.54;

// ─── Helper Functions ──────────────────────────────────────

function extractContractRoot(contractName: string): string {
  // Tradovate symbols like "NQH4", "ESZ5", "MNQH4" etc.
  // Remove month code + year digits from the end
  const match = contractName.match(/^([A-Z0-9]+?)[FGHJKMNQUVXZ]\d{1,2}$/);
  return match ? match[1] : contractName;
}

function convertSymbol(contractName: string): string {
  const root = extractContractRoot(contractName);
  return SYMBOL_MAP[root] || contractName;
}

function getTickInfo(contractName: string) {
  const root = extractContractRoot(contractName);
  return TICK_VALUES[root] || { tickSize: 0.01, tickValue: 1.00 };
}

function calculatePnl(
  entryPrice: number, 
  exitPrice: number, 
  qty: number, 
  direction: 'buy' | 'sell',
  contractName: string
): number {
  const { tickSize, tickValue } = getTickInfo(contractName);
  const priceDiff = direction === 'buy' 
    ? (exitPrice - entryPrice) 
    : (entryPrice - exitPrice);
  const ticks = priceDiff / tickSize;
  return ticks * tickValue * qty;
}

interface Fill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  tradeDate: { year: number; month: number; day: number };
  action: string; // "Buy" or "Sell"
  qty: number;
  price: number;
  active: boolean;
  finallyPaired: number;
  contractName?: string;
  accountId?: number;
}

interface ReconstructedTrade {
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  direction: 'buy' | 'sell';
  grossPnl: number;
  commission: number;
  netPnl: number;
  symbol: string;
  rawSymbol: string;
  durationMinutes: number;
  fillIds: string;
  tradovateAccountId: number;
}

// ─── Trade Reconstruction ──────────────────────────────────

function reconstructTrades(fills: Fill[]): ReconstructedTrade[] {
  if (!fills || fills.length === 0) return [];

  // Sort by timestamp
  const sorted = [...fills].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Group fills by contractId and accountId
  const groups = new Map<string, Fill[]>();
  for (const fill of sorted) {
    const key = `${fill.accountId || 0}_${fill.contractId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(fill);
  }

  const trades: ReconstructedTrade[] = [];

  for (const [, groupFills] of groups) {
    let position = 0; // net position
    let entryFills: Fill[] = [];
    let direction: 'buy' | 'sell' = 'buy';

    for (const fill of groupFills) {
      const qty = fill.qty;
      const isBuy = fill.action === 'Buy';
      const signedQty = isBuy ? qty : -qty;

      if (position === 0) {
        // Opening a new position
        direction = isBuy ? 'buy' : 'sell';
        entryFills = [fill];
        position = signedQty;
      } else if (
        (position > 0 && isBuy) || 
        (position < 0 && !isBuy)
      ) {
        // Adding to position
        entryFills.push(fill);
        position += signedQty;
      } else {
        // Closing or reducing position
        const closingQty = Math.min(Math.abs(signedQty), Math.abs(position));
        
        // Calculate weighted average entry price
        let totalEntryQty = 0;
        let weightedEntryPrice = 0;
        for (const ef of entryFills) {
          weightedEntryPrice += ef.price * ef.qty;
          totalEntryQty += ef.qty;
        }
        const avgEntryPrice = totalEntryQty > 0 ? weightedEntryPrice / totalEntryQty : 0;

        const contractName = fill.contractName || groupFills[0].contractName || '';
        const grossPnl = calculatePnl(avgEntryPrice, fill.price, closingQty, direction, contractName);
        const commission = closingQty * DEFAULT_COMMISSION_PER_CONTRACT * 2; // round trip
        const netPnl = grossPnl - commission;

        const entryTime = entryFills[0].timestamp;
        const exitTime = fill.timestamp;
        const durationMs = new Date(exitTime).getTime() - new Date(entryTime).getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        const allFillIds = [...entryFills.map(f => f.id), fill.id];

        trades.push({
          entryTime,
          exitTime,
          entryPrice: avgEntryPrice,
          exitPrice: fill.price,
          quantity: closingQty,
          direction,
          grossPnl: Math.round(grossPnl * 100) / 100,
          commission: Math.round(commission * 100) / 100,
          netPnl: Math.round(netPnl * 100) / 100,
          symbol: convertSymbol(contractName),
          rawSymbol: contractName,
          durationMinutes,
          fillIds: allFillIds.sort((a, b) => a - b).join(','),
          tradovateAccountId: fill.accountId || 0,
        });

        position += signedQty;

        // If position flipped, start a new entry
        if (position !== 0) {
          direction = position > 0 ? 'buy' : 'sell';
          entryFills = [fill];
        } else {
          entryFills = [];
        }
      }
    }
  }

  return trades;
}

// ─── Token Validation ──────────────────────────────────────
// Option A (Simpler & Safer): If token is expired, require user to reconnect.
// We do NOT store passwords, so we cannot auto-refresh.

function checkTokenValidity(connection: any): { valid: boolean; token: string } {
  const expiry = new Date(connection.token_expiry);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes buffer

  if (expiry.getTime() - now.getTime() > bufferMs) {
    return { valid: true, token: connection.access_token };
  }

  return { valid: false, token: '' };
}

// ─── Main Handler ──────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // 2. Parse request body
    let body: any = {};
    try {
      body = await req.json();
    } catch { /* empty body is fine */ }

    const filterAccountId = body.tradovateAccountId || null;

    // 3. Get connection
    const { data: connection, error: connError } = await supabaseClient
      .from('tradovate_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connection) {
      return new Response(JSON.stringify({ 
        error: 'No hay conexión con Tradovate. Conecta primero.' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 4. Validate token (no auto-refresh — user must reconnect if expired)
    const { valid, token: accessToken } = checkTokenValidity(connection);
    
    if (!valid) {
      // Mark connection as disconnected
      await supabaseClient.from('tradovate_connections').update({
        status: 'disconnected',
        error_message: 'Token expirado. Reconecta tu cuenta de Tradovate.',
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      return new Response(JSON.stringify({ 
        error: 'Token expirado. Reconecta tu cuenta de Tradovate.',
        tokenExpired: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Use the environment stored in the user's connection (per-user, not env var)
    const env = connection.tradovate_environment || 'demo';
    const baseUrl = TRADOVATE_URLS[env as keyof typeof TRADOVATE_URLS] || TRADOVATE_URLS.demo;

    // 5. Fetch fills from Tradovate
    // Use the /fill/list endpoint to get all fills
    const fillsResponse = await fetch(`${baseUrl}/fill/list`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!fillsResponse.ok) {
      const errorText = await fillsResponse.text();
      console.error('Tradovate fills error:', errorText);
      throw new Error(`Error al obtener fills de Tradovate: ${fillsResponse.status}`);
    }

    let allFills: Fill[] = await fillsResponse.json();

    // 6. Incremental: filter fills after last sync
    const lastSyncFillId = connection.last_sync_fill_id || 0;
    allFills = allFills.filter((f: Fill) => f.id > lastSyncFillId);

    // Filter by Tradovate account if requested
    if (filterAccountId) {
      allFills = allFills.filter((f: Fill) => f.accountId === filterAccountId);
    }

    if (allFills.length === 0) {
      return new Response(JSON.stringify({
        message: 'No hay nuevos fills para sincronizar.',
        tradesAdded: 0,
        duplicatesSkipped: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 7. Enrich fills with contract names
    // Fetch unique contract IDs and resolve names
    const contractIds = [...new Set(allFills.map(f => f.contractId))];
    const contractNames = new Map<number, string>();

    for (const cid of contractIds) {
      try {
        const contractRes = await fetch(`${baseUrl}/contract/item?id=${cid}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (contractRes.ok) {
          const contractData = await contractRes.json();
          contractNames.set(cid, contractData.name || '');
        }
      } catch (e) {
        console.error(`Error fetching contract ${cid}:`, e);
      }
    }

    // Attach contract names and account IDs to fills
    for (const fill of allFills) {
      fill.contractName = contractNames.get(fill.contractId) || `Contract_${fill.contractId}`;
    }

    // 8. Reconstruct trades from fills
    const reconstructed = reconstructTrades(allFills);

    // 9. Get user's journal accounts for mapping
    const { data: journalAccounts } = await supabaseClient
      .from('accounts')
      .select('id, account_name')
      .eq('user_id', user.id);

    // Try to map Tradovate account to journal account by name match
    // If no match, use the first account
    const defaultAccountId = journalAccounts && journalAccounts.length > 0 
      ? journalAccounts[0].id 
      : null;

    function findJournalAccountId(tradovateAccountId: number): string | null {
      if (!journalAccounts || journalAccounts.length === 0) return null;
      
      const tvAccounts = connection.accounts_cache || [];
      const tvAccount = tvAccounts.find((a: any) => a.id === tradovateAccountId);
      
      if (tvAccount) {
        const match = journalAccounts.find((ja: any) => 
          ja.account_name.toLowerCase().includes(tvAccount.name?.toLowerCase() || '') ||
          tvAccount.name?.toLowerCase().includes(ja.account_name.toLowerCase())
        );
        if (match) return match.id;
      }
      
      return defaultAccountId;
    }

    // 10. Insert trades with deduplication
    let tradesAdded = 0;
    let duplicatesSkipped = 0;
    let maxFillId = lastSyncFillId;

    for (const trade of reconstructed) {
      const fillIdKey = trade.fillIds;

      // Check for existing trade with same fill IDs
      const { data: existing } = await supabaseClient
        .from('trades')
        .select('id')
        .eq('tradovate_fill_id', fillIdKey)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        duplicatesSkipped++;
        continue;
      }

      const accountId = findJournalAccountId(trade.tradovateAccountId);

      const tradeData = {
        user_id: user.id,
        account_id: accountId,
        par: trade.symbol,
        pnl_neto: trade.netPnl,
        trade_type: trade.direction,
        entry_time: trade.entryTime,
        exit_time: trade.exitTime,
        riesgo: null,
        emocion: null,
        setup_rating: null,
        pre_trade_notes: `Auto-importado de Tradovate | ${trade.rawSymbol} | Qty: ${trade.quantity} | Gross PnL: $${trade.grossPnl} | Comisión: $${trade.commission}`,
        post_trade_notes: null,
        strategy_id: null,
        is_outside_plan: false,
        setup_compliance: null,
        is_trade_of_day: false,
        tradovate_fill_id: fillIdKey,
      };

      const { error: insertError } = await supabaseClient
        .from('trades')
        .insert(tradeData);

      if (insertError) {
        console.error('Error inserting trade:', insertError);
        continue;
      }

      tradesAdded++;

      // Update account capital
      if (accountId) {
        const { data: acctData } = await supabaseClient
          .from('accounts')
          .select('current_capital, highest_balance, initial_capital')
          .eq('id', accountId)
          .single();

        if (acctData) {
          const newCapital = (acctData.current_capital || 0) + trade.netPnl;
          const currentHighest = acctData.highest_balance ?? Math.max(acctData.current_capital || 0, acctData.initial_capital || 0);
          const newHighest = Math.max(currentHighest, newCapital);

          await supabaseClient
            .from('accounts')
            .update({
              current_capital: newCapital,
              highest_balance: newHighest,
            })
            .eq('id', accountId);
        }
      }
    }

    // Track highest fill ID for incremental sync
    for (const fill of allFills) {
      if (fill.id > maxFillId) maxFillId = fill.id;
    }

    // 11. Update sync state
    await supabaseClient.from('tradovate_connections').update({
      last_sync_at: new Date().toISOString(),
      last_sync_fill_id: maxFillId,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id);

    // 12. Return summary
    return new Response(JSON.stringify({
      message: `Sincronización completada`,
      tradesAdded,
      duplicatesSkipped,
      totalFillsProcessed: allFills.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in tradovate-sync:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
