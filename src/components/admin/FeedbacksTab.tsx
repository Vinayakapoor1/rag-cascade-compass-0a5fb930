import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { CheckCircle, Trash2, Loader2, RefreshCw } from 'lucide-react';
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

export default function FeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load feedbacks');
    } else {
      setFeedbacks((data as Feedback[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const markResolved = async (id: string) => {
    const { error } = await supabase
      .from('feedbacks')
      .update({ status: 'resolved' })
      .eq('id', id);
    if (error) { toast.error('Failed to update'); return; }
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status: 'resolved' } : f));
    toast.success('Marked as resolved');
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from('feedbacks').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setFeedbacks(prev => prev.filter(f => f.id !== id));
    toast.success('Feedback deleted');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{feedbacks.length} feedback item(s)</p>
        <Button variant="outline" size="sm" onClick={fetchFeedbacks}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {feedbacks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No feedback yet.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Page</TableHead>
                <TableHead className="max-w-xs">Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedbacks.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {format(new Date(fb.created_at), 'dd MMM yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-xs">{fb.user_email ?? '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{fb.page_url}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs">{fb.message}</TableCell>
                  <TableCell>
                    <Badge variant={fb.status === 'open' ? 'destructive' : 'secondary'}>
                      {fb.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {fb.status === 'open' && (
                      <Button variant="ghost" size="icon" onClick={() => markResolved(fb.id)} title="Mark resolved">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteFeedback(fb.id)} title="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
