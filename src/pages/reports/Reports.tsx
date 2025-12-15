import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Calendar, BarChart3, TrendingUp, Users, Target } from "lucide-react";
import { useReportsData } from "./hooks/useReportsData";
import { ReportCategoryCard } from "./components/ReportCategoryCard";
import { SkillsGapAnalysis } from "./components/SkillsGapAnalysis";
import { Skeleton } from "@/components/ui/skeleton";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { 
    loading, 
    dashboardStats, 
    reportCategories, 
    reportLogs,
    generateReport 
  } = useReportsData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-full mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills-gap">
            <BarChart3 className="mr-2 h-4 w-4" />
            Skills Gap
          </TabsTrigger>
          <TabsTrigger value="proficiency">
            <TrendingUp className="mr-2 h-4 w-4" />
            Proficiency
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="mr-2 h-4 w-4" />
            Team Performance
          </TabsTrigger>
          <TabsTrigger value="projects">
            <Target className="mr-2 h-4 w-4" />
            Projects
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.reportsGenerated}</div>
            <p className="text-xs text-muted-foreground">From database records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skill Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.dataPoints}</div>
            <p className="text-xs text-muted-foreground">Active skill records</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.activeDashboards}</div>
            <p className="text-xs text-muted-foreground">Awaiting tech lead review</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportLogs.length}</div>
            <p className="text-xs text-muted-foreground">Report generations</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Report Categories</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {reportCategories.map((category, index) => (
            <ReportCategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest report generations and data processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No reports generated yet. Generate your first report above.
              </div>
            ) : (
              reportLogs.slice(0, 5).map((log, index) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{log.report_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{log.report_type}</span>
                      <span>•</span>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                      {log.records_processed && (
                        <>
                          <span>•</span>
                          <span>{log.records_processed} records</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'outline'}>
                      {log.status}
                    </Badge>
                    {log.status === 'completed' && (
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="skills-gap">
          <SkillsGapAnalysis />
        </TabsContent>

        <TabsContent value="proficiency">
          <Card>
            <CardHeader>
              <CardTitle>Proficiency Trends</CardTitle>
              <CardDescription>Coming soon - Track skill proficiency changes over time</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
              <CardDescription>Coming soon - Analyze team productivity and performance metrics</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project Insights</CardTitle>
              <CardDescription>Coming soon - Project-based reporting and analysis</CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;