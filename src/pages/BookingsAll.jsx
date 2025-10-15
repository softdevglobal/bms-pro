import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Plus,
  Download,
  Search,
  Filter,
  Calendar,
  Settings2,
  MoreVertical,
  Eye,
  Edit,
  Send,
  XCircle,
  Zap,
  TrendingUp,
  Clock,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Keyboard,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BookingsTableAdvanced from '../components/bookings/BookingsTableAdvanced';
import SmartFilters from '../components/bookings/SmartFilters';
import BookingDetailPaneAdvanced from '../components/bookings/BookingDetailPaneAdvanced';
import QuickStats from '../components/bookings/QuickStats';
import CommandPalette from '../components/bookings/CommandPalette';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import ToastNotification from '../components/ui/ToastNotification';
import { format, subDays, addDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import AdminBookingForm from '../components/bookings/AdminBookingForm';
import { fetchResources } from '../services/bookingService';
import { emailCommsAPI } from '../services/emailService';
import BookingConfirmForm from '../components/bookings/BookingConfirmForm';

// Transform backend booking data to match frontend format
const transformBookingData = (backendBooking) => {
  // Ensure we handle dates correctly without timezone issues
  // Parse the date components separately to avoid timezone conversion
  const [year, month, day] = backendBooking.bookingDate.split('-').map(Number);
  const [startHour, startMin] = backendBooking.startTime.split(':').map(Number);
  const [endHour, endMin] = backendBooking.endTime.split(':').map(Number);
  
  const startDateTime = new Date(year, month - 1, day, startHour, startMin, 0);
  const endDateTime = new Date(year, month - 1, day, endHour, endMin, 0);
  
  // Debug logging for date transformation (only for Super Man booking)
  if (backendBooking.customerName === 'Super Man' || backendBooking.customerName.includes('Super')) {
    console.log('Transform booking data:', {
      id: backendBooking.id,
      originalDate: backendBooking.bookingDate,
      originalStartTime: backendBooking.startTime,
      originalEndTime: backendBooking.endTime,
      transformedStart: startDateTime.toISOString(),
      transformedEnd: endDateTime.toISOString(),
      localStartDate: format(startDateTime, 'yyyy-MM-dd'),
      localEndDate: format(endDateTime, 'yyyy-MM-dd')
    });
  }
  
  
  return {
    id: backendBooking.id,
    customer: {
      name: backendBooking.customerName,
      email: backendBooking.customerEmail,
      tier: 'standard', // Default tier, could be enhanced later
      bookingHistory: 1, // Default, could be calculated from history
      totalSpent: backendBooking.calculatedPrice || 0,
    },
    // Keep both id and name for edit operations and display
    resourceId: backendBooking.selectedHall || backendBooking.hallId || backendBooking.resourceId,
    resourceName: backendBooking.hallName || backendBooking.resourceName,
    resource: backendBooking.hallName || backendBooking.selectedHall,
    start: startDateTime,
    end: endDateTime,
    status: backendBooking.status || 'pending',
    balance: backendBooking.calculatedPrice || 0,
    totalValue: backendBooking.calculatedPrice || 0,
    guests: backendBooking.guestCount || 0,
    purpose: backendBooking.eventType || 'Event',
    priority: 'normal', // Default priority
    tags: [],
    notes: backendBooking.additionalDescription || '',
    createdAt: backendBooking.createdAt ? new Date(backendBooking.createdAt) : new Date(),
    lastModified: backendBooking.updatedAt ? new Date(backendBooking.updatedAt) : new Date(),
    assignedTo: 'Admin', // Default assignment
    riskLevel: 'low', // Default risk level
    // Additional backend fields
    customerPhone: backendBooking.customerPhone,
    customerAvatar: backendBooking.customerAvatar,
    bookingSource: backendBooking.bookingSource,
    priceDetails: backendBooking.priceDetails,
    // Deposit information
    depositType: backendBooking.depositType,
    depositValue: backendBooking.depositValue,
    depositAmount: backendBooking.depositAmount,
    quotationId: backendBooking.quotationId,
  };
};

export default function BookingsAll() {
  const { user } = useAuth();
  
  // State management with performance optimization
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [resourceMap, setResourceMap] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ column: 'start', direction: 'desc' });
  const [isDetailPaneOpen, setIsDetailPaneOpen] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // table, cards, timeline
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingPayLink, setSendingPayLink] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    bookingDetails: null,
    onConfirm: null
  });
  const [toast, setToast] = useState({
    isVisible: false,
    type: 'success',
    title: '',
    message: ''
  });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formInitialData, setFormInitialData] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  // Deposit confirmation modal states (reuse simple inline dialog in ConfirmationModal payload)
  const [depositType, setDepositType] = useState('Fixed');
  const [depositValue, setDepositValue] = useState('');
  const [taxType, setTaxType] = useState('inclusive');
  const gstRate = 0.1;
  const bookingTotalInclGst = (b) => Math.round(((Number(b?.totalValue || 0)) * (1 + gstRate)) * 100) / 100;
  const computeDepositInclGst = (b, type, rawVal) => {
    const val = Number(rawVal);
    if (!b || Number.isNaN(val) || val <= 0) return 0;
    const baseIncl = bookingTotalInclGst(b);
    if (type === 'Percentage') return Math.round((baseIncl * (Math.max(0, Math.min(100, val)) / 100)) * 100) / 100;
    return Math.round(val * 100) / 100; // fixed is already GST incl
  };
  
  // Advanced filter states
  const [filters, setFilters] = useState({
    resources: [],
    statuses: [],
    dateFrom: null,
    dateTo: null,
    priority: [],
    customerTier: [],
    riskLevel: [],
    tags: [],
    quickFilter: 'all', // today, tomorrow, thisWeek, etc.
  });

  // Performance refs
  const searchTimeoutRef = useRef(null);
  const tableRef = useRef(null);

  // Fetch bookings from backend
  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (!user?.id) {
      console.log('No user ID available:', user);
      return;
    }
    
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Determine the correct hall owner ID to fetch bookings for
      let hallOwnerId = user.id;
      if (user.role === 'sub_user' && user.parentUserId) {
        hallOwnerId = user.parentUserId;
      }

      console.log('Fetching bookings for hall owner ID:', hallOwnerId);
      console.log('User object:', user);
      
      const response = await fetch(`/api/bookings/hall-owner/${hallOwnerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Backend error response:', errorData);
        throw new Error(`Failed to fetch bookings: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
      }

      const backendBookings = await response.json();
      console.log('Received bookings from backend:', backendBookings);
      const transformedBookings = backendBookings.map(transformBookingData);
      
      // Map resource IDs to names if available
      const withResourceNames = transformedBookings.map(b => {
        const name = b.resourceName || (b.resourceId ? resourceMap[b.resourceId] : undefined) || b.resource;
        return { ...b, resource: name };
      });
      
      setBookings(withResourceNames);
      setFilteredBookings(withResourceNames);
      
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Fetch resources once and build an ID->name map
  useEffect(() => {
    const loadResources = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const resources = await fetchResources(token);
        const map = resources.reduce((acc, r) => {
          acc[r.id] = r.name;
          return acc;
        }, {});
        setResourceMap(map);
      } catch (e) {
        console.error('Failed to load resources:', e);
      }
    };
    loadResources();
  }, []);

  // When resource map loads later, remap existing bookings to names
  useEffect(() => {
    if (!resourceMap || Object.keys(resourceMap).length === 0) return;
    setBookings(prev => prev.map(b => ({ ...b, resource: b.resourceName || (b.resourceId ? resourceMap[b.resourceId] : b.resource) || b.resource })));
    setFilteredBookings(prev => prev.map(b => ({ ...b, resource: b.resourceName || (b.resourceId ? resourceMap[b.resourceId] : b.resource) || b.resource })));
  }, [resourceMap]);

  // Open edit form from detail pane
  const handleEdit = useCallback((booking) => {
    setFormMode('edit');
    // Map from table booking to AdminBookingForm initialData
    const initial = {
      id: booking.id,
      customerName: booking.customer?.name || '',
      customerEmail: booking.customer?.email || '',
      customerPhone: booking.customerPhone || '',
      eventType: booking.purpose || '',
      selectedHall: booking.resourceId || '',
      bookingDate: format(booking.start, 'yyyy-MM-dd'),
      startTime: format(booking.start, 'HH:mm'),
      endTime: format(booking.end, 'HH:mm'),
      additionalDescription: booking.notes || '',
      estimatedPrice: booking.totalValue || '',
      guestCount: booking.guests || '',
      status: booking.status || 'pending',
    };
    setFormInitialData(initial);
    setShowBookingForm(true);
  }, []);

  // Send payment link via email (uses generic email-comms endpoint)
  const handleSendPayLink = useCallback(async (booking) => {
    try {
      if (sendingPayLink) return;
      setSendingPayLink(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      if (!booking?.customer?.email) throw new Error('Customer email not available');

      // Construct a simple payment link email. If you have invoices/payment pages,
      // replace payUrl with your hosted payment page.
      const payUrl = `https://cranbournehall.com/pay?bookingId=${encodeURIComponent(booking.id)}`;

      const subject = `Payment link for ${booking.purpose}`;
      const body = `Hi ${booking.customer.name},\n\n` +
        `Please use the link below to make your payment for ${booking.purpose} on ${format(booking.start, 'eeee, dd MMMM yyyy')} (${format(booking.start, 'HH:mm')} - ${format(booking.end, 'HH:mm')}).\n\n` +
        `${payUrl}\n\n` +
        `If you have any questions, reply to this email.`;

      await emailCommsAPI.sendEmail({
        recipientEmail: booking.customer.email,
        recipientName: booking.customer.name,
        bookingId: booking.id,
        customSubject: subject,
        customBody: body,
        variables: {
          customerName: booking.customer.name,
          bookingId: booking.id,
          eventType: booking.purpose,
          bookingDate: format(booking.start, 'yyyy-MM-dd'),
          startTime: format(booking.start, 'HH:mm'),
          endTime: format(booking.end, 'HH:mm'),
          hallName: booking.resource,
          calculatedPrice: booking.totalValue,
          guestCount: booking.guests,
          status: booking.status
        }
      }, token);

      setToast({
        isVisible: true,
        type: 'success',
        title: 'Payment Link Sent',
        message: `Pay link emailed to ${booking.customer.email}`
      });
    } catch (err) {
      console.error('Error sending pay link:', err);
      setToast({
        isVisible: true,
        type: 'error',
        title: 'Failed to Send Pay Link',
        message: err.message
      });
    }
    finally {
      setSendingPayLink(false);
    }
  }, [sendingPayLink]);

  // Fetch bookings on component mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [user?.id, fetchBookings]);

  // Memoized computations for performance
  const quickStats = useMemo(() => {
    const today = new Date();
    const todayBookings = bookings.filter(b => isToday(b.start));
    const tomorrowBookings = bookings.filter(b => isTomorrow(b.start));
    // Normalize to current backend statuses (lowercase) but keep compatibility
    const pendingReview = bookings.filter(b => b.status === 'pending' || b.status === 'PENDING_REVIEW');
    const totalRevenue = bookings
      .filter(b => b.status === 'completed' || b.status === 'COMPLETED')
      .reduce((sum, b) => sum + b.totalValue, 0);
    
    const avgBookingValue = bookings.length > 0 
      ? bookings.reduce((sum, b) => sum + b.totalValue, 0) / bookings.length 
      : 0;
    
    const occupancyRate = todayBookings.length / 10; // Assuming 10 max bookings per day
    
    return {
      todayCount: todayBookings.length,
      tomorrowCount: tomorrowBookings.length,
      pendingCount: pendingReview.length,
      totalRevenue,
      avgBookingValue,
      occupancyRate: Math.min(occupancyRate, 1),
      highRiskCount: bookings.filter(b => b.riskLevel === 'high').length,
    };
  }, [bookings]);

  // Smart filtering with debounce
  const applyFilters = useCallback(() => {
    let filtered = [...bookings];

    // Quick filters
    const now = new Date();
    switch (filters.quickFilter) {
      case 'today':
        filtered = filtered.filter(b => isToday(b.start));
        break;
      case 'tomorrow':
        filtered = filtered.filter(b => isTomorrow(b.start));
        break;
      case 'thisWeek':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        filtered = filtered.filter(b => b.start >= weekStart && b.start <= weekEnd);
        break;
      case 'overdue':
        // Overdue = requests awaiting action whose start time is in the past
        filtered = filtered.filter(b => 
          (b.status === 'pending' || b.status === 'PENDING_REVIEW' || b.status === 'tentative' || b.status === 'TENTATIVE') && b.start < now
        );
        break;
      case 'highValue':
        filtered = filtered.filter(b => b.totalValue > 2000);
        break;
    }

    // Search with intelligent matching
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => {
        const searchableText = [
          booking.id,
          booking.customer.name,
          booking.customer.email,
          booking.resource,
          booking.purpose,
          booking.assignedTo,
          ...(booking.tags || [])
        ].join(' ').toLowerCase();
        
        return searchableText.includes(term) ||
          // Fuzzy matching for common misspellings
          booking.customer.name.toLowerCase().replace(/[aeiou]/g, '').includes(term.replace(/[aeiou]/g, ''));
      });
    }

    // Advanced filters
    if (filters.resources.length > 0) {
      filtered = filtered.filter(b => filters.resources.includes(b.resource));
    }
    
    if (filters.statuses.length > 0) {
      filtered = filtered.filter(b => filters.statuses.includes(b.status));
    }
    
    if (filters.priority.length > 0) {
      filtered = filtered.filter(b => filters.priority.includes(b.priority));
    }
    
    if (filters.customerTier.length > 0) {
      filtered = filtered.filter(b => filters.customerTier.includes(b.customer.tier));
    }
    
    if (filters.riskLevel.length > 0) {
      filtered = filtered.filter(b => filters.riskLevel.includes(b.riskLevel));
    }
    
    if (filters.bookingSources && filters.bookingSources.length > 0) {
      filtered = filtered.filter(b => filters.bookingSources.includes(b.bookingSource));
    }

    // Date range with intelligent defaults
    if (filters.dateFrom) {
      filtered = filtered.filter(b => b.start >= filters.dateFrom);
    }
    if (filters.dateTo) {
      const endOfDay = new Date(filters.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(b => b.end <= endOfDay);
    }

    // Apply sorting with stable sort
    if (sortConfig.column && sortConfig.direction) {
      filtered.sort((a, b) => {
        const aValue = getColumnValue(a, sortConfig.column);
        const bValue = getColumnValue(b, sortConfig.column);
        
        let result = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          result = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          result = aValue.getTime() - bValue.getTime();
        } else {
          result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
        
        // Secondary sort by ID for stability
        if (result === 0) {
          result = a.id.localeCompare(b.id);
        }
        
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }

    setFilteredBookings(filtered);
  }, [searchTerm, filters, sortConfig, bookings]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, filters, sortConfig, applyFilters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      
      // Quick filters
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        switch (e.key) {
          case 'T':
            e.preventDefault();
            setFilters(prev => ({ ...prev, quickFilter: 'today' }));
            break;
          case 'N':
            e.preventDefault();
            setFilters(prev => ({ ...prev, quickFilter: 'tomorrow' }));
            break;
          case 'W':
            e.preventDefault();
            setFilters(prev => ({ ...prev, quickFilter: 'thisWeek' }));
            break;
          case 'P':
            e.preventDefault();
            // Pending review shortcut
            setFilters(prev => ({ ...prev, statuses: ['pending'] }));
            break;
        }
      }
      
      // Escape key handlers
      if (e.key === 'Escape') {
        if (isDetailPaneOpen) {
          setIsDetailPaneOpen(false);
          setSelectedBooking(null);
        } else if (showCommandPalette) {
          setShowCommandPalette(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDetailPaneOpen, showCommandPalette]);

  const getColumnValue = (booking, column) => {
    switch (column) {
      case 'booking': return booking.id;
      case 'customer': return booking.customer.name;
      case 'resource': return booking.resource;
      case 'start': return booking.start;
      case 'end': return booking.end;
      case 'status': return booking.status;
      case 'balance': return booking.balance;
      case 'priority': return booking.priority;
      case 'value': return booking.totalValue;
      default: return '';
    }
  };

  const handleRowClick = useCallback((booking) => {
    setSelectedBooking(booking);
    setIsDetailPaneOpen(true);
  }, []);

  const handleBulkAction = useCallback((action) => {
    const selectedBookingIds = Array.from(selectedRows);
    console.log(`Bulk action ${action} on bookings:`, selectedBookingIds);
    
    // Optimistic UI updates
    switch (action) {
      case 'accept':
        // Update local state optimistically
        break;
      case 'decline':
        // Update local state optimistically  
        break;
      case 'send-link':
        // Show success toast immediately
        break;
    }
    
    setSelectedRows(new Set());
  }, [selectedRows]);

  // Handle confirm order action
  const handleConfirmOrder = useCallback((bookingId) => {
    // Find the booking to get customer name for confirmation
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    // Reset deposit inputs and show modal with deposit fields
    setDepositType('Fixed');
    setDepositValue('');
    setTaxType('inclusive');
    // Show beautiful confirmation modal
    setConfirmationModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Booking',
      message: `Are you sure you want to confirm the booking for ${booking.customer.name}?`,
      confirmText: 'Confirm Order',
      cancelText: 'Cancel',
      bookingDetails: {
        customerName: booking.customer.name,
        purpose: booking.purpose,
        start: booking.start,
        end: booking.end,
        totalValue: booking.totalValue,
        booking: booking,
        // Extra render data used by ConfirmationModal (it forwards through to its template)
        extraContent: () => (
          <BookingConfirmForm
            booking={booking}
            taxType={taxType}
            onTaxTypeChange={setTaxType}
            depositType={depositType}
            onDepositTypeChange={setDepositType}
            depositValue={depositValue}
            onDepositValueChange={setDepositValue}
          />
        )
      },
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          console.log('Confirming order for booking:', bookingId);
          
          const response = await fetch(`/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              status: 'confirmed',
              depositType: depositType,
              depositValue: depositType === 'Percentage' ? Number(depositValue) : undefined,
              depositAmount: computeDepositInclGst(booking, depositType, depositValue),
              taxType: taxType
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`Failed to confirm booking: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
          }

          const result = await response.json();
          console.log('Booking confirmed successfully:', result);

          // Update local state optimistically
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 'confirmed' }
                : booking
            )
          );

          // Update filtered bookings as well
          setFilteredBookings(prevFilteredBookings => 
            prevFilteredBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 'confirmed' }
                : booking
            )
          );

          // Close modal and show success
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
          setToast({
            isVisible: true,
            type: 'success',
            title: 'Booking Confirmed!',
            message: `${booking.customer.name}'s booking is now confirmed.`
          });
          
        } catch (err) {
          console.error('Error confirming booking:', err);
          setToast({
            isVisible: true,
            type: 'error',
            title: 'Error Confirming Booking',
            message: err.message
          });
        }
      }
    });
  }, [bookings, taxType, depositType, depositValue]);

  // Update modal content when tax/deposit states change
  useEffect(() => {
    if (confirmationModal.isOpen && confirmationModal.bookingDetails?.booking) {
      const booking = confirmationModal.bookingDetails.booking;
      setConfirmationModal(prev => ({
        ...prev,
        bookingDetails: {
          ...prev.bookingDetails,
          extraContent: () => (
            <BookingConfirmForm
              booking={booking}
              taxType={taxType}
              onTaxTypeChange={setTaxType}
              depositType={depositType}
              onDepositTypeChange={setDepositType}
              depositValue={depositValue}
              onDepositValueChange={setDepositValue}
            />
          )
        }
      }));
    }
  }, [taxType, depositType, depositValue]);

  // Handle cancel order action
  const handleCancelOrder = useCallback((bookingId) => {
    // Find the booking to get customer name for confirmation
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) {
      console.error('Booking not found:', bookingId);
      return;
    }

    // Show beautiful confirmation modal
    setConfirmationModal({
      isOpen: true,
      type: 'cancel',
      title: 'Cancel Booking',
      message: `Are you sure you want to cancel the booking for ${booking.customer.name}?`,
      confirmText: 'Cancel Order',
      cancelText: 'Keep Booking',
      bookingDetails: {
        customerName: booking.customer.name,
        purpose: booking.purpose,
        start: booking.start,
        end: booking.end,
        totalValue: booking.totalValue
      },
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No authentication token found');
          }

          console.log('Cancelling order for booking:', bookingId);
          
          const response = await fetch(`/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: 'cancelled' })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`Failed to cancel booking: ${response.status} ${response.statusText} - ${errorData.message || 'Unknown error'}`);
          }

          const result = await response.json();
          console.log('Booking cancelled successfully:', result);

          // Update local state optimistically
          setBookings(prevBookings => 
            prevBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 'cancelled' }
                : booking
            )
          );

          // Update filtered bookings as well
          setFilteredBookings(prevFilteredBookings => 
            prevFilteredBookings.map(booking => 
              booking.id === bookingId 
                ? { ...booking, status: 'cancelled' }
                : booking
            )
          );

          // Close modal and show success
          setConfirmationModal(prev => ({ ...prev, isOpen: false }));
          setToast({
            isVisible: true,
            type: 'success',
            title: 'Booking Cancelled!',
            message: `${booking.customer.name}'s booking has been cancelled.`
          });
          
        } catch (err) {
          console.error('Error cancelling booking:', err);
          setToast({
            isVisible: true,
            type: 'error',
            title: 'Error Cancelling Booking',
            message: err.message
          });
        }
      }
    });
  }, [bookings]);

  const handleExport = useCallback(() => {
    const dataToExport = selectedRows.size > 0 
      ? filteredBookings.filter(b => selectedRows.has(b.id))
      : filteredBookings;
    
    // Enhanced CSV with more fields
    const csv = [
      [
        'Booking ID', 'Customer', 'Email', 'Resource', 'Start Date', 'Start Time',
        'End Date', 'End Time', 'Status', 'Guests', 'Purpose', 'Total Value',
        'Balance', 'Priority', 'Risk Level', 'Assigned To', 'Created Date'
      ],
      ...dataToExport.map(booking => [
        booking.id,
        booking.customer.name,
        booking.customer.email,
        booking.resource,
        format(booking.start, 'dd/MM/yyyy'),
        format(booking.start, 'HH:mm'),
        format(booking.end, 'dd/MM/yyyy'),
        format(booking.end, 'HH:mm'),
        booking.status,
        booking.guests,
        booking.purpose,
        `$${(booking.totalValue * 1.1).toLocaleString('en-AU', { minimumFractionDigits: 2 })} (incl. GST)`,
        `$${(booking.balance * 1.1).toLocaleString('en-AU', { minimumFractionDigits: 2 })} (incl. GST)`,
        booking.priority,
        booking.riskLevel,
        booking.assignedTo,
        format(booking.createdAt, 'dd/MM/yyyy HH:mm'),
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_export_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredBookings, selectedRows]);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({
      resources: [],
      statuses: [],
      dateFrom: null,
      dateTo: null,
      priority: [],
      customerTier: [],
      riskLevel: [],
      tags: [],
      quickFilter: 'all',
    });
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-full relative">
        <motion.div 
          className={`flex-1 space-y-6 transition-all duration-300 ${isDetailPaneOpen ? 'pr-96' : ''}`}
          layout
        >
          {/* Enhanced Header with Sparkles Effect */}
          <motion.div 
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 via-indigo-100/20 to-purple-100/20"></div>
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">Bookings — All</h1>
                  <Sparkles className="h-6 w-6 text-purple-500 animate-pulse" />
                </div>
                <p className="mt-2 text-gray-600 flex items-center gap-2">
                  Search, filter and action bookings across all statuses
                  <Tooltip>
                    <TooltipTrigger>
                      <Keyboard className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs space-y-1">
                        <div>⌘+K: Command palette</div>
                        <div>⌘+Shift+T: Today's bookings</div>
                        <div>⌘+Shift+P: Pending review</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </p>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={() => fetchBookings(true)}
                      disabled={refreshing}
                      className="relative overflow-hidden group"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh bookings data</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleExport} className="relative overflow-hidden group">
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/10 to-green-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export current view or selected bookings</TooltipContent>
                </Tooltip>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={showCalendar ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
                </Button>
                
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  onClick={() => setShowBookingForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats Dashboard */}
          <QuickStats stats={quickStats} />

          {/* Calendar View */}
          {showCalendar && (
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader>
                <CardContent className="pt-0">
                  <div className="text-center text-gray-600">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold mb-2">Bookings Calendar</h3>
                    <p className="text-sm mb-4">
                      View your bookings on a calendar. Click on any date to see bookings for that day.
                    </p>
                    <div className="text-center mb-4">
                      <h4 className="text-xl font-bold text-gray-800">
                        {format(new Date(), 'MMMM yyyy')}
                      </h4>
                    </div>
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {Array.from({ length: 7 }, (_, i) => {
                        const today = new Date();
                        const currentDay = today.getDay();
                        const daysFromMonday = currentDay === 0 ? -6 : 1 - currentDay;
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() + daysFromMonday);
                        
                        const dayDate = new Date(weekStart);
                        dayDate.setDate(weekStart.getDate() + i);
                        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        
                        // Debug logging for header dates
                        console.log('Header date generation:', {
                          index: i,
                          dayName: dayNames[i],
                          dayDate: dayDate.getDate(),
                          fullDate: format(dayDate, 'yyyy-MM-dd'),
                          dayOfWeek: dayDate.getDay()
                        });
                        
                        return (
                          <div key={i} className="text-sm font-medium text-gray-500 p-2">
                            <div>{dayNames[i]}</div>
                            <div className="text-lg font-bold text-gray-700">{dayDate.getDate()}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 35 }, (_, i) => {
                        // Get current date and calculate the start of the current week (Monday)
                        const today = new Date();
                        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                        const daysFromMonday = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Monday start
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() + daysFromMonday);
                        
                        // Create calendar date
                        const date = new Date(weekStart);
                        date.setDate(weekStart.getDate() + i);
                        const dateStr = format(date, 'yyyy-MM-dd'); // Use date-fns format for consistency
                        
                        // Debug logging for calendar date generation
                        if (i < 7) {
                          console.log('Calendar date generation:', {
                            index: i,
                            weekStart: format(weekStart, 'yyyy-MM-dd'),
                            generatedDate: dateStr,
                            dayOfWeek: date.getDay(),
                            dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
                          });
                        }
                        const dayBookings = bookings.filter(b => {
                          // Get the booking date string in the same format
                          const bookingDateStr = format(b.start, 'yyyy-MM-dd');
                          const isMatch = bookingDateStr === dateStr;
                          
                          // Debug logging for date matching
                          if (b.customer.name === 'Super Man' || b.customer.name.includes('Super')) {
                            console.log('Calendar date matching debug:', {
                              calendarDate: dateStr,
                              bookingDate: bookingDateStr,
                              bookingId: b.id,
                              customer: b.customer.name,
                              originalStart: b.start.toISOString(),
                              localStart: format(b.start, 'yyyy-MM-dd HH:mm:ss'),
                              isMatch: isMatch
                            });
                          }
                          
                          return isMatch;
                        });
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isCurrentMonth = date.getMonth() === new Date().getMonth();
                        
                        return (
                          <div
                            key={i}
                            className={`min-h-[80px] p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors ${
                              isToday ? 'bg-blue-100 border-blue-300' : 
                              isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                            }`}
                            onClick={() => {
                              // Filter bookings to this date
                              const startOfDay = new Date(date);
                              startOfDay.setHours(0, 0, 0, 0);
                              const endOfDay = new Date(date);
                              endOfDay.setHours(23, 59, 59, 999);
                              
                              setFilters(prev => ({
                                ...prev,
                                dateFrom: startOfDay,
                                dateTo: endOfDay
                              }));
                            }}
                          >
                            <div className={`text-sm font-medium mb-1 ${
                              isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                            } ${isToday ? 'text-blue-600' : ''}`}>
                              {date.getDate()}
                            </div>
                            <div className="space-y-1">
                              {dayBookings.slice(0, 2).map(booking => (
                                <div
                                  key={booking.id}
                                  className={`text-xs p-1 rounded truncate ${
                                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                  title={`${booking.customer.name} - ${booking.purpose}`}
                                >
                                  {booking.customer.name}
                                </div>
                              ))}
                              {dayBookings.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{dayBookings.length - 2} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex justify-center gap-4 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-100 rounded"></div>
                        <span>Confirmed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-100 rounded"></div>
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-100 rounded"></div>
                        <span>Cancelled</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </CardHeader>
            </Card>
          )}

          {/* Enhanced Search & Filters */}
          <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Intelligent Search */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search everything... (⌘+K for advanced)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyFilters();
                      } else if (e.key === 'Escape') {
                        setSearchTerm('');
                      }
                    }}
                    className="pl-10 pr-20 bg-white shadow-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 rounded border">⌘K</kbd>
                  </div>
                </div>

                {/* Smart Filters */}
                <SmartFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={clearFilters}
                  bookings={bookings}
                />
              </div>
            </CardContent>
          </Card>

          {/* Revolutionary Table */}
          <Card className="flex-1 shadow-xl border-0 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-gray-600">Loading bookings...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => fetchBookings()} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                </div>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 mb-4">No bookings found</p>
                  <p className="text-sm text-gray-500">
                    {searchTerm || Object.values(filters).some(f => Array.isArray(f) ? f.length > 0 : f !== null && f !== 'all') 
                      ? 'Try adjusting your search or filters' 
                      : 'Bookings will appear here when customers make reservations'}
                  </p>
                </div>
              </div>
            ) : (
              <BookingsTableAdvanced
                bookings={filteredBookings}
                selectedRows={selectedRows}
                onSelectedRowsChange={setSelectedRows}
                sortConfig={sortConfig}
                onSortChange={setSortConfig}
                onRowClick={handleRowClick}
                onBulkAction={handleBulkAction}
                onConfirmOrder={handleConfirmOrder}
                onCancelOrder={handleCancelOrder}
                ref={tableRef}
              />
            )}
          </Card>
        </motion.div>

        {/* Revolutionary Detail Pane */}
        <AnimatePresence>
          {isDetailPaneOpen && selectedBooking && (
              <BookingDetailPaneAdvanced
              booking={selectedBooking}
              onClose={() => {
                setIsDetailPaneOpen(false);
                setSelectedBooking(null);
              }}
              onEdit={handleEdit}
              onAccept={(b) => handleConfirmOrder(b.id)}
              
            />
          )}
        </AnimatePresence>

        {/* Command Palette */}
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          bookings={filteredBookings}
          onSelectBooking={handleRowClick}
          onApplyFilter={setFilters}
        />

        {/* Beautiful Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmationModal.onConfirm}
          title={confirmationModal.title}
          message={confirmationModal.message}
          confirmText={confirmationModal.confirmText}
          cancelText={confirmationModal.cancelText}
          type={confirmationModal.type}
          bookingDetails={confirmationModal.bookingDetails}
        />

        {/* Toast Notifications */}
        <ToastNotification
          isVisible={toast.isVisible}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
          type={toast.type}
          title={toast.title}
          message={toast.message}
        />

        {/* Booking Form Dialog */}
        <AdminBookingForm
          isOpen={showBookingForm}
          onClose={() => setShowBookingForm(false)}
          onSuccess={(newBooking) => {
            setShowBookingForm(false);
            // Refresh bookings data
            fetchBookings(true);
            // Show success toast
            setToast({
              isVisible: true,
              type: 'success',
              title: formMode === 'create' ? 'Booking Created!' : 'Booking Updated!',
              message: `${formMode === 'create' ? 'Created' : 'Updated'} booking for ${newBooking.customerName}`
            });
          }}
          initialData={formInitialData}
          mode={formMode}
        />
      </div>
    </TooltipProvider>
  );
}