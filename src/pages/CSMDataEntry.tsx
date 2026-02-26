import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CSMDataEntryMatrix } from '@/components/user/CSMDataEntryMatrix';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardCheck, Calendar as CalendarIcon, Info, ToggleLeft, ToggleRight, HelpCircle, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, getISOWeek, getYear } from 'date-fns';

type PeriodMode = 'monthly' | 'weekly';

function getISOWeekString(date: Date): string {
  const week = getISOWeek(date);
  const year = getYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function dateToPeriod(date: Date, mode: PeriodMode): string {
  if (mode === 'weekly') return getISOWeekString(date);
  return format(date, 'yyyy-MM');
}

export default function CSMDataEntry() {
  const { user, isCSM, isAdmin, csmId, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [periodsWithData, setPeriodsWithData] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const depsInitializedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isCSM && !isAdmin) {
      toast.error('You do not have CSM access');
      navigate('/');
      return;
    }
    if (!depsInitializedRef.current) {
      depsInitializedRef.current = true;
      fetchDepartments();
    }
  }, [user, isCSM, isAdmin, authLoading]);

  // Fetch periods that have data
  useEffect(() => {
    async function fetchPeriodsWithData() {
      const { data } = await supabase
        .from('csm_customer_feature_scores')
        .select('period');
      if (data) {
        setPeriodsWithData(new Set(data.map(r => r.period)));
      }
    }
    fetchPeriodsWithData();
  }, []);

  // When mode changes, reset period to current
  useEffect(() => {
    if (periodMode === 'monthly') {
      setPeriod(new Date().toISOString().slice(0, 7));
    } else {
      setPeriod(getISOWeekString(new Date()));
    }
  }, [periodMode]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      if (isCSM && !isAdmin && csmId) {
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

  const generatePeriodOptions = (): string[] => {
    const options: string[] = [];
    const now = new Date();
    if (periodMode === 'monthly') {
      for (let i = -12; i <= 1; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        options.push(format(d, 'yyyy-MM'));
      }
    } else {
      for (let i = -12; i <= 1; i++) {
        const d = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
        options.push(getISOWeekString(d));
      }
      // Deduplicate
      return [...new Set(options)];
    }
    return options;
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    setPeriod(dateToPeriod(date, periodMode));
    setCalendarOpen(false);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const periodOptions = generatePeriodOptions();

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

        <div className="flex items-center gap-3 flex-wrap">
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

          {/* Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPeriodMode(m => m === 'monthly' ? 'weekly' : 'monthly')}
            className="gap-1.5"
          >
            {periodMode === 'monthly' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
            {periodMode === 'monthly' ? 'Monthly' : 'Weekly'}
          </Button>

          {/* Period Dropdown */}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => (
                <SelectItem key={p} value={p}>
                  <span className="flex items-center gap-2">
                    {p}
                    {periodsWithData.has(p) && (
                      <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Calendar Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" title="Pick a date">
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                onSelect={handleCalendarSelect}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Mandatory Check-In Banner */}
      <div className="banner-shine rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 dark:from-amber-600 dark:to-yellow-500 px-4 py-2.5 flex items-center gap-3 shadow-md">
        <AlertTriangle className="h-5 w-5 text-amber-900 dark:text-amber-100 shrink-0" />
        <p className="text-sm font-extrabold text-amber-950 dark:text-amber-50">
          Weekly Check-In Required Every Friday
          <span className="font-medium ml-2 text-amber-900/80 dark:text-amber-100/80">— Complete data entry &amp; submit before EOD. Incomplete check-ins will be flagged.</span>
        </p>
      </div>

      {/* CSM Instructions Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-base">CSM Data Entry Guide</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li><span className="font-medium text-foreground">Select the reporting period</span> — choose the correct month or week using the dropdown or calendar picker.</li>
                <li><span className="font-medium text-foreground">Expand a customer accordion</span> — click on a customer name to reveal their feature × KPI matrix.</li>
                <li><span className="font-medium text-foreground">Select band scores</span> — use the dropdown in each cell to pick the appropriate RAG band (e.g. "76-100%" for Adoption).</li>
                <li><span className="font-medium text-foreground">Use "Apply to Column" / "Apply to Row"</span> — select a band and click the <strong>copy icon (✓)</strong> to bulk-fill cells.</li>
                <li><span className="font-medium text-foreground">Save per customer</span> — click the pulsing <strong>Save</strong> button inside each customer card to save that customer's scores immediately.</li>
                <li><span className="font-medium text-foreground">Final check-in</span> — click <strong>Update &amp; Check In</strong> at the top to aggregate all scores, update KPIs, and complete the check-in.</li>
              </ol>
              <p className="text-xs text-muted-foreground/80 pt-1">
                💡 <strong>Tip:</strong> A green dot next to a period means data has been submitted. A pulsing Save button means you have unsaved changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


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
