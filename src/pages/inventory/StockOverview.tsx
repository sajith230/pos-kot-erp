import { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, TrendingDown, ArrowUpDown, History, Minus, Plus, Camera } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PermissionButton } from '@/components/auth/PermissionButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/lib/formatCurrency';
import { Inventory, Product } from '@/types/database';
import { format } from 'date-fns';

type StockMovement = {
  id: string;
  product_id: string;
  quantity: number;
  movement_type: string;
  notes: string | null;
  created_at: string;
  product?: { name: string };
};

const adjustmentReasons = [
  { value: 'recount', label: 'Physical Recount' },
  { value: 'damage', label: 'Damaged Goods' },
  { value: 'return', label: 'Customer Return' },
  { value: 'expired', label: 'Expired' },
  { value: 'theft', label: 'Theft/Loss' },
  { value: 'other', label: 'Other' },
];

export default function StockOverview() {
  const { business, branch, user } = useAuth();
  const { toast } = useToast();
  const { format: fc } = useCurrency();
  const { canEdit } = usePermissions();
  const [inventory, setInventory] = useState<(Inventory & { product: Product })[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(Inventory & { product: Product }) | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('recount');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyProductName, setHistoryProductName] = useState('');
  const [productMovements, setProductMovements] = useState<StockMovement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  const handleBarcodeScan = useCallback((code: string) => {
    const match = inventory.find(
      (i) => i.product?.barcode?.toLowerCase() === code.toLowerCase() ||
             i.product?.sku?.toLowerCase() === code.toLowerCase()
    );
    if (match) {
      setSearch(match.product?.name || code);
      openAdjustDialog(match);
      toast({ title: `Found: ${match.product?.name}` });
    } else {
      toast({ variant: 'destructive', title: 'Product not found', description: `No inventory item with barcode: ${code}` });
    }
  }, [inventory, toast]);

  useEffect(() => {
    if (business?.id) {
      fetchInventory();
      fetchMovements();
    }
  }, [business?.id]);

  // Realtime subscription for inventory changes
  useEffect(() => {
    if (!branch?.id) return;
    const channel = supabase
      .channel('stock-overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => {
        fetchInventory();
        fetchMovements();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [branch?.id]);

  async function fetchInventory() {
    setLoading(true);
    const { data: invData } = await supabase
      .from('inventory')
      .select('*, product:products(*)')
      .order('quantity', { ascending: true });

    const inventoryItems = (invData as any) || [];
    const existingProductIds = new Set(inventoryItems.map((i: any) => i.product_id));

    // Fetch trackable products missing from inventory and auto-create records
    if (branch?.id) {
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .eq('track_inventory', true)
        .eq('is_active', true);

      const missingProducts = (allProducts || []).filter((p: any) => !existingProductIds.has(p.id));

      if (missingProducts.length > 0) {
        const newRows = missingProducts.map((p: any) => ({
          product_id: p.id,
          branch_id: branch.id,
          quantity: 0,
        }));
        await supabase.from('inventory').insert(newRows);
        // Re-fetch to get complete data with joins
        const { data: refreshed } = await supabase
          .from('inventory')
          .select('*, product:products(*)')
          .order('quantity', { ascending: true });
        setInventory((refreshed as any) || []);
        setLoading(false);
        return;
      }
    }

    setInventory(inventoryItems);
    setLoading(false);
  }

  async function fetchMovements() {
    if (!branch?.id) return;
    const { data } = await supabase
      .from('stock_movements')
      .select('*, product:products(name)')
      .eq('branch_id', branch.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setMovements((data as any) || []);
  }

  async function openHistoryDialog(item: Inventory & { product: Product }) {
    setHistoryProductName(item.product?.name || 'Unknown');
    setHistoryDialogOpen(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('stock_movements')
      .select('*, product:products(name)')
      .eq('product_id', item.product_id)
      .eq('branch_id', item.branch_id)
      .order('created_at', { ascending: false })
      .limit(50);
    setProductMovements((data as any) || []);
    setHistoryLoading(false);
  }

  function openAdjustDialog(item: Inventory & { product: Product }) {
    setSelectedItem(item);
    setAdjustmentType('add');
    setAdjustmentQty(0);
    setAdjustmentReason('recount');
    setAdjustmentNotes('');
    setAdjustDialogOpen(true);
  }

  async function handleAdjustStock() {
    if (!selectedItem || !branch?.id || adjustmentQty <= 0) return;
    setSaving(true);

    const quantityChange = adjustmentType === 'add' ? adjustmentQty : -adjustmentQty;
    const newQuantity = selectedItem.quantity + quantityChange;

    // Update inventory
    const { error: invError } = await supabase
      .from('inventory')
      .update({ quantity: newQuantity, last_counted_at: new Date().toISOString() })
      .eq('id', selectedItem.id);

    if (invError) {
      toast({ variant: 'destructive', title: 'Error', description: invError.message });
      setSaving(false);
      return;
    }

    // Create stock movement record
    const { error: mvError } = await supabase.from('stock_movements').insert({
      branch_id: branch.id,
      product_id: selectedItem.product_id,
      quantity: quantityChange,
      movement_type: adjustmentType === 'add' ? 'adjustment_in' : 'adjustment_out',
      reference_type: adjustmentReason,
      notes: adjustmentNotes || `${adjustmentReasons.find(r => r.value === adjustmentReason)?.label} adjustment`,
      created_by: user?.id,
    });

    if (mvError) {
      toast({ variant: 'destructive', title: 'Movement log failed', description: mvError.message });
    }

    toast({ title: 'Stock Adjusted', description: `${selectedItem.product?.name} quantity updated to ${newQuantity}` });
    setAdjustDialogOpen(false);
    setSaving(false);
    fetchInventory();
    fetchMovements();
  }

  const filtered = inventory.filter(i =>
    i.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.product?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStock = inventory.filter(i => i.product && i.quantity <= (i.product.min_stock || 0));
  const totalItems = inventory.reduce((sum, i) => sum + Number(i.quantity), 0);
  const totalValue = inventory.reduce((sum, i) => sum + Number(i.quantity) * (i.product?.cost_price || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Stock Overview</h1>
        <p className="text-muted-foreground">Monitor and adjust inventory levels across your branch</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalItems}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Value</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{fc(totalValue)}</div></CardContent>
        </Card>
        <Card className={lowStock.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{lowStock.length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="movements">Recent Movements</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle>Inventory</CardTitle>
                <div className="flex items-center gap-2">
                  <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
                  <Button variant="outline" size="icon" onClick={() => setIsCameraScannerOpen(true)} title="Scan barcode with camera">
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden md:table-cell">SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Min Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No inventory records found</TableCell></TableRow>
                  ) : filtered.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product?.name}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{item.product?.sku || '—'}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{item.product?.min_stock || 0}</TableCell>
                      <TableCell>
                        {item.quantity <= (item.product?.min_stock || 0) ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="secondary">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openHistoryDialog(item)} className="hidden sm:inline-flex">
                            <History className="h-4 w-4 mr-1" /> History
                          </Button>
                          <PermissionButton permitted={canEdit('inventory.stock')} variant="outline" size="sm" onClick={() => openAdjustDialog(item)}>
                            <ArrowUpDown className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Adjust</span>
                          </PermissionButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Recent Stock Movements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right">Qty Change</TableHead>
                    <TableHead className="hidden md:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No movements recorded</TableCell></TableRow>
                  ) : movements.map(mv => (
                    <TableRow key={mv.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(mv.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{mv.product?.name || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant={mv.quantity > 0 ? 'default' : 'secondary'}>
                          {mv.movement_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${mv.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{mv.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Camera Barcode Scanner */}
      <BarcodeScanner
        open={isCameraScannerOpen}
        onOpenChange={setIsCameraScannerOpen}
        onScan={handleBarcodeScan}
      />

      {/* Adjust Stock Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock: {selectedItem?.product?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Current Qty */}
            <div className="flex items-center justify-center gap-3 py-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">Current Qty:</span>
              <span className="text-2xl font-bold">{selectedItem?.quantity}</span>
            </div>

            {/* Add / Remove Toggle */}
            <div className="grid grid-cols-2 gap-0 border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                  adjustmentType === 'add'
                    ? 'bg-background shadow-sm border-r'
                    : 'bg-muted text-muted-foreground border-r hover:bg-muted/80'
                }`}
              >
                <Plus className="h-4 w-4" /> Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                  adjustmentType === 'subtract'
                    ? 'bg-background shadow-sm ring-2 ring-primary ring-inset'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Minus className="h-4 w-4" /> Remove Stock
              </button>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                value={adjustmentQty}
                onChange={e => setAdjustmentQty(Math.max(0, Number(e.target.value)))}
                placeholder="Enter quantity"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={adjustmentReason} onValueChange={setAdjustmentReason}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {adjustmentReasons.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={adjustmentNotes}
                onChange={e => setAdjustmentNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            {/* New Qty Preview */}
            <div className="flex items-center justify-center gap-3 py-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">New Qty:</span>
              <span className={`text-2xl font-bold ${
                adjustmentType === 'subtract' ? 'text-destructive' : 'text-emerald-600'
              }`}>
                {(selectedItem?.quantity || 0) + (adjustmentType === 'add' ? adjustmentQty : -adjustmentQty)}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock} disabled={saving || adjustmentQty <= 0}>
              {saving ? 'Saving...' : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Stock History: {historyProductName}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[55vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : productMovements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No stock movements found for this product</TableCell></TableRow>
                ) : productMovements.map(mv => (
                  <TableRow key={mv.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(mv.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge variant={mv.quantity > 0 ? 'default' : 'secondary'}>
                        {mv.movement_type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${mv.quantity > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                      {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                    </TableCell>
                    <TableCell className="capitalize">{mv.movement_type === 'sale' ? 'Sale' : (adjustmentReasons.find(r => r.value === (mv as any).reference_type)?.label || (mv as any).reference_type || '—')}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{mv.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
