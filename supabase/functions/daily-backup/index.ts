import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TABLES_TO_BACKUP = [
  'customers',
  'indicators',
  'indicator_history',
  'csm_customer_feature_scores',
  'customer_health_metrics',
  'features',
  'departments',
  'functional_objectives',
  'key_results',
  'org_objectives',
  'csm_feature_scores',
  'profiles',
  'user_roles',
  'customer_features',
] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Fetch all tables in parallel
    const results = await Promise.all(
      TABLES_TO_BACKUP.map(async (table) => {
        const { data, error } = await supabase.from(table).select('*')
        if (error) {
          console.error(`Error fetching ${table}:`, error.message)
          return { table, data: [], error: error.message }
        }
        return { table, data: data || [], error: null }
      })
    )

    const backupData: Record<string, unknown[]> = {}
    const rowCounts: Record<string, number> = {}
    const errors: string[] = []

    for (const result of results) {
      backupData[result.table] = result.data
      rowCounts[result.table] = result.data.length
      if (result.error) errors.push(`${result.table}: ${result.error}`)
    }

    const jsonStr = JSON.stringify(backupData)
    const sizeBytes = new TextEncoder().encode(jsonStr).length

    // Insert backup record
    const { error: insertError } = await supabase.from('daily_backups').insert({
      backup_type: 'scheduled',
      tables_included: TABLES_TO_BACKUP as unknown as string[],
      data: backupData,
      row_counts: rowCounts,
      size_bytes: sizeBytes,
    })

    if (insertError) {
      throw new Error(`Failed to insert backup: ${insertError.message}`)
    }

    // Retention: delete backups older than 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    await supabase
      .from('daily_backups')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())

    // Log activity
    await supabase.from('activity_logs').insert({
      action: 'create',
      entity_type: 'import',
      entity_name: 'Daily Backup',
      metadata: {
        row_counts: rowCounts,
        size_bytes: sizeBytes,
        errors: errors.length > 0 ? errors : undefined,
        user_email: 'system@automated',
      },
    })

    const totalRows = Object.values(rowCounts).reduce((a, b) => a + b, 0)

    return new Response(
      JSON.stringify({
        success: true,
        tables: TABLES_TO_BACKUP.length,
        total_rows: totalRows,
        size_bytes: sizeBytes,
        size_mb: (sizeBytes / 1024 / 1024).toFixed(2),
        row_counts: rowCounts,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Backup failed:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
