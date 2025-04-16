import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ Store role locally
import { loginStudent, loginFaculty } from "../services/api";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      let response;
      if (role === "student") {
        response = await loginStudent({ email, password });
      } else {
        response = await loginFaculty({ email, password });
      }

      console.log("Login successful:", response);
      alert("Login Successful!");
      await AsyncStorage.setItem("authToken", response.authToken);
      const token=await AsyncStorage.getItem("authToken");
      console.log(token);
      await AsyncStorage.setItem("role", role);

      // ✅ Navigate to correct home page
      router.push(role === "student" ? "./student/student-home" : "./faculty/faculty-home");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 px-6">
      <Text className="text-3xl font-bold mb-6">Login</Text>

      <Text className="text-lg text-gray-600 mb-2">Select Your Role</Text>
      <View className="w-full border border-gray-400 bg-gray-100 rounded-lg">
        <Picker
          selectedValue={role}
          onValueChange={(itemValue) => setRole(itemValue)}
          style={{ width: "100%", height: 60, color: "black" }}
          mode="dropdown"
        >
          <Picker.Item label="👨‍🎓 Student" value="student" />
          <Picker.Item label="👨‍🏫 Faculty" value="faculty" />
        </Picker>
      </View>

      <TextInput
        className="w-full bg-gray-100 p-3 rounded-lg mt-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="w-full bg-gray-100 p-3 rounded-lg mt-4"
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity 
        onPress={handleLogin} 
        className={`w-full p-3 rounded-lg mt-4 ${loading ? "bg-gray-400" : "bg-blue-500"}`}
        disabled={loading}
      >
        <Text className="text-white text-center text-lg">{loading ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/sign-up")} className="mt-4">
        <Text className="text-gray-500">Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}
