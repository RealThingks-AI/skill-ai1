import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Lock, Database, FileText, RefreshCw } from "lucide-react";
import UserAccess from "./user-access";
import { PageAccess } from "./components/PageAccess";
import Backup from "./components/Backup";
import Logs from "./components/Logs";
import { DataSync } from "./components/DataSync";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User & Access
            </TabsTrigger>
            <TabsTrigger value="page-access" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Page Access
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Backup
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Data Sync
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="flex-1 overflow-hidden mt-0">
          <UserAccess onBack={() => {}} />
        </TabsContent>

        <TabsContent value="page-access" className="flex-1 overflow-hidden mt-0">
          <PageAccess />
        </TabsContent>

        <TabsContent value="backup" className="flex-1 overflow-hidden mt-0">
          <Backup onBack={() => setActiveTab("users")} />
        </TabsContent>

        <TabsContent value="logs" className="flex-1 overflow-hidden mt-0">
          <Logs onBack={() => setActiveTab("users")} />
        </TabsContent>

        <TabsContent value="sync" className="flex-1 overflow-hidden mt-0">
          <DataSync />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;