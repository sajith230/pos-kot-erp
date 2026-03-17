import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { BanquetHall, BanquetHallStatus } from '@/types/database';
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
import { Plus, Castle } from 'lucide-react';

const statusColors: Record<string, string> = {
  available: 'bg-green-500/10 text-green-700 border-green-200',
  booked: 'bg-red-500/10 text-red-700 border-red-200',
  maintenance: 'bg-muted text-muted-foreground border-border',
};

const hallStatuses: BanquetHallStatus[] = ['available', 'booked', 'maintenance'];

export default function BanquetHalls() {
  const { business, branch } = useAuth();
  const { canCreate, canEdit } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editHall, setEditHall] = useState<BanquetHall | null>(null);

  const { data: halls = [], isLoading } = useQuery({
    queryKey: ['banquet-halls', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banquet_halls')
        .select('*')
        .eq('business_id', business!.id)
        .order('name');
      if (error) throw error;
      return data as unknown as BanquetHall[];
    },
    enabled: !!business?.id,
  });

  const upsertHall = useMutation({
    mutationFn: async (hall: { id?: string; name: string; capacity: number; price_per_hour: number; price_per_day: number; description: string | null }) => {
      if (hall.id) {
        const { id, ...rest } = hall;
        const { error } = await supabase.from('banquet_halls').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('banquet_halls').insert([{
          ...hall,
          business_id: business!.id,
          branch_id: branch!.id,
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banquet-halls'] });
      setDialogOpen(false);
      setEditHall(null);
      toast({ title: editHall ? 'Hall updated' : 'Hall created' });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('banquet_halls').update({ status } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banquet-halls'] });
      toast({ title: 'Status updated' });
    },
  });

  const canCreateHall = canCreate('banquet');
  const canEditHall = canEdit('banquet');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsertHall.mutate({
      ...(editHall?.id ? { id: editHall.id } : {}),
      name: fd.get('name') as string,
      capacity: Number(fd.get('capacity')) || 100,
      price_per_hour: Number(fd.get('price_per_hour')) || 0,
      price_per_day: Number(fd.get('price_per_day')) || 0,
      description: (fd.get('description') as string) || null,
    });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banquet Halls</h1>
          <p className="text-muted-foreground text-sm">Manage function and banquet halls</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditHall(null); }}>
          <DialogTrigger asChild>
            <PermissionButton permitted={canCreateHall}><Plus className="h-4 w-4 mr-2" />Add Hall</PermissionButton>
          </DialogTrigger>
          <DialogContent className="max-w-lg w-full">
            <DialogHeader><DialogTitle>{editHall ? 'Edit Hall' : 'Add Hall'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required defaultValue={editHall?.name || ''} /></div>
              <div><Label htmlFor="capacity">Capacity</Label><Input id="capacity" name="capacity" type="number" defaultValue={editHall?.capacity || 100} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="price_per_hour">Price/Hour</Label><Input id="price_per_hour" name="price_per_hour" type="number" step="0.01" defaultValue={editHall?.price_per_hour || 0} /></div>
                <div><Label htmlFor="price_per_day">Price/Day</Label><Input id="price_per_day" name="price_per_day" type="number" step="0.01" defaultValue={editHall?.price_per_day || 0} /></div>
              </div>
              <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" defaultValue={editHall?.description || ''} /></div>
              <Button type="submit" className="w-full" disabled={upsertHall.isPending}>{editHall ? 'Update' : 'Create'} Hall</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Loading halls...</p>
      ) : halls.length === 0 ? (
        <div className="text-center py-12">
          <Castle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No banquet halls yet. Add your first hall.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {halls.map((hall) => (
            <Card key={hall.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{hall.name}</CardTitle>
                  <Badge variant="outline" className={statusColors[hall.status || 'available']}>
                    {hall.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Capacity: {hall.capacity} guests</p>
                <div className="flex justify-between text-sm">
                  <span>{formatCurrency(hall.price_per_hour || 0)}/hr</span>
                  <span>{formatCurrency(hall.price_per_day || 0)}/day</span>
                </div>
                {hall.description && <p className="text-xs text-muted-foreground line-clamp-2">{hall.description}</p>}
                <div className="flex gap-2">
                  {canEditHall && (
                    <Select value={hall.status || 'available'} onValueChange={(val) => updateStatus.mutate({ id: hall.id, status: val })}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {hallStatuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {canEditHall && (
                    <Button variant="outline" size="sm" className="h-8" onClick={() => { setEditHall(hall); setDialogOpen(true); }}>Edit</Button>
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
