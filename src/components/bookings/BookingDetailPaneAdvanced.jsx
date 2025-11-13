import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  X,
  Calendar,
  Clock,
  Users,
  DollarSign,
  User,
  Hash,
  Info,
  CheckCircle,
  Edit,
  FileText,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const DetailRow = ({ icon: Icon, label, value, children }) => (
  <div className="flex items-start gap-4 py-3">
    <Icon className="h-5 w-5 mt-1 text-gray-500 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {value && <p className="text-base text-gray-900">{value}</p>}
      {children}
    </div>
  </div>
);

const PaymentStatus = ({ label, amount, status }) => {
  const statusMap = {
    paid: { text: 'Paid', color: 'bg-green-100 text-green-800' },
    pending: { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
    overdue: { text: 'Overdue', color: 'bg-red-100 text-red-800' },
  };
  const currentStatus = statusMap[status] || { text: 'N/A', color: 'bg-gray-100 text-gray-800' };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium">${amount.toLocaleString('en-AU')}</span>
        <Badge variant="outline" className={currentStatus.color}>{currentStatus.text}</Badge>
      </div>
    </div>
  );
};

const BookingDetailPaneAdvanced = ({ booking, onClose, onEdit, onSendPayLink, sendingPayLink = false, onAccept }) => {
  const navigate = useNavigate();
  // Debug: Log booking data to see what's available
  console.log('BookingDetailPaneAdvanced - booking data:', {
    id: booking?.id,
    bookingCode: booking?.bookingCode,
    customerName: booking?.customerName
  });

  const paneVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: '0%', opacity: 1 },
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: 'bg-orange-100 text-orange-800',
      tentative: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      PENDING_REVIEW: 'bg-orange-100 text-orange-800',
      TENTATIVE: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    const cls = map[status] || 'bg-gray-100 text-gray-800';
    const text = (status || 'unknown').toString().replace(/_/g, ' ').toLowerCase();
    return <Badge variant="outline" className={`capitalize ${cls}`}>{text}</Badge>;
  };

  const customerInitials = (booking?.customer?.name || '')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Prefer unified payment_details if present (from backend on confirmation)
  const paymentDetails = booking?.payment_details || {};
  const totalInclGst = typeof paymentDetails.total_amount === 'number'
    ? paymentDetails.total_amount
    : (booking.calculatedPrice || booking.totalValue || 0);
  // Resolve GST rate percentage from system-provided rate first, otherwise derive from amounts
  const gstPercent = (() => {
    const systemRate = Number(paymentDetails?.tax?.tax_rate ?? booking?.taxRate);
    if (Number.isFinite(systemRate)) return systemRate;
    const taxAmt = Number(paymentDetails?.tax?.tax_amount);
    if (Number.isFinite(taxAmt)) {
      const sub = Math.max(0, totalInclGst - taxAmt);
      if (sub > 0) return Math.round((taxAmt / sub) * 100);
    }
    return 10;
  })();
  const taxAmount = typeof paymentDetails?.tax?.tax_amount === 'number'
    ? paymentDetails.tax.tax_amount
    : (totalInclGst - (totalInclGst / (1 + (gstPercent / 100))));
  const taxTypeResolved = paymentDetails?.tax?.tax_type || booking.taxType || 'Inclusive';
  const isExclusiveTax = String(taxTypeResolved || '').toLowerCase() === 'exclusive';
  const subtotalResolved = (typeof paymentDetails?.tax?.tax_amount === 'number')
    ? (totalInclGst - taxAmount)
    : (taxTypeResolved === 'Exclusive'
        ? totalInclGst
        : (totalInclGst / (1 + (gstPercent / 100))));
  const depositAmount = (typeof paymentDetails?.deposit_amount === 'number')
    ? paymentDetails.deposit_amount
    : (typeof booking.depositAmount === 'number' ? booking.depositAmount : 0);
  const depositPaid = Boolean(paymentDetails?.deposit_paid);
  const finalDueResolved = (typeof paymentDetails?.final_due === 'number')
    ? paymentDetails.final_due
    : Math.max(0, totalInclGst - (depositAmount || 0));
  const paidRatio = Math.max(0, Math.min(1, totalInclGst > 0 ? (depositAmount || 0) / totalInclGst : 0));

  return (
    <motion.div
      variants={paneVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white border-l shadow-2xl z-20 flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Booking Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail pane">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Creative Header */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600" />
          <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize:'16px 16px'}} />
          <div className="relative p-5 text-white flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold flex-shrink-0">
              {customerInitials || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-lg sm:text-xl font-bold truncate" title={booking.purpose}>{booking.purpose}</h3>
                {getStatusBadge(booking.status)}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/95 mt-1">
                <User className="h-3.5 w-3.5 opacity-90" />
                <span className="whitespace-normal break-words truncate" title={booking.customer.name}>{booking.customer.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-1 rounded">
                  <Building2 className="h-3 w-3" /> {booking.resource}
                </span>
                <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-1 rounded">
                  <Calendar className="h-3 w-3" /> {format(booking.start, 'dd MMM yyyy')}
                </span>
                <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-1 rounded">
                  <Clock className="h-3 w-3" /> {format(booking.start, 'HH:mm')}–{format(booking.end, 'HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Details */}
        <div className="border rounded-xl p-4 bg-white/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Booking Reference */}
            <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Hash className="h-4 w-4" />
                  <span>Booking Reference</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => navigator.clipboard.writeText(booking.bookingCode)}
                >
                  Copy
                </Button>
              </div>
              <div className="text-sm font-mono break-all text-gray-800">
                {booking.bookingCode || 'No booking code available'}
              </div>
            </div>

            {/* Date */}
            <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </div>
              <div className="text-sm text-gray-900">{format(booking.start, 'eeee, dd MMMM yyyy')}</div>
            </div>

            {/* Time */}
            <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Clock className="h-4 w-4" />
                <span>Time</span>
              </div>
              <div className="text-sm text-gray-900">{format(booking.start, 'HH:mm')} - {format(booking.end, 'HH:mm')}</div>
            </div>

            {/* Guests */}
            <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Users className="h-4 w-4" />
                <span>Guests</span>
              </div>
              <div className="text-sm text-gray-900">{booking.guests}</div>
            </div>

            {/* Assigned To */}
            <div className="rounded-lg border bg-gradient-to-br from-gray-50 to-white p-3">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <User className="h-4 w-4" />
                <span>Assigned To</span>
              </div>
              <div className="text-sm text-gray-900">{booking.assignedTo}</div>
            </div>
          </div>
        </div>

        {/* Customer Intelligence */}
        <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-3 text-gray-800">Customer Snapshot</h4>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Tier:</span>
                    <Badge variant="secondary" className="capitalize">{booking.customer.tier}</Badge>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Total Bookings:</span>
                    <span>{booking.customer.bookingHistory}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Lifetime Value:</span>
                    <span className="font-medium">${booking.customer.totalSpent.toLocaleString('en-AU')}</span>
                </div>
                <div className="pt-3 flex gap-2">
                  {booking.customer.email && (
                    <a href={`mailto:${booking.customer.email}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
                      <Mail className="h-3 w-3" /> Email
                    </a>
                  )}
                  {booking.customerPhone && (
                    <a href={`tel:${booking.customerPhone}`} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
                      <Phone className="h-3 w-3" /> Call
                    </a>
                  )}
                </div>
            </div>
        </div>

        {/* Financials */}
        <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" />Payment Breakdown</h4>
            <div className="space-y-2">
                {/* Price Breakdown - Show GST details only for confirmed/completed bookings */}
                {booking.status === 'pending' || booking.status === 'PENDING_REVIEW' ? (
                  // For pending bookings, show only base price
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base Price:</span>
                      <span className="font-semibold text-gray-900">${(booking.calculatedPrice || booking.totalValue || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD</span>
                    </div>
                  </div>
                ) : (
                  // For confirmed/completed bookings, show full GST breakdown
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="text-gray-900">${subtotalResolved.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST ({gstPercent}%):</span>
                      <span className="text-gray-900">${Number(taxAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-700">Total (incl. GST):</span>
                      <span className="font-semibold text-green-600 text-base">${(totalInclGst).toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Tax Type:</span>
                      <span className="capitalize">{taxTypeResolved}</span>
                    </div>
                  </div>
                )}

                {/* Deposit and Balance Information */}
                {(depositAmount > 0 || (booking.depositType && booking.depositType !== 'None')) ? (
                  <div className="space-y-2 mt-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-blue-800 font-medium">💰 Deposit {booking.depositType ? `(${booking.depositType})` : ''}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-900">${(depositAmount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
                          <Badge variant="outline" className={`${depositPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'} text-xs`}>{depositPaid ? 'Paid' : 'Pending'}</Badge>
                        </div>
                      </div>
                      {(booking.depositType === 'Percentage' || (!booking.depositType && depositAmount && totalInclGst)) && (
                        <div className="text-xs text-blue-700">
                          {booking.depositType === 'Percentage' && booking.depositValue
                            ? `${booking.depositValue}%`
                            : `${Math.round(((depositAmount / (totalInclGst || 1)) * 100))}%`} of total amount (${isExclusiveTax ? 'GST exclusive' : 'GST inclusive'})
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-3 border-2 border-green-500">
                      <div className="flex justify-between items-center">
                        <span className="text-green-800 font-semibold text-sm">💳 Final Payment Due:</span>
                        <span className="font-bold text-green-900 text-lg">${(finalDueResolved).toFixed(2)} AUD</span>
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        Remaining payment after deposit
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="outline" className="bg-yellow-100 text-yellow-800">No Deposit</Badge>
                    </div>
                  </div>
                )}

                {/* Payment progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Payment Progress</span>
                    <span>{Math.round(paidRatio * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600" style={{width: `${Math.round(paidRatio * 100)}%`}} />
                  </div>
                </div>
                
                {/* Show booking source information */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Booking Source:</span>
                    <div className="flex items-center gap-2">
                      {booking.bookingSource === 'quotation' && booking.quotationId ? (
                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                          From Quotation {booking.quotationId}
                        </Badge>
                      ) : booking.bookingSource === 'admin' ? (
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                          Admin Panel
                        </Badge>
                      ) : booking.bookingSource === 'website' ? (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                          Website
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                          {booking.bookingSource || 'Direct'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {(booking.status === 'pending' || booking.status === 'PENDING_REVIEW') && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700">Decline</Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => onAccept && onAccept(booking)}>Accept Booking</Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl('Invoices'))}>
              <FileText className="mr-2 h-4 w-4" /> Invoice
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onEdit && onEdit(booking)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 border-t text-xs text-gray-500">
        Created {formatDistanceToNow(booking.createdAt, { addSuffix: true })}
      </div>
    </motion.div>
  );
};

export default BookingDetailPaneAdvanced;