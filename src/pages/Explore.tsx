import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, Heart, Star, Search, Filter, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const getRoomPriceText = (room: any) =>
  room.priceLabel ||
  (room.price > 0
    ? `Rs. ${room.billingPeriod === "night" ? room.price : Math.max(1, Math.round(room.price / 30))}/${room.billingPeriod === "night" ? "night" : "day"}`
    : "Check source");

export default function Explore() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/rooms");
        if (res.ok) {
          const data = await res.json();
          setRooms(data.rooms || []);
        }
      } catch (err) {
        console.error("Failed to fetch rooms", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         room.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-60 scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-white"></div>
        </div>

        <div className="relative z-10 max-w-4xl w-full px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
          >
            Find Your <span className="text-blue-400">Perfect</span> Space
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto font-medium"
          >
            Explore the best bachelor-friendly rooms, PGs, and apartments in top cities.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl flex flex-col md:flex-row gap-2"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by city, area or room name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 text-white placeholder-gray-400 pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all border-none"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
              <Filter className="h-5 w-5" />
              Find Now
            </button>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Featured Listings</h2>
            <p className="text-gray-500 mt-1">Handpicked spaces for your lifestyle</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-50 rounded-3xl h-[450px] animate-pulse border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredRooms.map((room, index) => (
                <motion.div
                  layout
                  key={room.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-600/5 transition-all flex flex-col h-full"
                >
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={room.images?.[0] || `https://picsum.photos/seed/${room.id}/800/600`}
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4">
                      <button className="p-3 bg-white/80 backdrop-blur-md rounded-full text-gray-400 hover:text-red-500 transition-colors shadow-sm">
                        <Heart className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4 flex gap-2">
                      <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-lg">
                        ₹{room.price}/mo
                      </span>
                      {room.rating && (
                        <span className="bg-white/90 backdrop-blur-md text-gray-900 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          {room.rating}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center text-sm text-blue-600 mb-3 font-bold uppercase tracking-wider">
                      <MapPin className="h-4 w-4 mr-1.5" />
                      {room.location}, {room.city}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-1">
                      {room.title}
                    </h3>
                    <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed">
                      {room.description || "Experience premium living with all modern amenities included. Perfect for students and working professionals."}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 overflow-hidden">
                            <img src={`https://i.pravatar.cc/100?u=${room.id + i}`} alt="User" />
                          </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          +12
                        </div>
                      </div>
                      <Link
                        to={`/rooms/${room.id}`}
                        className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center gap-2"
                      >
                        Details <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredRooms.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No rooms found</h3>
            <p className="text-gray-500">Try adjusting your search or category filters.</p>
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      {/* Newsletter / CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              Ready to find your next home?
            </h2>
            <p className="text-blue-100 text-xl mb-10 max-w-2xl mx-auto">
              Join 5,000+ bachelors who found their perfect living space through BachelorRooms.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="bg-white text-blue-600 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all shadow-xl shadow-black/10">
                Get Started Now
              </Link>
              <Link to="/rooms" className="bg-blue-700 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-800 transition-all border border-blue-500">
                Browse All Rooms
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
