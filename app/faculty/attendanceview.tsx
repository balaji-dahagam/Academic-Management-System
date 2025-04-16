// components/AttendanceViewer.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { fetchAttendance } from "../../services/api";
import { useLocalSearchParams } from "expo-router";

type StudentRecord = {
  roll: string;
  present: boolean;
};

const AttendanceViewer = () => {
  const [attendanceData, setAttendanceData] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { classId } = useLocalSearchParams();

  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const data = await fetchAttendance(classId as string);
        
        if (data) {
          // Convert to array of { roll, present } objects
          const presentRecords = data.presentStudents.map((roll: string) => ({
            roll,
            present: true
          }));
          
          const absentRecords = data.absentStudents.map((roll: string) => ({
            roll,
            present: false
          }));

          setAttendanceData([...presentRecords, ...absentRecords]);
        }
      } catch (error) {
        console.error("Error loading attendance:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadAttendance();
  }, [classId]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ScrollView className="p-4 bg-white">
      <Text className="text-xl font-bold mb-4 text-center">Attendance Record</Text>
      
      {/* Summary Stats */}
      <View className="flex-row justify-between mb-4">
        <Text className="text-green-600 font-semibold">
          Present: {attendanceData.filter(s => s.present).length}
        </Text>
        <Text className="text-red-600 font-semibold">
          Absent: {attendanceData.filter(s => !s.present).length}
        </Text>
      </View>

      {/* Student List */}
      {attendanceData.length > 0 ? (
        attendanceData.map((student, index) => (
          <View 
            key={`${student.roll}-${index}`} 
            className="flex-row justify-between items-center border-b border-gray-200 py-3"
          >
            <Text className="text-gray-800 flex-1">{student.roll}</Text>
            <Text 
              className={`font-semibold w-1/4 text-right ${
                student.present ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {student.present ? 'Present ✓' : 'Absent ✗'}
            </Text>
          </View>
        ))
      ) : (
        <Text className="text-gray-500 text-center mt-8">
          No attendance records found
        </Text>
      )}
    </ScrollView>
  );
};

export default AttendanceViewer;