import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
  
  // Enhanced filter states for multi-select categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedWeather, setSelectedWeather] = useState<string>('');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  // AI removed per requirements – always use manual generation with weather logic
  const [useWeatherAPI, setUseWeatherAPI] = useState<boolean>(false);
  const [lastWeather, setLastWeather] = useState<any>(null); // retained for potential UI use
  const [userLocation, setUserLocation] = useState<string>('');
  
  // Message box state for wardrobe availability
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<boolean>(false);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [pendingGeneration, setPendingGeneration] = useState<boolean>(false);

  // Available options - exclude generic "Top" and "Bottom" from choices
  const topCategories = ['T-shirt', 'Formals', 'Jackets/sweatshirt', 'Shirt/camisole'];
  const bottomCategories = ['Jeans', 'Trousers', 'Shorts', 'Skirts', 'Leggings', 'Joggers'];
  const weatherOptions = ['Sunny', 'Rainy', 'Cold', 'Warm', 'Cloudy'];
  const occasionOptions = ['Casual', 'Work', 'Party', 'Sports', 'Formal', 'Birthdays', 'Weddings'];
  const styleOptions = ['Casual', 'Formal', 'Sporty', 'Vintage', 'Minimalist', 'Streetwear'];

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

  // Allow multi-select for categories
  const toggleCategorySelection = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const selectWeather = (weather: string) => {
    setSelectedWeather(selectedWeather === weather ? '' : weather);
  };

  const selectOccasion = (occasion: string) => {
    setSelectedOccasion(selectedOccasion === occasion ? '' : occasion);
  };

  const selectStyle = (style: string) => {
    setSelectedStyle(selectedStyle === style ? '' : style);
  };

  // Category normalization to ensure tags match across features
  const normalizeCategory = (raw?: string): string => {
    const c = (raw || '').toLowerCase();
    if (!c) return '';
    // Tops
    if (['top','t-shirt','shirt','camisole','blouse','tee','tank','jacket','sweater','hoodie','coat','outerwear','jackets','sweatshirt','cardigan'].some(k => c.includes(k))) return 'top';
    // Bottoms
    if (['bottom','jeans','trousers','short','shorts','skirt','skirts','legging','leggings','jogger','joggers','pants','slacks'].some(k => c.includes(k))) return 'bottom';
    // Shoes
    if (['shoe','shoes','sneaker','sneakers','heel','heels','boot','boots','sandal','sandals','flat','flats','loafer','loafers','footwear'].some(k => c.includes(k))) return 'shoes';
    // Accessories
    if (['accessory','accessories','bag','belt','scarf','hat','cap','sunglass','sunglasses','jewel','jewelry','umbrella'].some(k => c.includes(k))) return 'accessories';
    return c;
  };

  // Token helpers for fuzzy subcategory matches (e.g., "t-shirt" ~ "tshirt" ~ "shirt")
  const toToken = (value?: string) => (value || '').toLowerCase().replace(/[^a-z]/g, '');
  const getItemTokens = (item: WardrobeItem): string[] => {
    const list = [item.category, ...((item.categories as any) || [])].filter(Boolean) as string[];
    return list.map(toToken);
  };

  const handleWeatherAPIToggle = () => {
    // Keep toggle but default to OFF; allow user to enable real-time weather
    if (!useWeatherAPI) {
      setUseWeatherAPI(true);
      Alert.alert(
        'Location Required',
        'Please enter your location (e.g., "Manila, Philippines") to get weather-aware recommendations.',
        [{ text: 'OK' }]
      );
    } else {
      setUseWeatherAPI(false);
      setUserLocation('');
    }
  };

  // Check wardrobe availability for selected categories
  const checkWardrobeAvailability = (): { missing: string[], canProceed: boolean } => {
    const missing: string[] = [];
    
    // Build selection tokens (strict subcategory filtering)
    const selectedTokens = new Set(selectedCategories.map(toToken));
    const weatherToUseLocal = (selectedWeather || '').toLowerCase();
    const weatherOk = (it: WardrobeItem) => {
      const iw = (it.weather || '').toLowerCase();
      return !weatherToUseLocal || !iw || iw === weatherToUseLocal;
    };

    // Check if we have any selected categories that are tops
    const hasTopSelections = selectedCategories.some(cat => {
      const normalized = normalizeCategory(cat);
      return normalized === 'top';
    });
    
    // Check if we have any selected categories that are bottoms  
    const hasBottomSelections = selectedCategories.some(cat => {
      const normalized = normalizeCategory(cat);
      return normalized === 'bottom';
    });

    // Check tops (only if user selected top categories)
    if (hasTopSelections || selectedCategories.length === 0) {
      const topsAvailable = wardrobeItems.filter(item => {
        const groups = [normalizeCategory(item.category), ...(((item.categories as any) || []).map(normalizeCategory))];
        if (!groups.includes('top')) return false;
        if (selectedTokens.size === 0) return weatherOk(item);
        const tokens = getItemTokens(item);
        return tokens.some(t => selectedTokens.has(t)) && weatherOk(item);
      }).length;
      if (topsAvailable === 0) {
        missing.push('No available tops found in your wardrobe');
      }
    }
    
    // Check bottoms (only if user selected bottom categories)
    if (hasBottomSelections || selectedCategories.length === 0) {
      const bottomsAvailable = wardrobeItems.filter(item => {
        const groups = [normalizeCategory(item.category), ...(((item.categories as any) || []).map(normalizeCategory))];
        if (!groups.includes('bottom')) return false;
        if (selectedTokens.size === 0) return weatherOk(item);
        const tokens = getItemTokens(item);
        return tokens.some(t => selectedTokens.has(t)) && weatherOk(item);
      }).length;
      if (bottomsAvailable === 0) {
        missing.push('No available bottoms found in your wardrobe');
      }
    }
    
    // Check shoes (always check for complete outfits)
    const availableShoes = wardrobeItems.filter(item => {
      const groups = [normalizeCategory(item.category), ...(((item.categories as any) || []).map(normalizeCategory))];
      const matchCat = groups.includes('shoes');
      return matchCat && weatherOk(item);
    });
    
    if (availableShoes.length === 0) {
      missing.push('No available shoes found in your wardrobe');
    }
    
    // Check accessories (always check for complete outfits)
    const availableAccessories = wardrobeItems.filter(item => {
      const groups = [normalizeCategory(item.category), ...(((item.categories as any) || []).map(normalizeCategory))];
      const matchCat = groups.includes('accessories');
      return matchCat && weatherOk(item);
    });
    
    if (availableAccessories.length === 0) {
      missing.push('No available accessories found in your wardrobe');
    }
    
    return { missing, canProceed: missing.length === 0 };
  };

  // Handle availability modal actions
  const handleContinueWithoutMissing = () => {
    setShowAvailabilityModal(false);
    setMissingCategories([]);
    if (pendingGeneration) {
      setPendingGeneration(false);
      proceedWithGeneration();
    }
  };

  const handleCancelGeneration = () => {
    setShowAvailabilityModal(false);
    setMissingCategories([]);
    setPendingGeneration(false);
    setLoading(false);
  };

  // Generate outfit suggestions (manual with weather influence)
  const generateOutfits = async () => {
    console.log('🧩 Outfit generation started');
    console.log('🔍 Current selections:', { 
      selectedCategories, 
      selectedWeather, 
      selectedOccasion, 
      selectedStyle
    });
    
    setLoading(true);
    
    // Check wardrobe availability first
    const availabilityCheck = checkWardrobeAvailability();
    if (!availabilityCheck.canProceed) {
      setMissingCategories(availabilityCheck.missing);
      setShowAvailabilityModal(true);
      setPendingGeneration(true);
      setLoading(false);
      return;
    }

    // Proceed with generation if all items are available
    proceedWithGeneration();
  };

  // Separate function for the actual generation logic
  const proceedWithGeneration = async () => {
    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to generate outfit recommendations');
        setLoading(false);
        return;
      }

      // Manual generation with weather influence
      console.log('🔧 Using manual combination system...');
      let weatherToUse = selectedWeather;
      let weatherMetaLocal: any = null;
      if (useWeatherAPI && userLocation.trim()) {
        try {
          const weatherUrl = API_ENDPOINTS.weather.current(userLocation.trim());
          console.log('🌤️ Fetching weather from:', weatherUrl);
          
          const weatherResponse = await fetch(weatherUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          console.log('🌤️ Weather response status:', weatherResponse.status);
          
          if (weatherResponse.ok) {
            const weatherData = await weatherResponse.json();
            console.log('🌤️ Weather data received:', weatherData);
            weatherToUse = weatherData.weather;
            weatherMetaLocal = weatherData;
            setLastWeather(weatherData); // preserve for next session (used in UI banner)
          } else {
            const errorText = await weatherResponse.text();
            console.log('❌ Weather API error:', weatherResponse.status, errorText);
          }
        } catch (error) {
          console.log('⚠️ Weather API error:', error);
        }
      } else {
        console.log('🌤️ Weather API disabled or no location provided. useWeatherAPI:', useWeatherAPI, 'userLocation:', userLocation);
      }
      
      if (selectedCategories.length === 0) {
        Alert.alert('Selection Required', 'Please select one or more categories to generate outfits');
        setLoading(false);
        return;
      }

      // Normalize categories
      const normalize = normalizeCategory;
      const groupOf = (it: WardrobeItem) => [it.category, ...((it.categories as any) || [])].filter(Boolean).map(normalize);
      const weatherMatch = (it: WardrobeItem) => {
        if (!weatherToUse) return true;
        const iw = (it.weather || '').toLowerCase();
        return !iw || iw === weatherToUse.toLowerCase();
      };

      const selectedTokens = new Set(selectedCategories.map(toToken));

      const matchAnySelected = (item: WardrobeItem) => {
        if (selectedTokens.size === 0) return true;
        // Compare on tokens for robustness
        const tokens = getItemTokens(item);
        return tokens.some(t => selectedTokens.has(t));
      };

      const availableTops = wardrobeItems.filter(item => {
        const groups = groupOf(item);
        return groups.includes('top') && matchAnySelected(item) && weatherMatch(item);
      });
      
      const availableBottoms = wardrobeItems.filter(item => {
        const groups = groupOf(item);
        return groups.includes('bottom') && matchAnySelected(item) && weatherMatch(item);
      });

      if (availableTops.length === 0 || availableBottoms.length === 0) {
        const missing: string[] = [];
        if (availableTops.length === 0) missing.push('No available tops found in your wardrobe');
        if (availableBottoms.length === 0) missing.push('No available bottoms found in your wardrobe');
        setMissingCategories(missing);
        setShowAvailabilityModal(true);
        setPendingGeneration(true);
        setLoading(false);
        return;
      }

      // Generate manual combinations (limited)
      const shoes = wardrobeItems.filter(item => groupOf(item).includes('shoes') && weatherMatch(item));

      const accessories = wardrobeItems.filter(item => groupOf(item).includes('accessories') && weatherMatch(item));

      const outfitCombinations = [] as any[];
      const maxOutfits = Math.min(6, availableTops.length * availableBottoms.length);
      
      let outfitCount = 0;
      for (let i = 0; i < availableTops.length && outfitCount < maxOutfits; i++) {
        for (let j = 0; j < availableBottoms.length && outfitCount < maxOutfits; j++) {
          const shoe = shoes[(i + j) % Math.max(1, shoes.length)] || null;
          const accessory = accessories[(i + j) % Math.max(1, accessories.length)] || null;
          const outfit: any = {
            id: `manual-outfit-${outfitCount + 1}`,
            name: `Manual Outfit ${outfitCount + 1}`,
            top: availableTops[i],
            bottom: availableBottoms[j],
            weather: weatherToUse || 'Moderate',
            occasion: selectedOccasion || determineOccasion(availableTops[i], availableBottoms[j]),
            aiGenerated: false,
            confidence: 75 // Fixed confidence for manual combinations
          };
          // Shoes and accessories must always be included (fallback N/A handled in view)
          if (shoe) outfit.shoes = shoe;
          else if (shoes.length > 0) outfit.shoes = shoes[0];
          outfit.accessories = accessory ? [accessory] : (accessories.length > 0 ? [accessories[0]] : []);
          if (weatherMetaLocal || lastWeather) {
            const meta = weatherMetaLocal || lastWeather;
            console.log('🌤️ Adding weather meta to outfit:', meta);
            outfit.weatherMeta = {
              location: meta.location,
              temperature: meta.temperature,
              description: meta.description,
              icon: meta.weatherIcon,
            };
          } else {
            console.log('🌤️ No weather meta available for outfit');
          }
          outfitCombinations.push(outfit);
          outfitCount++;
        }
      }

      console.log('✅ Generated manual outfits:', outfitCombinations.length);
      await AsyncStorage.setItem('generatedOutfits', JSON.stringify(outfitCombinations));
      (router as any).push('/outfit-suggestions');
      
    } catch (error) {
      console.error('❌ Error generating outfits:', error);
      Alert.alert('Error', 'Failed to generate outfit suggestions. Please try again.');
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
          <Text style={styles.sectionTitle}>For Tops</Text>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Categories</Text>
              <View style={styles.checkboxGrid}>
                {topCategories.map((category) => 
                  renderCheckboxItem(
                    category, 
                  selectedCategories.includes(category), 
                  () => toggleCategorySelection(category)
                )
              )}
            </View>
          </View>
        </View>

        {/* For Bottoms Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>For Bottoms</Text>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Categories</Text>
              <View style={styles.checkboxGrid}>
                {bottomCategories.map((category) => 
                  renderCheckboxItem(
                    category, 
                  selectedCategories.includes(category), 
                  () => toggleCategorySelection(category)
                )
              )}
            </View>
          </View>
        </View>

        {/* AI section removed */}

        {/* Weather API Section - Always available */}
        <View style={styles.section}>
          <View style={styles.aiToggleContainer}>
            <Text style={styles.sectionTitle}>🌤️ Real-time Weather</Text>
            <TouchableOpacity 
              style={[styles.aiToggle, useWeatherAPI && styles.aiToggleActive]}
              onPress={handleWeatherAPIToggle}
            >
              <Text style={[styles.aiToggleText, useWeatherAPI && styles.aiToggleTextActive]}>
                {useWeatherAPI ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          {useWeatherAPI && (
            <View style={styles.locationInputContainer}>
              <Text style={styles.locationLabel}>Your Location:</Text>
              <TextInput
                style={styles.locationInput}
                placeholder="e.g., Manila, Philippines"
                value={userLocation}
                onChangeText={setUserLocation}
                placeholderTextColor="#999"
              />
              <Text style={styles.locationHint}>
                Weather will influence tops, bottoms, shoes and accessories.
              </Text>
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Occasion</Text>
              <View style={styles.checkboxGrid}>
                {occasionOptions.slice(0, 4).map((occasion) => 
                  renderCheckboxItem(
                    occasion, 
                    selectedOccasion === occasion, 
                    () => selectOccasion(occasion)
                  )
                )}
              </View>
            </View>
            <View style={styles.filterColumn}>
              <Text style={styles.filterLabel}>Style</Text>
              <View style={styles.checkboxGrid}>
                {styleOptions.slice(0, 4).map((style) => 
                  renderCheckboxItem(
                    style, 
                    selectedStyle === style, 
                    () => selectStyle(style)
                  )
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={generateOutfits}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.confirmButtonText}>Generate Outfit Suggestions</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Wardrobe Availability Modal */}
      <Modal
        visible={showAvailabilityModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelGeneration}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.availabilityModalContent}>
            <Text style={styles.availabilityModalTitle}>Missing Items</Text>
            <Text style={styles.availabilityModalText}>
              The following items are not available in your wardrobe for the selected criteria:
            </Text>
            
            <View style={styles.missingItemsList}>
              {missingCategories.map((category, index) => (
                <Text key={index} style={styles.missingItemText}>
                  • {category}
                </Text>
              ))}
            </View>
            
            <Text style={styles.availabilityModalSubtext}>
              You can continue to generate outfit suggestions without these items, or cancel to add more items to your wardrobe.
            </Text>
            
            <View style={styles.availabilityModalButtons}>
              <TouchableOpacity 
                style={styles.availabilityCancelButton}
                onPress={handleCancelGeneration}
              >
                <Text style={styles.availabilityCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.availabilityContinueButton}
                onPress={handleContinueWithoutMissing}
              >
                <Text style={styles.availabilityContinueButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#F4C2C2',
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
  aiToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiToggle: {
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
  aiToggleActive: {
    backgroundColor: '#4CAF50',
  },
  aiToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
  },
  aiToggleTextActive: {
    color: '#FFFFFF',
  },
  aiDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 20,
  },
  aiHint: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 16,
  },
  locationInputContainer: {
    marginTop: 15,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  locationInput: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  locationHint: {
    fontSize: 12,
    color: '#2196F3',
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // Availability Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  availabilityModalContent: {
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
  availabilityModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
    color: '#FF6B9D',
  },
  availabilityModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
    lineHeight: 22,
  },
  missingItemsList: {
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  missingItemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  availabilityModalSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  availabilityModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  availabilityCancelButton: {
    flex: 1,
    backgroundColor: '#F4C2C2',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  availabilityCancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  availabilityContinueButton: {
    flex: 1,
    backgroundColor: '#FF6B9D',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  availabilityContinueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
