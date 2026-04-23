import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Heart, Star, Search, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getRoomPriceText = (room: any) =>
  room.priceLabel ||
  (room.price > 0
    ? `Rs. ${room.price.toLocaleString()}/${room.billingPeriod === "night" ? "night" : "mo"}`
    : "Check source");

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const query = searchParams.get("q") || "";
  const city = searchParams.get("city") || "";

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/rooms");
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
  }, []);

  useEffect(() => {
    setSearchQuery(query || city);
  }, [query, city]);

  const filteredRooms = useMemo(() => {
    const searchText = searchQuery.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        !searchText ||
        room.title?.toLowerCase().includes(searchText) ||
        room.location?.toLowerCase().includes(searchText) ||
        room.city?.toLowerCase().includes(searchText) ||
        room.type?.toLowerCase().includes(searchText);

      const matchesCity = !city || room.city?.toLowerCase() === city.toLowerCase();

      return matchesSearch && matchesCity;
    });
  }, [city, rooms, searchQuery]);

  const applySearch = () => {
    const params = new URLSearchParams(searchParams);
    const nextValue = searchQuery.trim();

    if (nextValue) {
      params.set("q", nextValue);
    } else {
      params.delete("q");
    }

    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5eee5_0%,#efe1cf_18%,#fffaf3_42%,#f8f1e7_72%,#ffffff_100%)]">
      {/* Hero Section */}
      <section className="relative flex min-h-[56vh] items-center justify-center overflow-hidden bg-[#16120d] sm:min-h-[60vh]">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-60 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,10,7,0.72)_0%,rgba(24,18,13,0.58)_32%,rgba(36,25,15,0.74)_68%,rgba(245,238,229,1)_100%)]"></div>
        </div>

        <div className="relative z-10 w-full max-w-4xl px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl"
          >
            Find Your <span className="text-amber-300">Perfect</span> Space
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mb-8 max-w-2xl text-base font-medium text-amber-50/85 sm:mb-10 sm:text-xl"
          >
            Explore curated bachelor-friendly rooms with a simpler search and less clutter.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col gap-2 rounded-[1.75rem] border border-amber-200/25 bg-white/10 p-2 shadow-2xl backdrop-blur-xl lg:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-100/70" />
              <input
                type="text"
                placeholder="Search by city, area, room name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applySearch();
                  }
                }}
                className="w-full rounded-xl border-none bg-white/10 py-4 pl-12 pr-4 text-white placeholder:text-amber-50/55 transition-all focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
            <button
              type="button"
              onClick={applySearch}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#f4e1bf] px-8 py-4 font-bold text-[#1e140d] shadow-lg shadow-amber-900/10 transition-all hover:brightness-105"
            >
              Find Now
            </button>
          </motion.div>

          {(query || city) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {city ? <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">City: {city}</span> : null}
              {query ? <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md">Search: {query}</span> : null}
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:px-8">
        <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[#1e140d]">Featured Listings</h2>
            <p className="mt-1 text-[#7a6553]">Handpicked spaces for your lifestyle</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[450px] animate-pulse rounded-3xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f6ede2_100%)]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room, index) => (
                <motion.div
                  layout
                  key={room.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] transition-all hover:border-amber-200 hover:shadow-2xl hover:shadow-amber-900/10"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={room.images?.[0] || `https://picsum.photos/seed/${room.id}/800/600`}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4">
                      <button className="rounded-full bg-white/85 p-3 text-[#7a6553] shadow-sm backdrop-blur-md transition-colors hover:text-amber-700">
                        <Heart className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <span className="rounded-lg border border-amber-200/60 bg-[#fff7ec]/95 px-3 py-1.5 text-sm font-bold text-amber-700 shadow-lg">
                        {getRoomPriceText(room)}
                      </span>
                      {room.rating && (
                        <span className="flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-bold text-[#1e140d] shadow-sm backdrop-blur-md">
                          <Star className="h-4 w-4 fill-current text-amber-500" />
                          {room.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-3 flex items-center text-sm font-bold uppercase tracking-wider text-amber-700">
                      <MapPin className="h-4 w-4 mr-1.5" />
                      {room.location}, {room.city}
                    </div>
                    <h3 className="mb-3 line-clamp-1 text-2xl font-bold text-[#1e140d] transition-colors group-hover:text-amber-700">
                      {room.title}
                    </h3>
                    <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-[#5f4b3b]">
                      {room.description || "Experience premium living with all modern amenities included. Perfect for students and working professionals."}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between border-t border-amber-100/70 pt-6">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-amber-50">
                            <img src={`https://i.pravatar.cc/100?u=${room.id + i}`} alt="User" />
                          </div>
                        ))}
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-50 text-[10px] font-bold text-[#7a6553]">
                          +12
                        </div>
                      </div>
                      <Link
                        to={`/map/${room.id}`}
                        className="flex items-center gap-2 rounded-xl bg-[#1f170f] px-6 py-3 font-bold text-amber-50 transition-all hover:bg-[#8a6431]"
                      >
                        Details <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredRooms.length === 0 && (
          <div className="py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-50">
              <Search className="h-10 w-10 text-amber-300" />
            </div>
            <h3 className="mb-2 text-2xl font-bold text-[#1e140d]">No rooms found</h3>
            <p className="text-[#7a6553]">Try another search or clear the current query.</p>
            <button
              onClick={clearFilters}
              className="mt-6 font-bold text-amber-700 hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      {/* Newsletter / CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:px-8">
        <div className="relative overflow-hidden rounded-[3rem] bg-[linear-gradient(135deg,#16120d_0%,#2b1c12_34%,#7c5a2c_100%)] p-8 text-center shadow-[0_40px_100px_-50px_rgba(52,34,16,0.85)] sm:p-12 md:p-20">
          <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-amber-200/10 blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Ready to find your next home?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-base text-amber-50/80 sm:mb-10 sm:text-xl">
              Join 5,000+ bachelors who found their perfect living space through BachelorRooms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="rounded-2xl bg-[#f6e7cf] px-10 py-5 text-lg font-bold text-[#1e140d] shadow-xl shadow-black/10 transition-all hover:brightness-105">
                Get Started Now
              </Link>
              <Link to="/map" className="rounded-2xl border border-amber-200/30 bg-white/10 px-10 py-5 text-lg font-bold text-white transition-all hover:bg-white/20">
                Browse All Rooms
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
