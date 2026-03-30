import { type FormEvent, useEffect, useState } from "react";
import { CheckCircle, Edit, Trash2, Search, Filter, MapPin, IndianRupee, Loader2, ExternalLink, Home, X, Crown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AdminPageHero, AdminSurface } from "../components/admin/AdminTheme";

interface Room {
  id: string;
  title: string;
  description: string;
  price: number;
  deposit: number;
  location: string;
  city: string;
  type: string;
  images: string[] | string;
  amenities: string[] | string;
  lat?: number | null;
  lng?: number | null;
  isFeatured?: number;
  isLuxury?: number;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
}

type RoomFormState = {
  title: string;
  description: string;
  price: string;
  deposit: string;
  location: string;
  city: string;
  type: string;
  amenities: string;
  images: string;
  lat: string;
  lng: string;
};

const emptyRoomForm: RoomFormState = {
  title: "",
  description: "",
  price: "",
  deposit: "",
  location: "",
  city: "",
  type: "Single Room",
  amenities: "",
  images: "",
  lat: "",
  lng: "",
};

export default function AdminRooms() {
  const { token } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState<"all" | "internal" | "sourced">("all");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<RoomFormState>(emptyRoomForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [togglingLuxuryId, setTogglingLuxuryId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (token) {
      fetchRooms();
    }
  }, [token]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/admin/rooms", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      }
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const parseStringArray = (value: string[] | string | null | undefined) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (!value) {
      return [];
    }

    if (typeof value === "string" && !value.trim().startsWith("[")) {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  };

  const availableCities = Array.from(new Set<string>(rooms.map((room) => room.city))).sort((a, b) =>
    a.localeCompare(b)
  );

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.ownerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = cityFilter === "all" || room.city === cityFilter;
    const matchesListingType =
      listingFilter === "all" ||
      (listingFilter === "sourced" && Boolean(room.sourceUrl)) ||
      (listingFilter === "internal" && !room.sourceUrl);

    return matchesSearch && matchesCity && matchesListingType;
  });

  const openEditModal = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      title: room.title || "",
      description: room.description || "",
      price: String(room.price ?? ""),
      deposit: String(room.deposit ?? ""),
      location: room.location || "",
      city: room.city || "",
      type: room.type || "Single Room",
      amenities: parseStringArray(room.amenities).join(", "),
      images: parseStringArray(room.images).join(", "),
      lat: room.lat == null ? "" : String(room.lat),
      lng: room.lng == null ? "" : String(room.lng),
    });
  };

  const closeEditModal = () => {
    if (isSaving) {
      return;
    }

    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
  };

  const handleEditSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingRoom || isSaving) {
      return;
    }

    setIsSaving(true);

    const amenities = roomForm.amenities
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const images = roomForm.images
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: roomForm.title.trim(),
          description: roomForm.description.trim(),
          price: Number(roomForm.price),
          deposit: Number(roomForm.deposit),
          location: roomForm.location.trim(),
          city: roomForm.city.trim(),
          type: roomForm.type,
          amenities,
          images,
          lat: roomForm.lat.trim() ? Number(roomForm.lat) : null,
          lng: roomForm.lng.trim() ? Number(roomForm.lng) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to update room", "error");
        return;
      }

      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === editingRoom.id
            ? {
              ...room,
              title: roomForm.title.trim(),
              description: roomForm.description.trim(),
              price: Number(roomForm.price),
              deposit: Number(roomForm.deposit),
              location: roomForm.location.trim(),
              city: roomForm.city.trim(),
              type: roomForm.type,
              amenities,
              images,
              lat: roomForm.lat.trim() ? Number(roomForm.lat) : null,
              lng: roomForm.lng.trim() ? Number(roomForm.lng) : null,
            }
            : room
        )
      );
      closeEditModal();
      showToast("Room updated successfully", "success");
    } catch (err) {
      console.error("Failed to update room", err);
      showToast("An error occurred while updating the room.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;

    try {
      setDeletingRoomId(id);
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setRooms((prevRooms) => prevRooms.filter((room) => room.id !== id));
        showToast("Room deleted successfully", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete room", "error");
      }
    } catch (err) {
      console.error("Failed to delete room", err);
      showToast("An error occurred while deleting the room.", "error");
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleLuxuryToggle = async (room: Room) => {
    const newValue = !room.isLuxury;
    setTogglingLuxuryId(room.id);
    try {
      const res = await fetch(`/api/admin/rooms/${room.id}/luxury`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isLuxury: newValue }),
      });
      if (res.ok) {
        setRooms((prev) =>
          prev.map((r) => r.id === room.id ? { ...r, isLuxury: newValue ? 1 : 0 } : r)
        );
        showToast(newValue ? "Room marked as Luxurious Stay ✨" : "Luxury status removed", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update luxury status", "error");
      }
    } catch (err) {
      showToast("An error occurred.", "error");
    } finally {
      setTogglingLuxuryId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading listings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
        >
          {toast.message}
        </div>
      )}

      <AdminPageHero
        eyebrow="Listing Control"
        title="Room Management"
        description="Monitor listings, refine sourcing mix, and edit property details from one elevated workspace."
        badge={`${filteredRooms.length} live listings`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/65" />
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-12 pr-6 text-white placeholder:text-white/60 outline-none backdrop-blur-md transition focus:border-white/30 md:w-80"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`rounded-2xl border p-3 transition-colors ${showFilters
              ? "border-white/25 bg-white/20 text-white"
              : "border-white/15 bg-white/10 text-white/90 hover:bg-white/15"
              }`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </AdminPageHero>

      {showFilters && (
        <AdminSurface className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">City</label>
            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Listing Type</label>
            <select
              value={listingFilter}
              onChange={(event) => setListingFilter(event.target.value as "all" | "internal" | "sourced")}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Listings</option>
              <option value="internal">Internal Listings</option>
              <option value="sourced">Sourced Listings</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setCityFilter("all");
                setListingFilter("all");
              }}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </AdminSurface>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredRooms.map((room) => {
            const images = parseStringArray(room.images);

            return (
              <motion.div
                key={room.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group flex flex-col gap-6 rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 sm:flex-row"
              >
                <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-[1.5rem] shadow-inner sm:w-48">
                  <img
                    src={images[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.title)}&background=f0f9ff&color=2563eb&size=400`}
                    alt={room.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(room.title)}&background=f0f9ff&color=2563eb&size=400`;
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                  <div className="absolute left-3 top-3 rounded-xl border border-white/50 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 shadow-sm backdrop-blur-md">
                    Active
                  </div>
                </div>

                <div className="flex-grow flex flex-col justify-between py-2">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-black text-gray-900 line-clamp-1">{room.title}</h3>
                      <Link to={`/rooms/${room.id}`} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <ExternalLink className="h-5 w-5" />
                      </Link>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        {room.location}, {room.city}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <IndianRupee className="h-4 w-4 text-emerald-500" />
                        {room.price.toLocaleString()} / month
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-xs font-black text-blue-600 border border-gray-100">
                        {room.ownerName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{room.ownerName}</p>
                        <p className="text-[10px] font-medium text-gray-400">{room.ownerEmail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleLuxuryToggle(room)}
                      disabled={togglingLuxuryId === room.id}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 disabled:opacity-60 ${room.isLuxury
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                        }`}
                    >
                      <Crown className="h-4 w-4" />
                      {togglingLuxuryId === room.id
                        ? "Saving..."
                        : room.isLuxury
                          ? "Remove Luxury"
                          : "Mark Luxury"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(room)}
                      className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(room.id)}
                      disabled={deletingRoomId === room.id}
                      className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingRoomId === room.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredRooms.length === 0 && (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold">No property listings found.</p>
        </div>
      )}

      <AnimatePresence>
        {editingRoom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Edit Room</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update the listing details and save the changes directly from the dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSave} className="max-h-[80vh] overflow-y-auto px-6 py-5">
                {editingRoom.sourceUrl && (
                  <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    This is a sourced listing from {editingRoom.sourceLabel || "a public portal"}.
                    {editingRoom.sourceUrl && (
                      <a
                        href={editingRoom.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 font-semibold underline underline-offset-4"
                      >
                        Open original listing
                      </a>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
                    <input
                      type="text"
                      required
                      value={roomForm.title}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={roomForm.description}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, description: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Price</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={roomForm.price}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, price: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Deposit</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={roomForm.deposit}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, deposit: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Type</label>
                    <select
                      value={roomForm.type}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, type: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Single Room">Single Room</option>
                      <option value="Shared Room">Shared Room</option>
                      <option value="PG Accommodation">PG Accommodation</option>
                      <option value="Hostel">Hostel</option>
                      <option value="Apartment">Apartment</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">City</label>
                    <input
                      type="text"
                      required
                      value={roomForm.city}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, city: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Location / Area</label>
                    <input
                      type="text"
                      required
                      value={roomForm.location}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, location: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Amenities</label>
                    <input
                      type="text"
                      value={roomForm.amenities}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, amenities: event.target.value }))}
                      placeholder="WiFi, AC, Kitchen, Parking"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Image URLs</label>
                    <textarea
                      rows={3}
                      value={roomForm.images}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, images: event.target.value }))}
                      placeholder="https://image-1.jpg, https://image-2.jpg"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={roomForm.lat}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, lat: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={roomForm.lng}
                      onChange={(event) => setRoomForm((prev) => ({ ...prev, lng: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
