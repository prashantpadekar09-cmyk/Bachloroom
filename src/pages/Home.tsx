import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Apple,
  ArrowRight,
  BedDouble,
  Building,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Heart,
  Home as HomeIcon,
  Instagram,
  MapPin,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Twitter,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";

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
    eyebrow: "Luxury rentals for modern living",
    title: "Find Your Perfect Room Today",
    subtitle: "Affordable, Verified Rooms for Bachelors & Students",
  },
  {
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80",
    eyebrow: "Premium spaces across top cities",
    title: "Move Into Stylish, Ready-To-Live Spaces",
    subtitle: "Curated PGs, studios, and shared rooms for students and professionals.",
  },
  {
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80",
    eyebrow: "Trusted by renters and owners",
    title: "Search Smart. Visit Fast. Book Confidently.",
    subtitle: "High-quality listings with verified owners, premium visuals, and flexible budgets.",
  },
];

const recentSearches = ["Pune PG under 12000", "Mumbai single room", "No broker hostel in Nashik"];

const fallbackFeaturedRooms: RoomType[] = [
  { id: "fallback-1", title: "Skyline Studio Retreat", location: "Koregaon Park", city: "Pune", rating: 4.9, price: "Rs 18,500/mo", image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80", type: "Studio Apartment", verified: true },
  { id: "fallback-2", title: "Urban Bachelor Suite", location: "Andheri West", city: "Mumbai", rating: 4.8, price: "Rs 16,000/mo", image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80", type: "Single Room", verified: true },
  { id: "fallback-3", title: "Co-Live Comfort Hub", location: "Baner", city: "Pune", rating: 4.7, price: "Rs 11,500/mo", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", type: "Shared Room", verified: true },
  { id: "fallback-4", title: "Minimal PG Residence", location: "Panaji", city: "Goa", rating: 4.9, price: "Rs 13,000/mo", image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80", type: "PG", verified: true },
];

const galleryImages = [
  { title: "Modern Bedroom", image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", className: "md:col-span-2 md:row-span-2" },
  { title: "Shared Comfort", image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80", className: "" },
  { title: "PG Lounge", image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80", className: "" },
  { title: "Studio Apartment", image: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=80", className: "md:col-span-2" },
];

const categories = [
  {
    title: "Single Room",
    description: "Private comfort for focused living",
    icon: BedDouble,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    count: "1.2K stays",
  },
  {
    title: "Shared Room",
    description: "Affordable living with social comfort",
    icon: Users,
    image: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    count: "860 stays",
  },
  {
    title: "PG",
    description: "Managed stays with essentials included",
    icon: Building2,
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
    count: "940 stays",
  },
  {
    title: "Hostel",
    description: "Budget-friendly spaces near colleges and work hubs",
    icon: Building,
    image: "https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=900&q=80",
    count: "720 stays",
  },
];

const reasons = [
  { title: "Verified Listings", description: "Every featured property is checked for quality, authenticity, and trust.", icon: ShieldCheck },
  { title: "Affordable Pricing", description: "Clear pricing with room options built for students and working professionals.", icon: Wallet },
  { title: "Easy Booking", description: "Discover, compare, shortlist, and contact owners from one polished flow.", icon: CalendarDays },
  { title: "Trusted Owners", description: "Build confidence with real owner profiles, ratings, and verified badges.", icon: CheckCircle2 },
];

const testimonials = [
  { name: "Aman Verma", role: "Software Engineer", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80", rating: 5, quote: "The room visuals and filters felt premium. I found a verified room in Pune within two days." },
  { name: "Ritika Shah", role: "MBA Student", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80", rating: 5, quote: "The platform feels way better than regular listing sites. Everything looked clean, premium, and easy to trust." },
  { name: "Nikhil Patil", role: "Product Designer", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80", rating: 5, quote: "Shortlisting rooms, comparing prices, and reaching owners was smooth even on my phone." },
];

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-500">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      {subtitle ? <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}

function FeaturedRoomCard({ room, onQuickView }: { room: RoomType; onQuickView: (room: RoomType) => void }) {
  return (
    <motion.article whileHover={{ y: -8 }} transition={{ duration: 0.22 }} className="group overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_70px_-42px_rgba(15,23,42,0.35)]">
      <div className="relative overflow-hidden">
        <img src={room.image} alt={room.title} loading="lazy" className="h-72 w-full object-cover transition duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
        <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-2 text-xs font-bold text-sky-700 shadow-lg">{room.price}</div>
        {room.verified ? <div className="absolute right-16 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-lg"><CheckCircle2 className="h-3.5 w-3.5" />Verified</div> : null}
        <button type="button" aria-label={`Add ${room.title} to wishlist`} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/92 text-slate-500 shadow-lg transition hover:text-rose-500"><Heart className="h-5 w-5" /></button>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent opacity-0 transition group-hover:opacity-100" />
        <button type="button" onClick={() => onQuickView(room)} className="absolute bottom-4 left-4 rounded-full bg-slate-950/85 px-4 py-2 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">Quick View</button>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-xl font-bold text-slate-950">{room.title}</h3><p className="mt-1 text-sm text-slate-500">{room.type}</p></div>
          <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-600"><Star className="h-4 w-4 fill-current" />{room.rating}</div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 text-sky-700" />{room.location}, {room.city}</div>
      </div>
    </motion.article>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeReview, setActiveReview] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [featuredRooms, setFeaturedRooms] = useState<RoomType[]>(fallbackFeaturedRooms);

  useEffect(() => {
    const slider = window.setInterval(() => setActiveSlide((current) => (current + 1) % heroSlides.length), 4200);
    return () => window.clearInterval(slider);
  }, []);

  useEffect(() => {
    const reviewTimer = window.setInterval(() => setActiveReview((current) => (current + 1) % testimonials.length), 4600);
    return () => window.clearInterval(reviewTimer);
  }, []);

  useEffect(() => {
    const parseArray = (value: unknown) => {
      if (Array.isArray(value)) {
        return value;
      }

      if (typeof value !== "string" || !value.trim()) {
        return [];
      }

      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    const getRoomPriceText = (room: any) =>
      room.priceLabel ||
      (room.price > 0
        ? `Rs ${room.price.toLocaleString()}/${room.billingPeriod === "night" ? "night" : "mo"}`
        : "Check source");

    const fetchFeaturedRooms = async () => {
      try {
        const res = await fetch("/api/rooms");
        if (!res.ok) {
          return;
        }

        const data = await res.json();
        const apiRooms = Array.isArray(data.rooms) ? data.rooms : [];
        const preferredRooms = apiRooms.some((room: any) => Boolean(room.isFeatured))
          ? apiRooms.filter((room: any) => Boolean(room.isFeatured))
          : apiRooms;

        const mappedRooms: RoomType[] = preferredRooms.slice(0, 4).map((room: any) => {
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

        if (mappedRooms.length > 0) {
          setFeaturedRooms(mappedRooms);
        }
      } catch (error) {
        console.error("Failed to fetch featured rooms", error);
      }
    };

    void fetchFeaturedRooms();
  }, []);

  return (
    <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_45%,#ffffff_100%)] text-slate-950">
      <section className="relative min-h-[calc(100vh-84px)] overflow-hidden rounded-b-[2.5rem] bg-slate-950">
        <AnimatePresence mode="wait">
          <motion.div key={heroSlides[activeSlide].image} initial={{ opacity: 0.2, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0.2, scale: 1.03 }} transition={{ duration: 0.8, ease: "easeOut" }} className="absolute inset-0">
            <img src={heroSlides[activeSlide].image} alt={heroSlides[activeSlide].title} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.38)_0%,rgba(15,23,42,0.58)_48%,rgba(15,23,42,0.72)_100%)]" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(15,23,42,0.42)_0%,transparent_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-84px)] max-w-7xl flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/90 backdrop-blur-xl"><Sparkles className="h-4 w-4 text-amber-300" />{heroSlides[activeSlide].eyebrow}</div>
            <h1 className="mt-6 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">{heroSlides[activeSlide].title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">{heroSlides[activeSlide].subtitle}</p>

            <div className="mt-8 flex flex-wrap gap-3">{recentSearches.map((item) => <button key={item} type="button" onClick={() => navigate(`/rooms?city=${encodeURIComponent(item.split(" ")[0])}`)} className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 backdrop-blur-md transition hover:bg-white/20">{item}</button>)}</div>

            <div className="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md"><p className="text-3xl font-black text-white">20K+</p><p className="mt-2 text-sm text-slate-200">Monthly room seekers</p></div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md"><p className="text-3xl font-black text-white">4.9/5</p><p className="mt-2 text-sm text-slate-200">Average renter rating</p></div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-md"><p className="text-3xl font-black text-white">100%</p><p className="mt-2 text-sm text-slate-200">Verified premium listings</p></div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => navigate("/rooms")} className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100">Browse Rooms</button>
              <button type="button" onClick={() => navigate("/register")} className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20">List Your Property</button>
            </div>
          </motion.div>

          <div className="mt-8 flex items-center justify-between gap-4 text-white/90">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setActiveSlide((activeSlide + heroSlides.length - 1) % heroSlides.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition hover:bg-white/20"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition hover:bg-white/20"><ChevronRight className="h-5 w-5" /></button>
            </div>
            <div className="hidden items-center gap-2 sm:flex">{heroSlides.map((slide, index) => <button key={slide.image} type="button" onClick={() => setActiveSlide(index)} className={`h-2.5 rounded-full transition ${index === activeSlide ? "w-10 bg-white" : "w-2.5 bg-white/40"}`} aria-label={`Show slide ${index + 1}`} />)}</div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Featured rooms" title="Premium spaces curated for your lifestyle" subtitle="Browse elegant, verified listings with rich visuals and quick decision-making details." /><button type="button" onClick={() => navigate("/rooms")} className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700">View all rooms<ArrowRight className="h-4 w-4" /></button></div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">{featuredRooms.map((room, index) => <motion.div key={room.id} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.08 }}><FeaturedRoomCard room={room} onQuickView={setSelectedRoom} /></motion.div>)}</div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(180deg,#f8fbff_0%,#edf7ff_100%)] p-5 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><SectionHeading eyebrow="Room image gallery" title="Explore Beautiful Spaces" subtitle="A premium collage of bedrooms, PGs, shared spaces, and studio apartments designed to inspire trust at first glance." /><div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-white px-4 py-2 text-sm font-semibold text-amber-600 shadow-sm"><Sparkles className="h-4 w-4" />Visual-first discovery</div></div>
          <div className="grid auto-rows-[220px] gap-4 md:grid-cols-4">{galleryImages.map((item, index) => <motion.div key={item.title} initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.06 }} className={`group relative overflow-hidden rounded-[28px] ${item.className}`}><img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" referrerPolicy="no-referrer" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" /><div className="absolute bottom-5 left-5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">{item.title}</div></motion.div>)}</div>
        </div>
      </section>
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Categories"
            title="Choose the room style that fits your routine"
            subtitle="Premium category cards with real spaces, so users can browse by lifestyle instead of plain labels."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.map((category, index) => {
              const Icon = category.icon;

              return (
                <motion.button
                  key={category.title}
                  type="button"
                  onClick={() => navigate(`/rooms?type=${encodeURIComponent(category.title)}`)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  whileHover={{ y: -8 }}
                  className="group relative overflow-hidden rounded-[30px] text-left shadow-[0_26px_70px_-42px_rgba(15,23,42,0.35)]"
                >
                  <img
                    src={category.image}
                    alt={category.title}
                    loading="lazy"
                    className="h-[320px] w-full object-cover transition duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.3)_40%,rgba(15,23,42,0.82)_100%)]" />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white backdrop-blur-md">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                      {category.count}
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <div className="rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                      <h3 className="text-xl font-bold text-white">{category.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-100">{category.description}</p>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                        Explore category
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[36px] border border-white/80 bg-white p-6 shadow-[0_36px_100px_-56px_rgba(15,23,42,0.25)] sm:p-10"><SectionHeading eyebrow="Why choose us" title="Everything you need to rent with confidence" subtitle="We combine high-trust listing quality with a premium browsing experience that works beautifully on every screen." /><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{reasons.map((reason, index) => { const Icon = reason.icon; return <motion.div key={reason.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.08 }} className="rounded-[28px] bg-slate-50 p-6"><div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-sky-700 shadow-md shadow-slate-200"><Icon className="h-6 w-6" /></div><h3 className="mt-5 text-lg font-bold text-slate-950">{reason.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{reason.description}</p></motion.div>; })}</div></div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Testimonials" title="Loved by students and working professionals" subtitle="Authentic feedback from renters who discovered their next stay with a more premium, less stressful search experience." /><div className="mt-10 grid gap-6 lg:grid-cols-[0.68fr_0.32fr]"><AnimatePresence mode="wait"><motion.div key={testimonials[activeReview].name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="rounded-[32px] border border-white/80 bg-white p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.28)] sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-4"><img src={testimonials[activeReview].avatar} alt={testimonials[activeReview].name} className="h-16 w-16 rounded-2xl object-cover" loading="lazy" referrerPolicy="no-referrer" /><div><h3 className="text-xl font-bold text-slate-950">{testimonials[activeReview].name}</h3><p className="text-sm text-slate-500">{testimonials[activeReview].role}</p></div></div><div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-600">{Array.from({ length: testimonials[activeReview].rating }).map((_, index) => <Star key={index} className="h-4 w-4 fill-current" />)}</div></div><p className="mt-8 text-lg leading-9 text-slate-700">&ldquo;{testimonials[activeReview].quote}&rdquo;</p></motion.div></AnimatePresence><div className="grid gap-4">{testimonials.map((item, index) => <button key={item.name} type="button" onClick={() => setActiveReview(index)} className={`rounded-[28px] border p-4 text-left transition ${index === activeReview ? "border-sky-200 bg-sky-50 shadow-lg" : "border-white/80 bg-white shadow-sm hover:border-slate-200"}`}><p className="text-base font-bold text-slate-950">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.role}</p></button>)}</div></div></div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#38bdf8_100%)] px-6 py-10 text-white shadow-[0_40px_100px_-50px_rgba(29,78,216,0.8)] sm:px-10 sm:py-14"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">Call to action</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Start Your Room Search Now</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-slate-100 sm:text-base">Discover premium room listings, shortlist faster, and move into a verified space that matches your lifestyle and budget.</p></div><div className="flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => navigate("/rooms")} className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100">Browse Rooms</button><button type="button" onClick={() => navigate("/register")} className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20">List Your Property</button></div></div></div>
      </section>

      <footer className="px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[36px] border border-white/80 bg-white px-6 py-8 shadow-[0_26px_70px_-50px_rgba(15,23,42,0.3)] sm:px-10 sm:py-10"><div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr_0.85fr_1fr]"><div><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] text-white shadow-lg shadow-sky-200"><HomeIcon className="h-5 w-5" /></div><div><p className="text-sm font-black uppercase tracking-[0.24em] text-slate-950">Bachelor Rooms</p><p className="text-sm text-slate-500">Premium room discovery platform</p></div></div><p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">Helping bachelors, students, and professionals discover verified spaces with premium visuals and smoother booking experiences.</p></div><div><p className="text-sm font-bold text-slate-950">Quick Links</p><div className="mt-4 grid gap-3 text-sm text-slate-600"><button type="button" onClick={() => navigate("/")} className="text-left hover:text-sky-700">Home</button><button type="button" onClick={() => navigate("/rooms")} className="text-left hover:text-sky-700">Browse Rooms</button><button type="button" onClick={() => navigate("/services")} className="text-left hover:text-sky-700">Services</button><button type="button" onClick={() => navigate("/support")} className="text-left hover:text-sky-700">Support</button></div></div><div><p className="text-sm font-bold text-slate-950">Contact</p><div className="mt-4 space-y-3 text-sm text-slate-600"><p>hello@bachelorrooms.com</p><p>+91 90000 12345</p><p>Mumbai, Pune, Nashik, Goa</p></div></div><div><p className="text-sm font-bold text-slate-950">Get the app</p><div className="mt-4 space-y-3"><button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-sky-200"><Apple className="h-5 w-5" />Download on App Store</button><button type="button" className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:border-sky-200"><Play className="h-5 w-5" />Get it on Play Store</button></div><div className="mt-5 flex items-center gap-3 text-slate-500">{[Instagram, Facebook, Twitter].map((Icon, index) => <button key={index} type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 transition hover:border-sky-200 hover:text-sky-700"><Icon className="h-4 w-4" /></button>)}</div></div></div></div>
      </footer>

      <AnimatePresence>
        {selectedRoom ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" onClick={() => setSelectedRoom(null)}><motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }} transition={{ duration: 0.22 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_40px_100px_-50px_rgba(15,23,42,0.45)]"><div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]"><img src={selectedRoom.image} alt={selectedRoom.title} className="h-72 w-full object-cover md:h-full" referrerPolicy="no-referrer" /><div className="p-6 sm:p-8"><div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Verified Listing</div><h3 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{selectedRoom.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">Luxury-ready stay with modern interiors, strong connectivity, and a premium living experience crafted for working professionals and students.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Location</p><p className="mt-2 font-semibold text-slate-900">{selectedRoom.location}, {selectedRoom.city}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Monthly Price</p><p className="mt-2 font-semibold text-slate-900">{selectedRoom.price}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Category</p><p className="mt-2 font-semibold text-slate-900">{selectedRoom.type}</p></div><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs uppercase tracking-[0.24em] text-slate-400">Highlights</p><div className="mt-2 flex items-center gap-2 font-semibold text-slate-900"><Wifi className="h-4 w-4 text-sky-700" />Wi-Fi, premium furnishing</div></div></div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={() => navigate(`/rooms/${selectedRoom.id}`)} className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb_0%,#38bdf8_100%)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-105">View Full Details</button><button type="button" onClick={() => setSelectedRoom(null)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">Close</button></div></div></div></motion.div></motion.div> : null}
      </AnimatePresence>
    </div>
  );
}
