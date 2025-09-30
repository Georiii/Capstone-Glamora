import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useUser } from './contexts/UserContext';

interface OutfitItem {
  wardrobeItemId: string;
  itemName: string;
  itemDescription: string;
  itemImageUrl: string;
  itemCategory: string;
}

interface Outfit {
  _id: string;
  outfitName: string;
  outfitItems: OutfitItem[];
  occasion?: string;
  weather?: string;
  notes?: string;
  isFavorite: boolean;
  wornDate: string;
  createdAt: string;
}

export default function Profile() {
  const router = useRouter();
  const { user } = useUser();
  const [name, setName] = useState('Name');
  const [email, setEmail] = useState('Email');
  const [measurements, setMeasurements] = useState<any>(null);
  const [recentOutfits, setRecentOutfits] = useState<Outfit[]>([]);
  // Get profile image from user context or use default
  const profileImage = user?.profilePicture?.url || 'https://randomuser.me/api/portraits/men/1.jpg';

  useEffect(() => {
    // Update local state from user context
    if (user) {
      setName(user.name || 'Name');
      setEmail(user.email || 'Email');
      setMeasurements(user.bodyMeasurements || null);
      
      // Load user profile with measurements if not in context
      if (user.email && !user.bodyMeasurements) {
        loadUserProfile(user.email);
      }
      
      loadRecentOutfits();
    }
  }, [user]);

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

  const loadRecentOutfits = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.outfits, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Sort outfits by date (newest first) and take only the first 3
        const sortedOutfits = (data.outfits || []).sort((a: Outfit, b: Outfit) => 
          new Date(b.wornDate || b.createdAt).getTime() - new Date(a.wornDate || a.createdAt).getTime()
        ).slice(0, 3);
        setRecentOutfits(sortedOutfits);
      }
    } catch (error) {
      console.error('Error loading recent outfits:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleOutfitPress = (outfit: Outfit) => {
    // Navigate to outfit history detail with the outfit data
    router.push({
      pathname: '/outfit-history-detail',
      params: {
        outfitData: JSON.stringify(outfit)
      }
    });
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
          <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={28} color="#4B2E2B" />
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/analytics')}>
          <MaterialCommunityIcons name="chart-line" size={32} color="#4B2E2B" />
          <Text style={styles.actionLabel}>Frequent{`\n`}Data</Text>
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
          {/* Recent outfit history */}
          {recentOutfits.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>No recent outfits</Text>
            </View>
          ) : (
            recentOutfits.map((outfit) => (
              <TouchableOpacity 
                key={outfit._id} 
                style={styles.historyRow}
                onPress={() => handleOutfitPress(outfit)}
                activeOpacity={0.7}
              >
                <Text style={styles.historyDate}>
                  {formatDate(outfit.wornDate || outfit.createdAt)}
                </Text>
                <Text style={styles.historyOutfit}>{outfit.outfitName}</Text>
                <Ionicons name="chevron-forward" size={20} color="#4B2E2B" />
              </TouchableOpacity>
            ))
          )}
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
  container: { flex: 1, backgroundColor: '#F4C2C2', paddingBottom: 90 },
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
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 15, marginBottom: 20,
    paddingHorizontal: 20,
  },
  actionItem: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  actionLabel: { fontSize: 13, color: '#222', marginTop: 8, textAlign: 'center', fontWeight: '500' },
  dataHistorySection: { marginHorizontal: 20, marginTop: 10 },
  dataHistoryTitle: { fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 },
  recentHistoryBox: {
    backgroundColor: '#F8E3D6', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5D1C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    flexDirection: 'row', backgroundColor: '#F5F2EF', paddingVertical: 18, paddingHorizontal: 20,
    justifyContent: 'space-around', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, position: 'absolute',
    left: 0, right: 0, bottom: 0, zIndex: 100,
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#666', marginTop: 6, fontWeight: '500' },
  activeText: { color: '#333', fontWeight: 'bold', fontSize: 13 },
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
  emptyHistory: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
}); 