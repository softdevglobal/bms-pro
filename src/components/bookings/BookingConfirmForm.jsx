import React from 'react';
import TaxToggle from '../ui/TaxToggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';

/**
 * BookingConfirmForm - Reusable form component for confirming/accepting bookings
 * Includes Booking Details, Tax Calculation toggle and Deposit configuration
 */
const BookingConfirmForm = ({
  booking,
  taxType,
  onTaxTypeChange,
  depositType,
  onDepositTypeChange,
  depositValue,
  onDepositValueChange,
  gstRate = 0.1
}) => {
  // Calculate deposit preview
  const computeDepositInclGst = () => {
    const val = Number(depositValue);
    if (!booking || Number.isNaN(val) || val <= 0) return 0;
    const baseInclGst = Math.round((Number(booking.totalValue || 0) * (1 + gstRate)) * 100) / 100;
    if (depositType === 'Percentage') {
      const pct = Math.max(0, Math.min(100, val));
      return Math.round((baseInclGst * (pct / 100)) * 100) / 100;
    }
    return Math.round(val * 100) / 100;
  };

  const bookingTotalInclGst = booking
    ? Math.round((Number(booking.totalValue || 0) * (1 + gstRate)) * 100) / 100
    : 0;

  const depositPreview = computeDepositInclGst();

  return (
    <div className="space-y-2.5">
      {/* Booking Details Summary */}
      {booking && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="font-semibold text-green-800 mb-1.5 text-sm">Booking Details:</h4>
          <div className="text-sm space-y-0.5">
            <div><strong>Event:</strong> {booking.purpose || 'N/A'}</div>
            <div><strong>Date:</strong> {booking.start ? format(booking.start, 'dd MMM yyyy') : 'N/A'}</div>
            <div>
              <strong>Time:</strong> {booking.start && booking.end 
                ? `${format(booking.start, 'HH:mm')} - ${format(booking.end, 'HH:mm')}` 
                : 'N/A'}
            </div>
            <div><strong>Resource:</strong> {booking.resource || booking.resourceName || 'N/A'}</div>
            <div><strong>Guests:</strong> {booking.guests || 0}</div>
            <div><strong>Base Amount:</strong> ${(booking.totalValue || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      )}
      
      {/* Tax Calculation Toggle */}
      <div className="border rounded-lg p-2.5">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Tax Calculation</div>
          <TaxToggle 
            value={taxType} 
            onChange={onTaxTypeChange} 
          />
        </div>
      </div>

      {/* Deposit Configuration */}
      <div className="border rounded-lg p-2.5">
        <div className="text-sm font-semibold mb-2">Deposit</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
          {/* Type Selector */}
          <div>
            <label className="text-sm text-gray-600">Type</label>
            <Select value={depositType} onValueChange={onDepositTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixed">Fixed</SelectItem>
                <SelectItem value="Percentage">Percentage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value Input */}
          <div>
            <label className="text-sm text-gray-600">
              {depositType === 'Percentage' ? 'Percentage (%)' : 'Amount (GST incl.)'}
            </label>
            <Input
              className="mt-1"
              inputMode="decimal"
              placeholder={depositType === 'Percentage' ? 'e.g. 50' : 'e.g. 300.00'}
              value={depositValue}
              onChange={(e) => onDepositValueChange(e.target.value.replace(/[^0-9.]/g, ''))}
            />
          </div>

          {/* Preview */}
          <div>
            <div className="text-sm text-gray-600">Deposit to charge (incl. GST)</div>
            <div className="mt-1 text-lg font-semibold">
              ${depositPreview.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">
              Full amount incl. GST: ${bookingTotalInclGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmForm;

