import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Paperclip, Link2, Trash2, Upload, Loader2, FileText, ExternalLink, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EvidenceItem {
  id: string;
  evidence_type: 'file' | 'link';
  file_name: string | null;
  file_path: string | null;
  link_url: string | null;
  created_by: string;
  created_at: string;
}

interface IndicatorEvidenceInlineProps {
  indicatorId: string;
  period: string;
  /** Called when evidence count changes so parent can track "has evidence" */
  onEvidenceChange?: (count: number) => void;
}

export function IndicatorEvidenceInline({ indicatorId, period, onEvidenceChange }: IndicatorEvidenceInlineProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);

  useEffect(() => {
    fetchEvidence();
  }, [indicatorId, period]);

  const fetchEvidence = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('indicator_evidence' as any)
      .select('*')
      .eq('indicator_id', indicatorId)
      .eq('period', period)
      .order('created_at', { ascending: false });
    const result = (data as any as EvidenceItem[]) || [];
    setItems(result);
    onEvidenceChange?.(result.length);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const filePath = `evidence/${indicatorId}/${period}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('evidence-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('indicator_evidence' as any)
        .insert({
          indicator_id: indicatorId,
          period,
          evidence_type: 'file',
          file_name: file.name,
          file_path: filePath,
          created_by: user.id,
        });
      if (insertError) throw insertError;

      toast.success(`Uploaded "${file.name}"`);
      fetchEvidence();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim() || !user) return;
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    try {
      const { error } = await supabase
        .from('indicator_evidence' as any)
        .insert({
          indicator_id: indicatorId,
          period,
          evidence_type: 'link',
          link_url: url,
          created_by: user.id,
        });
      if (error) throw error;
      setLinkUrl('');
      setShowAddLink(false);
      toast.success('Link added');
      fetchEvidence();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add link');
    }
  };

  const handleDelete = async (item: EvidenceItem) => {
    try {
      if (item.evidence_type === 'file' && item.file_path) {
        await supabase.storage.from('evidence-files').remove([item.file_path]);
      }
      await supabase
        .from('indicator_evidence' as any)
        .delete()
        .eq('id', item.id);
      toast.success('Evidence removed');
      fetchEvidence();
    } catch (err: any) {
      toast.error('Failed to remove evidence');
    }
  };

  const openItem = async (item: EvidenceItem) => {
    if (item.evidence_type === 'link' && item.link_url) {
      window.open(item.link_url, '_blank');
      return;
    }
    if (item.file_path) {
      const { data } = await supabase.storage
        .from('evidence-files')
        .createSignedUrl(item.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div className="space-y-1.5">
      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload file"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowAddLink(!showAddLink)}
          title="Add link"
        >
          <Link2 className="h-3.5 w-3.5" />
        </Button>
        {items.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-medium ml-0.5">{items.length}</span>
        )}
      </div>

      {/* Add link input */}
      {showAddLink && (
        <div className="flex items-center gap-1">
          <Input
            placeholder="Paste URL..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddLink()}
            className="h-6 text-[11px] flex-1"
          />
          <Button variant="outline" size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()} className="h-6 px-2 text-[10px]">
            Add
          </Button>
        </div>
      )}

      {/* Existing items */}
      {!loading && items.length > 0 && (
        <div className="space-y-0.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-1 text-[11px] bg-muted/30 rounded px-1.5 py-0.5 group">
              {item.evidence_type === 'file' ? (
                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
              ) : (
                <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => openItem(item)}
                className="text-primary hover:underline truncate text-left flex-1 max-w-[120px]"
                title={item.evidence_type === 'file' ? item.file_name || '' : item.link_url || ''}
              >
                {item.evidence_type === 'file' ? item.file_name : item.link_url}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                onClick={() => handleDelete(item)}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
