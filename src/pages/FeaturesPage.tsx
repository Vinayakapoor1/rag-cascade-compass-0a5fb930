import { Link } from 'react-router-dom';
import { useFeaturesWithImpact } from '@/hooks/useFeatureImpact';
import { DrilldownBreadcrumb } from '@/components/DrilldownBreadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Puzzle, Search, Activity, ChevronRight, Loader2, Filter, Tag, Plus, Pencil } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EditFeatureDialog } from '@/components/EditFeatureDialog';
import { AddFeatureDialog } from '@/components/AddFeatureDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function FeaturesPage() {
  const { data: features, isLoading, refetch } = useFeaturesWithImpact();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<{
    id: string;
    name: string;
    category: string | null;
    description: string | null;
    status: string | null;
  } | null>(null);

  const queryClient = useQueryClient();

  // Get unique categories and statuses for filters
  const { categories, statuses } = useMemo(() => {
    if (!features) return { categories: [], statuses: [] };
    return {
      categories: [...new Set(features.map(f => f.category).filter(Boolean))].sort() as string[],
      statuses: [...new Set(features.map(f => f.status).filter(Boolean))].sort() as string[],
    };
  }, [features]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    if (!features) return [];
    return features.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (f.category?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [features, searchQuery, categoryFilter, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    if (!features) return { total: 0, linked: 0, totalLinks: 0 };
    const linked = features.filter(f => f.linkedIndicatorCount > 0).length;
    const totalLinks = features.reduce((sum, f) => sum + f.linkedIndicatorCount, 0);
    return { total: features.length, linked, totalLinks };
  }, [features]);

  const handleEditClick = (e: React.MouseEvent, feature: typeof selectedFeature) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFeature(feature);
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['features-with-impact'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <DrilldownBreadcrumb 
        items={[
          { label: 'Portfolio', href: '/' },
          { label: 'Features' }
        ]} 
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Puzzle className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Features</h1>
          </div>
          <p className="text-muted-foreground">
            View feature impact on OKR hierarchy
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Feature
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Puzzle className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Features</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Tag className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.linked}</p>
                <p className="text-sm text-muted-foreground">Linked to KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-3xl font-bold">{stats.totalLinks}</p>
                <p className="text-sm text-muted-foreground">Total KPI Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feature List */}
      <div className="grid gap-4">
        {filteredFeatures.length === 0 ? (
          <Card className="p-12 text-center">
            <Puzzle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No features found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' 
                ? 'Try adjusting your filters.'
                : 'No features have been added yet.'}
            </p>
            {!searchQuery && categoryFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Feature
              </Button>
            )}
          </Card>
        ) : (
          filteredFeatures.map(feature => (
            <Link 
              key={feature.id} 
              to={`/features/${feature.id}`}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Puzzle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{feature.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {feature.category && (
                            <Badge variant="outline">{feature.category}</Badge>
                          )}
                          {feature.status && (
                            <Badge 
                              variant={feature.status === 'Active' ? 'default' : 'secondary'}
                            >
                              {feature.status}
                            </Badge>
                          )}
                        </div>
                        {feature.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {feature.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn(
                          "text-2xl font-bold",
                          feature.linkedIndicatorCount > 0 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {feature.linkedIndicatorCount}
                        </p>
                        <p className="text-xs text-muted-foreground">Linked KPIs</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleEditClick(e, {
                          id: feature.id,
                          name: feature.name,
                          category: feature.category,
                          description: feature.description,
                          status: feature.status,
                        })}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <EditFeatureDialog
        feature={selectedFeature}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSave}
        categories={categories}
      />

      {/* Add Dialog */}
      <AddFeatureDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleSave}
        categories={categories}
      />
    </div>
  );
}