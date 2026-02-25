import { useState } from 'react';
import { useOrgObjectives } from '@/hooks/useOrgObjectives';
import { useAuth } from '@/hooks/useAuth';
import { DashboardDepartmentCard } from '@/components/DashboardDepartmentCard';
import { BusinessOutcomeSection } from '@/components/BusinessOutcomeSection';
import { RAGLegend } from '@/components/RAGLegend';
import { ActivityTimelineWidget } from '@/components/ActivityTimelineWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RAGBadge } from '@/components/RAGBadge';
import { getRAGMutedBg, getRAGBorderColor } from '@/lib/ragUtils';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { LayoutDashboard, LogIn, Settings, Building2, Target, TrendingUp, RefreshCw, Layers, ClipboardCheck } from 'lucide-react';
import { CSMComplianceWidget } from '@/components/CSMComplianceWidget';
import { ContentMgmtComplianceWidget } from '@/components/ContentMgmtComplianceWidget';

import { OrgObjectiveColor, RAGStatus } from '@/types/venture';

const Index = () => {
  const { data: orgObjectives, isLoading, error, refetch } = useOrgObjectives();
  const { user, isAdmin, isDepartmentHead, isCSM, isContentManager, loading: authLoading } = useAuth();

  // Calculate totals
  const totalOrgObjectives = orgObjectives?.length ?? 0;
  const totalDepartments = orgObjectives?.reduce((sum, obj) => sum + obj.departments.length, 0) ?? 0;
  const totalFOs = orgObjectives?.reduce((sum, obj) =>
    sum + obj.departments.reduce((dSum, dept) => dSum + dept.functional_objectives.length, 0), 0) ?? 0;
  const totalKRs = orgObjectives?.reduce((sum, obj) =>
    sum + obj.departments.reduce((dSum, dept) =>
      dSum + dept.functional_objectives.reduce((foSum, fo) => foSum + fo.key_results.length, 0), 0), 0) ?? 0;
  const totalIndicators = orgObjectives?.reduce((sum, obj) =>
    sum + obj.departments.reduce((dSum, dept) =>
      dSum + dept.functional_objectives.reduce((foSum, fo) =>
        foSum + fo.key_results.reduce((krSum, kr) => krSum + kr.indicators.length, 0), 0), 0), 0) ?? 0;

  // Get unique business outcome from org objectives
  const businessOutcome = orgObjectives?.find(obj => obj.business_outcome)?.business_outcome ?? null;

  // Calculate overall health and percentage - only if there's data
  const calculateOverallHealthAndPercentage = (): { status: RAGStatus; percentage: number } => {
    if (!orgObjectives || orgObjectives.length === 0) return { status: 'not-set', percentage: 0 };
    const healthyObjectives = orgObjectives.filter(obj => obj.okrHealth !== 'not-set');
    if (healthyObjectives.length === 0) return { status: 'not-set', percentage: 0 };

    // Calculate average progress across all org objectives
    const avgProgress = orgObjectives.reduce((sum, obj) => sum + obj.okrProgress, 0) / orgObjectives.length;
    const firstStatus = healthyObjectives[0].okrHealth;
    return { status: firstStatus, percentage: avgProgress };
  };

  const overallHealthData = calculateOverallHealthAndPercentage();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: Layers, value: totalOrgObjectives, label: 'Org Objectives', color: 'primary' },
    { icon: Building2, value: totalDepartments, label: 'Departments', color: 'org-blue' },
    { icon: Target, value: totalFOs, label: 'Functional Objectives', color: 'org-purple' },
    { icon: TrendingUp, value: totalKRs, label: 'Key Results', color: 'org-green' },
    { icon: TrendingUp, value: totalIndicators, label: 'Indicators', color: 'org-orange' },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-orb w-[800px] h-[800px] -top-[400px] -right-[300px] animate-float" />
        <div className="gradient-orb w-[600px] h-[600px] top-1/3 -left-[300px]" style={{ animationDelay: '-2s' }} />
        <div className="gradient-orb w-[400px] h-[400px] bottom-0 right-1/4" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-border/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/images/klarity-logo.png"
                alt="KlaRity by Infosec Ventures"
                className="h-10 w-auto logo-dark-mode-adjust"
              />
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Badge variant="outline" className="hidden sm:inline-flex glass-card px-3 py-1">
                    {user.email}
                  </Badge>
                  {isAdmin && (
                    <Button variant="outline" size="sm" asChild className="glass-card hover-glow border-primary/20">
                      <Link to="/data">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Data
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <Button size="sm" asChild className="hover-glow shadow-lg shadow-primary/30">
                  <Link to="/auth">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to Update
                  </Link>
                </Button>
              )}
              <RAGLegend />
              <Button variant="ghost" size="icon" onClick={() => refetch()} className="hover:bg-primary/10 transition-colors">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 relative">
        {/* Business Outcome Section */}
        {!isLoading && businessOutcome && (
          <BusinessOutcomeSection
            businessOutcome={businessOutcome}
            status={overallHealthData.status}
            percentage={overallHealthData.percentage}
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statCards.map((stat, index) => (
            <div
              key={index}
              className="stats-card p-5 group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
                  `bg-${stat.color}/10`
                )}>
                  <stat.icon className={cn('h-5 w-5', `text-${stat.color}`)} />
                </div>
                <div>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>


        {/* Login prompt for non-logged in users */}
        {!user && (
          <div className="card-premium p-6">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-primary/10 animate-float">
                  <LogIn className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Sign in to update indicator values</p>
                  <p className="text-sm text-muted-foreground">
                    Logged in users can enter their data to calculate RAG status
                  </p>
                </div>
              </div>
              <Button asChild className="hover-glow shadow-lg shadow-primary/30">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Team Leader Instructions - Only for department heads (not admins) */}
        {user && isDepartmentHead && !isAdmin && (
          <div className="card-premium p-6 border-primary/20">
            <div className="flex items-start gap-5 relative z-10">
              <div className="p-4 rounded-2xl bg-primary/10 animate-float">
                <ClipboardCheck className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg mb-2">Team Leader Data Entry Guide</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click on your department below to expand it</li>
                  <li>Navigate to the indicators you need to update</li>
                  <li>Enter current values, attach evidence files or add links</li>
                  <li>If no evidence available, provide a reason</li>
                  <li>Click Save to submit your data</li>
                </ol>
              </div>
              <Button asChild className="hover-glow shadow-lg shadow-primary/30">
                <Link to="/data">Go to Data Entry</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Content Manager Instructions - Only for content managers (not admins) */}
        {user && isContentManager && !isAdmin && (
          <div className="card-premium p-6 border-primary/20">
            <div className="flex items-start gap-5 relative z-10">
              <div className="p-4 rounded-2xl bg-primary/10 animate-float">
                <ClipboardCheck className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg mb-2">Content Management Data Entry Guide</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Navigate to Content Management Data Entry</li>
                  <li>Select the reporting period (month or week)</li>
                  <li>Expand a managed services customer to see their feature × KPI matrix</li>
                  <li>Select the appropriate RAG band for each cell</li>
                  <li>Use "Apply to Row" or "Apply to Column" for bulk entry</li>
                  <li>Click Save to submit your scores</li>
                </ol>
              </div>
              <Button asChild className="hover-glow shadow-lg shadow-primary/30">
                <Link to="/content-management/data-entry">Go to Data Entry</Link>
              </Button>
            </div>
          </div>
        )}

        {/* CSM Compliance Widget - for admins and CSMs */}
        {user && (isAdmin || isCSM) && <CSMComplianceWidget />}

        {/* Content Management Compliance Widget - for admins and content managers */}
        {user && (isAdmin || isContentManager) && <ContentMgmtComplianceWidget />}

        {/* Activity Timeline Widget - Only for logged in users */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityTimelineWidget />
            </div>
            <div className="space-y-4">
              {/* Placeholder for future widgets */}
              <Card className="glass-card p-6 text-center text-muted-foreground">
                <p className="text-sm">Additional widgets coming soon</p>
              </Card>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-card p-6">
                <Skeleton className="h-6 w-48 mb-2 shimmer" />
                <Skeleton className="h-4 w-32 shimmer" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card border-destructive/50 bg-destructive/5 p-8 text-center">
            <p className="text-destructive mb-4 font-medium">Failed to load data</p>
            <Button onClick={() => refetch()} variant="outline" className="hover-glow">Retry</Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && (!orgObjectives || orgObjectives.length === 0) && (
          <div className="glass-card p-16 text-center">
            <div className="p-5 rounded-2xl bg-muted/50 w-fit mx-auto mb-6 animate-float">
              <Building2 className="h-14 w-14 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-3">No Data Yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Upload your OKR data to get started with tracking your organizational objectives
            </p>
            {isAdmin && (
              <Button asChild className="hover-glow shadow-lg shadow-primary/30">
                <Link to="/data">Go to Data Management</Link>
              </Button>
            )}
          </div>
        )}

        {/* Org Objectives with Departments */}
        {!isLoading && !error && orgObjectives && orgObjectives.length > 0 && (
          <div className="space-y-8">
            {orgObjectives.map((obj, index) => (
              <div
                key={obj.id}
                className="space-y-4"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                {/* Org Objective Header */}
                <div className={cn(
                  'glass-card flex items-center justify-between p-5 border-l-4 transition-all duration-300',
                  getRAGBorderColor(obj.okrHealth)
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'h-5 w-5 rounded-full ring-4 ring-offset-2 ring-offset-card transition-transform duration-300 hover:scale-110',
                      `bg-org-${obj.color}`,
                      `ring-org-${obj.color}/20`
                    )} />
                    <div>
                      <h2 className="text-xl font-semibold">{obj.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {obj.departments.length} Departments • {obj.classification}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-xs glass px-3 py-1">{obj.classification}</Badge>
                    <RAGBadge status={obj.okrHealth} size="sm" showLabel />
                  </div>
                </div>

                {/* Departments under this Org Objective */}
                <div className="grid gap-4 pl-5">
                  {obj.departments.map(dept => (
                    <DashboardDepartmentCard
                      key={dept.id}
                      department={dept}
                      color={obj.color as OrgObjectiveColor}
                      isLoggedIn={!!user}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;