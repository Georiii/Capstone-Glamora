import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { itemId, imageUrl, clothName, description, occasion, category, weather } = params;
  const itemIdStr = itemId as string;
  const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  const clothNameStr = Array.isArray(clothName) ? clothName[0] : clothName;
  const descriptionStr = Array.isArray(description) ? description[0] : description;
  const occasionStr = Array.isArray(occasion) ? occasion[0] : occasion;
  const weatherStr = Array.isArray(weather) ? weather[0] : weather;
  const categoryStr = Array.isArray(category) ? category[0] : category;
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
          onPress: () => router.back()
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
    
    if (!marketName.trim() || !marketDesc.trim() || !marketPrice.trim()) {
      console.log('❌ Validation failed - missing fields');
      Alert.alert('Error', 'Please fill in all fields');
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
      
      console.log('📡 Making request to marketplace...');
      console.log('🔗 Full URL:', API_ENDPOINTS.marketplace);
      
      // Create request body without logging the full image URL
      const requestBody = {
        imageUrl: imageSrc,
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
      
      Alert.alert('Success', 'Item posted to marketplace successfully!');
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!imageSrc || !clothNameStr) {
    return (
      <View style={styles.container}>
        <Text>Item not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>{categoryStr || 'Item'}</Text>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash" size={24} color="#E74C3C" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <Image source={{ uri: imageSrc }} style={styles.image} />

        {/* Details */}
        <Text style={styles.clothName}>{clothNameStr}</Text>
        <Text style={styles.description}>{descriptionStr}</Text>
        <View style={styles.tagRow}>
          <View style={styles.tagBlock}>
            <Text style={styles.tagLabel}>Occasion</Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{occasionStr || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.tagBlock}>
            <Text style={styles.tagLabel}>Weather</Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>{weatherStr || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Post to Marketplace Button */}
        <TouchableOpacity style={styles.marketButton} onPress={() => {
          setShowMarketModal(true);
          setPostSuccess(false);
        }}>
          <Text style={styles.marketButtonText}>Post to Marketplace</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Marketplace Modal */}
      <Modal
        visible={showMarketModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMarketModal(false)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.marketModalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowMarketModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.marketModalTitle}>Marketplace Details</Text>
            
            <TextInput
              style={styles.marketInput}
              placeholder="Name"
              value={marketName}
              onChangeText={setMarketName}
              placeholderTextColor="#999"
            />
            
            <TextInput
              style={styles.marketTextarea}
              placeholder="Description"
              value={marketDesc}
              onChangeText={setMarketDesc}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={styles.marketInput}
              placeholder="Price"
              value={marketPrice}
              onChangeText={setMarketPrice}
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            
            <TouchableOpacity style={styles.marketPostButton} onPress={handlePostToMarketplace} disabled={loading || postSuccess}>
              {loading ? (
                <View style={styles.buttonLoadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.marketPostButtonText}>Posting...</Text>
                </View>
              ) : postSuccess ? (
                <Text style={styles.marketPostButtonText}>Posted ✓</Text>
              ) : (
                <Text style={styles.marketPostButtonText}>Post</Text>
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
  tagRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 16, marginBottom: 16 },
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