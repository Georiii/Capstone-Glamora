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

  const handlePostToMarketplace = async () => {
    console.log('🎯 handlePostToMarketplace function called!');
    
    if (!marketName.trim() || !marketPrice.trim()) {
      console.log('❌ Validation failed - missing fields');
      Alert.alert('Error', 'Please fill in name and price');
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

      {/* Marketplace Modal */}
      <Modal
        visible={showMarketModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMarketModal(false)}
      >
        <KeyboardAvoidingView style={[styles.modalOverlay, { backgroundColor: theme.colors.modalOverlay }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.marketModalContent, { backgroundColor: theme.colors.containerBackground }]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowMarketModal(false)}>
              <Ionicons name="close" size={24} color={theme.colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.marketModalTitle, { color: theme.colors.primaryText }]}>Marketplace Details</Text>
            
            <TextInput
              style={[styles.marketInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              placeholder="Name"
              value={marketName}
              onChangeText={setMarketName}
              placeholderTextColor={theme.colors.placeholderText}
            />
            
            <TextInput
              style={[styles.marketTextarea, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              placeholder="Description"
              value={marketDesc}
              onChangeText={setMarketDesc}
              placeholderTextColor={theme.colors.placeholderText}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={[styles.marketInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              placeholder="Price"
              value={marketPrice}
              onChangeText={setMarketPrice}
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
            
            <TouchableOpacity style={[styles.marketPostButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={handlePostToMarketplace} disabled={loading || postSuccess}>
              {loading ? (
                <View style={styles.buttonLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.buttonText} />
                  <Text style={[styles.marketPostButtonText, { color: theme.colors.buttonText }]}>Posting...</Text>
                </View>
              ) : postSuccess ? (
                <Text style={[styles.marketPostButtonText, { color: theme.colors.buttonText }]}>Posted ✓</Text>
              ) : (
                <Text style={[styles.marketPostButtonText, { color: theme.colors.buttonText }]}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
}); 