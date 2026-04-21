import React, { useEffect, useState } from "react";
import {
  BedDouble,
  Briefcase,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { motion } from "motion/react";

type Service = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceLabel?: string;
  city: string;
  image?: string;
  highlights?: string[];
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
  whatsappUrl?: string;
};

const serviceMeta: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
    panel: string;
    chip: string;
    summary: string;
  }
> = {
  "Room Setup / Move-in Service": {
    icon: BedDouble,
    accent: "text-amber-700",
    panel: "from-[#fbf1df] via-white to-[#f5e6d1]",
    chip: "bg-[#1f170f] text-amber-50",
    summary: "Ready room support with bed setup, mattress, and basic furniture.",
  },
  "Cleaning Service": {
    icon: Sparkles,
    accent: "text-amber-700",
    panel: "from-[#f7ead7] via-white to-[#efe0cb]",
    chip: "bg-[#8a6431] text-white",
    summary: "Weekly or monthly upkeep with room, bathroom, and deep cleaning options.",
  },
  "Tiffin / Food Service": {
    icon: UtensilsCrossed,
    accent: "text-amber-700",
    panel: "from-[#fff4e3] via-white to-[#f4dfbf]",
    chip: "bg-[#f4e1bf] text-[#1e140d]",
    summary: "Meal subscriptions with veg, non-veg, or specialty plans depending on the provider.",
  },
};

const preferredCategories = [
  "Room Setup / Move-in Service",
  "Cleaning Service",
  "Tiffin / Food Service",
];

const formatServicePrice = (category: string, price: number, priceLabel?: string) => {
  if (priceLabel) {
    return priceLabel;
  }

  if (!price || price <= 0) {
    return "Contact for pricing";
  }

  const unit =
    category === "Tiffin / Food Service"
      ? "/plate"
      : category === "Cleaning Service"
        ? "/visit"
        : "/item";

  return `Starting from Rs. ${price}${unit}`;
};

