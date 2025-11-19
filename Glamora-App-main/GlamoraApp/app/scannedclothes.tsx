import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { API_ENDPOINTS } from '../config/api';

const isLocalUri = (uri?: string | null): uri is string => {
  if (!uri) {
    return false;
  }
  return uri.startsWith('file://') || uri.startsWith('data:');
};

// Convert file:// URI to base64 data URI
const convertFileToBase64 = async (uri: string): Promise<string> => {
  // If already a data URI, return it
  if (uri.startsWith('data:')) {
    return uri;
  }

  // If it's a file:// URI, convert it to base64
  if (uri.startsWith('file://')) {
    try {
      if (Platform.OS === 'web') {
        // For web, file:// URIs are not accessible due to browser security
        // Try to fetch if it's a blob URL, otherwise throw error
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
          throw new Error('Cannot access local file on web. Please use a different image source.');
        }
      } else {
        // For React Native, use FileSystem
        try {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          // Determine MIME type from file extension or default to jpeg
          const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          return `data:${mimeType};base64,${base64}`;
        } catch (fileSystemError: any) {
          console.error('FileSystem read error:', fileSystemError);
          // Fallback: try to use the URI directly (some platforms support this)
          throw new Error('Failed to read image file. Please try selecting the image again.');
        }
      }
    } catch (error: any) {
      console.error('Error converting file to base64:', error);
      throw new Error(error.message || 'Failed to process image file');
    }
  }

  // If it's already a web URL, return it
  return uri;
};

const getOptimizedImageUrl = async (
  uri: string,
  folder: string,
  token: string | null,
) => {
  // If already a web URL, return it
  if (!isLocalUri(uri)) {
    return uri;
  }

  // Upload to Cloudinary via backend
  if (token) {
    try {
      // Convert file:// URI to base64 data URI before sending
      let imageData = uri;
      if (uri.startsWith('file://')) {
        console.log('🔄 Converting file:// URI to base64...');
        imageData = await convertFileToBase64(uri);
        console.log('✅ Converted to base64 data URI');
      }

      const uploadResponse = await fetch(API_ENDPOINTS.uploadImage, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: imageData,
          folder,
        }),
      });

      if (uploadResponse.ok) {
        const uploadResult = await uploadResponse.json();
        if (uploadResult?.imageUrl) {
          return uploadResult.imageUrl;
        }
      } else {
        const errorText = await uploadResponse.text();
        console.error('⚠️ API upload failed:', errorText);
        throw new Error(`Image upload failed: ${errorText || 'Unknown error'}`);
      }
    } catch (apiUploadError: any) {
      console.error('⚠️ API upload error:', apiUploadError);
      throw new Error(apiUploadError.message || 'Failed to upload image. Please try again.');
    }
  }

  // If we get here, upload failed and we can't use local URI
  throw new Error('Failed to upload image. Please ensure you have an internet connection and try again.');
};

