import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { History, Download, FileText, Calendar, User, Pencil, Save, X, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface HistoryEntry {
    id: string;
    indicator_id: string;
    value: number;
    period: string;
    evidence_url: string | null;
    no_evidence_reason: string | null;
    notes: string | null;
    created_at: string;
    created_by: string;
}

interface IndicatorHistoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    indicatorId: string;
    indicatorName: string;
    krName?: string;
    targetValue?: number | null;
    unit: string | null;
}

export function IndicatorHistoryDialog({
    open,
    onOpenChange,
    indicatorId,
    indicatorName,
    krName,
    targetValue,
    unit
}: IndicatorHistoryDialogProps) {
    const { user } = useAuth();
    const { logActivity } = useActivityLog();
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        if (open && indicatorId) {
            fetchHistory();
        }
    }, [open, indicatorId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // @ts-ignore - indicator_history table not in generated types yet
            const { data, error } = await supabase
                .from('indicator_history')
                .select('*')
                .eq('indicator_id', indicatorId)
                .order('period', { ascending: false });

            if (error) {
                console.error('Error fetching history:', error);
                setHistory([]);
            } else {
                setHistory((data as any[]) || []);
            }
        } catch (error) {
            console.error('Error:', error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (entry: HistoryEntry) => {
        setEditingId(entry.id);
        setEditValue(entry.value.toString());
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const deleteHistoryEntry = async (entryId: string, period: string) => {
        try {
            const { error, data } = await supabase
                .from('indicator_history')
                .delete()
                .eq('id', entryId)
                .select();

            if (error) throw error;

            // Check if any rows were actually deleted (RLS might silently block)
            if (!data || data.length === 0) {
                toast.error('You can only delete entries you created.');
                setDeleteConfirmId(null);
                return;
            }

            await logActivity({
                action: 'delete',
                entityType: 'indicator',
                entityId: indicatorId,
                entityName: indicatorName,
                oldValue: { period },
                metadata: { 
                    deleted_history_entry: true,
                    period 
                }
            });

            toast.success('History entry deleted');
            setDeleteConfirmId(null);
            fetchHistory();
        } catch (error) {
            console.error('Error deleting history:', error);
            toast.error('Failed to delete entry. You may only delete entries you created.');
        }
    };

    const saveEdit = async (entry: HistoryEntry) => {
        const newValue = parseFloat(editValue);
        if (isNaN(newValue)) {
            toast.error('Please enter a valid number');
            return;
        }

        try {
            // Calculate old and new RAG status
            const oldRAG = getRAGStatus(entry.value);
            const newRAG = getRAGStatus(newValue);

            // @ts-ignore - indicator_history table not in generated types yet
            const { error } = await supabase
                .from('indicator_history')
                .update({ value: newValue })
                .eq('id', entry.id);

            if (error) throw error;

            // Log the edit activity
            await logActivity({
                action: 'update',
                entityType: 'indicator',
                entityId: indicatorId,
                entityName: indicatorName,
                oldValue: { current_value: entry.value },
                newValue: { current_value: newValue },
                metadata: {
                    kr_name: krName,
                    period: entry.period,
                    user_email: user!.email,
                    is_historical_edit: true,
                    old_rag_status: oldRAG,
                    new_rag_status: newRAG,
                    target_value: targetValue,
                    unit: unit
                }
            });

            toast.success('History entry updated');
            setEditingId(null);
            setEditValue('');
            fetchHistory();
        } catch (error) {
            console.error('Error updating history:', error);
            toast.error('Failed to update entry');
        }
    };

    const getRAGStatus = (value: number): string => {
        if (!targetValue || targetValue === 0) return 'gray';
        const progress = (value / targetValue) * 100;
        if (progress >= 76) return 'green';
        if (progress >= 51) return 'amber';
        return 'red';
    };

    const getRAGColor = (status: string) => {
        switch (status) {
            case 'green': return 'bg-green-500/10 text-green-700 border-green-500/20';
            case 'amber': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
            case 'red': return 'bg-red-500/10 text-red-700 border-red-500/20';
            default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
        }
    };

    const handleDownloadEvidence = async (url: string) => {
        if (!url) return;
        
        // If it's already a full URL (external link), open directly
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
        
        // For storage paths, create a signed URL
        const { data, error } = await supabase.storage.from('evidence-files').createSignedUrl(url, 3600);
        if (error) {
            console.error('Error creating signed URL:', error);
            toast.error('Could not access evidence file');
            return;
        }
        window.open(data.signedUrl, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Data Entry History
                    </DialogTitle>
                    <DialogDescription asChild>
                        <div className="space-y-1 mt-2">
                            <p className="font-medium text-foreground">{indicatorName}</p>
                            {krName && <p className="text-xs">Key Result: {krName}</p>}
                            {targetValue && (
                                <p className="text-xs">Target: {targetValue}{unit ? ` ${unit}` : ''}</p>
                            )}
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[500px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-muted-foreground">Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-muted-foreground mb-2">No history entries found</p>
                            <p className="text-xs text-muted-foreground">
                                Data entries will appear here once you save values
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Evidence</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Entered</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((entry, index) => {
                                    const ragStatus = getRAGStatus(entry.value);
                                    const isEditing = editingId === entry.id;

                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono">
                                                        {entry.period}
                                                    </Badge>
                                                    {index === 0 && (
                                                        <Badge className="bg-green-500 text-xs">Latest</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        type="number"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        className="w-24"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="font-mono font-semibold">
                                                        {entry.value}{unit ? ` ${unit}` : ''}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn(
                                                    "text-xs uppercase font-medium",
                                                    getRAGColor(ragStatus)
                                                )}>
                                                    {ragStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {entry.evidence_url ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 gap-1"
                                                        onClick={() => handleDownloadEvidence(entry.evidence_url!)}
                                                    >
                                                        <FileText className="h-3 w-3" />
                                                        <span className="text-xs">View</span>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {entry.no_evidence_reason ? (
                                                    <div className="max-w-xs">
                                                        <Badge variant="outline" className="mb-1 text-[10px]">No Evidence</Badge>
                                                        <p className="text-muted-foreground line-clamp-2">{entry.no_evidence_reason}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(entry.created_at), 'MMM d, yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2"
                                                            onClick={() => saveEdit(entry)}
                                                        >
                                                            <Save className="h-3 w-3 mr-1" />
                                                            Save
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2"
                                                            onClick={cancelEdit}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : deleteConfirmId === entry.id ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-xs text-destructive mr-1">Delete?</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 text-destructive"
                                                            onClick={() => deleteHistoryEntry(entry.id, entry.period)}
                                                        >
                                                            Yes
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2"
                                                            onClick={() => setDeleteConfirmId(null)}
                                                        >
                                                            No
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 gap-1"
                                                            onClick={() => startEdit(entry)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                            <span className="text-xs">Edit</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 gap-1 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteConfirmId(entry.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
