import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, CheckCircle, Database, Shield, Settings, Briefcase, BarChart, AlertCircle, Eye, UserCog, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivityLogs } from "../hooks/useActivityLogs";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { dateFormatters } from "@/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { textFormatters } from "@/utils/formatters";
import LogDetailModal from "./LogDetailModal";

const MODULE_ICONS = {
  "All": Filter,
  "Approvals & Rejections": CheckCircle,
  "Auth": Shield,
  "Backup & Restore": Database,
  "Profile & Password Updates": UserCog,
  "Projects": Briefcase,
  "Reports": BarChart,
  "Settings": Settings,
};

const MODULE_COLORS = {
  "All": "bg-primary/10 text-primary border-primary/20",
  "Approvals & Rejections": "bg-green-500/10 text-green-500 border-green-500/20",
  "Auth": "bg-red-500/10 text-red-500 border-red-500/20",
  "Backup & Restore": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Profile & Password Updates": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Projects": "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  "Reports": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Settings": "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

interface LogsProps {
  onBack: () => void;
}

export default function Logs({ onBack }: LogsProps) {
  const [selectedModule, setSelectedModule] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<'last7days' | 'last1month' | 'last3months' | 'last6months'>('last7days');
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 30;

  const { logs, isLoading, error, users, totalCount, refetch } = useActivityLogs({
    module: selectedModule === "All" ? undefined : selectedModule,
    searchQuery,
    dateRange,
    userId: selectedUser === "all" ? undefined : selectedUser,
    page: currentPage,
    pageSize,
    sortBy,
    sortOrder,
  });

  const modules = Object.keys(MODULE_ICONS).filter(m => m !== "Users").sort();

  const handleModuleClick = (module: string) => {
    setSelectedModule(module);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSelectedModule("All");
    setSearchQuery("");
    setDateRange('last7days');
    setSelectedUser("all");
    setCurrentPage(1);
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    return textFormatters.truncate(text, maxLength);
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Activity Logs</h2>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      {/* Compact Module Categories */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-1.5">
        {modules.map((module) => {
          const Icon = MODULE_ICONS[module as keyof typeof MODULE_ICONS];
          const colorClass = MODULE_COLORS[module as keyof typeof MODULE_COLORS];
          return (
            <Card
              key={module}
              className={`cursor-pointer transition-all hover:shadow-sm ${
                selectedModule === module ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleModuleClick(module)}
            >
              <CardContent className="p-2 flex flex-col items-center justify-center space-y-1">
                <div className={`p-1.5 rounded-md ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-medium text-center">{module}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Compact Filters */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div>
              <Select value={dateRange} onValueChange={(value: any) => {
                setDateRange(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 days</SelectItem>
                  <SelectItem value="last1month">Last 1 month</SelectItem>
                  <SelectItem value="last3months">Last 3 months</SelectItem>
                  <SelectItem value="last6months">Last 6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedUser} onValueChange={(value) => {
                setSelectedUser(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-64">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Unable to load logs. Try again.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-sm text-muted-foreground">No logs found for the selected period.</p>
            </div>
          ) : (
            <Table className="w-full">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead 
                    className="text-xs cursor-pointer hover:bg-muted/50 w-[180px]"
                    onClick={() => handleSort('module')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Category</span>
                      <span className="w-3 inline-block text-center"><SortIcon column="module" /></span>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs cursor-pointer hover:bg-muted/50 w-[140px]"
                    onClick={() => handleSort('action_type')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Action</span>
                      <span className="w-3 inline-block text-center"><SortIcon column="action_type" /></span>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs cursor-pointer hover:bg-muted/50 w-[160px]"
                    onClick={() => handleSort('username')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Performed By</span>
                      <span className="w-3 inline-block text-center"><SortIcon column="username" /></span>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs cursor-pointer hover:bg-muted/50 w-[160px]"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Timestamp</span>
                      <span className="w-3 inline-block text-center"><SortIcon column="created_at" /></span>
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Details</span>
                      <span className="w-3 inline-block text-center"><SortIcon column="description" /></span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="py-2 text-xs">
                        {log.module}
                      </TableCell>
                      <TableCell className="py-2 text-xs font-medium">{log.action_type}</TableCell>
                      <TableCell className="py-2 text-xs">{log.username}</TableCell>
                       <TableCell className="py-2 text-xs text-muted-foreground">
                        {dateFormatters.formatDateTimeCompact(log.created_at)}
                      </TableCell>
                      <TableCell className="py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="flex-1">{truncateText(log.description, 60)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Compact Pagination */}
      {!isLoading && !error && logs.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Log Detail Modal */}
      <LogDetailModal
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        log={selectedLog}
      />
    </div>
  );
}
