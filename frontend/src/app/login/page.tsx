import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const { login, isAuthenticated, initialize, loginWithGoogle } =
    useAuthStore();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const APP_NAME = import.meta.env.VITE_APP_NAME || "Kinova";

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code && !isProcessingOAuth && !isAuthenticated) {
      setIsProcessingOAuth(true);
      loginWithGoogle(code)
        .then(() => navigate("/"))
        .catch((err) => {
          setError(err.message);
          setIsProcessingOAuth(false);
        });
    }
  }, [loginWithGoogle, navigate, isAuthenticated, isProcessingOAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      login(data.access_token, data.user);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInClick = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google/redirect`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError("Failed to initialize Google authentication stream.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] dark:bg-[#121213] text-[#1c1c1e] dark:text-[#f3f3f5] p-6 transition-colors duration-300">
      <div className="w-full max-w-md p-10 rounded-2xl bg-white dark:bg-[#1a1a1c] border border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#7b8e7f] dark:text-[#9cb2a2]">
            {APP_NAME} Archive
          </span>
          <h1 className="text-3xl font-serif font-medium mt-2 tracking-tight">
            Sign In
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-light">
            Enter your credentials to access silsilah records
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
              Email Address
            </label>
            <input
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-[#e6e5e0] dark:border-[#2c2c2e] text-[#1c1c1e] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#7b8e7f] focus:ring-1 focus:ring-[#7b8e7f] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition-colors disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isProcessingOAuth}
            className="w-full py-3 px-4 rounded-lg bg-[#1c1c1e] dark:bg-[#f3f3f5] text-white dark:text-[#1c1c1e] hover:bg-slate-800 dark:hover:bg-white font-medium text-sm transition-all duration-350 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.99] mt-2"
          >
            {loading ? "Entering Records..." : "Access Archive"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#e6e5e0] dark:border-[#2c2c2e]"></span>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="px-3 bg-white dark:bg-[#1a1a1c] text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignInClick}
          disabled={loading || isProcessingOAuth}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border font-medium text-sm transition-all bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-[#1c1c1e] dark:text-[#f3f3f5] border-[#e6e5e0] dark:border-[#2c2c2e] shadow-xs disabled:opacity-50 cursor-pointer active:scale-[0.99]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.35 1 3.37 3.68 1.44 7.6l3.87 3c.92-2.76 3.51-4.56 6.69-4.56z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57v2.97h3.91c2.28-2.1 3.54-5.19 3.54-8.69z"
            />
            <path
              fill="#FBBC05"
              d="M5.31 14.4c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.44 6.8C.52 8.65 0 10.74 0 12s.52 3.35 1.44 5.2l3.87-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.91-2.97c-1.09.73-2.48 1.17-4.05 1.17-3.18 0-5.77-1.8-6.69-4.56L1.44 16.5C3.37 20.32 7.35 23 12 23z"
            />
          </svg>
          <span>
            {isProcessingOAuth ? "Verifying with Google..." : "Google Account"}
          </span>
        </button>

        <p className="text-xs text-center text-slate-400 mt-8">
          Need access?{" "}
          <Link
            to="/register"
            className="text-[#7b8e7f] hover:underline font-semibold"
          >
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
