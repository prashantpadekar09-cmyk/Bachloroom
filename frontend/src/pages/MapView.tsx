import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Filter, Heart, List, Loader2, Map as MapIcon, MapPin, Navigation, Search, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocationContext } from "../context/LocationContext";
import MapComponent from "../components/MapComponent";

const getRoomPriceText = (room: any) => {
  if (room.priceLabel) return room.priceLabel;
  if (!room.price || room.price <= 0) return "Check source";
  return `\u20B9${room.price.toLocaleString()}/${room.billingPeriod === "night" ? "night" : "mo"}`;
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function MapView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { userLocation, searchLocation, loading: locationLoading, searchByQuery, refreshUserLocation, setSearchLocation } =
    useLocationContext();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [savedRoomIds, setSavedRoomIds] = useState<Set<string>>(new Set());
  const [mapBounds, setMapBounds] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5204, 73.8567]);
  const [mapZoom, setMapZoom] = useState(13);

  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "";

  const [draftQ, setDraftQ] = useState(q);
  const [draftType, setDraftType] = useState(type);
  const [draftMinPrice, setDraftMinPrice] = useState(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState(maxPrice);

  useEffect(() => {
    setDraftQ(q);
    setDraftType(type);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
  }, [q, type, minPrice, maxPrice]);

  useEffect(() => {
    if (searchLocation) {
      setMapCenter([searchLocation.lat, searchLocation.lng]);
      setMapZoom(14);
      return;
    }

    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  }, [searchLocation, userLocation]);

  const fetchRooms = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams();
      if (q) query.append("q", q);
      if (type) query.append("type", type);
      if (minPrice) query.append("minPrice", minPrice);
      if (maxPrice) query.append("maxPrice", maxPrice);
      if (sort) query.append("sort", sort);

      if (mapBounds) {
        query.append("minLat", mapBounds.getSouth().toString());
        query.append("maxLat", mapBounds.getNorth().toString());
        query.append("minLng", mapBounds.getWest().toString());
        query.append("maxLng", mapBounds.getEast().toString());
      }

      const res = await fetch(`/api/rooms?${query.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    } finally {
      setLoading(false);
    }
  }, [mapBounds, maxPrice, minPrice, q, sort, type]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    const fetchSavedRooms = async () => {
      if (!token) return;

      try {
        const res = await fetch("/api/saved-rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        setSavedRoomIds(new Set(data.rooms.map((room: any) => room.id)));
      } catch (error) {
        console.error(error);
      }
    };

    fetchSavedRooms();
  }, [token]);

  const handleSearch = async () => {
    const nextQuery = draftQ.trim();
    const params = new URLSearchParams(searchParams);

    if (!nextQuery) {
      setSearchLocation(null);
      params.delete("q");
      setSearchParams(params);
      return;
    }

    params.set("q", nextQuery);
    setSearchParams(params);
    await searchByQuery(nextQuery);
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams);

    if (draftType) params.set("type", draftType);
    else params.delete("type");

    if (draftMinPrice) params.set("minPrice", draftMinPrice);
    else params.delete("minPrice");

    if (draftMaxPrice) params.set("maxPrice", draftMaxPrice);
    else params.delete("maxPrice");

    setSearchParams(params);
    setIsFilterOpen(false);
  };

  const handleRecenter = useCallback(async () => {
    setDraftQ("");
    setSelectedRoomId(null);
    setSearchLocation(null);
    setMapBounds(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("q");
      return next;
    });
    await refreshUserLocation();
    setMapZoom(14);
  }, [refreshUserLocation, setSearchLocation, setSearchParams]);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId), [rooms, selectedRoomId]);

  const nearbyRooms = useMemo(() => {
    const baseLat = searchLocation?.lat || userLocation?.lat || mapCenter[0];
    const baseLng = searchLocation?.lng || userLocation?.lng || mapCenter[1];

    return rooms
      .map((room) => ({
        ...room,
        distance:
          room.lat != null && room.lng != null ? getDistance(baseLat, baseLng, room.lat, room.lng) : Number.POSITIVE_INFINITY,
      }))
      .filter((room) => Number.isFinite(room.distance) && room.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [mapCenter, rooms, searchLocation, userLocation]);

  const visibleRooms = useMemo(() => (nearbyRooms.length > 0 ? nearbyRooms : rooms), [nearbyRooms, rooms]);

  const handleSaveRoom = async (event: React.MouseEvent, roomId: string) => {
    event.preventDefault();
    event.stopPropagation();

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
    } catch (error) {
      console.error(error);
    }
  };

  const focusRoom = (room: any) => {
    setSelectedRoomId(room.id);
    if (room.lat != null && room.lng != null) {
      setMapCenter([room.lat, room.lng]);
      setMapZoom(15);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-slate-50 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] lg:h-screen lg:pb-0">
      <div className="absolute left-3 right-3 top-3 z-30 flex flex-col gap-2 pointer-events-none lg:left-8 lg:top-8 lg:w-[420px]">
        <div className="flex gap-2 pointer-events-auto">
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-white/40 blur-xl transition-all group-focus-within:bg-amber-100/20" />
            <div className="relative flex items-center overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl transition-all focus-within:border-amber-200 focus-within:shadow-[0_16px_48px_-16px_rgba(180,136,69,0.2)] md:rounded-3xl">
              <Search className="ml-3 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-amber-600 md:ml-5 md:h-5 md:w-5" />
              <input
                value={draftQ}
                onChange={(event) => setDraftQ(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                placeholder="Search location..."
                className="w-full bg-transparent px-3 py-3 text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 md:px-4 md:py-4 md:text-sm"
              />
              {draftQ && (
                <button onClick={() => setDraftQ("")} className="mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="pointer-events-auto flex h-[48px] w-[48px] items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg transition-all hover:bg-slate-800 active:scale-95 md:h-[58px] md:w-[58px] md:rounded-3xl"
            title="Search"
          >
            <Search className="h-4 w-4 md:h-5 md:w-5" />
          </button>

          <button
            onClick={() => setIsFilterOpen(true)}
            className="pointer-events-auto flex h-[48px] w-[48px] items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-slate-700 shadow-lg transition-all hover:bg-white hover:text-amber-600 active:scale-95 md:h-[58px] md:w-[58px] md:rounded-3xl"
            title="Filters"
          >
            <Filter className="h-4 w-4 md:h-5 md:w-5" />
          </button>

          <button
            onClick={() => setShowList((current) => !current)}
            className="pointer-events-auto hidden h-[58px] w-[58px] items-center justify-center rounded-3xl border border-white/70 bg-white/90 text-slate-700 shadow-lg transition-all hover:bg-white hover:text-amber-600 lg:flex"
            title={showList ? "Hide listings" : "Show listings"}
          >
            {showList ? <MapIcon className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {showList && (
        <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[42vh] overflow-hidden rounded-t-[2rem] border-t border-white/70 bg-white/95 shadow-[0_-24px_70px_-30px_rgba(15,23,42,0.38)] backdrop-blur-xl lg:relative lg:inset-auto lg:z-10 lg:h-full lg:max-h-none lg:w-[420px] lg:rounded-none lg:border-r lg:border-t-0 lg:border-slate-200/70 lg:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 lg:px-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Listings</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">
                {visibleRooms.length} stay{visibleRooms.length === 1 ? "" : "s"}
              </h2>
            </div>
            <button
              onClick={() => setShowList(false)}
              className="rounded-2xl bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 lg:hidden"
              title="Hide listings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="hide-scrollbar h-[calc(42vh-76px)] space-y-3 overflow-y-auto px-4 py-4 lg:h-[calc(100%-76px)] lg:px-5">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading listings...
                </div>
              </div>
            ) : visibleRooms.length > 0 ? (
              visibleRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={room.id === selectedRoomId}
                  isSaved={savedRoomIds.has(room.id)}
                  onSave={(event: React.MouseEvent) => handleSaveRoom(event, room.id)}
                  onSelect={() => focusRoom(room)}
                />
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                <p className="text-base font-bold text-slate-900">No rooms found</p>
                <p className="mt-2 text-sm text-slate-500">Try another location or widen your price range.</p>
              </div>
            )}
          </div>
        </aside>
      )}

      <div className="relative flex-1 h-full">
        <MapComponent
          center={mapCenter}
          zoom={mapZoom}
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onRoomClick={(roomId) => {
            const room = rooms.find((item) => item.id === roomId);
            if (!room) return;
            focusRoom(room);
          }}
          onBoundsChange={(bounds) => setMapBounds(bounds)}
          userLocation={userLocation ? [userLocation.lat, userLocation.lng] : null}
        />

        {!showList && (
          <button
            onClick={() => setShowList(true)}
            className="absolute bottom-24 left-4 z-30 flex items-center gap-2 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 text-sm font-bold text-slate-700 shadow-xl transition hover:bg-white hover:text-amber-700 lg:bottom-8 lg:left-8"
          >
            <List className="h-4 w-4" />
            Show listings
          </button>
        )}

        <button
          onClick={handleRecenter}
          className="absolute bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-600 shadow-2xl transition-all hover:text-blue-600 active:scale-90 sm:bottom-6 sm:right-6 md:h-14 md:w-14 md:rounded-2xl lg:bottom-8 lg:right-8"
          title="My Location"
        >
          {locationLoading ? <Loader2 className="h-5 w-5 animate-spin md:h-6 md:w-6" /> : <Navigation className="h-5 w-5 md:h-6 md:w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {selectedRoom && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="pointer-events-auto absolute bottom-24 left-3 right-3 z-40 mx-auto max-w-xl sm:bottom-4 lg:bottom-8 lg:left-8 lg:right-auto"
          >
            <div className="group relative flex gap-3 overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:rounded-[2.5rem] md:gap-5 md:p-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1rem] bg-slate-100 md:h-36 md:w-36 md:rounded-[1.75rem]">
                <img
                  src={selectedRoom.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                  alt={selectedRoom.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center pr-4 md:pr-6">
                <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 md:mb-2 md:text-[10px]">
                  <span className="h-1 w-1 rounded-full bg-amber-500 md:h-1.5 md:w-1.5" />
                  {selectedRoom.type}
                </div>
                <h3 className="truncate text-base font-black leading-tight text-slate-900 md:text-xl">{selectedRoom.title}</h3>
                <p className="mt-0.5 flex items-center text-[10px] font-medium text-slate-400 md:mt-1 md:text-sm">
                  <MapPin className="mr-1 h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
                  {selectedRoom.city}
                </p>
                <div className="mt-2 flex items-center justify-between md:mt-4">
                  <span className="text-sm font-black tracking-tight text-slate-900 md:text-lg">{getRoomPriceText(selectedRoom)}</span>
                  <Link
                    to={`/map/${selectedRoom.id}`}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800 md:rounded-2xl md:px-6 md:py-2.5 md:text-xs"
                  >
                    Details
                  </Link>
                </div>
              </div>

              <button
                onClick={() => setSelectedRoomId(null)}
                className="absolute right-3 top-3 rounded-lg bg-slate-50 p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900 md:rounded-xl md:p-2"
                title="Close"
              >
                <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm sm:items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl sm:rounded-[2.5rem] sm:p-8"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Filters</h2>
                <button onClick={() => setIsFilterOpen(false)} className="rounded-2xl bg-slate-50 p-2 text-slate-400" title="Close filters">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">Room Type</label>
                  <select
                    value={draftType}
                    onChange={(event) => setDraftType(event.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none ring-amber-500/20 focus:ring-2"
                  >
                    <option value="">All Types</option>
                    {["Single Room", "Shared Room", "PG", "Hostel", "Studio Apartment"].map((roomType) => (
                      <option key={roomType} value={roomType}>
                        {roomType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">Min Price</label>
                    <input
                      type="number"
                      value={draftMinPrice}
                      onChange={(event) => setDraftMinPrice(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-3 block text-xs font-black uppercase tracking-widest text-slate-400">Max Price</label>
                    <input
                      type="number"
                      value={draftMaxPrice}
                      onChange={(event) => setDraftMaxPrice(event.target.value)}
                      placeholder="100000"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setDraftType("");
                      setDraftMinPrice("");
                      setDraftMaxPrice("");
                    }}
                    className="flex-1 rounded-2xl border border-slate-100 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-[2] rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-xl transition hover:bg-slate-800 active:scale-95"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoomCard({ room, isSelected, onSave, isSaved, onSelect }: any) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border bg-white p-3 transition-all ${
        isSelected ? "border-transparent" : "border-slate-100 shadow-sm hover:border-amber-200 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]"
      }`}
    >
      <div className="flex gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
          <img
            src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"}
            alt={room.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
          <button
            onClick={onSave}
            className={`absolute right-2 top-2 z-10 rounded-full p-1.5 backdrop-blur-md transition ${
              isSaved ? "bg-red-500 text-white" : "bg-white/70 text-slate-400 hover:bg-white hover:text-red-500"
            }`}
            title={isSaved ? "Saved" : "Save room"}
          >
            <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center pr-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            {room.type}
          </div>
          <h3 className="mt-1 truncate text-base font-black leading-tight text-slate-900 transition-colors group-hover:text-amber-700">
            {room.title}
          </h3>
          <p className="mt-1 flex truncate items-center text-xs font-medium text-slate-400">
            <MapPin className="mr-1 h-3 w-3 shrink-0" />
            {room.location}, {room.city}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-black tracking-tight text-slate-900">{getRoomPriceText(room)}</span>
            <Link
              to={`/map/${room.id}`}
              className="rounded-xl bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:bg-amber-100 hover:text-amber-700"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
