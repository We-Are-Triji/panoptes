import React from 'react';

interface AdvancedOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionName: string;
  deliverLatestOnly: boolean;
  onDeliverLatestOnlyChange: (value: boolean) => void;
}

const AdvancedOptionsModal: React.FC<AdvancedOptionsModalProps> = ({
  isOpen,
  onClose,
  subscriptionName,
  deliverLatestOnly,
  onDeliverLatestOnlyChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Advanced Options</h2>
              <p className="text-sm text-gray-500 mt-1">{subscriptionName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Delivery Behavior Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                Delivery Behavior
              </h3>
              
              {/* Latest Only Toggle */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-900">
                      Deliver Latest Only
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      When resuming from a paused state, only the most recent halted event will be delivered. 
                      All other queued events will be discarded.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={deliverLatestOnly}
                    onClick={() => onDeliverLatestOnlyChange(!deliverLatestOnly)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                      deliverLatestOnly ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        deliverLatestOnly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                
                {/* Status indicator */}
                <div className={`mt-3 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
                  deliverLatestOnly 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    deliverLatestOnly ? 'bg-amber-500' : 'bg-green-500'
                  }`}/>
                  {deliverLatestOnly 
                    ? 'Only latest event will be delivered on resume' 
                    : 'All queued events will be delivered on resume'}
                </div>
              </div>
            </div>

            {/* Placeholder for future options */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-400 italic">
                More advanced options coming soon...
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedOptionsModal;
