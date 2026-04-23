import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Loader2, MapPin, Navigation, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocationContext } from "../context/LocationContext";
import MapComponent from "../components/MapComponent";

const getRoomPriceText = (room: any) => {
  if (room.priceLabel) return room.priceLabel;
  if (!room.price || room.price <= 0) return "Check source";
  return `\u20B9${room.price.toLocaleString()}/${room.billingPeriod === "night" ? "night" : "mo"}`;
};

export default function MapView() {
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { userLocation, loading: locationLoading, refreshUserLocation } = useLocationContext();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [savedRoomIds, setSavedRoomIds] = useState<Set<string>>(new Set());
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5204, 73.8567]);
  const [mapZoom, setMapZoom] = useState(13);

  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  useEffect(() => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
    }
  }, [userLocation]);

  const fetchRooms = useCallback(async () => {
    try {
      const query = new URLSearchParams();
      if (q) query.append("q", q);
      if (type) query.append("type", type);
      if (minPrice) query.append("minPrice", minPrice);
      if (maxPrice) query.append("maxPrice", maxPrice);

      const res = await fetch(`/api/rooms?${query.toString()}`);
      if (!res.ok) return;

      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (error) {
      console.error("Failed to fetch rooms", error);
    }
  }, [maxPrice, minPrice, q, type]);

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

  const handleRecenter = useCallback(async () => {
    setSelectedRoomId(null);
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]);
      setMapZoom(14);
    }
    await refreshUserLocation();
  }, [refreshUserLocation, userLocation]);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId), [rooms, selectedRoomId]);

  const focusRoom = (room: any) => {
    setSelectedRoomId(room.id);
    if (room.lat != null && room.lng != null) {
      setMapCenter([room.lat, room.lng]);
      setMapZoom(15);
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-76px)] w-full overflow-hidden bg-slate-50 sm:h-[calc(100dvh-84px)] lg:h-[calc(100vh-84px)] mt-[76px] sm:mt-[84px] pb-[calc(env(safe-area-inset-bottom,0px)+80px)] lg:pb-0">
      <main className="relative flex-1 h-full">
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
          onBoundsChange={() => {}}
          userLocation={userLocation ? [userLocation.lat, userLocation.lng] : null}
        />

        {/* Action Buttons */}
        <button
          onClick={handleRecenter}
          className="absolute bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-slate-700 shadow-2xl backdrop-blur-xl transition-all hover:bg-white hover:text-amber-600 active:scale-95 lg:bottom-10"
          title="My Location"
        >
          {locationLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Navigation className="h-6 w-6" />
          )}
        </button>

        <AnimatePresence>
          {selectedRoom && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="pointer-events-auto absolute bottom-4 left-1/2 z-40 w-[95%] -translate-x-1/2 max-w-lg md:left-8 md:translate-x-0 lg:bottom-8"
            >
              <div className="group relative flex gap-3 overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] backdrop-blur-2xl md:p-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.25rem] bg-slate-100 md:h-32 md:w-32">
                  <img
                    src={selectedRoom.images?.[0] || "https://picsum.photos/seed/room/400/300"}
                    alt={selectedRoom.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center pr-4 md:pr-6">
                  <div className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-amber-600 md:text-[10px]">
                    <span className="h-1 w-1 rounded-full bg-amber-500 md:h-1.5 md:w-1.5" />
                    {selectedRoom.type}
                  </div>
                  <h3 className="truncate text-base font-black text-slate-900 md:text-xl">{selectedRoom.title}</h3>
                  <p className="mt-0.5 flex truncate items-center text-[10px] font-medium text-slate-400 md:mt-1 md:text-sm">
                    <MapPin className="mr-1 h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
                    {selectedRoom.city}
                  </p>
                  <div className="mt-2 flex items-center justify-between md:mt-4">
                    <span className="text-sm font-black text-slate-900 md:text-lg">{getRoomPriceText(selectedRoom)}</span>
                    <Link
                      to={`/map/${selectedRoom.id}`}
                      className="rounded-xl bg-slate-900 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-slate-800 md:text-xs"
                    >
                      View
                    </Link>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRoomId(null)}
                  className="absolute right-3 top-3 rounded-xl bg-slate-50 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
