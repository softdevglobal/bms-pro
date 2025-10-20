import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProfilePicture from '@/components/ui/ProfilePicture';
import {
  Plus,
  Calendar,
  Filter,
  Users,
  Clock,
  DollarSign,
  FileWarning,
  BarChart2,
  List,
  Loader2,
} from 'lucide-react';
import KpiCard from '../components/dashboard/KpiCard';
import TodaySchedule from '../components/dashboard/TodaySchedule';
import PaymentsDue from '../components/dashboard/PaymentsDue';
import { downloadInvoicePDF } from '@/services/invoiceService';
import HoldsExpiring from '../components/dashboard/HoldsExpiring';
import AlertsTasks from '../components/dashboard/AlertsTasks';
import RecentActivity from '../components/dashboard/RecentActivity';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardData } from '../services/dashboardService';
import { getDataUserId } from '../services/userService';
import { formatCurrency } from '../utils/dateTimeUtils';

const sampleData = {
  kpis: {
    occupancyToday: {
      value: '78%',
      delta: '+6% WoW',
      note: '% of bookable hours filled',
      sparkline: [50, 60, 55, 70, 72, 78],
    },
    bookingsThisWeek: {
      value: '24',
      delta: '-3 WoW',
      note: 'Confirmed in current week',
      sparkline: [30, 28, 25, 27, 24],
    },
    holdsExpiring: {
      value: '5',
      delta: '+2 DoD',
      note: 'Tentative holds <48h left',
      sparkline: [2, 3, 4, 3, 5],
    },
    paymentsDue: {
      value: '$1,420 AUD',
      delta: '+$220 DoD',
      note: 'Due today + overdue',
      sparkline: [800, 1000, 1200, 1420],
    },
    cancellations30d: {
      value: '2',
      delta: '0 MoM',
      note: 'Count',
      sparkline: [3, 2, 2, 2],
    },
    revenueMtd: {
      value: '$12,640 AUD',
      delta: '+$1,040 WTD',
      note: 'Incl. GST line item',
      sparkline: [9000, 10500, 11600, 12640],
    },
  },
  scheduleToday: [
    { time: '08:00–09:00', resource: 'Hall A', title: 'Setup', status: 'Block-out' },
    { time: '09:00–12:00', resource: 'Hall A', title: 'Smith — Community Yoga', status: 'Confirmed', bookingId: 'BKG-310' },
    { time: '13:00–16:00', resource: 'Hall B', title: 'Nguyen — Rehearsal', status: 'Tentative', bookingId: 'BKG-311' },
    { time: '18:00–22:00', resource: 'Hall A', title: 'Pereira — Birthday', status: 'Confirmed', bookingId: 'BKG-312' },
  ],
  paymentsDue: [
    { invoice: 'INV-2051', customer: 'Smith', type: 'DEPOSIT', amountAud: 420, due: '2025-08-26', status: 'Due Today' },
    { invoice: 'INV-2052', customer: 'Pereira', type: 'FINAL', amountAud: 1000, due: '2025-08-26', status: 'Due Today' },
    { invoice: 'INV-2048', customer: 'Jones', type: 'BOND', amountAud: 500, due: '2025-08-24', status: 'Overdue' },
  ],
  holds: [
    { booking: 'BKG-311', resource: 'Hall B', start: '2025-08-27 13:00', expiresIn: '5h 40m', customer: 'Nguyen' },
    { booking: 'BKG-319', resource: 'Hall A', start: '2025-08-28 19:00', expiresIn: '1h 10m', customer: 'Rai' },
    { booking: 'BKG-320', resource: 'Main Hall', start: '2025-08-27 10:00', expiresIn: '14h 2m', customer: 'Chen' },
  ],
  alerts: [
    { type: 'conflict', text: 'Buffer overlap on Hall A at 6:00 PM' },
    { type: 'doc', text: 'Insurance document missing for Pereira (BKG-312)' },
    { type: 'webhook', text: 'Stripe webhook delivery failed. Retry scheduled.' },
  ],
  activity: [
    { at: '10:02', actor: 'Admin', text: 'Updated policy: Cancellation Window.' },
    { at: '09:25', actor: 'Stripe', text: 'Payment succeeded for INV-2050 ($780.00 AUD).' },
    { at: '09:12', actor: 'Admin', text: 'Accepted booking BKG-311 (Nguyen — Rehearsal).' },
  ],
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { token, getToken, user, parentUserData, loading: authLoading, userSettings } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResource, setSelectedResource] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('confirmed');
  const [sendingLinkFor, setSendingLinkFor] = useState(null);

  // Helper function to format currency values
  const formatCurrencyValue = (amount) => {
    if (typeof amount === 'string' && amount.includes('$')) {
      // Extract numeric value from string like "$1,420 AUD"
      const numericValue = parseFloat(amount.replace(/[$,AUD]/g, ''));
      return formatCurrency(numericValue, userSettings?.currency || 'AUD');
    }
    return amount;
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      const authToken = token || getToken();
      if (!authToken) {
        setError('Please log in to view dashboard data');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Get the appropriate user ID for data fetching
        const dataUserId = getDataUserId(user, parentUserData);
        const data = await fetchDashboardData(authToken, dataUserId, selectedResource);
        setDashboardData(data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message);
        // Fallback to sample data if API fails
        setDashboardData(sampleData);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [token, getToken, user, parentUserData, authLoading, selectedResource, selectedDate, statusFilter]);

  // Handlers for Payments Due actions
  const handleSendPaymentLink = async (payment) => {
    try {
      if (!payment?.invoice) return;
      // Simple action: download invoice PDF as a quick shareable artifact
      const authToken = token || getToken();
      setSendingLinkFor(payment.invoice);
      // If we had invoiceId, prefer it; otherwise backend can look up by number in future
      // For now, just open the invoice PDF if id is available in payment.bookingId
      if (payment.invoiceId) {
        await downloadInvoicePDF(payment.invoiceId, authToken);
      } else {
        // Fallback: no-op with toast-like alert
        console.log('Payment link send placeholder for', payment.invoice);
      }
    } finally {
      setSendingLinkFor(null);
    }
  };

  const handleRecordBankTransfer = (payment) => {
    // Navigate to invoices page or open a modal in future
    window.location.href = '/invoices';
  };

  const handleShareEmail = (payment) => {
    // Navigate to Comms > Send Email with prefilled query params
    const params = new URLSearchParams();
    if (payment?.customer) params.set('toName', payment.customer);
    if (payment?.invoice) params.set('invoice', payment.invoice);
    if (payment?.amountAud) params.set('amount', payment.amountAud.toString());
    if (payment?.bookingId) params.set('bookingId', payment.bookingId);
    window.location.href = `/comms-send-email?${params.toString()}`;
  };

  if (loading) {
    return (
      <main className="space-y-6">
        {/* Welcome Section with Profile Picture */}
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-xl p-3 sm:p-4 lg:p-5 text-white shadow-xl relative overflow-hidden border border-blue-400/20 z-10">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white rounded-full -translate-y-8 sm:-translate-y-12 lg:-translate-y-16 translate-x-8 sm:translate-x-12 lg:translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-white rounded-full translate-y-6 sm:translate-y-8 lg:translate-y-12 -translate-x-6 sm:-translate-x-8 lg:-translate-x-12"></div>
            <div className="absolute top-1/2 right-1/4 w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-white rounded-full"></div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
            <div className="relative group">
              <ProfilePicture 
                profilePicture={user?.profilePicture}
                name={user?.name}
                size="lg"
                className="ring-2 sm:ring-4 ring-white/40 shadow-2xl transform hover:scale-105 transition-transform duration-300"
              />
              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 bg-green-600 rounded-full"></div>
              </div>
              {/* Upload hint overlay */}
              {!user?.profilePicture && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-white text-xs font-medium text-center">
                    <div className="text-lg mb-1">📸</div>
                    <div>Add Photo</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Welcome back, {user?.name || 'User'}! 👋
              </h2>
              <div className="flex items-center gap-2">
                <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100">
                  {user?.role === 'super_admin' ? '👑 Super Admin' : 
                   user?.role === 'hall_owner' ? '🏛️ Hall Owner' : 
                   user?.role === 'sub_user' ? '👤 Sub-User' : '👤 User'}
                </div>
                {user?.role === 'hall_owner' && user?.hallName && (
                  <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100">
                    🏢 {user.hallName}
                  </div>
                )}
                {user?.role === 'sub_user' && parentUserData?.hallName && (
                  <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100">
                    🏢 {parentUserData.hallName}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <header className="flex flex-wrap items-center justify-between gap-4 relative z-20">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-500">
              Today's status across bookings, availability, and payments.
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error && !dashboardData) {
    const isAuthError = error.includes('log in') || error.includes('not authenticated');
    
    return (
      <main className="space-y-6">
        {/* Welcome Section with Profile Picture */}
        <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-xl p-3 sm:p-4 lg:p-5 text-white shadow-xl relative overflow-hidden border border-blue-400/20 z-10">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white rounded-full -translate-y-8 sm:-translate-y-12 lg:-translate-y-16 translate-x-8 sm:translate-x-12 lg:translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-white rounded-full translate-y-6 sm:translate-y-8 lg:translate-y-12 -translate-x-6 sm:-translate-x-8 lg:-translate-x-12"></div>
            <div className="absolute top-1/2 right-1/4 w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-white rounded-full"></div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
            <div className="relative">
              <ProfilePicture 
                profilePicture={user?.profilePicture}
                name={user?.name}
                size="lg"
                className="ring-2 sm:ring-4 ring-white/40 shadow-2xl transform hover:scale-105 transition-transform duration-300"
              />
              {/* Status indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-red-400 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 bg-red-600 rounded-full"></div>
              </div>
            </div>
            
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Welcome back, {user?.name || 'User'}! 👋
              </h2>
              <div className="flex items-center gap-2">
                <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100">
                  {user?.role === 'super_admin' ? '👑 Super Admin' : 
                   user?.role === 'hall_owner' ? '🏛️ Hall Owner' : 
                   user?.role === 'sub_user' ? '👤 Sub-User' : '👤 User'}
                </div>
                {user?.role === 'hall_owner' && user?.hallName && (
                  <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100">
                    🏢 {user.hallName}
                  </div>
                )}
                {user?.role === 'sub_user' && parentUserData?.hallName && (
                  <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100">
                    🏢 {parentUserData.hallName}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <header className="flex flex-wrap items-center justify-between gap-4 relative z-20">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-500">
              Today's status across bookings, availability, and payments.
            </p>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <FileWarning className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isAuthError ? 'Authentication Required' : 'Failed to load dashboard data'}
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              {isAuthError ? (
                <Button onClick={() => navigate('/login')}>
                  Go to Login
                </Button>
              ) : (
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const data = dashboardData || sampleData;

  // Debug logging for profile picture
  console.log('Dashboard - User data:', user);
  console.log('Dashboard - Profile picture URL:', user?.profilePicture);

  return (
    <main className="space-y-6">
      {/* Welcome Section with Profile Picture */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-xl p-3 sm:p-4 lg:p-5 text-white shadow-xl relative overflow-hidden border border-blue-400/20 z-10">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          {/* Floating orbs with different sizes and positions */}
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white rounded-full -translate-y-8 sm:-translate-y-12 lg:-translate-y-16 translate-x-8 sm:translate-x-12 lg:translate-x-16 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-24 lg:h-24 bg-white rounded-full translate-y-6 sm:translate-y-8 lg:translate-y-12 -translate-x-6 sm:-translate-x-8 lg:-translate-x-12 animate-bounce"></div>
          <div className="absolute top-1/2 right-1/4 w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-white rounded-full animate-ping"></div>
          {/* Additional decorative elements */}
          <div className="absolute top-1/4 left-1/3 w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/3 w-4 h-4 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-purple-200 rounded-full animate-bounce"></div>
          {/* Geometric shapes */}
          <div className="absolute top-3/4 left-1/4 w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 bg-white rotate-45 animate-spin"></div>
          <div className="absolute top-1/3 right-1/5 w-2 h-2 sm:w-3 sm:h-3 lg:w-4 lg:h-4 bg-blue-300 rounded-full animate-pulse"></div>
        </div>
        
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
          <div className="relative group flex-shrink-0">
            {/* Glowing background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full blur-xl scale-110 animate-pulse"></div>
            
            <ProfilePicture 
              profilePicture={user?.profilePicture}
              name={user?.name}
              size="lg"
              className="ring-2 sm:ring-4 ring-white/40 shadow-2xl transform hover:scale-110 hover:rotate-3 transition-all duration-500 relative z-10"
            />
            
            {/* Enhanced status indicator with glow */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-pulse">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 bg-white rounded-full animate-ping"></div>
            </div>
            
            {/* Decorative rings around profile picture */}
            <div className="absolute inset-0 rounded-full border border-white/20 scale-125 animate-spin" style={{animationDuration: '20s'}}></div>
            <div className="absolute inset-0 rounded-full border border-white/10 scale-150 animate-spin" style={{animationDuration: '30s', animationDirection: 'reverse'}}></div>
            
            {/* Upload hint overlay */}
            {!user?.profilePicture && (
              <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-purple-900/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
                <div className="text-white text-xs font-medium text-center transform group-hover:scale-110 transition-transform duration-300">
                  <div className="text-lg mb-1 animate-bounce">📸</div>
                  <div>Add Photo</div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left relative">
            {/* Floating text background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-lg"></div>
            
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent relative z-10 transform hover:scale-105 transition-transform duration-300">
              Welcome back, {user?.name || 'User'}! 👋
            </h2>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 relative z-10">
              <div className="px-2 sm:px-3 py-1 bg-gradient-to-r from-white/20 to-white/30 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100 border border-white/20 hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg">
                {user?.role === 'super_admin' ? '👑 Super Admin' : 
                 user?.role === 'hall_owner' ? '🏛️ Hall Owner' : 
                 user?.role === 'sub_user' ? '👤 Sub-User' : '👤 User'}
              </div>
              {user?.role === 'hall_owner' && user?.hallName && (
                <div className="px-2 sm:px-3 py-1 bg-gradient-to-r from-white/20 to-white/30 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100 border border-white/20 hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  🏢 {user.hallName}
                </div>
              )}
              {user?.role === 'sub_user' && parentUserData?.hallName && (
                <div className="px-2 sm:px-3 py-1 bg-gradient-to-r from-white/20 to-white/30 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm text-blue-100 border border-white/20 hover:bg-white/30 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  🏢 {parentUserData.hallName}
                </div>
              )}
            </div>
            
          </div>
          
          {/* Quick stats preview (live data) */}
          <div className="hidden md:flex flex-col gap-2 relative z-10">
            <div className="bg-gradient-to-br from-white/15 to-white/25 backdrop-blur-sm rounded-lg p-2 lg:p-3 text-center border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-xl">
              <div className="text-base lg:text-xl font-bold text-white">{(dashboardData?.kpis?.bookingsThisWeek?.value) || '0'}</div>
              <div className="text-xs text-blue-100 font-medium">Bookings (This Week)</div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="bg-gradient-to-br from-white/15 to-white/25 backdrop-blur-sm rounded-lg p-2 lg:p-3 text-center border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 shadow-xl">
              <div className="text-base lg:text-xl font-bold text-white">{formatCurrencyValue(dashboardData?.kpis?.revenueMtd?.value || '$0')}</div>
              <div className="text-xs text-blue-100 font-medium">Revenue (MTD)</div>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-blue-400/10 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 relative z-20">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Today's status across bookings, availability, and payments.
          </p>
          {error && (
            <p className="mt-1 text-sm text-amber-600">
              ⚠️ Using cached data due to API error: {error}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/calendar')}>
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Button>
        </div>
      </header>

      {/* Filters */}
      <section className="flex flex-wrap items-center gap-3 rounded-lg border p-3 shadow-sm relative z-20">
        <Filter className="h-5 w-5 text-gray-500" />
        <div className="flex-grow sm:flex-grow-0">
          <DatePicker value={selectedDate} onChange={setSelectedDate} />
        </div>
        <div className="flex-grow sm:flex-grow-0">
          <Select value={selectedResource} onValueChange={setSelectedResource}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Resources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              {dashboardData?.resources?.map((resource) => (
                <SelectItem key={resource.id} value={resource.id}>
                  {resource.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" className={statusFilter==='confirmed'?"bg-blue-50 border-blue-200 text-blue-700":""} onClick={()=>setStatusFilter('confirmed')}>Confirmed</Button>
            <Button variant="outline" size="sm" className={statusFilter==='pending'?"bg-blue-50 border-blue-200 text-blue-700":""} onClick={()=>setStatusFilter('pending')}>Tentative</Button>
            <Button variant="outline" size="sm" className={statusFilter==='block-out'?"bg-blue-50 border-blue-200 text-blue-700":""} onClick={()=>setStatusFilter('block-out')}>Block-out</Button>
        </div>
        <Button 
          variant="link" 
          size="sm" 
          className="text-gray-600"
          onClick={() => { setSelectedResource('all'); setSelectedDate(new Date()); setStatusFilter('confirmed'); }}
        >
          Reset filters
        </Button>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 relative z-20">
        {/* Row A: KPI Cards */}
        <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 auto-rows-fr">
          <KpiCard 
            title="Occupancy Today" 
            value={data.kpis.occupancyToday.value} 
            delta={data.kpis.occupancyToday.delta} 
            deltaType={data.kpis.occupancyToday.deltaType}
            sparklineData={data.kpis.occupancyToday.sparkline} 
            note={data.kpis.occupancyToday.note} 
          />
          <KpiCard 
            title="Bookings (This Week)" 
            value={data.kpis.bookingsThisWeek.value} 
            delta={data.kpis.bookingsThisWeek.delta} 
            deltaType={data.kpis.bookingsThisWeek.deltaType}
            sparklineData={data.kpis.bookingsThisWeek.sparkline} 
            note={data.kpis.bookingsThisWeek.note} 
          />
          <KpiCard 
            title="Holds Expiring" 
            value={data.kpis.holdsExpiring.value} 
            delta={data.kpis.holdsExpiring.delta} 
            deltaType={data.kpis.holdsExpiring.deltaType}
            sparklineData={data.kpis.holdsExpiring.sparkline} 
            note={data.kpis.holdsExpiring.note} 
          />
          <KpiCard 
            title="Payments Due" 
            value={formatCurrencyValue(data.kpis.paymentsDue.value)} 
            delta={data.kpis.paymentsDue.delta} 
            deltaType={data.kpis.paymentsDue.deltaType}
            sparklineData={data.kpis.paymentsDue.sparkline} 
            note={data.kpis.paymentsDue.note} 
          />
          <KpiCard 
            title="Cancellations (30d)" 
            value={data.kpis.cancellations30d.value} 
            delta={data.kpis.cancellations30d.delta} 
            deltaType={data.kpis.cancellations30d.deltaType}
            sparklineData={data.kpis.cancellations30d.sparkline} 
            note={data.kpis.cancellations30d.note} 
          />
          <KpiCard 
            title="Revenue (MTD)" 
            value={formatCurrencyValue(data.kpis.revenueMtd.value)} 
            delta={data.kpis.revenueMtd.delta} 
            deltaType={data.kpis.revenueMtd.deltaType}
            sparklineData={data.kpis.revenueMtd.sparkline} 
            note={data.kpis.revenueMtd.note} 
          />
        </section>

        {/* Row B: Schedule & Payments */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodaySchedule schedule={data.scheduleToday} />
          </div>
          <div>
            <PaymentsDue 
              payments={data.paymentsDue} 
              userSettings={userSettings}
              onSendLink={handleSendPaymentLink}
              onRecordBank={handleRecordBankTransfer}
              onShareEmail={handleShareEmail}
            />
          </div>
        </section>

        {/* Row C: Holds & Alerts */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-2">
          <HoldsExpiring holds={data.holds} />
          <AlertsTasks alerts={data.alerts || []} />
        </section>
        
        {/* Row D: Recent Activity */}
        <RecentActivity activities={data.activity} />
      </div>
    </main>
  );
}