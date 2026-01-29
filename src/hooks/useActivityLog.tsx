import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type EntityType = 'org_objective' | 'department' | 'functional_objective' | 'key_result' | 'indicator' | 'import';

export interface LogActivityParams {
  action: 'create' | 'update' | 'delete' | 'import' | 'bulk_import';
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = async (params: LogActivityParams) => {
    if (!user) return;

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        old_value: params.oldValue,
        new_value: params.newValue,
        metadata: {
          ...params.metadata,
          user_email: user.email
        }
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  return { logActivity };
}
