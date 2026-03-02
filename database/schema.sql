-- ============================================================
-- INVESTMENT MARKET ANALYSIS PLATFORM — DATABASE SCHEMA
-- Run this in Supabase SQL Editor to configure the database
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- TABLE: profile_invest
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profile_invest (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profile_invest (id, email, role)
  VALUES (NEW.id, NEW.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- TABLE: stocks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stocks (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol     TEXT        NOT NULL UNIQUE,
  name       TEXT        NOT NULL,
  sector     TEXT,
  active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial stocks
INSERT INTO public.stocks (symbol, name, sector) VALUES
  ('AAPL',  'Apple Inc.',              'Technology'),
  ('MSFT',  'Microsoft Corporation',   'Technology'),
  ('GOOGL', 'Alphabet Inc.',           'Technology'),
  ('AMZN',  'Amazon.com Inc.',         'Consumer Cyclical'),
  ('TSLA',  'Tesla Inc.',              'Consumer Cyclical'),
  ('META',  'Meta Platforms Inc.',     'Technology'),
  ('NVDA',  'NVIDIA Corporation',      'Technology'),
  ('NFLX',  'Netflix Inc.',            'Communication Services'),
  ('AMD',   'Advanced Micro Devices',  'Technology'),
  ('JPM',   'JPMorgan Chase & Co.',    'Financial Services'),
  ('V',     'Visa Inc.',               'Financial Services'),
  ('DIS',   'The Walt Disney Co.',     'Communication Services'),
  ('WMT',   'Walmart Inc.',            'Consumer Defensive'),
  ('PYPL',  'PayPal Holdings Inc.',    'Financial Services'),
  ('BABA',  'Alibaba Group',           'Consumer Cyclical')
ON CONFLICT (symbol) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- TABLE: market_data
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_data (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id   UUID        NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  open       NUMERIC(18,4) NOT NULL,
  high       NUMERIC(18,4) NOT NULL,
  low        NUMERIC(18,4) NOT NULL,
  close      NUMERIC(18,4) NOT NULL,
  volume     BIGINT      NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stock_id, date)
);

CREATE INDEX IF NOT EXISTS idx_market_data_stock_date ON public.market_data(stock_id, date DESC);

-- ─────────────────────────────────────────────────────────────
-- TABLE: signals
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signals (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_id   UUID        NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN ('BUY', 'SELL')),
  price      NUMERIC(18,4) NOT NULL,
  indicator  TEXT        NOT NULL,
  rsi_value  NUMERIC(8,4),
  sma20      NUMERIC(18,4),
  sma50      NUMERIC(18,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_stock_created ON public.signals(stock_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- RLS: profile_invest
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.profile_invest ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "profile_invest_select_own"
  ON public.profile_invest FOR SELECT
  USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profile_invest_update_own"
  ON public.profile_invest FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- RLS: stocks
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read stocks
CREATE POLICY "stocks_select_authenticated"
  ON public.stocks FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert stocks
CREATE POLICY "stocks_insert_admin"
  ON public.stocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_invest
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update stocks
CREATE POLICY "stocks_update_admin"
  ON public.stocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_invest
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete stocks
CREATE POLICY "stocks_delete_admin"
  ON public.stocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profile_invest
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: market_data
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read market data
CREATE POLICY "market_data_select_authenticated"
  ON public.market_data FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert market data
CREATE POLICY "market_data_insert_admin"
  ON public.market_data FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_invest
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: signals
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read signals
CREATE POLICY "signals_select_authenticated"
  ON public.signals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can insert signals
CREATE POLICY "signals_insert_admin"
  ON public.signals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profile_invest
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
