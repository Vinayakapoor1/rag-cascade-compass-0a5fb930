import { supabase } from '@/integrations/supabase/client';

/**
 * Send a notification to all admin users when a data entry closure is completed.
 */
export async function notifyAdminsOfCompletion({
  departmentName,
  userName,
  period,
  indicatorCount,
  source,
}: {
  departmentName: string;
  userName: string;
  period: string;
  indicatorCount: number;
  source: 'per_indicator' | 'customer_feature_matrix';
}) {
  try {
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) return;

    const sourceLabel = source === 'customer_feature_matrix'
      ? 'Customer × Feature Matrix'
      : 'Per-Indicator Entry';

    const notifications = adminRoles.map((r) => ({
      user_id: r.user_id,
      title: `✅ Data Entry Completed`,
      message: `${userName} submitted ${indicatorCount} indicator${indicatorCount !== 1 ? 's' : ''} for ${departmentName} (${period}) via ${sourceLabel}.`,
      link: '/compliance-report',
      is_read: false,
    }));

    await supabase.from('notifications').insert(notifications);
  } catch (err) {
    console.error('Failed to send completion notifications:', err);
  }
}
