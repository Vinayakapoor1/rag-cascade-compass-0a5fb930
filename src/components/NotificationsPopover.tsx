import { useState, useEffect } from 'react';
import { Bell, Check, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ActivityTimelineMini } from '@/components/ActivityTimelineMini';
import { Link } from 'react-router-dom';

interface Notification {
    id: string;
    title: string;
    message: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}

export function NotificationsPopover() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (user) {
            fetchNotifications();
            subscribeToNotifications();
        }
    }, [user]);

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Error fetching notifications:', error);
            return;
        }

        setNotifications(data || []);
        setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    };

    const subscribeToNotifications = () => {
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user!.id}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification;
                    setNotifications((prev) => [newNotification, ...prev]);
                    setUnreadCount((prev) => prev + 1);
                    toast.info(newNotification.title, {
                        description: newNotification.message,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    };

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking as read:', error);
            return;
        }

        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user!.id)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all as read:', error);
            return;
        }

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5 text-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <Tabs defaultValue="activity" className="w-full">
                    <div className="flex items-center justify-between p-4 border-b">
                        <TabsList className="h-8">
                            <TabsTrigger value="notifications" className="text-xs">
                                <Bell className="h-3 w-3 mr-1" />
                                Notifications
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[9px] flex items-center justify-center">
                                        {unreadCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="activity" className="text-xs">
                                <Activity className="h-3 w-3 mr-1" />
                                Activity
                            </TabsTrigger>
                        </TabsList>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-auto px-2"
                                onClick={markAllAsRead}
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>

                    <TabsContent value="notifications" className="m-0">
                        <ScrollArea className="h-[320px]">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No notifications
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                'p-4 hover:bg-muted/50 transition-colors',
                                                !notification.is_read && 'bg-muted/10'
                                            )}
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h5 className="text-sm font-medium leading-none">
                                                    {notification.title}
                                                </h5>
                                                {!notification.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 text-muted-foreground hover:text-primary"
                                                        onClick={() => markAsRead(notification.id)}
                                                    >
                                                        <span className="sr-only">Mark read</span>
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mb-1">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/70">
                                                {formatDistanceToNow(new Date(notification.created_at), {
                                                    addSuffix: true,
                                                })}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="activity" className="m-0">
                        <ActivityTimelineMini limit={10} />
                        <div className="p-3 border-t">
                            <Button variant="link" size="sm" className="w-full text-xs" asChild>
                                <Link to="/admin">View All Activity →</Link>
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </PopoverContent>
        </Popover>
    );
}
