import React, { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { getAuthRedirectPath } from "../utils/authRedirect";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const completeLogin = useCallback(
    (data: { token: string; user: { role: string; id: string; name: string; email: string } }) => {
      login(data.token, data.user);
      navigate(getAuthRedirectPath(data.user.role));
    },
    [login, navigate]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        completeLogin(data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleGoogleLogin = useCallback(
    async (credential: string) => {
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential, mode: "login" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Google sign-in failed.");
          return;
        }
        completeLogin(data);
      } catch (err) {
        setError("Google sign-in failed. Please try again.");
      }
    },
    [completeLogin]
  );

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#f8fbff_0%,#eaf4ff_100%)] p-6 text-slate-900 shadow-[0_36px_90px_-44px_rgba(59,130,246,0.2)] sm:p-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/75 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            <ShieldCheck className="h-4 w-4" />
            Safe login
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Welcome back to your rental workspace.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
            Sign in to manage bookings, listings, support, or your room search from one place.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "Fast mobile-friendly forms",
              "Role-based dashboard routing",
              "Verified owner and tenant flow",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/80 bg-white/72 px-4 py-3 text-sm text-slate-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ambient-surface-strong rounded-[2rem] p-5 sm:p-8"
        >
          <div className="mx-auto max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Account access</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use your email or continue with Google.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                <input
                  type="email"
                  required
                  className="ui-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  required
                  className="ui-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-105"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400">or continue with</span>
                </div>
              </div>

              <GoogleAuthButton mode="signin" onCredential={handleGoogleLogin} onError={setError} />

              <div className="text-center text-sm text-slate-600">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-semibold text-sky-700 hover:text-sky-800">
                  Sign up
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
