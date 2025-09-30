import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';

interface WardrobeItem {
  _id: string;
  clothName: string;
  description: string;
  imageUrl: string;
  category: string;
  weather: string;
  color: string;
  style: string;
  categories?: string[]; // Added for new filtering logic
}

export default function CombineOutfits() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  
  // Simple filter states - only what's needed
  const [selectedTopCategory, setSelectedTopCategory] = useState<string>('');
  const [selectedBottomCategory, setSelectedBottomCategory] = useState<string>('');
  const [selectedWeather, setSelectedWeather] = useState<string>('');

  // Available options - Updated to match actual wardrobe categories
  const topCategories = ['T-shirt', 'Formals', 'Jackets/sweatshirt', 'Shirt/camisole'];
  const bottomCategories = ['Jeans', 'Trousers', 'Shorts', 'Skirts', 'Leggings', 'Joggers'];
  const weatherOptions = ['Sunny', 'Rainy', 'Cold', 'Warm', 'Cloudy'];

  useEffect(() => {
    loadWardrobeItems();
  }, []);

  const loadWardrobeItems = async () => {
    console.log('🔍 Loading wardrobe items...');
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('❌ No token found');
        Alert.alert('Error', 'Please login to access wardrobe items');
        return;
      }

      console.log('🔍 Token found, making API request to:', API_ENDPOINTS.wardrobe);
      const response = await fetch(API_ENDPOINTS.wardrobe, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('🔍 API response status:', response.status);
      console.log('🔍 API response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Raw API response:', data);
        
        let items = [];
        if (data.items) {
          items = data.items;
          console.log('🔍 Found items in data.items');
        } else if (data.wardrobeItems) {
          items = data.wardrobeItems;
          console.log('🔍 Found items in data.wardrobeItems');
        } else if (Array.isArray(data)) {
          items = data;
          console.log('🔍 Found items as direct array');
        } else {
          console.log('❌ No items found in response data');
        }
        
        console.log('✅ Loaded wardrobe items:', items.length);
        if (items.length > 0) {
          console.log('🔍 Sample item:', items[0]);
          console.log('🔍 Available categories:', [...new Set(items.map((item: WardrobeItem) => item.category))]);
          console.log('🔍 Available weather options:', [...new Set(items.map((item: WardrobeItem) => item.weather))]);
          console.log('🔍 All items with their categories:');
          items.forEach((item: WardrobeItem, index: number) => {
            console.log(`  Item ${index + 1}: "${item.clothName}" - Category: "${item.category}" - Weather: "${item.weather}"`);
          });
        }
        setWardrobeItems(items);
      } else {
        console.log('❌ API request failed');
        Alert.alert('Error', 'Failed to load wardrobe items');
      }
    } catch (error) {
      console.error('❌ Error loading wardrobe items:', error);
      Alert.alert('Error', 'Failed to load wardrobe items');
    }
  };

  // Simple category selection - only one can be selected at a time
  const selectTopCategory = (category: string) => {
    setSelectedTopCategory(selectedTopCategory === category ? '' : category);
  };

  const selectBottomCategory = (category: string) => {
    setSelectedBottomCategory(selectedBottomCategory === category ? '' : category);
  };

  const selectWeather = (weather: string) => {
    setSelectedWeather(selectedWeather === weather ? '' : weather);
  };

  // Main function - Generate outfit suggestions and navigate
  const generateOutfits = async () => {
    console.log('🔍 Confirm button clicked!');
    console.log('🔍 Current selections:', { selectedTopCategory, selectedBottomCategory, selectedWeather });
    console.log('🔍 Total wardrobe items:', wardrobeItems.length);
    
    if (!selectedTopCategory || !selectedBottomCategory) {
      console.log('❌ Missing selections - showing alert');
      Alert.alert('Selection Required', 'Please select one category for tops and one for bottoms');
      return;
    }

    console.log('✅ Selections valid, starting generation...');
    setLoading(true);
    
    try {
      // Find available tops and bottoms
      const availableTops = wardrobeItems.filter(item => {
        const matchesCategory = (item.categories && item.categories.includes(selectedTopCategory)) ||
                               (item.category === selectedTopCategory);
        const matchesWeather = !selectedWeather || !item.weather || item.weather === selectedWeather;
        console.log(`🔍 Top item "${item.clothName}": categories="${item.categories}" (matches "${selectedTopCategory}": ${matchesCategory}), weather="${item.weather}" (matches "${selectedWeather}": ${matchesWeather})`);
        return matchesCategory && matchesWeather;
      });
      
      const availableBottoms = wardrobeItems.filter(item => {
        const matchesCategory = (item.categories && item.categories.includes(selectedBottomCategory)) ||
                               (item.category === selectedBottomCategory);
        const matchesWeather = !selectedWeather || !item.weather || item.weather === selectedWeather;
        console.log(`🔍 Bottom item "${item.clothName}": categories="${item.categories}" (matches "${selectedBottomCategory}": ${matchesCategory}), weather="${item.weather}" (matches "${selectedWeather}": ${matchesWeather})`);
        return matchesCategory && matchesWeather;
      });

      console.log('🔍 Available tops:', availableTops.length, availableTops);
      console.log('🔍 Available bottoms:', availableBottoms.length, availableBottoms);

      if (availableTops.length === 0 || availableBottoms.length === 0) {
        console.log('❌ No combinations found');
        Alert.alert('No Combinations', 'No items found for the selected categories and weather. Try different selections.');
        setLoading(false);
        return;
      }

      // Generate outfit combinations - ALL possible combinations
      const outfitCombinations = [];
      const totalPossibleCombinations = availableTops.length * availableBottoms.length;
      const maxOutfits = Math.min(10, totalPossibleCombinations); // Cap at 10 for performance
      
      console.log('🔍 Available tops:', availableTops.length);
      console.log('🔍 Available bottoms:', availableBottoms.length);
      console.log('🔍 Total possible combinations:', totalPossibleCombinations);
      console.log('🔍 Generating up to', maxOutfits, 'outfits');
      
      let outfitCount = 0;
      // Nested loops to generate ALL combinations
      for (let i = 0; i < availableTops.length && outfitCount < maxOutfits; i++) {
        for (let j = 0; j < availableBottoms.length && outfitCount < maxOutfits; j++) {
          const outfit = {
            id: `outfit-${outfitCount + 1}`,
            name: `Outfit ${outfitCount + 1}`,
            top: availableTops[i],
            bottom: availableBottoms[j],
            weather: selectedWeather || 'Moderate',
            occasion: determineOccasion(availableTops[i], availableBottoms[j])
          };
          outfitCombinations.push(outfit);
          console.log(`🔍 Created outfit ${outfitCount + 1}:`, {
            top: availableTops[i].clothName,
            bottom: availableBottoms[j].clothName
          });
          outfitCount++;
        }
      }

      console.log('✅ Generated outfits:', outfitCombinations.length, outfitCombinations);

      // Store the generated outfits in AsyncStorage for the next page
      await AsyncStorage.setItem('generatedOutfits', JSON.stringify(outfitCombinations));
      console.log('✅ Outfits saved to AsyncStorage');
      
      // Navigate to outfit suggestions page
      console.log('🚀 Navigating to outfit-suggestions page...');
      (router as any).push('/outfit-suggestions');
      
    } catch (error) {
      console.error('❌ Error generating outfits:', error);
      Alert.alert('Error', 'Failed to generate outfit suggestions');
    } finally {
      setLoading(false);
    }
  };

  const determineOccasion = (top: WardrobeItem, bottom: WardrobeItem) => {
    if (top.category === 'Formals' || bottom.category === 'Formals') return 'Work/Formal';
    if (top.category === 'Jackets' || top.category === 'Sweaters') return 'Casual';
    return 'Casual';
  };

  const renderCheckboxItem = (item: string, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity style={styles.checkboxItem} onPress={onPress}>
      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </View>
      <Text style={styles.checkboxText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router as any).push('/profile')}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combine</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* For Tops Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For tops</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Categories</Text>
              <View style={styles.checkboxGrid}>
                {topCategories.map((category) => 
                  renderCheckboxItem(
                    category, 
                    selectedTopCategory === category, 
                    () => selectTopCategory(category)
                  )
                )}
              </View>
            </View>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Weather</Text>
              <View style={styles.checkboxGrid}>
                {weatherOptions.map((weather) => 
                  renderCheckboxItem(
                    weather, 
                    selectedWeather === weather, 
                    () => selectWeather(weather)
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        {/* For Bottoms Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For Bottoms</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Categories</Text>
              <View style={styles.checkboxGrid}>
                {bottomCategories.map((category) => 
                  renderCheckboxItem(
                    category, 
                    selectedBottomCategory === category, 
                    () => selectBottomCategory(category)
                  )
                )}
              </View>
            </View>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Weather</Text>
              <View style={styles.checkboxGrid}>
                {weatherOptions.map((weather) => 
                  renderCheckboxItem(
                    weather, 
                    selectedWeather === weather, 
                    () => selectWeather(weather)
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={() => {
            console.log('🔍 Confirm button pressed!');
            Alert.alert('Test', 'Confirm button clicked! Now generating outfits...');
            generateOutfits();
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5D5E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#F5D5E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 30,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterColumn: {
    flex: 1,
    marginHorizontal: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  checkboxGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 3,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: '#000000',
  },
  checkboxText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#E8B4C8',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 50,
    alignSelf: 'center',
    marginTop: 50,
    marginBottom: 40,
    minWidth: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
});
