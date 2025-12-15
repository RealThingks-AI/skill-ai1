import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, X, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { cn } from "@/lib/utils";

const notificationTypeConfig = {
  info: { color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Bell },
  success: { color: "bg-green-500/10 text-green-700 border-green-500/20", icon: CheckCheck },
  warning: { color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20", icon: Bell },
  approval: { color: "bg-green-500/10 text-green-700 border-green-500/20", icon: Check },
  rejection: { color: "bg-red-500/10 text-red-700 border-red-500/20", icon: X },
  assignment: { color: "bg-purple-500/10 text-purple-700 border-purple-500/20", icon: Bell },
  update: { color: "bg-blue-500/10 text-blue-700 border-blue-500/20", icon: Bell },
};

export default function Notifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.read)
    : notifications;

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      toast({ title: "Marked as read" });
    } catch (error) {
      toast({ title: "Failed to mark as read", variant: "destructive" });
    }
  };

  const handleMarkAsUnread = async (id: string) => {
    try {
      await markAsUnread(id);
      toast({ title: "Marked as unread" });
    } catch (error) {
      toast({ title: "Failed to mark as unread", variant: "destructive" });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({ title: "All notifications marked as read" });
    } catch (error) {
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      toast({ title: "Notification deleted" });
    } catch (error) {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    }
  };

  const handleViewRecord = async (notification: any) => {
    // Mark as read when viewing
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to the related record
    if (notification.related_record_route) {
      navigate(notification.related_record_route);
    }
  };

  if (isLoading) {
    return <LoadingSpinner showText />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border bg-background">
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="gap-2">
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")} className="h-full flex flex-col">
          <div className="px-2 sm:px-4 border-b bg-muted/30 flex-shrink-0">
            <TabsList>
              <TabsTrigger value="all">
                All
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={filter} className="flex-1 overflow-auto p-4 space-y-3 mt-0">
            {filteredNotifications.length === 0 ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-3">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium">
                    {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {filter === "unread"
                      ? "All caught up! You have no unread notifications."
                      : "You'll see notifications here when you have updates"}
                  </p>
                </div>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const config = notificationTypeConfig[notification.type as keyof typeof notificationTypeConfig] || notificationTypeConfig.info;
                const Icon = config.icon;

                return (
                  <Card
                    key={notification.id}
                    className={cn(
                      "transition-all hover:shadow-md",
                      !notification.read && "border-l-4 border-l-primary bg-accent/5"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-2 rounded-lg border", config.color)}>
                          <Icon className="w-5 h-5" />
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-base">
                                {notification.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {notification.message}
                              </p>
                            </div>

                            {!notification.read && (
                              <Badge variant="destructive" className="shrink-0">
                                New
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                            {notification.performer && (
                              <span>• by {notification.performer.full_name}</span>
                            )}
                          </div>

                          {notification.related_record_route && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewRecord(notification)}
                              className="mt-2 gap-2"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Related Record
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {notification.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsUnread(notification.id)}
                              title="Mark as unread"
                            >
                              <Bell className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notification.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
