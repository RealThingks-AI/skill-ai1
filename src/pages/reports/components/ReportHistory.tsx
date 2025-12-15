import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Eye, RefreshCw, Calendar, User } from "lucide-react";
import { useReportsData } from "../hooks/useReportsData";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { ReportResults } from "./ReportResults";
import type { ReportLog, GeneratedReport } from "../types/reportTypes";
import { toast } from "sonner";
import { dateFormatters } from "@/utils/formatters";

interface ReportHistoryProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReportHistory({ isOpen, onOpenChange }: ReportHistoryProps) {
  const { reportLogs, loading, generateReport, refreshData } = useReportsData();
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen, refreshData]);

  const handleViewReport = async (log: ReportLog) => {
    try {
      console.log('Viewing report:', log.id, log.report_type);
      
      // For now, we'll regenerate the report to get the data
      // In a production app, you'd store the report data and retrieve it
      const report = await generateReport(
        getReportIdFromType(log.report_type, log.report_name),
        log.filters
      );
      
      if (report) {
        setSelectedReport(report);
      }
    } catch (error) {
      console.error('Failed to view report:', error);
      toast.error('Failed to load report data');
    }
  };

  const handleRegenerateReport = async (log: ReportLog) => {
    setRegenerating(log.id);
    try {
      console.log('Regenerating report:', log.report_type, log.filters);
      
      await generateReport(
        getReportIdFromType(log.report_type, log.report_name),
        log.filters
      );
      
      await refreshData();
      toast.success('Report regenerated successfully');
    } catch (error) {
      console.error('Failed to regenerate report:', error);
      toast.error('Failed to regenerate report');
    } finally {
      setRegenerating(null);
    }
  };

  const getReportIdFromType = (reportType: string, reportName: string): string => {
    const mappings: Record<string, string> = {
      'Skills Gap Analysis': 'skills-gap-analysis',
      'Proficiency Trends': 'proficiency-trends',
      'Team Productivity': 'team-productivity',
    };
    return mappings[reportName] || 'skills-gap-analysis';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'generating':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(896px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Report History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : reportLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm">Generate your first report to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reportLogs.map((log) => (
                <Card key={log.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium truncate">{log.report_name}</h4>
                          <Badge variant={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dateFormatters.formatDate(log.created_at)}
                          </div>
                          {log.records_processed !== null && (
                            <span>{log.records_processed} records</span>
                          )}
                          {log.execution_time_ms && (
                            <span>{log.execution_time_ms}ms</span>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {log.report_type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {log.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(log)}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                          </>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegenerateReport(log)}
                          disabled={regenerating === log.id}
                          className="gap-2"
                        >
                          {regenerating === log.id ? (
                            <LoadingSpinner showText={false} />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                          Regenerate
                        </Button>
                      </div>
                    </div>

                    {log.error_message && (
                      <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                        Error: {log.error_message}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {selectedReport && (
          <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
            <DialogContent className="max-w-[min(1152px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Report Details - {selectedReport.name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto">
                <ReportResults 
                  report={selectedReport} 
                  onRegenerateReport={() => setSelectedReport(null)}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}