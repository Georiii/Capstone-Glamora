import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function Notification() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setNotificationsEnabled(parsed.enabled !== false);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify({
        enabled: value
      }));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

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
      <View style={styles.settingsContainer}>
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
            />
            <Text style={styles.settingStatus}>
              {notificationsEnabled ? 'On' : 'Off'}
            </Text>
          </View>
        </View>
      </View>
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
    marginBottom: 20,
  },
  settingLeft: {
    flex: 1,
  },
  settingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
});
