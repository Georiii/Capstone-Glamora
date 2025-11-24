import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import RateUsModal from './components/RateUsModal';
import { useSocket } from './contexts/SocketContext';
import { useTheme } from './contexts/ThemeContext';
import { useUser } from './contexts/UserContext';
import { API_ENDPOINTS } from '../config/api';

export default function Settings() {
  const router = useRouter();
  const [showRateUsModal, setShowRateUsModal] = useState(false);
  const { disconnectSocket } = useSocket();
  const { theme } = useTheme();
  const { setUser } = useUser();

  const handleLogout = async () => {
    console.log('🔌 Logout button clicked');
    
    try {
      console.log('🔌 Starting logout process...');
      
      // Disconnect socket first
      try {
        disconnectSocket();
        console.log('🔌 Socket disconnected');
      } catch (socketError) {
        console.log('🔌 Socket disconnect failed (continuing anyway):', socketError);
      }
      
      // Clear UserContext state first
      setUser(null);
      console.log('🔌 UserContext cleared');
      
      // Clear authentication data from AsyncStorage
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('🔌 AsyncStorage cleared');
      
      // Force navigation to login page
      console.log('🔌 Navigating to login page...');
      router.replace('/login');
      
      console.log('🔌 Logout completed successfully');
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleRateUs = () => {
    setShowRateUsModal(true);
  };

  const handleRateUsSubmit = async (rating: number, feedback: string) => {
    try {
      const stars = Math.max(1, Math.min(5, Math.floor(Number(rating) || 1)));
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Authentication Required', 'Please log in to submit a rating.');
        return;
      }

      const response = await fetch(API_ENDPOINTS.submitRatingFeedback, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stars,
          feedback: feedback || '',
          platform: Platform.OS
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 429) {
          Alert.alert('Rate Limit', data?.message || 'Only one rating per day is allowed. Please try again tomorrow.');
        } else {
          Alert.alert('Error', data?.message || 'Failed to submit rating. Please try again.');
        }
        return;
      }

      Alert.alert(
        'Thank You!',
        `Thank you for your ${stars}-star rating! Your feedback helps us improve.`,
        [{ text: 'OK' }]
      );
      setShowRateUsModal(false);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message?.includes('Network request failed')
          ? 'Unable to connect to server. Please check your internet connection.'
          : 'Failed to submit rating. Please try again.'
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Settings Options */}
      <View style={styles.settingsContainer}>
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={() => router.push('/edit-profile')}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Account profile</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={() => router.push('/security')}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Security</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={() => router.push('/manage-posts')}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Manage post</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={() => router.push('/themes')}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Change Theme</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={() => router.push('/notification')}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Notification</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={handleRateUs}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Ratings</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.divider }]} onPress={handleLogout}>
          <Text style={[styles.settingText, { color: theme.colors.primaryText }]}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.secondaryText} />
        </TouchableOpacity>
      </View>

      {/* Rate Us Modal */}
      <RateUsModal
        visible={showRateUsModal}
        onClose={() => setShowRateUsModal(false)}
        onSubmit={handleRateUsSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  settingText: {
    fontSize: 18,
    fontWeight: '500',
  },
});
