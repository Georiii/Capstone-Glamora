import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

export default function Profile() {
  const router = useRouter();
  const [name, setName] = useState('Name');
  const [email, setEmail] = useState('Email');
  const [measurements, setMeasurements] = useState<any>(null);
  // Temporary profile image
  const profileImage = 'https://randomuser.me/api/portraits/men/1.jpg';

  useEffect(() => {
    // Try to get user info from AsyncStorage (after login/register)
    const fetchUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setName(user.name || 'Name');
          setEmail(user.email || 'Email');
          
          // Load user profile with measurements
          if (user.email) {
            await loadUserProfile(user.email);
          }
        }
      } catch {
        // Handle error silently
      }
    };
    fetchUser();
  }, []);

  const loadUserProfile = async (userEmail: string) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.baseUrl}/api/auth/profile/${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        if (data.user.bodyMeasurements) {
          setMeasurements(data.user.bodyMeasurements);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.gCircle}><Text style={styles.gText}>G</Text></View>
          <Text style={styles.headerText}>GLAMORA</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="trophy-outline" size={28} color="#B8860B" style={{ marginRight: 16 }} />
          <Ionicons name="settings-outline" size={28} color="#4B2E2B" />
        </View>
      </View>
      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <Image source={{ uri: profileImage }} style={styles.avatar} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
        </View>
      </View>
      
      {/* Measurement Summary */}
      <View style={styles.measurementSummary}>
        <View style={styles.measurementHeader}>
          <Text style={styles.measurementTitle}>Body Measurements</Text>
          <TouchableOpacity onPress={() => router.push('/body-measurements')}>
            <Text style={styles.editMeasurements}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.measurementGrid}>
          <View style={styles.measurementItem}>
            <Text style={styles.measurementValue}>
              {measurements?.height ? `${measurements.height}${measurements.measurementsUnit || 'cm'}` : '--'}
            </Text>
            <Text style={styles.measurementLabel}>Height</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={styles.measurementValue}>
              {measurements?.weight ? `${measurements.weight}kg` : '--'}
            </Text>
            <Text style={styles.measurementLabel}>Weight</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={styles.measurementValue}>
              {measurements?.bust ? `${measurements.bust}${measurements.measurementsUnit || 'cm'}` : '--'}
            </Text>
            <Text style={styles.measurementLabel}>Bust</Text>
          </View>
        </View>
      </View>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/message-box')}>
          <MaterialCommunityIcons name="message-outline" size={32} color="#4B2E2B" />
          <Text style={styles.actionLabel}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/body-measurements')}>
          <MaterialCommunityIcons name="ruler" size={32} color="#4B2E2B" />
          <Text style={styles.actionLabel}>Measurements</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => (router as any).push('/combine-outfits')}>
          <FontAwesome5 name="layer-group" size={32} color="#4B2E2B" />
          <Text style={styles.actionLabel}>Combine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => alert('Frequently used feature coming soon!')}>
          <MaterialCommunityIcons name="chart-line" size={32} color="#4B2E2B" />
          <Text style={styles.actionLabel}>Frequently{`\n`}used</Text>
        </TouchableOpacity>
      </View>
      {/* Data History */}
      <View style={styles.dataHistorySection}>
        <Text style={styles.dataHistoryTitle}>Data History</Text>
        <View style={styles.recentHistoryBox}>
          <View style={styles.recentHistoryHeader}>
            <Text style={styles.recentHistoryTitle}>Recent combine history</Text>
            <TouchableOpacity onPress={() => (router as any).push('/outfit-history')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          {/* Example history */}
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>April 16, 2025</Text>
            <Text style={styles.historyOutfit}>Outfit 2</Text>
            <Ionicons name="chevron-forward" size={20} color="#4B2E2B" />
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>April 14, 2025</Text>
            <Text style={styles.historyOutfit}>Outfit 3</Text>
            <Ionicons name="chevron-forward" size={20} color="#4B2E2B" />
          </View>
          <View style={styles.historyRow}>
            <Text style={styles.historyDate}>April 13, 2025</Text>
            <Text style={styles.historyOutfit}>Outfit 1</Text>
            <Ionicons name="chevron-forward" size={20} color="#4B2E2B" />
          </View>
        </View>
      </View>
      {/* Footer Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/wardrobe')}>
          <Ionicons name="shirt" size={24} color="#333" />
          <Text style={styles.navText}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/scan')}>
          <Ionicons name="camera" size={24} color="#666" />
          <Text style={styles.navText}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/marketplace')}>
          <Ionicons name="cart" size={24} color="#666" />
          <Text style={styles.navText}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={24} color="#333" />
          <Text style={[styles.navText, styles.activeText]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8ECE6', paddingBottom: 90 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 20, backgroundColor: '#F8ECE6',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  gCircle: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#4B2E2B', backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  gText: { fontSize: 20, fontWeight: 'bold', color: '#4B2E2B', fontFamily: 'serif' },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#4B2E2B', fontFamily: 'serif', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18, marginLeft: 20, marginBottom: 18,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#fff',
  },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#222' },
  profileEmail: { fontSize: 15, color: '#666', marginTop: 2 },
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 10, marginBottom: 18,
  },
  actionItem: { alignItems: 'center', flex: 1 },
  actionLabel: { fontSize: 13, color: '#222', marginTop: 6, textAlign: 'center' },
  dataHistorySection: { marginHorizontal: 20, marginTop: 10 },
  dataHistoryTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  recentHistoryBox: {
    backgroundColor: '#F8E3D6', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#E5D1C0',
  },
  recentHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recentHistoryTitle: { fontWeight: 'bold', fontSize: 15, color: '#222' },
  viewAll: { color: '#B8860B', fontWeight: 'bold', fontSize: 13 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5D1C0',
  },
  historyDate: { fontSize: 14, color: '#222', flex: 1 },
  historyOutfit: { fontSize: 14, color: '#222', flex: 1, textAlign: 'center' },
  navigation: {
    flexDirection: 'row', backgroundColor: '#F5F2EF', paddingVertical: 15, paddingHorizontal: 20,
    justifyContent: 'space-around', borderTopLeftRadius: 18, borderTopRightRadius: 18, shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2, position: 'absolute',
    left: 0, right: 0, bottom: 0, zIndex: 100,
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#666', marginTop: 5 },
  activeText: { color: '#333', fontWeight: 'bold' },
  measurementSummary: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#F8E3D6',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  measurementTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#222',
  },
  editMeasurements: {
    color: '#B8860B',
    fontWeight: 'bold',
    fontSize: 13,
  },
  measurementGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  measurementItem: {
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  measurementLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
}); 