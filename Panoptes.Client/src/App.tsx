import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import { DashboardLayout } from './layouts/DashboardLayout';

export const ThemeContext = createContext<{
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}>({ isDark: false, setIsDark: () => {} });

function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch (e) {}
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 4000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 5000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />
      
      <Router>
        <Routes>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Dashboard />} />
            <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;
