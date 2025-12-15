import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Database, AlertTriangle, History, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
interface BackupProps {
  onBack: () => void;
}
interface BackupHistoryItem {
  id: string;
  backup_name: string;
  backup_type: string;
  file_size: number;
  table_count: number;
  record_count: number;
  created_at: string;
  storage_path?: string;
  metadata?: any;
}
export default function Backup({
  onBack
}: BackupProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [importProgress, setImportProgress] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<BackupHistoryItem | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [autoBackupData, setAutoBackupData] = useState<any>(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchBackupHistory();
  }, []);
  const fetchBackupHistory = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('backup_history').select('*').order('created_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      setBackupHistory(data || []);
    } catch (error) {
      console.error('Error fetching backup history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };
  const formatDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
  };
  const exportBackup = async (backupType: 'manual' | 'auto') => {
    try {
      setIsExporting(true);
      setExportProgress("Starting export...");

      // Get auth session
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated. Please log in again.");
      }
      setExportProgress("Exporting data with full permissions...");

      // Call edge function to export with service role (bypasses RLS)
      const {
        data: exportResult,
        error: exportError
      } = await supabase.functions.invoke('backup-export', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (exportError) {
        console.error('Export function error details:', {
          message: exportError.message,
          details: exportError,
          context: exportError.context
        });
        throw new Error(`Export failed: ${exportError.message}`);
      }
      if (!exportResult?.backupData) {
        throw new Error('Export returned no data');
      }
      const backupData = exportResult.backupData;
      const summary = exportResult.summary;
      console.log(`Export complete: ${summary.totalRecords} records from ${summary.totalTables} tables`);
      if (summary.errors && summary.errors.length > 0) {
        console.warn('Export had errors:', summary.errors);
      }
      const backupJson = JSON.stringify(backupData, null, 2);
      const fileSize = new Blob([backupJson]).size;
      const fileName = `backup_${formatDateTime()}.json`;
      const filePath = `${backupType}/${fileName}`;

      // Upload to storage
      setExportProgress("Uploading to storage...");
      const {
        error: uploadError
      } = await supabase.storage.from('backups').upload(filePath, backupJson, {
        contentType: 'application/json',
        upsert: false
      });
      if (uploadError) {
        console.error('Storage upload error details:', {
          message: uploadError.message,
          error: uploadError
        });
        throw uploadError;
      }

      // Save to backup history
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('backup_history').insert({
          backup_name: fileName,
          backup_type: backupType,
          file_size: fileSize,
          table_count: summary.totalTables,
          record_count: summary.totalRecords,
          storage_path: filePath,
          created_by: user.id,
          metadata: {
            version: backupData.version,
            timestamp: backupData.timestamp,
            errors: summary.errors
          }
        });
      }
      await fetchBackupHistory();
      if (backupType === 'manual') {
        if (summary.errors && summary.errors.length > 0) {
          toast({
            title: "Export Complete with Warnings",
            description: `Backup saved: ${fileName}. Some tables had export errors (check console).`
          });
        } else {
          toast({
            title: "Export Successful",
            description: `Backup saved to storage: ${fileName} (${summary.totalRecords} records)`
          });
        }
      }
      return backupData;
    } catch (error) {
      console.error('Export error:', error);
      if (backupType === 'manual') {
        toast({
          title: "Export Failed",
          description: error instanceof Error ? error.message : "Failed to export data",
          variant: "destructive"
        });
      }
      throw error;
    } finally {
      setIsExporting(false);
      setExportProgress("");
    }
  };
  const handleExport = () => exportBackup('manual');
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowImportDialog(true);
    }
    event.target.value = '';
  };
  const handleImportConfirm = async () => {
    try {
      setShowImportDialog(false);
      setIsImporting(true);
      let backupData;
      const isExternalFile = !!selectedFile;

      // Only create auto-backup for external file imports
      // Stored backups are already safe in storage
      if (isExternalFile) {
        setImportProgress("Creating safety backup...");
        const autoBackup = await exportBackup('auto');
        setAutoBackupData(autoBackup);
      } else {
        setImportProgress("Loading stored backup...");
      }

      // Load backup data from file or storage
      if (selectedFile) {
        setImportProgress("Reading and validating import file...");
        const text = await selectedFile.text();
        try {
          backupData = JSON.parse(text);
        } catch (parseError) {
          throw new Error("Invalid JSON format in backup file");
        }
      } else if (selectedBackup?.storage_path) {
        setImportProgress("Downloading backup from storage...");
        const {
          data,
          error
        } = await supabase.storage.from('backups').download(selectedBackup.storage_path);
        if (error) throw error;
        const text = await data.text();
        try {
          backupData = JSON.parse(text);
        } catch (parseError) {
          throw new Error("Corrupted backup file in storage");
        }
      } else {
        throw new Error("No backup source selected");
      }

      // Validate backup file structure and metadata
      if (!backupData || typeof backupData !== 'object') {
        throw new Error("Invalid backup file: not a valid backup object");
      }
      if (!backupData.version) {
        throw new Error("Invalid backup file: missing version metadata");
      }
      if (!backupData.timestamp) {
        throw new Error("Invalid backup file: missing timestamp metadata");
      }
      if (!backupData.tables || typeof backupData.tables !== 'object') {
        throw new Error("Invalid backup file: missing or invalid tables data");
      }
      const tableCount = Object.keys(backupData.tables).length;
      if (tableCount === 0) {
        throw new Error("Invalid backup file: no tables found");
      }
      console.log(`Restoring backup v${backupData.version} with ${tableCount} tables from ${backupData.timestamp}`);
      setImportProgress("Authenticating and processing restore...");

      // Get auth session
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated. Please log in again.");
      }
      setImportProgress("Executing full database replacement...");

      // Call edge function with replace mode
      const {
        data: functionData,
        error: functionError
      } = await supabase.functions.invoke('backup-import', {
        body: {
          backupData,
          mode: 'replace'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (functionError) {
        console.error('Import function error details:', {
          message: functionError.message,
          details: functionError,
          context: functionError.context
        });
        throw new Error(`Restore failed: ${functionError.message}`);
      }
      const results = functionData;
      const successCount = results.success?.length || 0;
      const errorCount = results.errors?.length || 0;
      const skippedCount = results.skipped?.length || 0;
      const warningCount = results.warnings?.length || 0;
      setImportProgress("Restore complete!");
      if (errorCount > 0) {
        console.error('Import errors:', results.errors);
        toast({
          title: "Partial Restore",
          description: `${successCount} tables restored successfully. ${errorCount} errors occurred. Check console for details.`,
          variant: "destructive"
        });
      } else if (warningCount > 0) {
        console.warn('Import warnings:', results.warnings);
        const totalSkippedRecords = results.success?.reduce((sum: number, s: any) => sum + (s.skipped || 0), 0) || 0;
        toast({
          title: "Restore Successful with Warnings",
          description: `Database restored: ${successCount} tables imported. ${totalSkippedRecords} records with invalid references were skipped.`
        });
      } else {
        const skippedTablesList = results.skipped && results.skipped.length > 0 ? `\n\nSkipped empty tables: ${results.skipped.join(', ')}` : '';
        toast({
          title: "Restore Successful",
          description: `Database fully restored: ${successCount} tables imported${skippedCount > 0 ? `, ${skippedCount} empty tables skipped` : ''}.${skippedTablesList}`
        });
      }

      // Refresh page to show updated data
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error during restore";
      toast({
        title: "Restore Failed",
        description: errorMessage,
        variant: "destructive"
      });

      // If auto-backup was created, remind user they can rollback
      if (autoBackupData) {
        setTimeout(() => {
          toast({
            title: "Rollback Available",
            description: "An auto-backup was created before the failed restore. You can rollback using the button above.",
            variant: "default"
          });
        }, 3000);
      }
    } finally {
      setIsImporting(false);
      setImportProgress("");
      setSelectedFile(null);
      setSelectedBackup(null);
    }
  };
  const handleRollback = async () => {
    if (!autoBackupData) return;
    const confirmed = window.confirm("Are you sure you want to rollback to the auto-backup?\n\n" + "This will restore the data from before the last import.");
    if (!confirmed) return;
    try {
      setIsImporting(true);
      setImportProgress("Rolling back...");
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const {
        data: functionData,
        error: functionError
      } = await supabase.functions.invoke('backup-import', {
        body: {
          backupData: autoBackupData,
          mode: 'replace'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (functionError) throw new Error(functionError.message);
      toast({
        title: "Rollback Successful",
        description: "Data has been restored from auto-backup."
      });
      setAutoBackupData(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Rollback error:', error);
      toast({
        title: "Rollback Failed",
        description: error instanceof Error ? error.message : "Failed to rollback",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setImportProgress("");
    }
  };
  const handleDownloadBackup = async (backup: BackupHistoryItem) => {
    try {
      if (!backup.storage_path) {
        toast({
          title: "Download Failed",
          description: "Backup file not found in storage",
          variant: "destructive"
        });
        return;
      }
      const {
        data,
        error
      } = await supabase.storage.from('backups').download(backup.storage_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = backup.backup_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: "Download Started",
        description: `Downloading ${backup.backup_name}`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download backup file",
        variant: "destructive"
      });
    }
  };
  const handleRestoreBackup = (backup: BackupHistoryItem) => {
    setSelectedBackup(backup);
    setSelectedFile(null); // Clear any selected file
    setShowImportDialog(true);
  };
  const handleDeleteBackupRecord = async (backup: BackupHistoryItem) => {
    const message = backup.storage_path ? "Delete this backup? This will remove both the file and history entry." : "Remove this backup record? (File is not in storage)";
    const confirmed = window.confirm(message);
    if (!confirmed) return;
    try {
      // Delete from storage if path exists
      if (backup.storage_path) {
        const {
          error: storageError
        } = await supabase.storage.from('backups').remove([backup.storage_path]);
        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Continue to delete history even if storage delete fails
        }
      }

      // Delete from history
      const {
        error
      } = await supabase.from('backup_history').delete().eq('id', backup.id);
      if (error) throw error;
      toast({
        title: backup.storage_path ? "Backup Deleted" : "Record Removed",
        description: backup.storage_path ? "Backup file and history entry removed." : "Invalid backup record removed from history."
      });
      fetchBackupHistory();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete backup",
        variant: "destructive"
      });
    }
  };
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };
  return <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
        
      </div>

      

      {autoBackupData && <Alert>
          <RotateCcw className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Auto-backup available from last import. You can rollback if needed.</span>
            <Button size="sm" variant="outline" onClick={handleRollback}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Rollback Now
            </Button>
          </AlertDescription>
        </Alert>}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle>Export Data</CardTitle>
            </div>
            <CardDescription>
              Create a complete backup and save to secure storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isExporting && <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <LoadingSpinner showText={false} />
                  <span className="text-sm font-medium">Exporting data...</span>
                </div>
                {exportProgress && <p className="text-sm text-muted-foreground">{exportProgress}</p>}
              </div>}

            <Button onClick={handleExport} disabled={isExporting || isImporting} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export All Data"}
            </Button>

            
          </CardContent>
        </Card>

      {/* Import Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Import Data</CardTitle>
            </div>
            <CardDescription>
              Completely replace database from a backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isImporting && <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <LoadingSpinner showText={false} />
                  <span className="text-sm font-medium">Restoring database...</span>
                </div>
                {importProgress && <p className="text-sm text-muted-foreground">{importProgress}</p>}
              </div>}

            <div>
              <input type="file" accept=".json" onChange={handleFileSelect} disabled={isExporting || isImporting} className="hidden" id="backup-file-input" />
              <label htmlFor="backup-file-input">
                <Button asChild disabled={isExporting || isImporting} className="w-full" variant="secondary">
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {isImporting ? "Restoring..." : "Import Backup File"}
                  </span>
                </Button>
              </label>
            </div>

            

            <div className="text-xs text-muted-foreground space-y-1">
              
              
              
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Backup History</CardTitle>
          </div>
          <CardDescription>
            Recent backups with download and restore options (last 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? <div className="flex items-center justify-center p-4 min-h-32">
              <LoadingSpinner />
            </div> : backupHistory.length === 0 ? <p className="text-center text-muted-foreground py-4">No backup history yet</p> : <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {backupHistory.map(backup => <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{backup.backup_name}</p>
                        {!backup.storage_path && <span className="px-2 py-0.5 text-xs rounded bg-destructive/10 text-destructive font-medium">
                            Missing File
                          </span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(backup.created_at).toLocaleString()} • {' '}
                        {backup.backup_type === 'auto' ? '🤖 Auto' : '👤 Manual'} • {' '}
                        {backup.table_count} tables • {backup.record_count.toLocaleString()} records • {' '}
                        {formatFileSize(backup.file_size)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      {backup.storage_path ? <>
                          <Button size="sm" variant="outline" onClick={() => handleDownloadBackup(backup)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button size="sm" onClick={() => handleRestoreBackup(backup)}>
                            <Database className="mr-2 h-4 w-4" />
                            Restore
                          </Button>
                        </> : <span className="text-xs text-muted-foreground italic px-2">
                          File not available in storage
                        </span>}
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteBackupRecord(backup)} title={backup.storage_path ? "Delete backup" : "Remove invalid record"}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>)}
              </div>
            </ScrollArea>}
        </CardContent>
      </Card>

      {/* Info Section */}
      

      {/* Import Confirmation Dialog */}
      <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Full Database Replacement</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-destructive">
                ⚠️ WARNING: This will completely replace your current database!
              </p>
              <p>
                All existing data will be <strong>permanently deleted</strong> and replaced with the backup data.
              </p>
              <p>
                Before proceeding:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>An auto-backup will be created</li>
                <li>You can rollback if needed</li>
                <li>The page will reload after restore</li>
              </ul>
              <p className="text-sm font-medium">
                {selectedFile ? `File: ${selectedFile.name}` : selectedBackup ? `Backup: ${selectedBackup.backup_name}` : ''}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setSelectedFile(null);
            setSelectedBackup(null);
          }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleImportConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Replace Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}