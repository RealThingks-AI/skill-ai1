import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw, Database } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DataSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    synced?: number;
    total_missing?: number;
    errors?: any[];
  } | null>(null);

  const handleSyncProfiles = async () => {
    setSyncing(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://hgpzeotwrjicbhncvynn.supabase.co/functions/v1/sync-missing-profiles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setResult(data);
      
      if (data.synced > 0) {
        toast.success(`Successfully synced ${data.synced} profile(s)`);
      } else {
        toast.info(data.message);
      }
    } catch (error) {
      console.error('Error syncing profiles:', error);
      toast.error(`Sync failed: ${error.message}`);
      setResult({
        success: false,
        message: error.message,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Sync Utilities
        </CardTitle>
        <CardDescription>
          Fix data integrity issues and sync missing records
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-sm mb-1">Sync Missing Profiles</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Creates profile records for users who have submitted ratings but don't have profile entries.
              This fixes the issue where ratings exist but the user profile is missing.
            </p>
            <Button
              onClick={handleSyncProfiles}
              disabled={syncing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Profiles'}
            </Button>
          </div>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">{result.message}</p>
                  {result.synced !== undefined && result.total_missing !== undefined && (
                    <p className="text-sm">
                      Synced {result.synced} out of {result.total_missing} missing profiles
                    </p>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Errors:</p>
                      <ul className="text-xs space-y-1 mt-1">
                        {result.errors.map((err, idx) => (
                          <li key={idx}>
                            User {err.user_id}: {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
