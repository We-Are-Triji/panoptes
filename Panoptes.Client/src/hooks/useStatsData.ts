import { useState, useEffect, useMemo, useCallback } from 'react';
import { getLogs } from '../services/api';
import { DeliveryLog, WebhookSubscription } from '../types';

export type TimeRange = '24h' | '7d' | '30d';

interface VolumeDataPoint {
  date: string;
  count: number;
  label: string;
}

interface DistributionDataPoint {
  eventType: string;
  count: number;
  percentage: number;
  fill: string;
}

interface StatsData {
  totalWebhooks: number;
  successRate: number;
  avgLatency: number;
  rateLimitedCount: number;
  volumeData: VolumeDataPoint[];
  distributionData: DistributionDataPoint[];
  isLoading: boolean;
  error: string | null;
}

// Chart colors from design system
const CHART_COLORS = [
  'hsl(147, 100%, 21%)',  // chart-1 - Sentinel Green
  'hsl(160, 60%, 45%)',   // chart-2
  'hsl(30, 80%, 55%)',    // chart-3
  'hsl(280, 65%, 60%)',   // chart-4
  'hsl(340, 75%, 55%)',   // chart-5
];

function getTimeRangeParams(timeRange: TimeRange): { hours: number; bucketSize: 'hour' | 'day' } {
  switch (timeRange) {
    case '24h':
      return { hours: 24, bucketSize: 'hour' };
    case '7d':
      return { hours: 24 * 7, bucketSize: 'day' };
    case '30d':
      return { hours: 24 * 30, bucketSize: 'day' };
    default:
      return { hours: 24 * 7, bucketSize: 'day' };
  }
}

function filterLogsByTimeRange(logs: DeliveryLog[], timeRange: TimeRange): DeliveryLog[] {
  const { hours } = getTimeRangeParams(timeRange);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return logs.filter(log => new Date(log.attemptedAt) >= cutoff);
}

function groupLogsByTimeBucket(
  logs: DeliveryLog[],
  timeRange: TimeRange
): VolumeDataPoint[] {
  const { hours, bucketSize } = getTimeRangeParams(timeRange);
  const now = new Date();
  const buckets: Map<string, number> = new Map();
  
  // Initialize all buckets with 0
  const bucketCount = bucketSize === 'hour' ? hours : Math.ceil(hours / 24);
  for (let i = bucketCount - 1; i >= 0; i--) {
    const date = new Date(now);
    if (bucketSize === 'hour') {
      date.setHours(date.getHours() - i);
      date.setMinutes(0, 0, 0);
    } else {
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
    }
    const key = bucketSize === 'hour' 
      ? date.toISOString().slice(0, 13) // "2024-01-15T14"
      : date.toISOString().slice(0, 10); // "2024-01-15"
    buckets.set(key, 0);
  }
  
  // Count logs in each bucket
  logs.forEach(log => {
    const logDate = new Date(log.attemptedAt);
    const key = bucketSize === 'hour'
      ? logDate.toISOString().slice(0, 13)
      : logDate.toISOString().slice(0, 10);
    
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
  });
  
  // Convert to array with formatted labels
  return Array.from(buckets.entries()).map(([key, count]) => {
    const date = new Date(bucketSize === 'hour' ? `${key}:00:00Z` : `${key}T00:00:00Z`);
    let label: string;
    
    if (bucketSize === 'hour') {
      label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    return { date: key, count, label };
  });
}

function groupLogsByEventType(
  logs: DeliveryLog[],
  subscriptions: WebhookSubscription[]
): DistributionDataPoint[] {
  const subscriptionMap = new Map(subscriptions.map(s => [s.id, s]));
  const eventTypeCounts: Map<string, number> = new Map();
  
  logs.forEach(log => {
    const subscription = subscriptionMap.get(log.subscriptionId);
    const eventType = subscription?.eventType || 'Unknown';
    eventTypeCounts.set(eventType, (eventTypeCounts.get(eventType) || 0) + 1);
  });
  
  const total = logs.length || 1; // Avoid division by zero
  
  return Array.from(eventTypeCounts.entries())
    .map(([eventType, count], index) => ({
      eventType,
      count,
      percentage: Math.round((count / total) * 100),
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateSuccessRate(logs: DeliveryLog[]): number {
  if (logs.length === 0) return 0;
  
  const successfulLogs = logs.filter(
    log => log.responseStatusCode >= 200 && log.responseStatusCode < 300
  );
  
  return Math.round((successfulLogs.length / logs.length) * 100);
}

function calculateAvgLatency(logs: DeliveryLog[]): number {
  if (logs.length === 0) return 0;
  
  const totalLatency = logs.reduce((sum, log) => sum + log.latencyMs, 0);
  return Math.round(totalLatency / logs.length);
}

export function useStatsData(
  subscriptions: WebhookSubscription[],
  initialTimeRange: TimeRange = '7d'
) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const [allLogs, setAllLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch logs - get a larger batch for stats
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch up to 1000 logs for stats (adjust based on expected volume)
      const response = await getLogs(0, 1000);
      setAllLogs(response.logs);
    } catch (err: any) {
      console.error('Error fetching stats data:', err);
      setError(err.message || 'Failed to fetch statistics data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Filter and calculate stats based on time range
  const statsData = useMemo((): StatsData => {
    const filteredLogs = filterLogsByTimeRange(allLogs, timeRange);
    
    // Calculate rate-limited subscriptions
    const rateLimitedCount = subscriptions.filter(s => s.isRateLimited).length;
    
    return {
      totalWebhooks: filteredLogs.length,
      successRate: calculateSuccessRate(filteredLogs),
      avgLatency: calculateAvgLatency(filteredLogs),
      rateLimitedCount,
      volumeData: groupLogsByTimeBucket(filteredLogs, timeRange),
      distributionData: groupLogsByEventType(filteredLogs, subscriptions),
      isLoading,
      error,
    };
  }, [allLogs, subscriptions, timeRange, isLoading, error]);

  return {
    ...statsData,
    timeRange,
    setTimeRange,
    refetch: fetchLogs,
  };
}

