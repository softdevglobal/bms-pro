import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calculator,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { createAdminBooking, fetchResources, fetchBookingsForCalendar, updateBooking } from "@/services/bookingService";
import { getDataUserId } from "@/services/userService";
import { fetchPricing, getPricingForResource, calculatePrice } from "@/services/pricingService";

export default function AdminBookingForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData = null,
  mode = 'create' // 'create' or 'edit'
}) {
  const { user, parentUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resources, setResources] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [pricingData, setPricingData] = useState([]);
  const [calculatedPriceInfo, setCalculatedPriceInfo] = useState(null);
  // Resource multiselect UI state
  const [resourceOpen, setResourceOpen] = useState(false);
  const [resourceQuery, setResourceQuery] = useState('');
  const resourceRef = useRef(null);
  
  // Form state
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    eventType: '',
    selectedHall: '',
    selectedHalls: [],
    bookingDate: '',
    startTime: '',
    endTime: '',
    additionalDescription: '',
    estimatedPrice: '',
    guestCount: '',
    status: 'pending'
  });

  // Event types options
  const eventTypes = [
    'Wedding',
    'Birthday Party',
    'Corporate Event',
    'Conference',
    'Meeting',
    'Anniversary',
    'Graduation',
    'Baby Shower',
    'Bridal Shower',
    'Funeral',
    'Community Event',
    'Other'
  ];

  // Status options
  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
    { value: 'tentative', label: 'Tentative', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
    { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' }
  ];

  // Fetch resources and pricing on component mount
  useEffect(() => {
    const fetchResourcesData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const resourcesData = await fetchResources(token);
          setResources(resourcesData);
          
          // Fetch pricing data
          try {
            const pricing = await fetchPricing(token);
            setPricingData(pricing);
          } catch (pricingErr) {
            console.error('Error fetching pricing:', pricingErr);
          }
        }
      } catch (err) {
        console.error('Error fetching resources:', err);
      }
    };

    if (isOpen) {
      fetchResourcesData();
    }
  }, [isOpen]);

  // Initialize form data when dialog opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          customerName: initialData.customerName || '',
          customerEmail: initialData.customerEmail || '',
          customerPhone: initialData.customerPhone || '',
          eventType: initialData.eventType || '',
          selectedHall: initialData.selectedHall || '',
          selectedHalls: Array.isArray(initialData.selectedHalls) && initialData.selectedHalls.length > 0
            ? initialData.selectedHalls
            : (initialData.selectedHall ? [initialData.selectedHall] : []),
          bookingDate: initialData.bookingDate || '',
          startTime: initialData.startTime || '',
          endTime: initialData.endTime || '',
          additionalDescription: initialData.additionalDescription || '',
          estimatedPrice: initialData.estimatedPrice || '',
          guestCount: initialData.guestCount || '',
          status: initialData.status || 'pending'
        });
      } else {
        // Reset form for new booking
        setFormData({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          eventType: '',
          selectedHall: '',
          selectedHalls: [],
          bookingDate: '',
          startTime: '',
          endTime: '',
          additionalDescription: '',
          estimatedPrice: '',
          guestCount: '',
          status: 'pending'
        });
      }
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, initialData]);

  // Calculate price when relevant fields change
  useEffect(() => {
    if (formData.selectedHall && formData.bookingDate && formData.startTime && formData.endTime && pricingData.length > 0) {
      const pricing = getPricingForResource(pricingData, formData.selectedHall);
      if (pricing) {
        const priceInfo = calculatePrice(pricing, formData.bookingDate, formData.startTime, formData.endTime);
        setCalculatedPriceInfo(priceInfo);
      } else {
        setCalculatedPriceInfo(null);
      }
    } else {
      setCalculatedPriceInfo(null);
    }
  }, [formData.selectedHall, formData.bookingDate, formData.startTime, formData.endTime, pricingData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Check for conflicts when date, time, or hall changes
    if (['bookingDate', 'startTime', 'endTime', 'selectedHall', 'selectedHalls'].includes(field)) {
      // Keep selectedHalls in sync when primary hall changes
      if (field === 'selectedHall') {
        setFormData(prev => {
          const nextList = prev.selectedHalls && prev.selectedHalls.length > 0
            ? (prev.selectedHalls.includes(value) ? prev.selectedHalls : [value, ...prev.selectedHalls])
            : (value ? [value] : []);
          return { ...prev, selectedHalls: nextList };
        });
      }
      checkForConflicts();
    }
  };

  const toggleAdditionalResource = (resId) => {
    setFormData(prev => {
      const exists = prev.selectedHalls.includes(resId);
      const next = exists ? prev.selectedHalls.filter(id => id !== resId) : [...prev.selectedHalls, resId];
      // Ensure primary selectedHall remains part of the list
      const normalized = prev.selectedHall ? (next.includes(prev.selectedHall) ? next : [prev.selectedHall, ...next]) : next;
      return {
        ...prev,
        selectedHalls: normalized,
        selectedHall: normalized[0] || ''
      };
    });
    checkForConflicts();
  };

  // Check for booking conflicts
  // Calculate duration in hours
  const calculateDuration = () => {
    if (!formData.startTime || !formData.endTime) return 0;
    
    const startTimeObj = new Date(`2000-01-01T${formData.startTime}:00`);
    const endTimeObj = new Date(`2000-01-01T${formData.endTime}:00`);
    const durationMs = endTimeObj.getTime() - startTimeObj.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    
    return Math.max(0, durationHours);
  };

  const checkForConflicts = async () => {
    if (!formData.bookingDate || !formData.startTime || !formData.endTime || (formData.selectedHalls || []).length === 0) {
      setConflicts([]);
      return;
    }

    try {
      setCheckingConflicts(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const dataUserId = getDataUserId(user, parentUserData);
      const existingBookings = await fetchBookingsForCalendar(dataUserId, token);
      
      const startTimeObj = new Date(`2000-01-01T${formData.startTime}:00`);
      const endTimeObj = new Date(`2000-01-01T${formData.endTime}:00`);
      
      const conflictingBookings = existingBookings.filter(booking => {
        // Skip if it's the same booking (for edit mode)
        if (initialData && booking.id === initialData.id) return false;
        
        // Check if same date and any selected resource intersects
        if (booking.bookingDate !== formData.bookingDate) return false;
        const bookingResources = (booking.selectedHalls && booking.selectedHalls.length > 0)
          ? booking.selectedHalls
          : (booking.selectedHall ? [booking.selectedHall] : []);
        const intersects = bookingResources.some(r => formData.selectedHalls.includes(r));
        if (!intersects) return false;
        
        // Check if status is active (pending or confirmed)
        if (!['pending', 'confirmed', 'PENDING', 'CONFIRMED'].includes(booking.status)) {
          return false;
        }
        
        // Check for time overlap
        const existingStart = new Date(`2000-01-01T${booking.startTime}:00`);
        const existingEnd = new Date(`2000-01-01T${booking.endTime}:00`);
        
        return (startTimeObj < existingEnd && endTimeObj > existingStart);
      });
      
      setConflicts(conflictingBookings);
    } catch (err) {
      console.error('Error checking conflicts:', err);
    } finally {
      setCheckingConflicts(false);
    }
  };

  const validateForm = () => {
    const requiredFields = [
      'customerName',
      'customerEmail', 
      'customerPhone',
      'eventType',
      // at least one resource required; selectedHall maintained from first selection
      'selectedHall',
      'bookingDate',
      'startTime',
      'endTime'
    ];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        setError(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customerEmail)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate phone format (basic)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(formData.customerPhone.replace(/[\s\-\(\)]/g, ''))) {
      setError('Please enter a valid phone number');
      return false;
    }

    // Validate date is not in the past
    const bookingDate = new Date(formData.bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDate < today) {
      setError('Booking date cannot be in the past');
      return false;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.startTime) || !timeRegex.test(formData.endTime)) {
      setError('Please enter valid times in HH:MM format');
      return false;
    }

    // Validate end time is after start time
    const startTimeObj = new Date(`2000-01-01T${formData.startTime}:00`);
    const endTimeObj = new Date(`2000-01-01T${formData.endTime}:00`);
    
    if (endTimeObj <= startTimeObj) {
      setError('End time must be after start time');
      return false;
    }

    // Validate at least one resource chosen
    if (!formData.selectedHalls || formData.selectedHalls.length === 0) {
      setError('Please select at least one resource');
      return false;
    }

    // Check for conflicts
    if (conflicts.length > 0) {
      setError(`Time slot conflicts with existing booking(s). Please choose a different time.`);
      return false;
    }

    return true;
  };

  // Fancy resource dropdown helpers (search + outside click to close)
  const filteredResources = useMemo(() => {
    const q = resourceQuery.trim().toLowerCase();
    if (!q) return resources;
    return resources.filter(r =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q) ||
      (r.code || '').toLowerCase().includes(q)
    );
  }, [resources, resourceQuery]);

  useEffect(() => {
    function onClick(e) {
      if (resourceOpen && resourceRef.current && !resourceRef.current.contains(e.target)) {
        setResourceOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setResourceOpen(false);
    }
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [resourceOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare booking data
      const bookingData = {
        ...formData,
        selectedHalls: formData.selectedHalls,
        estimatedPrice: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : null,
        guestCount: formData.guestCount ? parseInt(formData.guestCount) : null
      };

      // Debug: Log the date being sent
      console.log('Admin booking form - Date being sent:', {
        originalDate: formData.bookingDate,
        dateType: typeof formData.bookingDate,
        dateValue: formData.bookingDate
      });

      let savedBooking = null;
      if (mode === 'edit' && initialData?.id) {
        // Perform update
        savedBooking = await updateBooking(initialData.id, bookingData, token);
      } else {
        const result = await createAdminBooking(bookingData, token);
        savedBooking = result.booking;
      }
      
      setSuccess(true);
      
      // Show success message with calculated price
      const successMessage = savedBooking?.calculatedPrice 
        ? `Booking ${mode === 'edit' ? 'updated' : 'created'} successfully! Total cost: $${savedBooking.calculatedPrice.toFixed(2)}`
        : `Booking ${mode === 'edit' ? 'updated' : 'created'} successfully!`;
      
      console.log(successMessage);
      
      // Call success callback after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess(savedBooking || {});
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {mode === 'create' ? 'Create New Booking' : 'Edit Booking'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Create a new booking for a customer. All fields marked with * are required.'
              : 'Edit the booking details below.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email Address *</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                    placeholder="customer@example.com"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestCount">Number of Guests</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    min="1"
                    value={formData.guestCount}
                    onChange={(e) => handleInputChange('guestCount', e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Event Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Select value={formData.eventType} onValueChange={(value) => handleInputChange('eventType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2" ref={resourceRef}>
                  <Label>Halls/Resources *</Label>
                  <button
                    type="button"
                    onClick={() => setResourceOpen(v => !v)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-left hover:border-gray-400 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {formData.selectedHalls.length === 0 && (
                        <span className="text-sm text-gray-500">Select one or more resources</span>
                      )}
                      {formData.selectedHalls.map((rid) => {
                        const r = resources.find(x => x.id === rid);
                        return (
                          <span key={rid} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-full px-2 py-1">
                            <span className="font-medium">{r?.name || rid}</span>
                            <button
                              type="button"
                              className="ml-1 text-blue-700 hover:text-blue-900"
                              onClick={(e) => { e.stopPropagation(); toggleAdditionalResource(rid); }}
                              aria-label="Remove"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </button>
                  {resourceOpen && (
                    <div className="relative">
                      <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-gray-200 bg-gray-50">
                          <Input
                            value={resourceQuery}
                            onChange={(e) => setResourceQuery(e.target.value)}
                            placeholder="Search resources..."
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="max-h-64 overflow-auto">
                          {filteredResources.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">No matches</div>
                          )}
                          <ul className="divide-y divide-gray-100">
                            {filteredResources.map((r) => (
                              <li key={r.id}>
                                <button
                                  type="button"
                                  onClick={() => toggleAdditionalResource(r.id)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 border rounded-sm flex items-center justify-center">
                                      {formData.selectedHalls.includes(r.id) && (
                                        <span className="w-3 h-3 bg-blue-600 inline-block rounded-sm" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-[#181411] truncate">{r.name}</div>
                                      <div className="text-xs text-gray-600 flex gap-3 mt-0.5">
                                        <span className="capitalize">{r.type}</span>
                                        {typeof r.capacity === 'number' && <span>{r.capacity} ppl</span>}
                                        {r.code && <span className="font-mono">#{r.code}</span>}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-2 border-t border-gray-200 bg-gray-50 text-right">
                          <Button type="button" variant="secondary" onClick={() => setResourceOpen(false)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Keep primary selectedHall in sync with first selected */}
                  {formData.selectedHalls.length > 0 && formData.selectedHall !== formData.selectedHalls[0] && (
                    <input type="hidden" value={formData.selectedHalls[0]} readOnly />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalDescription">Additional Description</Label>
                <Textarea
                  id="additionalDescription"
                  value={formData.additionalDescription}
                  onChange={(e) => handleInputChange('additionalDescription', e.target.value)}
                  placeholder="Any special requirements, setup needs, or additional information..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date & Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingDate">Booking Date *</Label>
                <Input
                  id="bookingDate"
                  type="date"
                  value={formData.bookingDate}
                  onChange={(e) => handleInputChange('bookingDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedPrice">Estimated Price</Label>
                  <Input
                    id="estimatedPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimatedPrice}
                    onChange={(e) => handleInputChange('estimatedPrice', e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    If provided, this overrides the auto-calculated price and becomes the final bill total.
                  </p>
                  
                  {/* Price Preview */}
                  {formData.selectedHalls.length > 0 && formData.startTime && formData.endTime && formData.bookingDate && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Calculator className="h-4 w-4" />
                        <span className="text-sm font-medium">Auto-Generated Price (by resource)</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {formData.selectedHalls.map((rid) => {
                          const pricing = getPricingForResource(pricingData, rid);
                          if (!pricing) return (
                            <div key={rid} className="text-xs text-blue-700">
                              {resources.find(r => r.id === rid)?.name || rid}: No pricing configured
                            </div>
                          );
                          const info = calculatePrice(pricing, formData.bookingDate, formData.startTime, formData.endTime);
                          return (
                            <div key={rid} className="flex justify-between items-center text-sm">
                              <span className="text-blue-800">{resources.find(r => r.id === rid)?.name || rid}</span>
                              <span className="font-semibold text-blue-900">${(info?.calculatedPrice || 0).toFixed(2)}</span>
                            </div>
                          );
                        })}
                        {formData.selectedHalls.length > 1 && (
                          <div className="border-t border-blue-300 pt-2 mt-2 flex justify-between items-center font-semibold text-blue-900">
                            <span>Total Estimated:</span>
                            <span>
                              ${
                                formData.selectedHalls.reduce((sum, rid) => {
                                  const pricing = getPricingForResource(pricingData, rid);
                                  const info = pricing ? calculatePrice(pricing, formData.bookingDate, formData.startTime, formData.endTime) : null;
                                  return sum + (info?.calculatedPrice || 0);
                                }, 0).toFixed(2)
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Initial Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={option.color}>
                              {option.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts Display */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Time slot conflicts with existing bookings:</p>
                  {conflicts.map((conflict, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border border-red-200">
                      <p><strong>Customer:</strong> {conflict.customer}</p>
                      <p><strong>Time:</strong> {conflict.startTime} - {conflict.endTime}</p>
                      <p><strong>Event:</strong> {conflict.eventType}</p>
                      <p><strong>Status:</strong> 
                        <Badge className={`ml-2 ${
                          conflict.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          conflict.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {conflict.status}
                        </Badge>
                      </p>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Booking created successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="mr-2 h-4 w-4" />
                  {mode === 'create' ? 'Create Booking' : 'Update Booking'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
