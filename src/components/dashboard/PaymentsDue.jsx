import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../../utils/dateTimeUtils';

const PaymentsDue = ({ payments, userSettings }) => {
  const sortedPayments = [...payments].sort((a, b) => {
    if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
    if (a.status !== 'Overdue' && b.status === 'Overdue') return 1;
    return new Date(a.due) - new Date(b.due);
  });

  return (
    <Card variant="transparent" className="h-full rounded-2xl shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Payments Due
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedPayments.length > 0 ? (
          <div className="space-y-2">
            {sortedPayments.map((payment, index) => (
              <React.Fragment key={payment.invoice}>
                <div className="flex items-start justify-between gap-2 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate text-sm" title={payment.customer}>{payment.customer}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0 mt-0.5">
                      <a
                        className="truncate max-w-[180px] text-blue-600 hover:underline"
                        href={`/invoices#${encodeURIComponent(payment.invoiceId || payment.invoice)}`}
                        title={payment.invoice}
                      >
                        {payment.invoice}
                      </a>
                      <span className="font-medium text-gray-700 whitespace-nowrap">{payment.type}</span>
                    </div>
                    <div className="mt-0.5">
                      <Badge variant={payment.status === 'Overdue' ? 'destructive' : 'outline'} className="text-xs py-0">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-[110px]">
                    <p className="font-bold text-base text-gray-900 whitespace-nowrap">
                      {formatCurrency(payment.amountAud, userSettings?.currency || 'AUD')}
                    </p>
                  </div>
                </div>
                {index < sortedPayments.length - 1 && <hr className="border-gray-200" />}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>No payments due.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentsDue;