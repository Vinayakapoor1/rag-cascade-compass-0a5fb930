import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import {
    Save, Loader2, ChevronDown, ChevronRight, Paperclip,
    TrendingUp, Target, Calendar, Filter, CheckCircle2, AlertCircle,
    History, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndicatorHistoryDialog } from '@/components/IndicatorHistoryDialog';

interface Indicator {
    id: string;
    name: string;
    current_value: number | null;
    target_value: number | null;
    unit: string | null;
    frequency: string | null;
    evidence_url: string | null;
    kr_id: string;
    kr_name: string;
    fo_id: string;
    fo_name: string;
    previous_value?: number | null;
    previous_period?: string | null;
}

interface IndicatorUpdate {
    id: string;
    value: string;
    evidenceFile?: File | null;
    evidenceUrl?: string;
    evidenceReason?: string;
    hasChanged: boolean;
}

function getRAGStatus(current: number | null, target: number | null): 'green' | 'amber' | 'red' | 'gray' {
    if (current === null || target === null || target === 0) return 'gray';
    const progress = (current / target) * 100;
    if (progress >= 76) return 'green';
    if (progress >= 51) return 'amber';
    return 'red';
}

// Helper to open evidence URL - handles both full URLs and storage paths (private bucket needs signed URLs)
async function openEvidenceUrl(url: string | null): Promise<void> {
    if (!url) return;
    // If it's already a full URL, open directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
        return;
    }
    // For storage paths in private bucket, create a signed URL
    const { data, error } = await supabase.storage.from('evidence-files').createSignedUrl(url, 3600);
    if (error) {
        console.error('Error creating signed URL:', error);
        toast.error('Could not access evidence file');
        return;
    }
    window.open(data.signedUrl, '_blank');
}

function RAGBadge({ status, size = 'sm' }: { status: 'green' | 'amber' | 'red' | 'gray'; size?: 'sm' | 'xs' }) {
    const styles = {
        green: 'bg-rag-green text-rag-green-foreground',
        amber: 'bg-rag-amber text-rag-amber-foreground',
        red: 'bg-rag-red text-rag-red-foreground',
        gray: 'bg-muted text-muted-foreground',
    };
    const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs';
    return <Badge className={cn(styles[status], sizeClass)}>●</Badge>;
}

