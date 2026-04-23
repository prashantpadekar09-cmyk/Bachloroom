import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { getAuthRedirectPath } from "../utils/authRedirect";
import { ArrowRight, FileBadge2 } from "lucide-react";

const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "sharklasers.com",
  "throwawaymail.com",
  "trashmail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "tempr.email",
  "mintemail.com",
]);

function getEmailValidationError(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return "Enter a valid email address.";
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return "Enter a valid email address.";
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "Disposable email addresses are not allowed.";
  }

  const suspiciousLocalPatterns = [
    /^test\d*$/,
    /^fake\d*$/,
    /^temp\d*$/,
    /^dummy\d*$/,
    /^asdf\d*$/,
    /^qwerty\d*$/,
    /^user\d{5,}$/,
    /^abc\d*$/,
  ];

  if (suspiciousLocalPatterns.some((pattern) => pattern.test(localPart)) || /(.)\1{5,}/.test(localPart)) {
    return "Use a real email address to sign up.";
  }

  return "";
}

function roleNeedsIdentity(role: string) {
  return role !== "user";
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarImage, setAadhaarImage] = useState<string>("");
  const [role, setRole] = useState("user");
  const location = useLocation();
  const [referralCode, setReferralCode] = useState(() => new URLSearchParams(location.search).get("ref") || "");
  const [error, setError] = useState("");
  const requiresIdentity = roleNeedsIdentity(role);

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
    const emailValidationError = getEmailValidationError(email);
    if (emailValidationError) {
      setError(emailValidationError);
      return;
    }
    const normalizedAadhaar = aadhaarNumber.replace(/\s+/g, "");
    if (requiresIdentity && !/^\d{12}$/.test(normalizedAadhaar)) {
      setError("Enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (requiresIdentity && !aadhaarImage) {
      setError("Upload your Aadhaar card image before signing up.");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          role,
          referralCode: referralCode.trim() || undefined,
          ...(requiresIdentity
            ? {
                aadhaarNumber: normalizedAadhaar,
                idDocument: aadhaarImage,
              }
            : {}),
        }),
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

  const handleAadhaarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAadhaarImage(reader.result as string);
      if (error) {
        setError("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGoogleSignup = useCallback(
    async (credential: string) => {
      const emailValidationError = getEmailValidationError(email);
      if (email && emailValidationError) {
        setError(emailValidationError);
        return;
      }

      const normalizedAadhaar = aadhaarNumber.replace(/\s+/g, "");
      if (requiresIdentity && !/^\d{12}$/.test(normalizedAadhaar)) {
        setError("Enter a valid 12-digit Aadhaar number.");
        return;
      }
      if (requiresIdentity && !aadhaarImage) {
        setError("Upload your Aadhaar card image before signing up.");
        return;
      }

      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential,
            mode: "register",
            name,
            email,
            phone,
            role,
            referralCode: referralCode.trim() || undefined,
            ...(requiresIdentity
              ? {
                  aadhaarNumber: normalizedAadhaar,
                  idDocument: aadhaarImage,
                }
              : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Google sign-up failed.");
          return;
        }
        completeLogin(data);
      } catch (err) {
        setError("Google sign-up failed. Please try again.");
      }
    },
    [aadhaarImage, aadhaarNumber, completeLogin, email, name, phone, referralCode, requiresIdentity, role]
  );

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-10 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,#fcfbf9_0%,#f1f5f9_100%)] p-6 text-slate-900 shadow-[0_36px_90px_-44px_rgba(36,25,15,0.2)] sm:p-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/75 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a6431]">
            <FileBadge2 className="h-4 w-4" />
            Secure onboarding
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl">Create your account and enter the platform in one flow.</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 sm:text-base">
            Tenants, owners, and service providers can join from the same mobile-friendly form, with identity verification only where it is needed.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              "Choose your role before dashboard access",
              "Works better on narrow mobile screens",
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
          <div className="mx-auto max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a6431]">New account</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Sign up</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Fill in your details once and get routed to the right dashboard.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</div>}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span>
                  <input
                    type="text"
                    required
                    className="ui-input"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email address</span>
                  <input
                    type="email"
                    required
                    className="ui-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) {
                        setError("");
                      }
                    }}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Phone number</span>
                  <input
                    type="tel"
                    className="ui-input"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Role</span>
                  <select
                    className="ui-input"
                    value={role}
                    onChange={(e) => {
                      const nextRole = e.target.value;
                      setRole(nextRole);
                      if (!roleNeedsIdentity(nextRole)) {
                        setAadhaarNumber("");
                        setAadhaarImage("");
                      }
                      if (error) {
                        setError("");
                      }
                    }}
                  >
                    <option value="user">I am looking for a room</option>
                    <option value="owner">I want to list my room</option>
                    <option value="service_provider">I provide services</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Referral code (optional)</span>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="BRXXXXXXXX"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      if (error) {
                        setError("");
                      }
                    }}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                  <input
                    type="password"
                    required
                    className="ui-input"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>

                {requiresIdentity && (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Aadhaar number</span>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={12}
                        className="ui-input"
                        placeholder="12-digit Aadhaar"
                        value={aadhaarNumber}
                        onChange={(e) => {
                          setAadhaarNumber(e.target.value.replace(/\D/g, ""));
                          if (error) {
                            setError("");
                          }
                        }}
                      />
                    </label>

                    <div className="block sm:col-span-2">
                      <span className="mb-2 block text-sm font-semibold text-slate-700">Identity upload</span>
                      <label className="flex min-h-[56px] w-full cursor-pointer items-center justify-center rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:border-amber-300 hover:bg-amber-50">
                        {aadhaarImage ? "Aadhaar image uploaded" : "Upload Aadhaar card image"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleAadhaarUpload} />
                      </label>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2b1c12_0%,#8a6431_100%)] px-4 py-3 text-sm font-bold text-[#f8e7bf] shadow-lg shadow-amber-900/10 transition hover:brightness-110"
              >
                Sign up
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

              <GoogleAuthButton mode="signup" onCredential={handleGoogleSignup} onError={setError} />

              <div className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[#8a6431] hover:text-[#b48845]">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
