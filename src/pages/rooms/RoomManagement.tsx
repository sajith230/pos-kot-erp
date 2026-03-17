import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Room, RoomType, RoomStatus } from '@/types/database';
import { formatCurrency } from '@/lib/formatCurrency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PermissionButton } from '@/components/auth/PermissionButton';
import { toast } from '@/hooks/use-toast';
import { Plus, BedDouble, Filter } from 'lucide-react';

const statusColors: Record<string, string> = {
  available: 'bg-green-500/10 text-green-700 border-green-200',
  occupied: 'bg-red-500/10 text-red-700 border-red-200',
  reserved: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  maintenance: 'bg-muted text-muted-foreground border-border',
  cleaning: 'bg-blue-500/10 text-blue-700 border-blue-200',
};

const roomTypes: RoomType[] = ['standard', 'deluxe', 'suite', 'premium'];
const roomStatuses: RoomStatus[] = ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'];

export default function RoomManagement() {
  const { business, branch } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('business_id', business!.id)
        .order('room_number');
      if (error) throw error;
      return data as unknown as Room[];
    },
    enabled: !!business?.id,
  });

  type RoomInput = { id?: string; name: string; room_number: string; room_type: 'standard' | 'deluxe' | 'suite' | 'premium'; floor: number; capacity: number; price_per_night: number; description: string | null };
  const upsertRoom = useMutation({
    mutationFn: async (room: { id?: string; name: string; room_number: string; room_type: string; floor: number; capacity: number; price_per_night: number; description: string | null }) => {
      if (room.id) {
        const { id, ...rest } = room;
        const { error } = await supabase.from('rooms').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rooms').insert([{
          ...room,
          business_id: business!.id,
          branch_id: branch!.id,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setDialogOpen(false);
      setEditRoom(null);
      toast({ title: editRoom ? 'Room updated' : 'Room created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('rooms').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Status updated' });
    },
  });

  const filtered = rooms.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType !== 'all' && r.room_type !== filterType) return false;
    return true;
  });

  const stats = {
    total: rooms.length,
    available: rooms.filter((r) => r.status === 'available').length,
    occupied: rooms.filter((r) => r.status === 'occupied').length,
    reserved: rooms.filter((r) => r.status === 'reserved').length,
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsertRoom.mutate({
      ...(editRoom?.id ? { id: editRoom.id } : {}),
      name: fd.get('name') as string,
      room_number: fd.get('room_number') as string,
      room_type: fd.get('room_type') as string,
      floor: Number(fd.get('floor')) || 1,
      capacity: Number(fd.get('capacity')) || 2,
      price_per_night: Number(fd.get('price_per_night')) || 0,
      description: (fd.get('description') as string) || null,
    });
  }

  const canCreateRoom = canCreate('rooms');
  const canEditRoom = canEdit('rooms');

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Management</h1>
          <p className="text-muted-foreground text-sm">Manage hotel rooms and availability</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditRoom(null); }}>
          <DialogTrigger asChild>
            <PermissionButton permitted={canCreateRoom}><Plus className="h-4 w-4 mr-2" />Add Room</PermissionButton>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader><DialogTitle>{editRoom ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required defaultValue={editRoom?.name || ''} /></div>
                <div><Label htmlFor="room_number">Room #</Label><Input id="room_number" name="room_number" required defaultValue={editRoom?.room_number || ''} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <select name="room_type" defaultValue={editRoom?.room_type || 'standard'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {roomTypes.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div><Label htmlFor="floor">Floor</Label><Input id="floor" name="floor" type="number" defaultValue={editRoom?.floor || 1} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="capacity">Capacity</Label><Input id="capacity" name="capacity" type="number" defaultValue={editRoom?.capacity || 2} /></div>
                <div><Label htmlFor="price_per_night">Price/Night</Label><Input id="price_per_night" name="price_per_night" type="number" step="0.01" defaultValue={editRoom?.price_per_night || 0} /></div>
              </div>
              <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editRoom?.description || ''} /></div>
              <Button type="submit" className="w-full" disabled={upsertRoom.isPending}>{editRoom ? 'Update' : 'Create'} Room</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rooms', value: stats.total, color: 'text-foreground' },
          { label: 'Available', value: stats.available, color: 'text-green-600' },
          { label: 'Occupied', value: stats.occupied, color: 'text-red-600' },
          { label: 'Reserved', value: stats.reserved, color: 'text-yellow-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {roomStatuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {roomTypes.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Loading rooms...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <BedDouble className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No rooms found. Add your first room to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((room) => (
            <Card key={room.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{room.name}</CardTitle>
                  <Badge variant="outline" className={statusColors[room.status || 'available']}>
                    {room.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Room #{room.room_number} · Floor {room.floor}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{room.room_type}</span>
                  <span className="font-semibold">{formatCurrency(room.price_per_night)}/night</span>
                </div>
                <p className="text-xs text-muted-foreground">Capacity: {room.capacity} guests</p>

                <div className="flex gap-2">
                  {canEditRoom && (
                    <Select
                      value={room.status || 'available'}
                      onValueChange={(val) => updateStatus.mutate({ id: room.id, status: val })}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roomStatuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {canEditRoom && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditRoom(room); setDialogOpen(true); }}>
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
