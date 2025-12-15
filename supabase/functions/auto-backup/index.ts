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

    console.log('Starting auto-backup...')

    // Define tables to export in dependency order
    const tables = [
      'profiles',
      'user_roles',
      'skill_categories',
      'skills',
      'subskills',
      'employee_ratings',
      'user_skills',
      'skill_rating_history',
      'subskill_rating_history',
      'personal_goals',
      'goal_progress_history',
      'user_gamification',
      'user_achievements',
      'leaderboard_history',
      'projects',
      'project_assignments',
      'training_budgets',
      'training_participation',
      'notifications',
      'user_category_preferences',
      'skill_explorer_presets',
      'approval_logs',
      'approval_history',
      'approval_audit_logs',
      'report_logs',
      'import_export_logs',
      'activity_log',
      'pages',
      'page_access'
    ]

    const backupData: any = {
      version: "2.0",
      timestamp: new Date().toISOString(),
      tables: {}
    }

    let totalRecords = 0

    // Export all tables
    for (const table of tables) {
      console.log(`Exporting ${table}...`)
      
      // Fetch ALL records using pagination to handle large tables
      let allData: any[] = []
      let from = 0
      const batchSize = 1000
      let hasMore = true
      
      while (hasMore) {
        const { data, error, count } = await supabaseAdmin
          .from(table as any)
          .select('*', { count: 'exact' })
          .range(from, from + batchSize - 1)
        
        if (error) {
          console.error(`Error exporting ${table}:`, error)
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
    }

    // Generate filename
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const fileName = `backup_${timestamp}.json`
    const filePath = `auto/${fileName}`

    // Convert to JSON
    const backupJson = JSON.stringify(backupData, null, 2)
    const fileSize = new Blob([backupJson]).size

    // Upload to storage
    console.log(`Uploading backup to storage: ${filePath}`)
    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(filePath, backupJson, {
        contentType: 'application/json',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload backup: ${uploadError.message}`)
    }

    // Get system admin user (first admin)
    const { data: adminUsers } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
      .limit(1)

    const createdBy = adminUsers?.[0]?.user_id || null

    // Save to backup history
    const { error: historyError } = await supabaseAdmin
      .from('backup_history')
      .insert({
        backup_name: fileName,
        backup_type: 'auto',
        file_size: fileSize,
        table_count: tables.length,
        record_count: totalRecords,
        storage_path: filePath,
        created_by: createdBy,
        metadata: {
          version: backupData.version,
          timestamp: backupData.timestamp
        }
      })

    if (historyError) {
      console.error('History insert error:', historyError)
    }

    // Cleanup old backups - keep only latest 7
    console.log('Cleaning up old backups...')
    const { data: oldBackups } = await supabaseAdmin
      .from('backup_history')
      .select('id, storage_path')
      .eq('backup_type', 'auto')
      .order('created_at', { ascending: false })
      .range(7, 1000) // Get backups after the 7th one

    if (oldBackups && oldBackups.length > 0) {
      // Delete from storage
      const pathsToDelete = oldBackups
        .filter(b => b.storage_path)
        .map(b => b.storage_path)

      if (pathsToDelete.length > 0) {
        await supabaseAdmin.storage
          .from('backups')
          .remove(pathsToDelete)
      }

      // Delete from history
      const idsToDelete = oldBackups.map(b => b.id)
      await supabaseAdmin
        .from('backup_history')
        .delete()
        .in('id', idsToDelete)

      console.log(`Deleted ${oldBackups.length} old backups`)
    }

    console.log('Auto-backup completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true,
        fileName,
        fileSize,
        tableCount: tables.length,
        recordCount: totalRecords
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error: any) {
    console.error('Auto-backup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
