import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PermissionGuardProps {
  module: string;
}

export function PermissionGuard({ module }: PermissionGuardProps) {
  const { isAdmin, loading: authLoading } = useAuth();
  const { canView, loading: permLoading } = usePermissions();
  const navigate = useNavigate();

  if (authLoading || permLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading module access...</p>
      </div>
    );
  }

  if (isAdmin() || canView(module)) {
    return <Outlet />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <ShieldX className="h-16 w-16 text-destructive" />
      <h2 className="text-2xl font-bold">Access Denied</h2>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to access this module. Contact your admin to request access.
      </p>
      <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
    </div>
  );
}

