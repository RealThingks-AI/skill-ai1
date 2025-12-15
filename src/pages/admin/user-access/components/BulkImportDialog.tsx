import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { UserAccessService } from "../services/UserAccessService";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV file",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "full_name,email,password,role,department\nJohn Doe,john@example.com,SecurePass123,employee,Engineering\nJane Smith,jane@example.com,SecurePass456,tech_lead,Engineering";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded"
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV file is empty or invalid');
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['full_name', 'email', 'password', 'role'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
        }

        const users = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const user: any = {};
          
          headers.forEach((header, index) => {
            user[header] = values[index] || '';
          });

          // Validate required fields
          if (!user.full_name || !user.email || !user.password || !user.role) {
            errors.push(`Line ${i + 1}: Missing required fields`);
            continue;
          }

          // Validate email format
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
            errors.push(`Line ${i + 1}: Invalid email format`);
            continue;
          }

          // Validate role
          const validRoles = ['employee', 'tech_lead', 'management', 'admin'];
          if (!validRoles.includes(user.role.toLowerCase())) {
            errors.push(`Line ${i + 1}: Invalid role (must be: ${validRoles.join(', ')})`);
            continue;
          }

          users.push(user);
        }

        // Import users
        let successCount = 0;
        for (const user of users) {
          try {
            await UserAccessService.createUser({
              email: user.email,
              password: user.password,
              full_name: user.full_name,
              role: user.role
            });
            successCount++;
          } catch (error: any) {
            errors.push(`${user.email}: ${error.message}`);
          }
        }

        setResult({
          success: successCount,
          failed: errors.length,
          errors
        });

        if (successCount > 0) {
          toast({
            title: "Import Complete",
            description: `Successfully imported ${successCount} user(s)`,
          });
          onSuccess();
        }
      } catch (error: any) {
        toast({
          title: "Import Failed",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[min(600px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              CSV must include columns: full_name, email, password, role (optional: department)
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button type="button" variant="outline" asChild>
                  <span>Choose CSV File</span>
                </Button>
              </label>
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {result && (
            <div className="space-y-2">
              {result.success > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully imported {result.success} user(s)
                  </AlertDescription>
                </Alert>
              )}
              
              {result.failed > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">
                      {result.failed} error(s) occurred:
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                      {result.errors.map((error, idx) => (
                        <div key={idx}>• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || importing}
          >
            {importing ? "Importing..." : "Import Users"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