export default function DepartmentDataEntry() {
    const { departmentId } = useParams<{ departmentId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { logActivity } = useActivityLog();

    const [department, setDepartment] = useState<{ id: string; name: string } | null>(null);
    const [indicators, setIndicators] = useState<Indicator[]>([]);
    const [updates, setUpdates] = useState<Record<string, IndicatorUpdate>>({});
    const [expandedFOs, setExpandedFOs] = useState<Set<string>>(new Set());
    const [expandedKRs, setExpandedKRs] = useState<Set<string>>(new Set());

    const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [historyDialog, setHistoryDialog] = useState<{
        open: boolean;
        indicatorId: string;
        indicatorName: string;
        krName: string;
        targetValue: number | null;
        unit: string | null;
    }>({ open: false, indicatorId: '', indicatorName: '', krName: '', targetValue: null, unit: null });

    useEffect(() => {
        if (departmentId && user) {
            fetchData();
        }
    }, [departmentId, user]);

    const fetchData = async () => {
        if (!departmentId) return;

        setLoading(true);
        try {
            // Check access
            const { data: accessData } = await supabase
                .from('department_access')
                .select('department_id')
                .eq('user_id', user!.id)
                .eq('department_id', departmentId)
                .maybeSingle();

            if (!accessData) {
                toast.error('You do not have access to this department');
                navigate('/');
                return;
            }

            // Get department info
            const { data: deptData } = await supabase
                .from('departments')
                .select('id, name')
                .eq('id', departmentId)
                .single();

            setDepartment(deptData);

            // Get all indicators for this department
            const { data: fos } = await supabase
                .from('functional_objectives')
                .select('id, name')
                .eq('department_id', departmentId)
                .order('name');

            const allIndicators: Indicator[] = [];

            for (const fo of fos || []) {
                const { data: krs } = await supabase
                    .from('key_results')
                    .select('id, name')
                    .eq('functional_objective_id', fo.id)
                    .order('name');

                for (const kr of krs || []) {
                    const { data: inds } = await supabase
                        .from('indicators')
                        .select('id, name, current_value, target_value, unit, frequency, evidence_url')
                        .eq('key_result_id', kr.id)
                        .order('name');

                    for (const ind of inds || []) {
                        // Fetch most recent history entry (frequency-agnostic)
                        // @ts-ignore - indicator_history table not in generated types yet
                        const { data: historyData } = await supabase
                            .from('indicator_history')
                            .select('value, period, created_at')
                            .eq('indicator_id', ind.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        allIndicators.push({
                            ...ind,
                            kr_id: kr.id,
                            kr_name: kr.name,
                            fo_id: fo.id,
                            fo_name: fo.name,
                            previous_value: (historyData as any)?.value || null,
                            previous_period: (historyData as any)?.period || null,
                        });
                    }
                }
            }

            setIndicators(allIndicators);

            // Expand all by default
            setExpandedFOs(new Set(fos?.map(f => f.id) || []));
            setExpandedKRs(new Set(allIndicators.map(i => i.kr_id)));

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (indicatorId: string, value: string, originalValue: number | null) => {
        setUpdates(prev => ({
            ...prev,
            [indicatorId]: {
                id: indicatorId,
                value,
                hasChanged: value !== (originalValue?.toString() || ''),
            },
        }));
    };

    const handleFileChange = (indicatorId: string, file: File | null) => {
        setUpdates(prev => ({
            ...prev,
            [indicatorId]: {
                ...prev[indicatorId],
                id: indicatorId,
                value: prev[indicatorId]?.value ?? '',
                evidenceFile: file,
                evidenceUrl: file ? undefined : prev[indicatorId]?.evidenceUrl, // Clear URL if file uploaded
                evidenceReason: file ? undefined : prev[indicatorId]?.evidenceReason, // Clear reason if file uploaded
                hasChanged: true
            }
        }));
        if (file) {
            toast.success(`File "${file.name}" selected for upload`);
        }
    };

    const handleUrlChange = (indicatorId: string, url: string) => {
        setUpdates(prev => ({
            ...prev,
            [indicatorId]: {
                ...prev[indicatorId],
                id: indicatorId,
                value: prev[indicatorId]?.value ?? '',
                evidenceUrl: url,
                evidenceFile: url ? null : prev[indicatorId]?.evidenceFile, // Clear file if URL provided
                evidenceReason: url ? undefined : prev[indicatorId]?.evidenceReason, // Clear reason if URL provided
                hasChanged: true
            }
        }));
    };

    const handleReasonChange = (indicatorId: string, reason: string) => {
        setUpdates(prev => ({
            ...prev,
            [indicatorId]: {
                ...prev[indicatorId],
                id: indicatorId,
                value: prev[indicatorId]?.value ?? '',
                evidenceReason: reason,
                hasChanged: true
            }
        }));
    };

    const handleSaveAll = async () => {
        const changedUpdates = Object.values(updates).filter(u => u.hasChanged && u.value !== '');

        if (changedUpdates.length === 0) {
            toast.info('No changes to save');
            return;
        }

        // Validate that each update has either evidence file, URL, or reason
        const invalidUpdates = changedUpdates.filter(u => !u.evidenceFile && !u.evidenceUrl?.trim() && !u.evidenceReason?.trim());
        if (invalidUpdates.length > 0) {
            const invalidIndicators = invalidUpdates
                .map(u => indicators.find(i => i.id === u.id)?.name)
                .filter(Boolean)
                .join(', ');
            toast.error(
                `Evidence (file/link) or reason required for: ${invalidIndicators}`,
                { duration: 5000 }
            );
            return;
        }

        setSaving(true);
        try {
            for (const update of changedUpdates) {
                const indicator = indicators.find(i => i.id === update.id);
                if (!indicator) continue;

                const newValue = parseFloat(update.value);
                if (isNaN(newValue)) continue;

                let evidenceUrl = indicator.evidence_url;

                // Use evidence URL if provided
                if (update.evidenceUrl?.trim()) {
                    evidenceUrl = update.evidenceUrl.trim();
                }
                // Otherwise upload evidence file if provided
                else if (update.evidenceFile) {
                    const fileName = `${Date.now()}_${update.evidenceFile.name}`;
                    const filePath = `evidence/${indicator.id}/${period}/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('evidence-files')
                        .upload(filePath, update.evidenceFile);

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        toast.error(`Failed to upload evidence for ${indicator.name}`);
                        continue; // Skip this indicator if upload fails
                    } else {
                        const { data } = supabase.storage
                            .from('evidence-files')
                            .getPublicUrl(filePath);
                        evidenceUrl = filePath; // Store the path, not the public URL (bucket is private)
                    }
                }

                // Create history record
                // @ts-ignore - indicator_history table not in generated types yet
                const { error: historyError } = await supabase
                    .from('indicator_history')
                    .insert({
                        indicator_id: update.id,
                        value: newValue,
                        period,
                        evidence_url: evidenceUrl,
                        no_evidence_reason: update.evidenceReason || null,
                        created_by: user!.id
                    });

                if (historyError) {
                    console.error('History insert failed:', historyError);
                    toast.error(`Failed to save history for ${indicator.name}`);
                } else {
                    console.log('History record saved for:', indicator.name, 'value:', newValue, 'period:', period);
                }

                // Calculate RAG status change
                const oldRAGStatus = getRAGStatus(indicator.current_value, indicator.target_value);
                const newRAGStatus = getRAGStatus(newValue, indicator.target_value);

                // Update indicator current_value AND rag_status
                const { error } = await supabase
                    .from('indicators')
                    .update({
                        current_value: newValue,
                        evidence_url: evidenceUrl,
                        no_evidence_reason: update.evidenceReason || null,
                        rag_status: newRAGStatus,
                    })
                    .eq('id', update.id);

                if (error) throw error;

                // Log activity
                await logActivity({
                    action: 'update',
                    entityType: 'indicator',
                    entityId: update.id,
                    entityName: indicator.name,
                    oldValue: { current_value: indicator.current_value },
                    newValue: { current_value: newValue },
                    metadata: {
                        department_id: departmentId,
                        period,
                        user_email: user!.email,
                        has_evidence: !!evidenceUrl,
                        kr_name: indicator.kr_name,
                        fo_name: indicator.fo_name,
                        old_rag_status: oldRAGStatus,
                        new_rag_status: newRAGStatus,
                        target_value: indicator.target_value,
                        unit: indicator.unit
                    }
                });
            }

            toast.success(`Saved ${changedUpdates.length} indicator${changedUpdates.length > 1 ? 's' : ''}`);
            setUpdates({});
            fetchData(); // Refresh data
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save some values');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSingle = async (indicatorId: string) => {
        const update = updates[indicatorId];
        if (!update || !update.hasChanged || !update.value) {
            toast.info('No changes to save');
            return;
        }

        // Validate evidence
        if (!update.evidenceFile && !update.evidenceUrl?.trim() && !update.evidenceReason?.trim()) {
            const indicator = indicators.find(i => i.id === indicatorId);
            toast.error(`Evidence (file/link) or reason required for: ${indicator?.name}`);
            return;
        }

        setSaving(true);
        try {
            const indicator = indicators.find(i => i.id === indicatorId);
            if (!indicator) return;

            const newValue = parseFloat(update.value);
            if (isNaN(newValue)) return;

            let evidenceUrl = indicator.evidence_url;

            // Use evidence URL if provided
            if (update.evidenceUrl?.trim()) {
                evidenceUrl = update.evidenceUrl.trim();
            }
            // Otherwise upload evidence file if provided
            else if (update.evidenceFile) {
                const fileName = `${Date.now()}_${update.evidenceFile.name}`;
                const filePath = `evidence/${indicator.id}/${period}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('evidence-files')
                    .upload(filePath, update.evidenceFile);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    toast.error(`Failed to upload evidence for ${indicator.name}`);
                    return;
                } else {
                    evidenceUrl = filePath;
                }
            }

            // Create history record
            const { error: historyError } = await supabase
                .from('indicator_history')
                .insert({
                    indicator_id: indicatorId,
                    value: newValue,
                    period,
                    evidence_url: evidenceUrl,
                    no_evidence_reason: update.evidenceReason || null,
                    created_by: user!.id
                });

            if (historyError) {
                console.error('History insert failed:', historyError);
            }

            // Calculate RAG status change
            const oldRAGStatus = getRAGStatus(indicator.current_value, indicator.target_value);
            const newRAGStatus = getRAGStatus(newValue, indicator.target_value);

            // Update indicator
            const { error } = await supabase
                .from('indicators')
                .update({
                    current_value: newValue,
                    evidence_url: evidenceUrl,
                    no_evidence_reason: update.evidenceReason || null,
                    rag_status: newRAGStatus,
                })
                .eq('id', indicatorId);

            if (error) throw error;

            // Log activity
            await logActivity({
                action: 'update',
                entityType: 'indicator',
                entityId: indicatorId,
                entityName: indicator.name,
                oldValue: { current_value: indicator.current_value },
                newValue: { current_value: newValue },
                metadata: {
                    department_id: departmentId,
                    period,
                    user_email: user!.email,
                    has_evidence: !!evidenceUrl,
                    kr_name: indicator.kr_name,
                    fo_name: indicator.fo_name,
                    old_rag_status: oldRAGStatus,
                    new_rag_status: newRAGStatus,
                    target_value: indicator.target_value,
                    unit: indicator.unit
                }
            });

            toast.success(`Saved ${indicator.name}`);
            // Clear this update
            setUpdates(prev => {
                const next = { ...prev };
                delete next[indicatorId];
                return next;
            });
            fetchData();
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save value');
        } finally {
            setSaving(false);
        }
    };

    const toggleFO = (foId: string) => {
        setExpandedFOs(prev => {
            const next = new Set(prev);
            if (next.has(foId)) {
                next.delete(foId);
            } else {
                next.add(foId);
            }
            return next;
        });
    };

    const toggleKR = (krId: string) => {
        setExpandedKRs(prev => {
            const next = new Set(prev);
            if (next.has(krId)) {
                next.delete(krId);
            } else {
                next.add(krId);
            }
            return next;
        });
    };

    // Filter indicators
    const filteredIndicators = indicators.filter(ind => {
        if (frequencyFilter !== 'all' && ind.frequency !== frequencyFilter) return false;
        if (statusFilter !== 'all') {
            const status = getRAGStatus(ind.current_value, ind.target_value);
            if (statusFilter === 'complete' && ind.current_value === null) return false;
            if (statusFilter === 'incomplete' && ind.current_value !== null) return false;
            if (statusFilter === 'green' && status !== 'green') return false;
            if (statusFilter === 'amber' && status !== 'amber') return false;
            if (statusFilter === 'red' && status !== 'red') return false;
        }
        return true;
    });

    // Group by FO and KR
    const groupedData = filteredIndicators.reduce((acc, ind) => {
        if (!acc[ind.fo_id]) {
            acc[ind.fo_id] = { fo_name: ind.fo_name, krs: {} };
        }
        if (!acc[ind.fo_id].krs[ind.kr_id]) {
            acc[ind.fo_id].krs[ind.kr_id] = { kr_name: ind.kr_name, indicators: [] };
        }
        acc[ind.fo_id].krs[ind.kr_id].indicators.push(ind);
        return acc;
    }, {} as Record<string, { fo_name: string; krs: Record<string, { kr_name: string; indicators: Indicator[] }> }>);

    // Stats
    const totalIndicators = filteredIndicators.length;
    const completedIndicators = filteredIndicators.filter(i => i.current_value !== null).length;
    const onTrackIndicators = filteredIndicators.filter(i => getRAGStatus(i.current_value, i.target_value) === 'green').length;
    const changedCount = Object.values(updates).filter(u => u.hasChanged).length;

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{department?.name} - Data Entry</h1>
                    <p className="text-muted-foreground">Quick bulk entry for all indicators</p>
                </div>
                <Button onClick={() => navigate(`/department/${departmentId}`)} variant="outline">
                    Back to Department
                </Button>
            </div>

            {/* Stats Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <p className="text-3xl font-bold">{completedIndicators}/{totalIndicators}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Complete
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-rag-green">{onTrackIndicators}</p>
                                <p className="text-sm text-muted-foreground">On Track</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-primary">{changedCount}</p>
                                <p className="text-sm text-muted-foreground">Unsaved Changes</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="month"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <Button
                                onClick={handleSaveAll}
                                disabled={saving || changedCount === 0}
                                size="lg"
                                className="gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Save All Changes ({changedCount})
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Frequencies</SelectItem>
                                <SelectItem value="Daily">Daily</SelectItem>
                                <SelectItem value="Weekly">Weekly</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="complete">Complete Only</SelectItem>
                                <SelectItem value="incomplete">Incomplete Only</SelectItem>
                                <SelectItem value="green">Green Only</SelectItem>
                                <SelectItem value="amber">Amber Only</SelectItem>
                                <SelectItem value="red">Red Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Data Entry Table */}
            <div className="space-y-4">
                {Object.entries(groupedData).map(([foId, foData]) => (
                    <Card key={foId}>
                        <CardHeader
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleFO(foId)}
                        >
                            <div className="flex items-center gap-2">
                                {expandedFOs.has(foId) ? (
                                    <ChevronDown className="h-5 w-5" />
                                ) : (
                                    <ChevronRight className="h-5 w-5" />
                                )}
                                <Target className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg">{foData.fo_name}</CardTitle>
                                <Badge variant="outline" className="ml-auto">
                                    {Object.values(foData.krs).reduce((sum, kr) => sum + kr.indicators.length, 0)} indicators
                                </Badge>
                            </div>
                        </CardHeader>

                        {expandedFOs.has(foId) && (
                            <CardContent className="space-y-4">
                                {Object.entries(foData.krs).map(([krId, krData]) => (
                                    <div key={krId} className="border rounded-lg">
                                        <div
                                            className="p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-2"
                                            onClick={() => toggleKR(krId)}
                                        >
                                            {expandedKRs.has(krId) ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium text-sm">{krData.kr_name}</span>
                                            <Badge variant="secondary" className="ml-auto text-xs">
                                                {krData.indicators.length} KPIs
                                            </Badge>
                                        </div>

                                        {expandedKRs.has(krId) && (
                                            <div className="p-4">
                                                <div className="grid grid-cols-[2fr,0.7fr,0.7fr,1fr,0.7fr,0.5fr,0.5fr,1.2fr,1.5fr,0.5fr,0.5fr,0.5fr] gap-2 text-xs font-medium text-muted-foreground mb-2 px-2">
                                                    <div>Indicator</div>
                                                    <div className="text-center">Target</div>
                                                    <div className="text-center">Previous</div>
                                                    <div className="text-center">Current</div>
                                                    <div className="text-center">Progress</div>
                                                    <div className="text-center">RAG</div>
                                                    <div className="text-center">File</div>
                                                    <div className="text-center">Link</div>
                                                    <div className="text-center">Reason</div>
                                                    <div className="text-center">History</div>
                                                    <div className="text-center">Upload</div>
                                                    <div className="text-center">Save</div>
                                                </div>

                                                <div className="space-y-2">
                                                    {krData.indicators.map(ind => {
                                                        const currentValue = updates[ind.id]?.value ?? ind.current_value?.toString() ?? '';
                                                        const numValue = currentValue ? parseFloat(currentValue) : null;
                                                        const progress = ind.target_value && numValue
                                                            ? Math.round((numValue / ind.target_value) * 100)
                                                            : 0;
                                                        const ragStatus = getRAGStatus(numValue, ind.target_value);
                                                        const hasChanged = updates[ind.id]?.hasChanged || false;
                                                        const hasEvidence = updates[ind.id]?.evidenceFile || updates[ind.id]?.evidenceUrl?.trim() || ind.evidence_url;
                                                        const hasReason = updates[ind.id]?.evidenceReason?.trim();
                                                        const isInvalid = hasChanged && !hasEvidence && !hasReason;

                                                        return (
                                                            <div
                                                                key={ind.id}
                                                                className={cn(
                                                                    "grid grid-cols-[2fr,0.7fr,0.7fr,1fr,0.7fr,0.5fr,0.5fr,1.2fr,1.5fr,0.5fr,0.5fr,0.5fr] gap-2 items-center p-2 rounded-lg border",
                                                                    hasChanged && "border-primary/50 bg-muted/30",
                                                                    isInvalid && "border-destructive/50 bg-destructive/5"
                                                                )}
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium">{ind.name}</p>
                                                                    {ind.frequency && (
                                                                        <Badge variant="outline" className="text-[10px] mt-1">
                                                                            {ind.frequency}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-center text-sm">
                                                                    {ind.target_value ?? '—'} {ind.unit}
                                                                </div>
                                                                <div className="text-center">
                                                                    {ind.previous_value !== null ? (
                                                                        <Badge variant="secondary" className="font-mono text-xs">
                                                                            {ind.previous_value}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={currentValue}
                                                                        onChange={(e) => handleValueChange(ind.id, e.target.value, ind.current_value)}
                                                                        placeholder="Enter value"
                                                                        className="h-8 text-sm text-center"
                                                                    />
                                                                </div>
                                                                <div className="text-center">
                                                                    <span className="text-sm font-semibold">{progress}%</span>
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <RAGBadge status={ragStatus} />
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    {hasEvidence ? (
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                openEvidenceUrl(updates[ind.id]?.evidenceUrl || ind.evidence_url);
                                                                            }}
                                                                            className="hover:opacity-70"
                                                                        >
                                                                            <Paperclip className="h-4 w-4 text-primary cursor-pointer" />
                                                                        </button>
                                                                    ) : (
                                                                        <Paperclip className="h-4 w-4 text-muted-foreground/30" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <Input
                                                                        type="url"
                                                                        value={updates[ind.id]?.evidenceUrl || ''}
                                                                        onChange={(e) => handleUrlChange(ind.id, e.target.value)}
                                                                        placeholder="Evidence link"
                                                                        className={cn(
                                                                            "h-8 text-xs",
                                                                            isInvalid && "border-destructive"
                                                                        )}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    {!hasEvidence ? (
                                                                        <textarea
                                                                            value={updates[ind.id]?.evidenceReason || ''}
                                                                            onChange={(e) => handleReasonChange(ind.id, e.target.value)}
                                                                            placeholder="Why no evidence?"
                                                                            className={cn(
                                                                                "w-full h-16 px-2 py-1 text-xs border rounded resize-none bg-background",
                                                                                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                                                                                isInvalid && "border-destructive"
                                                                            )}
                                                                            maxLength={500}
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">—</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8"
                                                                        onClick={() => setHistoryDialog({
                                                                            open: true,
                                                                            indicatorId: ind.id,
                                                                            indicatorName: ind.name,
                                                                            krName: ind.kr_name,
                                                                            targetValue: ind.target_value,
                                                                            unit: ind.unit
                                                                        })}
                                                                    >
                                                                        <History className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <label htmlFor={`file-${ind.id}`} className="cursor-pointer">
                                                                        <Upload className={cn(
                                                                            "h-4 w-4",
                                                                            updates[ind.id]?.evidenceFile ? "text-green-500" : "text-muted-foreground"
                                                                        )} />
                                                                        <input
                                                                            id={`file-${ind.id}`}
                                                                            type="file"
                                                                            className="hidden"
                                                                            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                                                                            onChange={(e) => handleFileChange(ind.id, e.target.files?.[0] || null)}
                                                                        />
                                                                    </label>
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    {hasChanged && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-primary hover:text-primary"
                                                                            title="Save this entry"
                                                                            onClick={() => handleSaveSingle(ind.id)}
                                                                            disabled={saving || isInvalid || !currentValue}
                                                                        >
                                                                            <Save className="h-4 w-4" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {filteredIndicators.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Indicators Found</h3>
                        <p className="text-muted-foreground">
                            Try adjusting your filters or check back later.
                        </p>
                    </CardContent>
                </Card>
            )}

            <IndicatorHistoryDialog
                open={historyDialog.open}
                onOpenChange={(open) => setHistoryDialog({ ...historyDialog, open })}
                indicatorId={historyDialog.indicatorId}
                indicatorName={historyDialog.indicatorName}
                krName={historyDialog.krName}
                targetValue={historyDialog.targetValue}
                unit={historyDialog.unit}
            />
        </div>
    );
}
