import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from './contexts/ThemeContext';

// Helper function to check if URI is local
const isLocalUri = (uri?: string | null): boolean => {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('data:');
};

// Helper function to upload image via backend
const uploadImageToCloudinary = async (uri: string, folder: string, token: string): Promise<string> => {
  const uploadResponse = await fetch(API_ENDPOINTS.uploadImage, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageUrl: uri,
      folder,
    }),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Image upload failed: ${errorText || 'Unknown error'}`);
  }

  const uploadResult = await uploadResponse.json();
  if (!uploadResult?.imageUrl) {
    throw new Error('Upload response missing imageUrl');
  }

  return uploadResult.imageUrl;
};

export default function ItemDetail() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const { itemId, imageUrl, clothName, description, occasion, category, weather, style, color, categories } = params;
  const itemIdStr = itemId as string;
  const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  const clothNameStr = Array.isArray(clothName) ? clothName[0] : clothName;
  const descriptionStr = Array.isArray(description) ? description[0] : description;
  const occasionStr = Array.isArray(occasion) ? occasion[0] : occasion;
  const weatherStr = Array.isArray(weather) ? weather[0] : weather;
  const categoryStr = Array.isArray(category) ? category[0] : category;
  const styleStr = Array.isArray(style) ? style[0] : style;
  const colorStr = Array.isArray(color) ? color[0] : color;
  const categoriesStr = Array.isArray(categories) ? categories[0] : categories;
  const categoriesArray = categoriesStr ? categoriesStr.split(',').filter(c => c.trim()) : [];
  const [loading, setLoading] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [showMarketModal, setShowMarketModal] = useState(false);
  const [marketName, setMarketName] = useState(clothNameStr || '');
  const [marketDesc, setMarketDesc] = useState(descriptionStr || '');
  const [marketPrice, setMarketPrice] = useState('');
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
  
  const marketplaceColorOptions = ['BLACK', 'WHITE', 'BLUE', 'RED', 'GREEN', 'YELLOW', 'PINK', 'PURPLE', 'BROWN', 'GRAY', 'MAROON', 'KHAKI', 'ORANGE'];
  const genderOptions = ['MAN', 'WOMAN', 'UNISEX'];
  const sizeOptions = {
    tops: ['XS', 'XS', 'M', 'L', 'XL', 'XXL'],
    bottoms: ['XS', 'XS', 'M', 'L', 'XL', 'XXL'],
    shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.deleteWardrobeItem(itemIdStr), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete item.';
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

      Alert.alert('Success', 'Item deleted successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to category page if we have category info, otherwise go to wardrobe
            if (categoryStr) {
              router.push({ pathname: '/category', params: { type: categoryStr } });
            } else {
              router.push('/wardrobe');
            }
          }
        }
      ]);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to delete item');
      }
    } finally {
      setLoading(false);
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

  const handleSizeCategoryToggle = (category: 'tops' | 'bottoms' | 'shoes'): void => {
    const currentSizes = selectedSizes[category];
    if (currentSizes.length > 0) {
      setSelectedSizes(prev => ({
        ...prev,
        [category]: []
      }));
    } else {
      setSelectedSizes(prev => ({
        ...prev,
        [category]: [...sizeOptions[category]]
      }));
    }
  };

  const handlePostToMarketplace = async () => {
    console.log('🎯 handlePostToMarketplace function called!');
    
    if (!marketName.trim() || !marketDesc.trim() || !marketPrice.trim()) {
      console.log('❌ Validation failed - missing fields');
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

    const price = parseFloat(marketPrice);
    if (isNaN(price) || price <= 0) {
      console.log('❌ Validation failed - invalid price:', marketPrice);
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    console.log('✅ Validation passed - proceeding with post');
    console.log('🚀 Starting marketplace post...');
    console.log('🔑 Token:', await AsyncStorage.getItem('token'));
    
    // Check if imageSrc is too long (Base64 strings can be very long)
    if (imageSrc && imageSrc.length > 10000) {
      console.log('⚠️ Image URL is very long, truncating for logging...');
      console.log('📝 Image URL length:', imageSrc.length);
      console.log('📝 Image URL preview:', imageSrc.substring(0, 100) + '...');
    } else {
      console.log('📝 Image URL:', imageSrc);
    }
    
    console.log('📝 Data being sent:', {
      name: marketName,
      description: marketDesc,
      price: price,
      imageUrlLength: imageSrc ? imageSrc.length : 0
    });
    console.log('🌐 API Endpoint:', API_ENDPOINTS.marketplace);
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Upload image to Cloudinary first if it's a local URI
      let finalImageUrl = imageSrc;
      if (imageSrc && isLocalUri(imageSrc)) {
        console.log('📤 Uploading image to Cloudinary...');
        try {
          finalImageUrl = await uploadImageToCloudinary(imageSrc, 'glamora/marketplace', token);
          console.log('✅ Image uploaded successfully:', finalImageUrl.substring(0, 50) + '...');
        } catch (uploadError: any) {
          console.error('❌ Image upload failed:', uploadError);
          setLoading(false);
          Alert.alert('Upload Error', uploadError.message || 'Failed to upload image. Please check your internet connection and try again.');
          return;
        }
      }
      
      // Final validation: ensure we have a valid web URL
      if (!finalImageUrl || (!finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://'))) {
        console.error('❌ Invalid image URL after upload:', finalImageUrl?.substring(0, 50));
        setLoading(false);
        Alert.alert('Error', 'Invalid image URL. Please try selecting the image again.');
        return;
      }
      
      console.log('📡 Making request to marketplace...');
      console.log('🔗 Full URL:', API_ENDPOINTS.marketplace);
      
      // Create request body without logging the full image URL
      const requestBody = {
        imageUrl: finalImageUrl,
        name: marketName.trim(),
        description: marketDesc.trim(),
        price: price,
        color: marketplaceColor,
        gender: selectedGender,
        sizes: selectedSizes,
        isAccessories: isAccessories,
      };
      
      console.log('📦 Request body (without image):', {
        name: requestBody.name,
        description: requestBody.description,
        price: requestBody.price,
        imageUrlLength: requestBody.imageUrl ? requestBody.imageUrl.length : 0
      });
      
      // Check if the request body would be too large
      const requestBodySize = JSON.stringify(requestBody).length;
      console.log('📏 Request body size:', requestBodySize, 'characters');
      
      if (requestBodySize > 1000000) { // 1MB limit
        console.warn('⚠️ Request body is very large, this might cause issues');
      }
      
      const response = await fetch(API_ENDPOINTS.marketplace, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        let errorMessage = 'Failed to post to marketplace.';
        try {
          const errorData = await response.json();
          console.log('❌ Error data:', errorData);
          errorMessage = errorData.message || errorMessage;
        } catch {
          const textResponse = await response.text();
          console.error('❌ Non-JSON response:', textResponse);
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = await response.json();
        console.log('Marketplace post successful:', data);
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }

      setPostSuccess(true);
      setShowMarketModal(false);
      setMarketPrice('');
      console.log('✅ Item posted to marketplace successfully!');
      console.log('🧭 Navigating to marketplace...');
      
      // Navigate immediately without Alert
      setTimeout(() => {
        console.log('🧭 Navigating to marketplace now...');
        router.push('/marketplace');
      }, 500);
      
      Alert.alert(
        'Pending Review', 
        'Your item has been submitted for admin approval. It will be visible in the marketplace once approved.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error posting to marketplace:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Error', error.message || 'Failed to post to marketplace');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!imageSrc || !clothNameStr) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <Text style={{ color: theme.colors.primaryText }}>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.headerText }]}>{categoryStr || 'Item'}</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Image source={{ uri: imageSrc }} style={[styles.image, { borderColor: theme.colors.border }]} />

        {/* Details */}
        <Text style={[styles.clothName, { color: theme.colors.primaryText }]}>{clothNameStr}</Text>
        <Text style={[styles.description, { color: theme.colors.secondaryText }]}>{descriptionStr}</Text>
        
        {/* Categories Tags */}
        {categoriesArray.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={[styles.tagSectionLabel, { color: theme.colors.primaryText }]}>Categories</Text>
            <View style={styles.tagRow}>
              {categoriesArray.map((cat, index) => (
                <View key={index} style={[styles.tagPill, { marginHorizontal: 8, marginBottom: 8, backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                  <Text style={[styles.tagText, { color: theme.colors.primaryText }]}>{cat.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tags Row */}
        <View style={styles.tagRow}>
          {occasionStr && (
            <View style={[styles.tagBlock, { marginHorizontal: 8, marginBottom: 8 }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.primaryText }]}>Occasion</Text>
              <View style={[styles.tagPill, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.tagText, { color: theme.colors.primaryText }]}>{occasionStr}</Text>
              </View>
            </View>
          )}
          {weatherStr && (
            <View style={[styles.tagBlock, { marginHorizontal: 8, marginBottom: 8 }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.primaryText }]}>Weather</Text>
              <View style={[styles.tagPill, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.tagText, { color: theme.colors.primaryText }]}>{weatherStr}</Text>
              </View>
            </View>
          )}
          {styleStr && (
            <View style={[styles.tagBlock, { marginHorizontal: 8, marginBottom: 8 }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.primaryText }]}>Style</Text>
              <View style={[styles.tagPill, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.tagText, { color: theme.colors.primaryText }]}>{styleStr}</Text>
              </View>
            </View>
          )}
          {colorStr && (
            <View style={[styles.tagBlock, { marginHorizontal: 8, marginBottom: 8 }]}>
              <Text style={[styles.tagLabel, { color: theme.colors.primaryText }]}>Color</Text>
              <View style={[styles.tagPill, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
                <Text style={[styles.tagText, { color: theme.colors.primaryText }]}>{colorStr}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Post to Marketplace Button */}
        <TouchableOpacity style={[styles.marketButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={() => {
          setShowMarketModal(true);
          setPostSuccess(false);
        }}>
          <Text style={[styles.marketButtonText, { color: theme.colors.buttonText }]}>Post to Marketplace</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Marketplace Modal - Redesigned */}
      <Modal
        visible={showMarketModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMarketModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay || 'rgba(0,0,0,0.4)' }]}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
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
                  <TouchableOpacity onPress={() => setShowMarketModal(false)}>
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
                    value={marketName}
                    onChangeText={setMarketName}
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
                    value={marketDesc}
                    onChangeText={setMarketDesc}
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
                    value={marketPrice}
                    onChangeText={setMarketPrice}
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
                  onPress={handlePostToMarketplace}
                  disabled={loading || postSuccess}
                >
                  {loading ? (
                    <Text style={[styles.postButtonText, { color: theme.colors.buttonText }]}>POSTING...</Text>
                  ) : postSuccess ? (
                    <Text style={[styles.postButtonText, { color: theme.colors.buttonText }]}>POSTED ✓</Text>
                  ) : (
                    <Text style={[styles.postButtonText, { color: theme.colors.buttonText }]}>POST</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>

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
  container: { flex: 1, backgroundColor: '#F4C2C2', padding: 20 },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, marginTop: 10,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#222' },
  image: {
    width: '100%', height: 250, borderRadius: 12, marginBottom: 18, marginTop: 10,
    borderWidth: 2, borderColor: '#222', backgroundColor: '#fff',
  },
  clothName: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  description: { fontSize: 16, color: '#222', marginBottom: 18 },
  occasionContainer: { marginBottom: 24 },
  occasionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  occasionPill: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#222',
    paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'flex-start',
  },
  occasionText: { fontSize: 15, color: '#222' },
  tagSection: { marginBottom: 20 },
  tagSectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 8, color: '#222' },
  tagRow: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: 16, flexWrap: 'wrap', marginHorizontal: -8 },
  tagBlock: { },
  tagLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
  tagPill: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#222',
    paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'flex-start',
  },
  tagText: { fontSize: 15, color: '#222' },
  marketButton: {
    backgroundColor: '#FFE0B2', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
    alignSelf: 'flex-end', marginTop: 20,
  },
  marketButtonText: { color: '#222', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  marketModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 350,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  marketModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
    marginTop: 10,
  },
  marketInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: '#F8F8F8',
    color: '#333',
  },
  marketTextarea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: '#F8F8F8',
    height: 80,
    textAlignVertical: 'top',
    color: '#333',
  },
  marketPostButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#E67E00',
  },
  marketPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F3F0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#222',
  },
  backButton: {
    padding: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 5,
    zIndex: 1,
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