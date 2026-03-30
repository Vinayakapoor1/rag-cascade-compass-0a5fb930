import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import DataEntryTimeline from './DataEntryTimeline';
import { Activity, FileText, ClipboardCheck, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VisibilitySettingsTab } from '@/components/admin/VisibilitySettingsTab';

export default function AdminDashboard() {
    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Activity className="h-8 w-8" />
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground">Audit trails, compliance reports, and system monitoring.</p>
                </div>

                <Link to="/data">
                    <Button variant="outline" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Manage Data
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="audit">
                <TabsList>
                    <TabsTrigger value="audit" className="gap-2">
                        <Activity className="h-4 w-4" />
                        Audit Trail
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Reports
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="audit" className="mt-4">
                    <div className="bg-background/50 rounded-lg">
                        <DataEntryTimeline />
                    </div>
                </TabsContent>

                <TabsContent value="reports" className="mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="card-3d hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ClipboardCheck className="h-5 w-5 text-primary" />
                                    CSM Compliance Report
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    Full breakdown of every parameter filled by CSMs across all customers. View completion rates, remarks on red scores, and per-department fill status.
                                </p>
                                <Link to="/compliance-report">
                                    <Button variant="default" className="gap-2 w-full">
                                        <FileText className="h-4 w-4" />
                                        View CSM Compliance
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="card-3d hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ClipboardCheck className="h-5 w-5 text-primary" />
                                    Content Management Compliance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    Compliance tracking for Content Management department. View managed services customer data entry status and completion details.
                                </p>
                                <Link to="/content-management/compliance">
                                    <Button variant="default" className="gap-2 w-full">
                                        <FileText className="h-4 w-4" />
                                        View Content Mgmt Compliance
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
