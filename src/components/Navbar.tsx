import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BedDouble,
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

const navLinks = [
  { name: "Home", path: "/", icon: Home },
  { name: "Explore", path: "/explore", icon: Compass },
  { name: "Rooms", path: "/rooms", icon: BedDouble },
  { name: "Services", path: "/services", icon: Sparkles },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const dashboardPath =
    user?.role === "admin"
      ? "/admin/dashboard"
      : user?.role === "owner"
        ? "/owner-dashboard"
        : user?.role === "service_provider"
          ? "/service-provider-dashboard"
        : "/dashboard";

  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const menuLinks = [
    ...navLinks,
    ...(user ? [{ name: "Dashboard", path: dashboardPath, icon: LayoutDashboard }] : []),
  ];

  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMenu();
    navigate("/");
  };

  useEffect(() => {
    closeMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <div className="h-16 sm:h-[72px]" />
      <nav className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-2xl transition-all duration-200 ${
        isScrolled
          ? "border-white/70 bg-white/94 shadow-[0_20px_60px_-32px_rgba(15,23,42,0.35)]"
          : "border-white/60 bg-white/88 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.45)]"
      }`}>
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-18 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-2 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 sm:h-11 sm:w-11">
              <span className="text-lg font-black">BR</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-gray-900 sm:text-sm sm:tracking-[0.28em]">
                Bachelor Rooms
              </p>
              <p className="hidden truncate text-xs font-medium text-gray-500 sm:block">
                Find stays, services, and trusted owners
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200 transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
            aria-label="Open navigation menu"
            aria-expanded={isMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-transparent"
                onClick={closeMenu}
                aria-label="Close navigation overlay"
              />

              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="absolute right-4 top-[calc(100%+0.75rem)] z-[60] w-[calc(100%-2rem)] max-w-sm rounded-[1.75rem] border border-white/70 bg-white p-4 shadow-2xl sm:right-6 sm:w-full lg:right-8"
              >
                <div className="flex items-start justify-between gap-4 rounded-[1.5rem] bg-gray-50 p-4 ring-1 ring-gray-200">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Navigation</p>
                    <h2 className="mt-1 text-2xl font-bold text-gray-900">Menu</h2>
                    <p className="mt-1 text-sm text-gray-500">Home, Explore, Rooms, Services, Dashboard</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeMenu}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-blue-700"
                    aria-label="Close navigation menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {user && (
                  <div className="mt-4 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs capitalize text-gray-500">{user.role}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {menuLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
                          isActive(link.path)
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                            : "text-gray-700 hover:bg-gray-50 hover:text-blue-700"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {link.name}
                      </Link>
                    );
                  })}

                  <div className="my-2 border-t border-gray-100" />

                  {user ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-base font-semibold text-white shadow-lg shadow-blue-100 transition-colors hover:bg-blue-700"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
}
