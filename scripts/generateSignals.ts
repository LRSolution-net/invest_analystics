/**
 * scripts/generateSignals.ts
 *
 * Reads existing market_data from Supabase and writes signals — no API calls.
 * Run with:  npm run generate-signals
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL              = process.env.SUPABASE_URL              ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Types ─────────────────────────────────────────────────────
interface SignalInsert {
  stock_id:  string;
  type:      'BUY' | 'SELL';
  price:     number;
  indicator: string;
  rsi_value: number | null;
  sma20:     number | null;
  sma50:     number | null;
}

// ── Indicators ────────────────────────────────────────────────
function calculateSMA(prices: number[], period: number): number[] {
  const sma = new Array<number>(prices.length).fill(NaN);
  for (let i = period - 1; i < prices.length; i++) {
    const w = prices.slice(i - period + 1, i + 1);
    sma[i] = w.reduce((s, v) => s + v, 0) / period;
  }
  return sma;
}

function calculateRSI(prices: number[], period = 14): number[] {
  const rsi = new Array<number>(prices.length).fill(NaN);
  if (prices.length < period + 1) return rsi;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period; avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < prices.length; i++) {
    const d    = prices[i] - prices[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? Math.abs(d) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i]  = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function generateAllSignals(closes: number[], stockId: string): SignalInsert[] {
  if (closes.length < 51) return [];
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const rsi   = calculateRSI(closes, 14);
  const results: SignalInsert[] = [];

  for (let i = 50; i < closes.length; i++) {
    const prev = i - 1;
    const base: Omit<SignalInsert, 'type' | 'indicator'> = {
      stock_id:  stockId,
      price:     closes[i],
      rsi_value: isFinite(rsi[i])   ? rsi[i]   : null,
      sma20:     isFinite(sma20[i]) ? sma20[i] : null,
      sma50:     isFinite(sma50[i]) ? sma50[i] : null,
    };

    const golden = isFinite(sma20[prev]) && isFinite(sma50[prev]) &&
      sma20[prev] <= sma50[prev] && sma20[i] > sma50[i];
    const death  = isFinite(sma20[prev]) && isFinite(sma50[prev]) &&
      sma20[prev] >= sma50[prev] && sma20[i] < sma50[i];

    if (golden) { results.push({ ...base, type: 'BUY',  indicator: 'SMA_CROSSOVER' }); continue; }
    if (death)  { results.push({ ...base, type: 'SELL', indicator: 'SMA_CROSSOVER' }); continue; }
    if (isFinite(rsi[i])) {
      if (rsi[i] < 30) { results.push({ ...base, type: 'BUY',  indicator: 'RSI' }); continue; }
      if (rsi[i] > 70) { results.push({ ...base, type: 'SELL', indicator: 'RSI' }); continue; }
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔍  Generating signals from existing market data...\n');

  // Fetch all active stocks
  const { data: stocks, error: stockErr } = await supabase
    .from('stocks').select('id, symbol').eq('active', true).order('symbol');

  if (stockErr || !stocks) {
    console.error('❌  Could not fetch stocks:', stockErr?.message);
    process.exit(1);
  }

  let totalSignals = 0;

  for (const stock of stocks) {
    process.stdout.write(`Processing ${stock.symbol}... `);

    // Fetch market data ordered by date asc
    const { data: rows, error: dataErr } = await supabase
      .from('market_data')
      .select('close')
      .eq('stock_id', stock.id)
      .order('date', { ascending: true })
      .limit(100);

    if (dataErr || !rows || rows.length === 0) {
      console.log('⚠  no market data, skipping.');
      continue;
    }

    const closes  = rows.map((r: { close: number }) => r.close);
    const signals = generateAllSignals(closes, stock.id);

    if (signals.length === 0) {
      console.log('no signals detected.');
      continue;
    }

    // Wipe old signals and re-insert
    await supabase.from('signals').delete().eq('stock_id', stock.id);
    const { error: insErr } = await supabase.from('signals').insert(signals);

    if (insErr) {
      console.log(`❌  insert error: ${insErr.message}`);
    } else {
      console.log(`✅  ${signals.length} signal(s) saved.`);
      totalSignals += signals.length;
    }
  }

  console.log(`\n✅  Done. ${totalSignals} total signals written.`);
}

main().catch(err => { console.error(err); process.exit(1); });
