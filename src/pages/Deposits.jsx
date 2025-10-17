import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, CheckCircle2, XCircle, RefreshCw, Filter, Calendar, DollarSign, User, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchQuotationsForCurrentUser } from '@/services/quotationService';

export default function Deposits() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | paid | unpaid
  const formatCurrency = (n) => `$${Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;

  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    try {
      setError(null);
      isRefresh ? setRefreshing(true) : setLoading(true);
      const token = localStorage.getItem('token');
      let hallOwnerId = user.id;
      if (user.role === 'sub_user' && user.parentUserId) hallOwnerId = user.parentUserId;

      const res = await fetch(`/api/bookings/hall-owner/${hallOwnerId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`${res.status} ${res.statusText} - ${data.message || 'Unknown error'}`);
      }
      const list = await res.json();
      // Keep only confirmed bookings with payment_details
      const withDeposits = list.filter(b => b.status === 'confirmed' && b.payment_details && typeof b.payment_details === 'object');
      setBookings(withDeposits);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchBookings(); }, [user?.id, fetchBookings]);

  // Load quotations for deposits tab
  useEffect(() => {
    const loadQuotes = async () => {
      if (!user?.id) return;
      try {
        setQuotesError(null);
        setQuotesLoading(true);
        const token = localStorage.getItem('token');
        const list = await fetchQuotationsForCurrentUser(token);
        // Only show quotations that have a non-zero deposit configured
        const withDeposits = (list || []).filter(q => {
          const p = q.payment_details || {};
          const dep = Number(p.deposit_amount ?? q.depositAmount ?? 0);
          return dep > 0;
        });
        setQuotes(withDeposits);
      } catch (e) {
        setQuotesError(e.message);
      } finally {
        setQuotesLoading(false);
      }
    };
    if (user?.id) loadQuotes();
  }, [user?.id]);

  const filtered = useMemo(() => {
    let data = bookings.slice();
    if (statusFilter !== 'all') {
      const wantPaid = statusFilter === 'paid';
      data = data.filter(b => Boolean(b.payment_details?.deposit_paid) === wantPaid);
    }
    if (query) {
      const q = query.toLowerCase();
      data = data.filter(b => (
        (b.bookingCode || '').toLowerCase().includes(q) ||
        (b.customerName || '').toLowerCase().includes(q) ||
        (b.customerEmail || '').toLowerCase().includes(q) ||
        (b.hallName || '').toLowerCase().includes(q)
      ));
    }
    // sort newest updated first
    return data.sort((a, b) => (new Date(b.updatedAt?.seconds ? b.updatedAt.seconds * 1000 : b.updatedAt || 0)) - (new Date(a.updatedAt?.seconds ? a.updatedAt.seconds * 1000 : a.updatedAt || 0)));
  }, [bookings, query, statusFilter]);

  const stats = useMemo(() => {
    const totals = bookings.reduce((acc, b) => {
      const p = b.payment_details || {};
      const dep = Number(p.deposit_amount || 0);
      const isPaid = Boolean(p.deposit_paid);
      acc.count++;
      acc.total += dep;
      if (isPaid) {
        acc.paidCount++;
        acc.paidTotal += dep;
      } else {
        acc.unpaidCount++;
        acc.unpaidTotal += dep;
      }
      return acc;
    }, { count: 0, total: 0, paidCount: 0, paidTotal: 0, unpaidCount: 0, unpaidTotal: 0 });
    return totals;
  }, [bookings]);

  const quotesFiltered = useMemo(() => {
    let data = quotes.slice();
    if (statusFilter !== 'all') {
      const wantPaid = statusFilter === 'paid';
      data = data.filter(q => Boolean(q.payment_details?.deposit_paid) === wantPaid);
    }
    if (query) {
      const qy = query.toLowerCase();
      data = data.filter(q => (
        (q.id || '').toLowerCase().includes(qy) ||
        (q.customerName || '').toLowerCase().includes(qy) ||
        (q.customerEmail || '').toLowerCase().includes(qy) ||
        (q.resourceName || q.resource || '').toLowerCase().includes(qy)
      ));
    }
    return data.sort((a, b) => (new Date(b.updatedAt || 0)) - (new Date(a.updatedAt || 0)));
  }, [quotes, query, statusFilter]);

  const toggleDepositPaid = useCallback(async (booking) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      const nextPaid = !Boolean(booking.payment_details?.deposit_paid);
      const newPayment = {
        ...booking.payment_details,
        deposit_paid: nextPaid,
        paid_at: nextPaid ? new Date().toISOString() : null,
      };
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_details: newPayment })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`${res.status} ${res.statusText} - ${data.message || 'Unknown error'}`);
      }
      // Optimistic update
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, payment_details: newPayment } : b));
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Small inline icon for header (receipt-like)
  const ReceiptIcon = () => (
    <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3h10a1 1 0 011 1v14l-3-2-3 2-3-2-3 2V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 7h6M9 10h6M9 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Creative gradient hero like Quotations page */}
      {/* Gradient hero with new palette (teal -> cyan -> indigo) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 via-cyan-50 to-indigo-50 p-6 border border-teal-100">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-100/10 via-cyan-100/10 to-indigo-100/10" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="h-7 w-7 text-teal-600" /> Deposits
              </h1>
            </div>
            <p className="mt-1 text-slate-600">Track, manage, and reconcile booking deposits</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code, customer, email, resource"
                className="pl-8 w-72 bg-white border-slate-200"
              />
            </div>
            <Button variant="outline" onClick={() => setStatusFilter(s => s === 'all' ? 'unpaid' : s === 'unpaid' ? 'paid' : 'all')} className="bg-white border-slate-200">
              <Filter className="h-4 w-4 mr-2" />
              {statusFilter === 'all' ? 'All' : statusFilter === 'paid' ? 'Paid' : 'Unpaid'}
            </Button>
            <Button variant="outline" onClick={() => fetchBookings(true)} disabled={refreshing} className="bg-white border-slate-200">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Quick stats like Quotations */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-teal-100 p-4 shadow-sm">
            <div className="text-xs text-slate-500">TOTAL DEPOSITS</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(stats.total)}</div>
            <div className="mt-1 text-xs text-slate-500">{stats.count} bookings</div>
          </div>
          <div className="rounded-xl bg-white border border-teal-100 p-4 shadow-sm">
            <div className="text-xs text-slate-500">PAID</div>
            <div className="mt-1 text-2xl font-bold text-teal-700">{formatCurrency(stats.paidTotal)}</div>
            <div className="mt-1 text-xs text-slate-500">{stats.paidCount} bookings</div>
          </div>
          <div className="rounded-xl bg-white border border-teal-100 p-4 shadow-sm">
            <div className="text-xs text-slate-500">UNPAID</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{formatCurrency(stats.unpaidTotal)}</div>
            <div className="mt-1 text-xs text-slate-500">{stats.unpaidCount} bookings</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="bookings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100/80 backdrop-blur border border-gray-200 rounded-xl p-1">
          <TabsTrigger 
            value="bookings" 
            className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            <ReceiptIcon />
            Web & Admin Bookings
          </TabsTrigger>
          <TabsTrigger 
            value="quotations" 
            className="flex items-center gap-2 text-gray-600 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
          >
            <DollarSign className="h-4 w-4" />
            Quotations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading deposits...
            </div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-slate-500">No deposits found.</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table className="text-xs md:text-sm [&>tbody>tr>td]:py-1.5 [&>tbody>tr>td]:px-2 [&>thead>tr>th]:py-2">
                <TableHeader className="sticky top-0 bg-white/90 backdrop-blur z-10">
                  <TableRow className="bg-slate-50/60">
                    <TableHead>
                      <div className="flex items-center gap-1"><ReceiptIcon /> Booking</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Customer</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Event / Date</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Resource</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3.5 w-3.5" /> Total</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3.5 w-3.5 text-blue-500" /> Deposit</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Final Due</div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(b => {
                    const p = b.payment_details || {};
                    const paid = Boolean(p.deposit_paid);
                    return (
                      <TableRow key={b.id} className="hover:bg-slate-50/70 hover:shadow-sm odd:bg-slate-50/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold">
                            <span className="inline-block bg-white border border-slate-200 rounded-md px-2 py-0.5 shadow-xs">
                              {b.bookingCode || b.id}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">{b.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" />{b.customerName}</div>
                          <div className="text-xs text-slate-500">{b.customerEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div>{b.eventType || 'Event'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {b.bookingDate} {b.startTime && b.endTime ? `• ${b.startTime}-${b.endTime}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] border border-slate-200">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />{b.hallName || b.selectedHall}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-block font-mono bg-white border border-slate-200 rounded-md px-2 py-0.5">
                            ${Number(p.total_amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-block font-mono bg-white border border-slate-200 rounded-md px-2 py-0.5">
                            ${Number(p.deposit_amount || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-block font-mono bg-white border border-slate-200 rounded-md px-2 py-0.5">
                            ${Number(p.final_due || 0).toLocaleString('en-AU', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {paid ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5" /> Paid
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" /> Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            className={`${paid ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-green-600 hover:bg-green-700'} h-7 px-2 py-0.5 text-xs rounded-md`}
                            onClick={() => toggleDepositPaid(b)}
                          >
                            {paid ? (
                              <><XCircle className="h-3.5 w-3.5 mr-1" />Mark Unpaid</>
                            ) : (
                              <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Mark Paid</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quotations" className="mt-3">
          {quotesLoading ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading quotation deposits...
            </div>
          ) : quotesError ? (
            <div className="text-red-600">{quotesError}</div>
          ) : quotesFiltered.length === 0 ? (
            <div className="text-slate-500">No quotation deposits yet.</div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table className="text-xs md:text-sm [&>tbody>tr>td]:py-1.5 [&>tbody>tr>td]:px-2 [&>thead>tr>th]:py-2">
                <TableHeader className="sticky top-0 bg-white/90 backdrop-blur z-10">
                  <TableRow className="bg-slate-50/60">
                    <TableHead>
                      <div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> Quotation</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Customer</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Event / Date</div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Resource</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3.5 w-3.5" /> Total</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3.5 w-3.5 text-blue-500" /> Deposit</div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center gap-1 justify-end"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Final Due</div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotesFiltered.map(q => {
                    const p = q.payment_details || {};
                    const total = Number(p.total_amount ?? q.totalInclGst ?? q.totalAmount ?? 0);
                    const dep = Number(p.deposit_amount ?? q.depositAmount ?? 0);
                    const due = Number(p.final_due ?? q.finalAmount ?? Math.max(0, total - dep));
                    const paid = Boolean(p.deposit_paid);
                    return (
                      <TableRow key={q.id} className="hover:bg-slate-50/70 hover:shadow-sm odd:bg-slate-50/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold">
                            <span className="inline-block bg-white border border-slate-200 rounded-md px-2 py-0.5 shadow-xs">{q.id}</span>
                          </div>
                          <div className="text-xs text-slate-500">Created {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ''}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400" />{q.customerName}</div>
                          <div className="text-xs text-slate-500">{q.customerEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div>{q.eventType || 'Event'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> {q.eventDate} {q.startTime && q.endTime ? `• ${q.startTime}-${q.endTime}` : ''}</div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] border border-slate-200">
                            <Building2 className="h-3.5 w-3.5 text-slate-500" />{q.resourceName || q.resource}
                          </span>
                        </TableCell>
                        <TableCell className="text-right"><span className="inline-block font-mono bg-white border border-slate-200 rounded-md px-2 py-0.5">${total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></TableCell>
                        <TableCell className="text-right"><span className="inline-block font-mono bg-white border border-slate-200 rounded-md px-2 py-0.5">${dep.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></TableCell>
                        <TableCell className="text-right"><span className="inline-block font-mono bg-white border border-slate-200 rounded-md px-2 py-0.5">${due.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span></TableCell>
                        <TableCell>
                          {paid ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200"><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5" />Deposit Paid</Badge>
                          ) : (
                            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">{q.status || 'Draft'}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


