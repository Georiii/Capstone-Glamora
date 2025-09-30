import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    loadOutfits();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

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
        setOutfits(data.outfits || []);
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

  const toggleFavorite = async (outfitId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.outfitToggleFavorite(outfitId), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update local state
        setOutfits(prev => prev.map(outfit => 
          outfit._id === outfitId 
            ? { ...outfit, isFavorite: !outfit.isFavorite }
            : outfit
        ));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const deleteOutfit = async (outfitId: string) => {
    Alert.alert(
      'Delete Outfit',
      'Are you sure you want to delete this outfit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) return;

              const response = await fetch(API_ENDPOINTS.outfitById(outfitId), {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                setOutfits(prev => prev.filter(outfit => outfit._id !== outfitId));
                Alert.alert('Success', 'Outfit deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting outfit:', error);
              Alert.alert('Error', 'Failed to delete outfit');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getOutfitPreview = (outfitItems: OutfitItem[]) => {
    // Get the first few items for preview
    const previewItems = outfitItems.slice(0, 3);
    return previewItems.map(item => item.itemName).join(', ');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B4513" />
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
        <TouchableOpacity style={styles.addButton} onPress={() => alert('Create outfit feature coming soon!')}>
          <Ionicons name="add" size={24} color="#4B2E2B" />
        </TouchableOpacity>
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
              onPress={() => alert('Create outfit feature coming soon!')}
            >
              <Text style={styles.createOutfitButtonText}>Create Your First Outfit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          outfits.map((outfit, index) => (
            <View key={outfit._id} style={styles.outfitCard}>
              {/* Outfit Header */}
              <View style={styles.outfitHeader}>
                <View style={styles.outfitTitleRow}>
                  <Text style={styles.outfitTitle}>{outfit.outfitName}</Text>
                  <View style={styles.outfitActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => toggleFavorite(outfit._id)}
                    >
                      <Ionicons 
                        name={outfit.isFavorite ? "heart" : "heart-outline"} 
                        size={20} 
                        color={outfit.isFavorite ? "#E74C3C" : "#4B2E2B"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => deleteOutfit(outfit._id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Outfit Preview Images */}
                <View style={styles.outfitPreview}>
                  {outfit.outfitItems.slice(0, 2).map((item, itemIndex) => (
                    <Image
                      key={item.wardrobeItemId}
                      source={{ uri: item.itemImageUrl }}
                      style={[
                        styles.outfitImage,
                        itemIndex === 1 && styles.outfitImageOverlap
                      ]}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </View>

              {/* Outfit Details */}
              <View style={styles.outfitDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(outfit.wornDate)}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Clothes details:</Text>
                </View>
                
                {outfit.outfitItems.map((item, itemIndex) => (
                  <View key={item.wardrobeItemId} style={styles.itemDetail}>
                    <Text style={styles.itemName}>{item.itemName}</Text>
                    <Text style={styles.itemDescription}>
                      {item.itemDescription || `${item.itemCategory} item`}
                    </Text>
                  </View>
                ))}

                {outfit.occasion && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Occasion:</Text>
                    <Text style={styles.detailValue}>{outfit.occasion}</Text>
                  </View>
                )}

                {outfit.weather && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Weather:</Text>
                    <Text style={styles.detailValue}>{outfit.weather}</Text>
                  </View>
                )}

                {outfit.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>{outfit.notes}</Text>
                  </View>
                )}
              </View>

              {/* View Details Button */}
              <TouchableOpacity 
                style={styles.viewDetailsButton}
                onPress={() => alert('Outfit details view coming soon!')}
              >
                <Text style={styles.viewDetailsText}>View Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B4513" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8ECE6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8ECE6',
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
    backgroundColor: '#F8ECE6',
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
  addButton: {
    padding: 8,
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
    backgroundColor: '#8B4513',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createOutfitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outfitCard: {
    backgroundColor: '#F8E3D6',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  outfitHeader: {
    marginBottom: 16,
  },
  outfitTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  outfitTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
    flex: 1,
  },
  outfitActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  outfitPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outfitImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  outfitImageOverlap: {
    marginLeft: -20,
    zIndex: 1,
  },
  outfitDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    width: 100,
  },
  detailValue: {
    fontSize: 16,
    color: '#4B2E2B',
    flex: 1,
  },
  itemDetail: {
    marginLeft: 100,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5D1C0',
  },
  viewDetailsText: {
    fontSize: 16,
    color: '#8B4513',
    fontWeight: 'bold',
    marginRight: 8,
  },
});
