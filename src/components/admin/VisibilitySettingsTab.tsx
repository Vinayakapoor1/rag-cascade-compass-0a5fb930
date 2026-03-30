import { useMemo } from 'react';
import { useVisibilitySettings } from '@/hooks/useVisibilitySettings';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Eye } from 'lucide-react';

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

export function VisibilitySettingsTab() {
  const { settings, updateSetting, isLoaded } = useVisibilitySettings();

  const settingsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    settings?.forEach(s => {
      map.set(`${s.page}|${s.section}|${s.role}`, s.is_visible);
    });
    return map;
  }, [settings]);

  const handleToggle = async (page: string, section: string, role: string, current: boolean) => {
    try {
      await updateSetting(page, section, role, !current);
      toast.success(`Visibility updated`);
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
          <h2 className="text-lg font-semibold">Section Visibility by Role</h2>
          <p className="text-sm text-muted-foreground">
            Control which sections each role can see on each page. Changes apply instantly.
          </p>
        </div>
      </div>

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
                        const key = `${group.page}|${section.key}|${role.key}`;
                        const isVisible = settingsMap.get(key) ?? true;
                        return (
                          <td key={role.key} className="text-center px-3 py-2.5">
                            <Switch
                              checked={isVisible}
                              onCheckedChange={() => handleToggle(group.page, section.key, role.key, isVisible)}
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
