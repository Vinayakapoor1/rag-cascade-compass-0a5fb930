import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import DataEntryTimeline from './DataEntryTimeline';
import FeedbacksTab from '@/components/admin/FeedbacksTab';
import { Activity, MessageSquare } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AdminDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor activities and user feedback.</p>
        </div>

        <Link to="/data">
          <Button variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            Manage Data
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <Activity className="h-4 w-4" />
            Activity Timeline
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            User Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <div className="bg-background/50 rounded-lg">
            <DataEntryTimeline />
          </div>
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbacksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
