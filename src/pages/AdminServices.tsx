import { type FormEvent, useEffect, useState } from "react";
import { Briefcase, Edit, Filter, IndianRupee, Loader2, MapPin, Search, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";

interface Service {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  priceLabel?: string | null;
  city: string;
  image?: string | null;
  highlights?: string[];
  providerName?: string | null;
  providerEmail?: string | null;
  providerPhone?: string | null;
  whatsappUrl?: string | null;
}

type ServiceFormState = {
  title: string;
  description: string;
  category: string;
  price: string;
  city: string;
  image: string;
  highlights: string;
  providerName: string;
  providerEmail: string;
  providerPhone: string;
  whatsappUrl: string;
};

const emptyServiceForm: ServiceFormState = {
  title: "",
  description: "",
  category: "Cleaning Service",
  price: "",
  city: "",
  image: "",
  highlights: "",
  providerName: "",
  providerEmail: "",
  providerPhone: "",
  whatsappUrl: "",
};

export default function AdminServices() {
  const { token } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(emptyServiceForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    void fetchServices();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const availableCities = Array.from(new Set<string>(services.map((service) => service.city))).sort((a, b) =>
    a.localeCompare(b)
  );
  const availableCategories = Array.from(new Set<string>(services.map((service) => service.category))).sort((a, b) =>
    a.localeCompare(b)
  );

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.providerName || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = cityFilter === "all" || service.city === cityFilter;
    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter;
    return matchesSearch && matchesCity && matchesCategory;
  });

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      title: service.title || "",
      description: service.description || "",
      category: service.category || "Cleaning Service",
      price: String(service.price ?? ""),
      city: service.city || "",
      image: service.image || "",
      highlights: (service.highlights || []).join(", "),
      providerName: service.providerName || "",
      providerEmail: service.providerEmail || "",
      providerPhone: service.providerPhone || "",
      whatsappUrl: service.whatsappUrl || "",
    });
  };

  const closeEditModal = () => {
    if (isSaving) {
      return;
    }

    setEditingService(null);
    setServiceForm(emptyServiceForm);
  };

  const handleEditSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingService || isSaving) {
      return;
    }

    setIsSaving(true);

    const highlights = serviceForm.highlights
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/services/${editingService.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: serviceForm.title.trim(),
          description: serviceForm.description.trim(),
          category: serviceForm.category,
          price: Number(serviceForm.price),
          city: serviceForm.city.trim(),
          image: serviceForm.image.trim() || null,
          highlights,
          providerName: serviceForm.providerName.trim() || null,
          providerEmail: serviceForm.providerEmail.trim() || null,
          providerPhone: serviceForm.providerPhone.trim() || null,
          whatsappUrl: serviceForm.whatsappUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Failed to update service", "error");
        return;
      }

      setServices((current) =>
        current.map((service) =>
          service.id === editingService.id
            ? {
                ...service,
                title: serviceForm.title.trim(),
                description: serviceForm.description.trim(),
                category: serviceForm.category,
                price: Number(serviceForm.price),
                priceLabel:
                  Number(serviceForm.price) > 0
                    ? serviceForm.category === "Tiffin / Food Service"
                      ? `Starting from Rs. ${Number(serviceForm.price)}/plate`
                      : serviceForm.category === "Cleaning Service"
                        ? `Starting from Rs. ${Number(serviceForm.price)}/visit`
                        : `Starting from Rs. ${Number(serviceForm.price)}/item`
                    : null,
                city: serviceForm.city.trim(),
                image: serviceForm.image.trim() || null,
                highlights,
                providerName: serviceForm.providerName.trim() || null,
                providerEmail: serviceForm.providerEmail.trim() || null,
                providerPhone: serviceForm.providerPhone.trim() || null,
                whatsappUrl: serviceForm.whatsappUrl.trim() || null,
              }
            : service
        )
      );

      closeEditModal();
      showToast("Service updated successfully", "success");
    } catch (err) {
      console.error("Failed to update service", err);
      showToast("An error occurred while updating the service.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this service? This action cannot be undone.")) return;

    try {
      setDeletingServiceId(id);
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setServices((current) => current.filter((service) => service.id !== id));
        showToast("Service deleted successfully", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete service", "error");
      }
    } catch (err) {
      console.error("Failed to delete service", err);
      showToast("An error occurred while deleting the service.", "error");
    } finally {
      setDeletingServiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className="font-medium text-gray-500">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Service Management</h1>
          <p className="mt-1 text-gray-500">Monitor and manage all listed services across the platform</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-12 pr-6 shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 md:w-80"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`rounded-2xl border p-3 shadow-sm transition-colors ${
              showFilters
                ? "border-blue-200 bg-blue-50 text-blue-600"
                : "border-gray-100 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cities</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setCityFilter("all");
                setCategoryFilter("all");
              }}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group flex flex-col gap-6 rounded-[2.5rem] border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-gray-200/50 sm:flex-row"
            >
              <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-[2rem] sm:w-48">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-100 via-white to-sky-50">
                    <Briefcase className="h-14 w-14 text-blue-500" />
                  </div>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-600 backdrop-blur-md">
                  Active
                </div>
              </div>

              <div className="flex flex-grow flex-col justify-between py-2">
                <div>
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h3 className="line-clamp-1 text-xl font-black text-gray-900">{service.title}</h3>
                    <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-gray-500">
                      {service.category}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      {service.city}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                      <IndianRupee className="h-4 w-4 text-emerald-500" />
                      {service.priceLabel || (service.price > 0 ? `Rs. ${service.price}` : "Flexible pricing")}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs font-bold text-gray-900">{service.providerName || "Unknown Provider"}</p>
                    <p className="text-[10px] font-medium text-gray-400">{service.providerEmail || "No provider email"}</p>
                    {service.whatsappUrl && <p className="mt-1 text-[10px] font-medium text-green-700">{service.whatsappUrl}</p>}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(service)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(service.id)}
                    disabled={deletingServiceId === service.id}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingServiceId === service.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredServices.length === 0 && (
        <div className="rounded-[2.5rem] border border-gray-100 bg-white py-20 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
            <Briefcase className="h-10 w-10 text-gray-300" />
          </div>
          <p className="font-bold text-gray-500">No services found.</p>
        </div>
      )}

      <AnimatePresence>
        {editingService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">Edit Service</h2>
                  <p className="mt-1 text-sm text-gray-500">Update the service details and save changes directly from admin.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditSave} className="max-h-[80vh] overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Title</label>
                    <input
                      type="text"
                      required
                      value={serviceForm.title}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Category</label>
                    <select
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Cleaning Service">Cleaning Service</option>
                      <option value="Room Setup / Move-in Service">Room Setup / Move-in Service</option>
                      <option value="Tiffin / Food Service">Tiffin / Food Service</option>
                      <option value="Laundry Service">Laundry Service</option>
                      <option value="Appliance Repair Service">Appliance Repair Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Price</label>
                    <input
                      type="number"
                      required
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">City</label>
                    <input
                      type="text"
                      required
                      value={serviceForm.city}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Image URL</label>
                    <input
                      type="text"
                      value={serviceForm.image}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, image: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Highlights</label>
                    <input
                      type="text"
                      value={serviceForm.highlights}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, highlights: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Provider Name</label>
                    <input
                      type="text"
                      value={serviceForm.providerName}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, providerName: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Provider Email</label>
                    <input
                      type="email"
                      value={serviceForm.providerEmail}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, providerEmail: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Provider Phone</label>
                    <input
                      type="text"
                      value={serviceForm.providerPhone}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, providerPhone: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">WhatsApp Link</label>
                    <input
                      type="text"
                      value={serviceForm.whatsappUrl}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, whatsappUrl: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
