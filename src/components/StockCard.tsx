import { useNavigate } from 'react-router-dom';
import type { Stock, Signal, MarketData } from '../types';
import SignalBadge from './SignalBadge';
import MiniChart from './MiniChart';

interface StockCardProps {
  stock: Stock;
  latestData: MarketData | null;
  latestSignal: Signal | null;
  recentCloses: number[];
}

export default function StockCard({ stock, latestData, latestSignal, recentCloses }: StockCardProps) {
  const navigate = useNavigate();

  const changePercent =
    latestData && latestData.open !== 0
      ? ((latestData.close - latestData.open) / latestData.open) * 100
      : null;

  const isPositive = changePercent !== null && changePercent >= 0;

  const borderClass = latestSignal
    ? latestSignal.type === 'BUY' ? 'card-buy' : 'card-sell'
    : 'card-neutral';

  // Sector colour pill
  const sectorColors: Record<string, string> = {
    Technology:             'bg-blue-900/50 text-blue-300',
    'Consumer Cyclical':    'bg-orange-900/50 text-orange-300',
    'Financial Services':   'bg-yellow-900/50 text-yellow-300',
    'Communication Services': 'bg-purple-900/50 text-purple-300',
    'Consumer Defensive':   'bg-teal-900/50 text-teal-300',
  };
  const sectorClass = stock.sector ? (sectorColors[stock.sector] ?? 'bg-gray-800 text-gray-400') : '';

  return (
    <button
      onClick={() => navigate(`/stock/${stock.id}`)}
      className={`w-full text-left bg-gray-900 hover:bg-gray-800 border rounded-2xl p-4 transition-all duration-300 cursor-pointer group ${borderClass}`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-white group-hover:text-blue-400 transition-colors tracking-tight">
              {stock.symbol}
            </span>
            {stock.sector && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${sectorClass}`}>
                {stock.sector.replace('Consumer ', '').replace(' Services', '')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate max-w-[150px] mt-0.5">{stock.name}</p>
        </div>
        <SignalBadge signal={latestSignal} showIndicator={false} />
      </div>

      {/* Sparkline */}
      {recentCloses.length > 2 && (
        <div className="my-2 -mx-1">
          <MiniChart data={recentCloses} positive={isPositive} />
        </div>
      )}

      {/* Price row */}
      {latestData ? (
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xl font-mono font-bold text-white">
              ${latestData.close.toFixed(2)}
            </p>
            {changePercent !== null && (
              <div className={`flex items-center gap-1 text-xs font-semibold mt-0.5 ${
                isPositive ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
                <span className="text-gray-600 font-normal">hoje</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-600">{latestData.date}</p>
            <p className="text-[10px] text-gray-600">
              Vol: {(latestData.volume / 1_000_000).toFixed(1)}M
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-xs mt-2">Sem dados</p>
      )}
    </button>
  );
}
