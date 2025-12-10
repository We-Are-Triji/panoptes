import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createContext, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import Health from './pages/Health';
import { DashboardLayout } from './layouts/DashboardLayout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import Auth

export const ThemeContext = createContext<{
  isDark: boolean;
  setIsDark: (v: boolean) => void;
}>({ isDark: false, setIsDark: () => {} });

// Real Auth Guard
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // Simple loading state
    return <div className="min-h-screen bg-black flex items-center justify-center text-sentinel font-mono">INITIALIZING_UPLINK...</div>;
  }

  if (!user) {
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Redirects authenticated users away from Landing/Login
function RedirectIfAuthenticated({ children }: { children: JSX.Element }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) return <Navigate to="/" replace />;
    return <>{children}</>;
}

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
    <AuthProvider>
      <ThemeContext.Provider value={{ isDark, setIsDark }}>
        <Toaster
            position="top-right"
            toastOptions={{
            style: { background: '#333', color: '#fff' },
            success: { style: { background: '#10b981', color: '#fff' } },
            error: { style: { background: '#ef4444', color: '#fff' } },
            }}
        />
        
        <Router>
            <Routes>
                {/* Public Routes (Redirect to Dashboard if logged in) */}
                <Route path="/landing" element={<RedirectIfAuthenticated><Landing /></RedirectIfAuthenticated>} />
                <Route path="/login" element={<RedirectIfAuthenticated><Login /></RedirectIfAuthenticated>} />
                
                {/* Protected Routes */}
                <Route element={<DashboardLayout />}>
                    <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
                    <Route path="/analytics" element={<RequireAuth><Dashboard /></RequireAuth>} />
                    <Route path="/health" element={<RequireAuth><Health /></RequireAuth>} />
                    <Route path="/subscriptions/:id" element={<RequireAuth><SubscriptionDetail /></RequireAuth>} />
                    <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                </Route>
            </Routes>
        </Router>
      </ThemeContext.Provider>
    </AuthProvider>
  );
}

export default App;