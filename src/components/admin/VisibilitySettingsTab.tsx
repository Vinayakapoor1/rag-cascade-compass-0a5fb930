import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVisibilitySettings } from '@/hooks/useVisibilitySettings';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Eye, Globe, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'department_head', label: 'Dept Head' },
  { key: 'department_member', label: 'Dept Member' },
  { key: 'csm', label: 'CSM' },
  { key: 'content_manager', label: 'Content Mgr' },
];

const PAGE_SECTIONS: { page: string; pageLabel: string; sections: { key: string; label: string }[] }[] = [
  {
    page: 'portfolio',
    pageLabel: 'Portfolio',
    sections: [
      { key: 'org_objectives', label: 'Organizational Objectives' },
      { key: 'stats_cards', label: 'Stats Cards' },
      { key: 'rag_filter_cards', label: 'RAG Filter Cards' },
      { key: 'departments', label: 'Departments' },
      { key: 'customer_feature_counts', label: 'Customer/Feature Counts' },
    ],
  },
  {
    page: 'index',
    pageLabel: 'Dashboard (Index)',
    sections: [
      { key: 'csm_compliance_widget', label: 'CSM Compliance Widget' },
      { key: 'team_leader_instructions', label: 'Team Leader Instructions' },
      { key: 'data_management_link', label: 'Data Management Link' },
    ],
  },
  {
    page: 'customers',
    pageLabel: 'Customers',
    sections: [
      { key: 'add_edit_customer', label: 'Add/Edit/Delete Customer' },
      { key: 'ops_health_filters', label: 'Ops Health Filters' },
    ],
  },
  {
    page: 'features',
    pageLabel: 'Features',
    sections: [
      { key: 'add_edit_feature', label: 'Add/Edit Feature' },
    ],
  },
  {
    page: 'data_entry',
    pageLabel: 'Data Entry Matrix',
    sections: [
      { key: 'sectech_deployment_params', label: 'Sec+Tech Deployment Params' },
      { key: 'cm_indicators_subsection', label: 'CM Indicators Sub-section' },
    ],
  },
  {
    page: 'header',
    pageLabel: 'Header Navigation',
    sections: [
      { key: 'admin_dashboard_button', label: 'Admin Dashboard Button' },
      { key: 'enter_data_csm', label: 'Enter Data (CSM)' },
      { key: 'enter_data_cm', label: 'Enter Data (Content Mgr)' },
      { key: 'enter_data_dept', label: 'Enter Data (Dept Head/Member)' },
    ],
  },
  {
    page: 'admin',
    pageLabel: 'Admin Dashboard',
    sections: [
      { key: 'all_tabs', label: 'All Tabs' },
    ],
  },
];

interface Department {
  id: string;
  name: string;
}

function VisibilityMatrix({
  departmentId,
  settingsMap,
  onToggle,
}: {
  departmentId: string | null;
  settingsMap: Map<string, boolean>;
  onToggle: (page: string, section: string, role: string, current: boolean, deptId: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      {PAGE_SECTIONS.map(group => (
        <Card key={group.page} className="overflow-hidden">
          <CardHeader className="pb-3 bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{group.pageLabel}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[220px]">Section</th>
                    {ROLES.map(r => (
                      <th key={r.key} className="text-center px-3 py-2.5 font-medium text-muted-foreground min-w-[90px]">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.sections.map(section => (
                    <tr key={section.key} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-foreground font-medium text-xs">{section.label}</td>
                      {ROLES.map(role => {
                        const key = departmentId
                          ? `${group.page}|${section.key}|${role.key}|${departmentId}`
                          : `${group.page}|${section.key}|${role.key}`;
                        const isVisible = settingsMap.get(key) ?? true;
                        return (
                          <td key={role.key} className="text-center px-3 py-2.5">
                            <Switch
                              checked={isVisible}
                              onCheckedChange={() => onToggle(group.page, section.key, role.key, isVisible, departmentId)}
                              className="mx-auto"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function VisibilitySettingsTab() {
  const { settings, updateSetting, isLoaded } = useVisibilitySettings();
  const [activeTab, setActiveTab] = useState('global');

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments_for_visibility'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Build two maps: global (no dept) and dept-specific
  const { globalMap, deptMap } = useMemo(() => {
    const gMap = new Map<string, boolean>();
    const dMap = new Map<string, boolean>();
    settings?.forEach(s => {
      const setting = s as unknown as { page: string; section: string; role: string; is_visible: boolean; department_id: string | null };
      if (setting.department_id) {
        dMap.set(`${setting.page}|${setting.section}|${setting.role}|${setting.department_id}`, setting.is_visible);
      } else {
        gMap.set(`${setting.page}|${setting.section}|${setting.role}`, setting.is_visible);
      }
    });
    return { globalMap: gMap, deptMap: dMap };
  }, [settings]);

  const handleToggle = async (page: string, section: string, role: string, current: boolean, deptId: string | null) => {
    try {
      await updateSetting(page, section, role, !current, deptId);
      toast.success('Visibility updated');
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Eye className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Section Visibility by Role & Department</h2>
          <p className="text-sm text-muted-foreground">
            Control which sections each role can see. Use department tabs for department-specific overrides.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="global" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            Global
          </TabsTrigger>
          {departments.map(dept => (
            <TabsTrigger key={dept.id} value={dept.id} className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              {dept.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <div className="mb-3 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5 inline mr-1" />
            Global settings apply to all users of a role unless overridden by a department-specific setting.
          </div>
          <VisibilityMatrix
            departmentId={null}
            settingsMap={globalMap}
            onToggle={handleToggle}
          />
        </TabsContent>

        {departments.map(dept => (
          <TabsContent key={dept.id} value={dept.id} className="mt-4">
            <div className="mb-3 p-2 rounded bg-muted/50 text-xs text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 inline mr-1" />
              Settings here override global defaults for users assigned to <strong>{dept.name}</strong>.
              Unset toggles fall back to global settings.
            </div>
            <VisibilityMatrix
              departmentId={dept.id}
              settingsMap={deptMap}
              onToggle={handleToggle}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
