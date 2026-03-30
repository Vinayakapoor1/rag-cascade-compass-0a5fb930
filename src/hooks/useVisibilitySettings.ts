import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VisibilitySetting {
  page: string;
  section: string;
  role: string;
  is_visible: boolean;
  department_id: string | null;
}

export function useVisibilitySettings() {
  const { isAdmin, isDepartmentHead, isDepartmentMember, isCSM, isContentManager, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['visibility_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visibility_settings')
        .select('page, section, role, is_visible, department_id');
      if (error) throw error;
      return data as VisibilitySetting[];
    },
    staleTime: 60_000,
  });

  // Fetch user's department assignments
  const { data: userDepartments } = useQuery({
    queryKey: ['user_department_access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('department_access')
        .select('department_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map(d => d.department_id);
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Build lookup maps: global and department-specific
  const [globalMap, setGlobalMap] = useState<Map<string, boolean>>(new Map());
  const [deptMap, setDeptMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!settings) return;
    const gMap = new Map<string, boolean>();
    const dMap = new Map<string, boolean>();
    settings.forEach(s => {
      if (s.department_id) {
        dMap.set(`${s.page}|${s.section}|${s.role}|${s.department_id}`, s.is_visible);
      } else {
        gMap.set(`${s.page}|${s.section}|${s.role}`, s.is_visible);
      }
    });
    setGlobalMap(gMap);
    setDeptMap(dMap);
  }, [settings]);

  const getUserRoles = useCallback((): string[] => {
    const roles: string[] = [];
    if (isAdmin) roles.push('admin');
    if (isDepartmentHead) roles.push('department_head');
    if (isDepartmentMember) roles.push('department_member');
    if (isCSM) roles.push('csm');
    if (isContentManager) roles.push('content_manager');
    return roles;
  }, [isAdmin, isDepartmentHead, isDepartmentMember, isCSM, isContentManager]);

  /**
   * Check visibility. Priority: department-specific override > global role setting > default true.
   * If ANY of the user's roles+departments grants visibility, they can see it.
   */
  const canSee = useCallback((page: string, section: string): boolean => {
    const roles = getUserRoles();
    if (roles.length === 0) return true;

    const depts = userDepartments || [];
    let hasAnySetting = false;

    for (const role of roles) {
      // Check department-specific settings first
      for (const deptId of depts) {
        const dKey = `${page}|${section}|${role}|${deptId}`;
        if (deptMap.has(dKey)) {
          hasAnySetting = true;
          if (deptMap.get(dKey) === true) return true;
        }
      }

      // Check global setting
      const gKey = `${page}|${section}|${role}`;
      if (globalMap.has(gKey)) {
        // Only use global if no dept-specific override exists for this role
        const hasDeptOverride = depts.some(d => deptMap.has(`${page}|${section}|${role}|${d}`));
        if (!hasDeptOverride) {
          hasAnySetting = true;
          if (globalMap.get(gKey) === true) return true;
        }
      }
    }

    return !hasAnySetting;
  }, [getUserRoles, globalMap, deptMap, userDepartments]);

  const updateSetting = useCallback(async (
    page: string, section: string, role: string, isVisible: boolean, departmentId?: string | null
  ) => {
    const row: Record<string, unknown> = {
      page, section, role, is_visible: isVisible, updated_at: new Date().toISOString(),
    };
    if (departmentId) {
      row.department_id = departmentId;
    }

    // Use raw upsert — the unique index handles conflict resolution
    const { error } = await supabase.rpc('upsert_visibility_setting' as never, {
      p_page: page,
      p_section: section,
      p_role: role,
      p_is_visible: isVisible,
      p_department_id: departmentId || null,
    } as never);

    if (error) {
      // Fallback: try direct upsert with manual conflict handling
      const { data: existing } = await supabase
        .from('visibility_settings')
        .select('id')
        .eq('page', page)
        .eq('section', section)
        .eq('role', role)
        .is('department_id', departmentId ? undefined as never : null)
        .maybeSingle();

      if (departmentId) {
        const { data: existingDept } = await supabase
          .from('visibility_settings')
          .select('id')
          .eq('page', page)
          .eq('section', section)
          .eq('role', role)
          .eq('department_id', departmentId)
          .maybeSingle();

        if (existingDept) {
          await supabase
            .from('visibility_settings')
            .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
            .eq('id', existingDept.id);
        } else {
          await supabase
            .from('visibility_settings')
            .insert({ page, section, role, is_visible: isVisible, department_id: departmentId });
        }
      } else {
        if (existing) {
          await supabase
            .from('visibility_settings')
            .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('visibility_settings')
            .insert({ page, section, role, is_visible: isVisible });
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['visibility_settings'] });
  }, [queryClient]);

  return { canSee, settings, updateSetting, isLoaded: !!settings };
}
