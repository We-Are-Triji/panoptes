import React, { useState, KeyboardEvent } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface WalletAddressInputProps {
  addresses: string[];
  onChange: (addresses: string[]) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  description?: string;
}

export const WalletAddressInput: React.FC<WalletAddressInputProps> = ({ 
  addresses = [], 
  onChange, 
  error,
  label = "Wallet Addresses",
  placeholder = "addr1... (Press Enter)",
  description = "Leave empty to listen to ALL events."
}) => {
  const [inputValue, setInputValue] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const isValidInput = (val: string) => {
    // 1. Cardano Addresses (addr1..., stake1...)
    if (val.startsWith('addr') || val.startsWith('stake')) return true;
    // 2. Policy IDs / Asset IDs (Hex strings)
    if (/^[0-9a-fA-F]+$/.test(val)) return true;
    
    return false;
  };

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (addresses.includes(trimmed)) {
      setLocalError('Value already added');
      return;
    }

    if (!isValidInput(trimmed)) {
      setLocalError('Invalid format (must be address or hex ID)');
      return;
    }

    onChange([...addresses, trimmed]);
    setInputValue('');
    setLocalError(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && addresses.length > 0) {
      onChange(addresses.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(addresses.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            {addresses.length} added
        </span>
      </div>
      
      <div className={`
        min-h-[42px] p-1.5 border rounded-lg bg-white dark:bg-black transition-all focus-within:ring-2 focus-within:ring-sentinel/50 focus-within:border-sentinel
        ${error || localError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}
      `}>
        <div className="flex flex-wrap gap-2">
          {addresses.map((addr, index) => (
            <div 
              key={index} 
              className="flex items-center gap-1 bg-sentinel/10 border border-sentinel/20 text-sentinel px-2 py-1 rounded-md text-xs font-mono"
            >
              <span className="truncate max-w-[150px]">{addr}</span>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="hover:bg-sentinel/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (localError) setLocalError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => inputValue && addTag(inputValue)}
            className="flex-1 min-w-[140px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-0 p-1 font-mono"
            placeholder={addresses.length === 0 ? placeholder : "Add another..."}
          />
        </div>
      </div>

      {(error || localError) && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {localError || error}
        </p>
      )}
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
};