import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from './contexts/ThemeContext';

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
  const { theme } = useTheme();
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
  // New fields for redesigned UI
  const [marketplaceColor, setMarketplaceColor] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedSizes, setSelectedSizes] = useState<{
    tops: string[];
    bottoms: string[];
    shoes: string[];
  }>({ tops: [], bottoms: [], shoes: [] });
  const [isAccessories, setIsAccessories] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [currentSizeChart, setCurrentSizeChart] = useState<'tops' | 'bottoms-shorts' | 'shoes' | null>(null);

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
  const marketplaceColorOptions = ['BLACK', 'WHITE', 'BLUE', 'RED', 'GREEN', 'YELLOW', 'PINK', 'PURPLE', 'BROWN', 'GRAY', 'MAROON', 'KHAKI', 'ORANGE'];
  const genderOptions = ['MAN', 'WOMAN', 'UNISEX'];
  const sizeOptions = {
    tops: ['XS', 'XS', 'M', 'L', 'XL', 'XXL'],
    bottoms: ['XS', 'XS', 'M', 'L', 'XL', 'XXL'],
    shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
  };

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

  const handleMarketplaceColorSelect = (color: string): void => {
    if (marketplaceColor === color) {
      setMarketplaceColor('');
    } else {
      setMarketplaceColor(color);
    }
  };

  const handleGenderSelect = (gender: string): void => {
    if (selectedGender === gender) {
      setSelectedGender('');
    } else {
      setSelectedGender(gender);
    }
  };

  const handleSizeToggle = (category: 'tops' | 'bottoms' | 'shoes', size: string): void => {
    setSelectedSizes(prev => {
      const categorySizes = prev[category];
      if (categorySizes.includes(size)) {
        return {
          ...prev,
          [category]: categorySizes.filter(s => s !== size)
        };
      } else {
        return {
          ...prev,
          [category]: [...categorySizes, size]
        };
      }
    });
  };

  const handleMarketplaceSubmit = async (): Promise<void> => {
    if (!marketplaceName.trim() || !marketplaceDescription.trim() || !marketplacePrice.trim()) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Description, Price)');
      return;
    }

    // Validate new required fields
    if (!marketplaceColor) {
      Alert.alert('Error', 'Please select a product color');
      return;
    }
    if (!selectedGender) {
      Alert.alert('Error', 'Please select a gender');
      return;
    }
    // Check if at least one size category is selected (unless it's accessories)
    if (!isAccessories && selectedSizes.tops.length === 0 && selectedSizes.bottoms.length === 0 && selectedSizes.shoes.length === 0) {
      Alert.alert('Error', 'Please select at least one size for TOP, BOTTOM, or SHOE');
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
          color: marketplaceColor,
          gender: selectedGender,
          sizes: selectedSizes,
          isAccessories: isAccessories,
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
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/wardrobe')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>GLAMORA SCAN</Text>
        <View style={styles.placeholder} />
      </View>
      {/* Image Display - always below header */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: normalizedImageUri as string }} style={styles.image} />
      </View>
      {loading && (
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' }}>
          {/* <ActivityIndicator size="large" color={theme.colors.accent} /> */}
        </View>
      )}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form Section */}
        <View style={[styles.formContainer, { backgroundColor: theme.colors.containerBackground }]}>
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Cloth name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
              value={clothName}
              onChangeText={setClothName}
              placeholder="Enter cloth name"
              placeholderTextColor={theme.colors.secondaryText}
            />
          </View>
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a description..."
              placeholderTextColor={theme.colors.secondaryText}
              multiline
              numberOfLines={4}
            />
          </View>
          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={handleAddToWardrobe}>
              <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Add to Wardrobe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={handlePostToMarketplace}>
              <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>Post to Marketplace</Text>
            </TouchableOpacity>
          </View>
          
          {/* Show selected category info and save button */}
          {selectedCategory && selectedSubcategories.length > 0 && (
            <View style={[styles.selectedCategoryContainer, { backgroundColor: theme.colors.buttonBackground }]}>
              <Text style={[styles.selectedCategoryText, { color: theme.colors.buttonText }]}>
                Selected: {selectedCategory} &apos;n {selectedSubcategories.map(sub => 
                  categoryData[selectedCategory as keyof typeof categoryData]?.find(s => s.type === sub.type)?.name
                ).join(', ')}
              </Text>
              {occasions.length > 0 && (
                <Text style={[styles.selectedOccasionText, { color: theme.colors.buttonText }]}>
                  Occasions: {occasions.join(', ')}
                </Text>
              )}
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: theme.colors.accent }]} 
                onPress={handleFinalSubmit}
                disabled={loading}
              >
                <Text style={[styles.saveButtonText, { color: theme.colors.buttonText }]}>
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
          <View style={[styles.wardrobeModalContent, { backgroundColor: theme.colors.containerBackground }]}>
            <View style={styles.wardrobeModalHeader}>
              <Text style={[styles.wardrobeModalTitle, { color: theme.colors.primaryText }]}>ADD TO WARDROBE</Text>
              <TouchableOpacity onPress={() => setShowWardrobeModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.icon} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.wardrobeModalScroll} showsVerticalScrollIndicator={false}>
              {/* SELECT WARDROBE */}
              <View style={styles.wardrobeSection}>
                <Text style={[styles.wardrobeSectionTitle, { color: theme.colors.primaryText }]}>SELECT WARDROBE</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {Object.keys(categoryData).map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.wardrobeButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        selectedCategory === category && [styles.wardrobeButtonSelected, { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        { color: theme.colors.secondaryText },
                        selectedCategory === category && [styles.wardrobeButtonTextSelected, { color: theme.colors.buttonText }]
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
                  <Text style={[styles.wardrobeSectionTitle, { color: theme.colors.primaryText }]}>SELECT CATEGORIES</Text>
                  <View style={styles.wardrobeButtonContainer}>
                    {categoryData[selectedCategory as keyof typeof categoryData]?.map((subcategory) => (
                      <TouchableOpacity
                        key={subcategory.type}
                        style={[
                          styles.wardrobeButton,
                          { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                          selectedSubcategories.some(s => s.type === subcategory.type) && [styles.wardrobeButtonSelected, { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.accent }]
                        ]}
                        onPress={() => handleSubcategorySelect(subcategory)}
                      >
                        <Text style={[
                          styles.wardrobeButtonText,
                          { color: theme.colors.secondaryText },
                          selectedSubcategories.some(s => s.type === subcategory.type) && [styles.wardrobeButtonTextSelected, { color: theme.colors.buttonText }]
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
                <Text style={[styles.wardrobeSectionTitle, { color: theme.colors.primaryText }]}>SELECT OCCASION</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {occasionOptions.map((occasion) => (
                    <TouchableOpacity
                      key={occasion}
                      style={[
                        styles.wardrobeButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        occasions.includes(occasion) && [styles.wardrobeButtonSelected, { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleOccasionSelect(occasion)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        { color: theme.colors.secondaryText },
                        occasions.includes(occasion) && [styles.wardrobeButtonTextSelected, { color: theme.colors.buttonText }]
                      ]}>
                        {occasion.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT WEATHER */}
              <View style={styles.wardrobeSection}>
                <Text style={[styles.wardrobeSectionTitle, { color: theme.colors.primaryText }]}>SELECT WEATHER</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {weatherOptions.map((weather) => (
                    <TouchableOpacity
                      key={weather}
                      style={[
                        styles.wardrobeButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        selectedWeather === weather && [styles.wardrobeButtonSelected, { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleWeatherSelect(weather)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        { color: theme.colors.secondaryText },
                        selectedWeather === weather && [styles.wardrobeButtonTextSelected, { color: theme.colors.buttonText }]
                      ]}>
                        {weather.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT STYLE */}
              <View style={styles.wardrobeSection}>
                <Text style={[styles.wardrobeSectionTitle, { color: theme.colors.primaryText }]}>SELECT STYLE</Text>
                <View style={styles.wardrobeButtonContainer}>
                  {styleOptions.map((style) => (
                    <TouchableOpacity
                      key={style}
                      style={[
                        styles.wardrobeButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        selectedStyle === style && [styles.wardrobeButtonSelected, { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleStyleSelect(style)}
                    >
                      <Text style={[
                        styles.wardrobeButtonText,
                        { color: theme.colors.secondaryText },
                        selectedStyle === style && [styles.wardrobeButtonTextSelected, { color: theme.colors.buttonText }]
                      ]}>
                        {style.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* SELECT COLOR */}
              <View style={styles.wardrobeSection}>
                <Text style={[styles.wardrobeSectionTitle, { color: theme.colors.primaryText }]}>SELECT COLOR</Text>
                <View style={styles.wardrobeColorGrid}>
                  {colorOptions.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.wardrobeColorButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        selectedColor === color && [styles.wardrobeColorButtonSelected, { backgroundColor: theme.colors.buttonBackground, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleColorSelect(color)}
                    >
                      <Text style={[
                        styles.wardrobeColorButtonText,
                        { color: theme.colors.secondaryText },
                        selectedColor === color && [styles.wardrobeColorButtonTextSelected, { color: theme.colors.buttonText }]
                      ]}>
                        {color.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.wardrobeConfirmButton, { backgroundColor: theme.colors.buttonBackground }]} 
              onPress={() => {
                setShowWardrobeModal(false);
              }}
            >
              <Text style={[styles.wardrobeConfirmButtonText, { color: theme.colors.buttonText }]}>CONFIRM</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Marketplace Modal - Redesigned */}
      <Modal visible={showMarketplaceModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            style={styles.marketplaceModalScroll}
            contentContainerStyle={styles.marketplaceModalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={[styles.marketplaceModalContent, { backgroundColor: theme.colors.containerBackground }]}>
              {/* Header */}
              <View style={styles.postingDetailsHeader}>
                <TouchableOpacity onPress={() => setMarketplaceModal(false)}>
                  <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
                </TouchableOpacity>
                <Text style={[styles.postingDetailsTitle, { color: theme.colors.primaryText }]}>POSTING DETAILS</Text>
                <View style={{ width: 24 }} />
              </View>

              {/* Name Field */}
              <View style={styles.postingField}>
                <Text style={[styles.postingLabel, { color: theme.colors.primaryText }]}>
                  Name<Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.postingInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
                  value={marketplaceName}
                  onChangeText={setMarketplaceName}
                  placeholder="Enter item name"
                  placeholderTextColor={theme.colors.secondaryText}
                />
              </View>

              {/* Description Field */}
              <View style={styles.postingField}>
                <Text style={[styles.postingLabel, { color: theme.colors.primaryText }]}>
                  Description<Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.postingTextarea, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
                  value={marketplaceDescription}
                  onChangeText={setMarketplaceDescription}
                  placeholder="Enter description"
                  placeholderTextColor={theme.colors.secondaryText}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Price Field */}
              <View style={styles.postingField}>
                <Text style={[styles.postingLabel, { color: theme.colors.primaryText }]}>
                  Price<Text style={{ color: 'red' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.postingInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
                  value={marketplacePrice}
                  onChangeText={setMarketplacePrice}
                  placeholder="Enter price"
                  placeholderTextColor={theme.colors.secondaryText}
                  keyboardType="numeric"
                />
              </View>

              {/* PRODUCT COLOR Section */}
              <View style={styles.postingSection}>
                <Text style={[styles.postingSectionTitle, { color: theme.colors.primaryText }]}>
                  PRODUCT COLOR<Text style={{ color: 'red' }}>*</Text>
                </Text>
                <View style={styles.colorGrid}>
                  {marketplaceColorOptions.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        marketplaceColor === color && [styles.colorButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleMarketplaceColorSelect(color)}
                    >
                      <Text style={[
                        styles.colorButtonText,
                        { color: theme.colors.secondaryText },
                        marketplaceColor === color && { color: theme.colors.buttonText }
                      ]}>
                        {color}
                      </Text>
                    </TouchableOpacity>
                    ))}
                  </View>
              </View>

              {/* GENDER Section */}
              <View style={styles.postingSection}>
                <Text style={[styles.postingSectionTitle, { color: theme.colors.primaryText }]}>
                  GENDER<Text style={{ color: 'red' }}>*</Text>
                </Text>
                <View style={styles.genderContainer}>
                  {genderOptions.map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles.genderButton,
                        { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                        selectedGender === gender && [styles.genderButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                      ]}
                      onPress={() => handleGenderSelect(gender)}
                    >
                      <Text style={[
                        styles.genderButtonText,
                        { color: theme.colors.secondaryText },
                        selectedGender === gender && { color: theme.colors.buttonText }
                      ]}>
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* PRODUCT SIZE Section */}
              <View style={styles.postingSection}>
                <Text style={[styles.postingSectionTitle, { color: theme.colors.primaryText }]}>
                  PRODUCT SIZE<Text style={{ color: 'red' }}>*</Text>
                </Text>
                
                {/* TOP */}
                <View style={styles.sizeCategoryRow}>
                  <View style={styles.sizeCategoryHeader}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => handleSizeCategoryToggle('tops')}
                    >
                      {selectedSizes.tops.length > 0 && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.sizeCategoryLabel, { color: theme.colors.primaryText }]}>TOP</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentSizeChart('tops');
                        setShowSizeChart(true);
                      }}
                      style={styles.sizeChartIcon}
                    >
                      <Ionicons name="help-circle-outline" size={20} color={theme.colors.accent} />
                    </TouchableOpacity>
                  </View>
                  {selectedSizes.tops.length > 0 && (
                    <View style={styles.sizeOptionsContainer}>
                      {sizeOptions.tops.map((size) => (
                        <TouchableOpacity
                          key={`tops-${size}`}
                          style={[
                            styles.sizeOptionButton,
                            { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                            selectedSizes.tops.includes(size) && [styles.sizeOptionButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                          ]}
                          onPress={() => handleSizeToggle('tops', size)}
                        >
                          <Text style={[
                            styles.sizeOptionText,
                            { color: theme.colors.secondaryText },
                            selectedSizes.tops.includes(size) && { color: theme.colors.buttonText }
                          ]}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* BOTTOM */}
                <View style={styles.sizeCategoryRow}>
                  <View style={styles.sizeCategoryHeader}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => handleSizeCategoryToggle('bottoms')}
                    >
                      {selectedSizes.bottoms.length > 0 && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.sizeCategoryLabel, { color: theme.colors.primaryText }]}>BOTTOM</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentSizeChart('bottoms-shorts');
                        setShowSizeChart(true);
                      }}
                      style={styles.sizeChartIcon}
                    >
                      <Ionicons name="help-circle-outline" size={20} color={theme.colors.accent} />
                    </TouchableOpacity>
                  </View>
                  {selectedSizes.bottoms.length > 0 && (
                    <View style={styles.sizeOptionsContainer}>
                      {sizeOptions.bottoms.map((size) => (
                        <TouchableOpacity
                          key={`bottoms-${size}`}
                          style={[
                            styles.sizeOptionButton,
                            { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                            selectedSizes.bottoms.includes(size) && [styles.sizeOptionButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                          ]}
                          onPress={() => handleSizeToggle('bottoms', size)}
                        >
                          <Text style={[
                            styles.sizeOptionText,
                            { color: theme.colors.secondaryText },
                            selectedSizes.bottoms.includes(size) && { color: theme.colors.buttonText }
                          ]}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* SHOE */}
                <View style={styles.sizeCategoryRow}>
                  <View style={styles.sizeCategoryHeader}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => handleSizeCategoryToggle('shoes')}
                    >
                      {selectedSizes.shoes.length > 0 && (
                        <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                    <Text style={[styles.sizeCategoryLabel, { color: theme.colors.primaryText }]}>SHOE</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentSizeChart('shoes');
                        setShowSizeChart(true);
                      }}
                      style={styles.sizeChartIcon}
                    >
                      <Ionicons name="help-circle-outline" size={20} color={theme.colors.accent} />
                    </TouchableOpacity>
                  </View>
                  {selectedSizes.shoes.length > 0 && (
                    <View style={styles.sizeOptionsContainer}>
                      {sizeOptions.shoes.map((size) => (
                        <TouchableOpacity
                          key={`shoes-${size}`}
                          style={[
                            styles.sizeOptionButton,
                            { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border },
                            selectedSizes.shoes.includes(size) && [styles.sizeOptionButtonSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
                          ]}
                          onPress={() => handleSizeToggle('shoes', size)}
                        >
                          <Text style={[
                            styles.sizeOptionText,
                            { color: theme.colors.secondaryText },
                            selectedSizes.shoes.includes(size) && { color: theme.colors.buttonText }
                          ]}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* ACCESSORIES */}
              <View style={styles.postingSection}>
                <View style={styles.accessoriesRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setIsAccessories(!isAccessories)}
                  >
                    {isAccessories && (
                      <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
                    )}
                  </TouchableOpacity>
                  <Text style={[styles.accessoriesLabel, { color: theme.colors.primaryText }]}>ACCESSORIES</Text>
                </View>
                <Text style={[styles.accessoriesNote, { color: theme.colors.secondaryText }]}>
                  Accessories do not have a single, required standard size.
                </Text>
              </View>

              {/* Required Note */}
              <Text style={[styles.requiredNote, { color: 'red' }]}>
                * required and must fulfill
              </Text>

              {/* POST Button */}
              <TouchableOpacity 
                style={[styles.postButton, { backgroundColor: theme.colors.accent }]} 
                onPress={handleMarketplaceSubmit}
                disabled={loading}
              >
                <Text style={[styles.postButtonText, { color: theme.colors.buttonText }]}>
                  {loading ? 'POSTING...' : 'POST'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </KeyboardAvoidingView>

        {/* Size Chart Modal */}
        <Modal visible={showSizeChart} transparent animationType="fade">
          <View style={styles.chartModalOverlay}>
            <View style={[styles.chartModalContent, { backgroundColor: theme.colors.containerBackground }]}>
              <TouchableOpacity
                style={styles.chartCloseButton}
                onPress={() => {
                  setShowSizeChart(false);
                  setCurrentSizeChart(null);
                }}
              >
                <Ionicons name="close" size={24} color={theme.colors.icon} />
              </TouchableOpacity>
              
              {currentSizeChart === 'bottoms-shorts' ? (
                <View style={styles.chartModalImageContainer}>
                  <Image
                    source={require('../assets/pants-chart.png')}
                    style={styles.chartImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.chartModalImageContainer}>
                  {currentSizeChart === 'tops' && (
                    <Image
                      source={require('../assets/tops-chart.png')}
                      style={styles.chartImage}
                      resizeMode="contain"
                    />
                  )}
                  
                  {currentSizeChart === 'shoes' && (
                    <Image
                      source={require('../assets/shoes-chart.png')}
                      style={styles.chartImage}
                      resizeMode="contain"
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
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
    fontSize: 16,
    padding: 4,
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
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  selectedOption: {
    borderRadius: 8,
  },
  selectedOptionText: {
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: 15,
    marginBottom: 5,
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  modalButtonText: {
    fontWeight: 'bold',
  },
  selectedCategoryContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FFE8C8', // Keep default for backward compatibility
  },
  selectedCategoryText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  saveButtonText: {
    fontWeight: 'bold',
  },
  selectedOccasionText: {
    fontSize: 16,
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
  },
  marketplaceInput: {
    borderBottomWidth: 1,
    fontSize: 16,
    padding: 4,
    marginBottom: 15,
  },
  marketplaceTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  marketplaceSubmitButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    marginTop: 20,
  },
  marketplaceSubmitText: {
    fontWeight: 'bold',
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
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  wardrobeButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  wardrobeButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    marginHorizontal: 5,
    borderWidth: 1,
  },
  wardrobeButtonSelected: {
  },
  wardrobeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  wardrobeButtonTextSelected: {
    fontWeight: '700',
  },
  wardrobeColorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  wardrobeColorButton: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    minWidth: 80,
  },
  wardrobeColorButtonSelected: {
  },
  wardrobeColorButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  wardrobeColorButtonTextSelected: {
    fontWeight: '700',
  },
  wardrobeConfirmButton: {
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
    letterSpacing: 1,
  },
  // New Marketplace Modal Styles
  marketplaceModalScroll: {
    flex: 1,
  },
  marketplaceModalScrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  marketplaceModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    marginHorizontal: Platform.OS === 'web' ? 0 : 10,
  },
  postingDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  postingDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  postingDetailsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postingField: {
    marginBottom: 20,
  },
  postingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  postingInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  postingTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  postingSection: {
    marginBottom: 24,
  },
  postingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  colorButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    minWidth: 80,
  },
  colorButtonSelected: {
    borderWidth: 2,
  },
  colorButtonAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  colorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  genderButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    margin: 4,
    borderWidth: 1,
    flex: 1,
  },
  genderButtonSelected: {
    borderWidth: 2,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sizeCategoryRow: {
    marginBottom: 16,
  },
  sizeCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeCategoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sizeChartIcon: {
    padding: 4,
  },
  sizeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 32,
    marginTop: 8,
    marginHorizontal: -4,
  },
  sizeOptionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    margin: 4,
    borderWidth: 1,
    minWidth: 50,
  },
  sizeOptionButtonSelected: {
    borderWidth: 2,
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  accessoriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessoriesLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  accessoriesNote: {
    fontSize: 14,
    marginLeft: 32,
    fontStyle: 'italic',
  },
  requiredNote: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  postButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  postButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Chart Modal Styles
  chartModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 10 : 5,
    paddingVertical: Platform.OS === 'web' ? 20 : 15,
  },
  chartModalContent: {
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    padding: 6,
    paddingTop: Platform.OS === 'web' ? 36 : 34,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  chartCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 6 : 8,
    right: Platform.OS === 'web' ? 6 : 8,
    zIndex: 10,
    padding: Platform.OS === 'web' ? 6 : 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  chartModalScrollView: {
    width: '100%',
    flex: 1,
  },
  chartModalScrollContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  chartModalImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: 0,
  },
  chartImage: {
    width: '95%',
    maxWidth: 380,
    height: undefined,
    alignSelf: 'center',
    aspectRatio: undefined,
    marginHorizontal: 'auto',
  },
  chartImageSecond: {
    marginTop: Platform.OS === 'web' ? 8 : 10,
  },
}); 