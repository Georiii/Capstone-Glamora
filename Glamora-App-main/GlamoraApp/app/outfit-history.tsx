import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';

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

export default function OutfitHistory() {
  const router = useRouter();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOutfits();
  }, []);

  const loadOutfits = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to view outfit history');
        return;
      }

      const response = await fetch(API_ENDPOINTS.outfits, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Sort outfits by date (newest first)
        const sortedOutfits = (data.outfits || []).sort((a: Outfit, b: Outfit) => 
          new Date(b.wornDate || b.createdAt).getTime() - new Date(a.wornDate || a.createdAt).getTime()
        );
        setOutfits(sortedOutfits);
      } else {
        console.error('Failed to fetch outfits:', response.status);
      }
    } catch (error) {
      console.error('Error loading outfits:', error);
      Alert.alert('Error', 'Failed to load outfit history');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E2B" />
        <Text style={styles.loadingText}>Loading your outfit history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combine History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadOutfits(true)} />
        }
      >
        {outfits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shirt-outline" size={64} color="#E5D1C0" />
            <Text style={styles.emptyTitle}>No Outfits Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start creating outfits by combining your wardrobe items
            </Text>
            <TouchableOpacity 
              style={styles.createOutfitButton}
              onPress={() => (router as any).push('/combine-outfits')}
            >
              <Text style={styles.createOutfitButtonText}>Create Your First Outfit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          outfits.map((outfit) => (
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF7F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF7F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B2E2B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FDF7F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5D1C0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createOutfitButton: {
    backgroundColor: '#4B2E2B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createOutfitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5D1C0',
  },
  historyDate: {
    fontSize: 16,
    color: '#4B2E2B',
    flex: 1,
  },
  historyOutfit: {
    fontSize: 16,
    color: '#4B2E2B',
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
});