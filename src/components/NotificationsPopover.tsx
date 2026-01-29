import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { ActivityTimelineMini } from '@/components/ActivityTimelineMini';
import { Link } from 'react-router-dom';

export function NotificationsPopover() {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative bg-transparent hover:bg-muted data-[state=open]:bg-muted">
                    <Activity className="h-5 w-5 text-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">Recent Activity</h3>
                    </div>
                    <Button variant="link" size="sm" className="text-xs h-auto px-0 text-primary hover:text-primary/80" asChild>
                        <Link to="/admin">View All →</Link>
                    </Button>
                </div>

                <ActivityTimelineMini limit={10} />
            </PopoverContent>
        </Popover>
    );
}
