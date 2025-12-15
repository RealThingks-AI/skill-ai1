import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { reportService } from "../services/reportService";
import { supabase } from "@/integrations/supabase/client";
import type { 
  ReportFilters, 
  GeneratedReport, 
  ExportFormat, 
  ReportLog,
  ReportCategory,
  ReportDefinition 
} from "../types/reportTypes";
import { toast } from "sonner";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  DollarSign, 
  Activity, 
  Shield,
  FileText,
  PieChart,
  LineChart,
  Database
} from "lucide-react";

export const useReportsData = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentReport, setCurrentReport] = useState<GeneratedReport | null>(null);
  const [reportLogs, setReportLogs] = useState<ReportLog[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    reportsGenerated: 0,
    dataPoints: 0,
    activeDashboards: 0,
    scheduledReports: 0
  });

  const reportCategories: ReportCategory[] = [
    {
      id: 'skills-analytics',
      title: 'Skills Analytics',
      description: 'Comprehensive analysis of team skills and proficiency levels',
      icon: BarChart3,
      color: 'border-blue-200 bg-blue-50',
      reports: [
        {
          id: 'skills-gap-analysis',
          name: 'Skills Gap Analysis',
          description: 'Required skills vs approved skills',
          category: 'Skills Analytics',
          filters: ['employee', 'department', 'skill_category', 'timeline'],
          data_source: 'approved_ratings'
        },
        {
          id: 'proficiency-trends',
          name: 'Proficiency Trends',
          description: 'Historical ratings over time (self vs approved)',
          category: 'Skills Analytics',
          filters: ['employee', 'skill', 'timeline'],
          data_source: 'rating_history'
        },
        {
          id: 'skill-distribution',
          name: 'Skill Distribution',
          description: 'Approved skill spread by team/department',
          category: 'Skills Analytics',
          filters: ['department', 'skill_category'],
          data_source: 'approved_ratings'
        }
      ]
    },
    {
      id: 'team-performance',
      title: 'Team Performance',
      description: 'Team productivity and performance metrics',
      icon: Users,
      color: 'border-green-200 bg-green-50',
      reports: [
        {
          id: 'team-productivity',
          name: 'Team Productivity',
          description: 'Skills applied vs project needs',
          category: 'Team Performance',
          filters: ['team', 'project', 'timeline'],
          data_source: 'project_assignments'
        },
        {
          id: 'individual-performance',
          name: 'Individual Performance',
          description: 'Rating improvement vs project success',
          category: 'Team Performance',
          filters: ['employee', 'project', 'timeline'],
          data_source: 'rating_history'
        },
        {
          id: 'goal-achievement',
          name: 'Goal Achievement',
          description: 'Employees reaching target skill goals',
          category: 'Team Performance',
          filters: ['employee', 'skill_category', 'timeline'],
          data_source: 'approved_ratings'
        }
      ]
    },
    {
      id: 'project-insights',
      title: 'Project Insights',
      description: 'Project-based reporting and analysis',
      icon: Target,
      color: 'border-purple-200 bg-purple-50',
      reports: [
        {
          id: 'project-timeline',
          name: 'Project Timeline',
          description: 'Skills vs project delays',
          category: 'Project Insights',
          filters: ['project', 'timeline'],
          data_source: 'projects'
        },
        {
          id: 'resource-allocation',
          name: 'Resource Allocation',
          description: 'Employee skill allocation across projects',
          category: 'Project Insights',
          filters: ['project', 'skill', 'employee'],
          data_source: 'project_assignments'
        },
        {
          id: 'skill-utilization',
          name: 'Skill Utilization',
          description: '% of skills actually applied in assigned work',
          category: 'Project Insights',
          filters: ['skill', 'project'],
          data_source: 'project_assignments'
        },
        {
          id: 'budget-analysis',
          name: 'Budget Analysis',
          description: 'Training investment vs performance gain',
          category: 'Project Insights',
          filters: ['department', 'fiscal_year'],
          data_source: 'training_budgets'
        }
      ]
    },
    {
      id: 'compliance-reports',
      title: 'Compliance Reports',
      description: 'Regulatory and compliance tracking',
      icon: Shield,
      color: 'border-orange-200 bg-orange-50',
      reports: [
        {
          id: 'training-compliance',
          name: 'Training Compliance',
          description: 'Training completion and compliance status',
          category: 'Compliance Reports',
          filters: ['employee', 'training_type', 'timeline'],
          data_source: 'training_participation'
        },
        {
          id: 'certification-status',
          name: 'Certification Status',
          description: 'Employee certification tracking',
          category: 'Compliance Reports',
          filters: ['employee', 'certification', 'expiry'],
          data_source: 'training_participation'
        },
        {
          id: 'audit-trail',
          name: 'Audit Trail',
          description: 'Complete audit history of all changes',
          category: 'Compliance Reports',
          filters: ['timeline', 'action_type'],
          data_source: 'approval_history'
        }
      ]
    }
  ];

  // Remove dummy data - use actual reportLogs instead

  const fetchDashboardStats = async () => {
    try {
      const { data: logsData } = await supabase
        .from('report_logs')
        .select('*')
        .eq('status', 'completed');

      const { data: ratingsData } = await supabase
        .from('employee_ratings')
        .select('id');

      // Get pending approvals count
      const { data: pendingData } = await supabase
        .from('employee_ratings')
        .select('id')
        .eq('status', 'submitted');

      setDashboardStats({
        reportsGenerated: logsData?.length || 0,
        dataPoints: ratingsData?.length || 0,
        activeDashboards: pendingData?.length || 0,
        scheduledReports: reportLogs.length || 0
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchReportLogs = async () => {
    if (!profile) {
      console.log('Skipping report logs fetch - no user profile available');
      return;
    }
    
    try {
      const logs = await reportService.getReportLogs(10);
      setReportLogs(logs);
    } catch (error) {
      console.error('Error fetching report logs:', error);
      // Only show error toast if it's not a simple empty data case
      if (error.message !== 'TypeError: Failed to fetch') {
        toast.error('Failed to fetch report logs');
      }
    }
  };

  const generateReport = async (
    reportId: string,
    filters: ReportFilters = {}
  ): Promise<GeneratedReport | null> => {
    if (!profile) {
      toast.error('Authentication required');
      return null;
    }

    console.log(`Starting report generation: ${reportId}`, { filters, user: profile.user_id });
    setLoading(true);
    
    try {
      let report: GeneratedReport;

      switch (reportId) {
        case 'skills-gap-analysis':
          console.log('Generating skills gap analysis...');
          report = await reportService.generateSkillsGapAnalysis(filters);
          break;
        case 'proficiency-trends':
          console.log('Generating proficiency trends...');
          report = await reportService.generateProficiencyTrends(filters);
          break;
        case 'skill-distribution':
          console.log('Generating skill distribution...');
          report = await reportService.generateSkillsGapAnalysis(filters);
          break;
        case 'team-productivity':
          console.log('Generating team productivity...');
          report = await reportService.generateTeamProductivity(filters);
          break;
        case 'individual-performance':
          console.log('Generating individual performance...');
          report = await reportService.generateProficiencyTrends(filters);
          break;
        case 'goal-achievement':
          console.log('Generating goal achievement...');
          report = await reportService.generateSkillsGapAnalysis(filters);
          break;
        default:
          console.warn(`Unknown report type: ${reportId}, defaulting to skills gap analysis`);
          report = await reportService.generateSkillsGapAnalysis(filters);
      }

      console.log('Report generated successfully:', {
        id: report.id,
        name: report.name,
        rowCount: report.data.rows.length / (report.data.headers.length || 1),
        headers: report.data.headers
      });

      setCurrentReport(report);
      toast.success(`${report.name} generated successfully with ${Math.floor(report.data.rows.length / (report.data.headers.length || 1))} records`);
      
      // Refresh logs and stats
      await Promise.all([fetchReportLogs(), fetchDashboardStats()]);
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate report: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (
    report: GeneratedReport,
    format: ExportFormat
  ): Promise<void> => {
    try {
      const fileUrl = await reportService.exportReport(report, format);
      
      // Create download link
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = `${report.name}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL
      window.URL.revokeObjectURL(fileUrl);
      
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Failed to export report: ${error.message}`);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchDashboardStats();
      fetchReportLogs();
    }
  }, [profile]);

  // Also fetch data when component mounts, but only if profile is available
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (profile) {
        fetchDashboardStats();
        fetchReportLogs();
      }
    }, 500); // Small delay to ensure auth is fully loaded

    return () => clearTimeout(timeoutId);
  }, []);

  return {
    loading,
    currentReport,
    reportLogs,
    dashboardStats,
    reportCategories,
    generateReport,
    exportReport,
    setCurrentReport,
    refreshData: () => {
      fetchDashboardStats();
      fetchReportLogs();
    }
  };
};