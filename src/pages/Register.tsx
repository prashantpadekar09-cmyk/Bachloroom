import React, { useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "motion/react";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { getAuthRedirectPath } from "../utils/authRedirect";

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

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarImage, setAadhaarImage] = useState<string>("");
  const [role, setRole] = useState("user");
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
    const emailValidationError = getEmailValidationError(email);
    if (emailValidationError) {
      setError(emailValidationError);
      return;
    }
    const normalizedAadhaar = aadhaarNumber.replace(/\s+/g, "");
    if (!/^\d{12}$/.test(normalizedAadhaar)) {
      setError("Enter a valid 12-digit Aadhaar number.");
      return;
    }
    if (!aadhaarImage) {
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
          aadhaarNumber: normalizedAadhaar,
          idDocument: aadhaarImage,
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

  const handleGoogleSignup = useCallback(
    async (credential: string) => {
      const emailValidationError = getEmailValidationError(email);
      if (email && emailValidationError) {
        setError(emailValidationError);
        return;
      }

      const normalizedAadhaar = aadhaarNumber.replace(/\s+/g, "");
      if (!/^\d{12}$/.test(normalizedAadhaar)) {
        setError("Enter a valid 12-digit Aadhaar number.");
        return;
      }
      if (!aadhaarImage) {
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
            aadhaarNumber: normalizedAadhaar,
            idDocument: aadhaarImage,
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
    [aadhaarImage, aadhaarNumber, completeLogin, email, name, phone, role]
  );

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

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-transparent py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ambient-surface-strong max-w-md w-full space-y-8 p-8 rounded-2xl"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create an account</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) {
                    setError("");
                  }
                }}
              />
            </div>
            <div>
              <input
                type="tel"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={12}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Aadhaar Number"
                value={aadhaarNumber}
                onChange={(e) => {
                  setAadhaarNumber(e.target.value.replace(/\D/g, ""));
                  if (error) {
                    setError("");
                  }
                }}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <select
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">I am looking for a room</option>
                <option value="owner">I want to list my room</option>
                <option value="service_provider">I provide services</option>
              </select>
            </div>
            <div>
              <label className="appearance-none rounded-none relative flex w-full cursor-pointer items-center justify-center border border-gray-300 bg-white px-3 py-3 text-sm text-gray-600 rounded-b-md focus-within:ring-2 focus-within:ring-blue-500">
                {aadhaarImage ? "Aadhaar image uploaded" : "Upload Aadhaar Card Image"}
                <input type="file" accept="image/*" className="hidden" onChange={handleAadhaarUpload} />
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign up
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-gray-500">or</span>
            </div>
          </div>
          <GoogleAuthButton mode="signup" onCredential={handleGoogleSignup} onError={setError} />
          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
