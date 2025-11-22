import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useUser } from './contexts/UserContext';
import { useTheme } from './contexts/ThemeContext';

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
  const pathname = usePathname();
  const { user } = useUser();
  const { theme } = useTheme();
  const [name, setName] = useState('Name');
  const [email, setEmail] = useState('Email');
  const [measurements, setMeasurements] = useState<any>(null);
  const [recentOutfits, setRecentOutfits] = useState<Outfit[]>([]);
  // Get profile image from user context or use default
  const profileImage = user?.profilePicture?.url || require('../assets/avatar.png');

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
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerText, { color: theme.colors.headerText }]}>GLAMORA</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/premium')} style={{ marginRight: 16 }}>
            <Ionicons name="trophy-outline" size={28} color={theme.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={28} color={theme.colors.icon} />
          </TouchableOpacity>
        </View>
      </View>
      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <Image 
          source={typeof profileImage === 'string' ? { uri: profileImage } : profileImage} 
          style={styles.avatar} 
        />
        <View style={{ marginLeft: 12 }}>
          <Text style={[styles.profileName, { color: theme.colors.primaryText }]}>{name}</Text>
          <Text style={[styles.profileEmail, { color: theme.colors.secondaryText }]}>{email}</Text>
        </View>
      </View>
      
      {/* Measurement Summary */}
      <View style={[styles.measurementSummary, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
        <View style={styles.measurementHeader}>
          <Text style={[styles.measurementTitle, { color: theme.colors.primaryText }]}>Body Measurements</Text>
          <TouchableOpacity onPress={() => router.push('/body-measurements')}>
            <Text style={[styles.editMeasurements, { color: theme.colors.accent }]}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.measurementGrid}>
          <View style={styles.measurementItem}>
            <Text style={[styles.measurementValue, { color: theme.colors.primaryText }]}>
              {measurements?.height ? `${measurements.height}${measurements.measurementsUnit || 'cm'}` : '--'}
            </Text>
            <Text style={[styles.measurementLabel, { color: theme.colors.secondaryText }]}>Height</Text>
          </View>
          <View style={styles.measurementItem}>
            <Text style={[styles.measurementValue, { color: theme.colors.primaryText }]}>
              {measurements?.weight ? `${measurements.weight}kg` : '--'}
            </Text>
            <Text style={[styles.measurementLabel, { color: theme.colors.secondaryText }]}>Weight</Text>
          </View>
        </View>
      </View>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/message-box')}>
          <MaterialCommunityIcons name="message-outline" size={32} color={theme.colors.icon} />
          <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/body-measurements')}>
          <MaterialCommunityIcons name="ruler" size={32} color={theme.colors.icon} />
          <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>Measurements</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => (router as any).push('/combine-outfits')}>
          <FontAwesome5 name="layer-group" size={32} color={theme.colors.icon} />
          <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>Combine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/analytics')}>
          <MaterialCommunityIcons name="chart-line" size={32} color={theme.colors.icon} />
          <Text style={[styles.actionLabel, { color: theme.colors.primaryText }]}>Frequent{`\n`}Data</Text>
        </TouchableOpacity>
      </View>
      {/* Data History */}
      <View style={styles.dataHistorySection}>
        <Text style={[styles.dataHistoryTitle, { color: theme.colors.primaryText }]}>Data History</Text>
        <View style={[styles.recentHistoryBox, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
          <View style={styles.recentHistoryHeader}>
            <Text style={[styles.recentHistoryTitle, { color: theme.colors.primaryText }]}>Recent combine history</Text>
            <TouchableOpacity onPress={() => (router as any).push('/outfit-history')}>
              <Text style={[styles.viewAll, { color: theme.colors.accent }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {/* Recent outfit history */}
          {recentOutfits.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={[styles.emptyHistoryText, { color: theme.colors.secondaryText }]}>No recent outfits</Text>
            </View>
          ) : (
            recentOutfits.map((outfit) => (
              <TouchableOpacity 
                key={outfit._id} 
                style={[styles.historyRow, { borderBottomColor: theme.colors.divider }]}
                onPress={() => handleOutfitPress(outfit)}
                activeOpacity={0.7}
              >
                <Text style={[styles.historyDate, { color: theme.colors.primaryText }]}>
                  {formatDate(outfit.wornDate || outfit.createdAt)}
                </Text>
                <Text style={[styles.historyOutfit, { color: theme.colors.primaryText }]}>{outfit.outfitName}</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.icon} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
      {/* Footer Navigation */}
      <View style={[styles.navigation, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/wardrobe')}>
          <Ionicons name="shirt" size={24} color={theme.colors.secondaryText} />
          <Text style={[styles.navText, { color: theme.colors.secondaryText }]}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/scan')}>
          <Ionicons name="camera" size={24} color={theme.colors.secondaryText} />
          <Text style={[styles.navText, { color: theme.colors.secondaryText }]}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/marketplace')}>
          <Ionicons name="cart" size={24} color={theme.colors.secondaryText} />
          <Text style={[styles.navText, { color: theme.colors.secondaryText }]}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={24} color={pathname === '/profile' ? theme.colors.icon : theme.colors.secondaryText} />
          <Text style={[styles.navText, { color: theme.colors.secondaryText }, pathname === '/profile' && { color: theme.colors.primaryText, fontWeight: 'bold' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 90 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 40, paddingBottom: 10, paddingHorizontal: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerText: { fontSize: 24, fontWeight: 'bold', fontFamily: 'serif', letterSpacing: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18, marginLeft: 20, marginBottom: 18,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#fff',
  },
  profileName: { fontSize: 20, fontWeight: 'bold' },
  profileEmail: { fontSize: 15, marginTop: 2 },
  quickActions: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 15, marginBottom: 20,
    paddingHorizontal: 20,
  },
  actionItem: { alignItems: 'center', flex: 1, paddingHorizontal: 10 },
  actionLabel: { fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  dataHistorySection: { marginHorizontal: 20, marginTop: 10 },
  dataHistoryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  recentHistoryBox: {
    borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recentHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recentHistoryTitle: { fontWeight: 'bold', fontSize: 15 },
  viewAll: { fontWeight: 'bold', fontSize: 13 },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1,
  },
  historyDate: { fontSize: 14, flex: 1 },
  historyOutfit: { fontSize: 14, flex: 1, textAlign: 'center' },
  navigation: {
    flexDirection: 'row', paddingVertical: 18, paddingHorizontal: 20,
    justifyContent: 'space-around', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, position: 'absolute',
    left: 0, right: 0, bottom: 0, zIndex: 100,
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  activeText: { fontWeight: 'bold', fontSize: 13 },
  measurementSummary: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
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
  },
  editMeasurements: {
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
  },
  measurementLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyHistory: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
}); 