import { useState } from "react";
import { Save, Shield, Globe, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminSettings() {
  const [websiteName, setWebsiteName] = useState("BachelorRooms");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Admin Settings</h1>
        <p className="text-gray-500 mt-1">Configure platform-wide preferences and security</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Website Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100">
              <Globe className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Platform Identity</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Website Name</label>
              <input 
                type="text" 
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Support Email</label>
              <input 
                type="email" 
                defaultValue="support@bachelorrooms.com"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700"
              />
            </div>

            <button 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {success ? "Settings Saved!" : "Save Changes"}
            </button>
          </form>
        </motion.div>

        {/* Password Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-black text-gray-900">Security</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">New Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-bold text-gray-700"
              />
            </div>

            <button 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl hover:bg-black transition-all font-black uppercase tracking-widest text-xs shadow-lg shadow-gray-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Update Security
            </button>
          </form>
        </motion.div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-bold">Settings updated successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
