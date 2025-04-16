import React, { useState, useEffect } from "react";
import { View, ScrollView, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { fetchStudentsBySection, fetchAttendance, markAttendance } from "../../services/api";
import { ListItem, CheckBox, Button, Text } from "react-native-elements";

type Student = {
  rollno: string;
  name: string;
};

const AttendanceClass = () => {
  const { batch, semester, section, classId } = useLocalSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [presentRolls, setPresentRolls] = useState<string[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!section) return;
      try {
        setLoading(true);
        const studentData = await fetchStudentsBySection(batch as string, Number(semester), section as string);
        setStudents(studentData);

        // Fetch previous attendance for today
        const attendanceData = await fetchAttendance(classId as string);
        setPresentRolls(attendanceData?.presentStudents || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [batch, semester, section, classId]);

  // Toggle Attendance Mark
  const toggleAttendance = (rollno: string) => {
    setPresentRolls((prev) =>
      prev.includes(rollno) ? prev.filter((r) => r !== rollno) : [...prev, rollno]
    );
  };

  // Submit Attendance
  const handleSubmit = async () => {
    if (!classId) {
      Alert.alert("Error", "Class ID is missing.");
      return;
    }

    try {
      await markAttendance(classId as string, presentRolls);
      Alert.alert("Success", "Attendance updated successfully!");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: "#f5f5f5" }}>
      <Text h4 style={{ textAlign: "center", marginBottom: 10 }}>
        Students - {section} (Sem {semester})
      </Text>

      {loading ? (
        <Text style={{ textAlign: "center" }}>Loading students...</Text>
      ) : (
        <ScrollView>
          {students.length > 0 ? (
            students.map((student) => (
              <ListItem key={student.rollno} bottomDivider>
                <ListItem.Content>
                  <ListItem.Title>{student.name}</ListItem.Title>
                  <ListItem.Subtitle>Roll No: {student.rollno}</ListItem.Subtitle>
                </ListItem.Content>
                <CheckBox
                  checked={presentRolls.includes(student.rollno)}
                  onPress={() => toggleAttendance(student.rollno)}
                  checkedColor="green"
                  containerStyle={{ margin: 0, padding: 0 }}
                />
              </ListItem>
            ))
          ) : (
            <Text style={{ textAlign: "center", marginTop: 10 }}>No students found.</Text>
          )}
        </ScrollView>
      )}

      <Button
        title="Save Attendance"
        onPress={handleSubmit}
        containerStyle={{ marginVertical: 15 }}
        buttonStyle={{ backgroundColor: "#007bff" }}
      />
    </View>
  );
};

export default AttendanceClass;
