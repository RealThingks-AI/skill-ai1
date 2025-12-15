import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify user is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    const isAdmin = userRoles?.some(ur => ur.role === 'admin')
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Starting backup export with service role')

    const backupData: any = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      tables: {}
    }

    const tables = [
      'profiles', 'user_roles', 'skill_categories', 'skills', 'subskills',
      'employee_ratings', 'user_skills', 'skill_rating_history', 'subskill_rating_history',
      'personal_goals', 'goal_progress_history', 'user_gamification', 'user_achievements',
      'leaderboard_history', 'projects', 'project_assignments', 'training_budgets',
      'training_participation', 'notifications', 'user_category_preferences',
      'skill_explorer_presets', 'approval_logs', 'approval_history', 'approval_audit_logs',
      'report_logs', 'import_export_logs', 'activity_log', 'pages', 'page_access'
    ]

    let totalRecords = 0
    const errors: string[] = []

    for (const table of tables) {
      try {
        console.log(`Exporting ${table}...`)
        
        // Fetch ALL records using pagination to handle large tables
        let allData: any[] = []
        let from = 0
        const batchSize = 1000
        let hasMore = true
        
        while (hasMore) {
          const { data, error, count } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact' })
            .range(from, from + batchSize - 1)
          
          if (error) {
            console.error(`Error exporting ${table}:`, error)
            errors.push(`${table}: ${error.message}`)
            hasMore = false
            break
          }
          
          if (data && data.length > 0) {
            allData = allData.concat(data)
            from += batchSize
            
            // Check if we've fetched all records
            if (count !== null && allData.length >= count) {
              hasMore = false
            } else if (data.length < batchSize) {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }
        
        backupData.tables[table] = allData
        totalRecords += allData.length
        console.log(`Exported ${allData.length} records from ${table}`)
        
      } catch (err: any) {
        console.error(`Exception exporting ${table}:`, err)
        errors.push(`${table}: ${err.message}`)
        backupData.tables[table] = []
      }
    }

    console.log(`Export complete: ${totalRecords} total records from ${tables.length} tables`)

    if (errors.length > 0) {
      console.warn('Export completed with errors:', errors)
    }

    return new Response(
      JSON.stringify({
        backupData,
        summary: {
          totalTables: tables.length,
          totalRecords,
          errors: errors.length > 0 ? errors : undefined
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Export function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
