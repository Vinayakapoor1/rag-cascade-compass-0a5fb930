import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Loader2, Puzzle, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { EditFeatureDialog } from '@/components/EditFeatureDialog';
import { AddFeatureDialog } from '@/components/AddFeatureDialog';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

interface Feature {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  status: string | null;
}

export function FeaturesOverviewTab() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { logActivity } = useActivityLog();

  useEffect(() => {
    fetchFeatures();
  }, []);

  useEffect(() => {
    filterFeatures();
  }, [features, search, categoryFilter, statusFilter]);

  const fetchFeatures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('features')
      .select('id, name, category, description, status')
      .order('name');

    if (!error && data) {
      setFeatures(data);
    }
    setLoading(false);
  };

  const filterFeatures = () => {
    let filtered = [...features];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchLower) ||
        f.description?.toLowerCase().includes(searchLower) ||
        f.category?.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(f => f.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    setFilteredFeatures(filtered);
  };

  const handleEdit = (feature: Feature) => {
    setSelectedFeature(feature);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (feature: Feature) => {
    setSelectedFeature(feature);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFeature) return;
    
    setDeleting(true);
    try {
      // First delete any feature links
      await supabase
        .from('indicator_feature_links')
        .delete()
        .eq('feature_id', selectedFeature.id);

      await supabase
        .from('customer_features')
        .delete()
        .eq('feature_id', selectedFeature.id);

      await supabase
        .from('customer_feature_adoption')
        .delete()
        .eq('feature_id', selectedFeature.id);

      // Then delete the feature
      const { error } = await supabase
        .from('features')
        .delete()
        .eq('id', selectedFeature.id);

      if (error) throw error;

      await logActivity({
        action: 'delete',
        entityType: 'indicator',
        entityId: selectedFeature.id,
        entityName: selectedFeature.name,
        oldValue: selectedFeature,
        metadata: { featureDeletion: true },
      });

      toast.success('Feature deleted successfully');
      fetchFeatures();
    } catch (error: any) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature: ' + error.message);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedFeature(null);
    }
  };

  const uniqueCategories = [...new Set(features.map(f => f.category).filter(Boolean))] as string[];
  const uniqueStatuses = [...new Set(features.map(f => f.status).filter(Boolean))] as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              Features ({filteredFeatures.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button onClick={() => setAddDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Feature
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search features..." 
                  className="pl-9 w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Puzzle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No features uploaded yet</p>
              <p className="text-sm mt-1">Use the Feature Upload tab to import features or add one manually</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Feature
              </Button>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFeatures.slice(0, 50).map(feature => (
                      <TableRow key={feature.id}>
                        <TableCell className="font-medium">{feature.name}</TableCell>
                        <TableCell>
                          {feature.category ? (
                            <Badge variant="secondary">{feature.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {feature.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={feature.status === 'Active' ? 'outline' : 'secondary'}>
                            {feature.status || 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEdit(feature)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteClick(feature)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredFeatures.length === 0 && features.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No features match your filters
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredFeatures.length > 50 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Showing first 50 of {filteredFeatures.length} features
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditFeatureDialog
        feature={selectedFeature}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={fetchFeatures}
        categories={uniqueCategories}
      />

      {/* Add Dialog */}
      <AddFeatureDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={fetchFeatures}
        categories={uniqueCategories}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedFeature?.name}"? 
              This will also remove all associated links to indicators and customers.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}