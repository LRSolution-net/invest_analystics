import type { DailyPrice } from '../types';

const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY as string;
const BASE_URL = 'https://www.alphavantage.co/query';

/** Raw shape of a single day returned by Alpha Vantage. */
interface AlphaVantageDay {
  '1. open': string;
  '2. high': string;
  '3. low': string;
  '4. close': string;
  '5. volume': string;
}

/** Full response envelope from TIME_SERIES_DAILY. */
interface AlphaVantageDailyResponse {
  'Meta Data'?: { [key: string]: string };
  'Time Series (Daily)'?: { [date: string]: AlphaVantageDay };
  Note?: string;
  Information?: string;
}

/**
 * Fetch daily OHLCV data for a given ticker symbol from Alpha Vantage.
 *
 * @param symbol  - Ticker symbol, e.g. "AAPL" or "PETR4.SA"
 * @returns       Array of DailyPrice objects sorted by date ascending (last 100 days)
 * @throws        Error on network failure or when the API returns an error message
 */
export async function fetchDailyPrices(symbol: string): Promise<DailyPrice[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set('function', 'TIME_SERIES_DAILY');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('outputsize', 'compact'); // last ~100 trading days
  url.searchParams.set('apikey', API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Alpha Vantage HTTP error: ${response.status} ${response.statusText}`);
  }

  const data: AlphaVantageDailyResponse = await response.json();

  // Handle API-level errors (rate limit, invalid key, etc.)
  if (data.Note) {
    throw new Error(`Alpha Vantage note: ${data.Note}`);
  }
  if (data.Information) {
    throw new Error(`Alpha Vantage info: ${data.Information}`);
  }
  if (!data['Time Series (Daily)']) {
    throw new Error(`No price data returned for symbol "${symbol}"`);
  }

  const timeSeries = data['Time Series (Daily)'];

  // Parse and sort by date ascending, then return last 100
  const prices: DailyPrice[] = Object.entries(timeSeries)
    .map(([date, day]) => ({
      date,
      open: parseFloat(day['1. open']),
      high: parseFloat(day['2. high']),
      low: parseFloat(day['3. low']),
      close: parseFloat(day['4. close']),
      volume: parseInt(day['5. volume'], 10),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-100);

  return prices;
}
