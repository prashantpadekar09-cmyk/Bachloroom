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
    accent: "text-emerald-700",
    panel: "from-emerald-100 via-white to-cyan-50",
    chip: "bg-emerald-600 text-white",
    summary: "Ready room support with bed setup, mattress, and basic furniture.",
  },
  "Cleaning Service": {
    icon: Sparkles,
    accent: "text-sky-700",
    panel: "from-sky-100 via-white to-blue-50",
    chip: "bg-sky-600 text-white",
    summary: "Weekly or monthly upkeep with room, bathroom, and deep cleaning options.",
  },
  "Tiffin / Food Service": {
    icon: UtensilsCrossed,
    accent: "text-amber-700",
    panel: "from-amber-100 via-white to-orange-50",
    chip: "bg-amber-500 text-slate-950",
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="ambient-surface-strong rounded-[2rem] p-6 sm:p-8 lg:p-10 mb-8 overflow-hidden relative">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.2),transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200">
            <Briefcase className="h-4 w-4" />
            Browser-sourced services
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-black tracking-tight text-gray-900">
            Set up your room, keep it clean, and sort your meals in one place
          </h1>
          <p className="mt-3 max-w-3xl text-base md:text-lg text-gray-600 leading-relaxed">
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
                  className={`rounded-[1.75rem] border border-white/70 bg-gradient-to-br ${meta.panel} p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 ${meta.accent}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-gray-600">
                      {activeCount} listed
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-gray-900">{category}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{meta.summary}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by service, city, or included items..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
              categoryFilter === "" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Categories
          </button>
          {visibleCategories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-colors ${
                categoryFilter === category ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Available Services</h2>
          <p className="text-gray-500 mt-1">
            {loading ? "Loading services..." : `${filteredServices.length} services ready for browsing`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Briefcase className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500">Try adjusting your search or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredServices.map((service, index) => {
            const meta = serviceMeta[service.category] || {
              icon: Briefcase,
              accent: "text-blue-700",
              panel: "from-blue-100 via-white to-slate-50",
              chip: "bg-blue-600 text-white",
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
                className="bg-white rounded-[1.75rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all flex flex-col"
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
                        <div className="max-w-[13rem] rounded-[1.5rem] bg-white/80 p-4 backdrop-blur-sm shadow-sm">
                          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-gray-400">Provider</p>
                          <p className="mt-2 text-base font-bold leading-tight text-gray-900">
                            {service.providerName || "Service provider"}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">{service.city}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-gray-900 shadow-sm">
                    <Icon className={`h-4 w-4 ${meta.accent}`} />
                    {service.category}
                  </div>
                  <div className="absolute top-4 right-4 max-w-[12rem] rounded-2xl bg-slate-950/85 px-3 py-2 text-right text-xs font-bold leading-tight text-white shadow-sm">
                    {priceText}
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    {service.city}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">{service.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{service.description}</p>

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

                  <div className="mt-6 rounded-2xl bg-gray-50 p-4 border border-gray-100">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Provider</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{service.providerName || "Verified Partner"}</p>
                      </div>
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white ${meta.accent}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600">
                      {service.providerPhone && (
                        <a
                          href={`tel:${service.providerPhone}`}
                          className="inline-flex items-center gap-2 hover:text-blue-700 transition-colors"
                        >
                          <Phone className="h-4 w-4 text-blue-600" />
                          {service.providerPhone}
                        </a>
                      )}
                      {service.providerEmail && (
                        <a
                          href={`mailto:${service.providerEmail}`}
                          className="inline-flex items-center gap-2 hover:text-blue-700 transition-colors"
                        >
                          <Mail className="h-4 w-4 text-blue-600" />
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

                  <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-gray-500">Service provider listing</div>
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
