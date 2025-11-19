import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function Notification() {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(true);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(true);
  const [punishmentsEnabled, setPunishmentsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync();
    loadNotificationPreferences();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Handle navigation based on notification type
      if (data?.type === 'message') {
        // Navigate to chat
        router.push(`/message-user?userId=${data.userId}`);
      } else if (data?.type === 'announcement') {
        // Navigate to announcements or home
        router.push('/');
      } else if (data?.type === 'subscription') {
        // Navigate to premium page
        router.push('/premium');
      } else if (data?.type === 'punishment') {
        // Navigate to profile or show alert
        Alert.alert('Account Restriction', data.message || 'Your account has been restricted.');
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const registerForPushNotificationsAsync = async () => {
    try {
      // Check if device is physical (not simulator/emulator)
      if (Platform.OS === 'web') {
        console.log('⚠️ Push notifications not supported on web');
        return;
      }

      if (!Device.isDevice) {
        console.log('⚠️ Push notifications only work on physical devices');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        return;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync();

      setExpoPushToken(token.data);
      console.log('📱 Expo Push Token:', token.data);

      // Register token with backend
      await registerDeviceToken(token.data);

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const registerDeviceToken = async (token: string) => {
    try {
      const userToken = await AsyncStorage.getItem('token');
      if (!userToken) {
        console.log('⚠️ No user token found, skipping device registration');
        return;
      }

      const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

      const response = await fetch(API_ENDPOINTS.notifications.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          token,
          platform,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to register device token:', errorText);
        return;
      }

      console.log('✅ Device token registered successfully');
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      setLoading(true);
      const userToken = await AsyncStorage.getItem('token');
      if (!userToken) {
        console.log('⚠️ No user token found');
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.notifications.preferences, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const prefs = data.preferences || {};
        
        setNotificationsEnabled(prefs.enabled !== false);
        setMessagesEnabled(prefs.messages !== false);
        setAnnouncementsEnabled(prefs.announcements !== false);
        setSubscriptionEnabled(prefs.subscription !== false);
        setPunishmentsEnabled(prefs.punishments !== false);
      } else {
        console.error('Failed to load notification preferences');
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPreferences = async (updates: {
    enabled?: boolean;
    messages?: boolean;
    announcements?: boolean;
    subscription?: boolean;
    punishments?: boolean;
  }) => {
    try {
      const userToken = await AsyncStorage.getItem('token');
      if (!userToken) {
        Alert.alert('Error', 'Please log in to update notification preferences.');
        return;
      }

      const response = await fetch(API_ENDPOINTS.notifications.preferences, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to update preferences:', errorText);
        Alert.alert('Error', 'Failed to update notification preferences.');
        return;
      }

      console.log('✅ Notification preferences updated');
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences.');
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await updateNotificationPreferences({ enabled: value });
  };

  const handleToggleMessages = async (value: boolean) => {
    setMessagesEnabled(value);
    await updateNotificationPreferences({ messages: value });
  };

  const handleToggleAnnouncements = async (value: boolean) => {
    setAnnouncementsEnabled(value);
    await updateNotificationPreferences({ announcements: value });
  };

  const handleToggleSubscription = async (value: boolean) => {
    setSubscriptionEnabled(value);
    await updateNotificationPreferences({ subscription: value });
  };

  const handleTogglePunishments = async (value: boolean) => {
    setPunishmentsEnabled(value);
    await updateNotificationPreferences({ punishments: value });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Notification Settings */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.settingsContainer}>
          {/* Main Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingText}>Turn notification</Text>
            </View>
            <View style={styles.settingRight}>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#000' }}
                thumbColor={notificationsEnabled ? '#fff' : '#fff'}
                style={styles.switch}
                disabled={loading}
              />
              <Text style={styles.settingStatus}>
                {notificationsEnabled ? 'On' : 'Off'}
              </Text>
            </View>
          </View>

          {/* Individual Notification Types */}
          {notificationsEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Messages</Text>
                  <Text style={styles.settingDescription}>Get notified when you receive new messages</Text>
                </View>
                <View style={styles.settingRight}>
                  <Switch
                    value={messagesEnabled}
                    onValueChange={handleToggleMessages}
                    trackColor={{ false: '#E0E0E0', true: '#000' }}
                    thumbColor={messagesEnabled ? '#fff' : '#fff'}
                    style={styles.switch}
                    disabled={loading}
                  />
                  <Text style={styles.settingStatus}>
                    {messagesEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Announcements</Text>
                  <Text style={styles.settingDescription}>Get notified about important announcements from admin</Text>
                </View>
                <View style={styles.settingRight}>
                  <Switch
                    value={announcementsEnabled}
                    onValueChange={handleToggleAnnouncements}
                    trackColor={{ false: '#E0E0E0', true: '#000' }}
                    thumbColor={announcementsEnabled ? '#fff' : '#fff'}
                    style={styles.switch}
                    disabled={loading}
                  />
                  <Text style={styles.settingStatus}>
                    {announcementsEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Subscription</Text>
                  <Text style={styles.settingDescription}>Get notified about subscription offers and expiration</Text>
                </View>
                <View style={styles.settingRight}>
                  <Switch
                    value={subscriptionEnabled}
                    onValueChange={handleToggleSubscription}
                    trackColor={{ false: '#E0E0E0', true: '#000' }}
                    thumbColor={subscriptionEnabled ? '#fff' : '#fff'}
                    style={styles.switch}
                    disabled={loading}
                  />
                  <Text style={styles.settingStatus}>
                    {subscriptionEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingText}>Punishments</Text>
                  <Text style={styles.settingDescription}>Get notified about account restrictions or warnings</Text>
                </View>
                <View style={styles.settingRight}>
                  <Switch
                    value={punishmentsEnabled}
                    onValueChange={handleTogglePunishments}
                    trackColor={{ false: '#E0E0E0', true: '#000' }}
                    thumbColor={punishmentsEnabled ? '#fff' : '#fff'}
                    style={styles.switch}
                    disabled={loading}
                  />
                  <Text style={styles.settingStatus}>
                    {punishmentsEnabled ? 'On' : 'Off'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#F5E6D3',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  settingsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8E3D6',
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  settingLeft: {
    flex: 1,
    marginRight: 15,
  },
  settingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  settingRight: {
    alignItems: 'center',
  },
  switch: {
    marginBottom: 8,
  },
  settingStatus: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
