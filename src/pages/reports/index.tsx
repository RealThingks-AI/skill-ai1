import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportCategoryCard } from "./components/ReportCategoryCard";
import { ReportResults } from "./components/ReportResults";
import { useReportsData } from "./hooks/useReportsData";
import { useState } from "react";
import type { GeneratedReport } from "./types/reportTypes";
import { dateFormatters } from "@/utils/formatters";
import { 
  Download,
  FileText,
  Database,
  PieChart,
  Clock
} from "lucide-react";

export default function Reports() {
  const { 
    dashboardStats, 
    reportCategories, 
    reportLogs,
    loading 
  } = useReportsData();
  
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const handleReportGenerated = (reportId: string) => {
    console.log('Report generated, ID:', reportId);
    // The report will be set through the useReportsData hook
  };

  const quickStats = [
    {
      title: "Reports Generated",
      value: dashboardStats.reportsGenerated.toString(),
      change: "+23 this month",
      icon: FileText,
      color: "text-blue-600"
    },
    {
      title: "Data Points",
      value: `${(dashboardStats.dataPoints / 1000).toFixed(1)}K`,
      change: "Metrics tracked",
      icon: Database,
      color: "text-green-600"
    },
    {
      title: "Active Dashboards",
      value: dashboardStats.activeDashboards.toString(),
      change: "Real-time updates",
      icon: PieChart,
      color: "text-purple-600"
    },
    {
      title: "Scheduled Reports",
      value: dashboardStats.scheduledReports.toString(),
      change: "Automated delivery",
      icon: Clock,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="w-full h-full">
      <div className="h-full overflow-auto">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-6 space-y-4 lg:space-y-6 max-w-none">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 lg:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1 text-sm lg:text-base">
                Generate insights and track performance metrics
              </p>
            </div>
            <Button className="gap-2 shrink-0 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4">
            {quickStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card key={index} className="min-w-0">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 lg:p-4">
                    <CardTitle className="text-xs sm:text-sm lg:text-sm font-medium truncate pr-2">{stat.title}</CardTitle>
                    <IconComponent className={`h-4 w-4 shrink-0 ${stat.color}`} />
                  </CardHeader>
                  <CardContent className="px-3 lg:px-4 pb-3 lg:pb-4">
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground truncate">{stat.change}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Report Categories */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Report Categories</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {reportCategories.map((category, index) => (
              <ReportCategoryCard
                key={category.id}
                category={category}
                onReportGenerated={handleReportGenerated}
              />
            ))}
          </div>
        </div>

        {/* Report Results Section */}
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Generated Report</h2>
          <ReportResults 
            report={currentReport}
            loading={reportLoading}
            onRegenerateReport={() => {
              setCurrentReport(null);
              setReportLoading(false);
            }}
          />
          </div>

          {/* Recent Reports */}
          <div className="space-y-4 pb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Recent Reports</h2>
            <Card className="w-full">
              <CardHeader className="p-4 lg:p-6">
                <CardTitle className="text-base lg:text-lg">Generated Reports</CardTitle>
                <CardDescription className="text-sm">Recent report activity and status</CardDescription>
              </CardHeader>
              <CardContent className="p-4 lg:p-6 pt-0">
                <div className="space-y-3">
                  {reportLogs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No reports generated yet. Generate your first report above.
                    </div>
                  ) : (
                    reportLogs.slice(0, 5).map((log, index) => (
                      <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="text-sm font-medium truncate">{log.report_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {log.report_type} • {dateFormatters.formatDate(log.created_at)}
                            {log.records_processed && ` • ${log.records_processed} records`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={
                            log.status === 'completed' ? 'default' :
                            log.status === 'generating' ? 'secondary' : 'destructive'
                          }>
                            {log.status}
                          </Badge>
                          {log.status === 'completed' && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}