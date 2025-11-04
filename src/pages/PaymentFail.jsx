import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function PaymentFail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');
  const invoiceId = searchParams.get('invoiceId');
  const reason = searchParams.get('reason') || 'Payment was cancelled or failed.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-700">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm-1-6h2v2h-2v-2Zm0-8h2v6h-2V8Z" fill="currentColor"/>
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] mb-2">Payment not completed</h1>
        <p className="text-[#475569] mb-6">{reason}</p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left mb-6">
          <h2 className="text-red-900 font-semibold mb-1">Details</h2>
          <div className="text-red-800 text-sm grid grid-cols-1 sm:grid-cols-2 gap-y-1">
            {bookingId && (
              <div><span className="font-medium">Booking ID: </span><span>{bookingId}</span></div>
            )}
            {invoiceId && (
              <div><span className="font-medium">Invoice ID: </span><span>{invoiceId}</span></div>
            )}
            {!bookingId && !invoiceId && (
              <div className="col-span-2">No reference details provided.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/Invoices')}
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-[#0f172a] hover:bg-black text-white font-semibold"
          >
            Go to Invoices
          </button>
          <button
            onClick={() => navigate('/Dashboard')}
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-white border border-gray-300 text-[#0f172a] hover:bg-gray-50 font-semibold"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}


