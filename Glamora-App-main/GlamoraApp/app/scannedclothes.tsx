import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function ScannedClothes() {
  const { imageUri } = useLocalSearchParams();
  const router = useRouter();
  
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showOccasionModal, setShowOccasionModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [showMarketplaceModal, setMarketplaceModal] = useState(false);
  const [marketplaceName, setMarketplaceName] = useState('');
  const [marketplaceDescription, setMarketplaceDescription] = useState('');
  const [marketplacePrice, setMarketplacePrice] = useState('');

  // Category and subcategory mapping
  const categoryData = {
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

  const occasionOptions = ['Birthdays', 'Weddings', 'Work', 'Casual', 'Party', 'Sports'];
  const weatherOptions = ['Sunny', 'Rainy', 'Cold', 'Warm', 'Cloudy'];
  const styleOptions = ['Casual', 'Formal', 'Sporty', 'Vintage', 'Minimalist', 'Streetwear'];
  const colorOptions = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple', 'Brown', 'Gray', 'Orange'];

  const handleAddToWardrobe = (): void => {
    setShowCategoryModal(true);
  };

  const handlePostToMarketplace = (): void => {
    setMarketplaceModal(true);
  };

  const handleCategorySelect = (category: string): void => {
    setSelectedCategory(category);
    setSelectedSubcategories([]);
    setShowSubcategoryModal(true);
  };

  const handleSubcategorySelect = (subcategory: { name: string, type: string }): void => {
    if (!selectedSubcategories.some(s => s.type === subcategory.type)) {
      setSelectedSubcategories([...selectedSubcategories, subcategory]);
    }
  };

  const handleSubcategoryDone = (): void => {
    setShowSubcategoryModal(false);
    setShowOccasionModal(true);
  };

  const handleOccasionSelect = (occasion: string): void => {
    if (occasions.includes(occasion)) {
      setOccasions(occasions.filter(o => o !== occasion));
    } else {
      setOccasions([...occasions, occasion]);
    }
  };

  const handleOccasionDone = (): void => {
    setShowOccasionModal(false);
    setShowWeatherModal(true); // Continue to weather selection
  };

  const handleWeatherSelect = (weather: string): void => {
    setSelectedWeather(weather);
    setShowWeatherModal(false);
    setShowStyleModal(true); // Continue to style selection
  };

  const handleStyleSelect = (style: string): void => {
    setSelectedStyle(style);
    setShowStyleModal(false);
  };

  const handleMarketplaceSubmit = async (): Promise<void> => {
    if (!marketplaceName.trim() || !marketplaceDescription.trim() || !marketplacePrice.trim()) {
      Alert.alert('Error', 'Please fill in all marketplace fields');
      return;
    }

    setLoading(true);
    try {
      if (!imageUri) throw new Error('No image found');
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token from AsyncStorage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      
      const response = await fetch(API_ENDPOINTS.addMarketplaceItem, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageUrl: imageUri,
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
      
      Alert.alert('Success', 'Item posted to marketplace successfully!');
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
      if (!imageUri) throw new Error('No image found');
      const token = await AsyncStorage.getItem('token');
      console.log('🔑 Token from AsyncStorage:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      console.log('📡 Making request to:', API_ENDPOINTS.addWardrobeItem);
      
      // Try Cloudinary upload, but continue if it fails
      let cloudinaryImageUrl = imageUri;
      try {
        console.log('🔍 Attempting Cloudinary upload...');
        console.log('📡 Upload endpoint:', API_ENDPOINTS.uploadImage);
        console.log('🖼️ Image URI length:', imageUri ? imageUri.length : 0);
        
        const uploadResponse = await fetch(API_ENDPOINTS.uploadImage, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageUrl: imageUri,
            folder: 'glamora/wardrobe'
          }),
        });

        console.log('📊 Upload response status:', uploadResponse.status);
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          cloudinaryImageUrl = uploadResult.imageUrl;
          console.log('✅ Image uploaded to Cloudinary:', cloudinaryImageUrl);
        } else {
          const errorText = await uploadResponse.text();
          console.log('⚠️ Cloudinary upload failed:', errorText);
          console.log('⚠️ Using original image instead');
        }
      } catch (uploadError) {
        console.log('⚠️ Cloudinary upload error, using original image:', uploadError);
        console.log('⚠️ This is not critical - continuing with original image');
      }
      
      // Save to wardrobe with original image URL (temporarily)
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

  useEffect(() => {
    fetchMarketplaceItems();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GLAMORA SCAN</Text>
        <View style={styles.placeholder} />
      </View>
      {/* Image Display - always below header */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri as string }} style={styles.image} />
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
                Selected: {selectedCategory} → {selectedSubcategories.map(sub => 
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
      
      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsContainer}>
              {Object.keys(categoryData).map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.optionItem}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text style={styles.optionText}>{category}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subcategory Selection Modal */}
      <Modal visible={showSubcategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCategory} - Select Types</Text>
              <TouchableOpacity onPress={() => setShowSubcategoryModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsContainer}>
              {categoryData[selectedCategory as keyof typeof categoryData]?.map((subcategory) => (
                <TouchableOpacity
                  key={subcategory.type}
                  style={[
                    styles.optionItem,
                    selectedSubcategories.some(s => s.type === subcategory.type) && styles.selectedOption
                  ]}
                  onPress={() => handleSubcategorySelect(subcategory)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedSubcategories.some(s => s.type === subcategory.type) && styles.selectedOptionText
                  ]}>
                    {subcategory.name}
                  </Text>
                  {selectedSubcategories.some(s => s.type === subcategory.type) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={handleSubcategoryDone}>
              <Text style={styles.modalButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Occasion Selection Modal */}
      <Modal visible={showOccasionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Occasions</Text>
              <TouchableOpacity onPress={() => setShowOccasionModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsContainer}>
              {occasionOptions.map((occasion) => (
                <TouchableOpacity
                  key={occasion}
                  style={[
                    styles.optionItem,
                    occasions.includes(occasion) && styles.selectedOption
                  ]}
                  onPress={() => handleOccasionSelect(occasion)}
                >
                  <Text style={[
                    styles.optionText,
                    occasions.includes(occasion) && styles.selectedOptionText
                  ]}>
                    {occasion}
                  </Text>
                  {occasions.includes(occasion) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={handleOccasionDone}>
              <Text style={styles.modalButtonText}>Next: Weather</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weather Selection Modal */}
      <Modal visible={showWeatherModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Weather Suitability</Text>
              <TouchableOpacity onPress={() => setShowWeatherModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>When is this item suitable to wear?</Text>
            <ScrollView style={styles.optionsContainer}>
              {weatherOptions.map((weather) => (
                <TouchableOpacity
                  key={weather}
                  style={[
                    styles.optionItem,
                    selectedWeather === weather && styles.selectedOption
                  ]}
                  onPress={() => handleWeatherSelect(weather)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedWeather === weather && styles.selectedOptionText
                  ]}>
                    {weather}
                  </Text>
                  {selectedWeather === weather && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Style Selection Modal */}
      <Modal visible={showStyleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Style</Text>
              <TouchableOpacity onPress={() => setShowStyleModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>What style category best describes this item?</Text>
            <ScrollView style={styles.optionsContainer}>
              {styleOptions.map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.optionItem,
                    selectedStyle === style && styles.selectedOption
                  ]}
                  onPress={() => handleStyleSelect(style)}
                >
                  <Text style={[
                    styles.optionText,
                    selectedStyle === style && styles.selectedOptionText
                  ]}>
                    {style}
                  </Text>
                  {selectedStyle === style && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
}); 