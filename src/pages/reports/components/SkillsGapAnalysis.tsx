import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Filter, RefreshCw, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { reportService } from "../services/reportService";
import type { ReportFilters, GeneratedReport, ExportFormat } from "../types/reportTypes";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { fetchAllRows } from "@/utils/supabasePagination";

interface SkillsGapData {
  employee: string;
  skill: string;
  category: string;
  self_rating: string;
  approved_rating: string;
  gap: string;
  department: string;
}

interface FilterOptions {
  employees: { id: string; name: string; department: string }[];
  skills: { id: string; name: string; category: string }[];
  categories: { id: string; name: string }[];
}

export function SkillsGapAnalysis() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [reportData, setReportData] = useState<SkillsGapData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    employees: [],
    skills: [],
    categories: []
  });
  
  const [filters, setFilters] = useState<ReportFilters>({
    employee_ids: [],
    skill_category_ids: [],
    departments: [],
    start_date: '',
    end_date: ''
  });

  const [activeFilters, setActiveFilters] = useState({
    employee: '',
    skill: '',
    category: '',
    department: ''
  });

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch all profiles using pagination helper
        const { data: allProfiles, error: profilesError } = await fetchAllRows(
          supabase
            .from('profiles')
            .select('user_id, full_name, department')
        );

        if (profilesError) throw profilesError;

        const [skillsRes, categoriesRes] = await Promise.all([
          supabase.from('skills').select('id, name, skill_categories(id, name)'),
          supabase.from('skill_categories').select('id, name')
        ]);

        const employeesRes = { data: allProfiles };

        setFilterOptions({
          employees: employeesRes.data?.map(e => ({
            id: e.user_id,
            name: e.full_name,
            department: e.department || 'N/A'
          })) || [],
          skills: skillsRes.data?.map(s => ({
            id: s.id,
            name: s.name,
            category: s.skill_categories?.name || 'Unknown'
          })) || [],
          categories: categoriesRes.data?.map(c => ({
            id: c.id,
            name: c.name
          })) || []
        });
      } catch (error) {
        console.error('Error fetching filter options:', error);
        toast.error('Failed to load filter options');
      }
    };

    fetchFilterOptions();
  }, []);

  const applyFilters = () => {
    const newFilters: ReportFilters = {};
    
    if (activeFilters.employee) {
      newFilters.employee_ids = [activeFilters.employee];
    }
    if (activeFilters.category) {
      newFilters.skill_category_ids = [activeFilters.category];
    }
    if (activeFilters.department) {
      newFilters.departments = [activeFilters.department];
    }
    
    setFilters(newFilters);
    generateReport(newFilters);
  };

  const generateReport = async (reportFilters: ReportFilters = filters) => {
    if (!profile) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);
    try {
      // Fetch both self-ratings and approved ratings
      let query = supabase
        .from('employee_ratings')
        .select(`
          user_id,
          skill_id,
          rating,
          status,
          created_at,
          skills (
            name,
            skill_categories (
              name
            )
          ),
          profiles!employee_ratings_user_id_fkey (
            full_name,
            department
          )
        `);

      // Apply filters
      if (reportFilters.employee_ids?.length) {
        query = query.in('user_id', reportFilters.employee_ids);
      }
      if (reportFilters.skill_category_ids?.length) {
        query = query.in('skills.category_id', reportFilters.skill_category_ids);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process data for Skills Gap Analysis
      const processedData = processSkillsGapData(data || []);
      setReportData(processedData);
      
      // Generate chart data
      const chartData = generateChartData(processedData);
      setChartData(chartData);

      // Log the report generation
      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        name: 'Skills Gap Analysis',
        type: 'Skills Analytics',
        data: {
          headers: ['Employee', 'Skill', 'Category', 'Self Rating', 'Approved Rating', 'Gap', 'Department'],
          rows: processedData.flatMap(item => [
            item.employee, item.skill, item.category, 
            item.self_rating, item.approved_rating, item.gap, item.department
          ]),
          charts: [{
            type: 'bar',
            title: 'Skills Gap by Category',
            data: chartData,
            xAxisKey: 'category',
            yAxisKey: 'gap_count'
          }]
        },
        filters: reportFilters,
        generated_at: new Date().toISOString(),
        generated_by: profile.user_id
      };

      setCurrentReport(report);
      
      // Log to report_logs table
      await supabase.from('report_logs').insert({
        report_type: 'Skills Analytics',
        report_name: 'Skills Gap Analysis',
        filters: reportFilters as any,
        status: 'completed',
        records_processed: processedData.length,
        generated_by: profile.user_id
      });

      toast.success('Skills Gap Analysis generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const processSkillsGapData = (data: any[]): SkillsGapData[] => {
    const skillMap = new Map<string, { self?: any, approved?: any }>();

    // Group by user and skill
    data.forEach(rating => {
      const key = `${rating.user_id}-${rating.skill_id}`;
      if (!skillMap.has(key)) {
        skillMap.set(key, {});
      }
      
      const entry = skillMap.get(key)!;
      if (rating.status === 'approved') {
        entry.approved = rating;
      } else if (rating.status === 'submitted') {
        entry.self = rating;
      }
    });

    const result: SkillsGapData[] = [];
    
    skillMap.forEach((ratings, key) => {
      const { self, approved } = ratings;
      
      // Only include entries where we have approved ratings
      if (approved) {
        const selfRating = self?.rating || 'N/A';
        const approvedRating = approved.rating;
        
        let gap = 'No Gap';
        if (selfRating !== 'N/A') {
          const ratingValues = { low: 1, medium: 2, high: 3 };
          const selfValue = ratingValues[selfRating as keyof typeof ratingValues];
          const approvedValue = ratingValues[approvedRating as keyof typeof ratingValues];
          
          if (selfValue > approvedValue) {
            gap = 'Over-estimated';
          } else if (selfValue < approvedValue) {
            gap = 'Under-estimated';
          }
        }

        result.push({
          employee: approved.profiles?.full_name || 'Unknown',
          skill: approved.skills?.name || 'Unknown',
          category: approved.skills?.skill_categories?.name || 'Unknown',
          self_rating: selfRating,
          approved_rating: approvedRating,
          gap,
          department: approved.profiles?.department || 'N/A'
        });
      }
    });

    return result;
  };

  const generateChartData = (data: SkillsGapData[]) => {
    const categoryMap = new Map<string, { total: number, gaps: number }>();
    
    data.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { total: 0, gaps: 0 });
      }
      
      const stats = categoryMap.get(item.category)!;
      stats.total++;
      if (item.gap !== 'No Gap') {
        stats.gaps++;
      }
    });

    return Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      gap_count: stats.gaps,
      total_ratings: stats.total,
      gap_percentage: Math.round((stats.gaps / stats.total) * 100)
    }));
  };

  const exportReport = async (format: ExportFormat) => {
    if (!currentReport) {
      toast.error('No report to export');
      return;
    }

    setExportLoading(true);
    try {
      const fileUrl = await reportService.exportReport(currentReport, format);
      
      // Create download link
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `skills-gap-analysis.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      window.URL.revokeObjectURL(fileUrl);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setActiveFilters({
      employee: '',
      skill: '',
      category: '',
      department: ''
    });
    setFilters({});
    generateReport({});
  };

  // Load initial data
  useEffect(() => {
    if (profile) {
      generateReport();
    }
  }, [profile]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Skills Gap Analysis</h2>
          <p className="text-muted-foreground">
            Compare self-ratings with tech lead approved ratings
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportReport('csv')}
            disabled={!currentReport || exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('xlsx')}
            disabled={!currentReport || exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            XLSX
          </Button>
          <Button
            variant="outline"
            onClick={() => exportReport('pdf')}
            disabled={!currentReport || exportLoading}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-lg">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select
                value={activeFilters.employee}
                onValueChange={(value) => setActiveFilters(prev => ({ ...prev, employee: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.employees
                    .filter(emp => emp.id && emp.id.trim() !== '')
                    .map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Skill Category</Label>
              <Select
                value={activeFilters.category}
                onValueChange={(value) => setActiveFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.categories
                    .filter(cat => cat.id && cat.id.trim() !== '')
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={activeFilters.department}
                onValueChange={(value) => setActiveFilters(prev => ({ ...prev, department: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(filterOptions.employees.map(e => e.department)))
                    .filter(dept => dept && dept.trim() !== '')
                    .map(dept => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} disabled={loading} className="flex-1">
                {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
                Apply Filters
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <CardTitle className="text-lg">Skills Gap by Category</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="gap_count" fill="hsl(var(--destructive))" name="Skills with Gaps" />
                  <Bar dataKey="total_ratings" fill="hsl(var(--primary))" name="Total Ratings" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Analysis</CardTitle>
          <CardDescription>
            {reportData.length} skill rating comparisons found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Generating report...</span>
            </div>
          ) : (
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Self Rating</TableHead>
                    <TableHead>Approved Rating</TableHead>
                    <TableHead>Gap Analysis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.employee}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell>{row.skill}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          row.self_rating === 'high' ? 'default' : 
                          row.self_rating === 'medium' ? 'secondary' : 
                          row.self_rating === 'low' ? 'outline' : 'secondary'
                        }>
                          {row.self_rating}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          row.approved_rating === 'high' ? 'default' : 
                          row.approved_rating === 'medium' ? 'secondary' : 'outline'
                        }>
                          {row.approved_rating}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          row.gap === 'No Gap' ? 'default' : 
                          row.gap === 'Over-estimated' ? 'destructive' : 'secondary'
                        }>
                          {row.gap}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}