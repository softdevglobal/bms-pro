import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BookingConfirmForm from './BookingConfirmForm';

/**
 * BookingConfirmDialog
 * Reusable dialog that wraps BookingConfirmForm and standard actions
 */
const BookingConfirmDialog = ({
  open,
  onOpenChange,
  booking,
  taxType,
  onTaxTypeChange,
  depositType,
  onDepositTypeChange,
  depositValue,
  onDepositValueChange,
  onConfirm
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Confirm Booking</DialogTitle>
          <DialogDescription>
            {booking ? `Are you sure you want to confirm the booking for ${booking.customer?.name || 'this customer'}?` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          {booking && (
            <BookingConfirmForm
              booking={booking}
              taxType={taxType}
              onTaxTypeChange={onTaxTypeChange}
              depositType={depositType}
              onDepositTypeChange={onDepositTypeChange}
              depositValue={depositValue}
              onDepositValueChange={onDepositValueChange}
            />
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={onConfirm} disabled={!booking}>
            Confirm Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmDialog;


