import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BedDouble,
  Briefcase,
  Users,
  CalendarDays,
  Star,
  Wallet,
  MessageSquare,
  Settings,
  ShieldCheck,
  Home,
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

const menuItems = [
  { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Verifications", path: "/admin/verifications", icon: ShieldCheck },
  { name: "Rooms", path: "/admin/rooms", icon: BedDouble },
  { name: "Services", path: "/admin/services", icon: Briefcase },
  { name: "Users", path: "/admin/users", icon: Users },
  { name: "Bookings", path: "/admin/bookings", icon: CalendarDays },
  { name: "Reviews", path: "/admin/reviews", icon: Star },
  { name: "Payouts", path: "/admin/payouts", icon: Wallet },
  { name: "Messages", path: "/admin/messages", icon: MessageSquare },
  { name: "Settings", path: "/admin/settings", icon: Settings },
];

const SidebarContent = ({
  locationPath,
  unreadCount,
  onNavigate,
  onLogout
}: {
  locationPath: string;
  unreadCount: number;
  onNavigate: () => void;
  onLogout: () => void;
}) => (
  <div className="flex h-full w-full flex-col">
    <div className="relative shrink-0 overflow-hidden p-6 sm:p-8">
      <div className="absolute inset-x-4 top-4 h-24 rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(37,99,235,0.16)_0%,rgba(14,165,233,0.1)_100%)] blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-lg shadow-sky-200/80">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Control Panel</span>
          <span className="font-black text-xl tracking-tight text-slate-950">Admin<span className="text-blue-600">Hub</span></span>
        </div>
      </div>
    </div>

    <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = locationPath === item.path;
        return (
          <Link
            key={item.name}
            to={item.path}
            onClick={onNavigate}
            className={`group flex items-center justify-between rounded-2xl px-4 py-3.5 font-semibold transition-all duration-200 ${isActive
                ? "bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-[0_18px_45px_-24px_rgba(37,99,235,0.85)]"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
          >
            <div className="flex items-center">
              <Icon className={`mr-3 h-5 w-5 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-600"}`} />
              {item.name}
            </div>
            <div className="flex items-center gap-2">
              {item.name === "Messages" && unreadCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
                  }`}>
                  {unreadCount}
                </span>
              )}
              {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
            </div>
          </Link>
        );
      })}
    </nav>

    <div className="mt-auto shrink-0 border-t border-slate-200/80 p-4">
      <button
        onClick={onLogout}
        className="flex w-full items-center rounded-2xl px-4 py-3.5 font-semibold text-rose-500 transition-all duration-200 hover:bg-rose-50"
      >
        <LogOut className="mr-3 h-5 w-5" />
        Logout
      </button>
    </div>
  </div>
);

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/chat/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error("Failed to fetch unread count", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login");
  }, [logout, navigate]);

  const handleNavigate = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[0_25px_80px_-40px_rgba(15,23,42,0.1)] lg:flex">
        <SidebarContent
          locationPath={location.pathname}
          unreadCount={unreadCount}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-72 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[0_25px_80px_-40px_rgba(15,23,42,0.3)] lg:hidden"
            >
              <SidebarContent
                locationPath={location.pathname}
                unreadCount={unreadCount}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
              />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute right-4 top-5 rounded-xl bg-slate-100 p-2 text-slate-500 transition-colors hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex min-h-18 w-full items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-2xl sm:h-20 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-xl bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Overview</h2>
              <p className="text-base font-bold capitalize text-slate-950 sm:text-xl">
                {location.pathname.split("/").pop() || "dashboard"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Go Home</span>
            </Link>
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-bold text-slate-950">{user?.name}</span>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">Administrator</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-base font-bold text-white shadow-md sm:h-11 sm:w-11">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
