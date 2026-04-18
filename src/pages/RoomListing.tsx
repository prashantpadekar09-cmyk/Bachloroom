import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { MapPin, Star, Heart, Search, Crown } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

const getRoomPriceText = (room: any) => {
  if (room.priceLabel) return room.priceLabel;
  if (!room.price || room.price <= 0) return "Check source";
  return `Rs. ${room.price.toLocaleString()}/${room.billingPeriod === "night" ? "night" : "mo"}`;
};

export default function RoomListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedRoomIds, setSavedRoomIds] = useState<Set<string>>(new Set());
  const { user, token } = useAuth();

  const city = searchParams.get("city") || "";
  const type = searchParams.get("type") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const location = searchParams.get("location") || "";

  const navigate = useNavigate();

  useEffect(() => {
    const fetchSavedRooms = async () => {
      if (!token) return;
      try {
        const res = await fetch("/api/saved-rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSavedRoomIds(new Set(data.rooms.map((r: any) => r.id)));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSavedRooms();
  }, [token]);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (city) query.append("city", city);
        if (location) query.append("location", location);
        if (type) query.append("type", type);
        if (minPrice) query.append("minPrice", minPrice);
        if (maxPrice) query.append("maxPrice", maxPrice);

        const res = await fetch(`/api/rooms?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms || []);
        }
      } catch (err) {
        console.error("Failed to fetch rooms", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchRooms();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [city, location, type, minPrice, maxPrice]);

  const handleSaveRoom = async (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/login");
      return;
    }

    if (savedRoomIds.has(roomId)) return;

    try {
      const res = await fetch("/api/saved-rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        setSavedRoomIds((prev) => new Set([...Array.from(prev), roomId]));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const SkeletonCard = () => (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] shadow-sm">
      <div className="h-48 bg-amber-100/70" />
      <div className="p-5">
        <div className="mb-4 h-4 w-1/3 rounded bg-amber-100/70" />
        <div className="mb-4 h-6 w-3/4 rounded bg-amber-100/70" />
        <div className="mb-4 h-6 w-1/4 rounded bg-amber-100/70" />
        <div className="mt-4 h-10 rounded-xl bg-amber-100/70" />
      </div>
    </div>
  );

  const recentViews = !loading ? JSON.parse(localStorage.getItem("recentViews") || "[]") : [];
  const recommendedRooms = recentViews.length
    ? rooms.filter((room) =>
      recentViews.some((view: any) => view.city === room.city || view.type === room.type)
    ).slice(0, 3)
    : [];
  const recommendedRoomIds = new Set(recommendedRooms.map((room) => room.id));

  const luxuriousRooms = !loading
    ? rooms.filter((r) => r.isLuxury && !recommendedRoomIds.has(r.id))
    : [];
  const luxuriousRoomIds = new Set(luxuriousRooms.map((room) => room.id));

  const visibleRooms = rooms.filter(
    (room) => !recommendedRoomIds.has(room.id) && !luxuriousRoomIds.has(room.id)
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-[linear-gradient(180deg,#f5eee5_0%,#efe1cf_18%,#fffaf3_42%,#f8f1e7_72%,#ffffff_100%)]">
      <div className="sticky top-16 z-20 border-b border-amber-100/50 bg-[rgba(255,248,239,0.78)] px-4 py-4 backdrop-blur-xl sm:top-[72px] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1e140d] sm:text-2xl">
              {rooms.length} {rooms.length === 1 ? "Room" : "Rooms"} Found
            </h1>
            <p className="mt-1 text-sm text-[#7a6553]">Browse verified stays across Pune, Nashik, Mumbai, and Goa.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          {!loading && recommendedRooms.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h2 className="mb-5 flex items-center text-xl font-bold text-[#1e140d] sm:mb-6 sm:text-2xl">
                <Star className="mr-2 h-6 w-6 fill-current text-amber-500" />
                Recommended for You
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                {recommendedRooms.map((room) => (
                  <Link
                    key={`rec-${room.id}`}
                    to={`/rooms/${room.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-900/10"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                        alt={room.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute left-3 top-3 rounded-lg border border-amber-200/60 bg-[#fff7ec]/95 px-3 py-1.5 text-sm font-bold text-amber-700 shadow-sm backdrop-blur-md">
                        {getRoomPriceText(room)}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="line-clamp-1 text-base font-bold text-[#1e140d]">{room.title}</h3>
                      <p className="mt-1 flex items-center text-sm text-[#7a6553]">
                        <MapPin className="mr-1 h-3.5 w-3.5" />
                        {room.location}, {room.city}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!loading && luxuriousRooms.length > 0 && (
            <div className="mb-8 sm:mb-10">
              <h2 className="mb-5 flex items-center text-xl font-bold text-[#1e140d] sm:mb-6 sm:text-2xl">
                <Crown className="mr-2 h-6 w-6 text-amber-600" />
                Luxurious Stays
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
                {luxuriousRooms.map((room) => (
                  <Link
                    key={`lux-${room.id}`}
                    to={`/rooms/${room.id}`}
                    className="group flex flex-col overflow-hidden rounded-[24px] border border-amber-200/50 bg-[linear-gradient(135deg,#fffbf2_0%,#f0e1c9_100%)] shadow-md transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-900/15"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                        alt={room.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute left-3 top-3 rounded-lg border border-amber-300 bg-[#fffdf9]/95 px-3 py-1.5 text-sm font-bold text-amber-800 shadow-sm backdrop-blur-md">
                        {getRoomPriceText(room)}
                      </div>
                      <div className="absolute right-3 top-3 rounded-full bg-slate-900/60 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-[#f0e1c9] backdrop-blur-sm">
                        Premium
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="line-clamp-1 text-lg font-black text-[#2b1f15]">{room.title}</h3>
                      <p className="mt-1.5 flex items-center text-sm font-medium text-[#7a5f45]">
                        <MapPin className="mr-1.5 h-4 w-4" />
                        {room.location}, {room.city}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] p-8 text-center shadow-sm sm:mt-10 sm:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
                <Search className="h-10 w-10 text-amber-300" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-[#1e140d] sm:text-2xl">No rooms found</h3>
              <p className="mb-8 text-base text-[#7a6553] sm:text-lg">Try searching in a different area.</p>
              <button
                type="button"
                onClick={() => setSearchParams(new URLSearchParams())}
                className="rounded-xl bg-[#1f170f] px-8 py-3 font-semibold text-amber-50 transition-colors hover:bg-[#8a6431]"
              >
                View all rooms
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visibleRooms.map((room, index) => (
                <React.Fragment key={room.id}>
                  {index === 4 && (
                    <div className="col-span-1 my-2 rounded-3xl bg-[linear-gradient(135deg,#16120d_0%,#2b1c12_34%,#7c5a2c_100%)] p-6 text-white shadow-lg shadow-amber-900/20 md:col-span-2 lg:my-4 xl:col-span-3 xl:flex xl:items-center xl:justify-between xl:p-8">
                      <div>
                        <h3 className="mb-2 text-xl font-bold sm:text-2xl">Need help moving?</h3>
                        <p className="text-base text-amber-50/80 sm:text-lg">Check out our trusted packers and movers in the Services marketplace.</p>
                      </div>
                      <Link
                        to="/services"
                        className="mt-6 inline-flex rounded-xl bg-[#f6e7cf] px-6 py-3 font-bold text-[#1e140d] shadow-sm transition-colors hover:brightness-105 xl:mt-0"
                      >
                        Explore Services
                      </Link>
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                    className={`group flex flex-col overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] shadow-sm transition-all hover:shadow-xl hover:shadow-amber-900/10 ${room.isFeatured ? "border-amber-400 ring-1 ring-amber-400" : "border-amber-100/80"
                      }`}
                  >
                    <div className="relative h-52 overflow-hidden sm:h-56">
                      <img
                        src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                        alt={room.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveRoom(e, room.id)}
                        className={`absolute right-4 top-4 z-10 rounded-full p-2 backdrop-blur-md transition-colors ${savedRoomIds.has(room.id)
                          ? "bg-red-500 text-white"
                          : "bg-white/80 text-[#7a6553] hover:bg-white hover:text-red-500"
                          }`}
                      >
                        <Heart className={`h-5 w-5 ${savedRoomIds.has(room.id) ? "fill-current" : ""}`} />
                      </button>
                      <div className="absolute bottom-4 left-4 rounded-lg border border-amber-200/60 bg-[#fff7ec]/95 px-3 py-1.5 text-sm font-bold text-amber-700 shadow-sm backdrop-blur-md">
                        {getRoomPriceText(room)}
                      </div>
                      {room.sourceLabel && (
                        <div className="absolute left-4 top-4 rounded-lg bg-[#1f170f] px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-50 shadow-sm">
                          {room.sourceLabel}
                        </div>
                      )}
                      {room.isFeatured && (
                        <div
                          className={`absolute left-4 rounded-lg bg-[#f4e1bf] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#5b3d18] shadow-sm ${room.sourceLabel ? "top-14" : "top-4"
                            }`}
                        >
                          Featured
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <div className="mb-3 flex items-center text-sm font-medium text-[#7a6553]">
                        <MapPin className="mr-1 h-4 w-4 text-amber-700" />
                        {room.location}, {room.city}
                      </div>
                      <h3 className="mb-3 line-clamp-2 text-lg font-bold text-[#1e140d] transition-colors group-hover:text-amber-700 sm:text-xl">
                        {room.title}
                      </h3>
                      <div className="mb-5 w-fit rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                        {room.type}
                      </div>
                      {room.sourceLabel && <div className="mb-5 text-xs font-medium text-[#7a6553]">Sourced from {room.sourceLabel}</div>}
                      <div className="mt-auto">
                        <Link
                          to={`/rooms/${room.id}`}
                          className="block w-full rounded-xl border border-amber-100 bg-white/80 py-3 text-center font-bold text-[#1e140d] transition-all hover:border-[#8a6431] hover:bg-[#8a6431] hover:text-amber-50"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
