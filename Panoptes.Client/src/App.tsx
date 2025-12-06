import { useEffect, useState } from 'react';
import { getSubscriptions, getLogs, createSubscription, triggerTestEvent } from './services/api';
import { WebhookSubscription, DeliveryLog } from './types';
import StatCard from './components/StatCard';
import SubscriptionTable from './components/SubscriptionTable';
import LogViewer from './components/LogViewer';

function App() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);

  const fetchData = async () => {
    try {
      const [subsData, logsData] = await Promise.all([
        getSubscriptions(),
        getLogs()
      ]);
      setSubscriptions(subsData);
      setLogs(logsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTest = async (id: string) => {
    try {
      await triggerTestEvent(id);
      // Refresh logs immediately after test
      const logsData = await getLogs();
      setLogs(logsData);
    } catch (error) {
      console.error("Error triggering test:", error);
    }
  };

  const handleCreate = async () => {
    // Simple prompt for demo purposes
    const name = prompt("Enter subscription name:");
    if (!name) return;
    const url = prompt("Enter target URL:");
    if (!url) return;
    const secret = prompt("Enter secret key:");
    if (!secret) return;

    try {
      await createSubscription({
        name,
        targetUrl: url,
        secretKey: secret,
        eventType: "transaction",
        isActive: true,
        targetAddress: null,
        policyId: null
      });
      fetchData();
    } catch (error) {
      console.error("Error creating subscription:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Panoptes</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
          <StatCard 
            title="Active Subscriptions" 
            value={subscriptions.filter(s => s.isActive).length}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          />
          <StatCard 
            title="Total Deliveries" 
            value={logs.length}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
          <StatCard 
            title="Success Rate" 
            value={`${logs.length > 0 ? Math.round((logs.filter(l => l.responseStatusCode >= 200 && l.responseStatusCode < 300).length / logs.length) * 100) : 0}%`}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Subscriptions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Subscriptions</h2>
              <button 
                onClick={handleCreate}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                New Subscription
              </button>
            </div>
            <SubscriptionTable subscriptions={subscriptions} onTest={handleTest} />
          </div>

          {/* Right Column: Logs */}
          <div className="lg:col-span-1 h-[600px]">
            <LogViewer logs={logs} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
