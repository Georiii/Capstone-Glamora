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
    console.log('🔄 PushRegistrationManager effect triggered, user:', user ? 'exists' : 'null');
    
    if (!user) {
      console.log('⚠️ No user found, skipping push registration');
      return;
    }

    const register = async () => {
      try {
        console.log('🔔 Starting push registration...');
        
        if (Platform.OS === 'web') {
          console.log('⚠️ Skipping push registration on web');
          return;
        }
        if (!Device.isDevice) {
          console.log('⚠️ Skipping push registration - not a physical device');
          return;
        }

        let { status } = await Notifications.getPermissionsAsync();
        console.log('📱 Current permission status:', status);
        
        if (status !== 'granted') {
          console.log('📱 Requesting notification permissions...');
          const permissionResult = await Notifications.requestPermissionsAsync();
          status = permissionResult.status;
          console.log('📱 Permission result:', status);
        }

        if (status !== 'granted') {
          console.warn('⚠️ Notification permission not granted');
          return;
        }
        
        console.log('✅ Notification permission granted');

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

        console.log('🔑 Getting Expo push token...');
        console.log('📦 Project ID:', projectId || 'not found');
        
        let expoToken: string;
        try {
          expoToken = projectId
            ? (await Notifications.getExpoPushTokenAsync({ projectId })).data
            : (await Notifications.getExpoPushTokenAsync()).data;
          console.log('✅ Expo push token received:', expoToken.substring(0, 20) + '...');
        } catch (tokenError: any) {
          // Handle Firebase/FCM configuration errors
          console.error('❌ Token generation failed:', tokenError);
          if (tokenError?.code === 'E_REGISTRATION_FAILED' || tokenError?.message?.includes('FirebaseApp')) {
            console.warn('⚠️ Push notifications require Firebase/FCM configuration. Please configure FCM credentials in Expo dashboard: https://docs.expo.dev/push-notifications/fcm-credentials/');
            return;
          }
          throw tokenError;
        }

        const userId = user?._id;
        if (!userId) {
          console.warn('⚠️ User ID not found, skipping registration');
          return;
        }
        console.log('👤 User ID:', userId);
        
        if (
          registeredInfoRef.current &&
          registeredInfoRef.current.token === expoToken &&
          registeredInfoRef.current.userId === userId
        ) {
          console.log('✅ Token already registered for this user');
          return;
        }
        
        const userToken = await AsyncStorage.getItem('token');
        if (!userToken) {
          console.warn('⚠️ User token not found in AsyncStorage, skipping registration');
          return;
        }
        console.log('🔐 User token found');

        registeredInfoRef.current = { token: expoToken, userId };

        console.log('📤 Registering token with backend...');
        console.log('🌐 Endpoint:', API_ENDPOINTS.notifications.register);
        
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

        console.log('📥 Backend response status:', registerResponse.status);
        
        if (!registerResponse.ok) {
          const errorText = await registerResponse.text();
          console.warn('⚠️ Failed to register push token with backend:', errorText);
        } else {
          const responseData = await registerResponse.json();
          console.log('✅ Push token registered successfully:', responseData);
        }
      } catch (error) {
        console.error('❌ Push registration failed:', error);
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
