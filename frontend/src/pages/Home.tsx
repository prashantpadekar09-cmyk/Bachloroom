import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import BrandLogo from "../components/BrandLogo";

type RoomType = {
  id: string;
  title: string;
  location: string;
  city: string;
  rating: number;
  price: string;
  image: string;
  type: string;
  verified: boolean;
};

const heroSlides = [
  {
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80",
    eyebrow: "Premium rental discovery",
    title: "A cleaner way to find your next room.",
    subtitle: "Search verified stays without getting lost in too many filters.",
  },
  {
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80",
    eyebrow: "Curated for students and professionals",
    title: "Simple search. Better spaces. Faster decisions.",
    subtitle: "Start with city and budget, then move straight to high-quality listings.",
  },
  {
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80",
    eyebrow: "Trust-first experience",
    title: "Beautiful spaces with clearer details up front.",
    subtitle: "Verified owners, premium visuals, and a smoother path from search to shortlist.",
  },
];

const fallbackFeaturedRooms: RoomType[] = [
  { id: "fallback-1", title: "Skyline Studio Retreat", location: "Koregaon Park", city: "Pune", rating: 4.9, price: "Rs 18,500/mo", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80", type: "Studio Apartment", verified: true },
  { id: "fallback-2", title: "Urban Bachelor Suite", location: "Andheri West", city: "Mumbai", rating: 4.8, price: "Rs 16,000/mo", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", type: "Single Room", verified: true },
  { id: "fallback-3", title: "Co-Live Comfort Hub", location: "Baner", city: "Pune", rating: 4.7, price: "Rs 11,500/mo", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", type: "Shared Room", verified: true },
];

const quickCities = ["Pune", "Mumbai", "Nashik", "Goa"];

const trustPoints = [
  {
    title: "Less clutter, faster search",
    description: "Start with only what matters first: city, budget, and room type.",
    icon: Sparkles,
  },
  {
    title: "Verified listings",
    description: "See trusted rooms with clearer details, pricing, and location context.",
    icon: ShieldCheck,
  },
  {
    title: "Budget-friendly choices",
    description: "Browse premium, practical spaces built for real student and working life.",
    icon: Wallet,
  },
];

const testimonial = {
  name: "Aarav Sharma",
  role: "Student renter in Pune",
  quote: "The homepage feels much cleaner now. I could search by city, open listings quickly, and shortlist without fighting the interface.",
};

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-700 sm:text-xs">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1f170f] sm:text-4xl md:text-5xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-sm leading-7 text-[#5f4b3b] sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

function FeaturedRoomCard({ room, onSelect }: { room: RoomType; onSelect: (room: RoomType) => void }) {
  return (
    <motion.button
      type="button"
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      onClick={() => onSelect(room)}
      className="group overflow-hidden rounded-[28px] border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] text-left shadow-[0_30px_80px_-48px_rgba(36,25,15,0.34)]"
    >
      <div className="relative overflow-hidden">
        <img src={room.image} alt={room.title} loading="lazy" className="h-72 w-full object-cover transition duration-700 group-hover:scale-105" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1b140d]/60 via-transparent to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-[#fff7ec]/95 px-3 py-1.5 text-xs font-bold text-amber-700 shadow-lg">
          {room.price}
        </div>
        {room.verified ? (
          <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-[#1f170f]/85 px-3 py-1.5 text-xs font-semibold text-amber-100">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-[#1f170f]">{room.title}</h3>
            <p className="mt-1 text-sm text-[#7a6553]">{room.type}</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
            <Star className="h-4 w-4 fill-current" />
            {room.rating}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#5f4b3b]">
          <MapPin className="h-4 w-4 text-amber-700" />
          {room.location}, {room.city}
        </div>
      </div>
    </motion.button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [featuredRooms, setFeaturedRooms] = useState<RoomType[] | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [heroCity, setHeroCity] = useState("");
  const [heroQ, setHeroQ] = useState("");

  useEffect(() => {
    const slider = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4200);

    return () => window.clearInterval(slider);
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch("/api/rooms/cities");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.cities)) {
          setCities(data.cities);
        }
      } catch {
        // ignore
      }
    };

    void fetchCities();
  }, []);

  useEffect(() => {
    const parseArray = (value: unknown) => {
      if (Array.isArray(value)) return value;
      if (typeof value !== "string" || !value.trim()) return [];
      if (!value.trim().startsWith("[")) {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
      }

      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    };

    const getRoomPriceText = (room: any) =>
      room.priceLabel ||
      (room.price > 0 ? `Rs ${room.price.toLocaleString()}/${room.billingPeriod === "night" ? "night" : "mo"}` : "Check source");

    const fetchFeaturedRooms = async () => {
      try {
        const res = await fetch("/api/rooms/luxury");
        if (!res.ok) {
          setFeaturedRooms([]);
          return;
        }

        const data = await res.json();
        const apiRooms = Array.isArray(data.rooms) ? data.rooms : [];

        const mappedRooms: RoomType[] = apiRooms.slice(0, 3).map((room: any) => {
          const images = parseArray(room.images);

          return {
            id: String(room.id),
            title: room.title,
            location: room.location,
            city: room.city,
            rating: Number(room.rating || 4.8),
            price: getRoomPriceText(room),
            image: images[0] || `https://picsum.photos/seed/${room.id}/900/700`,
            type: room.type || "Room",
            verified: Boolean(room.isVerified ?? true),
          };
        });

        setFeaturedRooms(mappedRooms);
      } catch (error) {
        console.error("Failed to fetch featured rooms", error);
        setFeaturedRooms([]);
      }
    };

    void fetchFeaturedRooms();
  }, []);

  const visibleRooms = useMemo(
    () => (featuredRooms && featuredRooms.length > 0 ? featuredRooms : fallbackFeaturedRooms),
    [featuredRooms],
  );

  const openSearch = (city = heroCity, query = heroQ) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("city", city.trim());
    navigate(`/explore${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="bg-[linear-gradient(180deg,#f5eee5_0%,#f0e4d2_18%,#fffaf4_48%,#ffffff_100%)] text-slate-950">
      <section className="relative overflow-hidden bg-[#120e0a]">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroSlides[activeSlide].image}
            initial={{ opacity: 0.25, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.25, scale: 1.03 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img src={heroSlides[activeSlide].image} alt={heroSlides[activeSlide].title} fetchpriority="high" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,14,10,0.9)_0%,rgba(18,14,10,0.68)_45%,rgba(18,14,10,0.45)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,14,10,0.12)_0%,rgba(18,14,10,0.2)_45%,rgba(18,14,10,0.84)_100%)]" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-76px)] max-w-7xl gap-10 px-4 py-10 sm:px-6 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="flex flex-col justify-center">
            <div className="mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-xl sm:text-xs">
              <Sparkles className="h-4 w-4 text-amber-300" />
              {heroSlides[activeSlide].eyebrow}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {heroSlides[activeSlide].title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">
              {heroSlides[activeSlide].subtitle}
            </p>

            <div className="mt-8 max-w-3xl rounded-[2rem] border border-white/15 bg-white/10 p-4 backdrop-blur-xl sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_0.72fr_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-200/90" />
                  <input
                    value={heroQ}
                    onChange={(event) => setHeroQ(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        openSearch();
                      }
                    }}
                    placeholder="Search by area, landmark or room"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-sm font-semibold text-white placeholder:text-white/60 outline-none transition focus:border-white/30"
                  />
                </div>

                <select
                  value={heroCity}
                  onChange={(event) => setHeroCity(event.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-white/30"
                >
                  <option value="">All cities</option>
                  {[...new Set([...quickCities, ...cities])].map((city) => (
                    <option key={city} value={city} className="text-slate-900">
                      {city}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => openSearch()}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#f7e4c4] px-6 py-3 text-sm font-black text-[#1f170f] transition hover:brightness-105"
                >
                  Explore
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => openSearch(city, "")}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-white/20"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button type="button" onClick={() => setActiveSlide((activeSlide + heroSlides.length - 1) % heroSlides.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20">
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-2 sm:flex">
                {heroSlides.map((slide, index) => (
                  <button
                    key={slide.image}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition ${index === activeSlide ? "w-10 bg-white" : "w-2.5 bg-white/40"}`}
                    aria-label={`Show slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }} className="grid gap-4 lg:pb-4">
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 text-white backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Why this feels easier</p>
              <div className="mt-5 grid gap-4">
                {trustPoints.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-amber-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-200">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <p className="text-3xl font-black">20K+</p>
                <p className="mt-2 text-sm text-slate-200">Monthly room seekers</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <p className="text-3xl font-black">4.9/5</p>
                <p className="mt-2 text-sm text-slate-200">Average renter rating</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <p className="text-3xl font-black">3 steps</p>
                <p className="mt-2 text-sm text-slate-200">Search, shortlist, connect</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="Featured stays"
              title="Premium spaces without the homepage clutter"
              subtitle="A smaller, sharper selection keeps the first experience focused and easier to trust."
            />
            <button
              type="button"
              onClick={() => openSearch()}
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-semibold text-[#5f4b3b] shadow-sm transition hover:border-amber-300 hover:text-amber-700"
            >
              View all listings
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {visibleRooms.map((room, index) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <FeaturedRoomCard room={room} onSelect={setSelectedRoom} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-4 sm:px-6 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[36px] border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] p-6 shadow-[0_30px_80px_-56px_rgba(36,25,15,0.28)] lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <div>
            <SectionHeading
              eyebrow="What changed"
              title="A calmer homepage with a more premium flow"
              subtitle="We removed the noisy discovery pattern and kept the core journey focused on finding a room quickly."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {trustPoints.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="rounded-[26px] bg-white p-5 shadow-[0_20px_60px_-52px_rgba(36,25,15,0.3)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f170f] text-amber-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#1f170f]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#5f4b3b]">{item.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.72fr_0.28fr]">
          <div className="rounded-[36px] bg-[linear-gradient(135deg,#16120d_0%,#2b1c12_38%,#7c5a2c_100%)] p-8 text-white shadow-[0_40px_100px_-50px_rgba(52,34,16,0.85)] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">Renter feedback</p>
            <p className="mt-6 text-2xl font-black leading-tight sm:text-4xl">"{testimonial.quote}"</p>
            <div className="mt-8">
              <p className="text-lg font-bold">{testimonial.name}</p>
              <p className="mt-1 text-sm text-amber-100/80">{testimonial.role}</p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[36px] border border-amber-100/80 bg-white p-8 shadow-[0_30px_80px_-56px_rgba(36,25,15,0.2)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">Ready to search</p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-[#1f170f]">Start with less friction.</h3>
              <p className="mt-4 text-sm leading-7 text-[#5f4b3b]">Open the listing page with a simple city search and refine only if you need to.</p>
            </div>

            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => openSearch()}
                className="inline-flex items-center justify-center rounded-2xl bg-[#1f170f] px-5 py-3 text-sm font-bold text-amber-50 transition hover:bg-[#342518]"
              >
                Browse listings
              </button>
              <button
                type="button"
                onClick={() => navigate("/map")}
                className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-800 transition hover:border-amber-300"
              >
                Open map view
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-16 pt-4 sm:px-6 md:px-8">
        <div className="mx-auto max-w-7xl rounded-[36px] border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f5ece0_100%)] px-6 py-8 shadow-[0_26px_70px_-50px_rgba(36,25,15,0.3)] sm:px-10 sm:py-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div>
              <BrandLogo subtitle="" />
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#5f4b3b]">
                Helping bachelors, students, and professionals discover verified spaces with a simpler and more polished search flow.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-[#1f170f]">Explore</p>
              <div className="mt-4 grid gap-3 text-sm text-[#5f4b3b]">
                <button type="button" onClick={() => navigate("/")} className="text-left hover:text-amber-700">Home</button>
                <button type="button" onClick={() => openSearch()} className="text-left hover:text-amber-700">Listings</button>
                <button type="button" onClick={() => navigate("/map")} className="text-left hover:text-amber-700">Map</button>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-[#1f170f]">Contact</p>
              <div className="mt-4 space-y-3 text-sm text-[#5f4b3b]">
                <p>hello@bachelorrooms.com</p>
                <p>+91 90000 12345</p>
                <p>Mumbai, Pune, Nashik, Goa</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {selectedRoom ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
            onClick={() => setSelectedRoom(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_40px_100px_-50px_rgba(15,23,42,0.45)]"
            >
              <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
                <img src={selectedRoom.image} alt={selectedRoom.title} className="h-72 w-full object-cover md:h-full" referrerPolicy="no-referrer" />
                <div className="p-6 sm:p-8">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Verified Listing
                  </div>
                  <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{selectedRoom.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Premium-ready stay with modern interiors, strong connectivity, and a cleaner shortlist experience for renters.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Location</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedRoom.location}, {selectedRoom.city}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Monthly Price</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedRoom.price}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Category</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedRoom.type}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Status</p>
                      <p className="mt-2 font-semibold text-slate-900">Verified and ready to review</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => navigate(`/map/${selectedRoom.id}`)}
                      className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f170f_0%,#7c5a2c_100%)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-105"
                    >
                      View Full Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoom(null)}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-amber-200 hover:text-amber-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
