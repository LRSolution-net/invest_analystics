import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface MiniChartProps {
  data: number[];
  positive: boolean;
}

/**
 * Tiny sparkline area chart used inside StockCard.
 */
export default function MiniChart({ data, positive }: MiniChartProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  const color = positive ? '#34d399' : '#f87171';

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`mg-${positive}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0}   />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#mg-${positive})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
