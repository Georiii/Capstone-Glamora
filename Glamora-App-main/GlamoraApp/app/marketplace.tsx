import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Image, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { apiCache } from '../utils/apiCache';

const { width } = Dimensions.get('window');

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
}

export default function Marketplace() {
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMarketplaceItems = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const cacheKey = API_ENDPOINTS.marketplaceSearch(searchQuery);
      
      // If force refresh, clear cache first
      if (forceRefresh) {
        await apiCache.clear(cacheKey);
      }
      
      const data = await apiCache.getOrFetch(
        cacheKey,
        async () => {
          const response = await fetch(API_ENDPOINTS.marketplaceSearch(searchQuery));
          
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

          let responseData;
          try {
            responseData = await response.json();
          } catch {
            console.error('JSON parse error');
            throw new Error('Invalid server response. Please try again.');
          }
          
          return responseData;
        },
        { searchQuery }, // params for cache key
        2 * 60 * 1000 // 2 minutes cache for marketplace
      );
      
      setItems(data.items || []);
    } catch (error: any) {
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to fetch marketplace items');
      }
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMarketplaceItems();
  }, [fetchMarketplaceItems]);

  const renderItem = useCallback(({ item }: { item: MarketplaceItem }) => (
    <TouchableOpacity
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
          userProfilePicture: item.userProfilePicture || '',
        }
      })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
      <View style={styles.itemInfoRow}>
        <Text style={styles.itemLabel} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemPrice}>₱{item.price}</Text>
      </View>
    </TouchableOpacity>
  ), [router]);

  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No items found.</Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item: MarketplaceItem) => item._id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: (width - 48) / 2 + 16, // item height + margin
    offset: ((width - 48) / 2 + 16) * Math.floor(index / 2),
    index,
  }), []);

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
      
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.row}
        ListEmptyComponent={loading ? (
          <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 30 }} />
        ) : renderEmptyComponent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => fetchMarketplaceItems(true)}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={6}
        updateCellsBatchingPeriod={50}
        getItemLayout={getItemLayout}
      />
      {/* Footer Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/wardrobe')}>
          <Ionicons name="shirt" size={24} color="#666" />
          <Text style={styles.navText}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/scan')}>
          <Ionicons name="camera" size={24} color="#666" />
          <Text style={styles.navText}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/marketplace')}>
          <Ionicons name="cart" size={24} color="#000" />
          <Text style={[styles.navText, styles.activeText]}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/profile')}>
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
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  itemCard: {
    width: (width - 48) / 2, // Responsive width: (screen width - padding) / 2 columns
    backgroundColor: '#fff',
    borderRadius: 18,
    margin: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    paddingBottom: 12,
  },
  itemImage: {
    width: (width - 48) / 2 - 20, // Responsive image width
    height: Math.min((width - 48) / 2 - 20, 130), // Responsive height with max
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  itemInfoRow: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '90%',
    marginTop: 6,
    paddingHorizontal: 8,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    color: '#E74C3C',
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
  },
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