import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';

// Page imports
import LoginPage from './app/login/page';
import RegisterPage from './app/register/page';
import DashboardPage from './app/page';
import TreeDetailPage from './app/trees/[id]/page';
import PublicTreeDetailPage from './app/public/trees/[id]/page';

// Route guards
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, initialize } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    initialize();
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, initialize } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    initialize();
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated || token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/trees/:id',
    element: (
      <ProtectedRoute>
        <TreeDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/public/trees/:id',
    element: <PublicTreeDetailPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  );
}

export default App;
