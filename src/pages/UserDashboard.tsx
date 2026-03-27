import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Heart, 
  Settings as SettingsIcon, 
  LogOut, 
  Trash2, 
  Eye, 
  XCircle,
  Phone,
  Mail,
  Lock,
  Edit2,
  ShieldCheck,
  ChevronRight,
  Crown,
  IndianRupee,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DashboardHero,
  DashboardLoading,
  DashboardShell,
  DashboardStatCard,
  DashboardSurface,
} from "../components/dashboard/DashboardTheme";

type Tab = "profile" | "premium" | "bookings" | "saved" | "messages" | "settings";

export default function UserDashboard() {
  const { user, token, logout, updateUser } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = (queryParams.get("tab") as Tab) || "profile";
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [bookings, setBookings] = useState<any[]>([]);
  const [savedRooms, setSavedRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);
  const [isPremium, setIsPremium] = useState(Boolean(user?.isPremium));
  const [premiumPayment, setPremiumPayment] = useState<any>(null);
  const [adminContact, setAdminContact] = useState<{ id: string; name: string; role: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [supportQueryText, setSupportQueryText] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [rentPaymentMap, setRentPaymentMap] = useState<Record<string, any>>({});
  const [rentUtrInputs, setRentUtrInputs] = useState<Record<string, string>>({});
  const [rentMessage, setRentMessage] = useState<Record<string, string>>({});

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || ""
  });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || ""
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookingsRes, savedRes, profileRes, premiumStatusRes, rentPaymentsRes, adminContactRes] = await Promise.all([
          fetch("/api/bookings/my-bookings", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/saved-rooms", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/payments/premium/status", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/payments/rent/mine", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/chat/admin-contact", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings || []);
        }
        if (savedRes.ok) {
          const data = await savedRes.json();
          setSavedRooms(data.rooms || []);
        }
        if (profileRes.ok) {
          const data = await profileRes.json();
          setIsVerified(data.user.isVerified === 1);
          setHasDocument(!!data.user.idDocument);
        }
        if (premiumStatusRes.ok) {
          const data = await premiumStatusRes.json();
          setIsPremium(Boolean(data.isPremium));
          setPremiumPayment(data.payment || null);
          updateUser({
            isPremium: Boolean(data.isPremium),
            subscriptionPlan: data.isPremium ? "premium" : user?.subscriptionPlan,
          });
        }
        if (rentPaymentsRes.ok) {
          const data = await rentPaymentsRes.json();
          const paymentMap = (data.payments || []).reduce((acc: Record<string, any>, payment: any) => {
            acc[payment.bookingId] = payment;
            return acc;
          }, {});
          setRentPaymentMap(paymentMap);
        }
        if (adminContactRes.ok) {
          const data = await adminContactRes.json();
          setAdminContact(data.user || null);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        setIsEditingProfile(false);
        // In a real app, we'd update the auth context user too
        alert("Profile updated successfully! Please refresh to see changes.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ type: "success", text: "Password updated successfully" });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Failed to update password" });
      }
    } catch (err) {
      setPasswordMessage({ type: "error", text: "An error occurred" });
    }
  };

  const handleSubmitSupportQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportQueryText.trim()) return;

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

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBookings(bookings.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveSaved = async (savedId: string) => {
    try {
      const res = await fetch(`/api/saved-rooms/${savedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSavedRooms(savedRooms.filter(r => r.savedId !== savedId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const res = await fetch("/api/auth/upload-document", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ idDocument: base64String }),
        });

        if (res.ok) {
          setUploadMessage("Document uploaded successfully. Pending verification.");
          setHasDocument(true);
        } else {
          setUploadMessage("Failed to upload document.");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadMessage("An error occurred during upload.");
      setUploading(false);
    }
  };

  const handleSubmitRentUtr = async (bookingId: string) => {
    const utrNumber = rentUtrInputs[bookingId]?.trim().toUpperCase();
    if (!utrNumber) {
      setRentMessage((current) => ({ ...current, [bookingId]: "Enter a UTR number first." }));
      return;
    }

    try {
      const res = await fetch("/api/payments/rent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId, utrNumber }),
      });
      const data = await res.json();

      if (res.ok) {
        setRentPaymentMap((current) => ({
          ...current,
          [bookingId]: { utrNumber, status: "pending" },
        }));
      }

      setRentMessage((current) => ({
        ...current,
        [bookingId]: data.message || data.error || "Unable to submit rent UTR.",
      }));
    } catch (err) {
      setRentMessage((current) => ({ ...current, [bookingId]: "Unable to submit rent UTR." }));
    }
  };

  if (loading) {
    return <DashboardLoading label="Loading your renter dashboard..." />;
  }

  const tabs = [
    { id: "profile", label: "Profile Info", icon: User },
    { id: "premium", label: "Premium", icon: Crown },
    { id: "bookings", label: "My Bookings", icon: Calendar },
    { id: "saved", label: "Saved Rooms", icon: Heart },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];

  const dashboardStats = [
    {
      icon: Calendar,
      label: "Bookings",
      value: bookings.length,
      accent: "blue" as const,
      hint: bookings.length ? "Track active stays and payment progress." : "Your first booking will appear here.",
    },
    {
      icon: Heart,
      label: "Saved Rooms",
      value: savedRooms.length,
      accent: "rose" as const,
      hint: savedRooms.length ? "Wishlist rooms stay ready for quick access." : "Save rooms to compare later.",
    },
    {
      icon: ShieldCheck,
      label: "Verification",
      value: isVerified ? "Verified" : hasDocument ? "Pending" : "Needed",
      accent: "emerald" as const,
      hint: isVerified ? "Identity checks are complete." : "Verification unlocks stronger trust signals.",
    },
    {
      icon: Crown,
      label: "Premium",
      value: isPremium ? "Active" : "Free",
      accent: "amber" as const,
      hint: isPremium ? "Owner contact access is unlocked." : "Upgrade for direct owner details.",
    },
  ];

  return (
    <DashboardShell>
      <div className="space-y-8 pb-10">
        <DashboardHero
          eyebrow="Renter Dashboard"
          title={user?.name ? `${user.name}, your room journey is organized.` : "Your renter workspace is ready."}
          description="Manage bookings, premium access, saved rooms, and support requests from one clean, mobile-friendly dashboard."
          badge={user?.email || "Tenant account"}
          actions={
            <>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center rounded-2xl border border-white/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition hover:bg-white"
              >
                Explore Rooms
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
            <div key={stat.label}>
              <DashboardStatCard
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                accent={stat.accent}
                hint={stat.hint}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="flex-shrink-0 lg:w-64">
            <DashboardSurface className="p-2 lg:p-3">
              <nav className="hide-scrollbar flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all lg:w-full ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "text-gray-600 hover:bg-white hover:text-blue-600"
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                  {tab.id === "messages" && unreadCount > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      activeTab === tab.id ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
              </nav>
            </DashboardSurface>
          </div>

          <div className="flex-grow">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <DashboardSurface className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                      <button 
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <Edit2 className="h-4 w-4" /> {isEditingProfile ? "Cancel" : "Edit Profile"}
                      </button>
                    </div>

                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                              type="text"
                              value={profileForm.name}
                              onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                              type="tel"
                              value={profileForm.phone}
                              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>
                        <button 
                          type="submit"
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Save Changes
                        </button>
                      </form>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 text-gray-600">
                            <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Full Name</p>
                              <p className="font-medium text-gray-900">{user?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-gray-600">
                            <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center">
                              <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Email Address</p>
                              <p className="font-medium text-gray-900">{user?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-gray-600">
                            <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center">
                              <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Phone Number</p>
                              <p className="font-medium text-gray-900">{user?.phone || "Not provided"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                          <h3 className="text-blue-900 font-bold mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5" /> Verification Status
                          </h3>
                          {isVerified ? (
                            <div className="flex items-center text-green-600 font-medium gap-2">
                              <CheckCircle className="h-5 w-5" /> Identity Verified
                            </div>
                          ) : hasDocument ? (
                            <div className="flex items-center text-yellow-600 font-medium gap-2">
                              <Clock className="h-5 w-5" /> Pending Verification
                            </div>
                          ) : (
                            <div>
                              <p className="text-blue-700 text-sm mb-4">Verify your identity to unlock all features and build trust with owners.</p>
                              <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-block">
                                Upload ID Document
                                <input type="file" className="hidden" onChange={handleFileUpload} />
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-6">
                          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                            <Crown className="h-5 w-5" /> Premium Status
                          </h3>
                          <p className="text-sm text-amber-800">
                            {isPremium
                              ? "Premium is active. Owner phone numbers and direct contact are unlocked."
                              : premiumPayment?.status === "pending"
                                ? "Your payment proof is waiting for admin approval."
                                : "Upgrade to premium with a manual Rs. 99 payment to unlock owner details."}
                          </p>
                          <Link
                            to="/premium-payment"
                            className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                          >
                            {isPremium ? "Open Premium Page" : "Upgrade to Premium"}
                          </Link>
                        </div>
                      </div>
                    )}
                  </DashboardSurface>
                </motion.div>
              )}

              {activeTab === "premium" && (
                <motion.div
                  key="premium"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <DashboardSurface className="border-amber-100 bg-gradient-to-br from-white via-amber-50 to-orange-50 p-8">
                    <div className="inline-flex items-center rounded-full bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white">
                      <Crown className="mr-2 h-4 w-4 text-amber-300" />
                      Premium access
                    </div>
                    <h2 className="mt-5 text-3xl font-black text-gray-900">Unlock owner details for Rs. 99</h2>
                    <p className="mt-3 max-w-2xl text-gray-600">
                      Submit a manual UPI payment, share the UTR number, and admin approval will activate premium access.
                    </p>
                    <div className="mt-8 grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Status</p>
                        <p className="mt-2 text-xl font-black text-gray-900">
                          {isPremium ? "Active" : premiumPayment?.status || "Not started"}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Amount</p>
                        <p className="mt-2 flex items-center text-xl font-black text-gray-900">
                          <IndianRupee className="mr-1 h-5 w-5" />
                          99
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white/90 p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Last UTR</p>
                        <p className="mt-2 truncate text-lg font-bold text-gray-900">{premiumPayment?.utrNumber || "---"}</p>
                      </div>
                    </div>
                    <Link
                      to="/premium-payment"
                      className="mt-8 inline-flex rounded-xl bg-amber-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-700"
                    >
                      {isPremium ? "View Premium Access" : "Upgrade to Premium"}
                    </Link>
                  </DashboardSurface>
                </motion.div>
              )}

              {activeTab === "bookings" && (
                <motion.div
                  key="bookings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <DashboardSurface className="overflow-hidden p-0">
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-gray-900">My Bookings</h2>
                    </div>
                    {bookings.length === 0 ? (
                      <div className="p-12 text-center">
                        <Calendar className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">You haven't made any bookings yet.</p>
                        <Link to="/explore" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                          Explore Rooms
                        </Link>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                              <th className="px-6 py-4">Room</th>
                              <th className="px-6 py-4">Location</th>
                              <th className="px-6 py-4">Booking Date</th>
                              <th className="px-6 py-4">Move-in</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Rent Payment</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {bookings.map((booking) => (
                              <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <img 
                                      src={booking.roomImages?.[0] || "https://picsum.photos/seed/room/100/100"} 
                                      className="h-12 w-12 rounded-lg object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="font-semibold text-gray-900 line-clamp-1">{booking.roomTitle}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-gray-400" /> {booking.roomCity}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {new Date(booking.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {booking.moveInDate}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    booking.status === 'pending' || booking.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                                    booking.status === 'under_review' ? 'bg-blue-100 text-blue-700' :
                                    booking.status === 'approved' || booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    booking.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                    booking.status === 'cancelled' || booking.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {booking.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {booking.premiumIncluded ? (
                                    <div className="mb-2 rounded-xl bg-indigo-50 px-3 py-2 text-indigo-700">
                                      Premium included
                                    </div>
                                  ) : null}
                                  {booking.status === "paid" ? (
                                    <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
                                      Owner verified
                                    </div>
                                  ) : rentPaymentMap[booking.id]?.status === "pending" ? (
                                    <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                                      Waiting with UTR {rentPaymentMap[booking.id].utrNumber}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        placeholder="Submit rent UTR"
                                        value={rentUtrInputs[booking.id] || ""}
                                        onChange={(e) =>
                                          setRentUtrInputs((current) => ({
                                            ...current,
                                            [booking.id]: e.target.value.toUpperCase(),
                                          }))
                                        }
                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSubmitRentUtr(booking.id)}
                                        className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-black"
                                      >
                                        Submit UTR
                                      </button>
                                      {rentMessage[booking.id] && (
                                        <p className="text-xs text-gray-500">{rentMessage[booking.id]}</p>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Link 
                                      to={`/rooms/${booking.roomId}`}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                      title="View Room"
                                    >
                                      <Eye className="h-5 w-5" />
                                    </Link>
                                    {booking.status !== 'cancelled' && (
                                      <button 
                                        onClick={() => handleCancelBooking(booking.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Cancel Booking"
                                      >
                                        <XCircle className="h-5 w-5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </DashboardSurface>
                </motion.div>
              )}

              {activeTab === "saved" && (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedRooms.length === 0 ? (
                      <DashboardSurface className="col-span-full p-12 text-center">
                        <Heart className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Your wishlist is empty.</p>
                        <Link to="/explore" className="text-blue-600 font-medium hover:underline">
                          Browse Rooms
                        </Link>
                      </DashboardSurface>
                    ) : (
                      savedRooms.map((room) => (
                        <div key={room.savedId}>
                          <DashboardSurface className="overflow-hidden p-0 group">
                          <div className="h-48 relative overflow-hidden">
                            <img 
                              src={room.images?.[0] || "https://picsum.photos/seed/room/400/300"} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-blue-600 font-bold text-sm">
                              ₹{room.price}/mo
                            </div>
                          </div>
                          <div className="p-5">
                            <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{room.title}</h3>
                            <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                              <MapPin className="h-3 w-3" /> {room.city}
                            </p>
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/rooms/${room.id}`}
                                className="flex-grow bg-gray-50 hover:bg-gray-100 text-gray-900 font-medium py-2 rounded-xl text-center transition-colors border border-gray-100"
                              >
                                View Details
                              </Link>
                              <button 
                                onClick={() => handleRemoveSaved(room.savedId)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Remove from wishlist"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          </DashboardSurface>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <DashboardSurface className="p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Lock className="h-5 w-5 text-gray-400" /> Change Password
                    </h2>
                    <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                      {passwordMessage.text && (
                        <div className={`p-3 rounded-lg text-sm font-medium ${
                          passwordMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {passwordMessage.text}
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                        <input
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full bg-gray-900 text-white py-2 rounded-lg font-medium hover:bg-black transition-colors"
                      >
                        Update Password
                      </button>
                    </form>
                  </DashboardSurface>

                  <DashboardSurface className="p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Account Actions</h2>
                    <p className="text-gray-500 text-sm mb-6">Manage your account preferences and data.</p>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => setActiveTab("profile")}
                        className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Update Profile Details
                      </button>
                      <button 
                        className="px-6 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                        onClick={() => alert("Account deletion is not available in this demo.")}
                      >
                        Delete Account
                      </button>
                    </div>
                  </DashboardSurface>
                </motion.div>
              )}

              {activeTab === "messages" && (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <DashboardSurface>
                    <h2 className="text-xl font-bold text-gray-900">Submit a query</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Send your question to admin. You can track replies in the Support inbox.
                    </p>
                    <form onSubmit={handleSubmitSupportQuery} className="mt-4 space-y-3">
                      <textarea
                        value={supportQueryText}
                        onChange={(e) => setSupportQueryText(e.target.value)}
                        placeholder="Write your query..."
                        rows={4}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-blue-400"
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
                    {supportMessage && (
                      <p className="text-sm text-gray-500">{supportMessage}</p>
                    )}
                  </form>
                  </DashboardSurface>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
