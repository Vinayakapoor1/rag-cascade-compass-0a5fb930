import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import DataEntryTimeline from './DataEntryTimeline';
import { Activity } from 'lucide-react';

export default function AdminDashboard() {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="h-8 w-8" />
                        Activity Timeline
                    </h1>
                    <p className="text-muted-foreground">Monitor all data entry activities and system events.</p>
                </div>

                <Link to="/data">
                    <Button variant="outline" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Manage Data
                    </Button>
                </Link>
            </div>

            <div className="bg-background/50 rounded-lg">
                <DataEntryTimeline />
            </div>
        </div>
    );
}
