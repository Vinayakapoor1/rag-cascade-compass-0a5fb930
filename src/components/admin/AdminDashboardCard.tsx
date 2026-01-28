import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Users, Package, Upload, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";

interface DashboardStats {
  totalIndicators: number;
  indicatorsWithConfig: number;
  totalCustomers: number;
  totalFeatures: number;
  recentActivity: string[];
}

interface AdminDashboardCardProps {
  onQuickAction: (action: 'add-indicator' | 'add-customer' | 'upload') => void;
  userEmail?: string;
}

export function AdminDashboardCard({ onQuickAction, userEmail }: AdminDashboardCardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalIndicators: 0,
    indicatorsWithConfig: 0,
    totalCustomers: 0,
    totalFeatures: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [indicatorsRes, configRes, customersRes, featuresRes] = await Promise.all([
        supabase.from('indicators').select('id', { count: 'exact' }),
        supabase.from('indicator_config').select('indicator_id', { count: 'exact' }),
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('features').select('id', { count: 'exact' })
      ]);

      setStats({
        totalIndicators: indicatorsRes.count || 0,
        indicatorsWithConfig: configRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalFeatures: featuresRes.count || 0,
        recentActivity: []
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const configuredPercentage = stats.totalIndicators > 0 
    ? Math.round((stats.indicatorsWithConfig / stats.totalIndicators) * 100) 
    : 0;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Welcome back{userEmail ? `, ${userEmail.split('@')[0]}` : ''}</CardTitle>
            <CardDescription>Here's an overview of your OKR system</CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">Admin</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Quick Actions</h4>
          <div className="grid grid-cols-3 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => onQuickAction('add-indicator')}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-xs">Add Indicator</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => onQuickAction('add-customer')}
            >
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs">Add Customer</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => onQuickAction('upload')}
            >
              <Upload className="h-5 w-5 text-primary" />
              <span className="text-xs">Bulk Upload</span>
            </Button>
          </div>
        </div>

        {/* System Health */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">System Health</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                {configuredPercentage >= 80 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm">Indicator Configuration</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stats.indicatorsWithConfig}/{stats.totalIndicators}</span>
                <Badge variant={configuredPercentage >= 80 ? "default" : "secondary"} className="text-xs">
                  {configuredPercentage}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Customers</span>
              </div>
              <span className="text-sm font-medium">{stats.totalCustomers}</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Platform Features</span>
              </div>
              <span className="text-sm font-medium">{stats.totalFeatures}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
