import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Stack } from "expo-router";
import { SocketProvider } from "./contexts/SocketContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import UserProvider, { useUser } from "./contexts/UserContext";
import { AdProvider } from "./contexts/AdContext";
import { API_ENDPOINTS } from "../config/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const PushRegistrationManager = () => {
  const { user } = useUser();
  const registeredInfoRef = useRef<{ token: string; userId: string } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const register = async () => {
      try {
        if (Platform.OS === 'web') {
          return;
        }
        if (!Device.isDevice) {
          return;
        }

        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const permissionResult = await Notifications.requestPermissionsAsync();
          status = permissionResult.status;
        }

        if (status !== 'granted') {
          return;
        }

        let projectId: string | undefined;
        try {
          // Try to infer projectId from expo config
          // @ts-ignore
          projectId =
            (Constants?.default as any)?.expoConfig?.extra?.eas?.projectId ||
            // @ts-ignore
            (Constants?.default as any)?.easConfig?.projectId ||
            // @ts-ignore
            (Constants?.default as any)?.manifest?.extra?.eas?.projectId;
        } catch {
          projectId = undefined;
        }

        const expoToken = projectId
          ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
          : (await Notifications.getExpoPushTokenAsync()).data;
        const userId = user?._id;
        if (!userId) {
          return;
        }
        if (
          registeredInfoRef.current &&
          registeredInfoRef.current.token === expoToken &&
          registeredInfoRef.current.userId === userId
        ) {
          return;
        }
        const userToken = await AsyncStorage.getItem('token');
        if (!userToken) {
          return;
        }

        registeredInfoRef.current = { token: expoToken, userId };

        await fetch(API_ENDPOINTS.notifications.register, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            token: expoToken,
            platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
          }),
        });

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      } catch (error) {
        console.warn('Push registration failed', error);
      }
    };

    register();
  }, [user]);

  return null;
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AdProvider>
          <SocketProvider>
            <PushRegistrationManager />
            <Stack screenOptions={{ headerShown: false }} />
          </SocketProvider>
        </AdProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
