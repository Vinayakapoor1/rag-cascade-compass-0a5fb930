import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CSMDataEntryMatrix } from '@/components/user/CSMDataEntryMatrix';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardCheck, Calendar, Info } from 'lucide-react';

export default function CSMDataEntry() {
  const { user, isCSM, isAdmin, csmId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isCSM && !isAdmin) {
      toast.error('You do not have CSM access');
      navigate('/');
      return;
    }
    fetchDepartments();
  }, [user, isCSM, isAdmin, authLoading]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      if (isCSM && !isAdmin && csmId) {
        // Trace: CSM -> customers -> customer_features -> indicator_feature_links -> indicators -> key_results -> functional_objectives -> departments
        const { data: customers } = await supabase
          .from('customers')
          .select('id')
          .eq('csm_id', csmId);
        
        if (!customers?.length) { setLoading(false); return; }
        const customerIds = customers.map(c => c.id);

        const { data: custFeatures } = await supabase
          .from('customer_features')
          .select('feature_id')
          .in('customer_id', customerIds);
        
        if (!custFeatures?.length) { setLoading(false); return; }
        const featureIds = [...new Set(custFeatures.map(cf => cf.feature_id))];

        const { data: featureLinks } = await supabase
          .from('indicator_feature_links')
          .select('indicator_id')
          .in('feature_id', featureIds);
        
        if (!featureLinks?.length) { setLoading(false); return; }
        const indicatorIds = [...new Set(featureLinks.map(fl => fl.indicator_id))];

        const { data: indicators } = await supabase
          .from('indicators')
          .select('key_result_id')
          .in('id', indicatorIds)
          .not('key_result_id', 'is', null);
        
        if (!indicators?.length) { setLoading(false); return; }
        const krIds = [...new Set(indicators.map(i => i.key_result_id!))];

        const { data: keyResults } = await supabase
          .from('key_results')
          .select('functional_objective_id')
          .in('id', krIds)
          .not('functional_objective_id', 'is', null);
        
        if (!keyResults?.length) { setLoading(false); return; }
        const foIds = [...new Set(keyResults.map(kr => kr.functional_objective_id!))];

        const { data: funcObjs } = await supabase
          .from('functional_objectives')
          .select('department_id')
          .in('id', foIds)
          .not('department_id', 'is', null);
        
        if (!funcObjs?.length) { setLoading(false); return; }
        const deptIds = [...new Set(funcObjs.map(fo => fo.department_id!))];

        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', deptIds)
          .order('name');

        if (depts?.length) {
          setDepartments(depts);
          setDepartmentId(depts[0].id);
        }
      } else {
        // Admin: show all departments
        const { data: depts } = await supabase
          .from('departments')
          .select('id, name')
          .order('name');

        if (depts?.length) {
          setDepartments(depts);
          setDepartmentId(depts[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const generatePeriodOptions = () => {
    const options: string[] = [];
    const now = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      options.push(d.toISOString().slice(0, 7));
    }
    return options;
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7" />
            CSM Data Entry
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter feature adoption scores for your assigned customers
          </p>
        </div>

        <div className="flex items-center gap-3">
          {departments.length > 1 && (
            <Select value={departmentId || ''} onValueChange={setDepartmentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generatePeriodOptions().map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matrix */}
      {departmentId ? (
        <CSMDataEntryMatrix departmentId={departmentId} period={period} />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">No Departments Available</h3>
            <p className="text-muted-foreground text-sm">
              No departments are configured yet. Please contact your admin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
