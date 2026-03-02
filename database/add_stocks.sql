-- Adiciona as novas ações à tabela stocks (sem apagar as existentes)
-- Execute no Supabase SQL Editor

INSERT INTO public.stocks (symbol, name, sector) VALUES
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
