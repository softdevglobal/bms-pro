import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default function Deposits() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Deposits</h1>
          <p className="text-slate-500">Track, manage, and reconcile booking deposits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Find Booking
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600">
            Coming soon: filters, outstanding deposits, recent payments, and reconciliation tools.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


