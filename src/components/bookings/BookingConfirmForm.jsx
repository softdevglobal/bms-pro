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
  // Base amounts from Booking Details
  const baseExclGst = booking ? Number(booking.totalValue || 0) : 0;
  const gstAmount = Math.round((baseExclGst * gstRate) * 100) / 100;
  const amountInclGst = Math.round((baseExclGst + gstAmount) * 100) / 100;

  // Calculate deposit preview following selected tax mode
  const computeDeposit = () => {
    const val = Number(depositValue);
    if (!booking || Number.isNaN(val) || val <= 0) return 0;
    const selectedBase = taxType === 'inclusive'
      ? Math.round((Number(booking.totalValue || 0)) * 100) / 100
      : Math.round((Number(booking.totalValue || 0) * (1 + gstRate)) * 100) / 100;
    if (depositType === 'Percentage') {
      const pct = Math.max(0, Math.min(100, val));
      return Math.round((selectedBase * (pct / 100)) * 100) / 100;
    }
    return Math.round(val * 100) / 100;
  };

  const bookingTotalInclGst = booking
    ? Math.round((Number(booking.totalValue || 0) * (1 + gstRate)) * 100) / 100
    : 0;

  const depositPreview = computeDeposit();

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
        {/* Amount preview based on selected tax type */}
        <div className="mt-2 text-sm">
          {taxType === 'inclusive' ? (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Amount (incl. GST)</span>
              <span className="font-semibold">${baseExclGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Amount (excl. GST)</span>
              <span className="font-semibold">${amountInclGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
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
              {depositType === 'Percentage' 
                ? 'Percentage (%)' 
                : `Amount (${taxType === 'inclusive' ? 'GST incl.' : 'GST excl.'})`}
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
            <div className="text-sm text-gray-600">Deposit to charge ({taxType === 'inclusive' ? 'incl. GST' : 'excl. GST'})</div>
            <div className="mt-1 text-lg font-semibold">
              ${depositPreview.toLocaleString('en-AU', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-gray-500">
              {taxType === 'inclusive' ? 'Full amount incl. GST' : 'Full amount excl. GST'}: {
                (taxType === 'inclusive' ? baseExclGst : amountInclGst).toLocaleString('en-AU', { minimumFractionDigits: 2 })
              }
            </div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown - Compact */}
      <div className="border rounded-lg p-2.5 bg-blue-50 border-blue-200">
        <div className="text-sm font-semibold mb-2 text-blue-800">💰 Payment Summary</div>
        <div className="space-y-1">
          {/* GST Breakdown - Compact */}
          {taxType === 'inclusive' ? (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">GST Inclusive:</span>
                <span className="font-medium">${baseExclGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (10%):</span>
                <span className="font-medium">${gstAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Net (excl. GST):</span>
                <span className="font-medium">${(baseExclGst - gstAmount).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">GST Exclusive:</span>
                <span className="font-medium">${(baseExclGst / (1 + gstRate)).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (10%):</span>
                <span className="font-medium">${((baseExclGst / (1 + gstRate)) * gstRate).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total (incl. GST):</span>
                <span className="font-medium">${baseExclGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
          
          {/* Payment Details - Compact */}
          <div className="border-t border-blue-300 pt-2 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-blue-700 font-medium">Deposit:</span>
                <span className="font-semibold text-blue-800">${depositPreview.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Balance Due:</span>
                <span className="font-semibold text-green-700">${(amountInclGst - depositPreview).toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            {/* Final Total - Compact */}
            <div className="border-t border-blue-300 pt-2 mt-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-blue-800">Total Value:</span>
                <span className="text-blue-900">${amountInclGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })} AUD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmForm;

