import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

interface MarketplaceItem {
  _id: string;
  imageUrl: string;
  name: string;
  description: string;
  price: number;
  userName: string;
  userEmail: string;
  userProfilePicture?: string; // Add seller's profile picture
  createdAt: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
}

export default function Marketplace() {
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMarketplaceItems = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🛒 Fetching marketplace items...');
      console.log('🔗 API endpoint:', API_ENDPOINTS.marketplaceSearch(searchQuery));
      // 1) Public feed (Approved + legacy)
      const response = await fetch(API_ENDPOINTS.marketplaceSearch(searchQuery));
      
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = 'Failed to fetch marketplace items.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }
      // Public feed: All approved items (visible to everyone)
      // Backend already filters to show only 'Approved' items or items without status (legacy items)
      console.log(`📦 Total items from backend: ${data.items?.length || 0}`);
      const publicItems: MarketplaceItem[] = (data.items || []).filter((item: MarketplaceItem) => {
        // Additional frontend safety: Only show approved items or items without status
        return !item.status || item.status === 'Approved';
      });
      console.log(`✅ Public approved items: ${publicItems.length}`);

      // Merge user's own Pending items so they can see their pending posts
      // This ensures moderation flow while letting users track their submissions
      try {
        const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('token');
        if (token) {
          const meResp = await fetch(API_ENDPOINTS.getUserMarketplaceItems, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (meResp.ok) {
            const meData = await meResp.json();
            const myItems: MarketplaceItem[] = (meData.items || []).filter((item: MarketplaceItem) => {
              // Only include pending/rejected items from user (they already see approved via publicItems)
              return item.status === 'Pending' || item.status === 'Rejected';
            });

            // Merge: All public approved items + user's own pending/rejected items
            const itemMap = new Map<string, MarketplaceItem>();
            // First, add all public approved items (visible to everyone)
            for (const it of publicItems) {
              itemMap.set(it._id, it);
            }
            // Then, add user's own pending/rejected items (only visible to them)
            console.log(`👤 User's own pending/rejected items: ${myItems.length}`);
            for (const it of myItems) {
              if (!itemMap.has(it._id)) {
                itemMap.set(it._id, it);
              }
            }
            const finalItems = Array.from(itemMap.values());
            console.log(`✅ Total items to display: ${finalItems.length} (${publicItems.length} public + ${myItems.length} user's own)`);
            setItems(finalItems);
          } else {
            // Fallback: Show all public approved items
            setItems(publicItems);
          }
        } else {
          // No token: Show all public approved items only
          setItems(publicItems);
        }
      } catch {
        // On error: Show all public approved items
        setItems(publicItems);
      }
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to fetch marketplace items');
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMarketplaceItems();
  }, [fetchMarketplaceItems]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.gCircle}><Text style={styles.gText}>G</Text></View>
        <Text style={styles.headerText}>GLAMORA</Text>
      </View>
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="shirt" size={20} color="#b8b0a8" style={{ marginLeft: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="search cloth"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#b8b0a8"
        />
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search" size={20} color="#b8b0a8" />
        </TouchableOpacity>
      </View>
      <Text style={styles.marketplaceTitle}>MARKETPLACE</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 30 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.gridContainer}>
          {items.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#888', marginTop: 30 }}>No items found.</Text>
          ) : (
            <View style={styles.gridRow}>
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={item._id || idx}
                  style={styles.itemCard}
                  onPress={() => router.push({
                    pathname: '/posted-item',
                    params: {
                      itemId: item._id,
                      imageUrl: item.imageUrl,
                      name: item.name,
                      description: item.description,
                      price: item.price,
                      userName: item.userName,
                      userEmail: item.userEmail,
                      userProfilePicture: item.userProfilePicture || '', // Pass seller's profile picture
                    }
                  })}
                >
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  <View style={styles.itemInfoRow}>
                    <Text style={styles.itemLabel}>{item.name}</Text>
                    <Text style={styles.itemPrice}>₱{item.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="cart" size={24} color="#333" />
          <Text style={[styles.navText, styles.activeText]}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4C2C2', paddingBottom: 90 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 16, paddingHorizontal: 24,
    backgroundColor: '#F9F3F0', justifyContent: 'flex-start',
  },
  gCircle: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4B2E2B', backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  gText: { fontSize: 22, fontWeight: 'bold', color: '#4B2E2B', fontFamily: 'serif' },
  headerText: { fontSize: 28, fontWeight: 'bold', color: '#4B2E2B', fontFamily: 'serif', letterSpacing: 1 },
  searchBarContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ece5df', borderRadius: 18,
    marginHorizontal: 24, marginTop: 10, marginBottom: 10, paddingHorizontal: 8, height: 38,
  },
  searchInput: {
    flex: 1, fontSize: 16, marginLeft: 8, color: '#222', backgroundColor: 'transparent',
  },
  searchButton: {
    padding: 8,
    marginRight: 8,
  },
  marketplaceTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#222', marginLeft: 24, marginTop: 10, marginBottom: 18,
  },
  gridContainer: {
    flexDirection: 'column', alignItems: 'center', paddingBottom: 120,
  },
  gridRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', width: '100%',
  },
  itemCard: {
    width: 170, height: 220, backgroundColor: '#fff', borderRadius: 18, margin: 10, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemImage: {
    width: 150, height: 130, borderRadius: 12, marginTop: 10, marginBottom: 8, backgroundColor: '#eee',
  },
  itemInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '90%', marginTop: 6,
    paddingHorizontal: 8,
  },
  itemLabel: { fontSize: 15, fontWeight: 'bold', color: '#222', flex: 1 },
  itemPrice: { fontSize: 15, color: '#222', fontWeight: 'bold', marginLeft: 8 },
  navigation: {
    flexDirection: 'row', backgroundColor: '#F5F2EF', paddingVertical: 15, paddingHorizontal: 20,
    justifyContent: 'space-around', borderTopLeftRadius: 18, borderTopRightRadius: 18, shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2, position: 'absolute',
    left: 0, right: 0, bottom: 0, zIndex: 100,
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#666', marginTop: 5 },
  activeText: { color: '#333', fontWeight: 'bold' },
}); 