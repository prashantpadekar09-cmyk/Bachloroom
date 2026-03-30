import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Search, Filter, Calendar, User, Home, IndianRupee, Loader2, Clock, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AdminPageHero, AdminSurface } from "../components/admin/AdminTheme";
import { useAuth } from "../context/AuthContext";

interface Booking {
  id: string;
  userName: string;
  userEmail: string;
  roomTitle: string;
  roomPrice: number;
  status: string;
  createdAt: string;
}

export default function AdminBookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/admin/bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      }
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
      }
    } catch (err) {
      console.error("Failed to update booking status", err);
    }
  };

  const filteredBookings = bookings.filter(booking => 
    booking.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.roomTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Reservations"
        title="Booking Management"
        description="Track reservation flow, monitor pending requests, and approve bookings faster."
        badge={`${filteredBookings.length} bookings`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/65" />
            <input 
              type="text"
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-12 pr-6 text-white placeholder:text-white/60 outline-none backdrop-blur-md transition focus:border-white/30 md:w-80"
            />
          </div>
          <button className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white/90 backdrop-blur-md transition hover:bg-white/15">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </AdminPageHero>

      <AdminSurface className="overflow-hidden">
        <div className="luxury-table-wrap">
          <table className="luxury-table">
            <thead>
              <tr>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Property</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredBookings.map((booking) => (
                  <motion.tr 
                    key={booking.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group luxury-table-row"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm border border-blue-100">
                          {booking.userName[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900">{booking.userName}</p>
                          <p className="text-xs font-medium text-gray-400">{booking.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <Home className="h-4 w-4 text-gray-400" />
                        <p className="text-sm font-bold text-gray-700 line-clamp-1">{booking.roomTitle}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-black text-emerald-600">
                        <IndianRupee className="h-3 w-3" />
                        {booking.roomPrice.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        booking.status === "confirmed" 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : booking.status === "cancelled"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {booking.status === "pending" && <Clock className="h-3 w-3" />}
                        {booking.status === "confirmed" && <Check className="h-3 w-3" />}
                        {booking.status === "cancelled" && <X className="h-3 w-3" />}
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {booking.status === "pending" && (
                          <>
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" 
                              title="Confirm"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" 
                              title="Cancel"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredBookings.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold">No bookings found.</p>
          </div>
        )}
      </AdminSurface>
    </div>
  );
}
