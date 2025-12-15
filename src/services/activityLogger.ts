import { supabase } from "@/integrations/supabase/client";

export type ActivityModule = 
  | "Skills" 
  | "Users" 
  | "Approvals & Rejections"
  | "Backup & Restore" 
  | "Auth" 
  | "Settings" 
  | "Projects" 
  | "Reports"
  | "Profile & Password Updates";

interface LogActivityParams {
  module: ActivityModule;
  actionType: string;
  description: string;
  recordReference?: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  module,
  actionType,
  description,
  recordReference,
  metadata,
}: LogActivityParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("No authenticated user found for logging activity");
      return;
    }

    // Fetch user profile for username
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const payload: any = {
      user_id: user.id,
      module,
      action_type: actionType,
      description,
    };
    if (recordReference) payload.record_reference = recordReference;
    if (metadata) payload.metadata = metadata;

    const { error } = await supabase.from("activity_logs").insert([payload]);

    if (error) {
      console.error("Error logging activity:", error);
    }
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function logPasswordChange(
  targetUserId: string,
  targetUsername: string,
  triggerType: "Self" | "Admin"
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("No authenticated user found for logging password change");
      return;
    }

    // Fetch current user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase.from("password_change_logs").insert({
      user_id: targetUserId,
      username: targetUsername,
      changed_by_id: user.id,
      changed_by_username: profile?.full_name || user.email || "Unknown User",
      trigger_type: triggerType,
    });

    if (error) {
      console.error("Error logging password change:", error);
    }

    // Also log in activity logs
    await logActivity({
      module: "Profile & Password Updates",
      actionType: "Password Change",
      description: `Password changed for user ${targetUsername} by ${triggerType === "Self" ? "themselves" : "admin"}`,
      recordReference: targetUserId,
    });
  } catch (error) {
    console.error("Failed to log password change:", error);
  }
}
