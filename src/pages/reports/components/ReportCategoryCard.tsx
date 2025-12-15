import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReportsData } from "../hooks/useReportsData";
import { ReportHistory } from "./ReportHistory";
import type { ReportCategory } from "../types/reportTypes";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useState } from "react";
import { toast } from "sonner";

interface ReportCategoryCardProps {
  category: ReportCategory;
  onReportGenerated?: (reportId: string) => void;
}

export function ReportCategoryCard({ category, onReportGenerated }: ReportCategoryCardProps) {
  const { generateReport, loading } = useReportsData();
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReport(reportId);
    
    try {
      console.log('Generating report:', reportId);
      
      const report = await generateReport(reportId, {});
      
      if (report) {
        console.log('Report generated successfully:', report.id);
        toast.success(`${report.name} generated successfully`);
        onReportGenerated?.(reportId);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleViewAllReports = () => {
    console.log('Opening report history for category:', category.id);
    setShowHistory(true);
  };

  const Icon = category.icon;

  return (
    <>
      <Card className={`h-full ${category.color} min-w-0 flex flex-col`}>
        <CardHeader className="p-4 lg:p-6">
          <div className="flex items-center gap-3 min-w-0">
            <Icon className="h-5 w-5 shrink-0" />
            <CardTitle className="text-lg xl:text-xl truncate">{category.title}</CardTitle>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            {category.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:p-6 pt-0 flex-1 flex flex-col">
          <div className="space-y-3 flex-1">
            {category.reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium truncate block">{report.name}</span>
                  <span className="text-xs text-muted-foreground truncate block">
                    {report.description}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled={loading || generatingReport !== null}
                  onClick={() => handleGenerateReport(report.id)}
                  className="shrink-0 h-8 px-3 text-xs gap-2"
                >
                  {generatingReport === report.id ? (
                    <>
                      <LoadingSpinner showText={false} />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pt-4 border-t mt-4">
            <Badge variant="secondary" className="text-xs w-fit">
              {category.reports.length} reports
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 px-2 w-full sm:w-auto"
              onClick={handleViewAllReports}
            >
              View All Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      <ReportHistory 
        isOpen={showHistory}
        onOpenChange={setShowHistory}
      />
    </>
  );
}