const getWhatsAppHref = (whatsappUrl?: string, providerPhone?: string) => {
  if (whatsappUrl?.trim()) {
    return whatsappUrl.trim();
  }

  const digits = (providerPhone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  return `https://wa.me/${digits}`;
};

export default function ServicesMarketplacePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch("/api/services");
        if (res.ok) {
          const data = await res.json();
          setServices(data.services || []);
        }
      } catch (err) {
        console.error("Failed to fetch services", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const filteredServices = services.filter((service) => {
    const haystack = [
      service.title,
      service.description,
      service.providerName,
      service.city,
      service.category,
      ...(service.highlights || []),
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? service.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(services.map((service) => service.category)));
  const visibleCategories = preferredCategories.filter((category) => categories.includes(category));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-amber-200/25 bg-[linear-gradient(135deg,#16120d_0%,#24190f_22%,#3a2919_54%,#f6ead6_140%)] p-6 text-white shadow-[0_35px_120px_-55px_rgba(36,25,15,0.88)] sm:p-8 lg:p-10">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(255,248,235,0.16),transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/35 bg-white/10 px-4 py-2 text-sm font-semibold text-amber-100 shadow-lg">
            <Briefcase className="h-4 w-4" />
            Browser-sourced services
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
            Set up your room, keep it clean, and sort your meals in one place
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-amber-50/82 md:text-lg">
            Browse move-in help, recurring cleaning, and food subscriptions with provider contacts in one place.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {preferredCategories.map((category) => {
              const meta = serviceMeta[category];
              const Icon = meta.icon;
              const activeCount = services.filter((service) => service.category === category).length;

              return (
                <button
                  key={category}
                  onClick={() => setCategoryFilter((current) => (current === category ? "" : category))}
                  className={`rounded-[1.75rem] border border-amber-100/40 bg-gradient-to-br ${meta.panel} p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 ${meta.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#6d5746]">
                      {activeCount} listed
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-[#1e140d]">{category}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#5f4b3b]">{meta.summary}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] p-4 shadow-sm lg:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8a735d]" />
          <input
            type="text"
            placeholder="Search by service, city, or included items..."
            className="w-full rounded-xl border border-amber-100 bg-white/80 py-3 pl-10 pr-4 text-[#1e140d] focus:outline-none focus:ring-2 focus:ring-amber-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
              categoryFilter === "" ? "bg-[#1f170f] text-amber-50" : "bg-amber-50 text-[#5f4b3b] hover:bg-amber-100"
            }`}
          >
            All Categories
          </button>
          {visibleCategories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                categoryFilter === category ? "bg-[#1f170f] text-amber-50" : "bg-amber-50 text-[#5f4b3b] hover:bg-amber-100"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#1e140d]">Available Services</h2>
          <p className="mt-1 text-[#7a6553]">
            {loading ? "Loading services..." : `${filteredServices.length} services ready for browsing`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-amber-700"></div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-2xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] py-20 text-center">
          <Briefcase className="mx-auto mb-4 h-16 w-16 text-amber-300" />
          <h3 className="mb-2 text-xl font-medium text-[#1e140d]">No services found</h3>
          <p className="text-[#7a6553]">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service, index) => {
            const meta = serviceMeta[service.category] || {
              icon: Briefcase,
              accent: "text-amber-700",
              panel: "from-[#fbf1df] via-white to-[#f5e6d1]",
              chip: "bg-[#1f170f] text-amber-50",
              summary: "",
            };
            const Icon = meta.icon;
            const priceText = formatServicePrice(service.category, service.price, service.priceLabel);
            const whatsappHref = getWhatsAppHref(service.whatsappUrl, service.providerPhone);

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex flex-col overflow-hidden rounded-[1.75rem] border border-amber-100/80 bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe4_100%)] shadow-sm transition-all hover:shadow-xl"
              >
                <div className="h-52 relative overflow-hidden">
                  {service.image ? (
                    <>
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${meta.panel}`}>
                      <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.9),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.12),transparent_42%)]" />
                      <div className="absolute inset-0 p-6 flex flex-col justify-between">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-white/90 shadow-sm">
                          <Icon className={`h-7 w-7 ${meta.accent}`} />
                        </div>
                        <div className="max-w-[13rem] rounded-[1.5rem] bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#9b846f]">Provider</p>
                          <p className="mt-2 text-base font-bold leading-tight text-[#1e140d]">
                            {service.providerName || "Service provider"}
                          </p>
                          <p className="mt-1 text-sm text-[#5f4b3b]">{service.city}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-[#1e140d] shadow-sm">
                    <Icon className={`h-4 w-4 ${meta.accent}`} />
                    {service.category}
                  </div>
                  <div className="absolute top-4 right-4 max-w-[12rem] rounded-2xl bg-[#1f170f]/88 px-3 py-2 text-right text-xs font-bold leading-tight text-amber-50 shadow-sm">
                    {priceText}
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#5f4b3b]">
                    <MapPin className="h-3.5 w-3.5 text-amber-700" />
                    {service.city}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold leading-tight text-[#1e140d]">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#5f4b3b]">{service.description}</p>

                  {!!service.highlights?.length && (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {service.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className={`rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${meta.chip}`}
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 rounded-2xl border border-amber-100/80 bg-[linear-gradient(180deg,#fffaf3_0%,#f4e9da_100%)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#9b846f]">Provider</p>
                        <p className="mt-1 text-sm font-semibold text-[#1e140d]">{service.providerName || "Verified Partner"}</p>
                      </div>
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white ${meta.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 text-sm text-[#5f4b3b]">
                      {service.providerPhone && (
                        <a
                          href={`tel:${service.providerPhone}`}
                          className="inline-flex items-center gap-2 transition-colors hover:text-amber-700"
                        >
                          <Phone className="h-4 w-4 text-amber-700" />
                          {service.providerPhone}
                        </a>
                      )}
                      {service.providerEmail && (
                        <a
                          href={`mailto:${service.providerEmail}`}
                          className="inline-flex items-center gap-2 transition-colors hover:text-amber-700"
                        >
                          <Mail className="h-4 w-4 text-amber-700" />
                          {service.providerEmail}
                        </a>
                      )}
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 hover:text-green-700 transition-colors"
                        >
                          <Phone className="h-4 w-4 text-green-600" />
                          WhatsApp Link
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-amber-100/80 pt-5">
                    <div className="text-sm font-semibold text-[#7a6553]">Service provider listing</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
