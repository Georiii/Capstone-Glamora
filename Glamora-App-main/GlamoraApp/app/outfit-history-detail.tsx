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

interface OutfitItem {
  wardrobeItemId: string;
  itemName: string;
  itemDescription: string;
  itemImageUrl: string;
  itemCategory: string;
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

  const getItemByCategory = (category: string) => {
    if (!outfit || !outfit.outfitItems) return null;
    return outfit.outfitItems.find(item => 
      item && item.itemCategory && item.itemCategory.toLowerCase().includes(category.toLowerCase())
    );
  };

  const getAccessories = () => {
    if (!outfit || !outfit.outfitItems) return [];
    return outfit.outfitItems.filter(item => 
      item && item.itemCategory && (
        item.itemCategory.toLowerCase().includes('accessory') ||
        item.itemCategory.toLowerCase().includes('jewelry') ||
        item.itemCategory.toLowerCase().includes('bag') ||
        item.itemCategory.toLowerCase().includes('hat')
      )
    );
  };

  const renderItemCard = (title: string, item: OutfitItem | null | undefined, icon: string) => {
    if (!item || !item.itemName) {
      return (
        <View style={styles.itemCard}>
          <View style={styles.itemCardHeader}>
            <Ionicons name={icon as any} size={24} color="#999" />
            <Text style={styles.itemCardTitle}>{title}</Text>
          </View>
          <View style={styles.emptyItemContent}>
            <Ionicons name="remove-circle-outline" size={32} color="#ccc" />
            <Text style={styles.emptyItemText}>No {title.toLowerCase()} selected</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemCardHeader}>
          <Ionicons name={icon as any} size={24} color="#4B2E2B" />
          <Text style={styles.itemCardTitle}>{title}</Text>
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
            <View style={[styles.itemImage, styles.placeholderImage]}>
              <Ionicons name="image-outline" size={24} color="#ccc" />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.itemName || 'Unknown Item'}</Text>
            <Text style={styles.itemDescription}>
              {item.itemDescription || `${item.itemCategory || 'Unknown'} item`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAccessoriesCard = (accessories: OutfitItem[]) => {
    if (!accessories || accessories.length === 0) {
      return (
        <View style={styles.itemCard}>
          <View style={styles.itemCardHeader}>
            <Ionicons name="diamond-outline" size={24} color="#999" />
            <Text style={styles.itemCardTitle}>Accessories</Text>
          </View>
          <View style={styles.emptyItemContent}>
            <Ionicons name="remove-circle-outline" size={32} color="#ccc" />
            <Text style={styles.emptyItemText}>No accessories selected</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemCardHeader}>
          <Ionicons name="diamond-outline" size={24} color="#4B2E2B" />
          <Text style={styles.itemCardTitle}>Accessories</Text>
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
                <Text style={styles.accessoryName}>{accessory.itemName}</Text>
                <Text style={styles.accessoryDescription}>
                  {accessory.itemDescription || `${accessory.itemCategory} item`}
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
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading outfit details...</Text>
      </View>
    );
  }

  if (!outfit) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Combine History</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No outfit data available</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const topItem = getItemByCategory('top') || getItemByCategory('shirt') || getItemByCategory('blouse');
  const bottomItem = getItemByCategory('bottom') || getItemByCategory('pants') || getItemByCategory('jeans') || getItemByCategory('shorts') || getItemByCategory('skirt');
  const shoesItem = getItemByCategory('shoes') || getItemByCategory('shoe') || getItemByCategory('sneaker') || getItemByCategory('boot');
  const accessories = getAccessories();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Combine History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Outfit Name */}
        <View style={styles.outfitHeader}>
          <Text style={styles.outfitName}>{outfit.outfitName}</Text>
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
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDate(outfit.wornDate || outfit.createdAt)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Clothes details:</Text>
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
              <Text style={styles.detailLabel}>Occasion:</Text>
              <Text style={styles.detailValue}>{outfit.occasion}</Text>
            </View>
          )}

          {outfit.weather && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Weather:</Text>
              <Text style={styles.detailValue}>{outfit.weather}</Text>
            </View>
          )}

          {outfit.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>{outfit.notes}</Text>
            </View>
          )}
        </View>

        {/* Use It Button */}
        <TouchableOpacity 
          style={styles.useItButton}
          onPress={handleUseOutfit}
          disabled={trackingUsage}
        >
          <Text style={styles.useItButtonText}>
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