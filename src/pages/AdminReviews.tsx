import { useState, useEffect } from "react";
import { Trash2, Star, Loader2, AlertCircle, Search, Filter, MessageSquare, User, Home, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AdminPageHero, AdminSurface } from "../components/admin/AdminTheme";

interface Review {
  id: string;
  userId: string;
  roomId: string;
  userName: string;
  roomTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/reviews", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch reviews");
      const data = await response.json();
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete review");
      
      setReviews(reviews.filter(r => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete review");
    }
  };

  const filteredReviews = reviews.filter(review => 
    review.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    review.roomTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (review.comment && review.comment.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        <p className="text-gray-500 font-medium">Loading reviews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 text-rose-700 p-6 rounded-[2rem] border border-rose-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-600 shadow-sm border border-rose-100">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <p className="font-black">Error loading reviews</p>
          <p className="text-sm font-medium opacity-80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHero
        eyebrow="Ratings & Feedback"
        title="Review Management"
        description="Moderate reviews, watch sentiment, and keep listing quality high."
        badge={`${filteredReviews.length} reviews`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/65" />
            <input 
              type="text"
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/15 bg-white/10 py-3 pl-12 pr-6 text-white placeholder:text-white/60 outline-none backdrop-blur-md transition focus:border-white/30 md:w-80"
            />
          </div>
          <button className="rounded-2xl border border-white/15 bg-white/10 p-3 text-white/90 backdrop-blur-md transition hover:bg-white/15">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </AdminPageHero>
      
      {filteredReviews.length === 0 ? (
        <AdminSurface className="py-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="h-10 w-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold">No reviews found.</p>
        </AdminSurface>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReviews.map((review) => (
              <motion.div 
                key={review.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-all duration-300 group hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-lg border border-blue-100">
                      {review.userName[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900">{review.userName}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`h-3 w-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(review.id)}
                    className="p-3 text-rose-600 hover:bg-rose-50 rounded-2xl transition-colors opacity-0 group-hover:opacity-100" 
                    title="Delete Review"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Home className="h-3.5 w-3.5" />
                    <span className="line-clamp-1">{review.roomTitle}</span>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 relative">
                    <MessageSquare className="absolute -top-2 -right-2 h-8 w-8 text-gray-200 opacity-50" />
                    <p className="text-sm text-gray-600 leading-relaxed font-medium italic">
                      "{review.comment || "No comment provided."}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                    <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100">
                      {review.rating} Stars
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
