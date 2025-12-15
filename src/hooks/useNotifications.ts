import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  performed_by: string | null;
  related_record_id?: string | null;
  related_record_type?: string | null;
  related_record_route?: string | null;
}

interface NotificationWithPerformer extends Notification {
  performer?: {
    full_name: string;
    email: string;
  } | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationWithPerformer[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useAuth();
  const prevCountRef = useRef(0);

  const loadNotifications = useCallback(async () => {
    if (!profile?.user_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch notifications
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        throw error;
      }

      console.log(`📬 Loaded ${notificationsData?.length || 0} notifications`);

      // Fetch performer details for all notifications
      const performerIds = [...new Set(
        notificationsData
          ?.filter(n => n.performed_by)
          .map(n => n.performed_by) || []
      )];

      const performersMap = new Map();
      if (performerIds.length > 0) {
        const { data: performers } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', performerIds);

        performers?.forEach(p => {
          performersMap.set(p.user_id, { full_name: p.full_name, email: p.email });
        });
      }

      // Attach performer data
      const notificationsWithPerformers = (notificationsData || []).map(notification => ({
        ...notification,
        performer: notification.performed_by ? performersMap.get(notification.performed_by) : null
      })) as NotificationWithPerformer[];

      const unread = notificationsWithPerformers.filter(n => !n.read).length;
      console.log(`✅ Unread: ${unread} / Total: ${notificationsWithPerformers.length}`);

      setNotifications(notificationsWithPerformers);
      setUnreadCount(unread);
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.user_id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      // Update local state immediately
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      console.log(`✅ Marked notification ${notificationId} as read`);
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      throw error;
    }
  }, [profile?.user_id]);

  const markAsUnread = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: false })
        .eq('id', notificationId)
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      // Update local state immediately
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: false } : n)
      );
      setUnreadCount(prev => prev + 1);

      console.log(`✅ Marked notification ${notificationId} as unread`);
    } catch (error) {
      console.error('❌ Error marking as unread:', error);
      throw error;
    }
  }, [profile?.user_id]);

  const markAllAsRead = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', profile.user_id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      console.log(`✅ Marked all notifications as read`);
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      throw error;
    }
  }, [profile?.user_id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      console.log(`✅ Deleted notification ${notificationId}`);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw error;
    }
  }, [notifications, profile?.user_id]);

  useEffect(() => {
    if (!profile?.user_id) return;

    console.log('🔄 Initializing notifications for user:', profile.user_id);
    loadNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.user_id}`
        },
        (payload) => {
          console.log('🔔 Real-time update:', payload.eventType);
          
          // Show toast for new notifications
          if (payload.eventType === 'INSERT' && payload.new) {
            const newNotification = payload.new as Notification;
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
          
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id, loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: loadNotifications,
  };
}