export default function ScannedClothes() {
  const { imageUri } = useLocalSearchParams();
  const router = useRouter();
  const normalizedImageUri = Array.isArray(imageUri) ? imageUri[0] : imageUri;
  
  // Debug router
  console.log('🧭 Router initialized:', !!router);
  console.log('🧭 Router methods available:', Object.keys(router));
  const [clothName, setClothName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<{ name: string, type: string }[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [selectedWeather, setSelectedWeather] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWardrobeModal, setShowWardrobeModal] = useState(false);
  const [showMarketplaceModal, setMarketplaceModal] = useState(false);
  const [marketplaceName, setMarketplaceName] = useState('');
  const [marketplaceDescription, setMarketplaceDescription] = useState('');
  const [marketplacePrice, setMarketplacePrice] = useState('');

  // Base category and subcategory mapping
  const baseCategoryData = {
    'Tops': [
      { name: 'T-shirts', type: 'T-shirt' },
      { name: 'Formals', type: 'Formals' },
      { name: 'Jackets/sweatshirt', type: 'Jackets/sweatshirt' },
      { name: 'Shirt/camisole', type: 'Shirt/camisole' },
    ],
    'Bottoms': [
      { name: 'Jeans', type: 'Jeans' },
      { name: 'Trousers', type: 'Trousers' },
      { name: 'Shorts', type: 'Shorts' },
      { name: 'Skirts', type: 'Skirts' },
      { name: 'Leggings', type: 'Leggings' },
      { name: 'Joggers', type: 'Joggers' },
    ],
    'Shoes': [
      { name: 'Sneakers', type: 'Sneakers' },
      { name: 'Heels', type: 'Heels' },
      { name: 'Boots', type: 'Boots' },
      { name: 'Sandals', type: 'Sandals' },
      { name: 'Flats', type: 'Flats' },
      { name: 'Loafers', type: 'Loafers' },
    ],
    'Accessories': [
      { name: 'Bags', type: 'Bags' },
      { name: 'Jewelry', type: 'Jewelry' },
      { name: 'Belts', type: 'Belts' },
      { name: 'Scarves', type: 'Scarves' },
      { name: 'Hats', type: 'Hats' },
      { name: 'Sunglasses', type: 'Sunglasses' },
    ],
  };

  const [customSubcategories, setCustomSubcategories] = useState<{[key: string]: any[]}>({
    'Tops': [],
    'Bottoms': [],
    'Shoes': [],
    'Accessories': [],
  });

  // Merge base and custom subcategories
  const categoryData: {[key: string]: { name: string, type: string }[]} = {
    'Tops': [...baseCategoryData['Tops'], ...customSubcategories['Tops'].map(sub => ({ name: sub.name, type: sub.type }))],
    'Bottoms': [...baseCategoryData['Bottoms'], ...customSubcategories['Bottoms'].map(sub => ({ name: sub.name, type: sub.type }))],
    'Shoes': [...baseCategoryData['Shoes'], ...customSubcategories['Shoes'].map(sub => ({ name: sub.name, type: sub.type }))],
    'Accessories': [...baseCategoryData['Accessories'], ...customSubcategories['Accessories'].map(sub => ({ name: sub.name, type: sub.type }))],
  };

  const occasionOptions = ['Birthdays', 'Weddings', 'Work', 'Casual', 'Party', 'Sports'];
  const weatherOptions = ['Sunny', 'Rainy', 'Cold', 'Warm', 'Cloudy'];
  const styleOptions = ['Casual', 'Formal', 'Sporty', 'Vintage', 'Minimalist', 'Streetwear'];
  const colorOptions = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Brown', 'Gray', 'Maroon', 'Khaki', 'Cream', 'Orange'];

  const handleAddToWardrobe = (): void => {
    setShowWardrobeModal(true);
  };

  const handlePostToMarketplace = (): void => {
    setMarketplaceModal(true);
  };

  const handleCategorySelect = (category: string): void => {
    setSelectedCategory(category);
    // Clear subcategories when changing main category
    if (selectedCategory !== category) {
      setSelectedSubcategories([]);
    }
  };

  const handleSubcategorySelect = (subcategory: { name: string, type: string }): void => {
    if (!selectedSubcategories.some(s => s.type === subcategory.type)) {
      setSelectedSubcategories([...selectedSubcategories, subcategory]);
    } else {
      setSelectedSubcategories(selectedSubcategories.filter(s => s.type !== subcategory.type));
    }
  };

  const handleOccasionSelect = (occasion: string): void => {
    if (occasions.includes(occasion)) {
      setOccasions(occasions.filter(o => o !== occasion));
    } else {
      setOccasions([...occasions, occasion]);
    }
  };

  const handleWeatherSelect = (weather: string): void => {
    if (selectedWeather === weather) {
      setSelectedWeather('');
    } else {
      setSelectedWeather(weather);
    }
  };

  const handleStyleSelect = (style: string): void => {
    if (selectedStyle === style) {
      setSelectedStyle('');
    } else {
      setSelectedStyle(style);
    }
  };

  const handleColorSelect = (color: string): void => {
    if (selectedColor === color) {
      setSelectedColor('');
    } else {
      setSelectedColor(color);
    }
  };

  const handleMarketplaceSubmit = async (): Promise<void> => {
    if (!marketplaceName.trim() || !marketplaceDescription.trim() || !marketplacePrice.trim()) {
      Alert.alert('Error', 'Please fill in all marketplace fields');
      return;
    }

    setLoading(true);
    try {
      if (!normalizedImageUri) throw new Error('No image found');
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token from AsyncStorage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

      const cloudinaryImageUrl = await getOptimizedImageUrl(
        normalizedImageUri,
        'glamora/marketplace',
        token,
      );

      // Final validation: ensure we have a valid web URL
      if (!cloudinaryImageUrl || (!cloudinaryImageUrl.startsWith('http://') && !cloudinaryImageUrl.startsWith('https://'))) {
        console.error('❌ Invalid image URL after upload:', cloudinaryImageUrl?.substring(0, 50));
        setLoading(false);
        Alert.alert('Error', 'Invalid image URL. Please try selecting the image again.');
        return;
      }

      const response = await fetch(API_ENDPOINTS.addMarketplaceItem, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: cloudinaryImageUrl,
          name: marketplaceName.trim(),
          description: marketplaceDescription.trim(),
          price: parseFloat(marketplacePrice),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to post to marketplace.';
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

      try {
        await response.json();
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }

      setLoading(false);
      setMarketplaceModal(false);
      console.log('✅ Item posted to marketplace successfully!');
      console.log('🧭 Navigating to marketplace...');
      
      // Navigate immediately without Alert
      setTimeout(() => {
        console.log('🧭 Navigating to marketplace now...');
        router.push('/marketplace');
      }, 500);
      
    Alert.alert('Pending Review', 'Your item has been submitted for admin approval. It will be visible in the marketplace once approved.');
    } catch (error: any) {
      setLoading(false);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to post to marketplace');
      }
    }
  };

  const handleFinalSubmit = async (): Promise<void> => {
    if (!clothName.trim()) {
      Alert.alert('Error', 'Please enter a name for the clothing item.');
      return;
    }

    setLoading(true);
    try {
      if (!normalizedImageUri) throw new Error('No image found');
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token from AsyncStorage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      console.log('📡 Making request to:', API_ENDPOINTS.addWardrobeItem);
      
      const cloudinaryImageUrl = await getOptimizedImageUrl(
        normalizedImageUri,
        'glamora/wardrobe',
        token,
      );
      
      // Save to wardrobe with optimized image URL
      const response = await fetch(API_ENDPOINTS.addWardrobeItem, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: cloudinaryImageUrl, // Use Cloudinary optimized URL
          clothName: clothName.trim(),
          description: description.trim(),
          categories: selectedSubcategories.map(s => s.type),
          occasions,
          category: selectedCategory,
          weather: selectedWeather,
          style: selectedStyle,
          color: selectedColor,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save item.';
        let errorData: any = {};
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          errorMessage = `Server error: ${response.status}`;
        }
        
        // Check if it's a subscription limit error
        if (response.status === 403 && errorData.limitReached) {
          Alert.alert(
            'Storage Limit Reached',
            errorMessage,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Subscribe to PLUS',
                onPress: () => router.push('/premium'),
                style: 'default'
              }
            ]
          );
          return;
        }
        
        throw new Error(errorMessage);
      }

      try {
        await response.json();
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }
      
      setLoading(false);
      console.log('✅ Item saved successfully!');
      console.log('🧭 Navigating to wardrobe page...');
      
      // Navigate immediately without Alert
      setTimeout(() => {
        console.log('🧭 Navigating to wardrobe now...');
        router.push('/wardrobe');
      }, 500);
      
      Alert.alert('Success', 'Clothing item saved successfully!');
    } catch (error: any) {
      setLoading(false);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to save item');
      }
    }
  };

  const fetchMarketplaceItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.getMarketplaceItems);
      
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
        console.log('Marketplace fetch successful:', data);
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
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
  };

  const fetchCustomSubcategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const categories = ['Tops', 'Bottoms', 'Shoes', 'Accessories'];
      const fetched: {[key: string]: any[]} = {
        'Tops': [],
        'Bottoms': [],
        'Shoes': [],
        'Accessories': [],
      };

      for (const category of categories) {
        try {
          const response = await fetch(API_ENDPOINTS.subcategories(category), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            fetched[category] = data.subcategories || [];
          }
        } catch (error) {
          console.error(`Error fetching custom subcategories for ${category}:`, error);
        }
      }

      setCustomSubcategories(fetched);
    } catch (error) {
      console.error('Error fetching custom subcategories:', error);
    }
  };

  useEffect(() => {
    fetchCustomSubcategories();
  }, []);

  useEffect(() => {
    fetchMarketplaceItems();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/wardrobe')}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GLAMORA SCAN</Text>
        <View style={styles.placeholder} />
      </View>
      {/* Image Display - always below header */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: normalizedImageUri as string }} style={styles.image} />
      </View>
      {loading && (
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' }}>
          {/* <ActivityIndicator size="large" color="#007AFF" /> */}
        </View>
      )}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form Section */}
        <View style={styles.formContainer}>
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Cloth name</Text>
            <TextInput
              style={styles.input}
              value={clothName}
              onChangeText={setClothName}
              placeholder="Enter cloth name"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>
          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddToWardrobe}>
              <Text style={styles.buttonText}>Add to Wardrobe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handlePostToMarketplace}>
              <Text style={styles.buttonText}>Post to Marketplace</Text>
            </TouchableOpacity>
          </View>
          
          {/* Show selected category info and save button */}
          {selectedCategory && selectedSubcategories.length > 0 && (
            <View style={styles.selectedCategoryContainer}>
              <Text style={styles.selectedCategoryText}>
                Selected: {selectedCategory} &apos;n {selectedSubcategories.map(sub => 
                  categoryData[selectedCategory as keyof typeof categoryData]?.find(s => s.type === sub.type)?.name
                ).join(', ')}
              </Text>
              {occasions.length > 0 && (
                <Text style={styles.selectedOccasionText}>
                  Occasions: {occasions.join(', ')}
                </Text>
              )}
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleFinalSubmit}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save Item'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Unified Add to Wardrobe Modal */}
      <Modal visible={showWardrobeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.wardrobeModalContent}>
            <View style={styles.wardrobeModalHeader}>
              <Text style={styles.wardrobeModalTitle}>ADD TO WARDROBE</Text>
              <TouchableOpacity onPress={() => setShowWardrobeModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.wardrobeModalScroll} showsVerticalScrollIndicator={false}>
              {/* SELECT WARDROBE */}
              <View style={styles.wardrobeSection}>
                <Text style={styles.wardrobeSectionTitle}>SELECT WARDROBE</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {Object.keys(categoryData).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.wardrobeButton,
                        selectedCategory === category && styles.wardrobeButtonSelected
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        selectedCategory === category && styles.wardrobeButtonTextSelected
                      ]}>
                        {category.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT CATEGORIES */}
              {selectedCategory && (
                <View style={styles.wardrobeSection}>
                  <Text style={styles.wardrobeSectionTitle}>SELECT CATEGORIES</Text>
                  <View style={styles.wardrobeButtonContainer}>
                    {categoryData[selectedCategory as keyof typeof categoryData]?.map((subcategory) => (
                      <TouchableOpacity
                        key={subcategory.type}
                        style={[
                          styles.wardrobeButton,
                          selectedSubcategories.some(s => s.type === subcategory.type) && styles.wardrobeButtonSelected
                        ]}
                        onPress={() => handleSubcategorySelect(subcategory)}
                      >
                        <Text style={[
                          styles.wardrobeButtonText,
                          selectedSubcategories.some(s => s.type === subcategory.type) && styles.wardrobeButtonTextSelected
                        ]}>
                          {subcategory.name.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* SELECT OCCASION */}
              <View style={styles.wardrobeSection}>
                <Text style={styles.wardrobeSectionTitle}>SELECT OCCASION</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {occasionOptions.map((occasion) => (
                    <TouchableOpacity
                      key={occasion}
                      style={[
                        styles.wardrobeButton,
                        occasions.includes(occasion) && styles.wardrobeButtonSelected
                      ]}
                      onPress={() => handleOccasionSelect(occasion)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        occasions.includes(occasion) && styles.wardrobeButtonTextSelected
                      ]}>
                        {occasion.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT WEATHER */}
              <View style={styles.wardrobeSection}>
                <Text style={styles.wardrobeSectionTitle}>SELECT WEATHER</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {weatherOptions.map((weather) => (
                    <TouchableOpacity
                      key={weather}
                      style={[
                        styles.wardrobeButton,
                        selectedWeather === weather && styles.wardrobeButtonSelected
                      ]}
                      onPress={() => handleWeatherSelect(weather)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        selectedWeather === weather && styles.wardrobeButtonTextSelected
                      ]}>
                        {weather.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT STYLE */}
              <View style={styles.wardrobeSection}>
                <Text style={styles.wardrobeSectionTitle}>SELECT STYLE</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {styleOptions.map((style) => (
                    <TouchableOpacity
                      key={style}
                      style={[
                        styles.wardrobeButton,
                        selectedStyle === style && styles.wardrobeButtonSelected
                      ]}
                      onPress={() => handleStyleSelect(style)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        selectedStyle === style && styles.wardrobeButtonTextSelected
                      ]}>
                        {style.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT COLOR */}
              <View style={styles.wardrobeSection}>
                <Text style={styles.wardrobeSectionTitle}>SELECT COLOR</Text>
                <View style={styles.wardrobeColorGrid}>
                  {colorOptions.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.wardrobeColorButton,
                        selectedColor === color && styles.wardrobeColorButtonSelected
                      ]}
                      onPress={() => handleColorSelect(color)}
                    >
                      <Text style={[
                        styles.wardrobeColorButtonText,
                        selectedColor === color && styles.wardrobeColorButtonTextSelected
                      ]}>
                        {color.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.wardrobeConfirmButton} 
              onPress={() => {
                setShowWardrobeModal(false);
              }}
            >
              <Text style={styles.wardrobeConfirmButtonText}>CONFIRM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Marketplace Modal */}
      <Modal visible={showMarketplaceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post to Marketplace</Text>
              <TouchableOpacity onPress={() => setMarketplaceModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.marketplaceForm}>
              <Text style={styles.inputLabel}>Item Name</Text>
              <TextInput
                style={styles.marketplaceInput}
                value={marketplaceName}
                onChangeText={setMarketplaceName}
                placeholder="Enter item name"
                placeholderTextColor="#999"
              />
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.marketplaceInput, styles.marketplaceTextarea]}
                value={marketplaceDescription}
                onChangeText={setMarketplaceDescription}
                placeholder="Enter description"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
              
              <Text style={styles.inputLabel}>Price (₱)</Text>
              <TextInput
                style={styles.marketplaceInput}
                value={marketplacePrice}
                onChangeText={setMarketplacePrice}
                placeholder="Enter price"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity 
              style={styles.marketplaceSubmitButton} 
              onPress={handleMarketplaceSubmit}
              disabled={loading}
            >
              <Text style={styles.marketplaceSubmitText}>
                {loading ? 'Posting...' : 'Post to Marketplace'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    backgroundColor: '#F5E6D3',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  image: {
    width: '90%',
    height: 200,
    borderRadius: 10,
  },
  formContainer: {
    margin: 20,
    backgroundColor: '#FDE6D6',
    borderRadius: 16,
    padding: 16,
  },
  inputSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 5,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#333',
    fontSize: 16,
    padding: 4,
    color: '#333',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#FFE8C8',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  optionsContainer: {
    width: '100%',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOption: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 15,
    marginBottom: 5,
    color: '#555',
  },
  modalButton: {
    backgroundColor: '#FFE8C8',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  modalButtonText: {
    fontWeight: 'bold',
    color: '#333',
  },
  selectedCategoryContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#FFE8C8',
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedCategoryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedOccasionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  marketplaceForm: {
    width: '100%',
    marginTop: 15,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  marketplaceInput: {
    borderBottomWidth: 1,
    borderColor: '#333',
    fontSize: 16,
    padding: 4,
    color: '#333',
    marginBottom: 15,
  },
  marketplaceTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  marketplaceSubmitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  marketplaceSubmitText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  // Unified Wardrobe Modal Styles
  wardrobeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    paddingBottom: 20,
  },
  wardrobeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  wardrobeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 1,
  },
  wardrobeModalScroll: {
    maxHeight: '70%',
    paddingHorizontal: 20,
  },
  wardrobeSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  wardrobeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  wardrobeButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  wardrobeButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  wardrobeButtonSelected: {
    backgroundColor: '#FFE8C8',
    borderColor: '#FFB84D',
  },
  wardrobeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
  },
  wardrobeButtonTextSelected: {
    color: '#333',
    fontWeight: '700',
  },
  wardrobeColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  wardrobeColorButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 80,
  },
  wardrobeColorButtonSelected: {
    backgroundColor: '#FFE8C8',
    borderColor: '#FFB84D',
  },
  wardrobeColorButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  wardrobeColorButtonTextSelected: {
    color: '#333',
    fontWeight: '700',
  },
  wardrobeConfirmButton: {
    backgroundColor: '#FFB84D',
    borderRadius: 25,
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardrobeConfirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
}); 