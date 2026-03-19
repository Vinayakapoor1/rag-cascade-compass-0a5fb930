import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Feedback {
  id: string;
  user_email: string | null;
  page_url: string;
  message: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  resolved: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  dismissed: 'bg-muted text-muted-foreground border-border',
};

export function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
    setFeedbacks((data as Feedback[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('feedbacks').update({ status }).eq('id', id);
    if (error) { toast.error('Failed to update status'); return; }
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from('feedbacks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setFeedbacks(prev => prev.filter(f => f.id !== id));
    toast.success('Feedback deleted');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!feedbacks.length) {
    return <p className="text-center text-muted-foreground py-12">No feedback submitted yet.</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[180px]">User</TableHead>
            <TableHead className="w-[160px]">Page</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="w-[130px]">Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedbacks.map(fb => (
            <TableRow key={fb.id}>
              <TableCell className="text-xs whitespace-nowrap">{format(new Date(fb.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
              <TableCell className="text-xs truncate max-w-[180px]">{fb.user_email ?? '—'}</TableCell>
              <TableCell className="text-xs font-mono truncate max-w-[160px]" title={fb.page_url}>{fb.page_url}</TableCell>
              <TableCell className="text-sm whitespace-pre-wrap break-words max-w-[300px]">{fb.message}</TableCell>
              <TableCell>
                <Select value={fb.status} onValueChange={(v) => updateStatus(fb.id, v)}>
                  <SelectTrigger className="h-7 w-[110px] text-xs">
                    <Badge variant="outline" className={STATUS_COLORS[fb.status] ?? ''}>
                      {fb.status}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteFeedback(fb.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
