import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Clock3, Crown, IndianRupee, ShieldCheck, Upload } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../context/AuthContext";

type PremiumStatusResponse = {
  isPremium: boolean;
  amount: number;
  payment: null | {
    id: string;
    amount: number;
    utrNumber: string;
    screenshot?: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
  };
  paymentConfig: {
    amount: number;
    upiId: string;
    payeeName: string;
  };
};

async function readJsonSafely(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("The server returned an invalid response. Please refresh and try again.");
  }
}

export default function PremiumPayment() {
  const { token, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [statusData, setStatusData] = useState<PremiumStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const target = params.get("redirect");
    return target && target.startsWith("/") ? target : "/dashboard?tab=premium";
  }, [location.search]);

  const fetchStatus = async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/payments/premium/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load premium payment status.");
      }

      setStatusData(data);
      setError("");
      updateUser({
        isPremium: Boolean(data.isPremium),
        subscriptionPlan: data.isPremium ? "premium" : user?.subscriptionPlan,
      });
    } catch (fetchError: any) {
      setStatusData(null);
      setError(fetchError.message || "Failed to load premium payment status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchStatus();
  }, [navigate, token]);

  const handleScreenshotUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/payments/premium", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          utrNumber,
          screenshot,
        }),
      });
      const data = await readJsonSafely(response);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to submit payment proof.");
      }

      setMessage(data?.message || "Payment proof submitted successfully.");
      setUtrNumber("");
      setScreenshot(null);
      await fetchStatus();
    } catch (submitError: any) {
      setError(submitError.message || "Failed to submit payment proof.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 md:px-8">
        <div className="rounded-[2rem] border border-red-100 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900">Premium payment page could not load</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">{error || "Something went wrong while loading this page."}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={fetchStatus}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => navigate("/dashboard?tab=premium")}
              className="rounded-xl border border-gray-200 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const upiLink = `upi://pay?pa=${encodeURIComponent(statusData.paymentConfig.upiId)}&pn=${encodeURIComponent(
    statusData.paymentConfig.payeeName
  )}&am=${statusData.amount}&cu=INR&tn=${encodeURIComponent("Premium access for room rental app")}`;
  const latestStatusLabel = statusData.isPremium
    ? "Premium active"
    : statusData.payment?.status === "pending"
      ? "Waiting for approval"
      : statusData.payment?.status === "rejected"
        ? "Rejected"
        : "No request yet";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 md:px-8">
      <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-50 p-8 shadow-sm">
          <div className="inline-flex items-center rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white">
            <Crown className="mr-2 h-4 w-4 text-amber-300" />
            Premium unlock
          </div>
          <h1 className="mt-5 max-w-xl text-4xl font-black tracking-tight text-gray-900">
            Pay Rs. 99 manually and unlock owner contact details.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
            Scan the QR code, complete the payment, submit your UTR number, and the admin will verify it.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Amount</p>
              <p className="mt-2 flex items-center text-3xl font-black text-gray-900">
                <IndianRupee className="mr-1 h-6 w-6" />
                {statusData.amount}
              </p>
            </div>
            <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Status</p>
              <p className="mt-2 text-lg font-bold text-gray-900">{latestStatusLabel}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-6 rounded-[1.75rem] border border-amber-100 bg-white p-6 shadow-sm md:flex-row md:items-center">
            <div className="flex justify-center md:w-56">
              <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm">
                <QRCodeSVG value={upiLink} size={180} includeMargin />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-gray-900">How it works</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
                <p>1. Scan the QR code and pay the amount.</p>
                <p>2. Submit the UTR number from your banking app.</p>
                <p>3. Wait for admin approval to unlock owner phone and direct contact.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Submit proof</p>
              <h2 className="mt-2 text-2xl font-black text-gray-900">Premium payment verification</h2>
            </div>
            {statusData.isPremium && (
              <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                Active
              </div>
            )}
          </div>

          {statusData.isPremium ? (
            <div className="mt-8 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6">
              <h3 className="text-lg font-bold text-emerald-900">Premium unlocked</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Your account can now view owner phone numbers and contact owners directly.
              </p>
              <button
                onClick={() => navigate(redirectTo)}
                className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Continue
              </button>
            </div>
          ) : statusData.payment?.status === "pending" ? (
            <div className="mt-8 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-6">
              <div className="flex items-center text-lg font-bold text-amber-900">
                <Clock3 className="mr-2 h-5 w-5" />
                Waiting for admin approval
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                UTR: <span className="font-semibold">{statusData.payment.utrNumber}</span>
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Submitted on {new Date(statusData.payment.createdAt).toLocaleString()}.
              </p>
            </div>
          ) : statusData.payment?.status === "rejected" ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6">
                <div className="text-lg font-bold text-red-900">Previous premium request was rejected</div>
                <p className="mt-2 text-sm leading-6 text-red-800">
                  You can submit a fresh payment proof with a new valid UTR number.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">New UTR number</label>
                  <input
                    type="text"
                    minLength={8}
                    maxLength={22}
                    required
                    value={utrNumber}
                    onChange={(event) => setUtrNumber(event.target.value.toUpperCase())}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Enter a new UTR / transaction reference"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Payment screenshot (optional)</label>
                  <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm font-medium text-gray-600 transition hover:border-blue-400 hover:bg-blue-50">
                    <Upload className="mr-2 h-4 w-4" />
                    {screenshot ? "Screenshot attached" : "Upload screenshot"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                  </label>
                </div>

                {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
                {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Resubmit payment proof"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50 p-5 text-sm leading-6 text-sky-900">
                <div className="flex items-center font-semibold">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin checks the UTR before premium gets activated.
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">UTR number</label>
                <input
                  type="text"
                  minLength={8}
                  maxLength={22}
                  required
                  value={utrNumber}
                  onChange={(event) => setUtrNumber(event.target.value.toUpperCase())}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter UTR / transaction reference"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Payment screenshot (optional)</label>
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm font-medium text-gray-600 transition hover:border-blue-400 hover:bg-blue-50">
                  <Upload className="mr-2 h-4 w-4" />
                  {screenshot ? "Screenshot attached" : "Upload screenshot"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                </label>
              </div>

              {message && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit payment proof"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
