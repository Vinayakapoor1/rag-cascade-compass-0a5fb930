import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Paperclip, Link2, Trash2, Upload, ExternalLink, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  attachment_type: 'file' | 'link';
  file_name: string | null;
  file_path: string | null;
  link_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface CustomerAttachmentsProps {
  customerId: string;
  departmentId: string;
  period: string;
}

export function CustomerAttachments({ customerId, departmentId, period }: CustomerAttachmentsProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttachments();
  }, [customerId, departmentId, period]);

  const fetchAttachments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('csm_checkin_attachments' as any)
      .select('*')
      .eq('customer_id', customerId)
      .eq('department_id', departmentId)
      .eq('period', period)
      .order('created_at', { ascending: false });
    setAttachments((data as any as Attachment[]) || []);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const filePath = `${customerId}/${period}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('evidence-files')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('csm_checkin_attachments' as any)
        .insert({
          customer_id: customerId,
          department_id: departmentId,
          period,
          attachment_type: 'file',
          file_name: file.name,
          file_path: filePath,
          created_by: user.id,
        });
      if (insertError) throw insertError;

      toast.success(`Uploaded "${file.name}"`);
      fetchAttachments();
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
        .from('csm_checkin_attachments' as any)
        .insert({
          customer_id: customerId,
          department_id: departmentId,
          period,
          attachment_type: 'link',
          link_url: url,
          created_by: user.id,
        });
      if (error) throw error;
      setLinkUrl('');
      toast.success('Link added');
      fetchAttachments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add link');
    }
  };

  const handleDelete = async (att: Attachment) => {
    try {
      if (att.attachment_type === 'file' && att.file_path) {
        await supabase.storage.from('evidence-files').remove([att.file_path]);
      }
      await supabase
        .from('csm_checkin_attachments' as any)
        .delete()
        .eq('id', att.id);
      toast.success('Attachment removed');
      fetchAttachments();
    } catch (err: any) {
      toast.error('Failed to remove attachment');
    }
  };

  const openFile = async (att: Attachment) => {
    if (att.attachment_type === 'link' && att.link_url) {
      window.open(att.link_url, '_blank');
      return;
    }
    if (att.file_path) {
      const { data } = await supabase.storage
        .from('evidence-files')
        .createSignedUrl(att.file_path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    }
  };

  return (
    <div className="border-t pt-3 mt-2 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        <Paperclip className="h-3.5 w-3.5" />
        Attachments & Links
      </p>

      {/* Add controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Attach File
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="flex items-center gap-1">
          <Input
            placeholder="Paste link URL..."
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddLink()}
            className="h-8 text-xs w-48"
          />
          <Button variant="outline" size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()} className="gap-1 text-xs">
            <Link2 className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      {/* Existing attachments */}
      {!loading && attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5 group">
              {att.attachment_type === 'file' ? (
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              ) : (
                <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => openFile(att)}
                className="text-primary hover:underline truncate text-left flex-1"
              >
                {att.attachment_type === 'file' ? att.file_name : att.link_url}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => handleDelete(att)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
