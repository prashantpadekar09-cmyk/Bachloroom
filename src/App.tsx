/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AdminLayout from "./components/AdminLayout";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const RoomListing = lazy(() => import("./pages/RoomListing"));
const RoomDetail = lazy(() => import("./pages/RoomDetail"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const OwnerDashboard = lazy(() => import("./pages/OwnerDashboard"));
const ServiceProviderDashboard = lazy(() => import("./pages/ServiceProviderDashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const ServicesMarketplace = lazy(() => import("./pages/ServicesMarketplacePage"));
const Explore = lazy(() => import("./pages/Explore"));
const PremiumPayment = lazy(() => import("./pages/PremiumPayment"));
const SupportInbox = lazy(() => import("./pages/SupportInbox"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboardPremium"));
const AdminVerifications = lazy(() => import("./pages/AdminVerifications"));
const AdminRooms = lazy(() => import("./pages/AdminRooms"));
const AdminServices = lazy(() => import("./pages/AdminServices"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminBookings = lazy(() => import("./pages/AdminBookings"));
const AdminReviews = lazy(() => import("./pages/AdminReviews"));
const AdminMessages = lazy(() => import("./pages/AdminMessages"));
const AdminPayouts = lazy(() => import("./pages/AdminPayouts"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 py-16">
      <div className="rounded-3xl border border-white/70 bg-white/85 px-6 py-5 text-center shadow-sm backdrop-blur-md">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600" />
        <p className="text-sm font-semibold text-gray-700">Loading page...</p>
      </div>
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const hideSharedNavbar =
    location.pathname === "/dashboard" || location.pathname.startsWith("/admin");

  return (
    <div className="site-shell">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_50%,#f8fafc_100%)]" />
        <div className="ambient-grid absolute inset-0 opacity-30" />
        <div className="absolute left-[-5rem] top-0 h-72 w-72 rounded-full bg-sky-200/45 blur-[110px]" />
        <div className="absolute right-[-8rem] top-12 h-[24rem] w-[24rem] rounded-full bg-cyan-200/35 blur-[120px]" />
        <div className="absolute bottom-[-6rem] left-1/4 h-72 w-72 rounded-full bg-indigo-200/35 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {!hideSharedNavbar && <Navbar />}
        <main className={`flex-grow ${hideSharedNavbar ? "" : "pb-24 lg:pb-0"}`}>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/rooms" element={<RoomListing />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />
              <Route path="/services" element={<ServicesMarketplace />} />
              <Route path="/premium-payment" element={<PremiumPayment />} />
              <Route path="/support" element={<SupportInbox />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/owner-dashboard" element={<OwnerDashboard />} />
              <Route path="/service-provider-dashboard" element={<ServiceProviderDashboard />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="rooms" element={<AdminRooms />} />
                <Route path="services" element={<AdminServices />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="reviews" element={<AdminReviews />} />
                <Route path="payouts" element={<AdminPayouts />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:userId" element={<Chat />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}
