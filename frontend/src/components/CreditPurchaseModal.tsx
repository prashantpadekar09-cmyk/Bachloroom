import React, { useState } from "react";
import { X, Check, CreditCard, Sparkles, Zap, Shield, IndianRupee, QrCode, Upload, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  features: string[];
};

const PACKAGES: CreditPackage[] = [
  {
    id: "credits_5",
    name: "Starter Pack",
    credits: 5,
    price: 99,
    features: ["Unlock 5 contacts", "1 Year Validity", "Standard Support"],
  },
  {
    id: "credits_15",
    name: "Value Pack",
    credits: 15,
    price: 199,
    popular: true,
    features: ["Unlock 15 contacts", "Priority Listing Access", "2 Year Validity", "Priority Support"],
  },
  {
    id: "unlimited",
    name: "Unlimited Access",
    credits: 9999,
    price: 299,
    features: ["Unlimited Unlocks", "30 Days Validity", "VIP Support", "Premium Badge"],
  },
];

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreditPurchaseModal({ isOpen, onClose, onSuccess }: CreditPurchaseModalProps) {
  const { token, user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [manualForm, setManualForm] = useState({ utrNumber: "", screenshot: "" });

  if (!isOpen) return null;

  const handleManualSubmit = async () => {
    if (!token || !selectedPkg) return;
    if (!manualForm.utrNumber) {
      setError("Please enter the UTR / Transaction ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/manual-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId: selectedPkg.id,
          utrNumber: manualForm.utrNumber,
          screenshot: manualForm.screenshot,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit payment proof");

      setSuccess("Your payment proof has been submitted! Admin will verify it shortly and add your credits.");
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualForm({ ...manualForm, screenshot: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    setSelectedPkg(pkg);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-4xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[2.5rem] bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 text-gray-400 transition-colors hover:text-gray-600 sm:right-6 sm:top-6"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-[#8a6431] text-sm font-bold mb-4 border border-amber-100">
              <Sparkles className="h-4 w-4" />
              Premium Credits
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Choose Your Credit Pack</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Unlock owner contacts and exclusive features with our flexible credit packages.
            </p>
          </div>

          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <Check className="h-5 w-5" />
              {success}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 text-rose-700 text-sm font-bold border border-rose-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <X className="h-5 w-5" />
              {error}
            </div>
          )}

          {selectedPkg ? (
            <div className="animate-in fade-in slide-in-from-right-8 duration-300">
              <button 
                onClick={() => setSelectedPkg(null)}
                className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Packages
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                      <Check className="h-5 w-5 text-[#8a6431]" />
                      Plan Summary
                    </h3>
                    <div className="p-6 rounded-3xl bg-white shadow-sm border border-slate-100 mb-6">
                      <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">{selectedPkg.name}</p>
                      <p className="text-4xl font-black text-gray-900 mb-4">₹{selectedPkg.price}</p>
                      <div className="flex items-center gap-2 text-[#8a6431] font-bold">
                        <Zap className="h-5 w-5" />
                        {selectedPkg.id === "unlimited" ? "Unlimited Credits" : `${selectedPkg.credits} Credits`}
                      </div>
                    </div>
                    <ul className="space-y-2 mb-8">
                      {selectedPkg.features.map((f, i) => (
                        <li key={i} className="flex items-center gap-3 text-xs font-medium text-gray-500">
                          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                <div className="min-h-[400px]">
                    <div className="h-full space-y-6">
                      <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-amber-500" />
                        Scan to Pay
                      </h3>
                      
                      <div className="p-8 rounded-[2rem] border-2 border-amber-400 bg-amber-50/20 shadow-xl shadow-amber-100/20">
                        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="p-6 rounded-3xl bg-white border border-amber-100 text-center">
                            <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4">Official Payment QR</p>
                            
                            <div className="relative mx-auto w-48 h-48 bg-white p-4 rounded-[2.5rem] border-2 border-amber-100 shadow-sm flex items-center justify-center overflow-hidden">
                              <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`upi://pay?pa=prashantpadekar09@oksbi&pn=Bachloroom&am=${selectedPkg.price}&cu=INR&tn=Credits_${selectedPkg.id}`)}`}
                                alt="UPI QR Code"
                                className="w-full h-full object-contain"
                              />
                               <div className="absolute inset-0 border-[16px] border-white rounded-[2rem] pointer-events-none" />
                            </div>
                            <p className="mt-4 text-[11px] font-bold text-gray-400">Scan with GPay, PhonePe, Paytm</p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-2">UTR / Transaction ID</label>
                              <input 
                                type="text" 
                                value={manualForm.utrNumber}
                                onChange={(e) => setManualForm({ ...manualForm, utrNumber: e.target.value.trim() })}
                                placeholder="12-digit UTR number"
                                className="w-full px-5 py-4 rounded-2xl bg-white border border-gray-200 outline-none focus:border-amber-500 font-bold text-gray-900 shadow-sm"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Payment Screenshot</label>
                              <div className="relative group cursor-pointer">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={handleFileChange}
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                />
                                <div className={`p-4 rounded-2xl border-2 border-dashed ${manualForm.screenshot ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'} flex items-center justify-center text-center transition group-hover:bg-slate-100`}>
                                  {manualForm.screenshot ? (
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                      <Check className="h-5 w-5" />
                                      Screenshot Added
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-1">
                                      <Upload className="h-5 w-5 text-slate-400" />
                                      <span className="text-xs font-bold text-slate-500">Click to upload proof</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              disabled={loading || !manualForm.utrNumber}
                              onClick={handleManualSubmit}
                              className="w-full py-4 rounded-2xl bg-amber-500 text-white font-black shadow-lg shadow-amber-200/50 hover:bg-amber-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {loading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  Confirm Proof
                                  <Send className="h-4 w-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
              {PACKAGES.map((pkg) => (
                <div 
                  key={pkg.id}
                  className={`relative flex flex-col rounded-[2rem] border-2 transition-all duration-300 ${
                    pkg.popular 
                      ? "border-amber-500 bg-amber-50/10 shadow-xl shadow-amber-900/10 scale-105" 
                      : "border-slate-100 bg-white hover:border-amber-200"
                  } p-8`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[linear-gradient(135deg,#2b1c12_0%,#8a6431_100%)] text-[#f8e7bf] text-xs font-black uppercase tracking-widest">
                      Best Value
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-3 rounded-2xl ${pkg.popular ? "bg-[linear-gradient(135deg,#2b1c12_0%,#8a6431_100%)] text-[#f8e7bf]" : "bg-slate-100 text-slate-400 font-bold"}`}>
                      {pkg.id === "unlimited" ? <Zap className="h-6 w-6" /> : <CreditCard className="h-6 w-6" />}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-400 uppercase tracking-tighter">Credits</div>
                      <div className="text-2xl font-black text-gray-900">
                        {pkg.id === "unlimited" ? "∞" : pkg.credits}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-gray-900">₹{pkg.price}</span>
                      <span className="text-gray-400 font-medium">/ pack</span>
                    </div>
                  </div>

                  <ul className="flex-grow space-y-4 mb-8">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-gray-600">
                        <div className={`p-1 rounded-full ${pkg.popular ? "bg-amber-100 text-[#8a6431]" : "bg-slate-100 text-slate-400"}`}>
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={loading}
                    onClick={() => handlePurchase(pkg)}
                    className={`w-full py-4 rounded-2xl font-bold transition-all ${
                      pkg.popular 
                        ? "bg-[linear-gradient(135deg,#2b1c12_0%,#8a6431_100%)] text-[#f8e7bf] hover:brightness-110 shadow-lg shadow-amber-900/10" 
                        : "bg-slate-900 text-white hover:bg-black"
                    } disabled:opacity-50`}
                  >
                    Select Plan
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Secure Payments</h4>
                <p className="text-sm text-gray-500">Processed by Razorpay • 256-bit encryption</p>
              </div>
            </div>
            <div className="flex items-center -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <img 
                  key={i} 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} 
                  className="h-10 w-10 rounded-full border-2 border-white shadow-sm" 
                  alt="User"
                />
              ))}
              <div className="pl-4 text-sm font-bold text-gray-400">
                +2k users unlocked contacts today
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
