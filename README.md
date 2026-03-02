# 📈 InvestAnalytics — Investment Market Analysis POC

> Prova de Conceito de uma plataforma de análise de mercado que monitora ações e
> gera sinais automáticos de compra e venda usando indicadores técnicos (SMA, RSI).

---

## Stack Tecnológica

| Camada | Tecnologia | Custo |
|--------|-----------|-------|
| Frontend | React 18 + Vite + TypeScript | Grátis |
| Estilização | TailwindCSS | Grátis |
| Gráficos | Recharts | Grátis |
| Auth + Banco | Supabase (PostgreSQL + RLS) | Grátis (free tier) |
| Dados de Mercado | Alpha Vantage API | Grátis (25 req/dia) |
| Hospedagem | GitHub Pages | Grátis |

---

## Pré-requisitos

- Node.js ≥ 18
- Uma conta no [Supabase](https://supabase.com) (grátis)
- Uma API Key do [Alpha Vantage](https://www.alphavantage.co/support/#api-key) (grátis)
- Uma conta no GitHub

---

## Setup Local

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/investimentos.git
cd investimentos
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais reais:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ALPHA_VANTAGE_KEY=DEMO
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # apenas para o script server-side
```

> ⚠️ **Nunca** exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.

### 4. Configure o banco de dados no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com) → seu projeto → **SQL Editor**
2. Cole e execute o conteúdo de [`database/schema.sql`](database/schema.sql)

Isso criará as tabelas, índices, trigger de perfil e todas as políticas RLS.

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173)

---

## Coleta de Dados de Mercado

O script `scripts/fetchAndSaveMarketData.ts` busca os dados diários da Alpha Vantage
e os salva no Supabase. Execute manualmente ou agende com cron / GitHub Actions.

```bash
npm run fetch-data
```

O script processa os 5 símbolos padrão (`AAPL`, `MSFT`, `GOOGL`, `AMZN`, `TSLA`),
aguardando **15 segundos** entre cada requisição para respeitar o limite gratuito
da Alpha Vantage (5 req/min).

---

## Indicadores Técnicos

| Indicador | Descrição | Sinal BUY | Sinal SELL |
|-----------|-----------|-----------|------------|
| SMA Crossover | Cruzamento de médias móveis 20/50 dias | Golden Cross (SMA20 cruza acima da SMA50) | Death Cross (SMA20 cruza abaixo da SMA50) |
| RSI (14) | Relative Strength Index | RSI < 30 (sobrevendido) | RSI > 70 (sobrecomprado) |

---

## Estrutura do Projeto

```
investimentos/
├── .github/workflows/deploy.yml   # CI/CD para GitHub Pages
├── database/
│   └── schema.sql                 # Tabelas + RLS (executar no Supabase)
├── scripts/
│   └── fetchAndSaveMarketData.ts  # Script de coleta (Node.js)
├── src/
│   ├── components/
│   │   ├── PriceChart.tsx         # Gráfico de preços (Recharts)
│   │   ├── SignalBadge.tsx        # Badge BUY/SELL
│   │   └── StockCard.tsx          # Card de ação
│   ├── pages/
│   │   ├── Dashboard.tsx          # Página principal
│   │   ├── Login.tsx              # Login / Cadastro
│   │   └── StockDetail.tsx        # Detalhe de uma ação
│   ├── services/
│   │   ├── alphaVantage.ts        # Integração Alpha Vantage
│   │   ├── auth.ts                # Autenticação Supabase
│   │   ├── indicators.ts          # SMA, RSI, generateSignal
│   │   └── supabaseClient.ts      # Cliente Supabase (anon key)
│   ├── types/
│   │   └── index.ts               # Interfaces TypeScript
│   ├── App.tsx                    # Roteamento principal
│   └── main.tsx                   # Entry point React
├── .env.example                   # Template de variáveis de ambiente
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Deploy no GitHub Pages

### 1. Configure `vite.config.ts`

Atualize a propriedade `base` com o nome exato do seu repositório:

```ts
base: '/investimentos/',   // ← nome do repositório no GitHub
```

### 2. Configure os Secrets no GitHub

No repositório → **Settings** → **Secrets and variables** → **Actions**, adicione:

| Secret | Valor |
|--------|-------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key do Supabase |
| `VITE_ALPHA_VANTAGE_KEY` | API Key da Alpha Vantage |

> ⚠️ **Não** adicione `SUPABASE_SERVICE_ROLE_KEY` como secret de build — ele
> nunca deve ir para o frontend.

### 3. Ative o GitHub Pages

No repositório → **Settings** → **Pages** → Source: `gh-pages` branch.

### 4. Faça push na branch `main`

O workflow `.github/workflows/deploy.yml` será disparado automaticamente,
buildando e publicando o projeto.

---

## Executando o build de produção localmente

```bash
npm run build
npm run preview
```

---

## Limitações do Free Tier

| Serviço | Limite |
|---------|--------|
| Alpha Vantage | 25 req/dia, 5 req/min |
| Supabase | 500 MB banco, 2 GB transferência/mês |
| GitHub Pages | 1 GB storage, 100 GB bandwidth/mês |

---

## 📄 Licença

MIT — use livremente para fins educacionais.
