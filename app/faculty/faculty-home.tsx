import { View, Text, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FacultyHome() {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-gray-100 px-6 py-8">
      {/* Dropdown Icon (Top Right) */}
      <TouchableOpacity 
        onPress={() => setShowMenu(!showMenu)} 
        className="absolute right-6 top-6"
      >
        <MaterialIcons name="more-vert" size={30} color="black" />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {showMenu && (
        <View className="absolute right-6 top-14 bg-white shadow-lg rounded-lg" style={{ zIndex: 10, elevation: 10 }}>
          <TouchableOpacity 
            onPress={handleLogout} 
            className="px-4 py-2 bg-red-500 rounded-lg"
          >
            <Text className="text-white text-lg">Log Out</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text className="text-3xl font-bold text-gray-800 mt-16">Welcome, Faculty 👨‍🏫</Text>

      {/* Create Class Button */}

      <TouchableOpacity 
        className="bg-blue-500 p-4 rounded-lg mt-6"
        onPress={() => router.push("/faculty/create-class")}
      >
        <Text className="text-white text-center text-lg font-semibold">➕ Create a Class</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        className="bg-blue-500 p-4 rounded-lg mt-6"
        onPress={() => router.push("/faculty/create-class")}
      >
        <Text className="text-white text-center text-lg font-semibold">➕ Create an Class of elective</Text>
      </TouchableOpacity>
      {/* View Timetable Button - Updated with navigation */}
      <TouchableOpacity 
        className="bg-green-500 p-4 rounded-lg mt-4"
        onPress={() => router.push("/faculty/faculty-timetable")}
      >
        <Text className="text-white text-center text-lg font-semibold">📅 View Time Table</Text>
      </TouchableOpacity>

      {/* Record Attendance Button */}
      <TouchableOpacity className="bg-red-500 p-4 rounded-lg mt-4" onPress={() => router.push("/faculty/record-attendance")}>
        <Text className="text-white text-center text-lg font-semibold">📝 Record Attendance</Text>
      </TouchableOpacity>
      <TouchableOpacity className="bg-red-500 p-4 rounded-lg mt-4" onPress={() => router.push("/faculty/stu-tt")}>
        <Text className="text-white text-center text-lg font-semibold">📅👨‍🎓 View Student Timetable</Text>
      </TouchableOpacity>
    </View>
  );
}