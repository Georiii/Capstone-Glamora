import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useSocket } from './contexts/SocketContext';

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
  const pathname = usePathname();
  const { socket } = useSocket();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { width: screenWidth } = useWindowDimensions();
  const contentPadding = 32;
  const columnGap = 16;
  const cardWidth = Math.max(150, (screenWidth - contentPadding - columnGap) / 2);
  const imageWidth = cardWidth - 20;

  const fetchMarketplaceItems = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Public feed (Approved + legacy)
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

      let data;
      try {
        data = await response.json();
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }
      
      const publicItems: MarketplaceItem[] = data.items || [];

      setItems(publicItems);
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

  useEffect(() => {
    if (!socket) return;

    const refreshHandler = () => {
      fetchMarketplaceItems();
    };

    socket.on('marketplace:item:approved', refreshHandler);
    socket.on('marketplace:item:rejected', refreshHandler);
    socket.on('system:account-notice', refreshHandler);

    return () => {
      socket.off('marketplace:item:approved', refreshHandler);
      socket.off('marketplace:item:rejected', refreshHandler);
      socket.off('system:account-notice', refreshHandler);
    };
  }, [socket, fetchMarketplaceItems]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
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
            <View style={[styles.gridRow, { paddingHorizontal: contentPadding / 2 }]}>
              {items.map((item, idx) => (
                <TouchableOpacity
                  key={item._id || idx}
                  style={[styles.itemCard, { width: cardWidth }]}
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
                  <Image source={{ uri: item.imageUrl }} style={[styles.itemImage, { width: imageWidth }]} />
                  <View style={styles.itemInfoRow}>
                    <Text style={styles.itemLabel} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>
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
          <Ionicons name="shirt" size={24} color="#B0B0B0" />
          <Text style={styles.navText}>Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/scan')}>
          <Ionicons name="camera" size={24} color="#B0B0B0" />
          <Text style={styles.navText}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="cart" size={24} color={pathname === '/marketplace' ? '#000' : '#B0B0B0'} />
          <Text style={[styles.navText, pathname === '/marketplace' && styles.activeText]}>Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={24} color="#B0B0B0" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4C2C2', paddingBottom: 90 },
  headerContainer: {
    width: '100%',
    alignItems: 'center',     
    justifyContent: 'center', 
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FEE8D6',
    position: 'relative',
  },

  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4B2E2B',
    fontFamily: 'serif',
    letterSpacing: 1,
    textAlign: 'center',
    width: '100%',            
  },
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
    flexDirection: 'column', alignItems: 'center', paddingBottom: 120, paddingHorizontal: 8,
  },
  gridRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%',
  },
  itemCard: {
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    paddingBottom: 12,
  },
  itemImage: {
    height: 130, borderRadius: 12, marginTop: 10, marginBottom: 8, backgroundColor: '#eee',
  },
  itemInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 12,
  },
  itemLabel: { fontSize: 15, fontWeight: 'bold', color: '#222', flex: 1, marginRight: 6 },
  itemPrice: { fontSize: 15, color: '#222', fontWeight: 'bold', marginLeft: 8 },
  navigation: {
    flexDirection: 'row', 
    backgroundColor: '#FEE8D6',
    paddingVertical: 15, 
    paddingHorizontal: 20,
    justifyContent: 'space-around', 
    borderTopLeftRadius: 18, 
    borderTopRightRadius: 18, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 2, 
    elevation: 2, 
    position: 'absolute',
    left: 0, 
    right: 0, 
    bottom: 0, 
    zIndex: 100,
  },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 12, color: '#666', marginTop: 5 },
  activeText: { color: '#333', fontWeight: 'bold' },
}); 