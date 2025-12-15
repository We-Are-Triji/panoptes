import React from 'react';
import { PieChart, Pie, Cell } from 'recharts'; // Added ResponsiveContainer
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface DistributionDataPoint {
  eventType: string;
  count: number;
  percentage: number;
  fill: string;
}

interface DistributionChartProps {
  data: DistributionDataPoint[];
  isLoading?: boolean;
}

function generateChartConfig(data: DistributionDataPoint[]): ChartConfig {
  const config: ChartConfig = {};
  data.forEach((item) => {
    config[item.eventType] = {
      label: item.eventType,
      color: item.fill,
    };
  });
  return config;
}

const DistributionChart: React.FC<DistributionChartProps> = ({
  data,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-[250px] flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse border-4 border-zinc-200 dark:border-zinc-700" />
        </div>
      </div>
    );
  }

  const chartConfig = generateChartConfig(data);

  // Filter out "Test" events if they exist (Quick fix for display accuracy)
  const cleanData = data.filter(d => ['Transaction', 'AssetMove', 'NftMint'].includes(d.eventType) || d.count > 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-bold">
            Event Distribution
          </h3>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Webhooks by event type
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {cleanData.length}
          </p>
          <p className="text-[10px] uppercase font-mono text-zinc-500 dark:text-zinc-400">types</p>
        </div>
      </div>

      {cleanData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs min-h-[200px]">
          NO_DISTRIBUTION_DATA
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row items-center gap-6 flex-1">
            
          {/* Chart Section - Now responsive */}
          <div className="w-full xl:w-1/2 h-[220px] min-h-[220px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex items-center gap-2 font-mono text-xs">
                           <span className="font-bold">{name}:</span>
                           <span>{value}</span>
                           <span className="text-zinc-400">({cleanData.find(d => d.eventType === name)?.percentage}%)</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={cleanData}
                  dataKey="count"
                  nameKey="eventType"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  strokeWidth={2}
                  stroke="transparent" 
                >
                  {cleanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>
          
          {/* Legend Section - Takes remaining space */}
          <div className="w-full xl:w-1/2 space-y-2 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
            {cleanData.map((item) => (
              <div
                key={item.eventType}
                className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0 group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-sm px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shadow-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300 uppercase tracking-tight">
                    {item.eventType}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400 w-8 text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DistributionChart;