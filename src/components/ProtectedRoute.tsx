import { useState, useEffect, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [checking2FA, setChecking2FA] = useState(true);
  const [needs2FA, setNeeds2FA] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      setChecking2FA(false);
      return;
    }

    const alreadyVerified = sessionStorage.getItem('2fa_verified') === 'true';
    if (alreadyVerified) {
      setChecking2FA(false);
      return;
    }

    // Check if user has 2FA enabled
    supabase
      .from('user_2fa')
      .select('is_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_enabled) {
          setNeeds2FA(true);
        }
        setChecking2FA(false);
      });
  }, [user, loading]);

  if (loading || checking2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (needs2FA) {
    return <Navigate to={`/auth/verify-2fa?uid=${user.id}`} replace />;
  }

  return <>{children}</>;
}
