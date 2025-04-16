import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Text, Dimensions } from "react-native";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as ScreenOrientation from "expo-screen-orientation";
import { fetchFacultyTimetable, deleteClass,fetchAttendance } from "../../services/api";

const { width } = Dimensions.get('window');

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

type ApiTimetableEntry = {
  classId: string;
  subject_code: string;
  subject_name: string;
  day: string;
  date: unknown;
  timeFrame: string;
  batch: 'BTech' | 'MTech';
  semester: number;
  section: string;
  isRegular: boolean;
};

const AnimatedView = Animated.createAnimatedComponent(View);


const Timetable = () => {
  const router=useRouter();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const timeSlots = [
    "9:00-9:55", "10:00-10:55", "11:00-11:55",
    "12:00-12:55", "13:00-13:55", "14:00-14:55",
    "15:00-15:55", "16:00-16:55"
  ];

  const getMondayOfWeek = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    return monday;
  };

  const generateWeekDates = (): string[] => {
    const monday = getMondayOfWeek(new Date(currentWeekStart));
    return Array.from({ length: 6 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  };
  

  const handleDelete = async (classId: string) => {
    try {
      const result = await deleteClass(classId);
      if (result.success) {
        setTimetable((prevTimetable) => prevTimetable.filter((item) => item.classId !== classId));
        console.log("Class deleted successfully:", classId);
      } else {
        console.error("Failed to delete class:", result.error);
      }
    } catch (error) {
      console.error("Error deleting class:", error);
    }
  };

  const [weekDates, setWeekDates] = useState<string[]>(generateWeekDates());

  useEffect(() => {
    setWeekDates(generateWeekDates());
  }, [currentWeekStart]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rawData: ApiTimetableEntry[] = await fetchFacultyTimetable();
        
        const processedData = rawData
          .map((item: ApiTimetableEntry) => {
            const normalizedDate = normalizeDate(item.date);
            if (!normalizedDate) {
              console.warn("Skipping item with invalid date:", item);
              return null;
            }
            return {
              classId: item.classId,
              subject_code: item.subject_code,
              subject_name: item.subject_name,
              day: item.day,
              date: normalizedDate,
              timeFrame: item.timeFrame,
              batch: item.batch,
              semester: item.semester,
              section: item.section,
              isRegular: item.isRegular
            };
          })
          .filter((item): item is TimetableEntry => item !== null)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setTimetable(processedData);
      } catch (error) {
        console.error("Error fetching timetable:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleOrientation = async () => {
      try {
        await ScreenOrientation.unlockAsync();
      } catch (error) {
        console.log("Orientation not supported:", error);
      }
    };
    handleOrientation();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
        .catch(console.log);
    };
  }, []);

  const handlePinch = ({ nativeEvent }: { nativeEvent: { state: number; scale: number } }) => {
    if (nativeEvent.state === State.ACTIVE) {
      scale.value = savedScale.value * nativeEvent.scale;
    }
    if (nativeEvent.state === State.END) {
      savedScale.value = scale.value;
      scale.value = withTiming(Math.max(1, Math.min(3, scale.value)));
      savedScale.value = scale.value;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const prevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

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

  // Group classes by date for list view
  const groupedClasses = timetable.reduce((acc, classItem) => {
    const dateKey = classItem.date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(classItem);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const renderListView = () => (
    <ScrollView className="flex-1 p-4 bg-gray-50">
      {Object.entries(groupedClasses)
        .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
        .map(([date, dateClasses]) => (
          <View key={date} className="mb-6">
            <View className="bg-white p-4 rounded-lg shadow-sm">
              <Text className="text-lg font-semibold text-gray-800">
                {getDisplayDate(date)} ({dateClasses[0].day})
              </Text>
              
              <View className="mt-2 space-y-3">
                {dateClasses.map((classItem) => (
                  <View
                    key={classItem.classId}
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
                      onPress={() => {console.log(classItem.classId);router.push({pathname:"./attendanceview",params :{classId :classItem.classId}})}}
                      className="bg-green-500 px-3 py-1 rounded-md"
                    >
                      <Text className="text-white">View Attendance</Text>
                    </TouchableOpacity>
                    
                    
                    <TouchableOpacity 
                      onPress={() => handleDelete(classItem.classId)}
                      className="absolute top-2 right-2"
                    >
                      <MaterialIcons name="delete" size={20} color="red" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
    </ScrollView>
  );

  const renderGridView = () => (
    <View className="flex-1">
      <PinchGestureHandler
        onGestureEvent={handlePinch}
        onHandlerStateChange={handlePinch}
      >
        <AnimatedView className="flex-1">
          <ScrollView className="flex-1">
            <ScrollView 
              horizontal 
              contentContainerStyle={{ flexGrow: 1 }}
              showsHorizontalScrollIndicator={true}
            >
              <AnimatedView style={[animatedStyle, { minWidth: width }]}>
                <View className="bg-blue-200 border border-blue-300">
                  {/* Header row */}
                  <View className="flex-row">
                    <View className="w-24 border-r border-blue-300">
                      <Text className="p-2 text-center font-bold">Day/Date</Text>
                    </View>
                    {timeSlots.map((time) => (
                      <View key={time} className="w-28 border-r border-blue-300">
                        <Text className="p-2 text-center font-bold">{time}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Data rows */}
                  {weekDates.map((date, i) => (
                    <View key={date} className="flex-row border-t border-gray-200">
                      <View className="w-24 border-r border-gray-200">
                        <Text className="p-2 text-center font-semibold">
                          {days[i]} ({date})
                        </Text>
                      </View>
                      
                      {/* Render time slots for this day */}
                      {timeSlots.map((time, timeIndex) => {
                        // Check if this is part of a long class
                        const isLongClassAM = timeIndex < 3 && timetable.some(
                          cls => cls.date === date && cls.timeFrame === "9:00-11:55"
                        );
                        const isLongClassPM = timeIndex >= 5 && timeIndex < 8 && timetable.some(
                          cls => cls.date === date && cls.timeFrame === "14:00-16:55"
                        );

                        // Skip rendering if this is part of a long class but not the first slot
                        if ((isLongClassAM && timeIndex > 0) || (isLongClassPM && timeIndex > 5)) {
                          return null;
                        }

                        // Find the class for this slot
                        const classItem = timetable.find(cls => 
                          cls.date === date && (
                            cls.timeFrame === time ||
                            (isLongClassAM && cls.timeFrame === "9:00-11:55") ||
                            (isLongClassPM && cls.timeFrame === "14:00-16:55")
                          )
                        );

                        // Calculate span for long classes
                        const span = isLongClassAM ? 3 : isLongClassPM ? 3 : 1;

                        return (
                          <View 
                            key={`${date}-${time}`}
                            className={`${span === 3 ? 'w-[335]' : 'w-28'} border-r border-gray-200`}
                            style={{
                              borderBottomWidth: (isLongClassAM && timeIndex < 2) || (isLongClassPM && timeIndex < 7) ? 0 : 1,
                              borderTopWidth: (isLongClassAM && timeIndex > 0) || (isLongClassPM && timeIndex > 5) ? 0 : 1
                            }}
                          >
                            <Text className="p-2 text-center">
                              {classItem?.subject_code || "-"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </AnimatedView>
            </ScrollView>
          </ScrollView>
        </AnimatedView>
      </PinchGestureHandler>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading timetable...</Text>
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
    <View className="flex-1 bg-gray-100">
      <View className="flex-row justify-between items-center px-4 mb-2 pt-10">
        <Text className="text-xl font-bold text-blue-600">Timetable</Text>
        <TouchableOpacity 
          onPress={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
          className="bg-blue-500 px-3 py-1 rounded-md"
        >
          <Text className="text-white">
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'grid' && (
        <View className="flex-row justify-between items-center bg-blue-500 px-4 py-2 rounded-md mx-4 mb-4">
          <TouchableOpacity onPress={prevWeek} className="bg-blue-700 px-3 py-2 rounded-md">
            <Text className="text-white font-semibold">Previous</Text>
          </TouchableOpacity>
          <Text className="text-white font-semibold">{weekDates[0]} to {weekDates[5]}</Text>
          <TouchableOpacity onPress={nextWeek} className="bg-blue-700 px-3 py-2 rounded-md">
            <Text className="text-white font-semibold">Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'grid' ? renderGridView() : renderListView()}
    </View>
  );
};

export default Timetable;