import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CSMDataEntryMatrix } from '@/components/user/CSMDataEntryMatrix';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClipboardCheck, Calendar as CalendarIcon, Info, ToggleLeft, ToggleRight, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, getISOWeek, getYear } from 'date-fns';

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

export default function ContentManagementDataEntry() {
  const { user, isContentManager, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('monthly');
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [periodsWithData, setPeriodsWithData] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const deptInitializedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isContentManager && !isAdmin) {
      toast.error('You do not have Content Management access');
      navigate('/');
      return;
    }
    if (!deptInitializedRef.current) {
      deptInitializedRef.current = true;
      fetchContentManagementDept();
    }
  }, [user, isContentManager, isAdmin, authLoading]);

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

  useEffect(() => {
    if (periodMode === 'monthly') {
      setPeriod(new Date().toISOString().slice(0, 7));
    } else {
      setPeriod(getISOWeekString(new Date()));
    }
  }, [periodMode]);

  const fetchContentManagementDept = async () => {
    setLoading(true);
    try {
      const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('name', 'Content Management')
        .maybeSingle();

      if (dept) {
        setDepartmentId(dept.id);
      } else {
        toast.error('Content Management department not found');
      }
    } catch (err) {
      console.error('Error fetching Content Management department:', err);
      toast.error('Failed to load department');
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
            Content Management Data Entry
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter feature adoption scores for managed services customers
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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

      {/* Instructions Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-semibold text-base">Content Management Data Entry Guide</h3>
              <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                <li><span className="font-medium text-foreground">Select the reporting period</span> — choose the correct month or week using the dropdown or calendar picker.</li>
                <li><span className="font-medium text-foreground">Expand a customer accordion</span> — click on a customer name to reveal their feature × KPI matrix.</li>
                <li><span className="font-medium text-foreground">Select band scores</span> — use the dropdown in each cell to pick the appropriate RAG band.</li>
                <li><span className="font-medium text-foreground">Use "Apply to Column"</span> — select a band in the column header and click the copy icon to fill all cells in that KPI column at once.</li>
                <li><span className="font-medium text-foreground">Use "Apply to Row"</span> — select a band in the row's rightmost cell and click the copy icon to fill all KPIs for that feature at once.</li>
                <li><span className="font-medium text-foreground">Save your entries</span> — click the <strong>Save</strong> button. Your data will be recorded with a timestamp and audit trail.</li>
              </ol>
              <p className="text-xs text-muted-foreground/80 pt-1">
                💡 <strong>Tip:</strong> Only managed services customers are shown in this view.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      {departmentId ? (
        <CSMDataEntryMatrix departmentId={departmentId} period={period} managedServicesOnly />
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold mb-1">Content Management Department Not Found</h3>
            <p className="text-muted-foreground text-sm">
              Please contact your admin to set up the Content Management department.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
