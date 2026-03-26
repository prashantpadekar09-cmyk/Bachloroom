import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { CheckCircle, XCircle, FileText, Loader2, ShieldCheck, X, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminVerifications() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDocument, setPreviewDocument] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/admin/users/pending-verification", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch users", err);
      } finally {
        setLoading(false);
      }
    };
    if (token && user?.role === "admin") {
      fetchUsers();
    }
  }, [token, user]);

  const handleVerify = async (userId: string, status: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isVerified: status }),
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error("Failed to verify user", err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isPdfPreview = previewDocument?.startsWith("data:application/pdf");

  if (user?.role !== "admin") {
    return (
      <div className="p-12 text-center bg-rose-50 text-rose-600 rounded-[2.5rem] border border-rose-100 font-black uppercase tracking-widest">
        Access Denied. Admin only.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading verifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Pending Verifications</h1>
          <p className="text-gray-500 mt-1">Review and approve user identity documents</p>
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
          <button className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors shadow-sm">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {filteredUsers.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold">No pending verifications found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Role</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Document</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((u) => (
                    <motion.tr 
                      key={u.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm border border-blue-100">
                            {u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{u.name}</p>
                            <p className="text-xs font-medium text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-gray-200">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        {u.idDocument ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDocument(u.idDocument)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                          >
                            <FileText className="h-4 w-4" />
                            View ID
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs font-bold italic">No Document</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleVerify(u.id, true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-emerald-100"
                          >
                            <CheckCircle className="h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleVerify(u.id, false)}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-rose-100"
                          >
                            <XCircle className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              className="relative w-full max-w-5xl rounded-[2rem] bg-white p-4 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="absolute right-4 top-4 z-10 rounded-xl border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>

              {isPdfPreview ? (
                <iframe
                  src={previewDocument}
                  title="Pending verification document"
                  className="h-[80vh] w-full rounded-[1.5rem] border border-gray-100"
                />
              ) : (
                <img
                  src={previewDocument}
                  alt="Pending verification document"
                  className="max-h-[80vh] w-full rounded-[1.5rem] object-contain"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
