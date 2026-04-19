import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, MapPin, MessageSquare, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  DashboardHero,
  DashboardLoading,
  DashboardShell,
  DashboardStatCard,
  DashboardSurface,
  DashboardToast,
} from "../components/dashboard/DashboardTheme";
import ReferralCard from "../components/referrals/ReferralCard";

export default function OwnerDashboard() {
  const { user, token, updateUser } = useAuth();
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumStatus, setPremiumStatus] = useState<{ isPremium: boolean; payment: any | null } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportQueryText, setSupportQueryText] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const addRoomFormRef = useRef<HTMLDivElement | null>(null);

  const [newRoom, setNewRoom] = useState({
    title: "",
    description: "",
    price: "",
    deposit: "",
    location: "",
    city: "",
    type: "Single Room",
    amenities: "",
    uploadedImages: [] as string[],
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const canPromoteRooms = user?.role === "admin" || Boolean(premiumStatus?.isPremium);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsRes, premiumStatusRes] = await Promise.all([
          fetch("/api/rooms"),
          fetch("/api/payments/premium/status", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (roomsRes.ok) {
          const data = await roomsRes.json();
          const rooms = data.rooms || [];
          setMyRooms(user?.role === "admin" ? rooms : rooms.filter((room: any) => room.ownerId === user?.id));
        }

        if (premiumStatusRes.ok) {
          const data = await premiumStatusRes.json();
          setPremiumStatus({ isPremium: Boolean(data.isPremium), payment: data.payment || null });
          updateUser({
            isPremium: Boolean(data.isPremium),
            subscriptionPlan: data.isPremium ? "premium" : user?.subscriptionPlan,
          });
        }
      } catch (err) {
        console.error("Failed to fetch owner dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (token && user) {
      fetchData();
    }
  }, [token, user, updateUser]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/chat/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (showAddRoom) {
      addRoomFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAddRoom]);

  const handlePromote = async (roomId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomId}/promote`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to promote room.", "error");
        return;
      }

      setMyRooms((current) => current.map((room) => (room.id === roomId ? { ...room, isFeatured: 1 } : room)));
      showToast("Room promoted successfully.", "success");
    } catch (err) {
      console.error("Failed to promote room", err);
      showToast("An error occurred while promoting the room.", "error");
    }
  };

  const handleAddRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const amenitiesArray = newRoom.amenities.split(",").map((item) => item.trim()).filter(Boolean);
      const imagesArray = [...newRoom.uploadedImages].filter(Boolean);

      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newRoom,
          price: Number(newRoom.price),
          deposit: Number(newRoom.deposit),
          amenities: amenitiesArray,
          images: imagesArray,
          lat: null,
          lng: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to add room.", "error");
        return;
      }

      const data = await res.json();
      const addedRoom = {
        ...newRoom,
        id: data.id,
        price: Number(newRoom.price),
        deposit: Number(newRoom.deposit),
        amenities: amenitiesArray,
        images: imagesArray,
        lat: null,
        lng: null,
        ownerId: user?.id,
        isFeatured: 0,
        createdAt: new Date().toISOString(),
      };

      setMyRooms((current) => [addedRoom, ...current]);
      setShowAddRoom(false);
      setNewRoom({
        title: "",
        description: "",
        price: "",
        deposit: "",
        location: "",
        city: "",
        type: "Single Room",
        amenities: "",
        uploadedImages: [],
      });
      showToast("Room added successfully!", "success");
    } catch (err) {
      console.error("Failed to add room", err);
      showToast("An error occurred while adding the room.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSupportQuery = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supportQueryText.trim()) {
      return;
    }

    try {
      setSupportSubmitting(true);
      setSupportMessage("");
      const res = await fetch("/api/support/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: supportQueryText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit query");
      }
      setSupportQueryText("");
      setSupportMessage("Query submitted. You can track replies in Support.");
    } catch (err: any) {
      setSupportMessage(err?.message || "Failed to submit query.");
    } finally {
      setSupportSubmitting(false);
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading your owner dashboard..." />;
  }

  const featuredRooms = myRooms.filter((room) => room.isFeatured).length;

  return (
    <DashboardShell>
      <div className="space-y-8 pb-10">
        {toast ? <DashboardToast message={toast.message} type={toast.type} /> : null}

        <DashboardHero
          eyebrow="Owner Dashboard"
          title="Manage listings and owner premium from one cleaner workspace."
          description="Booking approvals and payout tools are gone. This owner dashboard now focuses on room inventory, premium promotion access, and support."
          badge={premiumStatus?.isPremium ? "Premium owner" : "Free owner plan"}
          actions={
            <>
              <Link
                to="/support"
                className="inline-flex items-center justify-center rounded-2xl border border-white/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
              >
                Open Support
              </Link>
              <button
                onClick={() => setShowAddRoom((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Plus className="h-5 w-5" />
                {showAddRoom ? "Hide Form" : "Add New Room"}
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            icon={MapPin}
            label="My Rooms"
            value={myRooms.length}
            accent="blue"
            hint="All rooms currently listed under your account."
          />
          <DashboardStatCard
            icon={Sparkles}
            label="Featured"
            value={featuredRooms}
            accent="amber"
            hint="Rooms currently promoted in the marketplace."
          />
          <DashboardStatCard
            icon={Crown}
            label="Premium"
            value={premiumStatus?.isPremium ? "Active" : "Free"}
            accent="emerald"
            hint={premiumStatus?.isPremium ? "You can promote rooms directly." : "Upgrade to unlock room promotion."}
          />
          <DashboardStatCard
            icon={MessageSquare}
            label="Support"
            value={unreadCount}
            accent="rose"
            hint={unreadCount ? "Unread support replies are waiting." : "No unread support replies right now."}
          />
        </div>

        <DashboardSurface>
          <ReferralCard />
        </DashboardSurface>

        <DashboardSurface className="border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-50">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white">
                <Crown className="mr-2 h-4 w-4 text-amber-300" />
                Owner premium
              </div>
              <h2 className="mt-4 text-2xl font-black text-gray-900">Use the same manual payment flow to unlock owner premium.</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Pay Rs. 99, submit the UTR, and once admin approves it your owner account gets premium access. Premium owners can promote rooms from this dashboard.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm lg:min-w-[300px]">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Current Status</p>
              <p className="mt-2 text-2xl font-black text-gray-900">
                {premiumStatus?.isPremium ? "Premium Active" : premiumStatus?.payment?.status === "pending" ? "Pending Approval" : "Free Plan"}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {premiumStatus?.isPremium
                  ? "Your owner account can promote rooms."
                  : premiumStatus?.payment?.status === "pending"
                    ? `Last submitted UTR: ${premiumStatus.payment.utrNumber}`
                    : "Upgrade to premium to unlock room promotion."}
              </p>
              <Link
                to="/premium-payment?redirect=/owner-dashboard"
                className="mt-5 inline-flex rounded-xl bg-amber-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-amber-700"
              >
                {premiumStatus?.isPremium ? "Open Premium Page" : "Upgrade Owner Account"}
              </Link>
            </div>
          </div>
        </DashboardSurface>

        {showAddRoom ? (
          <DashboardSurface>
            <div ref={addRoomFormRef}>
              <h2 className="text-2xl font-bold text-gray-900">Add a New Room</h2>
              <p className="mt-2 text-sm text-gray-500">Create a listing with clean details, images, and amenities.</p>
              <form onSubmit={handleAddRoom} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Room Title</label>
                    <input
                      type="text"
                      required
                      value={newRoom.title}
                      onChange={(event) => setNewRoom({ ...newRoom, title: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Room Type</label>
                    <select
                      value={newRoom.type}
                      onChange={(event) => setNewRoom({ ...newRoom, type: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Single Room</option>
                      <option>Shared Room</option>
                      <option>Studio</option>
                      <option>PG</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Price</label>
                    <input
                      type="number"
                      required
                      value={newRoom.price}
                      onChange={(event) => setNewRoom({ ...newRoom, price: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Deposit</label>
                    <input
                      type="number"
                      required
                      value={newRoom.deposit}
                      onChange={(event) => setNewRoom({ ...newRoom, deposit: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      required
                      value={newRoom.location}
                      onChange={(event) => setNewRoom({ ...newRoom, location: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      required
                      value={newRoom.city}
                      onChange={(event) => setNewRoom({ ...newRoom, city: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={newRoom.description}
                      onChange={(event) => setNewRoom({ ...newRoom, description: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Amenities</label>
                    <input
                      type="text"
                      placeholder="Wi-Fi, Balcony, AC"
                      value={newRoom.amenities}
                      onChange={(event) => setNewRoom({ ...newRoom, amenities: event.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Room Photos <span className="text-xs text-gray-400">(PNG / JPG, high resolution)</span>
                    </label>
                    <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <div>
                        <span className="font-semibold text-blue-700">Click to upload photos</span>
                        <p className="mt-0.5 text-xs text-gray-500">PNG, JPG up to 10MB each — up to 5 images</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={(event) => {
                          const files = Array.from(event.target.files || []).slice(0, 5);
                          if (!files.length) return;
                          const readers = files.map((file) => new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(file as File);
                          }));
                          Promise.all(readers).then((results) => {
                            setNewRoom((current) => ({
                              ...current,
                              uploadedImages: [...current.uploadedImages, ...results].slice(0, 5),
                            }));
                            showToast(`${results.length} photo${results.length > 1 ? "s" : ""} added`, "success");
                          });
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {newRoom.uploadedImages.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {newRoom.uploadedImages.map((src, index) => (
                          <div key={index} className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200">
                            <img src={src} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" loading="lazy" />
                            <button
                              type="button"
                              onClick={() => setNewRoom((current) => ({ ...current, uploadedImages: current.uploadedImages.filter((_, i) => i !== index) }))}
                              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 ${isSubmitting ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    {isSubmitting ? "Saving..." : "Save Room"}
                  </button>
                </div>
              </form>
            </div>
          </DashboardSurface>
        ) : null}

        <div className="mb-6 mt-12 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-600">Portfolio</p>
            <h2 className="text-3xl font-black text-gray-900">My Rooms</h2>
          </div>
          <p className="text-sm font-medium text-gray-500">Your active room inventory, ready to manage and promote.</p>
        </div>

        {myRooms.length === 0 ? (
          <DashboardSurface className="text-center">
            <p className="text-gray-500">You haven't added any rooms yet.</p>
          </DashboardSurface>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myRooms.map((room) => (
              <div key={room.id} className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="relative h-48">
                  <img
                    src={room.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(room.title)}&background=dbeafe&color=1d4ed8&size=400`}
                    alt={room.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  {room.isFeatured ? (
                    <div className="absolute left-4 top-4 rounded-md bg-yellow-400 px-2 py-1 text-xs font-bold uppercase tracking-wider text-yellow-900 shadow">
                      Featured
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900 line-clamp-1">{room.title}</h3>
                  <p className="mb-4 text-sm text-gray-500">{room.location}, {room.city}</p>
                  <div className="mt-auto flex space-x-2">
                    <Link
                      to={`/rooms/${room.id}`}
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 text-center font-medium text-gray-900 transition-colors hover:bg-gray-100"
                    >
                      View
                    </Link>
                    {!room.isFeatured ? (
                      <button
                        onClick={() => handlePromote(room.id)}
                        disabled={!canPromoteRooms}
                        title={canPromoteRooms ? "Promote this room to featured" : "Owner premium is required to promote rooms"}
                        className={`flex-1 rounded-lg border py-2 text-center font-medium transition-colors ${
                          canPromoteRooms
                            ? "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                            : "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                        }`}
                      >
                        {canPromoteRooms ? "Promote" : "Premium Required"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DashboardSurface>
          <h3 className="text-lg font-bold text-gray-900">Submit a Query</h3>
          <p className="mt-1 text-sm text-gray-500">Send a message to admin. Track replies in Support.</p>
          <form onSubmit={handleSubmitSupportQuery} className="mt-4 space-y-3">
            <textarea
              value={supportQueryText}
              onChange={(event) => setSupportQueryText(event.target.value)}
              placeholder="Write your query..."
              rows={4}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={supportSubmitting || !supportQueryText.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {supportSubmitting ? "Submitting..." : "Send Query"}
              </button>
              <Link to="/support" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                Open Support Inbox
              </Link>
            </div>
            {supportMessage ? <p className="text-sm text-gray-500">{supportMessage}</p> : null}
          </form>
        </DashboardSurface>
      </div>
    </DashboardShell>
  );
}
