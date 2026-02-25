import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function BellNotifications() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['bell-notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bell-notifications'] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bell-notifications'] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getIcon = (title: string) => {
    if (title.includes('Compliance') || title.includes('📋'))
      return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    if (title.includes('Reminder') || title.includes('🔔'))
      return <Clock className="h-4 w-4 text-blue-500 shrink-0" />;
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative bg-transparent hover:bg-muted data-[state=open]:bg-muted">
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="text-xs h-auto px-0 text-primary hover:text-primary/80"
              onClick={() => markAllAsRead.mutate()}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex gap-3 p-3 transition-colors hover:bg-muted/50 cursor-pointer',
                    !notification.is_read && 'bg-primary/5'
                  )}
                  onClick={() => {
                    if (!notification.is_read) markAsRead.mutate(notification.id);
                    if (notification.link) {
                      setOpen(false);
                      navigate(notification.link);
                    } else {
                      const t = notification.title;
                      if (t.includes('Compliance') || t.includes('Check-in') || t.includes('📋') || t.includes('⚠️')) {
                        setOpen(false);
                        navigate('/compliance-report');
                      }
                    }
                  }}
                >
                  <div className="mt-0.5">{getIcon(notification.title)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm leading-tight', !notification.is_read ? 'font-semibold' : 'font-medium')}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      {notification.created_at
                        ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
