import { useEffect, useState } from "react";
import { Trash2, ShieldOff, ShieldCheck, Search, Filter, MoreVertical, Mail, Phone, Calendar, Loader2, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  idDocument?: string | null;
  createdAt: string;
}

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "owner" | "service_provider">("all");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "pending">("all");
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        setToast({ message: "Failed to load users", type: "error" });
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      setToast({ message: "Failed to load users", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesVerification =
      verificationFilter === "all" ||
      (verificationFilter === "verified" && Boolean(user.isVerified)) ||
      (verificationFilter === "pending" && !user.isVerified);

    return matchesSearch && matchesRole && matchesVerification;
  });
  
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };
  
  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This will remove all their data.")) return;
    try {
      setActionUserId(id);
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers((prevUsers) => prevUsers.filter((user) => user.id !== id));
        if (selectedUser?.id === id) {
          setSelectedUser(null);
        }
        showToast("User deleted successfully", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete user", "error");
      }
    } catch (err) {
      console.error("Failed to delete user", err);
      showToast("Failed to delete user", "error");
    } finally {
      setActionUserId(null);
    }
  };

  const roleCycle: Record<string, "user" | "owner" | "service_provider"> = {
    user: "owner",
    owner: "service_provider",
    service_provider: "user",
  };

  const handleToggleRole = async (id: string, currentRole: string) => {
    const newRole = roleCycle[currentRole] || "user";
    try {
      setActionUserId(id);
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers((prevUsers) => prevUsers.map((user) => (user.id === id ? { ...user, role: newRole } : user)));
        setSelectedUser((prevUser) => (prevUser?.id === id ? { ...prevUser, role: newRole } : prevUser));
        showToast(`User role updated to ${newRole}`, "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update user role", "error");
      }
    } catch (err) {
      console.error("Failed to update user role", err);
      showToast("Failed to update user role", "error");
    } finally {
      setActionUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading users...</p>
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage platform users and their permissions</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl w-full md:w-80 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className={`p-3 rounded-2xl transition-colors shadow-sm border ${
              showFilters
                ? "bg-blue-50 border-blue-200 text-blue-600"
                : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 gap-4 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Role</label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as "all" | "user" | "owner" | "service_provider")}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="owner">Owners</option>
              <option value="service_provider">Service Providers</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400">Verification</label>
            <select
              value={verificationFilter}
              onChange={(event) =>
                setVerificationFilter(event.target.value as "all" | "verified" | "pending")
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setRoleFilter("all");
                setVerificationFilter("all");
              }}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Uploaded Document</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest">Joined</th>
                <th className="px-8 py-6 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-[#F8FAFC] transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 flex items-center justify-center text-blue-600 font-bold text-lg border border-blue-100">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-sm font-medium text-gray-400 capitalize">{user.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        user.isVerified 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-amber-50 text-amber-600"
                      }`}>
                        {user.isVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {user.idDocument ? (
                        <button
                          type="button"
                          onClick={() => setPreviewDocument(user.idDocument || null)}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          View Upload
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">Not uploaded</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                        <Calendar className="h-4 w-4 text-gray-300" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleRole(user.id, user.role)}
                          disabled={actionUserId === user.id}
                          className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                          title={`Switch to ${roleCycle[user.role] || "User"}`}
                        >
                          {user.role === "user" ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionUserId === user.id}
                          className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                          title="Delete User"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 transition-all shadow-sm"
                          title="View User Details"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold">No users found matching your search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {previewDocument && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/70 p-4 backdrop-blur-sm"
            onClick={() => setPreviewDocument(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="relative w-full max-w-4xl rounded-[2rem] bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="absolute right-4 top-4 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={previewDocument}
                alt="Uploaded document preview"
                className="max-h-[80vh] w-full rounded-[1.5rem] object-contain"
              />
            </motion.div>
          </motion.div>
        )}

        {selectedUser && (
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
              className="w-full max-w-xl rounded-[2rem] border border-gray-100 bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedUser.name}</h2>
                  <p className="mt-1 text-sm text-gray-500">User details and quick admin actions</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="rounded-xl border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Email</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedUser.email}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Phone</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">{selectedUser.phone || "Not provided"}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Role</p>
                    <p className="mt-2 text-sm font-semibold capitalize text-gray-900">{selectedUser.role}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Verification</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {selectedUser.isVerified ? "Verified" : "Pending"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Joined</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggleRole(selectedUser.id, selectedUser.role)}
                    disabled={actionUserId === selectedUser.id}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60"
                  >
                    Switch to {roleCycle[selectedUser.role] || "User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUser.id)}
                    disabled={actionUserId === selectedUser.id}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
