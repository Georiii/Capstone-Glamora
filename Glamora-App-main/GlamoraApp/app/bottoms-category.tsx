import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_ENDPOINTS } from '../config/api';

export default function BottomsCategory() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const isWardrobeRoute = pathname === '/wardrobe' || pathname.startsWith('/category') || 
    pathname === '/bottoms-category' || pathname === '/shoes-category' || pathname === '/accessories-category';
  const categoryType = params.type || 'Bottoms';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [customSubcategories, setCustomSubcategories] = useState<any[]>([]);
  const [showAddSubcategoryModal, setShowAddSubcategoryModal] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newSubcategoryImage, setNewSubcategoryImage] = useState<string | null>(null);
  const [creatingSubcategory, setCreatingSubcategory] = useState(false);

  // Base subcategories for Bottoms
  const baseSubcategories = [
    { name: 'Jeans', type: 'Jeans', image: require('../assets/jeans-sample.png') },
    { name: 'Trousers', type: 'Trousers', image: require('../assets/trousers-sample.png') },
    { name: 'Shorts', type: 'Shorts', image: require('../assets/shorts-sample.png') },
    { name: 'Skirts', type: 'Skirts', image: require('../assets/skirts-sample.png') },
    { name: 'Leggings', type: 'Leggings', image: require('../assets/leggings-sample.png') },
    { name: 'Joggers', type: 'Joggers', image: require('../assets/joggers-sample.png') },
  ];

  // Merge base and custom subcategories
  const subcategories = [
    ...baseSubcategories,
    ...customSubcategories.map(sub => ({
      name: sub.name,
      type: sub.type,
      image: { uri: sub.imageUrl }
    }))
  ];

  const handleSubcategoryPress = (subcategory: { name: string, type: string }) => {
    router.push({ pathname: '/bottoms-category', params: { type: subcategory.type } });
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

  const fetchCustomSubcategories = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.subcategories('Bottoms'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomSubcategories(data.subcategories || []);
      }
    } catch (error) {
      console.error('Error fetching custom subcategories:', error);
    }
  }, []);

  useEffect(() => {
    fetchWardrobe();
    fetchCustomSubcategories();
  }, [fetchWardrobe, fetchCustomSubcategories]);

  const handleAddMore = () => {
    router.push('/scan');
  };

  const convertFileToBase64 = async (uri: string): Promise<string> => {
    if (uri.startsWith('data:')) {
      return uri;
    }

    if (uri.startsWith('file://')) {
      try {
        if (Platform.OS === 'web') {
          try {
            const response = await fetch(uri);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64data = reader.result as string;
                resolve(base64data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (fetchError) {
            throw new Error('Cannot access local file on web.');
          }
        } else {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          return `data:${mimeType};base64,${base64}`;
        }
      } catch (error: any) {
        throw new Error(error.message || 'Failed to process image file');
      }
    }

    return uri;
  };

  const pickSubcategoryImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setNewSubcategoryImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim()) {
      Alert.alert('Error', 'Please enter a subcategory name');
      return;
    }

    if (!newSubcategoryImage) {
      Alert.alert('Error', 'Please select an image for the subcategory');
      return;
    }

    setCreatingSubcategory(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        setCreatingSubcategory(false);
        return;
      }

      // Convert image to base64 if needed
      let imageData = newSubcategoryImage;
      if (newSubcategoryImage.startsWith('file://')) {
        imageData = await convertFileToBase64(newSubcategoryImage);
      }

      // Create subcategory type from name (remove spaces, special chars)
      const subcategoryType = newSubcategoryName.trim().replace(/[^a-zA-Z0-9]/g, '');

      const response = await fetch(API_ENDPOINTS.createSubcategory, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryType: 'Bottoms',
          name: newSubcategoryName.trim(),
          type: subcategoryType,
          imageUrl: imageData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to create subcategory');
      }

      const data = await response.json();
      setCustomSubcategories([...customSubcategories, data.subcategory]);
      setShowAddSubcategoryModal(false);
      setNewSubcategoryName('');
      setNewSubcategoryImage(null);
      Alert.alert('Success', 'Subcategory created successfully');
    } catch (error: any) {
      console.error('Error creating subcategory:', error);
      Alert.alert('Error', error.message || 'Failed to create subcategory. Please try again.');
    } finally {
      setCreatingSubcategory(false);
    }
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
  if (!params.type || params.type === 'Bottoms') {
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
          <TouchableOpacity
            style={styles.addSubcategoryCard}
            onPress={() => setShowAddSubcategoryModal(true)}
          >
            <Ionicons name="add-circle-outline" size={40} color="#666" />
            <Text style={styles.addSubcategoryLabel}>Add More</Text>
          </TouchableOpacity>
        </View>
        
        {/* Add Subcategory Modal */}
        <Modal
          visible={showAddSubcategoryModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddSubcategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create New Subcategory</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddSubcategoryModal(false);
                    setNewSubcategoryName('');
                    setNewSubcategoryImage(null);
                  }}
                >
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalLabel}>Subcategory Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter subcategory name"
                  value={newSubcategoryName}
                  onChangeText={setNewSubcategoryName}
                  maxLength={30}
                />

                <Text style={styles.modalLabel}>Subcategory Image</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickSubcategoryImage}
                >
                  {newSubcategoryImage ? (
                    <Image source={{ uri: newSubcategoryImage }} style={styles.previewImage} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#666" />
                      <Text style={styles.imagePickerText}>Tap to select image</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.createButton, creatingSubcategory && styles.createButtonDisabled]}
                  onPress={handleCreateSubcategory}
                  disabled={creatingSubcategory}
                >
                  {creatingSubcategory ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={{ position: 'absolute', left: 20, top: 55, zIndex: 2 }}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.categoryTitle}>{categoryType}</Text>
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
                          style: item.style || '',
                          color: item.color || '',
                          categories: (item.categories && Array.isArray(item.categories)) ? item.categories.join(',') : '',
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
  // Add Subcategory styles
  addSubcategoryCard: {
    width: 90,
    alignItems: 'center',
    margin: 12,
    justifyContent: 'center',
    minHeight: 120,
  },
  addSubcategoryLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  modalBody: {
    flex: 1,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  imagePickerButton: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  imagePickerText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  createButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 