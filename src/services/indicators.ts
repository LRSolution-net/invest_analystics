import type { Signal } from '../types';

// ─────────────────────────────────────────────────────────────
// Simple Moving Average (SMA)
// ─────────────────────────────────────────────────────────────

/**
 * Calculate the Simple Moving Average for a series of prices.
 *
 * @param prices  - Array of closing prices (chronological order)
 * @param period  - Number of bars for the rolling window
 * @returns       Array of the same length; positions before the first full window
 *                are filled with `NaN` to preserve index alignment.
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = new Array(prices.length).fill(NaN);

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, v) => sum + v, 0) / period;
    sma[i] = avg;
  }

  return sma;
}

// ─────────────────────────────────────────────────────────────
// Relative Strength Index (RSI)
// ─────────────────────────────────────────────────────────────

/**
 * Calculate Wilder's RSI for a series of prices.
 *
 * @param prices  - Array of closing prices (chronological order)
 * @param period  - Lookback period; default is 14
 * @returns       Array of the same length; earlier positions are `NaN`.
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(prices.length).fill(NaN);

  if (prices.length < period + 1) return rsi;

  // Calculate initial average gain / loss over first `period` days
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - 100 / (1 + rs);
  }

  // Apply Wilder's smoothing for subsequent bars
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsi;
}

// ─────────────────────────────────────────────────────────────
// Signal generation
// ─────────────────────────────────────────────────────────────

/**
 * Analyse the latest prices and generate a BUY or SELL signal.
 *
 * Rules applied (in order of priority):
 *  1. SMA crossover — Golden Cross (SMA20 crosses above SMA50) → BUY
 *                   — Death Cross  (SMA20 crosses below SMA50) → SELL
 *  2. RSI extremes  — RSI < 30 → BUY (oversold)
 *                   — RSI > 70 → SELL (overbought)
 *
 * @param prices     - Array of closing prices (chronological order, ≥ 51 elements recommended)
 * @param stockId    - UUID of the stock (used to build the returned Signal object)
 * @returns          A Signal object or `null` if no signal is triggered.
 */
export function generateSignal(prices: number[], stockId: string): Signal | null {
  if (prices.length < 51) return null;

  const sma20Array = calculateSMA(prices, 20);
  const sma50Array = calculateSMA(prices, 50);
  const rsiArray   = calculateRSI(prices, 14);

  const last  = prices.length - 1;
  const prev  = last - 1;

  const sma20Current = sma20Array[last];
  const sma20Prev    = sma20Array[prev];
  const sma50Current = sma50Array[last];
  const sma50Prev    = sma50Array[prev];
  const rsiCurrent   = rsiArray[last];
  const currentPrice = prices[last];

  // ── 1. SMA Crossover ────────────────────────────────────────
  const goldenCross =
    isFinite(sma20Prev) && isFinite(sma50Prev) &&
    isFinite(sma20Current) && isFinite(sma50Current) &&
    sma20Prev <= sma50Prev &&   // was below or equal
    sma20Current > sma50Current; // now above

  const deathCross =
    isFinite(sma20Prev) && isFinite(sma50Prev) &&
    isFinite(sma20Current) && isFinite(sma50Current) &&
    sma20Prev >= sma50Prev &&   // was above or equal
    sma20Current < sma50Current; // now below

  if (goldenCross) {
    return {
      stock_id:  stockId,
      type:      'BUY',
      price:     currentPrice,
      indicator: 'SMA_CROSSOVER',
      rsi_value: isFinite(rsiCurrent) ? rsiCurrent : null,
      sma20:     sma20Current,
      sma50:     sma50Current,
    };
  }

  if (deathCross) {
    return {
      stock_id:  stockId,
      type:      'SELL',
      price:     currentPrice,
      indicator: 'SMA_CROSSOVER',
      rsi_value: isFinite(rsiCurrent) ? rsiCurrent : null,
      sma20:     sma20Current,
      sma50:     sma50Current,
    };
  }

  // ── 2. RSI extremes ─────────────────────────────────────────
  if (isFinite(rsiCurrent) && rsiCurrent < 30) {
    return {
      stock_id:  stockId,
      type:      'BUY',
      price:     currentPrice,
      indicator: 'RSI',
      rsi_value: rsiCurrent,
      sma20:     isFinite(sma20Current) ? sma20Current : null,
      sma50:     isFinite(sma50Current) ? sma50Current : null,
    };
  }

  if (isFinite(rsiCurrent) && rsiCurrent > 70) {
    return {
      stock_id:  stockId,
      type:      'SELL',
      price:     currentPrice,
      indicator: 'RSI',
      rsi_value: rsiCurrent,
      sma20:     isFinite(sma20Current) ? sma20Current : null,
      sma50:     isFinite(sma50Current) ? sma50Current : null,
    };
  }

  return null;
}
