import { SplashScreen, Stack } from "expo-router";
import "./global.css";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler"; // Added for gesture support

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen once the app is ready
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}