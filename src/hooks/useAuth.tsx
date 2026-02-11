import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isDepartmentHead: boolean;
  isCSM: boolean;
  csmId: string | null;
  accessibleDepartments: string[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDepartmentHead, setIsDepartmentHead] = useState(false);
  const [isCSM, setIsCSM] = useState(false);
  const [csmId, setCsmId] = useState<string | null>(null);
  const [accessibleDepartments, setAccessibleDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkUserRoles(session.user.id);
      } else {
        setIsAdmin(false);
        setIsDepartmentHead(false);
        setIsCSM(false);
        setCsmId(null);
        setAccessibleDepartments([]);
      }
    });

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkUserRoles(session.user.id);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkUserRoles = async (userId: string) => {
    // Check admin role
    const { data: adminData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!adminData);

    // Check department_head role
    const { data: deptHeadData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'department_head')
      .maybeSingle();
    
    setIsDepartmentHead(!!deptHeadData);

    // Check CSM role
    const { data: csmRoleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'csm' as any)
      .maybeSingle();
    
    setIsCSM(!!csmRoleData);

    // If CSM, fetch the linked CSM record ID
    if (csmRoleData) {
      const { data: csmRecord } = await supabase
        .from('csms')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      setCsmId(csmRecord?.id || null);
    } else {
      setCsmId(null);
    }

    // Get accessible departments
    const { data: accessData } = await supabase
      .from('department_access')
      .select('department_id')
      .eq('user_id', userId);
    
    setAccessibleDepartments(accessData?.map(a => a.department_id) || []);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsDepartmentHead(false);
    setIsCSM(false);
    setCsmId(null);
    setAccessibleDepartments([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isDepartmentHead, isCSM, csmId, accessibleDepartments, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
