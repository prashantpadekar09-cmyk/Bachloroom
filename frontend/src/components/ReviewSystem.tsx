import React, { useState, useEffect } from "react";
import { Star, Trash2, Edit2, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewSystemProps {
  roomId: string;
  onRatingUpdate?: (avg: number, total: number) => void;
}

export default function ReviewSystem({ roomId, onRatingUpdate }: ReviewSystemProps) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [error, setError] = useState("");

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/${roomId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews);
        if (onRatingUpdate) {
          onRatingUpdate(data.averageRating, data.totalReviews);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reviews", err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please login to submit a review");
      return;
    }
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const url = editingReview ? `/api/reviews/${editingReview.id}` : "/api/reviews";
      const method = editingReview ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, rating, comment }),
      });

      if (res.ok) {
        setRating(0);
        setComment("");
        setEditingReview(null);
        fetchReviews();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit review");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;

    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        fetchReviews();
      }
    } catch (err) {
      console.error("Failed to delete review", err);
    }
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setRating(review.rating);
    setComment(review.comment);
    window.scrollTo({ top: document.getElementById("review-form")?.offsetTop ? document.getElementById("review-form")!.offsetTop - 100 : 0, behavior: "smooth" });
  };

  const userHasReviewed = reviews.some((r) => r.userId === user?.id);

  return (
    <div className="mt-12 space-y-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Reviews & Ratings</h2>
      </div>

      {/* Review Form */}
      <div id="review-form" className="bg-gray-50 rounded-3xl p-6 md:p-8">
        {!user ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">Please login to share your experience</p>
            <a href="/login" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors">
              Login Now
            </a>
          </div>
        ) : userHasReviewed && !editingReview ? (
          <div className="text-center py-4">
            <p className="text-gray-600">You have already reviewed this room. Thank you for your feedback!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">
              {editingReview ? "Edit your review" : "Rate your stay"}
            </h3>
            
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hover || rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-gray-500">
                {rating > 0 ? `${rating} Stars` : "Select Rating"}
              </span>
            </div>

            <div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your review here (optional)..."
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[120px]"
              />
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? "Submitting..." : editingReview ? "Update Review" : "Submit Review"}
                <Send className="h-4 w-4" />
              </button>
              {editingReview && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingReview(null);
                    setRating(0);
                    setComment("");
                  }}
                  className="px-6 bg-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Review List */}
      <div className="space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <motion.div
              layout
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                    {review.userName[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{review.userName}</h4>
                    <p className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-bold text-yellow-700">{review.rating}</span>
                </div>
              </div>
              
              <p className="text-gray-600 leading-relaxed mb-4">{review.comment}</p>

              {(user?.id === review.userId || user?.role === "admin") && (
                <div className="flex gap-4 pt-4 border-t border-gray-50">
                  <button
                    onClick={() => handleEdit(review)}
                    className="flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4 mr-1" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="flex items-center text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
