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

    const { backupData, mode = 'replace' } = await req.json()

    if (!backupData || !backupData.tables) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate backup data format
    if (!backupData.version || !backupData.timestamp) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup file: missing version or timestamp metadata' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Processing backup version ${backupData.version} from ${backupData.timestamp}`)

    // Define import order to respect ALL foreign key constraints
    // CRITICAL: Tables must be imported in exact dependency order
    const importOrder = [
      // 1. User and auth related (no dependencies)
      'profiles',
      'user_roles',
      
      // 2. Skill hierarchy (profiles -> categories -> skills -> subskills)
      'skill_categories',
      'skills',
      'subskills',
      
      // 3. Core ratings and user skills (depend on users + skills/subskills)
      'employee_ratings',
      'user_skills',
      
      // 4. Rating history (depends on ratings)
      'skill_rating_history',
      'subskill_rating_history',
      
      // 5. Goals (depend on users and skills)
      'personal_goals',
      'goal_progress_history',
      
      // 6. Gamification (depends on users and goals)
      'user_gamification',
      'user_achievements',
      'leaderboard_history',
      
      // 7. Projects (depends on users)
      'projects',
      'project_assignments',
      
      // 8. Training (depends on users and categories)
      'training_budgets',
      'training_participation',
      
      // 9. Notifications and preferences (depends on users)
      'notifications',
      'user_category_preferences',
      'skill_explorer_presets',
      
      // 10. Generic logs (minimal dependencies)
      'report_logs',
      'import_export_logs',
      'activity_log',
      
      // 11. Approval system (MUST come AFTER all ratings/skills/users)
      // These reference employee_ratings, user_skills, etc.
      'approval_history',
      'approval_logs',
      'approval_audit_logs',
      
      // 12. Backup history (depends on users)
      'backup_history',
      
      // 13. Page access (minimal dependencies)
      'pages',
      'page_access'
    ]

    // Helper function to transform legacy data formats
    const transformRecord = (tableName: string, record: any) => {
      // Transform profiles: normalize role values to match current schema
      if (tableName === 'profiles' && record.role) {
        const roleMap: Record<string, string> = {
          'Employee': 'employee',
          'employee': 'employee',
          'Tech Lead': 'tech_lead',
          'tech_lead': 'tech_lead',
          'Management': 'management',
          'management': 'management',
          'Admin': 'admin',
          'admin': 'admin'
        }
        record.role = roleMap[record.role] || 'employee'
      }
      
      // Normalize status values
      if (record.status) {
        const statusMap: Record<string, string> = {
          'Active': 'active',
          'active': 'active',
          'Inactive': 'inactive',
          'inactive': 'inactive',
          'Pending': 'pending',
          'pending': 'pending'
        }
        record.status = statusMap[record.status] || record.status.toLowerCase()
      }
      
      return record
    }

    const results: any = {
      success: [],
      errors: [],
      skipped: [],
      warnings: []
    }

    // Track successfully inserted IDs for foreign key validation
    const insertedIds: Record<string, Set<string>> = {}

    for (const tableName of importOrder) {
      if (!backupData.tables[tableName]) {
        results.skipped.push(tableName)
        continue
      }

      let records = backupData.tables[tableName]
      if (!records || records.length === 0) {
        results.skipped.push(tableName)
        continue
      }

      try {
        let insertedCount = 0
        let skippedCount = 0
        
        if (mode === 'replace') {
          // Delete existing data (using service role to bypass RLS)
          const { error: deleteError } = await supabaseAdmin
            .from(tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

          if (deleteError) {
            console.warn(`Warning clearing ${tableName}:`, deleteError.message)
          }
        }

        // Transform records to match current schema
        records = records.map((r: any) => transformRecord(tableName, r))

        // For tables with foreign keys, filter out records with invalid references
        if (tableName === 'approval_logs' || tableName === 'approval_audit_logs') {
          const validRecords = []
          for (const record of records) {
            // Check if rating_id exists in inserted employee_ratings
            if (record.rating_id && insertedIds['employee_ratings']?.has(record.rating_id)) {
              validRecords.push(record)
            } else {
              skippedCount++
            }
          }
          records = validRecords
          
          if (skippedCount > 0) {
            console.warn(`Skipped ${skippedCount} ${tableName} records with invalid foreign key references`)
            results.warnings.push({
              table: tableName,
              message: `Skipped ${skippedCount} records with invalid rating_id references`
            })
          }
        }

        if (records.length === 0) {
          results.skipped.push(tableName)
          continue
        }

        // Insert in batches of 50 to avoid timeouts
        const batchSize = 50
        insertedIds[tableName] = new Set()

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          
          if (mode === 'merge') {
            // In merge mode, use upsert to avoid conflicts
            const { data, error: upsertError } = await supabaseAdmin
              .from(tableName)
              .upsert(batch, { onConflict: 'id' })
              .select('id')

            if (upsertError) {
              console.error(`Upsert error in ${tableName}:`, upsertError.message)
              // Continue with next batch instead of failing completely
            } else {
              insertedCount += batch.length
              // Track inserted IDs
              if (data) {
                data.forEach((row: any) => insertedIds[tableName].add(row.id))
              }
            }
          } else {
            // In replace mode, do regular insert
            const { data, error: insertError } = await supabaseAdmin
              .from(tableName)
              .insert(batch)
              .select('id')

            if (insertError) {
              throw new Error(`Insert error: ${insertError.message}`)
            }
            
            insertedCount += batch.length
            // Track inserted IDs
            if (data) {
              data.forEach((row: any) => insertedIds[tableName].add(row.id))
            }
          }
        }

        results.success.push({
          table: tableName,
          records: insertedCount,
          skipped: skippedCount,
          mode: mode
        })

      } catch (error: any) {
        console.error(`Error importing ${tableName}:`, error)
        results.errors.push({
          table: tableName,
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify(results),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Import function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
