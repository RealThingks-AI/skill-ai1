import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, Area, AreaChart } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { SkillCategory, Skill, Subskill } from "@/types/database";

interface SkillsGraphicalViewProps {
  categories: SkillCategory[];
  skills: Skill[];
  subskills: Subskill[];
  allEmployeeRatings: any[];
}

interface DrillDownData {
  categoryName: string;
  users: {
    name: string;
    rating: string;
    skillName: string;
  }[];
}

export const SkillsGraphicalView = ({
  categories,
  skills,
  subskills,
  allEmployeeRatings
}: SkillsGraphicalViewProps) => {
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);
  
  // Prepare data for bar chart - unique users per category per rating level
  const categoryData = categories.map(category => {
    const categorySkills = skills.filter(s => s.category_id === category.id);
    
    const highUsers = new Set<string>();
    const mediumUsers = new Set<string>();
    const lowUsers = new Set<string>();
    const pendingUsers = new Set<string>();
    
    categorySkills.forEach(skill => {
      const skillSubskills = subskills.filter(ss => ss.skill_id === skill.id);
      
      if (skillSubskills.length > 0) {
        skillSubskills.forEach(subskill => {
          allEmployeeRatings
            .filter(r => r.subskill_id === subskill.id && r.status === 'approved')
            .forEach(r => {
              if (r.rating === 'high') highUsers.add(r.user_id);
              else if (r.rating === 'medium') mediumUsers.add(r.user_id);
              else if (r.rating === 'low') lowUsers.add(r.user_id);
            });
          
          allEmployeeRatings
            .filter(r => r.subskill_id === subskill.id && r.status === 'submitted')
            .forEach(r => pendingUsers.add(r.user_id));
        });
      } else {
        allEmployeeRatings
          .filter(r => r.skill_id === skill.id && !r.subskill_id && r.status === 'approved')
          .forEach(r => {
            if (r.rating === 'high') highUsers.add(r.user_id);
            else if (r.rating === 'medium') mediumUsers.add(r.user_id);
            else if (r.rating === 'low') lowUsers.add(r.user_id);
          });
        
        allEmployeeRatings
          .filter(r => r.skill_id === skill.id && !r.subskill_id && r.status === 'submitted')
          .forEach(r => pendingUsers.add(r.user_id));
      }
    });
    
    return {
      name: category.name.length > 15 ? category.name.substring(0, 15) + '...' : category.name,
      fullName: category.name,
      High: highUsers.size,
      Medium: mediumUsers.size,
      Low: lowUsers.size,
      Pending: pendingUsers.size
    };
  }).sort((a, b) => (b.High + b.Medium + b.Low + b.Pending) - (a.High + a.Medium + a.Low + a.Pending));
  
  // Prepare radar chart data - top 6 categories
  const radarData = categoryData.slice(0, 6).map(cat => ({
    category: cat.name,
    High: cat.High,
    Medium: cat.Medium,
    Low: cat.Low
  }));
  
  // Prepare trend data - aggregate by rating level
  const trendData = [
    { name: 'High', users: categoryData.reduce((sum, cat) => sum + cat.High, 0) },
    { name: 'Medium', users: categoryData.reduce((sum, cat) => sum + cat.Medium, 0) },
    { name: 'Low', users: categoryData.reduce((sum, cat) => sum + cat.Low, 0) },
    { name: 'Pending', users: categoryData.reduce((sum, cat) => sum + cat.Pending, 0) }
  ];
  
  const handleBarClick = (data: any, ratingLevel: string) => {
    const category = categories.find(c => c.name === data.fullName);
    if (!category) return;
    
    const categorySkills = skills.filter(s => s.category_id === category.id);
    const users: { name: string; rating: string; skillName: string }[] = [];
    
    categorySkills.forEach(skill => {
      const skillSubskills = subskills.filter(ss => ss.skill_id === skill.id);
      
      if (skillSubskills.length > 0) {
        skillSubskills.forEach(subskill => {
          allEmployeeRatings
            .filter(r => {
              const matchesRating = ratingLevel === 'Pending' 
                ? r.status === 'submitted'
                : r.status === 'approved' && r.rating === ratingLevel.toLowerCase();
              return r.subskill_id === subskill.id && matchesRating;
            })
            .forEach(r => {
              users.push({
                name: r.profiles?.full_name || 'Unknown',
                rating: ratingLevel,
                skillName: `${skill.name} - ${subskill.name}`
              });
            });
        });
      } else {
        allEmployeeRatings
          .filter(r => {
            const matchesRating = ratingLevel === 'Pending'
              ? r.status === 'submitted'
              : r.status === 'approved' && r.rating === ratingLevel.toLowerCase();
            return r.skill_id === skill.id && !r.subskill_id && matchesRating;
          })
          .forEach(r => {
            users.push({
              name: r.profiles?.full_name || 'Unknown',
              rating: ratingLevel,
              skillName: skill.name
            });
          });
      }
    });
    
    setDrillDownData({
      categoryName: category.name,
      users
    });
  };
  
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Main Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Users per Category by Rating Level (Click bars to view details)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={categoryData}
                margin={{ top: 10, right: 20, left: 10, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  formatter={(value: any) => [`${value} users`, '']}
                  labelFormatter={(label: string) => {
                    const item = categoryData.find(d => d.name === label);
                    return item?.fullName || label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar 
                  dataKey="High" 
                  fill="hsl(var(--chart-1))" 
                  onClick={(data) => handleBarClick(data, 'High')}
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="Medium" 
                  fill="hsl(var(--chart-2))" 
                  onClick={(data) => handleBarClick(data, 'Medium')}
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="Low" 
                  fill="hsl(var(--chart-3))" 
                  onClick={(data) => handleBarClick(data, 'Low')}
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="Pending" 
                  fill="hsl(var(--chart-4))" 
                  onClick={(data) => handleBarClick(data, 'Pending')}
                  cursor="pointer"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Distribution Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Rating Level Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart - Top Categories */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top 6 Categories Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <Radar name="High" dataKey="High" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
                <Radar name="Medium" dataKey="Medium" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
                <Radar name="Low" dataKey="Low" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.6} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={!!drillDownData} onOpenChange={() => setDrillDownData(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {drillDownData?.categoryName} - {drillDownData?.users[0]?.rating} Level Users
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {drillDownData?.users.map((user, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.skillName}</p>
                </div>
                <Badge 
                  variant={
                    user.rating === 'High' ? 'default' : 
                    user.rating === 'Medium' ? 'secondary' : 
                    user.rating === 'Low' ? 'outline' : 
                    'destructive'
                  }
                >
                  {user.rating}
                </Badge>
              </div>
            ))}
            {drillDownData?.users.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No users found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
