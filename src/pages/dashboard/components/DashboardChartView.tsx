import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import { Users, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import { DrillDownModal } from "./DrillDownModal";
import { supabase } from "@/integrations/supabase/client";

interface DashboardChartViewProps {
  categoryStats: Array<{
    id: string;
    name: string;
    expertUsers: any[];
    intermediateUsers: any[];
    beginnerUsers: any[];
    skillCount: number;
  }>;
}

interface DrillDownUser {
  userId: string;
  fullName: string;
  email: string;
  classification?: string;
  skillName?: string;
  rating?: string;
  percentage?: number;
}

export const DashboardChartView = ({ categoryStats }: DashboardChartViewProps) => {
  const { stats, loading } = useDashboard();
  const [drillDownData, setDrillDownData] = useState<{ title: string; users: DrillDownUser[] } | null>(null);

  // Set up real-time subscription for categoryStats updates
  useEffect(() => {
    const channel = supabase
      .channel('chart-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_ratings' },
        () => {
          console.log('Chart data updated in real-time');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Prepare data for category distribution chart
  const categoryDistributionData = categoryStats.map(cat => ({
    name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
    fullName: cat.name,
    categoryId: cat.id,
    Expert: cat.expertUsers.length,
    Intermediate: cat.intermediateUsers.length,
    Beginner: cat.beginnerUsers.length,
    total: cat.expertUsers.length + cat.intermediateUsers.length + cat.beginnerUsers.length
  })).filter(cat => cat.total > 0).sort((a, b) => b.total - a.total);

  // Overall classification distribution for pie chart
  const totalExpert = categoryStats.reduce((sum, cat) => sum + cat.expertUsers.length, 0);
  const totalIntermediate = categoryStats.reduce((sum, cat) => sum + cat.intermediateUsers.length, 0);
  const totalBeginner = categoryStats.reduce((sum, cat) => sum + cat.beginnerUsers.length, 0);

  const classificationPieData = [
    { name: 'Expert', value: totalExpert, color: 'hsl(var(--chart-1))' },
    { name: 'Intermediate', value: totalIntermediate, color: 'hsl(var(--chart-2))' },
    { name: 'Beginner', value: totalBeginner, color: 'hsl(var(--chart-3))' }
  ].filter(item => item.value > 0);

  // Top skills data
  const topSkillsData = stats.topSkills?.slice(0, 8) || [];

  // Stats cards data
  const statsCards = [
    {
      title: "Team Members",
      value: stats.totalTeamMembers,
      change: stats.membersChange,
      icon: Users,
      color: "hsl(var(--chart-1))"
    },
    {
      title: "Skills Tracked",
      value: stats.skillsTracked,
      change: stats.skillsChange,
      icon: TrendingUp,
      color: "hsl(var(--chart-2))"
    },
    {
      title: "Completion Rate",
      value: stats.completedAssessments,
      change: stats.completionChange,
      icon: CheckCircle2,
      color: "hsl(var(--chart-3))"
    },
    {
      title: "Pending Reviews",
      value: stats.pendingReviews,
      change: stats.reviewsChange,
      icon: Clock,
      color: "hsl(var(--chart-4))"
    }
  ];

  // Handle bar chart click
  const handleBarClick = (data: any, level: string) => {
    const category = categoryStats.find(c => c.id === data.categoryId);
    if (!category) return;

    let users: DrillDownUser[] = [];
    
    if (level === 'Expert') {
      users = category.expertUsers.map(u => ({
        userId: u.userId,
        fullName: u.fullName,
        email: u.email,
        classification: 'Expert',
        percentage: u.percentage
      }));
    } else if (level === 'Intermediate') {
      users = category.intermediateUsers.map(u => ({
        userId: u.userId,
        fullName: u.fullName,
        email: u.email,
        classification: 'Intermediate',
        percentage: u.percentage
      }));
    } else if (level === 'Beginner') {
      users = category.beginnerUsers.map(u => ({
        userId: u.userId,
        fullName: u.fullName,
        email: u.email,
        classification: 'Beginner',
        percentage: u.percentage
      }));
    }

    setDrillDownData({
      title: `${category.name} - ${level} Users`,
      users
    });
  };

  // Handle pie chart click
  const handlePieClick = (data: any) => {
    const level = data.name;
    let allUsers: DrillDownUser[] = [];

    categoryStats.forEach(category => {
      if (level === 'Expert') {
        allUsers.push(...category.expertUsers.map(u => ({
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          classification: 'Expert',
          percentage: u.percentage,
          skillName: category.name
        })));
      } else if (level === 'Intermediate') {
        allUsers.push(...category.intermediateUsers.map(u => ({
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          classification: 'Intermediate',
          percentage: u.percentage,
          skillName: category.name
        })));
      } else if (level === 'Beginner') {
        allUsers.push(...category.beginnerUsers.map(u => ({
          userId: u.userId,
          fullName: u.fullName,
          email: u.email,
          classification: 'Beginner',
          percentage: u.percentage,
          skillName: category.name
        })));
      }
    });

    setDrillDownData({
      title: `All ${level} Users Across Categories`,
      users: allUsers
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading chart data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-4 border-border/50 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-semibold text-foreground mb-1">{stat.value}</div>
                {stat.change && (
                  <div className="text-xs text-muted-foreground">{stat.change}</div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution Bar Chart */}
          <Card className="p-6 border-border/50 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Category User Distribution
              <span className="text-xs text-muted-foreground ml-2 font-normal">(Click bars for details)</span>
            </h3>
            {categoryDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelFormatter={(label) => {
                      const item = categoryDistributionData.find(d => d.name === label);
                      return item?.fullName || label;
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Expert" 
                    stackId="a" 
                    fill="hsl(var(--chart-1))" 
                    onClick={(data) => handleBarClick(data, 'Expert')}
                    cursor="pointer"
                  />
                  <Bar 
                    dataKey="Intermediate" 
                    stackId="a" 
                    fill="hsl(var(--chart-2))" 
                    onClick={(data) => handleBarClick(data, 'Intermediate')}
                    cursor="pointer"
                  />
                  <Bar 
                    dataKey="Beginner" 
                    stackId="a" 
                    fill="hsl(var(--chart-3))" 
                    onClick={(data) => handleBarClick(data, 'Beginner')}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </Card>

          {/* Overall Classification Distribution Pie Chart */}
          <Card className="p-6 border-border/50 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Overall Skill Classification
              <span className="text-xs text-muted-foreground ml-2 font-normal">(Click segments for details)</span>
            </h3>
            {classificationPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={classificationPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={handlePieClick}
                    cursor="pointer"
                  >
                    {classificationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No classification data
              </div>
            )}
          </Card>

          {/* Top Skills Bar Chart */}
          <Card className="p-6 border-border/50 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Top Skills Coverage
            </h3>
            {topSkillsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSkillsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Coverage']}
                  />
                  <Bar dataKey="percentage" fill="hsl(var(--chart-1))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No skills data
              </div>
            )}
          </Card>

          {/* Category Skills Count */}
          <Card className="p-6 border-border/50 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Skills per Category
            </h3>
            {categoryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={categoryStats.map(cat => ({
                  name: cat.name.length > 15 ? cat.name.substring(0, 15) + '...' : cat.name,
                  fullName: cat.name,
                  skills: cat.skillCount
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelFormatter={(label) => {
                      const item = categoryStats.find(d => 
                        (d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name) === label
                      );
                      return item?.name || label;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="skills" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No category data
              </div>
            )}
          </Card>
        </div>

        {/* Recent Activity */}
        {stats.recentActivity && stats.recentActivity.length > 0 && (
          <Card className="p-6 border-border/50 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Drill Down Modal */}
      <DrillDownModal
        isOpen={!!drillDownData}
        onClose={() => setDrillDownData(null)}
        title={drillDownData?.title || ''}
        users={drillDownData?.users || []}
      />
    </>
  );
};
