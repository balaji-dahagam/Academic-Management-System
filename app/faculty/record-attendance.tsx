import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { fetchFacultyTimetable, deleteClass } from "../../services/api";

type TimetableEntry = {
  classId: string;
  subject_code: string;
  subject_name: string;
  day: string;
  date: string;
  timeFrame: string;
  batch: 'BTech' | 'MTech';
  semester: number;
  section: string;
  isRegular: boolean;
};

const recordAttendance = () => {
  const router = useRouter();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rawData = await fetchFacultyTimetable();
        
        // Process and sort the data by date (newest first)
        const processedData = rawData
          .map((item : TimetableEntry) => ({
            ...item,
            date: normalizeDate(item.date),
          }))
          .filter((item : TimetableEntry) => item.date) // Remove invalid dates
          .sort((a : TimetableEntry, b : TimetableEntry) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setTimetable(processedData);
      } catch (error) {
        console.error("Error fetching timetable:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const normalizeDate = (date: unknown): string => {
    if (!date) return "";
    
    if (typeof date === 'string') {
      // Handle YYYY-DD-MM format
      const parts = date.split('-');
      if (parts.length === 3) {
        const [year, day, month] = parts;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return date.split('T')[0]; // Fallback for ISO strings
    }
    
    try {
      const dateObj = new Date(date as string);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn("Failed to parse date:", date);
    }
    
    return "";
  };

  const handleDelete = async (classId: string) => {
    try {
      const result = await deleteClass(classId);
      if (result.success) {
        setTimetable(prev => prev.filter(item => item.classId !== classId));
      }
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  // Group classes by date
  const groupedClasses = timetable.reduce((acc, classItem) => {
    const dateKey = classItem.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(classItem);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const getDisplayDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
      
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading classes...</Text>
      </View>
    );
  }

  if (timetable.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No classes scheduled</Text>
      </View>
    );
  }
  
  
  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1 p-4">
        {Object.entries(groupedClasses)
          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
          .map(([date, dateClasses]) => (
            <View key={date} className="mb-6">
              <View className="bg-white p-4 rounded-lg shadow-sm">
                <Text className="text-lg font-semibold text-gray-800">
                  {getDisplayDate(date)}
                </Text>
                
                <View className="mt-2 space-y-3">
                  {dateClasses.map((classItem) => (
                    <TouchableOpacity
                      key={classItem.classId}
                      onPress={() => router.push(
                        `./Attendance_Class/?batch=${classItem.batch}&semester=${classItem.semester}&section=${classItem.section}&classId=${classItem.classId}`
                      )}
                      className="bg-blue-50 p-4 rounded-lg border border-blue-100"
                    >
                      <View className="flex-row justify-between items-start">
                        <View>
                          <Text className="text-lg font-medium text-gray-800">
                            {classItem.subject_name}
                          </Text>
                          <Text className="text-gray-600">
                            {classItem.subject_code}
                          </Text>
                        </View>
                        <View className="bg-blue-100 px-2 py-1 rounded">
                          <Text className="text-blue-800 text-sm">
                            {classItem.timeFrame}
                          </Text>
                        </View>
                      </View>
                      
                      <View className="mt-2 flex-row justify-between">
                        <Text className="text-gray-600">
                          {classItem.batch} Sem {classItem.semester} - {classItem.section}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {classItem.isRegular ? "Regular" : "One-time"}
                        </Text>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(classItem.classId);
                        }}
                        className="absolute top-2 right-2"
                      >
                        <MaterialIcons name="delete" size={20} color="red" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}
      </ScrollView>
    </View>
  );
};

export default recordAttendance;

