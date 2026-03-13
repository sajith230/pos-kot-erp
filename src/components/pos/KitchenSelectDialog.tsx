import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChefHat, Loader2 } from 'lucide-react';
import type { OrderItem } from '@/types/database';

interface Kitchen {
  id: string;
  name: string;
}

interface KitchenSelectDialogProps {
  open: boolean;
  onClose: () => void;
  pendingItems: OrderItem[];
  kitchens: Kitchen[];
  productToKitchen: Map<string, string>;
  onConfirm: (kitchenGroups: Map<string, OrderItem[]>) => void;
  isLoading?: boolean;
}

export default function KitchenSelectDialog({
  open,
  onClose,
  pendingItems,
  kitchens,
  productToKitchen,
  onConfirm,
  isLoading,
}: KitchenSelectDialogProps) {
  // Initialize selections from auto-assignments; single kitchen auto-selects all
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    pendingItems.forEach(item => {
      const autoKitchen = productToKitchen.get(item.product_id);
      if (autoKitchen) {
        map[item.id] = autoKitchen;
      } else if (kitchens.length === 1) {
        map[item.id] = kitchens[0].id;
      }
    });
    return map;
  });

  // Re-init when dialog opens with new items
  useState(() => {
    const map: Record<string, string> = {};
    pendingItems.forEach(item => {
      const autoKitchen = productToKitchen.get(item.product_id);
      if (autoKitchen) {
        map[item.id] = autoKitchen;
      } else if (kitchens.length === 1) {
        map[item.id] = kitchens[0].id;
      }
    });
    setSelections(map);
  });

  const allAssigned = useMemo(
    () => pendingItems.every(item => !!selections[item.id]),
    [pendingItems, selections]
  );

  const kitchenMap = useMemo(() => {
    const m = new Map<string, string>();
    kitchens.forEach(k => m.set(k.id, k.name));
    return m;
  }, [kitchens]);

  function handleConfirm() {
    const groups = new Map<string, OrderItem[]>();
    pendingItems.forEach(item => {
      const kitchenId = selections[item.id];
      if (!kitchenId) return;
      if (!groups.has(kitchenId)) groups.set(kitchenId, []);
      groups.get(kitchenId)!.push(item);
    });
    onConfirm(groups);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Assign Kitchen for Items
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-3 pr-2">
            {pendingItems.map(item => {
              const autoKitchen = productToKitchen.get(item.product_id);
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product?.name || 'Item'}</p>
                    <Badge variant="secondary" className="text-[10px]">×{item.quantity}</Badge>
                  </div>
                  <Select
                    value={selections[item.id] || ''}
                    onValueChange={(val) => setSelections(prev => ({ ...prev, [item.id]: val }))}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Select kitchen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kitchens.map(k => (
                        <SelectItem key={k.id} value={k.id} className="text-xs">
                          {k.name}
                          {autoKitchen === k.id && (
                            <span className="text-muted-foreground ml-1">(auto)</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!allAssigned || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ChefHat className="h-4 w-4 mr-1" />}
            Send KOT
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
