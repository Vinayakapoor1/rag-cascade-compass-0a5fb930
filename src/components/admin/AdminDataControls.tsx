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
import { Trash2, AlertTriangle, FileText, Link as LinkIcon, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface IndicatorData {
    id: string;
    name: string;
    current_value: number | null;
    evidence_file: string | null;
    evidence_url: string | null;
    evidence_reason: string | null;
    rag_status: string;
    updated_at: string;
    key_result_name: string;
    department_name: string;
    department_id: string;
}

export function AdminDataControls() {
    const [indicators, setIndicators] = useState<IndicatorData[]>([]);
    const [filteredIndicators, setFilteredIndicators] = useState<IndicatorData[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkResetDialogOpen, setBulkResetDialogOpen] = useState(false);
    const [resetAllDialogOpen, setResetAllDialogOpen] = useState(false);
    const [selectedIndicator, setSelectedIndicator] = useState<string | null>(null);

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

            // Fetch indicators with related data
            const { data, error } = await supabase
                .from('indicators')
                .select(`
                    id,
                    name,
                    current_value,
                    evidence_file,
                    evidence_url,
                    evidence_reason,
                    rag_status,
                    updated_at,
                    key_results!inner(
                        name,
                        functional_objectives!inner(
                            department_id,
                            departments!inner(name)
                        )
                    )
                `)
                .order('updated_at', { ascending: false });

            if (error) throw error;

            const formattedData: IndicatorData[] = (data || []).map((ind: any) => ({
                id: ind.id,
                name: ind.name,
                current_value: ind.current_value,
                evidence_file: ind.evidence_file,
                evidence_url: ind.evidence_url,
                evidence_reason: ind.evidence_reason,
                rag_status: ind.rag_status,
                updated_at: ind.updated_at,
                key_result_name: ind.key_results.name,
                department_name: ind.key_results.functional_objectives.departments.name,
                department_id: ind.key_results.functional_objectives.department_id,
            }));

            setIndicators(formattedData);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load indicator data');
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
            const { error } = await supabase.rpc('delete_indicator_data', {
                p_indicator_id: indicatorId
            });

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
            const { data, error } = await supabase.rpc('bulk_reset_indicators', {
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

    const resetAllData = async () => {
        try {
            // Reset all indicators
            const { error: updateError } = await supabase
                .from('indicators')
                .update({
                    current_value: null,
                    evidence_file: null,
                    evidence_url: null,
                    evidence_reason: null,
                    rag_status: 'amber',
                })
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

            if (updateError) throw updateError;

            // Delete all history
            const { error: historyError } = await supabase
                .from('indicator_history')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

            if (historyError) throw historyError;

            toast.success('All indicator data has been reset');
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
        return ind.current_value !== null || ind.evidence_file || ind.evidence_url || ind.evidence_reason;
    };

    const indicatorsWithData = filteredIndicators.filter(hasData);

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
                            <span className="ml-2 font-medium">{indicatorsWithData.length}</span>
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
                                    <TableHead>Value</TableHead>
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
                                            <TableCell className="text-sm">{ind.key_result_name}</TableCell>
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
                                                    {ind.evidence_file && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            File
                                                        </Badge>
                                                    )}
                                                    {ind.evidence_url && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <LinkIcon className="h-3 w-3 mr-1" />
                                                            URL
                                                        </Badge>
                                                    )}
                                                    {ind.evidence_reason && (
                                                        <Badge variant="outline" className="text-xs">
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedIndicator(ind.id);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Single Indicator Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Indicator Data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reset this indicator to its default state (no value, no evidence, RAG status = amber).
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
                            Delete
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
                                    <li>Set all RAG statuses to amber</li>
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
        </div>
    );
}
