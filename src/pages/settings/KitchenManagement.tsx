import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChefHat, Package, Users, Loader2 } from 'lucide-react';

interface Kitchen {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  branch_id: string;
  business_id: string;
}

interface ProductBasic {
  id: string;
  name: string;
  category_id: string | null;
}

interface StaffBasic {
  user_id: string;
  full_name: string | null;
}

export default function KitchenManagement() {
  const { business, branch } = useAuth();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [products, setProducts] = useState<ProductBasic[]>([]);
  const [staff, setStaff] = useState<StaffBasic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState<Kitchen | null>(null);
  const [kitchenName, setKitchenName] = useState('');
  const [kitchenDesc, setKitchenDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Assignment dialogs
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [activeKitchenId, setActiveKitchenId] = useState<string | null>(null);
  const [assignedProductIds, setAssignedProductIds] = useState<Set<string>>(new Set());
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const fetchKitchens = useCallback(async () => {
    if (!business?.id || !branch?.id) return;
    const { data } = await supabase
      .from('kitchens')
      .select('*')
      .eq('business_id', business.id)
      .eq('branch_id', branch.id)
      .order('name');
    setKitchens((data as Kitchen[]) || []);
  }, [business?.id, branch?.id]);

  const fetchProducts = useCallback(async () => {
    if (!business?.id) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, category_id')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('name');
    setProducts((data as ProductBasic[]) || []);
  }, [business?.id]);

  const fetchStaff = useCallback(async () => {
    if (!business?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('business_id', business.id)
      .eq('is_active', true);
    setStaff((data as StaffBasic[]) || []);
  }, [business?.id]);

  useEffect(() => {
    Promise.all([fetchKitchens(), fetchProducts(), fetchStaff()]).then(() => setIsLoading(false));
  }, [fetchKitchens, fetchProducts, fetchStaff]);

  function openCreateDialog() {
    setEditingKitchen(null);
    setKitchenName('');
    setKitchenDesc('');
    setEditDialogOpen(true);
  }

  function openEditDialog(kitchen: Kitchen) {
    setEditingKitchen(kitchen);
    setKitchenName(kitchen.name);
    setKitchenDesc(kitchen.description || '');
    setEditDialogOpen(true);
  }

  async function saveKitchen() {
    if (!kitchenName.trim() || !business?.id || !branch?.id) return;
    setIsSaving(true);

    if (editingKitchen) {
      const { error } = await supabase
        .from('kitchens')
        .update({ name: kitchenName.trim(), description: kitchenDesc.trim() || null })
        .eq('id', editingKitchen.id);
      if (error) toast.error(error.message);
      else toast.success('Kitchen updated');
    } else {
      const { error } = await supabase
        .from('kitchens')
        .insert({
          name: kitchenName.trim(),
          description: kitchenDesc.trim() || null,
          business_id: business.id,
          branch_id: branch.id,
        });
      if (error) toast.error(error.message);
      else toast.success('Kitchen created');
    }

    setIsSaving(false);
    setEditDialogOpen(false);
    fetchKitchens();
  }

  async function toggleKitchenActive(kitchen: Kitchen) {
    await supabase.from('kitchens').update({ is_active: !kitchen.is_active }).eq('id', kitchen.id);
    fetchKitchens();
  }

  async function deleteKitchen(id: string) {
    if (!confirm('Delete this kitchen? All assignments will be removed.')) return;
    await supabase.from('kitchens').delete().eq('id', id);
    toast.success('Kitchen deleted');
    fetchKitchens();
  }

  // Product assignment
  async function openProductAssignment(kitchenId: string) {
    setActiveKitchenId(kitchenId);
    setProductSearch('');
    const { data } = await supabase
      .from('kitchen_product_assignments')
      .select('product_id')
      .eq('kitchen_id', kitchenId);
    setAssignedProductIds(new Set((data || []).map((d: any) => d.product_id)));
    setProductDialogOpen(true);
  }

  async function saveProductAssignments() {
    if (!activeKitchenId) return;
    setIsSaving(true);

    // Delete all existing then insert new
    await supabase.from('kitchen_product_assignments').delete().eq('kitchen_id', activeKitchenId);
    
    if (assignedProductIds.size > 0) {
      const rows = Array.from(assignedProductIds).map(pid => ({
        kitchen_id: activeKitchenId,
        product_id: pid,
      }));
      const { error } = await supabase.from('kitchen_product_assignments').insert(rows);
      if (error) toast.error(error.message);
    }

    toast.success('Product assignments saved');
    setIsSaving(false);
    setProductDialogOpen(false);
  }

  // User assignment
  async function openUserAssignment(kitchenId: string) {
    setActiveKitchenId(kitchenId);
    setUserSearch('');
    const { data } = await supabase
      .from('kitchen_user_assignments')
      .select('user_id')
      .eq('kitchen_id', kitchenId);
    setAssignedUserIds(new Set((data || []).map((d: any) => d.user_id)));
    setUserDialogOpen(true);
  }

  async function saveUserAssignments() {
    if (!activeKitchenId) return;
    setIsSaving(true);

    await supabase.from('kitchen_user_assignments').delete().eq('kitchen_id', activeKitchenId);
    
    if (assignedUserIds.size > 0) {
      const rows = Array.from(assignedUserIds).map(uid => ({
        kitchen_id: activeKitchenId,
        user_id: uid,
      }));
      const { error } = await supabase.from('kitchen_user_assignments').insert(rows);
      if (error) toast.error(error.message);
    }

    toast.success('User assignments saved');
    setIsSaving(false);
    setUserDialogOpen(false);
  }

  function toggleProduct(productId: string) {
    setAssignedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleUser(userId: string) {
    setAssignedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  if (!business) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Business Setup Required</h2>
            <p className="text-muted-foreground">Please set up your business first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredStaff = staff.filter(s =>
    (s.full_name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Kitchen Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Create kitchens, assign products and staff to each kitchen.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Add Kitchen
        </Button>
      </div>

      {kitchens.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No kitchens yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first kitchen to start routing orders.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Create Kitchen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {kitchens.map(kitchen => (
            <Card key={kitchen.id} className={!kitchen.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{kitchen.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={kitchen.is_active ?? true}
                      onCheckedChange={() => toggleKitchenActive(kitchen)}
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(kitchen)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteKitchen(kitchen.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {kitchen.description && (
                  <p className="text-sm text-muted-foreground">{kitchen.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => openProductAssignment(kitchen.id)}>
                  <Package className="h-4 w-4" />
                  Assign Products
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => openUserAssignment(kitchen.id)}>
                  <Users className="h-4 w-4" />
                  Assign Staff
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Kitchen Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingKitchen ? 'Edit Kitchen' : 'Create Kitchen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={kitchenName} onChange={e => setKitchenName(e.target.value)} placeholder="e.g. Main Kitchen, Bar, Dessert Station" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={kitchenDesc} onChange={e => setKitchenDesc(e.target.value)} placeholder="Description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveKitchen} disabled={!kitchenName.trim() || isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingKitchen ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Assignment Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Products to Kitchen</DialogTitle>
          </DialogHeader>
          <Input placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
          <ScrollArea className="h-[350px]">
            <div className="space-y-1">
              {filteredProducts.map(product => (
                <label key={product.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={assignedProductIds.has(product.id)}
                    onCheckedChange={() => toggleProduct(product.id)}
                  />
                  <span className="text-sm">{product.name}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <div className="text-sm text-muted-foreground">
            {assignedProductIds.size} product(s) selected
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveProductAssignments} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Assignment Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Staff to Kitchen</DialogTitle>
          </DialogHeader>
          <Input placeholder="Search staff..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
          <ScrollArea className="h-[350px]">
            <div className="space-y-1">
              {filteredStaff.map(s => (
                <label key={s.user_id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={assignedUserIds.has(s.user_id)}
                    onCheckedChange={() => toggleUser(s.user_id)}
                  />
                  <span className="text-sm">{s.full_name || 'Unknown'}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
          <div className="text-sm text-muted-foreground">
            {assignedUserIds.size} staff member(s) selected
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveUserAssignments} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
