import React, { useState, useEffect } from 'react';
import { EventTypeSelector } from './subscription/EventTypeSelector';
import { WalletAddressInput } from './subscription/WalletAddressInput';
import { triggerDirectWebhookTest } from '../services/api'; 
import toast from 'react-hot-toast';

interface CreateSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { 
    name: string; 
    targetUrl: string; 
    eventType: string; 
    walletAddresses?: string[];
    minimumLovelace?: number;
  }) => void;
  initialValues?: {
    name?: string;
    eventType?: string;
  };
}

const CreateSubscriptionModal: React.FC<CreateSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  initialValues,
}) => {
  // --- Form State ---
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [eventType, setEventType] = useState('Transaction');
  const [minAda, setMinAda] = useState('');
  const [filterTargets, setFilterTargets] = useState<string[]>([]);

  // --- UI State ---
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showFirehoseWarning, setShowFirehoseWarning] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      if (initialValues) {
        setName(initialValues.name || '');
        setEventType(initialValues.eventType || 'Transaction');
      } else {
        setName('');
        setEventType('Transaction');
      }
      setTargetUrl('');
      setMinAda('');
      setFilterTargets([]);
      setIsValidatingUrl(false);
      setShowFirehoseWarning(false);
    }
  }, [isOpen, initialValues]);

  // --- Helpers for Dynamic UI ---
  const getFilterConfig = (type: string) => {
    switch (type) {
      case 'NFT Mint':
        return {
          label: 'Policy IDs',
          placeholder: 'Paste Policy ID (Hex)...',
          description: 'Only trigger when assets with these Policy IDs are minted or burned.'
        };
      case 'Asset Move':
        return {
          label: 'Asset / Policy Filters',
          placeholder: 'PolicyID or AssetFingerprint...',
          description: 'Trigger when specific assets are moved between wallets.'
        };
      case 'Transaction':
      default:
        return {
          label: 'Wallet Addresses',
          placeholder: 'addr1... or stake1...',
          description: 'Leave empty to listen to ALL network transactions (Firehose Mode).'
        };
    }
  };

  const filterConfig = getFilterConfig(eventType);

  // --- Actions ---

  const handleTestConnection = async () => {
    if (!targetUrl) return;
    if (!targetUrl.startsWith('http')) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    setIsTestingConnection(true);
    const toastId = toast.loading('Pinging webhook...');

    try {
      await triggerDirectWebhookTest('test-connection', {
        Event: 'Test',
        Message: 'Panoptes connection verification',
        Timestamp: new Date().toISOString()
      });
      toast.success('Connection Successful! (200 OK)', { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(`Connection Failed: ${err.message || 'Unknown error'}`, { id: toastId });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isFormValid = name.trim().length > 0 && targetUrl.startsWith('http');

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    // Check for Firehose condition (Transaction type with no filters)
    if (filterTargets.length === 0 && eventType === 'Transaction') {
      setShowFirehoseWarning(true);
    } else {
      executeCreate();
    }
  };

  const executeCreate = () => {
    let lovelace: number | undefined = undefined;
    if (minAda && !isNaN(parseFloat(minAda))) {
       const val = parseFloat(minAda);
       if (val > 0) lovelace = Math.floor(val * 1_000_000);
    }

    onCreate({
      name: name.trim(),
      targetUrl: targetUrl.trim(),
      eventType,
      walletAddresses: filterTargets.length > 0 ? filterTargets : undefined,
      minimumLovelace: lovelace
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-gray-900/75 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl bg-white dark:bg-black rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-michroma tracking-wide">New Subscription</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">Configure trigger and filters</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-200 transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                
                {/* LEFT: Core Config */}
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Friendly Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Main Wallet Tracker"
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Webhook URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="https://api.mysite.com/webhook"
                        className={`w-full h-10 pl-3 pr-20 rounded-lg border bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm font-mono ${
                          targetUrl && !targetUrl.startsWith('http')
                            ? 'border-red-500' 
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={!targetUrl || isTestingConnection}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
                      >
                        {isTestingConnection ? '...' : 'Test'}
                      </button>
                    </div>
                  </div>

                  {/* Visual Event Selector */}
                  <EventTypeSelector value={eventType} onChange={setEventType} />

                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      Min Value
                      <span className="text-[10px] text-gray-500 font-normal bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">Optional</span>
                    </label>
                    <div className="relative">
                        <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={minAda}
                        onChange={(e) => setMinAda(e.target.value)}
                        className="w-full h-10 pl-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-sentinel focus:border-sentinel transition-all placeholder:text-gray-500 text-sm font-mono"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-bold">ADA</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Dynamic Chips Input */}
                <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
                  <WalletAddressInput 
                    addresses={filterTargets}
                    onChange={setFilterTargets}
                    label={filterConfig.label}
                    placeholder={filterConfig.placeholder}
                    description={filterConfig.description}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={onClose}
              disabled={isValidatingUrl}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePreSubmit}
              disabled={isValidatingUrl || !isFormValid}
              className={`
                px-6 py-2 text-sm font-bold text-black rounded-lg shadow-sm
                transition-all transform active:scale-95
                ${!isFormValid
                  ? 'bg-sentinel/50 cursor-not-allowed' 
                  : 'bg-sentinel hover:bg-sentinel-hover shadow-sentinel/20'}
              `}
            >
              Create Subscription
            </button>
          </div>

          {/* Warning Modals */}
          {showFirehoseWarning && (
             <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm p-6">
                <div className="bg-white dark:bg-black border-2 border-yellow-500 rounded-xl max-w-md w-full p-6 shadow-2xl">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">High Traffic Warning</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                        You are about to listen to <strong>EVERY transaction</strong> (Firehose Mode). This may generate significant load.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <button onClick={() => setShowFirehoseWarning(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg">Back</button>
                        <button onClick={executeCreate} className="px-4 py-2 text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-500 rounded-lg">Proceed</button>
                    </div>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSubscriptionModal;