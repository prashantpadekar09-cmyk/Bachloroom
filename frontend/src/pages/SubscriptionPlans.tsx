import React, { useState } from "react";
import { Check, Star, Zap, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SubscriptionPlans() {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubscribe = async (plan: string) => {
    if (!user) {
      navigate("/login");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/users/subscription", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      if (res.ok) {
        setMessage(`Successfully subscribed to ${plan} plan!`);
        updateUser({ subscriptionPlan: plan });
      } else {
        setMessage("Failed to update subscription.");
      }
    } catch (err) {
      setMessage("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "0",
      description: "Basic features for casual users.",
      icon: <Shield className="h-8 w-8 text-gray-400" />,
      features: [
        "Browse room listings",
        "Basic search filters",
        "Contact owners",
      ],
      color: "gray",
    },
    {
      name: "Pro",
      price: "499",
      description: "Advanced features for serious seekers.",
      icon: <Star className="h-8 w-8 text-amber-500" />,
      features: [
        "Everything in Free",
        "AI Rent Prediction",
        "Priority support",
        "No ads",
      ],
      color: "amber",
      popular: true,
    },
    {
      name: "Premium",
      price: "999",
      description: "Ultimate tools for owners and power users.",
      icon: <Zap className="h-8 w-8 text-purple-500" />,
      features: [
        "Everything in Pro",
        "Featured listings (Owners)",
        "Advanced analytics",
        "Dedicated account manager",
      ],
      color: "purple",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-500">
          Unlock premium features to find your perfect room faster or manage your properties better.
        </p>
      </div>

      {message && (
        <div className={`mb-8 p-4 rounded-xl text-center font-medium ${message.includes("Success") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-3xl p-8 border-2 relative flex flex-col ${
              plan.popular ? "border-amber-500 shadow-xl shadow-amber-900/10" : "border-slate-100 shadow-sm"
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                Most Popular
              </div>
            )}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 text-sm mt-1">{plan.description}</p>
              </div>
              <div className={`p-3 rounded-2xl bg-${plan.color}-50`}>
                {plan.icon}
              </div>
            </div>
            <div className="mb-8">
              <span className="text-4xl font-extrabold text-gray-900">₹{plan.price}</span>
              <span className="text-gray-500 font-medium">/month</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className={`h-5 w-5 mr-3 flex-shrink-0 text-${plan.color}-500`} />
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe(plan.name.toLowerCase())}
              disabled={loading || (user && user.subscriptionPlan === plan.name.toLowerCase())}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-colors ${
                user && user.subscriptionPlan === plan.name.toLowerCase()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : plan.popular
                  ? "bg-[linear-gradient(135deg,#2b1c12_0%,#8a6431_100%)] text-[#f8e7bf] hover:brightness-110 shadow-lg shadow-amber-900/10"
                  : "bg-slate-900 hover:bg-black text-white"
              }`}
            >
              {user && user.subscriptionPlan === plan.name.toLowerCase()
                ? "Current Plan"
                : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
