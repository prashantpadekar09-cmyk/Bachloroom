import React, { useEffect, useState } from "react";
import { X, Phone, MessageCircle, Sparkles, ShieldCheck, Zap, Copy, Check, ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface UnlockedContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  owner: any;
  phone: string;
}

export default function UnlockedContactModal({ 
  isOpen, 
  onClose, 
  room, 
  owner, 
  phone 
}: UnlockedContactModalProps) {
  const [copied, setCopied] = useState(false);
  const [similarRooms, setSimilarRooms] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && room?.city) {
      fetch(`/api/rooms?city=${room.city}`)
        .then(res => res.json())
        .then(data => {
          const filtered = data.rooms
            .filter((r: any) => r.id !== room.id)
            .slice(0, 3);
          setSimilarRooms(filtered);
        })
        .catch(err => console.error("Failed to fetch similar rooms", err));
    }
  }, [isOpen, room]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappLink = `https://wa.me/91${phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi ${owner?.name}, I'm interested in your room: ${room?.title} on Bachloroom.`
  )}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-[2.5rem] bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-600">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-2 text-white/80 transition-colors hover:text-white sm:right-6 sm:top-6"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <div className="absolute -bottom-12 left-5 p-1 bg-white rounded-3xl shadow-lg sm:left-8">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black">
              {owner?.name?.[0]}
            </div>
          </div>
        </div>

        <div className="px-5 pt-14 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:px-8 sm:pt-16 sm:pb-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-black text-gray-900">{owner?.name}</h2>
                <ShieldCheck className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-gray-500 font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                Verified Property Owner
              </p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">Recently Verified</div>
              <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-bold uppercase tracking-wider">High Demand</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 mb-4">
                <Phone className="h-6 w-6" />
              </div>
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Direct Number</div>
              <div className="text-xl font-black text-gray-900 mb-4">{phone}</div>
              <div className="flex gap-2 w-full">
                <button 
                  onClick={handleCopy}
                  className="flex-1 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center gap-2 transition hover:bg-gray-50"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <a 
                  href={`tel:${phone}`}
                  className="flex-1 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:bg-black"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600 mb-4">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="text-xs font-black text-emerald-800/40 uppercase tracking-widest mb-1">WhatsApp Chat</div>
              <div className="text-lg font-bold text-emerald-900 mb-4">Connect on WhatsApp</div>
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2 transition hover:bg-emerald-700 shadow-md shadow-emerald-200"
              >
                Start Chat
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {similarRooms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">Similar Premium Rooms</h3>
                <div className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 px-3 py-1 bg-blue-50 rounded-full">
                  <Sparkles className="h-4 w-4" />
                  Unlocked for you
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {similarRooms.map((r) => (
                  <Link 
                    key={r.id} 
                    to={`/map/${r.id}`}
                    onClick={onClose}
                    className="group"
                  >
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-3">
                      <img 
                        src={Array.isArray(r.images) ? r.images[0] : JSON.parse(r.images || "[]")[0] || "https://picsum.photos/seed/room/300/200"} 
                        alt={r.title}
                        className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{r.title}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.location}
                    </p>
                    <p className="text-sm font-black text-gray-900 mt-1">₹{r.price}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-10 p-6 rounded-3xl bg-amber-50 border border-amber-100 flex items-start gap-4">
            <div className="p-2 bg-white rounded-xl text-amber-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">Bachloroom Trust Guarantee</h4>
              <p className="text-xs text-amber-800 leading-relaxed mt-1">
                We've verified the owner's details. If you face any issues or find the listing misleading, report it to us within 24 hours for a full credit refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
