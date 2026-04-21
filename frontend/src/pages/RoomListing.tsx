import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowDownUp, Filter, Heart, MapPin, Search, Star, X, Crown } from "lucide-react";
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
  const [cities, setCities] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftCity, setDraftCity] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftType, setDraftType] = useState("");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [draftQ, setDraftQ] = useState("");
  const [draftSort, setDraftSort] = useState("");
  const [savedRoomIds, setSavedRoomIds] = useState<Set<string>>(new Set());
  const { user, token } = useAuth();

  const q = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";
  const type = searchParams.get("type") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const location = searchParams.get("location") || "";
  const sort = searchParams.get("sort") || "";

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch("/api/rooms/cities");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.cities)) setCities(data.cities);
      } catch {
        // ignore
      }
    };
    fetchCities();
  }, []);

  useEffect(() => {
    setDraftCity(city);
    setDraftLocation(location);
    setDraftType(type);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setDraftQ(q);
    setDraftSort(sort);
  }, [city, location, type, minPrice, maxPrice, q, sort]);

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
        if (q) query.append("q", q);
        if (city) query.append("city", city);
        if (location) query.append("location", location);
        if (type) query.append("type", type);
        if (minPrice) query.append("minPrice", minPrice);
        if (maxPrice) query.append("maxPrice", maxPrice);
        if (sort) query.append("sort", sort);

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
  }, [q, city, location, type, minPrice, maxPrice, sort]);

  const setQueryParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      const trimmed = value.trim();
      if (!trimmed) params.delete(key);
      else params.set(key, trimmed);
    }
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
    setIsFilterOpen(false);
  };

  const applyDraftFilters = () => {
    setQueryParams({
      q: draftQ,
      city: draftCity,
      location: draftLocation,
      type: draftType,
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice,
      sort: draftSort,
    });
    setIsFilterOpen(false);
  };

  const activeChips = [
    q ? { key: "q", label: `“${q}”` } : null,
    city ? { key: "city", label: city } : null,
    location ? { key: "location", label: location } : null,
    type ? { key: "type", label: type } : null,
    minPrice ? { key: "minPrice", label: `Min ₹${minPrice}` } : null,
    maxPrice ? { key: "maxPrice", label: `Max ₹${maxPrice}` } : null,
    sort ? { key: "sort", label: sort === "price_asc" ? "Price: Low → High" : "Price: High → Low" } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

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
      <div className="sticky top-[76px] z-20 border-b border-amber-100/50 bg-[rgba(255,248,239,0.78)] px-4 py-4 backdrop-blur-xl sm:top-[84px] sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1e140d] sm:text-2xl">
              {rooms.length} {rooms.length === 1 ? "Room" : "Rooms"} Found
            </h1>
            <p className="mt-1 text-sm text-[#7a6553]">Browse verified stays across Pune, Nashik, Mumbai, and Goa.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative flex-1 sm:w-[360px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700/80" />
              <input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyDraftFilters();
                }}
                placeholder="Search room, area, landmark…"
                className="w-full rounded-2xl border border-amber-100/80 bg-white/85 py-3 pl-11 pr-4 text-sm font-semibold text-[#1e140d] shadow-sm outline-none transition focus:border-amber-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-100/80 bg-white/85 px-4 py-3 text-sm font-bold text-[#1e140d] shadow-sm transition hover:bg-white"
              >
                <Filter className="h-4 w-4 text-amber-700" />
                Filters
              </button>

              <button
                type="button"
                onClick={() => setQueryParams({ sort: sort === "price_asc" ? "price_desc" : "price_asc" })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-100/80 bg-white/85 px-4 py-3 text-sm font-bold text-[#1e140d] shadow-sm transition hover:bg-white"
                aria-label="Toggle price sorting"
              >
                <ArrowDownUp className="h-4 w-4 text-amber-700" />
                Sort
              </button>
            </div>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setQueryParams({ [chip.key]: "" })}
                className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white/80 px-3 py-1.5 text-xs font-bold text-[#5b3d18] shadow-sm transition hover:bg-white"
              >
                {chip.label}
                <X className="h-3.5 w-3.5 text-amber-700/70" />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-auto inline-flex items-center justify-center rounded-full border border-amber-200/70 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-800 transition hover:brightness-105"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          {isFilterOpen ? (
            <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-6 backdrop-blur-sm sm:items-center sm:pb-6">
              <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_40px_90px_-55px_rgba(15,23,42,0.5)]">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">Filters</p>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Close filters"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[65dvh] overflow-y-auto p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">City</label>
                      <select
                        value={draftCity}
                        onChange={(e) => setDraftCity(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-sky-300"
                      >
                        <option value="">All cities</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Type</label>
                      <select
                        value={draftType}
                        onChange={(e) => setDraftType(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-sky-300"
                      >
                        <option value="">All types</option>
                        {["Single Room", "Shared Room", "PG", "Hostel", "Studio Apartment"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Area / Location</label>
                      <input
                        value={draftLocation}
                        onChange={(e) => setDraftLocation(e.target.value)}
                        placeholder="e.g., Andheri, Baner, Koregaon Park"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-sky-300"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Min Price</label>
                      <input
                        inputMode="numeric"
                        value={draftMinPrice}
                        onChange={(e) => setDraftMinPrice(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="0"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-sky-300"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Max Price</label>
                      <input
                        inputMode="numeric"
                        value={draftMaxPrice}
                        onChange={(e) => setDraftMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="50000"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-sky-300"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-500">Sort</label>
                      <select
                        value={draftSort}
                        onChange={(e) => setDraftSort(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-sky-300"
                      >
                        <option value="">Recommended</option>
                        <option value="price_asc">Price: Low → High</option>
                        <option value="price_desc">Price: High → Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-white px-5 py-4">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyDraftFilters}
                    className="rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ) : null}

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
