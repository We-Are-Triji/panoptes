import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { TimeRange } from '../hooks/useStatsData';

interface VolumeDataPoint {
  date: string;
  count: number;
  label: string;
}

interface VolumeChartProps {
  data: VolumeDataPoint[];
  timeRange: TimeRange;
  isLoading?: boolean;
}

const chartConfig: ChartConfig = {
  count: {
    label: 'Webhooks',
    color: 'hsl(147, 100%, 21%)', // Sentinel Green
  },
};

const VolumeChart: React.FC<VolumeChartProps> = ({
  data,
  timeRange,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[300px] bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const yAxisMax = Math.ceil(maxCount * 1.1); // Add 10% padding

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-gray-500">
            Webhook Volume
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {timeRange === '24h' ? 'Hourly' : 'Daily'} webhook activity
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-semibold text-gray-900">
            {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">total webhooks</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          <p>No data available for selected time range</p>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(147, 100%, 21%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(147, 100%, 21%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Space Mono, monospace' }}
              tickMargin={8}
              interval={timeRange === '24h' ? 3 : 'preserveStartEnd'}
            />
            <YAxis
              domain={[0, yAxisMax]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: 'Space Mono, monospace' }}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => `Time: ${value}`}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(147, 100%, 21%)"
              strokeWidth={2}
              fill="url(#volumeGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: 'hsl(147, 100%, 21%)',
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
};

export default VolumeChart;

