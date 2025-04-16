import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity, Text, Dimensions } from "react-native";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as ScreenOrientation from "expo-screen-orientation";
import { fetchStudentTimetable } from "../../services/api";

const { width, height } = Dimensions.get('window');

type TimetableEntry = {
  classId: string;
  subject_code: string;
  day: string;
  date: string;
  timeFrame: string;
};

type ApiTimetableEntry = {
  classId: string;
  subject_code: string;
  day: string;
  date: unknown;
  timeFrame: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

const Timetable = () => {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  
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

  const normalizeDate = (date: unknown): string => {
    if (!date) return "";
    
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
      return date.split('T')[0];
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

  const [weekDates, setWeekDates] = useState<string[]>(generateWeekDates());

  useEffect(() => {
    setWeekDates(generateWeekDates());
  }, [currentWeekStart]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rawData: ApiTimetableEntry[] = await fetchStudentTimetable();
        
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
              day: item.day,
              date: normalizedDate,
              timeFrame: item.timeFrame
            };
          })
          .filter((item): item is TimetableEntry => item !== null);
        
        setTimetable(processedData);
      } catch (error) {
        console.error("Error fetching timetable:", error);
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
      scale.value = withTiming(Math.max(1, Math.min(3, scale.value)), {
        duration: 200
      });
      savedScale.value = scale.value;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      width: width * scale.value,
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

  return (
    <View className="flex-1 bg-gray-100" style={{ paddingTop: height * 0.05 }}>
      <View className="flex-row justify-between items-center px-4 mb-2">
        <Text className="text-xl font-bold text-blue-600">Student Timetable</Text>
      </View>

      <View className="flex-row justify-between items-center bg-blue-500 px-4 py-2 rounded-md mx-4 mb-4">
        <TouchableOpacity 
          onPress={prevWeek} 
          className="bg-blue-700 px-3 py-2 rounded-md"
        >
          <Text className="text-white font-semibold">Previous</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-center mx-2">
          {weekDates[0]} to {weekDates[5]}
        </Text>
        <TouchableOpacity 
          onPress={nextWeek} 
          className="bg-blue-700 px-3 py-2 rounded-md"
        >
          <Text className="text-white font-semibold">Next</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        <PinchGestureHandler
          onGestureEvent={handlePinch}
          onHandlerStateChange={handlePinch}
        >
          <AnimatedView className="flex-1">
            <ScrollView 
              horizontal 
              contentContainerStyle={{ flexGrow: 1 }}
              showsHorizontalScrollIndicator={true}
            >
              <AnimatedView style={[animatedStyle]}>
                <ScrollView className="flex-1">
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
                </ScrollView>
              </AnimatedView>
            </ScrollView>
          </AnimatedView>
        </PinchGestureHandler>
      </View>
    </View>
  );
};

export default Timetable;