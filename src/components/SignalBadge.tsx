import type { Signal } from '../types';

interface SignalBadgeProps {
  signal: Signal | null;
  showIndicator?: boolean;
}

export default function SignalBadge({ signal, showIndicator = true }: SignalBadgeProps) {
  if (!signal) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-500 border border-gray-700">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        NEUTRO
      </span>
    );
  }

  const isBuy = signal.type === 'BUY';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
        isBuy
          ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
          : 'bg-red-950 text-red-300 border-red-700/60'
      }`}
    >
      {/* animated pulse dot */}
      <span className={`relative flex w-1.5 h-1.5`}>
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${
          isBuy ? 'bg-emerald-400' : 'bg-red-400'
        }`} />
        <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${
          isBuy ? 'bg-emerald-400' : 'bg-red-400'
        }`} />
      </span>
      {isBuy ? '▲' : '▼'} {signal.type}
      {showIndicator && (
        <span className="opacity-60 font-normal normal-case tracking-normal">{signal.indicator}</span>
      )}
    </span>
  );
}
