import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

export default function ItemDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { itemId, imageUrl, clothName, description, occasion, category } = params;
  const itemIdStr = itemId as string;
  const imageSrc = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  const clothNameStr = Array.isArray(clothName) ? clothName[0] : clothName;
  const descriptionStr = Array.isArray(description) ? description[0] : description;
  const occasionStr = Array.isArray(occasion) ? occasion[0] : occasion;
  const categoryStr = Array.isArray(category) ? category[0] : category;
  const [loading, setLoading] = useState(false);
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
    if (!marketName.trim() || !marketDesc.trim() || !marketPrice.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const price = parseFloat(marketPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    console.log('Starting marketplace post...');
    console.log('Token:', await AsyncStorage.getItem('token'));
    console.log('Data being sent:', {
      imageUrl: imageSrc,
      name: marketName,
      description: marketDesc,
      price: price
    });
    
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Making request to marketplace...');
      
      const response = await fetch(API_ENDPOINTS.marketplace, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: imageSrc,
          name: marketName.trim(),
          description: marketDesc.trim(),
          price: price,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        let errorMessage = 'Failed to post to marketplace.';
        try {
          const errorData = await response.json();
          console.log('Error data:', errorData);
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

      setShowMarketModal(false);
      setMarketPrice('');
      Alert.alert('Success', 'Item posted to marketplace successfully!', [
        {
          text: 'OK',
          onPress: () => router.push('/marketplace')
        }
      ]);
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
        <View style={styles.occasionContainer}>
          <Text style={styles.occasionLabel}>Occasion</Text>
          <View style={styles.occasionPill}>
            <Text style={styles.occasionText}>{occasionStr}</Text>
          </View>
        </View>

        {/* Post to Marketplace Button */}
        <TouchableOpacity style={styles.marketButton} onPress={() => setShowMarketModal(true)}>
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
            
            <TouchableOpacity style={styles.marketPostButton} onPress={handlePostToMarketplace} disabled={loading}>
              <Text style={styles.marketPostButtonText}>{loading ? 'Posting...' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F3F0', padding: 20 },
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
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
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