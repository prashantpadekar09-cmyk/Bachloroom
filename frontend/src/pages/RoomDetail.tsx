import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Award,
  CheckCircle,
  ExternalLink,
  Globe,
  Heart,
  Lock,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ReviewSystem from "../components/ReviewSystem";
import CreditPurchaseModal from "../components/CreditPurchaseModal";
import RoomUnlockModal from "../components/RoomUnlockModal";
import UnlockedContactModal from "../components/UnlockedContactModal";

const normalizeRoomImages = (images: unknown) => {
  if (!Array.isArray(images)) {
    return [];
  }

  const normalized: string[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const current = typeof images[index] === "string" ? images[index].trim() : "";
    if (!current) {
      continue;
    }

    if (/^https?:\/\//i.test(current) || /^data:image\/[^;]+;base64,/i.test(current)) {
      normalized.push(current);
      continue;
    }

    if (/^data:image\/[^;]+;base64$/i.test(current) && typeof images[index + 1] === "string") {
      normalized.push(`${current},${images[index + 1].trim()}`);
      index += 1;
    }
  }

  return normalized;
};

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [room, setRoom] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [priceEvaluation, setPriceEvaluation] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [ratingStats, setRatingStats] = useState({ average: 0, total: 0 });
  const [showGallery, setShowGallery] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const gallerySectionRef = useRef<HTMLDivElement | null>(null);

  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [unlockedPhone, setUnlockedPhone] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`/api/rooms/${id}`, { headers });
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        setRoom({
          ...data.room,
          images: normalizeRoomImages(data.room.images),
        });
        setOwner(data.owner);
        setContactUnlocked(Boolean(data.contactUnlocked));

        const recentViews = JSON.parse(localStorage.getItem("recentViews") || "[]");
        recentViews.push({ city: data.room.city, type: data.room.type });
        if (recentViews.length > 5) {
          recentViews.shift();
        }
        localStorage.setItem("recentViews", JSON.stringify(recentViews));
      } catch (err) {
        console.error("Failed to fetch room details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id, token]);

  useEffect(() => {
    const checkSaved = async () => {
      if (!token) {
        return;
      }

      try {
        const res = await fetch("/api/saved-rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        const saved = data.rooms.some((savedRoom: any) => savedRoom.id === id);
        setIsSaved(saved);
      } catch (err) {
        console.error(err);
      }
    };

    checkSaved();
  }, [id, token]);

  useEffect(() => {
    const evaluatePrice = async () => {
      if (!room || room.billingPeriod === "night" || room.price <= 0) {
        return;
      }

      try {
        const res = await fetch(`/api/rooms/${room.id}/price-evaluation`);
        if (!res.ok) {
          setPriceEvaluation(null);
          return;
        }

        const data = await res.json();
        setPriceEvaluation(typeof data.evaluation === "string" ? data.evaluation : null);
      } catch (err) {
        console.error("Failed to evaluate price", err);
        setPriceEvaluation(null);
      }
    };

    evaluatePrice();
  }, [room]);

  useEffect(() => {
    setShowGallery(false);
    setSelectedImageIndex(0);
  }, [room?.id]);

  useEffect(() => {
    if (showGallery) {
      gallerySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showGallery]);

  const handleSaveRoom = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      const res = await fetch("/api/saved-rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId: id }),
      });

      if (res.ok) {
        setIsSaved(true);
        return;
      }

      const data = await res.json();
      if (data.error === "Room already saved") {
        setIsSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnlockOwnerDetails = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (contactUnlocked) {
      setIsContactModalOpen(true);
    } else {
      setIsUnlockModalOpen(true);
    }
  };

  const onUnlockSuccess = (phone: string) => {
    setUnlockedPhone(phone);
    setOwner({ ...owner, phone });
    setContactUnlocked(true);
    setIsUnlockModalOpen(false);
    setIsContactModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!room) {
    return <div className="mt-20 text-center text-2xl font-semibold text-gray-700">Room not found</div>;
  }

  const isExternalRoom = Boolean(room.sourceUrl);
  const priceDisplay = room.priceLabel || (room.price > 0 ? `Rs. ${room.price}` : "Check source");
  const depositText = room.depositLabel || (room.deposit ? `Rs. ${room.deposit}` : "Deposit on request");
  const sourceText = room.sourceLabel || "Public listing";
  const currentImage = room.images?.[selectedImageIndex] || room.images?.[0] || "https://picsum.photos/seed/room/1200/800";

  return (
    <div className="min-h-screen bg-transparent pb-12">
      <div className="ambient-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:px-8">
          <div className="h-[52svh] min-h-[320px] sm:h-[60vh] sm:min-h-[400px]">
            <div className="group relative h-full overflow-hidden rounded-3xl shadow-sm">
              <img
                src={currentImage}
                alt={room.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-6">
                <div className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur-md">
                  <MapPin className="mr-2 h-4 w-4" />
                  {room.location}, {room.city}
                </div>
                <h1 className="max-w-4xl text-3xl font-extrabold leading-tight md:text-5xl">{room.title}</h1>
              </div>
              {room.images?.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setShowGallery((current) => !current)}
                  className="absolute right-6 top-6 z-20 rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-gray-900 shadow-sm backdrop-blur-md transition hover:bg-white"
                >
                  {room.images.length} gallery shots
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-10 md:col-span-2">
            <div className="mb-8 flex flex-wrap items-center gap-3">
              {!isExternalRoom && ratingStats.total > 0 ? (
                <div className="inline-flex items-center rounded-full border border-yellow-100 bg-yellow-50 px-4 py-1.5 text-sm font-bold text-yellow-700 shadow-sm">
                  <Star className="mr-1.5 h-4 w-4 fill-current" />
                  {ratingStats.average.toFixed(1)} ({ratingStats.total} reviews)
                </div>
              ) : null}
              <div className="inline-flex items-center rounded-full bg-gray-900 px-4 py-1.5 text-sm font-bold text-white shadow-sm">
                {room.type}
              </div>
              {isExternalRoom ? (
                <a
                  href={room.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
                >
                  <Globe className="mr-1.5 h-4 w-4" />
                  {sourceText}
                </a>
              ) : null}
              <button
                onClick={handleSaveRoom}
                disabled={isSaved}
                className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-all ${
                  isSaved
                    ? "border border-red-100 bg-red-50 text-red-600"
                    : "border border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-600"
                }`}
              >
                <Heart className={`mr-1.5 h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                {isSaved ? "Saved to Wishlist" : "Save to Wishlist"}
              </button>
              {priceEvaluation ? (
                <div
                  className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-bold shadow-sm ${
                    priceEvaluation.includes("Good Deal")
                      ? "border border-emerald-200 bg-emerald-100 text-emerald-800"
                      : priceEvaluation.includes("Overpriced")
                        ? "border border-rose-200 bg-rose-100 text-rose-800"
                        : "border border-amber-200 bg-amber-100 text-amber-800"
                  }`}
                >
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  AI Evaluation: {priceEvaluation}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="mb-5 text-2xl font-bold text-gray-900">About this place</h2>
              <p className="whitespace-pre-line text-lg leading-relaxed text-gray-600">{room.description}</p>
              {isExternalRoom ? (
                <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <div className="text-sm font-semibold text-blue-800">
                    Listing details were sourced from {sourceText}.
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-blue-700">
                    Confirm the latest photos, availability, deposit terms, and contact details on the original listing before you commit.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-2xl font-bold text-gray-900">What this place offers</h2>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
                {room.amenities?.map((amenity: string, index: number) => (
                  <div key={index} className="flex items-center font-medium text-gray-700">
                    <CheckCircle className="mr-3 h-6 w-6 text-emerald-500" />
                    {amenity}
                  </div>
                ))}
              </div>
            </div>

            {showGallery && room.images?.length > 0 ? (
              <div ref={gallerySectionRef} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-gray-900">Gallery</h2>
                  <button
                    type="button"
                    onClick={() => setShowGallery(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    Hide Gallery
                  </button>
                </div>
                <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200">
                  <img
                    src={currentImage}
                    alt={`${room.title} photo ${selectedImageIndex + 1}`}
                    className="h-[360px] w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {room.images.map((image: string, index: number) => (
                    <button
                      key={`${room.id}-gallery-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`overflow-hidden rounded-2xl border transition ${
                        selectedImageIndex === index
                          ? "border-blue-500 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${room.title} thumbnail ${index + 1}`}
                        className="h-40 w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isExternalRoom ? (
              <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-sm">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/70 blur-3xl" />
                <div className="relative z-10 rounded-2xl border border-white bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                        <Globe className="mr-2 h-4 w-4" />
                        Listing Source
                      </div>
                      <h2 className="mt-4 text-2xl font-bold text-gray-900">{sourceText}</h2>
                      <p className="mt-3 max-w-2xl leading-relaxed text-gray-600">
                        This room is showcased from a live public listing. We kept it in the marketplace so users can discover genuine options, but contact and final terms should happen on the original platform.
                      </p>
                    </div>
                    <a
                      href={room.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800"
                    >
                      Open Original Listing
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            ) : owner ? (
              <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 shadow-sm">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-200/70 blur-3xl" />
                <h2 className="relative z-10 mb-8 text-2xl font-bold text-gray-900">Meet your Host</h2>
                <div className="relative z-10 flex flex-col gap-8 md:flex-row">
                  <div className="flex flex-col items-center rounded-2xl border border-white bg-white p-6 text-center shadow-sm md:w-1/3">
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
                      <User className="h-10 w-10" />
                    </div>
                    <div className="text-xl font-bold text-gray-900">{owner.name}</div>
                    <div className="mb-4 flex items-center justify-center text-sm font-medium text-blue-600">
                      <ShieldCheck className="mr-1 h-4 w-4" />
                      Verified Owner
                    </div>
                    {user && user.id !== owner.id && !contactUnlocked ? (
                      <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                        <div className="flex items-center text-sm font-semibold text-amber-800">
                          <Lock className="mr-2 h-4 w-4" />
                          Contact details
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-amber-700">
                          Unlock direct contact with owner using 1 credit.
                        </p>
                        <button
                          onClick={handleUnlockOwnerDetails}
                          className="mt-4 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                        >
                          Unlock Details
                        </button>
                      </div>
                    ) : null}
                    {contactUnlocked && owner.phone ? (
                      <button
                        onClick={() => setIsContactModalOpen(true)}
                        className="mt-4 w-full rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100"
                      >
                        <div className="flex items-center text-sm font-semibold text-emerald-800">
                          <Phone className="mr-2 h-4 w-4" />
                          Contact details unlocked
                        </div>
                        <p className="mt-2 text-sm text-emerald-700">Phone: {owner.phone}</p>
                        <p className="mt-1 text-xs text-emerald-600 font-bold">Click to view full profile & WhatsApp</p>
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col justify-center space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                        <div className="mb-1 flex items-center text-sm font-medium text-gray-500">
                          <Star className="mr-1 h-4 w-4 text-yellow-500" />
                          Reviews
                        </div>
                        <div className="text-xl font-bold text-gray-900">
                          4.8 <span className="text-sm font-normal text-gray-500">(12)</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                        <div className="mb-1 flex items-center text-sm font-medium text-gray-500">
                          <ShieldCheck className="mr-1 h-4 w-4 text-blue-500" />
                          Response rate
                        </div>
                        <div className="text-xl font-bold text-gray-900">100%</div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-white bg-white p-5 shadow-sm">
                      <h4 className="flex items-center font-semibold text-gray-900">
                        <Award className="mr-2 h-5 w-5 text-indigo-500" />
                        Direct owner contact
                      </h4>
                      <p className="text-sm leading-relaxed text-gray-600">
                        Premium members get direct access to the owner's contact details so they can continue the conversation outside the platform.
                      </p>
                    </div>

                    {!contactUnlocked && user && user.id !== owner.id ? (
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                        <h4 className="flex items-center font-semibold text-gray-900">
                          <MessageSquare className="mr-2 h-5 w-5 text-gray-700" />
                          Contact unlock policy
                        </h4>
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">
                          Premium members can unlock owner contact details after payment approval.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {!isExternalRoom ? (
              <ReviewSystem
                roomId={id!}
                onRatingUpdate={(average, total) => setRatingStats({ average, total })}
              />
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="sticky top-24 rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/50">
              <div className="mb-8 border-b border-gray-100 pb-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <div className="text-4xl font-extrabold text-gray-900">{priceDisplay}</div>
                    <div className="font-medium text-gray-500">
                      {room.billingPeriod === "night" ? "per night" : room.billingPeriod === "month" ? "per month" : "rate"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                    Deposit: {depositText}
                  </div>
                </div>
              </div>

              {isExternalRoom ? (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                    <div className="mb-2 flex items-center text-sm font-semibold text-blue-800">
                      <Globe className="mr-2 h-4 w-4" />
                      Browser-sourced listing
                    </div>
                    <p className="text-sm leading-relaxed text-blue-700">
                      This room links back to {sourceText}. Availability, owner contact, and final payment terms are managed on the source portal.
                    </p>
                  </div>

                  <a
                    href={room.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                  >
                    Open Original Listing
                    <ExternalLink className="ml-2 h-5 w-5" />
                  </a>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm leading-relaxed text-gray-600">
                    This room no longer supports platform booking. Premium users can unlock owner details and continue the conversation directly with the owner.
                  </div>

                  {contactUnlocked && owner ? (
                    <button
                      type="button"
                      onClick={() => setIsContactModalOpen(true)}
                      className="w-full rounded-2xl bg-emerald-600 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Phone className="h-5 w-5" />
                      View Owner Contact
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleUnlockOwnerDetails}
                      className="w-full rounded-2xl bg-amber-600 py-4 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-amber-700 hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Lock className="h-5 w-5" />
                      Unlock Owner Details
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <CreditPurchaseModal 
        isOpen={isPurchaseModalOpen} 
        onClose={() => setIsPurchaseModalOpen(false)} 
      />

      <RoomUnlockModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        room={room}
        owner={owner}
        onUnlockSuccess={onUnlockSuccess}
        onBuyCredits={() => setIsPurchaseModalOpen(true)}
      />

      <UnlockedContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        room={room}
        owner={owner}
        phone={owner?.phone || unlockedPhone || ""}
      />

      {/* Mobile Fixed Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] border-t border-slate-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-black text-slate-900">{priceDisplay}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Deposit: {depositText}</span>
          </div>
          {isExternalRoom ? (
            <a
              href={room.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-blue-900/20 active:scale-95 transition"
            >
              Open Source
            </a>
          ) : (
            <button
              onClick={handleUnlockOwnerDetails}
              className={`flex-1 rounded-2xl py-3.5 text-center text-sm font-bold text-white shadow-lg active:scale-95 transition ${
                contactUnlocked ? "bg-emerald-600 shadow-emerald-900/20" : "bg-amber-600 shadow-amber-900/20"
              }`}
            >
              {contactUnlocked ? "View Contact" : "Unlock Details"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
