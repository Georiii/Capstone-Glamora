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
import { useTheme } from './contexts/ThemeContext';

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
  const { theme } = useTheme();
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
  const [useColorHarmony, setUseColorHarmony] = useState<boolean>(false);
  
  // Message box state for wardrobe availability
  const [showAvailabilityModal, setShowAvailabilityModal] = useState<boolean>(false);
  const [missingCategories, setMissingCategories] = useState<string[]>([]);
  const [pendingGeneration, setPendingGeneration] = useState<boolean>(false);

  // Base available options
  const baseTopCategories = ['T-shirt', 'Formals', 'Jackets/sweatshirt', 'Shirt/camisole'];
  const baseBottomCategories = ['Jeans', 'Trousers', 'Shorts', 'Skirts', 'Leggings', 'Joggers'];
  
  const [customSubcategories, setCustomSubcategories] = useState<{[key: string]: any[]}>({
    'Tops': [],
    'Bottoms': [],
  });

  // Merge base and custom subcategories
  const topCategories = [
    ...baseTopCategories,
    ...customSubcategories['Tops'].map(sub => sub.type)
  ];
  const bottomCategories = [
    ...baseBottomCategories,
    ...customSubcategories['Bottoms'].map(sub => sub.type)
  ];
  const weatherOptions = ['Sunny', 'Rainy', 'Cold', 'Warm', 'Cloudy'];
  const occasionOptions = ['Casual', 'Work', 'Party', 'Sports', 'Formal', 'Birthdays', 'Weddings'];
  const styleOptions = ['Casual', 'Formal', 'Sporty', 'Vintage', 'Minimalist', 'Streetwear'];

  const fetchCustomSubcategories = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const categories = ['Tops', 'Bottoms'];
      const fetched: {[key: string]: any[]} = {
        'Tops': [],
        'Bottoms': [],
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
    loadWardrobeItems();
    fetchCustomSubcategories();
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

  const handleColorHarmonyToggle = () => {
    setUseColorHarmony(!useColorHarmony);
  };

  // Color harmony functions
  const areColorsComplementary = (color1: string, color2: string): boolean => {
    if (!color1 || !color2) return false;
    
    const c1 = color1.toLowerCase().trim();
    const c2 = color2.toLowerCase().trim();
    
    // Complementary color pairs (fashion theory)
    const complementaryPairs = [
      ['red', 'green'], ['blue', 'orange'], ['yellow', 'purple'],
      ['black', 'white'], ['brown', 'beige'], ['navy', 'tan'],
      ['pink', 'mint'], ['coral', 'teal'], ['lavender', 'yellow'],
      ['red', 'navy'], ['blue', 'brown'], ['green', 'burgundy'],
      ['orange', 'blue'], ['purple', 'yellow'], ['pink', 'green'],
      ['red', 'white'], ['black', 'red'], ['white', 'navy'],
      ['beige', 'brown'], ['gray', 'pink'], ['navy', 'white']
    ];
    
    return complementaryPairs.some(pair => 
      (pair[0] === c1 && pair[1] === c2) ||
      (pair[1] === c1 && pair[0] === c2) ||
      c1.includes(pair[0]) && c2.includes(pair[1]) ||
      c1.includes(pair[1]) && c2.includes(pair[0])
    );
  };

  const areColorsHarmonious = (colors: string[]): boolean => {
    if (colors.length < 2) return true;
    
    const validColors = colors.filter(c => c && c.trim());
    if (validColors.length < 2) return true;
    
    // Check if all colors are complementary or match
    for (let i = 0; i < validColors.length; i++) {
      for (let j = i + 1; j < validColors.length; j++) {
        const c1 = validColors[i].toLowerCase().trim();
        const c2 = validColors[j].toLowerCase().trim();
        
        // Same color (monochromatic) - harmonious
        if (c1 === c2) continue;
        
        // Complementary colors - harmonious
        if (areColorsComplementary(c1, c2)) continue;
        
        // Neutral colors work with anything
        const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'tan', 'navy', 'brown'];
        if (neutrals.includes(c1) || neutrals.includes(c2)) continue;
        
        // If none of the above, colors might clash
        return false;
      }
    }
    
    return true;
  };

  const calculateColorHarmonyScore = (outfit: any): number => {
    const colors: string[] = [];
    
    if (outfit.top?.color) colors.push(outfit.top.color);
    if (outfit.bottom?.color) colors.push(outfit.bottom.color);
    if (outfit.shoes?.color) colors.push(outfit.shoes.color);
    if (outfit.accessories && outfit.accessories.length > 0) {
      outfit.accessories.forEach((acc: any) => {
        if (acc.color) colors.push(acc.color);
      });
    }
    
    if (colors.length < 2) return 50; // Neutral score if not enough colors
    
    let score = 50; // Base score
    
    // Check complementary pairs
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        if (areColorsComplementary(colors[i], colors[j])) {
          score += 20; // Complementary colors boost score
        } else if (colors[i].toLowerCase() === colors[j].toLowerCase()) {
          score += 15; // Matching colors boost score
        } else {
          const neutrals = ['black', 'white', 'gray', 'grey', 'beige', 'tan', 'navy', 'brown'];
          if (neutrals.includes(colors[i].toLowerCase()) || neutrals.includes(colors[j].toLowerCase())) {
            score += 10; // Neutral colors work well
          } else {
            score -= 5; // Different non-complementary colors reduce score
          }
        }
      }
    }
    
    return Math.min(100, Math.max(0, score));
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

  // Helper function to handle subscription limit errors
  const handleSubscriptionLimitError = (response: Response, errorData: any) => {
    if (response.status === 403 && errorData.limitReached) {
      Alert.alert(
        'Daily Limit Reached',
        errorData.message || 'Daily limit reached! Free plan includes 5 outfit suggestions per day. Subscribe to Glamora PLUS for unlimited suggestions.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe to PLUS',
            onPress: () => router.push('/premium'),
            style: 'default'
          }
        ]
      );
      return true; // Indicates error was handled
    }
    return false; // Error not handled
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

      // Check generation limit before proceeding (atomic check and increment)
      console.log('🔍 Checking generation limit...');
      try {
        const limitResponse = await fetch(API_ENDPOINTS.recommendations.requestGeneration, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!limitResponse.ok) {
          let errorData: any = {};
          try {
            errorData = await limitResponse.json();
          } catch {
            const errorText = await limitResponse.text();
            throw new Error(errorText || 'Failed to check generation limit');
          }

          // Handle limit reached error
          if (limitResponse.status === 403 && errorData.limitReached) {
            Alert.alert(
              'Daily Limit Reached',
              errorData.message || 'Daily limit reached! Free plan includes 5 outfit suggestions per day. Subscribe to Glamora PLUS for unlimited suggestions.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Subscribe to PLUS',
                  onPress: () => router.push('/premium'),
                  style: 'default'
                }
              ]
            );
            setLoading(false);
            return;
          }

          // Other errors
          throw new Error(errorData.message || 'Failed to check generation limit');
        }

        const limitData = await limitResponse.json();
        console.log('✅ Generation limit check passed:', limitData);
        
        // Continue with generation if allowed
      } catch (limitError: any) {
        console.error('❌ Error checking generation limit:', limitError);
        
        // If it's a limit error, we already handled it above
        if (limitError.message?.includes('limit') || limitError.message?.includes('Daily limit')) {
          setLoading(false);
          return;
        }
        
        // For other errors, show alert but allow retry
        Alert.alert(
          'Error',
          limitError.message || 'Failed to check generation limit. Please try again.',
          [{ text: 'OK' }]
        );
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
          
          // Calculate color harmony score if toggle is ON
          if (useColorHarmony) {
            outfit.colorHarmonyScore = calculateColorHarmonyScore(outfit);
          }
          
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

      // Filter and sort by color harmony if toggle is ON
      if (useColorHarmony) {
        // Filter out outfits with low color harmony scores (below 40)
        const harmoniousOutfits = outfitCombinations.filter(outfit => 
          outfit.colorHarmonyScore >= 40
        );
        
        // If we have harmonious outfits, use them; otherwise use all
        if (harmoniousOutfits.length > 0) {
          // Sort by color harmony score (highest first)
          harmoniousOutfits.sort((a, b) => (b.colorHarmonyScore || 0) - (a.colorHarmonyScore || 0));
          // Take top 6 most harmonious
          outfitCombinations.length = 0;
          outfitCombinations.push(...harmoniousOutfits.slice(0, 6));
        } else {
          // If no harmonious outfits found, sort all by score and take best
          outfitCombinations.sort((a, b) => (b.colorHarmonyScore || 0) - (a.colorHarmonyScore || 0));
          outfitCombinations.splice(6);
        }
        
        console.log('🎨 Color harmony filter applied. Outfits:', outfitCombinations.length);
      }

      console.log('✅ Generated manual outfits:', outfitCombinations.length);
      await AsyncStorage.setItem('generatedOutfits', JSON.stringify(outfitCombinations));
      (router as any).push('/outfit-suggestions');
      
    } catch (error: any) {
      console.error('❌ Error generating outfits:', error);
      
      // Check if error contains subscription limit information
      if (error?.status === 403 || error?.response?.status === 403) {
        let errorData: any = {};
        try {
          if (error?.response) {
            errorData = await error.response.json().catch(() => ({}));
          } else if (error?.json) {
            errorData = await error.json().catch(() => ({}));
          } else if (typeof error === 'object' && error.limitReached) {
            errorData = error;
          }
        } catch {
          // If parsing fails, check error message
          if (error?.message?.includes('limit') || error?.message?.includes('Daily limit')) {
            errorData = { limitReached: true, message: error.message };
          }
        }
        
        if (errorData.limitReached) {
          Alert.alert(
            'Daily Limit Reached',
            errorData.message || 'Daily limit reached! Free plan includes 5 outfit suggestions per day. Subscribe to Glamora PLUS for unlimited suggestions.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Subscribe to PLUS',
                onPress: () => router.push('/premium'),
                style: 'default'
              }
            ]
          );
          setLoading(false);
          return;
        }
      }
      
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
      <View style={[
        styles.checkbox, 
        { borderColor: theme.colors.border },
        isSelected && [styles.checkboxSelected, { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }]
      ]}>
        {isSelected && <Ionicons name="checkmark" size={16} color={theme.colors.buttonText} />}
      </View>
      <Text style={[styles.checkboxText, { color: theme.colors.primaryText }]}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router as any).push('/profile')}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Combine</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* For Tops Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>For Tops</Text>
            <View style={styles.filterColumn}>
              <Text style={[styles.filterLabel, { color: theme.colors.primaryText }]}>Categories</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>For Bottoms</Text>
            <View style={styles.filterColumn}>
              <Text style={[styles.filterLabel, { color: theme.colors.primaryText }]}>Categories</Text>
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

        {/* Color Harmony Section */}
        <View style={styles.section}>
          <View style={styles.aiToggleContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>🎨 Color Combination</Text>
            <TouchableOpacity 
              style={[styles.aiToggle, { backgroundColor: theme.colors.buttonSecondary }, useColorHarmony && { backgroundColor: theme.colors.accent }]}
              onPress={handleColorHarmonyToggle}
            >
              <Text style={[styles.aiToggleText, { color: theme.colors.primaryText }, useColorHarmony && { color: theme.colors.buttonText }]}>
                {useColorHarmony ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.locationHint, { color: theme.colors.secondaryText }]}>
            When ON, suggests outfits with colors that complement each other.
          </Text>
        </View>

        {/* Weather API Section - Always available */}
        <View style={styles.section}>
          <View style={styles.aiToggleContainer}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>🌤️ Real-time Weather</Text>
            <TouchableOpacity 
              style={[styles.aiToggle, { backgroundColor: theme.colors.containerBackground }, useWeatherAPI && { backgroundColor: theme.colors.buttonBackground }]}
              onPress={handleWeatherAPIToggle}
            >
              <Text style={[styles.aiToggleText, { color: theme.colors.primaryText }, useWeatherAPI && { color: theme.colors.buttonText }]}>
                {useWeatherAPI ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
          {useWeatherAPI && (
            <View style={styles.locationInputContainer}>
              <Text style={[styles.locationLabel, { color: theme.colors.primaryText }]}>Your Location:</Text>
              <TextInput
                style={[styles.locationInput, { backgroundColor: theme.colors.containerBackground, color: theme.colors.primaryText, borderColor: theme.colors.border }]}
                placeholder="e.g., Manila, Philippines"
                value={userLocation}
                onChangeText={setUserLocation}
                placeholderTextColor={theme.colors.secondaryText}
              />
              <Text style={[styles.locationHint, { color: theme.colors.secondaryText }]}>
                Weather will influence tops, bottoms, shoes and accessories.
              </Text>
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Preferences</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterColumn}>
              <Text style={[styles.filterLabel, { color: theme.colors.primaryText }]}>Occasion</Text>
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
              <Text style={[styles.filterLabel, { color: theme.colors.primaryText }]}>Style</Text>
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
          style={[styles.confirmButton, { backgroundColor: theme.colors.buttonBackground }]} 
          onPress={generateOutfits}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.buttonText} />
          ) : (
            <Text style={[styles.confirmButtonText, { color: theme.colors.buttonText }]}>Generate Outfit Suggestions</Text>
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
          <View style={[styles.availabilityModalContent, { backgroundColor: theme.colors.containerBackground }]}>
            <Text style={[styles.availabilityModalTitle, { color: theme.colors.primaryText }]}>Missing Items</Text>
            <Text style={[styles.availabilityModalText, { color: theme.colors.secondaryText }]}>
              The following items are not available in your wardrobe for the selected criteria:
            </Text>
            
            <View style={styles.missingItemsList}>
              {missingCategories.map((category, index) => (
                <Text key={index} style={[styles.missingItemText, { color: theme.colors.primaryText }]}>
                  • {category}
                </Text>
              ))}
            </View>
            
            <Text style={[styles.availabilityModalSubtext, { color: theme.colors.secondaryText }]}>
              You can continue to generate outfit suggestions without these items, or cancel to add more items to your wardrobe.
            </Text>
            
            <View style={styles.availabilityModalButtons}>
              <TouchableOpacity 
                style={[styles.availabilityCancelButton, { backgroundColor: theme.colors.containerBackground }]}
                onPress={handleCancelGeneration}
              >
                <Text style={[styles.availabilityCancelButtonText, { color: theme.colors.primaryText }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.availabilityContinueButton, { backgroundColor: theme.colors.buttonBackground }]}
                onPress={handleContinueWithoutMissing}
              >
                <Text style={[styles.availabilityContinueButtonText, { color: theme.colors.buttonText }]}>Continue</Text>
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
