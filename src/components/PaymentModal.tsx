import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  platformFee: number;
  ownerAmount: number;
  onSuccess: (response: any) => void;
  roomId: string;
  token: string | null;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  platformFee,
  ownerAmount,
  onSuccess,
  roomId,
  token
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomId, amount })
      });

      if (!res.ok) throw new Error('Failed to create order');
      const orderData = await res.json();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'BachelorRooms',
        description: 'Room Booking Payment',
        order_id: orderData.orderId,
        handler: function (response: any) {
          onSuccess(response);
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#2563eb'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Payment initialization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Payment Summary</h2>
            <p className="text-sm text-gray-500">Complete your booking payment in the checkout window.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 transition-colors hover:bg-white hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between text-gray-600">
              <span className="font-medium">Room Rent</span>
              <span className="font-bold text-gray-900">Rs. {ownerAmount}</span>
            </div>
            <div className="flex items-center justify-between text-gray-600">
              <span className="font-medium">Platform Fee (3%)</span>
              <span className="font-bold text-gray-900">Rs. {platformFee}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
              <span className="text-lg font-bold text-gray-900">Total Amount</span>
              <span className="text-2xl font-extrabold text-blue-600">Rs. {amount}</span>
            </div>
          </div>

          <div className="mb-8 flex items-start rounded-2xl bg-blue-50 p-4">
            <ShieldCheck className="mr-3 mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <p className="text-xs font-medium leading-relaxed text-blue-700">
              Your payment is secure. We use industry-standard encryption to protect your transaction details.
            </p>
          </div>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>Pay Now Rs. {amount}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
