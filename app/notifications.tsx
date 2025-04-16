import { View, ScrollView, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { notificationService } from "../services/api";
import moment from "moment";

type Notification = {
  _id: string;
  userId: string;
  userType: "Student" | "Faculty";
  title: string;
  message: string;
  type?: string;
  relatedId?: string;
  seen: boolean;
  createdAt: string | Date;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async (): Promise<void> => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      console.log(data);
      setUnreadCount(data.filter((n : Notification) => !n.seen).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = (): void => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsSeen = async (notificationId: string): Promise<void> => {
    try {
      await notificationService.markAsSeen(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId ? { ...n, seen: true } : n
        )
      );
      setUnreadCount(prev => prev - 1);
    } catch (error) {
      console.error("Failed to mark notification as seen:", error);
    }
  };

  const markAllAsSeen = async (): Promise<void> => {
    try {
      await notificationService.markAllAsSeen();
      setNotifications(prev => prev.map(n => ({ ...n, seen: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all notifications as seen:", error);
    }
  };

  const handleNotificationPress = (notification: Notification): void => {
    if (!notification.seen) {
      markAsSeen(notification._id);
    }
    // Add navigation logic based on notification type if needed
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row justify-between items-center p-4 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#3b82f6" />
        </TouchableOpacity>
        <Text className="text-xl font-semibold text-gray-900">Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsSeen}>
            <Text className="text-blue-500 text-base font-medium">Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View className="flex-1 justify-center items-center pb-32">
          <MaterialIcons name="notifications-off" size={48} color="#9ca3af" />
          <Text className="mt-4 text-lg text-gray-500">No notifications yet</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#3b82f6"]}
            />
          }
          className="flex-1"
        >
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification._id}
              onPress={() => handleNotificationPress(notification)}
              className={`mx-4 my-2 p-4 bg-white rounded-lg shadow-sm ${
                !notification.seen ? "bg-blue-50" : ""
              }`}
            >
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900">
                  {notification.title}
                </Text>
                <Text className="mt-1 text-gray-700">
                  {notification.message}
                </Text>
                <View className="mt-2 flex-row justify-between items-center">
                  <Text className="text-sm text-gray-500">
                    {moment(notification.createdAt).fromNow()}
                  </Text>
                  {!notification.seen && (
                    <View className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}