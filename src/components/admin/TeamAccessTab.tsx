import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, RefreshCw, Pencil, Shield, Building, UserCheck } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'department_head' | 'viewer' | 'csm' | null;
  departments: { id: string; name: string }[];
  linkedCsmId?: string | null;
  linkedCsmName?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface CSMRecord {
  id: string;
  name: string;
  user_id: string | null;
}

interface TeamAccessTabProps {
  isAdmin: boolean;
}

export function TeamAccessTab({ isAdmin }: TeamAccessTabProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [csmRecords, setCsmRecords] = useState<CSMRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    role: 'viewer' as 'admin' | 'department_head' | 'viewer' | 'csm',
    departmentIds: [] as string[],
    linkedCsmId: '' as string,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .order('email');

    // Fetch all user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Fetch all department access
    const { data: access } = await supabase
      .from('department_access')
      .select('user_id, department_id, departments (id, name)');

    // Fetch all departments
    const { data: depts } = await supabase
      .from('departments')
      .select('id, name')
      .order('name');

    // Fetch all CSM records
    const { data: csms } = await supabase
      .from('csms')
      .select('id, name, user_id')
      .order('name');

    if (depts) setDepartments(depts);
    if (csms) setCsmRecords(csms);

    if (profiles) {
      const usersWithRoles: UserWithRole[] = profiles.map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.user_id);
        const userAccess = access?.filter((a) => a.user_id === p.user_id) || [];
        const linkedCsm = csms?.find((c) => c.user_id === p.user_id);
        
        return {
          id: p.user_id,
          email: p.email || '',
          full_name: p.full_name,
          role: userRole?.role as 'admin' | 'department_head' | 'viewer' | 'csm' | null,
          departments: userAccess.map((a: any) => ({
            id: a.departments?.id || a.department_id,
            name: a.departments?.name || 'Unknown'
          })),
          linkedCsmId: linkedCsm?.id || null,
          linkedCsmName: linkedCsm?.name || null,
        };
      });

      setUsers(usersWithRoles);
    }

    setLoading(false);
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setFormData({
      role: user.role || 'viewer',
      departmentIds: user.departments.map(d => d.id),
      linkedCsmId: user.linkedCsmId || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);

    try {
      // Update or insert user role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.id)
        .maybeSingle();

      if (existingRole) {
        await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('user_id', selectedUser.id);
      } else {
        await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: formData.role });
      }

      // Update department access - delete old, insert new
      await supabase
        .from('department_access')
        .delete()
        .eq('user_id', selectedUser.id);

      if (formData.role === 'department_head' && formData.departmentIds.length > 0) {
        await supabase
          .from('department_access')
          .insert(
            formData.departmentIds.map(deptId => ({
              user_id: selectedUser.id,
              department_id: deptId
            }))
          );
      }

      // If CSM role, link the user to the CSM record
      if (formData.role === 'csm' && formData.linkedCsmId) {
        // First, unlink any previous user from this CSM record
        await supabase
          .from('csms')
          .update({ user_id: null, email: null })
          .eq('user_id', selectedUser.id);

        // Link the selected CSM record to this user
        await supabase
          .from('csms')
          .update({ user_id: selectedUser.id, email: selectedUser.email })
          .eq('id', formData.linkedCsmId);
      } else if (formData.role !== 'csm') {
        // If role changed away from CSM, unlink
        await supabase
          .from('csms')
          .update({ user_id: null, email: null })
          .eq('user_id', selectedUser.id);
      }

      toast.success('User access updated');
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to update user access');
    } finally {
      setSaving(false);
    }
  };

  const toggleDepartment = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }));
  };

  const getRoleBadge = (role: string | null, linkedCsmName?: string | null) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-primary/10 text-primary"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      case 'department_head':
        return <Badge className="bg-rag-amber/10 text-rag-amber"><Building className="h-3 w-3 mr-1" />Dept Head</Badge>;
      case 'csm':
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400"><UserCheck className="h-3 w-3 mr-1" />CSM{linkedCsmName ? ` (${linkedCsmName})` : ''}</Badge>;
      default:
        return <Badge variant="outline">Viewer</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Access
              </CardTitle>
              <CardDescription>
                Manage user roles and department assignments
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found. Users will appear here after they sign up.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Departments</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.email}</div>
                        {user.full_name && (
                          <div className="text-sm text-muted-foreground">{user.full_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role, user.linkedCsmName)}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <span className="text-sm text-muted-foreground">All (auto)</span>
                      ) : user.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.departments.map(d => (
                            <Badge key={d.id} variant="secondary" className="text-xs">
                              {d.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Access</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">User</Label>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="csm">CSM</SelectItem>
                    <SelectItem value="department_head">Department Head</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              {formData.role === 'csm' && (
                <div className="space-y-2">
                  <Label>Link to CSM Record</Label>
                  <Select
                    value={formData.linkedCsmId}
                    onValueChange={(v) => setFormData({ ...formData, linkedCsmId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CSM record..." />
                    </SelectTrigger>
                    <SelectContent>
                      {csmRecords
                        .filter(c => !c.user_id || c.user_id === selectedUser?.id)
                        .map((csm) => (
                          <SelectItem key={csm.id} value={csm.id}>
                            {csm.name} {csm.user_id === selectedUser?.id ? '(currently linked)' : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only unlinked CSM records are shown. The CSM will see only their assigned customers.
                  </p>
                </div>
              )}

              {formData.role === 'department_head' && (
                <div className="space-y-2">
                  <Label>Assigned Departments</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {departments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No departments available</p>
                    ) : (
                      departments.map((dept) => (
                        <div key={dept.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={dept.id}
                            checked={formData.departmentIds.includes(dept.id)}
                            onCheckedChange={() => toggleDepartment(dept.id)}
                          />
                          <label
                            htmlFor={dept.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {dept.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
