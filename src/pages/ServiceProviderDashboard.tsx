import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, Edit3, Mail, MapPin, Phone, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

type ServiceItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  city: string;
  image?: string;
  highlights?: string[];
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
  whatsappUrl?: string;
  createdAt: string;
};

const emptyServiceForm = {
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

function formatServicePrice(category: string, price: number) {
  if (!price || price <= 0) {
    return "Flexible pricing";
  }

  const unit =
    category === "Tiffin / Food Service"
      ? "/plate"
      : category === "Cleaning Service"
        ? "/visit"
        : "/item";

  return `Starting from Rs. ${price}${unit}`;
}

function getWhatsAppHref(whatsappUrl?: string, providerPhone?: string) {
  if (whatsappUrl?.trim()) {
    return whatsappUrl.trim();
  }

  const digits = (providerPhone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }

  return `https://wa.me/${digits}`;
}

export default function ServiceProviderDashboard() {
  const { token, user } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchServices = async () => {
      try {
        const res = await fetch("/api/services/mine", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setServices(data.services || []);
        } else {
          setToast({ message: data.error || "Failed to load your services", type: "error" });
        }
      } catch (err) {
        console.error("Failed to fetch provider services", err);
        setToast({ message: "Failed to load your services", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [token]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const stats = useMemo(() => {
    const pricedServices = services.filter((service) => service.price > 0);
    const averagePrice = pricedServices.length
      ? Math.round(pricedServices.reduce((sum, service) => sum + service.price, 0) / pricedServices.length)
      : 0;

    return {
      totalServices: services.length,
      categories: new Set(services.map((service) => service.category)).size,
      cities: new Set(services.map((service) => service.city)).size,
      averagePrice,
    };
  }, [services]);

  const resetForm = () => {
    setServiceForm(emptyServiceForm);
    setEditingServiceId(null);
  };

  const handleEdit = (service: ServiceItem) => {
    setShowForm(true);
    setEditingServiceId(service.id);
    setServiceForm({
      title: service.title,
      description: service.description,
      category: service.category,
      price: String(service.price || ""),
      city: service.city,
      image: service.image || "",
      highlights: (service.highlights || []).join(", "),
      providerName: service.providerName || "",
      providerEmail: service.providerEmail || "",
      providerPhone: service.providerPhone || "",
      whatsappUrl: service.whatsappUrl || "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm("Delete this service listing?")) {
      return;
    }

    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || "Failed to delete service", type: "error" });
        return;
      }

      setServices((current) => current.filter((service) => service.id !== id));
      setToast({ message: "Service deleted successfully", type: "success" });
      if (editingServiceId === id) {
        resetForm();
        setShowForm(false);
      }
    } catch (err) {
      console.error("Failed to delete service", err);
      setToast({ message: "Failed to delete service", type: "error" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: serviceForm.title,
        description: serviceForm.description,
        category: serviceForm.category,
        price: Number(serviceForm.price) || 0,
        city: serviceForm.city,
        image: serviceForm.image.trim() || null,
        highlights: serviceForm.highlights
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        providerName: serviceForm.providerName.trim() || user?.name || null,
        providerEmail: serviceForm.providerEmail.trim() || user?.email || null,
        providerPhone: serviceForm.providerPhone.trim() || user?.phone || null,
        whatsappUrl: serviceForm.whatsappUrl.trim() || null,
      };

      const isEditing = Boolean(editingServiceId);
      const res = await fetch(isEditing ? `/api/services/${editingServiceId}` : "/api/services", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.error || "Failed to save service", type: "error" });
        return;
      }

      if (isEditing) {
        setServices((current) =>
          current.map((service) =>
            service.id === editingServiceId
              ? {
                  ...service,
                  ...payload,
                  image: payload.image || undefined,
                  providerName: payload.providerName || undefined,
                  providerEmail: payload.providerEmail || undefined,
                  providerPhone: payload.providerPhone || undefined,
                  whatsappUrl: payload.whatsappUrl || undefined,
                }
              : service
          )
        );
        setToast({ message: "Service updated successfully", type: "success" });
      } else {
        setServices((current) => [
          {
            id: data.id,
            ...payload,
            image: payload.image || undefined,
            providerName: payload.providerName || undefined,
            providerEmail: payload.providerEmail || undefined,
            providerPhone: payload.providerPhone || undefined,
            whatsappUrl: payload.whatsappUrl || undefined,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
        setToast({ message: "Service created successfully", type: "success" });
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save service", err);
      setToast({ message: "Failed to save service", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role && !["service_provider", "admin"].includes(user.role)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-[2rem] border border-amber-100 bg-amber-50 p-8">
          <h1 className="text-2xl font-black text-gray-900">Service provider access only</h1>
          <p className="mt-3 text-gray-600">Create a service-provider account to manage service listings from this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8 rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
              <Briefcase className="h-4 w-4" />
              Service Provider Dashboard
            </div>
            <h1 className="mt-4 text-3xl font-black text-gray-900">Manage your service listings like an owner manages rooms.</h1>
            <p className="mt-3 text-gray-600">
              Add local services, keep provider contact details updated, and maintain a clean service catalog for users.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((prev) => !prev);
              if (showForm) {
                resetForm();
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            {showForm ? "Hide Form" : "Add New Service"}
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Live Services</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{stats.totalServices}</p>
        </div>
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Categories</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{stats.categories}</p>
        </div>
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Cities Covered</p>
          <p className="mt-3 text-3xl font-black text-gray-900">{stats.cities}</p>
        </div>
        <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-gray-400">Average Price</p>
          <p className="mt-3 text-3xl font-black text-gray-900">Rs. {stats.averagePrice}</p>
        </div>
      </div>

      {showForm && (
        <div className="mb-8 rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-black text-gray-900">
            {editingServiceId ? "Edit Service" : "Add New Service"}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Service Title</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.title}
                onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.category}
                onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
              >
                <option value="Cleaning Service">Cleaning Service</option>
                <option value="Room Setup / Move-in Service">Room Setup / Move-in Service</option>
                <option value="Tiffin / Food Service">Tiffin / Food Service</option>
                <option value="Laundry Service">Laundry Service</option>
                <option value="Appliance Repair Service">Appliance Repair Service</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                required
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price</label>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.price}
                onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.city}
                onChange={(e) => setServiceForm({ ...serviceForm, city: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Image URL</label>
              <input
                type="text"
                placeholder="https://example.com/service.jpg"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.image}
                onChange={(e) => setServiceForm({ ...serviceForm, image: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Highlights (comma separated)</label>
              <input
                type="text"
                placeholder="Same-day visit, WhatsApp support, Deep cleaning"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.highlights}
                onChange={(e) => setServiceForm({ ...serviceForm, highlights: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Provider Name</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.providerName}
                onChange={(e) => setServiceForm({ ...serviceForm, providerName: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Provider Phone</label>
              <input
                type="text"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.providerPhone}
                onChange={(e) => setServiceForm({ ...serviceForm, providerPhone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Provider Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.providerEmail}
                onChange={(e) => setServiceForm({ ...serviceForm, providerEmail: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">WhatsApp Link</label>
              <input
                type="text"
                placeholder="https://wa.me/919876543210"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={serviceForm.whatsappUrl}
                onChange={(e) => setServiceForm({ ...serviceForm, whatsappUrl: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : editingServiceId ? "Update Service" : "Save Service"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-gray-900">My Services</h2>
            <p className="mt-1 text-sm text-gray-500">Your active provider listings and contact-ready cards.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading your services...</div>
        ) : services.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50 px-6 py-14 text-center">
            <Briefcase className="mx-auto h-14 w-14 text-gray-300" />
            <h3 className="mt-4 text-xl font-bold text-gray-900">No services listed yet</h3>
            <p className="mt-2 text-gray-500">Create your first service to show up in the marketplace.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {services.map((service) => (
              <div key={service.id} className="overflow-hidden rounded-[1.75rem] border border-gray-100 bg-white shadow-sm">
                {service.image && (
                  <img src={service.image} alt={service.title} className="h-52 w-full object-cover" referrerPolicy="no-referrer" />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">{service.category}</p>
                      <h3 className="mt-2 text-2xl font-black text-gray-900">{service.title}</h3>
                    </div>
                    <div className="rounded-2xl bg-blue-50 px-3 py-2 text-right text-sm font-bold text-blue-700">
                      {formatServicePrice(service.category, service.price)}
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-gray-600">{service.description}</p>

                  {!!service.highlights?.length && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {service.highlights.map((highlight) => (
                        <span key={highlight} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {highlight}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 space-y-2 text-sm text-gray-600">
                    <div className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      {service.city}
                    </div>
                    {service.providerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        {service.providerPhone}
                      </div>
                    )}
                    {service.providerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        {service.providerEmail}
                      </div>
                    )}
                    {getWhatsAppHref(service.whatsappUrl, service.providerPhone) && (
                      <a
                        href={getWhatsAppHref(service.whatsappUrl, service.providerPhone)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-green-700 hover:text-green-800"
                      >
                        <Phone className="h-4 w-4 text-green-600" />
                        WhatsApp link
                      </a>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3 border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      onClick={() => handleEdit(service)}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(service.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
