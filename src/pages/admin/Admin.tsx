import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserAccess from "./user-access";
import Backup from "./components/Backup";
import { Users, Wrench, Database } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { USER_ROLES } from "@/utils/constants";

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [userCounts, setUserCounts] = useState({
    employees: 0,
    techLeads: 0,
    management: 0
  });

  useEffect(() => {
    const fetchUserCounts = async () => {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('role');

        if (profiles) {
          const counts = profiles.reduce((acc, profile) => {
            if (profile.role === USER_ROLES.EMPLOYEE) acc.employees++;
            else if (profile.role === USER_ROLES.TECH_LEAD) acc.techLeads++;
            else if (profile.role === USER_ROLES.MANAGEMENT) acc.management++;
            return acc;
          }, { employees: 0, techLeads: 0, management: 0 });

          setUserCounts(counts);
        }
      } catch (error) {
        console.error('Error fetching user counts:', error);
      }
    };

    fetchUserCounts();
  }, []);

  const userStats = [
    { 
      title: "Employees", 
      value: userCounts.employees.toString(), 
      icon: Users, 
      color: "text-blue-600" 
    },
    { 
      title: "Tech Leads", 
      value: userCounts.techLeads.toString(), 
      icon: Users, 
      color: "text-green-600" 
    },
    { 
      title: "Management", 
      value: userCounts.management.toString(), 
      icon: Users, 
      color: "text-purple-600" 
    }
  ];

  const adminSections = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: Users
    },
    {
      id: 'skills',
      title: 'Skills Management',
      description: 'Manage skills and competencies',
      icon: Wrench
    },
    {
      id: 'backup',
      title: 'Backup & Restore',
      description: 'Export and import application data',
      icon: Database
    }
  ];

  if (activeTab === 'users') {
    return <UserAccess onBack={() => setActiveTab('overview')} />;
  }

  if (activeTab === 'skills') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('overview')}
          >
            ← Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Skills Management</h1>
            <p className="text-muted-foreground">
              Manage skills and competencies (functionality coming soon)
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Skills management functionality will be added here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activeTab === 'backup') {
    return <Backup onBack={() => setActiveTab('overview')} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Administration</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">

        {/* User Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {userStats.map((stat, index) => (
            <Card key={index} className="border-slate-200 dark:border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium font-sans text-slate-700 dark:text-slate-300">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-sans text-slate-800 dark:text-slate-200">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold font-sans text-slate-800 dark:text-slate-200">
            Quick Actions
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {adminSections.map(section => (
              <Card 
                key={section.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 dark:border-slate-700"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                      <section.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-sans font-semibold text-slate-800 dark:text-slate-200">
                        {section.title}
                      </CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-sans mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    onClick={() => setActiveTab(section.id)} 
                    size="sm" 
                    className="w-full font-sans"
                  >
                    Open {section.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;