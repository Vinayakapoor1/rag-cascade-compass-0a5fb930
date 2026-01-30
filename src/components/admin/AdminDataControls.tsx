import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Trash2, AlertTriangle, FileText, Link as LinkIcon, Filter, History, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { IndicatorHistoryDialog } from '@/components/IndicatorHistoryDialog';

interface IndicatorData {
    id: string;
    name: string;
    current_value: number | null;
    target_value: number | null;
    evidence_url: string | null;
    evidence_type: string | null;
    no_evidence_reason: string | null;
    rag_status: string;
    updated_at: string;
    key_result_name: string;
    key_result_id: string;
    department_name: string;
    department_id: string;
}

interface KeyResult {
    id: string;
    name: string;
    department_name: string;
}

// Helper to open evidence URL - handles full URLs, domains without protocol, and storage paths
async function openEvidenceUrl(url: string | null): Promise<void> {
    if (!url) return;
    
    // If it's already a full URL, open directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
        return;
    }
    
    // Check if this looks like a domain (has dots, no slashes at start)
    // Storage paths look like: evidence/uuid/file.pdf
    // Domains look like: google.com, www.example.org
    const isLikelyDomain = url.includes('.') && !url.startsWith('evidence/') && !url.includes('/');
    
    if (isLikelyDomain) {
        // Treat as external URL, add protocol
        window.open('https://' + url, '_blank');
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

export function AdminDataControls() {
    const [indicators, setIndicators] = useState<IndicatorData[]>([]);
    const [filteredIndicators, setFilteredIndicators] = useState<IndicatorData[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [keyResults, setKeyResults] = useState<KeyResult[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkResetDialogOpen, setBulkResetDialogOpen] = useState(false);
    const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);
    const [resetKRDialogOpen, setResetKRDialogOpen] = useState(false);
    const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);
    const [selectedKR, setSelectedKR] = useState<KeyResult | null>(null);
    const [historyDialog, setHistoryDialog] = useState<{
        open: boolean;
        indicatorId: string;
        indicatorName: string;
        targetValue: number | null;
        unit: string | null;
    }>({ open: false, indicatorId: '', indicatorName: '', targetValue: null, unit: null });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterIndicators();
    }, [selectedDepartment, searchTerm, indicators]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch departments
            const { data: deptData } = await supabase
                .from('departments')
                .select('id, name')
                .order('name');
            setDepartments(deptData || []);

            // Fetch indicators with related data using simpler joins
            const { data, error } = await supabase
                .from('indicators')
                .select(`
                    id,
                    name,
                    current_value,
                    target_value,
                    evidence_url,
                    evidence_type,
                    no_evidence_reason,
                    rag_status,
                    updated_at,
                    key_results (
                        id,
                        name,
                        functional_objectives (
                            department_id,
                            departments (name)
                        )
                    )
                `)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Fetched indicators:', data);

            const formattedData: IndicatorData[] = (data || []).map((ind: any) => ({
                id: ind.id,
                name: ind.name,
                current_value: ind.current_value,
                target_value: ind.target_value,
                evidence_url: ind.evidence_url,
                evidence_type: ind.evidence_type,
                no_evidence_reason: ind.no_evidence_reason,
                rag_status: ind.rag_status || 'amber',
                updated_at: ind.updated_at,
                key_result_name: ind.key_results?.name || 'Unknown',
                key_result_id: ind.key_results?.id || '',
                department_name: ind.key_results?.functional_objectives?.departments?.name || 'Unknown',
                department_id: ind.key_results?.functional_objectives?.department_id || '',
            }));

            console.log('Formatted data:', formattedData);
            setIndicators(formattedData);

            // Extract unique key results
            const uniqueKRs = new Map<string, KeyResult>();
            formattedData.forEach(ind => {
                if (ind.key_result_id && !uniqueKRs.has(ind.key_result_id)) {
                    uniqueKRs.set(ind.key_result_id, {
                        id: ind.key_result_id,
                        name: ind.key_result_name,
                        department_name: ind.department_name
                    });
                }
            });
            setKeyResults(Array.from(uniqueKRs.values()));
        } catch (error: any) {
            console.error('Error fetching data:', error);
            toast.error(`Failed to load indicator data: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const filterIndicators = () => {
        let filtered = indicators;

        if (selectedDepartment !== 'all') {
            filtered = filtered.filter(ind => ind.department_id === selectedDepartment);
        }

        if (searchTerm) {
            filtered = filtered.filter(ind =>
                ind.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ind.key_result_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredIndicators(filtered);
    };

    const deleteIndicatorData = async (indicatorId: string) => {
        try {
            // Manually reset the indicator
            const { error } = await supabase
                .from('indicators')
                .update({
                    current_value: null,
                    evidence_url: null,
                    evidence_type: null,
                    no_evidence_reason: null,
                    rag_status: 'not-set',
                })
                .eq('id', indicatorId);

            if (error) throw error;

            toast.success('Indicator data deleted successfully');
            fetchData();
        } catch (error: any) {
            console.error('Error deleting indicator data:', error);
            toast.error(error.message || 'Failed to delete indicator data');
        }
    };

    const bulkResetDepartment = async () => {
        if (selectedDepartment === 'all') {
            toast.error('Please select a specific department');
            return;
        }

        try {
            // @ts-ignore - bulk_reset_indicators function not in generated types yet
            const { data, error } = await supabase.rpc('bulk_reset_indicators' as any, {
                p_department_id: selectedDepartment
            });

            if (error) throw error;

            toast.success(`Reset ${data} indicators successfully`);
            fetchData();
        } catch (error: any) {
            console.error('Error bulk resetting:', error);
            toast.error(error.message || 'Failed to reset indicators');
        }
    };

    const resetKeyResult = async (krId: string) => {
        try {
            // Reset all indicators for this KR
            const { error } = await supabase
                .from('indicators')
                .update({
                    current_value: null,
                    evidence_url: null,
                    evidence_type: null,
                    no_evidence_reason: null,
                    rag_status: 'not-set',
                })
                .eq('key_result_id', krId);

            if (error) throw error;

            // Delete history for these indicators
            const indicatorIds = indicators
                .filter(ind => ind.key_result_id === krId)
                .map(ind => ind.id);

            if (indicatorIds.length > 0) {
                const { error: historyError } = await supabase
                    .from('indicator_history')
                    .delete()
                    .in('indicator_id', indicatorIds);

                if (historyError) {
                    console.warn('History delete error:', historyError);
                }
            }

            toast.success(`Reset all indicators for Key Result successfully`);
            fetchData();
        } catch (error: any) {
            console.error('Error resetting KR:', error);
            toast.error(error.message || 'Failed to reset Key Result');
        }
    };

    const resetAllData = async () => {
        try {
            // Reset all indicators with 'not-set' RAG status (per RAG threshold standards)
            const { error: updateError } = await supabase
                .from('indicators')
                .update({
                    current_value: null,
                    evidence_url: null,
                    evidence_type: null,
                    no_evidence_reason: null,
                    rag_status: 'not-set',
                })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

            if (updateError) throw updateError;

            // Delete all history
            const { error: historyError } = await supabase
                .from('indicator_history')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (historyError) {
                console.warn('History delete error (may be RLS):', historyError);
            }

            // Delete all activity logs for a clean slate
            const { error: logsError } = await supabase
                .from('activity_logs')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (logsError) {
                console.warn('Activity logs delete error (may be RLS):', logsError);
            }

            toast.success('All indicator data, history, and activity logs have been reset');
            fetchData();
        } catch (error: any) {
            console.error('Error resetting all data:', error);
            toast.error(error.message || 'Failed to reset all data');
        }
    };

    const getRAGColor = (status: string) => {
        switch (status) {
            case 'green': return 'bg-green-500/10 text-green-700 border-green-500/20';
            case 'amber': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
            case 'red': return 'bg-red-500/10 text-red-700 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
        }
    };

    const hasData = (ind: IndicatorData) => {
        return ind.current_value !== null || ind.evidence_url || ind.no_evidence_reason;
    };

    // Show all indicators, not just ones with data
    const indicatorsWithData = filteredIndicators;
    const indicatorsCount = filteredIndicators.filter(hasData).length;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Data Management Controls
                            </CardTitle>
                            <CardDescription>
                                View and manage all indicator data entered by department heads
                            </CardDescription>
                        </div>
                        <Button
                            variant="destructive"
                            onClick={() => setResetAllDialogOpen(true)}
                            disabled={indicators.length === 0}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Reset All Data
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Filters:</span>
                        </div>
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="All Departments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Search indicators..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-xs"
                        />
                        {selectedDepartment !== 'all' && (
                            <Button
                                variant="outline"
                                onClick={() => setBulkResetDialogOpen(true)}
                                disabled={indicatorsWithData.length === 0}
                            >
                                Reset Department
                            </Button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Total Indicators:</span>
                            <span className="ml-2 font-medium">{filteredIndicators.length}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">With Data:</span>
                            <span className="ml-2 font-medium">{indicatorsCount}</span>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Key Result</TableHead>
                                    <TableHead>Indicator</TableHead>
                                    <TableHead>Current Value</TableHead>
                                    <TableHead>Evidence</TableHead>
                                    <TableHead>RAG</TableHead>
                                    <TableHead>Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : indicatorsWithData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            No indicators with data found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    indicatorsWithData.map((ind) => (
                                        <TableRow key={ind.id}>
                                            <TableCell className="font-medium">{ind.department_name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm">{ind.key_result_name}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        title="Reset this Key Result"
                                                        onClick={() => {
                                                            setSelectedKR({
                                                                id: ind.key_result_id,
                                                                name: ind.key_result_name,
                                                                department_name: ind.department_name
                                                            });
                                                            setResetKRDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{ind.name}</TableCell>
                                            <TableCell>
                                                {ind.current_value !== null ? (
                                                    <span className="font-mono">{ind.current_value}</span>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {ind.evidence_url && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openEvidenceUrl(ind.evidence_url)}
                                                            className="inline-flex"
                                                        >
                                                            <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10">
                                                                {ind.evidence_type === 'file' ? (
                                                                    <>
                                                                        <FileText className="h-3 w-3 mr-1" />
                                                                        File
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <LinkIcon className="h-3 w-3 mr-1" />
                                                                        Link
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        </button>
                                                    )}
                                                    {ind.no_evidence_reason && (
                                                        <Badge 
                                                            variant="outline" 
                                                            className="text-xs text-muted-foreground cursor-help"
                                                            title={ind.no_evidence_reason}
                                                        >
                                                            Reason
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`uppercase text-xs ${getRAGColor(ind.rag_status)}`}>
                                                    {ind.rag_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(ind.updated_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        title="View History"
                                                        onClick={() => setHistoryDialog({
                                                            open: true,
                                                            indicatorId: ind.id,
                                                            indicatorName: ind.name,
                                                            targetValue: ind.target_value,
                                                            unit: null
                                                        })}
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        title="Reset Indicator (Clear Data)"
                                                        onClick={() => {
                                                            setSelectedIndicator(ind.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <RotateCcw className="h-4 w-4 text-orange-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Reset Single Indicator Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Indicator Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reset this indicator to its default state (no value, no evidence, RAG status = not-set/gray).
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (selectedIndicator) {
                                    deleteIndicatorData(selectedIndicator);
                                }
                                setDeleteDialogOpen(false);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Reset
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Reset Department Dialog */}
            <AlertDialog open={bulkResetDialogOpen} onOpenChange={setBulkResetDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Department Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reset ALL indicators for the selected department to their default state.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                bulkResetDepartment();
                                setBulkResetDialogOpen(false);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Reset Department
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset All Data Dialog */}
            <AlertDialog open={resetAllDialogOpen} onOpenChange={setResetAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Reset ALL Data?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-2">
                                <p className="font-semibold">This will:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Reset ALL indicators across ALL departments</li>
                                    <li>Delete ALL indicator history</li>
                                    <li>Set all RAG statuses to not-set (gray)</li>
                                </ul>
                                <p className="font-semibold text-destructive mt-4">
                                    This action is IRREVERSIBLE. Are you absolutely sure?
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                resetAllData();
                                setResetAllDialogOpen(false);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Yes, Reset Everything
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset Key Result Dialog */}
            <AlertDialog open={resetKRDialogOpen} onOpenChange={setResetKRDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset Key Result Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <div className="space-y-2">
                                <p>This will reset all indicators for:</p>
                                <p className="font-medium text-foreground">{selectedKR?.name}</p>
                                <p className="text-xs">Department: {selectedKR?.department_name}</p>
                                <p className="mt-2">All values, evidence, and history for these indicators will be deleted. This action cannot be undone.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (selectedKR) {
                                    resetKeyResult(selectedKR.id);
                                }
                                setResetKRDialogOpen(false);
                                setSelectedKR(null);
                            }}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Reset Key Result
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Indicator History Dialog */}
            <IndicatorHistoryDialog
                open={historyDialog.open}
                onOpenChange={(open) => setHistoryDialog({ ...historyDialog, open })}
                indicatorId={historyDialog.indicatorId}
                indicatorName={historyDialog.indicatorName}
                targetValue={historyDialog.targetValue}
                unit={historyDialog.unit}
                onDataChange={() => {
                    fetchData();
                }}
            />
        </div>
    );
}
