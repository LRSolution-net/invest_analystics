import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartDataPoint } from '../types';

interface PriceChartProps {
  data: ChartDataPoint[];
  symbol: string;
}

/**
 * Recharts line chart showing close price, SMA-20, and SMA-50.
 */
export default function PriceChart({ data, symbol }: PriceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-xl border border-gray-700">
        <p className="text-gray-400 text-sm">No chart data available</p>
      </div>
    );
  }

  // Format date labels to show only last 5 chars: "MM-DD"
  const tickFormatter = (value: string) => value.slice(5);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">
        {symbol} — Price &amp; Moving Averages
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            width={60}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#D1D5DB' }}
            formatter={(value: number, name: string) => [`$${value?.toFixed(2) ?? 'N/A'}`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#9CA3AF' }} />
          <Line
            type="monotone"
            dataKey="close"
            name="Close"
            stroke="#60A5FA"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="sma20"
            name="SMA 20"
            stroke="#34D399"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="sma50"
            name="SMA 50"
            stroke="#F59E0B"
            dot={false}
            strokeWidth={1.5}
            strokeDasharray="4 2"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
