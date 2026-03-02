/**
 * scripts/fetchAndSaveMarketData.ts
 *
 * Server-side data collection script — run with:
 *   npm run fetch-data
 *
 * Requires a .env file (NOT .env.example) with:
 *   SUPABASE_URL            — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY — never expose this in the browser!
 *   ALPHA_VANTAGE_KEY       — free-tier key from alphavantage.co
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Environment validation
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL             = process.env.SUPABASE_URL             ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ALPHA_VANTAGE_KEY        = process.env.ALPHA_VANTAGE_KEY        ?? process.env.VITE_ALPHA_VANTAGE_KEY ?? '';
const DELAY_BETWEEN_SYMBOLS_MS = 15_000; // respect free-tier rate limit (5 req/min)

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ALPHA_VANTAGE_KEY) {
  console.error('❌  Missing required environment variables.');
  console.error('    Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────
// Supabase admin client (bypasses RLS via service role key)
// ─────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SignalInsert {
  stock_id:  string;
  type:      'BUY' | 'SELL';
  price:     number;
  indicator: string;
  rsi_value: number | null;
  sma20:     number | null;
  sma50:     number | null;
}

// ─────────────────────────────────────────────────────────────
// Alpha Vantage helper
// ─────────────────────────────────────────────────────────────
async function fetchDailyPrices(symbol: string): Promise<DailyPrice[]> {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${ALPHA_VANTAGE_KEY}`;
  const res  = await fetch(url);

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);

  const json = await res.json() as Record<string, unknown>;

  if (json['Note'])        throw new Error(`Rate limit hit: ${json['Note']}`);
  if (json['Information']) throw new Error(`API info: ${json['Information']}`);

  const ts = json['Time Series (Daily)'] as Record<string, Record<string, string>> | undefined;
  if (!ts) throw new Error(`No time-series data for ${symbol}`);

  return Object.entries(ts)
    .map(([date, d]) => ({
      date,
      open:   parseFloat(d['1. open']),
      high:   parseFloat(d['2. high']),
      low:    parseFloat(d['3. low']),
      close:  parseFloat(d['4. close']),
      volume: parseInt(d['5. volume'], 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-100);
}

// ─────────────────────────────────────────────────────────────
// Technical Indicators
// ─────────────────────────────────────────────────────────────
function calculateSMA(prices: number[], period: number): number[] {
  const sma = new Array<number>(prices.length).fill(NaN);
  for (let i = period - 1; i < prices.length; i++) {
    const window = prices.slice(i - period + 1, i + 1);
    sma[i] = window.reduce((s, v) => s + v, 0) / period;
  }
  return sma;
}

function calculateRSI(prices: number[], period = 14): number[] {
  const rsi  = new Array<number>(prices.length).fill(NaN);
  if (prices.length < period + 1) return rsi;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d);
  }
  avgGain /= period;
  avgLoss /= period;
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

/**
 * Scans all historical price points and returns every signal detected.
 * Checks for SMA golden/death cross and RSI overbought/oversold at each day.
 */
function generateAllSignals(prices: DailyPrice[], stockId: string): (SignalInsert & { date: string })[] {
  if (prices.length < 51) return [];

  const closes = prices.map(p => p.close);
  const sma20  = calculateSMA(closes, 20);
  const sma50  = calculateSMA(closes, 50);
  const rsi    = calculateRSI(closes, 14);

  const results: (SignalInsert & { date: string })[] = [];

  for (let i = 50; i < prices.length; i++) {
    const prev = i - 1;
    const base: Omit<SignalInsert, 'type' | 'indicator'> & { date: string } = {
      stock_id:  stockId,
      price:     prices[i].close,
      rsi_value: isFinite(rsi[i])    ? rsi[i]    : null,
      sma20:     isFinite(sma20[i])  ? sma20[i]  : null,
      sma50:     isFinite(sma50[i])  ? sma50[i]  : null,
      date:      prices[i].date,
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

// ─────────────────────────────────────────────────────────────
// Delay helper
// ─────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
const SYMBOLS = [
  // Big Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA',
  'META', 'NVDA', 'NFLX', 'AMD',
  // Finance
  'JPM', 'V',
  // Consumer / other
  'DIS', 'WMT', 'PYPL', 'BABA',
];

async function main() {
  console.log('🚀  Starting market data collection...\n');

  for (let i = 0; i < SYMBOLS.length; i++) {
    const symbol = SYMBOLS[i];
    console.log(`[${i + 1}/${SYMBOLS.length}] Processing ${symbol}...`);

    try {
      // 1. Fetch prices from Alpha Vantage
      console.log(`  ↳ Fetching daily prices...`);
      const prices = await fetchDailyPrices(symbol);
      console.log(`  ↳ ${prices.length} days retrieved.`);

      // 2. Look up the stock UUID in Supabase
      const { data: stockRow, error: stockErr } = await supabase
        .from('stocks')
        .select('id')
        .eq('symbol', symbol)
        .single();

      if (stockErr || !stockRow) {
        console.warn(`  ⚠  Stock "${symbol}" not found in DB — skipping.`);
        continue;
      }

      const stockId = stockRow.id as string;

      // 3. Upsert market data (conflict on stock_id + date)
      console.log(`  ↳ Upserting market data to Supabase...`);
      const rows = prices.map((p) => ({ ...p, stock_id: stockId }));

      const { error: upsertErr } = await supabase
        .from('market_data')
        .upsert(rows, { onConflict: 'stock_id,date' });

      if (upsertErr) throw new Error(`Upsert error: ${upsertErr.message}`);
      console.log(`  ↳ ${rows.length} rows upserted.`);

      // 4. Generate signals for all historical data points
      const allSignals = generateAllSignals(prices, stockId);

      if (allSignals.length > 0) {
        console.log(`  ↳ ${allSignals.length} historical signal(s) detected — re-seeding...`);

        // Delete existing signals for this stock then re-insert (idempotent)
        await supabase.from('signals').delete().eq('stock_id', stockId);

        // Strip the helper `date` field before inserting
        const toInsert = allSignals.map(({ date: _d, ...sig }) => sig);
        const { error: sigErr } = await supabase.from('signals').insert(toInsert);
        if (sigErr) console.warn(`  ⚠  Could not save signals: ${sigErr.message}`);
        else console.log(`  ↳ ${toInsert.length} signal(s) saved.`);
      } else {
        console.log(`  ↳ No signals detected in historical data.`);
      }
    } catch (err) {
      console.error(`  ❌  Error processing ${symbol}:`, (err as Error).message);
    }

    // 5. Wait before next symbol (respect free-tier rate limit: 5 req / min)
    if (i < SYMBOLS.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_BETWEEN_SYMBOLS_MS / 1000}s before next request...\n`);
      await sleep(DELAY_BETWEEN_SYMBOLS_MS);
    }
  }

  console.log('\n✅  Data collection complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
