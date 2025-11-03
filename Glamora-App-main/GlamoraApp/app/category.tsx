import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function Category() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const isWardrobeRoute = pathname === '/wardrobe' || pathname.startsWith('/category') || 
    pathname === '/bottoms-category' || pathname === '/shoes-category' || pathname === '/accessories-category';
  const categoryType = params.type || 'Tops';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subcategories for Tops
  const subcategories = [
    { name: 'T-shirts', type: 'T-shirt', image: require('../assets/tshirt-sample.png') },
    { name: 'Formals', type: 'Formals', image: require('../assets/formal-sample.png') },
    { name: 'Jackets/sweatshirt', type: 'Jackets/sweatshirt', image: require('../assets/jacket-sample.png') },
    { name: 'Shirt/camisole', type: 'Shirt/camisole', image: require('../assets/camisole-sample.png') },
  ];

  const handleSubcategoryPress = (subcategory: { name: string, type: string }) => {
    router.push({ pathname: '/category', params: { type: subcategory.type } });
  };

  const fetchWardrobe = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.wardrobe, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch wardrobe items.';
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

      const filteredItems = data.items.filter((item: any) => {
        // Check both categories array and category field
        const matchesCategories = (item.categories && item.categories.includes(categoryType));
        const matchesCategory = (item.category === categoryType);
        
        console.log(`🔍 Item "${item.clothName}": categories="${item.categories}", category="${item.category}", matches "${categoryType}": ${matchesCategories || matchesCategory}`);
        
        return matchesCategories || matchesCategory;
      });
      setItems(filteredItems);
    } catch (error: any) {
      console.error('Error fetching wardrobe:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to fetch wardrobe items');
      }
    } finally {
      setLoading(false);
    }
  }, [categoryType]);

  useEffect(() => {
    fetchWardrobe();
  }, [fetchWardrobe]);

  const handleAddMore = () => {
    router.push('/scan');
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleDeleteMode = () => {
    setIsDeleteMode(!isDeleteMode);
    setSelectedItems([]);
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      Alert.alert('Error', 'Please select items to delete');
      return;
    }

    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedItems.length} item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: confirmDeleteSelected
        }
      ]
    );
  };

  const confirmDeleteSelected = async () => {
    setDeleteLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        setDeleteLoading(false);
        return;
      }

      const deletePromises = selectedItems.map(async (itemId) => {
        try {
          const response = await fetch(API_ENDPOINTS.deleteWardrobeItem(itemId), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(`Failed to delete item: ${errorData.message || response.status}`);
          }

          return { itemId, success: true };
        } catch (error) {
          console.error(`Failed to delete item ${itemId}:`, error);
          return { itemId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      // Wait for all deletions to complete
      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Refresh items
      await fetchWardrobe();
      setSelectedItems([]);
      setIsDeleteMode(false);

      // Show appropriate message
      if (successful.length === selectedItems.length) {
        Alert.alert('Success', `${successful.length} item(s) deleted successfully`);
      } else if (successful.length > 0) {
        Alert.alert('Partial Success', `${successful.length} item(s) deleted, ${failed.length} failed`);
      } else {
        Alert.alert('Error', 'Failed to delete items. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting items:', error);
      Alert.alert('Error', 'Failed to delete items. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // If on the main category page (not filtered), show subcategories
  if (!categoryType || categoryType === 'Tops') {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerText}>GLAMORA</Text>
        </View>
        <Text style={styles.categoryTitle}>CATEGORY</Text>
        <View style={styles.subcategoriesGrid}>
          {subcategories.map((sub, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.subcategoryCard}
              onPress={() => handleSubcategoryPress(sub)}
            >
              <Image source={sub.image} style={styles.subcategoryImage} />
              <Text style={styles.subcategoryLabel}>{sub.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Bottom Navigation (reuse from wardrobe) */}
        <View style={styles.navigation}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/wardrobe')}>
            <Ionicons name="shirt" size={24} color={isWardrobeRoute ? '#000' : '#B0B0B0'} />
            <Text style={[styles.navText, isWardrobeRoute && styles.activeText]}>Wardrobe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/scan')}>
            <Ionicons name="camera" size={24} color="#B0B0B0" />
            <Text style={styles.navText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/marketplace')}>
            <Ionicons name="cart" size={24} color="#B0B0B0" />
            <Text style={styles.navText}>Market</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
            <Ionicons name="person" size={24} color="#B0B0B0" />
            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 20, top: 55, zIndex: 2 }}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.categoryTitle}>{categoryType === 'T-shirt' ? 'T-shirts' : categoryType}</Text>
        <TouchableOpacity 
          style={{ position: 'absolute', right: 20, top: 55, zIndex: 2 }}
          onPress={isDeleteMode ? handleDeleteSelected : toggleDeleteMode}
          disabled={deleteLoading}
        >
          {deleteLoading ? (
            <ActivityIndicator size="small" color="#E74C3C" />
          ) : (
            <Ionicons 
              name={isDeleteMode ? "trash" : "trash-outline"} 
              size={24} 
              color={isDeleteMode ? "#E74C3C" : "#666"} 
            />
          )}
        </TouchableOpacity>
      </View>
      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B4513" style={{ marginTop: 30 }} />
        ) : (
          <>
            <View style={styles.row}>
              {items.map((item, index) => (
                <TouchableOpacity
                  key={item._id || index}
                  style={[styles.itemCard, isDeleteMode && selectedItems.includes(item._id) && styles.selectedItemCard]}
                  onPress={() => {
                    if (isDeleteMode) {
                      toggleItemSelection(item._id);
                    } else {
                      router.push({
                        pathname: '/item-detail',
                        params: {
                          itemId: item._id,
                          imageUrl: item.imageUrl,
                          clothName: item.clothName,
                          description: item.description,
                          occasion: (item.occasions && item.occasions[0]) || item.occasion || '',
                          weather: item.weather || '',
                          category: categoryType,
                        }
                      });
                    }
                  }}
                >
                  {isDeleteMode && (
                    <View style={styles.checkboxContainer}>
                      <Ionicons 
                        name={selectedItems.includes(item._id) ? "checkbox" : "square-outline"} 
                        size={24} 
                        color={selectedItems.includes(item._id) ? "#007AFF" : "#666"} 
                      />
                    </View>
                  )}
                  <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                  <Text style={styles.itemLabel}>{item.clothName || 'Cloth name'}</Text>
                </TouchableOpacity>
              ))}
              {/* Add more button */}
              <TouchableOpacity style={styles.addMoreCard} onPress={handleAddMore}>
                <Ionicons name="add" size={32} color="#000" />
                <Text style={styles.addMoreLabel}>Add more</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
    paddingBottom: 90, // Add extra space for the fixed footer
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',     
    justifyContent: 'center', 
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#FEE8D6',
    position: 'relative',
  },

  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 12,
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
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 24,
    marginTop: 10,
    marginBottom: 18,
  },
  subcategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  subcategoryCard: {
    width: 90,
    alignItems: 'center',
    margin: 12,
  },
  subcategoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#222',
    marginBottom: 8,
    resizeMode: 'cover',
  },
  subcategoryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
  },
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
  navItem: {
    alignItems: 'center',
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  activeText: {
    color: '#333',
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'flex-start',
  },
  itemCard: {
    width: '44%',
    margin: '3%',
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: 140,
    height: 140,
    borderRadius: 10,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  itemLabel: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    marginBottom: 4,
  },
  addMoreCard: {
    width: '44%',
    margin: '3%',
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    height: 180,
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
  },
  addMoreLabel: {
    fontSize: 15,
    color: '#222',
    marginTop: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 12,
  },
  // Delete mode styles
  selectedItemCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  checkboxContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  deleteButtonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 