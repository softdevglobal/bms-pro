import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchBookingById } from '../services/bookingService';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const invoiceId = searchParams.get('invoiceId');
  const initialBookingCode = searchParams.get('bookingCode');
  const [bookingCode, setBookingCode] = useState(initialBookingCode || '');

  useEffect(() => {
    let isActive = true;
    const loadBookingCode = async () => {
      if (!bookingCode && bookingId) {
        try {
          const result = await fetchBookingById(bookingId);
          if (isActive && result && result.bookingCode) {
            setBookingCode(result.bookingCode);
          }
        } catch (e) {
          // Swallow error; fallback is to simply not show booking reference
        }
      }
    };
    loadBookingCode();
    return () => {
      isActive = false;
    };
  }, [bookingId, bookingCode]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-700">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm-1.293-6.707 6-6-1.414-1.414L10.5 12.672 8.707 10.879l-1.414 1.414 2.5 2.5a1 1 0 0 0 1.414 0Z" fill="currentColor"/>
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] mb-2">Thank you for your payment</h1>
        <p className="text-[#475569] mb-6">Your payment has been processed successfully.</p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left mb-6">
          <h2 className="text-green-900 font-semibold mb-1">Payment details</h2>
          <div className="text-green-800 text-sm grid grid-cols-1 sm:grid-cols-2 gap-y-1">
            {bookingCode && (
              <div><span className="font-medium">Booking Reference: </span><span>{bookingCode}</span></div>
            )}
            {invoiceId && (
              <div><span className="font-medium">Invoice ID: </span><span>{invoiceId}</span></div>
            )}
            {!bookingCode && !invoiceId && (
              <div className="col-span-2">No reference details provided.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


