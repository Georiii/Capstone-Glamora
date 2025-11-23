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

// Configure notifications to always show in system notification bar (device notification tray)
// This ensures notifications appear in the device's notification bar, not just in-app
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Return configuration that shows notification in system tray
    return {
      shouldShowAlert: true,      // Show alert in system notification bar
      shouldPlaySound: true,      // Play sound
      shouldSetBadge: true,       // Update app badge
      shouldShowBanner: true,     // Show banner on Android
      shouldShowList: true,       // Show in notification list on Android
    };
  },
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
          console.warn('⚠️ Notification permission not granted');
          return;
        }

        // Configure Android notification channel for system notification bar
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX, // Highest priority - shows in system notification bar
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
            enableVibrate: true,
            showBadge: true,
          });
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

        let expoToken: string;
        try {
          expoToken = projectId
            ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
            : (await Notifications.getExpoPushTokenAsync()).data;
        } catch (tokenError: any) {
          // Handle Firebase/FCM configuration errors
          if (tokenError?.code === 'E_REGISTRATION_FAILED' || tokenError?.message?.includes('FirebaseApp')) {
            console.warn('⚠️ Push notifications require Firebase/FCM configuration. Please configure FCM credentials in Expo dashboard: https://docs.expo.dev/push-notifications/fcm-credentials/');
            return;
          }
          throw tokenError;
        }

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

        const registerResponse = await fetch(API_ENDPOINTS.notifications.register, {
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

        if (!registerResponse.ok) {
          console.warn('⚠️ Failed to register push token with backend');
        } else {
          console.log('✅ Push token registered successfully');
        }
      } catch (error) {
        console.warn('Push registration failed', error);
      }
    };

    register();

    // Set up notification listeners to ensure notifications appear in system notification bar
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // Notification received - it will automatically appear in system notification bar
      // due to the handler configuration (shouldShowAlert: true)
      console.log('📬 Notification received:', notification.request.content.title);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // User tapped on notification from system notification bar
      console.log('👆 Notification tapped:', response.notification.request.content.title);
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
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
