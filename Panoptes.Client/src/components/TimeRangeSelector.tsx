import React from 'react';
import { TimeRange } from '../hooks/useStatsData';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  className?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`inline-flex rounded-tech border border-gray-300 bg-white overflow-hidden ${className}`}>
      {TIME_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            value === option.value
              ? 'bg-sentinel text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          } ${
            option.value !== TIME_RANGE_OPTIONS[TIME_RANGE_OPTIONS.length - 1].value
              ? 'border-r border-gray-300'
              : ''
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;

