import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock3, ArrowRight } from 'lucide-react';

const getExpiryBadgeVariant = (expiresIn) => {
  const hours = parseInt(expiresIn.split('h')[0], 10);
  if (hours < 2) return 'destructive';
  if (hours < 12) return 'warning';
  return 'secondary';
};

const HoldsExpiring = ({ holds }) => {
  const navigate = useNavigate();

  return (
    <Card variant="transparent" className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-blue-600" />
          Holds Expiring Soon
        </CardTitle>
      </CardHeader>
      <CardContent>
        {holds.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Expires In</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holds.map((hold) => (
                <TableRow key={hold.booking}>
                  <TableCell>
                    <div className="font-bold">{hold.customer}</div>
                    <div className="text-sm text-gray-500">{hold.resource}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getExpiryBadgeVariant(hold.expiresIn)}>{hold.expiresIn}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/bookingsholds')}
                      className="h-8"
                    >
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10 text-gray-500">
            <p>No holds are expiring soon.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HoldsExpiring;