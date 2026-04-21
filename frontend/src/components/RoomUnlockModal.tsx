import React, { useState } from "react";
import { X, Phone, MessageCircle, Sparkles, ShieldCheck, Zap, Lock, IndianRupee, CreditCard, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface RoomUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  owner: any;
  onUnlockSuccess: (phone: string) => void;
  onBuyCredits: () => void;
}

export default function RoomUnlockModal({ 
  isOpen, 
  onClose, 
  room, 
  owner, 
  onUnlockSuccess, 
  onBuyCredits 
}: RoomUnlockModalProps) {
  const { token, user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleUnlock = async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/rooms/${room.id}/unlock`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        // Update user credits in context
        if (user?.credits !== undefined) {
          updateUser({ credits: Math.floor(user.credits) - 1 });
        }
        onUnlockSuccess(data.phone);
      } else {
        if (res.status === 402) {
          setError("Insufficient credits. Please top up your wallet.");
        } else {
          setError(data.error || "Failed to unlock contact");
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasCredits = (user?.credits || 0) >= 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[2.5rem] bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 z-10 p-2 text-gray-400 transition-colors hover:text-gray-600 sm:right-6 sm:top-6"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:p-8">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 mb-6 relative">
              <div className="absolute inset-0 bg-amber-100 rounded-3xl rotate-6" />
              <div className="absolute inset-0 bg-amber-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <Lock className="h-10 w-10" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Unlock Direct Contact</h2>
            <p className="text-gray-500 text-sm">
              Connect directly with <span className="font-bold text-gray-900">{owner?.name}</span> to finalize your stay.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Verified Listing</h4>
                <p className="text-xs text-gray-500">Identity and property ownership verified by Bachloroom.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="p-2 bg-white rounded-xl text-emerald-600 shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">High Demand</h4>
                <p className="text-xs text-gray-500">This room is in top 10% of most viewed listings this week.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 mb-8 text-center bg-slate-50/50">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cost to Unlock</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-slate-900">1</span>
              <span className="text-lg font-bold text-slate-500">Credit</span>
            </div>
            <div className="mt-2 text-xs font-medium text-slate-500">
              Current balance: <span className="font-bold text-slate-900">{Math.floor(user?.credits || 0)} credits</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold border border-red-100">
              {error}
            </div>
          )}

          {hasCredits ? (
            <button
              disabled={loading}
              onClick={handleUnlock}
              className="w-full group flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-bold transition-all hover:bg-black"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Confirm Unlock
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onBuyCredits();
              }}
              className="w-full group flex items-center justify-center gap-3 bg-blue-600 text-white py-4 rounded-2xl font-bold transition-all hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              Get Credits Now
              <IndianRupee className="h-4 w-4" />
            </button>
          )}

          <p className="mt-6 text-center text-xs text-gray-400 font-medium">
            100% Refund if owner doesn't respond in 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
