import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, Users, Package, BarChart3 } from "lucide-react";

interface MappingStats {
  totalIndicators: number;
  configuredIndicators: number;
  customersByTier: { tier: string; count: number }[];
  featuresByCategory: { category: string; count: number }[];
}

export function MappingOverviewCard() {
  const [stats, setStats] = useState<MappingStats>({
    totalIndicators: 0,
    configuredIndicators: 0,
    customersByTier: [],
    featuresByCategory: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [indicatorsRes, configRes, customersRes, featuresRes] = await Promise.all([
        supabase.from('indicators').select('id', { count: 'exact' }),
        supabase.from('indicator_config').select('indicator_id'),
        supabase.from('customers').select('tier'),
        supabase.from('features').select('category')
      ]);

      // Count customers by tier
      const tierCounts = new Map<string, number>();
      customersRes.data?.forEach(c => {
        const tier = c.tier || 'Unassigned';
        tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
      });

      // Count features by category
      const categoryCounts = new Map<string, number>();
      featuresRes.data?.forEach(f => {
        const category = f.category || 'Uncategorized';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });

      // Get unique configured indicators
      const configuredIds = new Set(configRes.data?.map(c => c.indicator_id) || []);

      setStats({
        totalIndicators: indicatorsRes.count || 0,
        configuredIndicators: configuredIds.size,
        customersByTier: Array.from(tierCounts.entries())
          .map(([tier, count]) => ({ tier, count }))
          .sort((a, b) => a.tier.localeCompare(b.tier)),
        featuresByCategory: Array.from(categoryCounts.entries())
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => a.category.localeCompare(b.category))
      });
    } catch (error) {
      console.error('Error fetching mapping stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const configuredPercentage = stats.totalIndicators > 0 
    ? Math.round((stats.configuredIndicators / stats.totalIndicators) * 100) 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Mapping Overview</CardTitle>
        </div>
        <CardDescription>Summary of KPI driver configuration status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Indicator Configuration Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {configuredPercentage >= 80 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm font-medium">Indicators Configured</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {stats.configuredIndicators}/{stats.totalIndicators}
            </span>
          </div>
          <Progress value={configuredPercentage} className="h-2" />
          {stats.totalIndicators - stats.configuredIndicators > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalIndicators - stats.configuredIndicators} indicator(s) need scope configuration
            </p>
          )}
        </div>

        {/* Customer Coverage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Customers by Tier</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.customersByTier.map(({ tier, count }) => (
              <Badge key={tier} variant="outline" className="text-xs">
                {tier}: {count}
              </Badge>
            ))}
            {stats.customersByTier.length === 0 && (
              <p className="text-xs text-muted-foreground">No customers found</p>
            )}
          </div>
        </div>

        {/* Feature Coverage */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Features by Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.featuresByCategory.map(({ category, count }) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}: {count}
              </Badge>
            ))}
            {stats.featuresByCategory.length === 0 && (
              <p className="text-xs text-muted-foreground">No features found</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
