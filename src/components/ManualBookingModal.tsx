import React, { useState } from "react";
import { X, ShieldCheck, Copy, Check, Upload, Clock3, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface ManualBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  platformFee: number;
  ownerAmount: number;
  roomTitle: string;
  depositLabel: string;
  premiumIncluded?: boolean;
  onSuccess: (response: { manual: true; transactionId: string; screenshot: string | null }) => Promise<void> | void;
}

export default function ManualBookingModal({
  isOpen,
  onClose,
  amount,
  platformFee,
  ownerAmount,
  roomTitle,
  depositLabel,
  premiumIncluded,
  onSuccess,
}: ManualBookingModalProps) {
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const upiId = "prashantpadekar09@oksbi";
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    "BachelorRooms Admin"
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Booking for ${roomTitle}`)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScreenshotUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setScreenshot(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const normalizedUtr = utrNumber.trim().toUpperCase();

    if (!/^[A-Z0-9]{8,22}$/.test(normalizedUtr)) {
      setError("Enter a valid UTR number.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSuccess({
        manual: true,
        transactionId: normalizedUtr,
        screenshot,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manual Booking Payment</h2>
            <p className="text-sm text-gray-500">Scan the QR code, pay the amount, and submit your proof for admin approval.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-gray-100 p-8 md:border-b-0 md:border-r">
            <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-50 p-6">
              <div className="inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                <QrCode className="mr-2 h-4 w-4 text-amber-300" />
                Room Booking
              </div>
              <h3 className="mt-4 text-2xl font-black text-gray-900">{roomTitle}</h3>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-medium">Rent Amount</span>
                  <span className="font-bold text-gray-900">Rs. {ownerAmount}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-medium">Platform Fee</span>
                  <span className="font-bold text-gray-900">Rs. {platformFee}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="font-medium">Deposit</span>
                  <span className="font-bold text-gray-900">{depositLabel}</span>
                </div>
                {premiumIncluded && (
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="font-medium">Premium Access</span>
                    <span className="font-bold text-emerald-700">Included</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-amber-100 pt-3">
                  <span className="text-lg font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-extrabold text-blue-600">Rs. {amount}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">Admin UPI ID</p>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-mono font-bold text-gray-700">{upiId}</span>
                <button onClick={copyToClipboard} className="rounded-xl p-2 text-blue-600 transition-colors hover:bg-white" title="Copy UPI ID">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-start rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <ShieldCheck className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p className="text-xs font-medium leading-relaxed text-blue-700">
                After payment, submit your UTR number below. The booking stays under review until admin verifies the payment.
              </p>
            </div>
          </div>

          <div className="p-8">
            <div className="flex justify-center">
              <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm">
                <QRCodeSVG value={upiLink} size={180} includeMargin />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">UTR Number</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(event) => setUtrNumber(event.target.value.toUpperCase())}
                  placeholder="Enter UTR / transaction reference"
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Payment Screenshot (Optional)</label>
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm font-medium text-gray-600 transition hover:border-blue-400 hover:bg-blue-50">
                  <Upload className="mr-2 h-4 w-4" />
                  {screenshot ? "Screenshot attached" : "Upload screenshot"}
                  <input type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                </label>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center text-sm font-semibold text-amber-900">
                  <Clock3 className="mr-2 h-4 w-4" />
                  Booking pending - waiting for admin approval
                </div>
                <p className="mt-2 text-xs leading-6 text-amber-800">
                  Once submitted, admin will review the payment proof and then confirm or reject this booking.
                </p>
              </div>

              {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Booking Payment Proof"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
