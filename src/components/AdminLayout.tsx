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
  LogOut,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-6 sm:p-8">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <span className="font-black text-xl tracking-tight text-gray-900">Admin<span className="text-blue-600">Hub</span></span>
      </div>

      <nav className="flex-grow space-y-1 overflow-y-auto px-4 pb-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between px-4 py-3.5 rounded-2xl font-semibold transition-all duration-200 group ${
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <div className="flex items-center">
                <Icon className={`h-5 w-5 mr-3 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-blue-600"}`} />
                {item.name}
              </div>
              <div className="flex items-center gap-2">
                {item.name === "Messages" && unreadCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-rose-500 text-white"
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

      <div className="p-4 mt-auto border-t border-gray-50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3.5 rounded-2xl font-semibold text-red-500 hover:bg-red-50 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Desktop Sidebar */}
      <aside className="ambient-surface-strong sticky top-0 hidden h-screen w-72 overflow-hidden lg:flex lg:flex-col">
        <SidebarContent />
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
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="ambient-surface-strong fixed inset-y-0 left-0 z-50 w-[85vw] max-w-72 overflow-hidden lg:hidden"
            >
              <SidebarContent />
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col min-w-0">
        {/* Top Header */}
        <header className="ambient-surface sticky top-0 z-30 flex min-h-18 items-center justify-between px-4 sm:h-20 sm:px-6">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-widest">Overview</h2>
              <p className="text-base font-bold text-gray-900 capitalize sm:text-xl">
                {location.pathname.split("/").pop()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-gray-900">{user?.name}</span>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Administrator</span>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-tr from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-100 sm:h-12 sm:w-12">
              {user?.name?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-10">
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
