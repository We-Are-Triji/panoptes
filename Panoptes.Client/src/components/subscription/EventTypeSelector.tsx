import React from 'react';
import { ArrowRightLeft, Layers, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EventTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({ value, onChange }) => {
  const types = [
    {
      id: 'Transaction',
      label: 'Transaction',
      description: 'Any ADA or token movement',
      icon: ArrowRightLeft,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      borderColor: 'border-blue-500'
    },
    {
      id: 'NFT Mint',
      label: 'NFT Mint',
      description: 'Assets being created/burned',
      icon: Zap,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      borderColor: 'border-purple-500'
    },
    {
      id: 'Asset Move',
      label: 'Asset Move',
      description: 'Specific token transfers',
      icon: Layers,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      borderColor: 'border-orange-500'
    }
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Event Type
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {types.map((type) => (
          <label 
            key={type.id}
            className={cn(
              "relative flex flex-col items-start p-3 cursor-pointer rounded-lg border-2 transition-all duration-200",
              "hover:bg-gray-50 dark:hover:bg-gray-900/60",
              value === type.id 
                ? `bg-gray-50 dark:bg-gray-900 ${type.borderColor} ring-1 ${type.borderColor.replace('border', 'ring')}` 
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
            )}
          >
            <input
              type="radio"
              name="eventType"
              value={type.id}
              checked={value === type.id}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            
            <div className={cn("p-1.5 rounded-md mb-2", type.bg, type.color)}>
              <type.icon className="w-5 h-5" />
            </div>
            
            <span className={cn(
              "font-semibold text-sm mb-0.5",
              value === type.id ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
            )}>
              {type.label}
            </span>
            
            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              {type.description}
            </span>
            
            {/* Active Indicator Dot */}
            {value === type.id && (
              <div className={cn("absolute top-3 right-3 w-2 h-2 rounded-full", type.color.replace('text', 'bg'))} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
};