import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { RoomBooking, Room, RoomBookingStatus } from '@/types/database';
import { formatCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PermissionButton } from '@/components/auth/PermissionButton';
import { toast } from '@/hooks/use-toast';
import { Plus, CalendarCheck, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  confirmed: 'bg-blue-500/10 text-blue-700 border-blue-200',
  checked_in: 'bg-green-500/10 text-green-700 border-green-200',
  checked_out: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-red-500/10 text-red-700 border-red-200',
  no_show: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
};

export default function RoomBookings() {
  const { business, branch, user } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['room-bookings', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_bookings')
        .select('*, rooms(*), customers(*)')
        .eq('business_id', business!.id)
        .order('check_in', { ascending: false });
      if (error) throw error;
      return data.map((b: any) => ({ ...b, room: b.rooms, customer: b.customers })) as unknown as RoomBooking[];
    },
    enabled: !!business?.id,
  });

  const { data: availableRooms = [] } = useQuery({
    queryKey: ['available-rooms', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('business_id', business!.id)
        .eq('status', 'available')
        .eq('is_active', true);
      if (error) throw error;
      return data as unknown as Room[];
    },
    enabled: !!business?.id && dialogOpen,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, name').eq('business_id', business!.id).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id && dialogOpen,
  });

  const createBooking = useMutation({
    mutationFn: async (booking: any) => {
      const num = `RB-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('room_bookings').insert([{
        ...booking,
        booking_number: num,
        business_id: business!.id,
        branch_id: branch!.id,
        created_by: user!.id,
      }]);
      if (error) throw error;
      await supabase.from('rooms').update({ status: 'reserved' } as any).eq('id', booking.room_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setDialogOpen(false);
      toast({ title: 'Booking created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status, roomId }: { id: string; status: string; roomId: string }) => {
      const updates: any = { status };
      if (status === 'checked_in') updates.actual_check_in = new Date().toISOString();
      if (status === 'checked_out') updates.actual_check_out = new Date().toISOString();
      const { error } = await supabase.from('room_bookings').update(updates).eq('id', id);
      if (error) throw error;
      const roomStatus = status === 'checked_in' ? 'occupied' : status === 'checked_out' ? 'cleaning' : status === 'cancelled' ? 'available' : undefined;
      if (roomStatus) {
        await supabase.from('rooms').update({ status: roomStatus } as any).eq('id', roomId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Booking updated' });
    },
  });

  const filtered = bookings.filter((b) => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (search && !b.booking_number.toLowerCase().includes(search.toLowerCase()) && !b.customer?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const canCreateBooking = canCreate('rooms.bookings');
  const canEditBooking = canEdit('rooms.bookings');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createBooking.mutate({
      room_id: fd.get('room_id'),
      customer_id: fd.get('customer_id') || null,
      check_in: fd.get('check_in'),
      check_out: fd.get('check_out'),
      guest_count: Number(fd.get('guest_count')) || 1,
      total_amount: Number(fd.get('total_amount')) || 0,
      advance_paid: Number(fd.get('advance_paid')) || 0,
      notes: fd.get('notes') || null,
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Bookings</h1>
          <p className="text-muted-foreground text-sm">Manage reservations and check-ins</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <PermissionButton permitted={canCreateBooking}><Plus className="h-4 w-4 mr-2" />New Booking</PermissionButton>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader><DialogTitle>New Room Booking</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Room</Label>
                <select name="room_id" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select room...</option>
                  {availableRooms.map((r) => <option key={r.id} value={r.id}>{r.name} (#{r.room_number})</option>)}
                </select>
              </div>
              <div>
                <Label>Customer</Label>
                <select name="customer_id" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Walk-in guest</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Check-in</Label><Input name="check_in" type="date" required /></div>
                <div><Label>Check-out</Label><Input name="check_out" type="date" required /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Guests</Label><Input name="guest_count" type="number" defaultValue={1} min={1} /></div>
                <div><Label>Total</Label><Input name="total_amount" type="number" step="0.01" required /></div>
                <div><Label>Advance</Label><Input name="advance_paid" type="number" step="0.01" defaultValue={0} /></div>
              </div>
              <div><Label>Notes</Label><Textarea name="notes" /></div>
              <Button type="submit" className="w-full" disabled={createBooking.isPending}>Create Booking</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input placeholder="Search booking # or customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] as RoomBookingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Loading bookings...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CalendarCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No bookings found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Room</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="hidden sm:table-cell">Check-out</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.booking_number}</TableCell>
                  <TableCell>{b.room?.name || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell">{b.customer?.name || 'Walk-in'}</TableCell>
                  <TableCell>{format(new Date(b.check_in), 'MMM d')}</TableCell>
                  <TableCell className="hidden sm:table-cell">{format(new Date(b.check_out), 'MMM d')}</TableCell>
                  <TableCell>{formatCurrency(b.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[b.status || 'confirmed']}>
                      {b.status?.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {b.status === 'confirmed' && canEditBooking && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: 'checked_in', roomId: b.room_id })}>
                          <LogIn className="h-3 w-3 mr-1" />In
                        </Button>
                      )}
                      {b.status === 'checked_in' && canEditBooking && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: 'checked_out', roomId: b.room_id })}>
                          <LogOut className="h-3 w-3 mr-1" />Out
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
