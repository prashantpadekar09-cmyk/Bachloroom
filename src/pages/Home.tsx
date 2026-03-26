import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Home as HomeIcon, Star, Sparkles, Building, Users, Coffee, Bed, ShieldCheck, Clock, CreditCard } from "lucide-react";
import { motion } from "motion/react";

export default function Home() {
  const [city, setCity] = useState("");
  const [budget, setBudget] = useState("");
  const [roomType, setRoomType] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.append("city", city);
    if (budget) params.append("maxPrice", budget);
    if (roomType) params.append("type", roomType);
    navigate(`/rooms?${params.toString()}`);
  };

  const popularCities = [
    { name: "Mumbai", image: "https://picsum.photos/seed/mumbai/400/300" },
    { name: "Pune", image: "https://picsum.photos/seed/pune/400/300" },
    { name: "Nashik", image: "https://picsum.photos/seed/nashik/400/300" },
    { name: "Goa", image: "https://picsum.photos/seed/goa/400/300" }
  ];

  const categories = [
    { name: "Single Room", icon: <Bed className="w-8 h-8 mb-4 text-blue-600" /> },
    { name: "Shared Room", icon: <Users className="w-8 h-8 mb-4 text-blue-600" /> },
    { name: "PG Accommodation", icon: <Coffee className="w-8 h-8 mb-4 text-blue-600" /> },
    { name: "Hostel", icon: <Building className="w-8 h-8 mb-4 text-blue-600" /> }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col min-h-screen bg-transparent"
    >
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img
            src="https://picsum.photos/seed/modernroom/1920/1080?blur=2"
            alt="Modern Room"
            className="w-full h-full object-cover opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/40 to-white" />
        </div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white mb-8"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium tracking-wide">The #1 Platform for Bachelors</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-6 tracking-tight drop-shadow-2xl"
          >
            Find Your Perfect <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Bachelor Pad
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-2xl text-gray-200 mb-12 font-medium max-w-3xl mx-auto drop-shadow-md"
          >
            Discover premium PGs, shared rooms, and hostels tailored for your lifestyle. Zero hassle, 100% verified.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="bg-white/95 backdrop-blur-xl p-3 md:p-4 rounded-3xl shadow-2xl max-w-4xl mx-auto border border-white/50"
          >
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Where do you want to live?"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                <input
                  type="number"
                  placeholder="Max Budget"
                  className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <select
                  className="w-full px-4 py-4 bg-gray-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-700 appearance-none"
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                >
                  <option value="">Any Room Type</option>
                  {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center"
              >
                <Search className="w-5 h-5 mr-2" />
                Search
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Why Choose BachelorRooms?</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">We make finding your next home as simple as ordering food online.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: <ShieldCheck className="w-10 h-10 text-emerald-500" />, title: "100% Verified Listings", desc: "Every property is physically verified by our team to ensure zero fraud and complete transparency." },
              { icon: <Clock className="w-10 h-10 text-blue-500" />, title: "Instant Booking", desc: "Skip the endless calls. Schedule a visit or book your room instantly through our platform." },
              { icon: <CreditCard className="w-10 h-10 text-purple-500" />, title: "Zero Brokerage", desc: "Connect directly with property owners and save thousands on unnecessary brokerage fees." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="bg-gray-50 rounded-3xl p-8 border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Explore Categories</h2>
            <p className="text-gray-500">Find the perfect living arrangement for your lifestyle</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/rooms?type=${category.name}`)}
              className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all cursor-pointer group flex flex-col items-center text-center hover:-translate-y-1"
            >
              <div className="p-4 bg-blue-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                {React.cloneElement(category.icon, { className: "w-8 h-8 text-blue-600 group-hover:text-white transition-colors" })}
              </div>
              <h3 className="mt-6 font-semibold text-gray-900">{category.name}</h3>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trending Locations */}
      <section className="py-20 bg-white/45 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Trending Locations</h2>
          <p className="text-gray-500 mb-10">Most popular cities for bachelors right now</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularCities.map((city, index) => (
              <motion.div
                key={city.name}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/rooms?city=${city.name}`)}
                className="relative h-72 rounded-3xl overflow-hidden cursor-pointer group shadow-sm hover:shadow-xl"
              >
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <h3 className="text-2xl font-bold text-white mb-1">{city.name}</h3>
                  <p className="text-white/80 text-sm font-medium">Explore rooms →</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-blue-600 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-700 rounded-full blur-3xl opacity-50" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">Are you a property owner?</h2>
            <p className="text-xl text-blue-100 mb-10">
              List your property on BachelorRooms and reach thousands of verified tenants looking for a place like yours.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:shadow-xl hover:-translate-y-1"
            >
              List Your Property
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
