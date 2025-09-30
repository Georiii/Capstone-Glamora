import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import RateUsModal from './components/RateUsModal';
import { useSocket } from './contexts/SocketContext';

export default function Settings() {
  const router = useRouter();
  const [showRateUsModal, setShowRateUsModal] = useState(false);
  const { disconnectSocket } = useSocket();

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
      
      // Clear authentication data
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

  const handleRateUsSubmit = (rating: number, feedback: string) => {
    // Here you can implement the logic to save the rating and feedback
    console.log('Rating:', rating, 'Feedback:', feedback);
    Alert.alert(
      'Thank You!',
      `Thank you for your ${rating}-star rating! Your feedback helps us improve.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Settings Options */}
      <View style={styles.settingsContainer}>
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/edit-profile')}>
          <Text style={styles.settingText}>Account profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/security')}>
          <Text style={styles.settingText}>Security</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/manage-posts')}>
          <Text style={styles.settingText}>Manage post</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/notification')}>
          <Text style={styles.settingText}>Notification</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleRateUs}>
          <Text style={styles.settingText}>Ratings</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <Text style={styles.settingText}>Logout</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
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
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
  },
});
