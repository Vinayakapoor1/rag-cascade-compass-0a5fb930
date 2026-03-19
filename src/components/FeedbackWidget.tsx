import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

export function FeedbackWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 0.5, // reduce size
        logging: false,
        ignoreElements: (el) => el.closest?.('[data-feedback-widget]') !== null,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png', 0.7)
      );
      if (!blob) return null;

      const fileName = `${user.id}/${Date.now()}.png`;
      const { error } = await supabase.storage
        .from('feedback-screenshots')
        .upload(fileName, blob, { contentType: 'image/png' });

      if (error) {
        console.error('Screenshot upload failed:', error);
        return null;
      }
      return fileName;
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 2000) {
      toast.error(trimmed ? 'Feedback must be under 2000 characters' : 'Please enter your feedback');
      return;
    }

    setSubmitting(true);

    // Capture screenshot first (before closing the popover)
    const screenshotPath = await captureScreenshot();

    const { error } = await supabase.from('feedbacks').insert({
      user_id: user.id,
      user_email: user.email ?? null,
      page_url: location.pathname,
      message: trimmed,
      screenshot_path: screenshotPath,
    } as any);

    setSubmitting(false);
    if (error) {
      toast.error('Failed to submit feedback');
    } else {
      toast.success('Feedback submitted — thank you!');
      setMessage('');
      setOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50" data-feedback-widget>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className="rounded-full shadow-lg shadow-primary/30 hover-glow animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] gap-2 px-4 h-12"
            title="Send feedback"
          >
            <MessageSquarePlus className="h-5 w-5" />
            <span className="text-sm font-medium">Have a feedback? Report it</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-80 p-4 space-y-3">
          <p className="text-sm font-semibold">Send Feedback</p>
          <p className="text-xs text-muted-foreground">Report a bug or suggest an improvement. A screenshot will be captured automatically.</p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue or suggestion…"
            rows={4}
            maxLength={2000}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{message.length}/2000</span>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !message.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              {submitting ? 'Capturing…' : 'Submit'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
