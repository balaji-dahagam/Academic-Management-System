import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";

export default function Home() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 px-6">
      {/* Logo or Illustration */}
      <Image
        source={require("../../../assets/images/welcome.png")} // Add a suitable image in your assets folder
        className="w-40 h-40 mb-6"
        resizeMode="contain"
      />

      {/* Welcome Text */}
      <Text className="text-3xl font-rubik-bold text-gray-800 text-center">
        Welcome to the App!
      </Text>
      <Text className="text-lg text-gray-600 text-center mt-2">
        Get started by logging in or creating a new account.
      </Text>

      {/* Buttons for Sign In & Sign Up */}
      <TouchableOpacity
        onPress={() => router.push("/login")}
        className="w-full bg-blue-500 p-4 rounded-full mt-6 shadow-lg"
      >
        <Text className="text-white text-center text-lg font-semibold">
          Log In
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push("/sign-up")}
        className="w-full bg-green-500 p-4 rounded-full mt-4 shadow-lg"
      >
        <Text className="text-white text-center text-lg font-semibold">
          Sign Up
        </Text>
      </TouchableOpacity>
    </View>
  );
}
