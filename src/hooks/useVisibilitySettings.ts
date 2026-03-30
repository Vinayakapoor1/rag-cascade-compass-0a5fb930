import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface VisibilitySetting {
  page: string;
  section: string;
  role: string;
  is_visible: boolean;
}

const ROLE_MAP: Record<string, string> = {
  admin: 'admin',
  department_head: 'department_head',
  department_member: 'department_member',
  csm: 'csm',
  content_manager: 'content_manager',
};

export function useVisibilitySettings() {
  const { isAdmin, isDepartmentHead, isDepartmentMember, isCSM, isContentManager } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['visibility_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visibility_settings')
        .select('page, section, role, is_visible');
      if (error) throw error;
      return data as VisibilitySetting[];
    },
    staleTime: 60_000,
  });

  // Build a lookup map: "page|section|role" -> boolean
  const [lookupMap, setLookupMap] = useState<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!settings) return;
    const map = new Map<string, boolean>();
    settings.forEach(s => {
      map.set(`${s.page}|${s.section}|${s.role}`, s.is_visible);
    });
    setLookupMap(map);
  }, [settings]);

  // Get user's active roles
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
   * Check if the current user can see a specific section on a page.
   * If ANY of the user's roles has is_visible=true, they can see it.
   * If no setting exists, defaults to true (backward compatible).
   */
  const canSee = useCallback((page: string, section: string): boolean => {
    const roles = getUserRoles();
    if (roles.length === 0) return true; // No roles = viewer, default visible

    let hasAnySetting = false;
    for (const role of roles) {
      const key = `${page}|${section}|${role}`;
      if (lookupMap.has(key)) {
        hasAnySetting = true;
        if (lookupMap.get(key) === true) return true;
      }
    }

    // If no settings exist for this combo, default to true
    return !hasAnySetting;
  }, [getUserRoles, lookupMap]);

  const updateSetting = useCallback(async (page: string, section: string, role: string, isVisible: boolean) => {
    const { error } = await supabase
      .from('visibility_settings')
      .upsert(
        { page, section, role, is_visible: isVisible, updated_at: new Date().toISOString() },
        { onConflict: 'page,section,role' }
      );
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['visibility_settings'] });
  }, [queryClient]);

  return { canSee, settings, updateSetting, isLoaded: !!settings };
}
