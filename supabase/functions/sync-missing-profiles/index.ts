import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Check if user is admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all distinct user_ids from employee_ratings
    const { data: ratingsUsers, error: ratingsError } = await supabaseAdmin
      .from('employee_ratings')
      .select('user_id')

    if (ratingsError) {
      console.error('Error fetching ratings:', ratingsError)
      throw ratingsError
    }

    const uniqueRatingUserIds = [...new Set((ratingsUsers || []).map(r => r.user_id))]
    console.log('Found user IDs in ratings:', uniqueRatingUserIds.length)

    // Get all existing profile user_ids
    const { data: existingProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    const existingProfileUserIds = new Set((existingProfiles || []).map(p => p.user_id))
    console.log('Found existing profiles:', existingProfileUserIds.size)

    // Find missing profiles
    const missingUserIds = uniqueRatingUserIds.filter(id => !existingProfileUserIds.has(id))
    console.log('Missing profiles for user IDs:', missingUserIds)

    if (missingUserIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No missing profiles found',
          synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const createdProfiles = []
    const errors = []

    // Create profile for each missing user
    for (const userId of missingUserIds) {
      try {
        // Get user data from auth.users
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
        
        if (authError || !authUser?.user) {
          console.error(`No auth user found for ${userId}:`, authError)
          errors.push({
            user_id: userId,
            error: 'User not found in auth.users'
          })
          continue
        }

        // Extract user metadata
        const email = authUser.user.email || 'unknown@example.com'
        const fullName = authUser.user.user_metadata?.full_name || 
                        authUser.user.user_metadata?.name || 
                        email.split('@')[0]
        
        // Create profile
        const { data: newProfile, error: insertError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: userId,
            email: email,
            full_name: fullName,
            role: authUser.user.user_metadata?.role || 'employee',
            department: authUser.user.user_metadata?.department || null,
            tech_lead_id: authUser.user.user_metadata?.tech_lead_id || null,
            status: 'active'
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error creating profile for ${userId}:`, insertError)
          errors.push({
            user_id: userId,
            error: insertError.message
          })
        } else {
          console.log(`Created profile for ${userId}:`, newProfile)
          createdProfiles.push(newProfile)
        }
      } catch (err: any) {
        console.error(`Exception processing ${userId}:`, err)
        errors.push({
          user_id: userId,
          error: err?.message || 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${createdProfiles.length} profiles`,
        synced: createdProfiles.length,
        total_missing: missingUserIds.length,
        created_profiles: createdProfiles,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in sync-missing-profiles:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
