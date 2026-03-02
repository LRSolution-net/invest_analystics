// ─────────────────────────────────────────────────────────────
// Domain interfaces for the Investment Market Analysis platform
// ─────────────────────────────────────────────────────────────

/** User profile stored in public.profile_invest */
export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

/** A monitored stock / ticker */
export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector: string | null;
  active: boolean;
  created_at: string;
}

/** One day of OHLCV data for a stock */
export interface MarketData {
  id: string;
  stock_id: string;
  date: string;       // ISO date string "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at: string;
}

/** A generated BUY / SELL signal */
export interface Signal {
  id?: string;
  stock_id: string;
  type: 'BUY' | 'SELL';
  price: number;
  indicator: string;  // e.g. "SMA_CROSSOVER", "RSI"
  rsi_value: number | null;
  sma20: number | null;
  sma50: number | null;
  created_at?: string;
}

/** Raw price entry returned by the Alpha Vantage parser */
export interface DailyPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Shape expected by the Recharts PriceChart component */
export interface ChartDataPoint {
  date: string;
  close: number;
  sma20: number | null;
  sma50: number | null;
}
