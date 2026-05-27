import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, initialize } = useAuthStore();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const APP_NAME = import.meta.env.VITE_APP_NAME || 'Kinova';

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      login(data.access_token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] dark:bg-[#121213] text-[#1c1c1e] dark:text-[#f3f3f5] p-6 transition-colors duration-300">
      <div className="w-full max-w-md p-10 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
            {APP_NAME} Register
          </span>
          <h1 className="text-3xl font-serif font-medium mt-2 tracking-tight">
            Create Account
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-light">
            Start documenting your ancestry silsilah
          </p>
        </div>

        {error && (
          <div className="p-3.5 mb-6 text-xs text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adhi Kartowidjojo"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="•••••••• (min 8 characters)"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] hover:bg-slate-800 dark:hover:bg-white font-medium text-sm transition-all duration-350 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] mt-2"
          >
            {loading ? 'Initializing Records...' : 'Register Account'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-8">
          Already have silsilah access?{' '}
          <Link to="/login" className="text-[#7b8e7f] hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
