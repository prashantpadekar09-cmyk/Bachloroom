import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";

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
    ...(user ? [{ name: "Dashboard", path: dashboardPath, icon: LayoutDashboard }] : []),
  ];

  const mobileBottomLinks = [
    { name: "Home", path: "/", icon: Home },
    { name: "Explore", path: "/explore", icon: Compass },
    { name: "Rooms", path: "/rooms", icon: BedDouble },
    { name: "Services", path: "/services", icon: Sparkles },
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
      <div className="h-[76px] sm:h-[84px]" />
      <nav className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-2xl transition-all duration-200 ${
        isScrolled
          ? "border-white/80 bg-white/92 shadow-[0_22px_60px_-32px_rgba(59,130,246,0.18)]"
          : "border-white/70 bg-white/82 shadow-[0_20px_50px_-36px_rgba(59,130,246,0.16)]"
      }`}>
        <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:min-h-[84px] sm:gap-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 rounded-2xl px-1 py-2 transition-transform hover:-translate-y-0.5"
          >
            <BrandLogo
              subtitle="Search, book, and manage rooms faster"
              subtitleClassName="hidden sm:block"
              showBackdrop
            />
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive(link.path)
                      ? "bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-lg shadow-sky-200"
                      : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-full border border-sky-100 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:text-sky-700"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center rounded-full bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-lg shadow-sky-200 transition-transform hover:-translate-y-0.5 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="border-t border-sky-100 bg-white/92 px-4 pb-4 pt-3 shadow-[0_24px_50px_-40px_rgba(59,130,246,0.2)] lg:hidden">
            {user && (
              <div className="mb-3 rounded-[1.5rem] bg-sky-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                    <p className="text-xs capitalize text-slate-500">{user.role}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {menuLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      isActive(link.path)
                        ? "bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white"
                        : "bg-sky-50/70 text-slate-700 hover:bg-sky-100 hover:text-sky-700"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.name}
                  </Link>
                );
              })}

              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              ) : (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="rounded-2xl border border-sky-100 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-100 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 shadow-[0_-20px_50px_-34px_rgba(59,130,246,0.2)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
          {mobileBottomLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);

            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-lg shadow-sky-200"
                    : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
