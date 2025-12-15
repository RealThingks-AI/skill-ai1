import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings, Mail, Database, Shield, Bell } from "lucide-react";

interface SystemSettingsProps {
  onBack: () => void;
}

export function SystemSettings({ onBack }: SystemSettingsProps) {
  const settingsSections = [
    {
      title: "General Settings",
      description: "Basic application configuration and preferences",
      icon: Settings,
      items: ["Application Name", "Default Language", "Time Zone", "Date Format"]
    },
    {
      title: "Email Configuration", 
      description: "SMTP settings and email templates",
      icon: Mail,
      items: ["SMTP Server", "Email Templates", "Notification Settings", "Delivery Reports"]
    },
    {
      title: "Database Settings",
      description: "Connection settings and backup configuration",
      icon: Database,
      items: ["Connection Pool", "Backup Schedule", "Data Retention", "Performance Tuning"]
    },
    {
      title: "Security Policies",
      description: "Password policies and session management",
      icon: Shield,
      items: ["Password Rules", "Session Timeout", "2FA Settings", "IP Restrictions"]
    },
    {
      title: "Notifications",
      description: "System alerts and user notifications",
      icon: Bell,
      items: ["Alert Channels", "Notification Rules", "Escalation Policies", "Quiet Hours"]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          <p className="text-muted-foreground">
            Configure application settings and system preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {settingsSections.map((section, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800">
                  <section.icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {section.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{item}</span>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
              <Button className="w-full" variant="outline">
                Manage {section.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}