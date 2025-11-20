import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from './contexts/ThemeContext';

interface OutfitItem {
  wardrobeItemId: string;
  itemName: string;
  itemDescription: string;
  itemImageUrl: string;
  itemCategory: string;
  displayCategory?: string; // Optional: indicates which container this item was in (top, bottom, shoes, accessories)
}

interface Outfit {
  _id: string;
  outfitName: string;
  outfitItems: OutfitItem[];
  occasion?: string;
  weather?: string;
  notes?: string;
  isFavorite: boolean;
  wornDate: string;
  createdAt: string;
}

export default function OutfitHistoryDetail() {
  const router = useRouter();
  const { theme } = useTheme();
  const { outfitData } = useLocalSearchParams();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingUsage, setTrackingUsage] = useState(false);

  useEffect(() => {
    if (outfitData) {
      try {
        const parsedOutfit = JSON.parse(outfitData as string);
        console.log('Parsed outfit data:', parsedOutfit);
        console.log('Outfit items:', parsedOutfit.outfitItems);
        setOutfit(parsedOutfit);
      } catch (error) {
        console.error('Error parsing outfit data:', error);
        Alert.alert('Error', 'Failed to load outfit details');
        router.back();
      }
    } else {
      Alert.alert('Error', 'No outfit data provided');
      router.back();
    }
    setLoading(false);
  }, [outfitData, router]);

  const trackClothingUsage = async (outfitId: string) => {
    setTrackingUsage(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to track usage');
        return;
      }

      const response = await fetch(API_ENDPOINTS.clothingUsage.track, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outfitId }),
      });

      if (response.ok) {
        console.log('✅ Clothing usage tracked successfully');
        Alert.alert('Success', 'Outfit usage tracked! This will appear in your analytics.');
      } else {
        console.error('❌ Failed to track clothing usage');
        Alert.alert('Error', 'Failed to track usage. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error tracking clothing usage:', error);
      Alert.alert('Error', 'Failed to track usage. Please try again.');
    } finally {
      setTrackingUsage(false);
    }
  };

  const handleUseOutfit = () => {
    if (!outfit) return;
    
    Alert.alert(
      'Use This Outfit',
      'Mark this outfit as worn today? This will track it in your analytics.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Use It', onPress: () => trackClothingUsage(outfit._id) }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Normalize category to standard form (top, bottom, shoes, accessories)
  // This function is used as fallback for backward compatibility when displayCategory is not available
  const normalizeCategoryToStandard = (cat?: string): string | null => {
    if (!cat) return null;
    const normalized = cat.toLowerCase().trim();
    
    // Remove special characters and spaces for better matching
    const cleanCat = normalized.replace(/[^a-z0-9]/g, '');
    
    // Priority-based matching: check each category in order and return first match
    // This ensures an item can only match one category
    
    // 1. Check for Accessories first (most specific keywords)
    if (normalized === 'accessory' || normalized === 'accessories' ||
        cleanCat === 'accessory' || cleanCat === 'accessories') {
      return 'accessories';
    }
    const accessoryKeywords = ['bag', 'belt', 'scarf', 'hat', 'cap', 'sunglass', 'sunglasses', 'jewel', 'jewelry', 'umbrella'];
    for (const keyword of accessoryKeywords) {
      // Exact match or starts with keyword (most precise)
      if (cleanCat === keyword || normalized === keyword || cleanCat.startsWith(keyword) || normalized.startsWith(keyword)) {
        return 'accessories';
      }
    }
    
    // 2. Check for Shoes (specific keywords)
    if (normalized === 'shoe' || normalized === 'shoes' || normalized === 'footwear' ||
        cleanCat === 'shoe' || cleanCat === 'shoes' || cleanCat === 'footwear') {
      return 'shoes';
    }
    const shoeKeywords = ['sneaker', 'sneakers', 'heel', 'heels', 'boot', 'boots', 'sandal', 'sandals', 'flat', 'flats', 'loafer', 'loafers'];
    for (const keyword of shoeKeywords) {
      if (cleanCat === keyword || normalized === keyword || cleanCat.startsWith(keyword) || normalized.startsWith(keyword)) {
        return 'shoes';
      }
    }
    
    // 3. Check for Bottoms (specific keywords)
    if (normalized === 'bottom' || normalized === 'bottoms' ||
        cleanCat === 'bottom' || cleanCat === 'bottoms') {
      return 'bottom';
    }
    const bottomKeywords = ['jeans', 'trousers', 'trouser', 'shorts', 'skirt', 'skirts', 'legging', 'leggings', 'jogger', 'joggers', 'pants', 'slacks'];
    for (const keyword of bottomKeywords) {
      if (cleanCat === keyword || normalized === keyword || cleanCat.startsWith(keyword) || normalized.startsWith(keyword)) {
        return 'bottom';
      }
    }
    
    // 4. Check for Tops last (catch-all for upper body items)
    if (normalized === 'top' || normalized === 'tops' ||
        cleanCat === 'top' || cleanCat === 'tops') {
      return 'top';
    }
    const topKeywords = ['tshirt', 'shirt', 'camisole', 'blouse', 'tee', 'tank', 'jacket', 'sweater', 'hoodie', 'coat', 'outerwear', 'sweatshirt', 'cardigan', 'formal'];
    for (const keyword of topKeywords) {
      // For tops, allow more flexible matching since it's the catch-all
      if (cleanCat === keyword || normalized === keyword || 
          cleanCat.startsWith(keyword) || normalized.startsWith(keyword) ||
          cleanCat.includes(keyword) || normalized.includes(keyword)) {
        return 'top';
      }
    }
    
    return null;
  };

  // Get all items categorized properly using displayCategory (primary) or category matching (fallback)
  const categorizeOutfitItems = () => {
    if (!outfit || !outfit.outfitItems) {
      return { top: null, bottom: null, shoes: null, accessories: [] };
    }

    const categorized: { top: OutfitItem | null, bottom: OutfitItem | null, shoes: OutfitItem | null, accessories: OutfitItem[] } = {
      top: null,
      bottom: null,
      shoes: null,
      accessories: []
    };

    const usedItemIds = new Set<string>();

    // First pass: Use displayCategory if available (most reliable - based on user's container placement)
    outfit.outfitItems.forEach(item => {
      if (!item || usedItemIds.has(item.wardrobeItemId)) return;

      // Primary: Use displayCategory if available (new outfits saved with this field)
      if (item.displayCategory) {
        const displayCat = item.displayCategory.toLowerCase().trim();
        
        if (displayCat === 'top' && !categorized.top) {
          categorized.top = item;
          usedItemIds.add(item.wardrobeItemId);
        } else if (displayCat === 'bottom' && !categorized.bottom) {
          categorized.bottom = item;
          usedItemIds.add(item.wardrobeItemId);
        } else if (displayCat === 'shoes' && !categorized.shoes) {
          categorized.shoes = item;
          usedItemIds.add(item.wardrobeItemId);
        } else if (displayCat === 'accessories') {
          categorized.accessories.push(item);
          usedItemIds.add(item.wardrobeItemId);
        }
      }
    });

    // Second pass: Fallback to category matching for backward compatibility (old outfits without displayCategory)
    outfit.outfitItems.forEach(item => {
      if (!item || usedItemIds.has(item.wardrobeItemId)) return;

      // Skip if already categorized by displayCategory
      if (item.displayCategory) return;

      // Fallback: Use category matching for backward compatibility
      const itemCat = (item.itemCategory || '').toLowerCase().trim();
      const standardCategory = normalizeCategoryToStandard(itemCat);

      if (standardCategory === 'top' && !categorized.top) {
        categorized.top = item;
        usedItemIds.add(item.wardrobeItemId);
      } else if (standardCategory === 'bottom' && !categorized.bottom) {
        categorized.bottom = item;
        usedItemIds.add(item.wardrobeItemId);
      } else if (standardCategory === 'shoes' && !categorized.shoes) {
        categorized.shoes = item;
        usedItemIds.add(item.wardrobeItemId);
      } else if (standardCategory === 'accessories') {
        categorized.accessories.push(item);
        usedItemIds.add(item.wardrobeItemId);
      }
    });

    return categorized;
  };

  const renderItemCard = (title: string, item: OutfitItem | null | undefined, icon: string) => {
    if (!item || !item.itemName) {
      return (
        <View style={[styles.itemCard, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
          <View style={styles.itemCardHeader}>
            <Ionicons name={icon as any} size={24} color={theme.colors.secondaryText} />
            <Text style={[styles.itemCardTitle, { color: theme.colors.primaryText }]}>{title}</Text>
          </View>
          <View style={styles.emptyItemContent}>
            <Ionicons name="remove-circle-outline" size={32} color={theme.colors.secondaryText} />
            <Text style={[styles.emptyItemText, { color: theme.colors.secondaryText }]}>No {title.toLowerCase()} selected</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.itemCard, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
        <View style={styles.itemCardHeader}>
          <Ionicons name={icon as any} size={24} color={theme.colors.icon} />
          <Text style={[styles.itemCardTitle, { color: theme.colors.primaryText }]}>{title}</Text>
        </View>
        <View style={styles.itemCardContent}>
          {item.itemImageUrl ? (
            <Image
              source={{ uri: item.itemImageUrl }}
              style={styles.itemImage}
              resizeMode="cover"
              onError={() => console.log(`${title} image failed to load:`, item.itemImageUrl)}
            />
          ) : (
            <View style={[styles.itemImage, styles.placeholderImage, { backgroundColor: theme.colors.containerBackground }]}>
              <Ionicons name="image-outline" size={24} color={theme.colors.secondaryText} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: theme.colors.primaryText }]}>{item.itemName || 'Unknown Item'}</Text>
            <Text style={[styles.itemDescription, { color: theme.colors.secondaryText }]}>
              {item.itemDescription && item.itemDescription.trim() ? item.itemDescription : (item.itemCategory ? `${item.itemCategory} item` : 'Item')}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAccessoriesCard = (accessories: OutfitItem[]) => {
    if (!accessories || accessories.length === 0) {
      return (
        <View style={[styles.itemCard, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
          <View style={styles.itemCardHeader}>
            <Ionicons name="diamond-outline" size={24} color={theme.colors.secondaryText} />
            <Text style={[styles.itemCardTitle, { color: theme.colors.primaryText }]}>Accessories</Text>
          </View>
          <View style={styles.emptyItemContent}>
            <Ionicons name="remove-circle-outline" size={32} color={theme.colors.secondaryText} />
            <Text style={[styles.emptyItemText, { color: theme.colors.secondaryText }]}>No accessories selected</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.itemCard, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
        <View style={styles.itemCardHeader}>
          <Ionicons name="diamond-outline" size={24} color={theme.colors.icon} />
          <Text style={[styles.itemCardTitle, { color: theme.colors.primaryText }]}>Accessories</Text>
        </View>
        <View style={styles.accessoriesList}>
          {accessories.map((accessory, index) => (
            <View key={index} style={styles.accessoryItem}>
              <Image
                source={{ uri: accessory.itemImageUrl }}
                style={styles.accessoryImage}
                resizeMode="cover"
                onError={() => console.log('Accessory image failed to load:', accessory.itemImageUrl)}
              />
              <View style={styles.accessoryInfo}>
                <Text style={[styles.accessoryName, { color: theme.colors.primaryText }]}>{accessory.itemName || 'Unknown Item'}</Text>
                <Text style={[styles.accessoryDescription, { color: theme.colors.secondaryText }]}>
                  {accessory.itemDescription && accessory.itemDescription.trim() ? accessory.itemDescription : (accessory.itemCategory ? `${accessory.itemCategory} item` : 'Item')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bodyBackground }]}>
        <Text style={[styles.loadingText, { color: theme.colors.primaryText }]}>Loading outfit details...</Text>
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Combine History</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.primaryText }]}>No outfit data available</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={[styles.backButtonText, { color: theme.colors.primaryText }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Enhanced category matching with fallbacks
  // Categorize all outfit items properly
  const categorizedItems = categorizeOutfitItems();
  const topItem = categorizedItems.top;
  const bottomItem = categorizedItems.bottom;
  const shoesItem = categorizedItems.shoes;
  const accessories = categorizedItems.accessories;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Combine History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Outfit Name */}
        <View style={styles.outfitHeader}>
          <Text style={[styles.outfitName, { color: theme.colors.primaryText }]}>{outfit.outfitName}</Text>
        </View>

        {/* Outfit Preview Images */}
        <View style={styles.outfitPreview}>
          {topItem && (
            <View style={styles.outfitImageContainer}>
              <Image
                source={{ uri: topItem.itemImageUrl }}
                style={styles.outfitImage}
                resizeMode="cover"
                onError={() => console.log('Top image failed to load:', topItem.itemImageUrl)}
              />
            </View>
          )}
          {bottomItem && (
            <View style={styles.outfitImageContainer}>
              <Image
                source={{ uri: bottomItem.itemImageUrl }}
                style={[styles.outfitImage, styles.outfitImageOverlap]}
                resizeMode="cover"
                onError={() => console.log('Bottom image failed to load:', bottomItem.itemImageUrl)}
              />
            </View>
          )}
        </View>

        {/* Date and Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: 'rgba(255, 255, 255, 0.7)', borderColor: theme.colors.border }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.primaryText }]}>Date:</Text>
            <Text style={[styles.detailValue, { color: theme.colors.secondaryText }]}>{formatDate(outfit.wornDate || outfit.createdAt)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: theme.colors.primaryText }]}>Clothes details:</Text>
          </View>
          
          {/* Item Cards */}
          <View style={styles.itemsContainer}>
            {renderItemCard('Top', topItem, 'shirt-outline')}
            {renderItemCard('Bottom', bottomItem, 'shirt-outline')}
            {renderItemCard('Shoes', shoesItem, 'walk-outline')}
            {renderAccessoriesCard(accessories)}
          </View>

          {/* Additional Details */}
          {outfit.occasion && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.primaryText }]}>Occasion:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.secondaryText }]}>{outfit.occasion}</Text>
            </View>
          )}

          {outfit.weather && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.primaryText }]}>Weather:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.secondaryText }]}>{outfit.weather}</Text>
            </View>
          )}

          {outfit.notes && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.primaryText }]}>Notes:</Text>
              <Text style={[styles.detailValue, { color: theme.colors.secondaryText }]}>{outfit.notes}</Text>
            </View>
          )}
        </View>

        {/* Use It Button */}
        <TouchableOpacity 
          style={[styles.useItButton, { backgroundColor: theme.colors.buttonBackground }]}
          onPress={handleUseOutfit}
          disabled={trackingUsage}
        >
          <Text style={[styles.useItButtonText, { color: theme.colors.buttonText }]}>
            {trackingUsage ? 'Tracking...' : 'Use This Outfit'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF7F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FDF7F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5D1C0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FDF7F5',
  },
  loadingText: {
    fontSize: 18,
    color: '#4B2E2B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#4B2E2B',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  outfitHeader: {
    marginTop: 20,
    marginBottom: 16,
  },
  outfitName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  outfitPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  outfitImageContainer: {
    position: 'relative',
    width: 100,
    height: 120,
  },
  outfitImage: {
    width: 100,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  outfitImageOverlap: {
    marginLeft: -20,
    zIndex: 1,
  },
  detailsCard: {
    backgroundColor: '#F8E3D6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#4B2E2B',
  },
  itemsContainer: {
    marginTop: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginLeft: 8,
  },
  itemCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyItemContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyItemText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accessoriesList: {
    gap: 8,
  },
  accessoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8E3D6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  accessoryImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  accessoryInfo: {
    flex: 1,
  },
  accessoryName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 2,
  },
  accessoryDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  useItButton: {
    backgroundColor: '#F8E3D6',
    borderWidth: 2,
    borderColor: '#4B2E2B',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    marginBottom: 30,
    alignItems: 'center',
  },
  useItButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
});