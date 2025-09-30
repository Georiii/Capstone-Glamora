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

interface OutfitCombination {
  id: string;
  name: string;
  top: {
    _id: string;
    clothName: string;
    description: string;
    imageUrl: string;
    category: string;
    weather: string;
    color: string;
    style: string;
  };
  bottom: {
    _id: string;
    clothName: string;
    description: string;
    imageUrl: string;
    category: string;
    weather: string;
    color: string;
    style: string;
  };
  shoes?: {
    _id: string;
    clothName: string;
    description: string;
    imageUrl: string;
    category: string;
    weather: string;
    color: string;
    style: string;
  };
  accessories?: {
    _id: string;
    clothName: string;
    description: string;
    imageUrl: string;
    category: string;
    weather: string;
    color: string;
    style: string;
  }[];
  weather: string;
  occasion: string;
  weatherMeta?: {
    location?: string;
    temperature?: number;
    description?: string;
    icon?: string;
  } | null;
  confidence?: number;
  aiGenerated?: boolean;
  totalScore?: number;
  styleCoherence?: string;
  weatherSuitability?: string;
  occasionMatch?: string;
}

export default function OutfitDetails() {
  const router = useRouter();
  const { outfitData } = useLocalSearchParams();
  const [outfit, setOutfit] = useState<OutfitCombination | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (outfitData) {
      try {
        const parsedOutfit = JSON.parse(outfitData as string);
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

  const saveOutfit = async (outfit: OutfitCombination) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to save outfits');
        return;
      }

      const outfitData = {
        outfitName: outfit.name,
        outfitItems: [
          {
            wardrobeItemId: outfit.top._id,
            itemName: outfit.top.clothName,
            itemImageUrl: outfit.top.imageUrl,
            itemCategory: outfit.top.category,
          },
          {
            wardrobeItemId: outfit.bottom._id,
            itemName: outfit.bottom.clothName,
            itemImageUrl: outfit.bottom.imageUrl,
            itemCategory: outfit.bottom.category,
          }
        ],
        occasion: outfit.occasion,
        weather: outfit.weather,
        notes: 'Generated outfit combination'
      };

      // Add shoes if available
      if (outfit.shoes) {
        outfitData.outfitItems.push({
          wardrobeItemId: outfit.shoes._id,
          itemName: outfit.shoes.clothName,
          itemImageUrl: outfit.shoes.imageUrl,
          itemCategory: outfit.shoes.category,
        });
      }

      // Add accessories if available
      if (outfit.accessories && outfit.accessories.length > 0) {
        outfit.accessories.forEach(accessory => {
          outfitData.outfitItems.push({
            wardrobeItemId: accessory._id,
            itemName: accessory.clothName,
            itemImageUrl: accessory.imageUrl,
            itemCategory: accessory.category,
          });
        });
      }

      console.log('🔍 Saving outfit to backend:', outfitData);
      
      // Save to backend
      const response = await fetch(API_ENDPOINTS.outfits, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(outfitData),
      });

      if (response.ok) {
        const savedOutfit = await response.json();
        console.log('✅ Outfit saved successfully:', savedOutfit);
        
        // Track clothing usage for this outfit
        await trackClothingUsage(savedOutfit.outfit._id, token);
        
        Alert.alert(
          'Success!', 
          'Outfit saved to your collection!', 
          [
            {
              text: 'View Profile',
              onPress: () => goToProfile()
            },
            {
              text: 'Continue Browsing',
              style: 'cancel'
            }
          ]
        );
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Backend error:', response.status, errorData);
        Alert.alert('Error', `Failed to save outfit: ${errorData.message || 'Server error'}`);
      }
    } catch (error) {
      console.error('❌ Error saving outfit:', error);
      Alert.alert('Error', 'Failed to save outfit. Please check your connection and try again.');
    }
  };

  const goToProfile = () => {
    (router as any).push('/profile');
  };

  const trackClothingUsage = async (outfitId: string, token: string) => {
    try {
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
      } else {
        console.error('❌ Failed to track clothing usage');
      }
    } catch (error) {
      console.error('❌ Error tracking clothing usage:', error);
    }
  };

  const renderItemCard = (title: string, item: any, icon: string) => {
    if (!item) {
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
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
            resizeMode="cover"
            onError={() => console.log(`${title} image failed to load:`, item.imageUrl)}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.clothName}</Text>
            <Text style={styles.itemDescription}>
              {item.description || `${item.category} - ${item.color || 'N/A'}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAccessoriesCard = (accessories: any[]) => {
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
                source={{ uri: accessory.imageUrl }}
                style={styles.accessoryImage}
                resizeMode="cover"
                onError={() => console.log('Accessory image failed to load:', accessory.imageUrl)}
              />
              <View style={styles.accessoryInfo}>
                <Text style={styles.accessoryName}>{accessory.clothName}</Text>
                <Text style={styles.accessoryDescription}>
                  {accessory.description || `${accessory.category} - ${accessory.color || 'N/A'}`}
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
          <Text style={styles.headerTitle}>Outfit Details</Text>
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Outfit Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Outfit Name and Occasion */}
        <View style={styles.outfitHeader}>
          <Text style={styles.outfitName}>{outfit.name}</Text>
          <View style={styles.outfitBadge}>
            <Text style={styles.outfitBadgeText}>{outfit.occasion}</Text>
          </View>
        </View>

        {/* Weather Info */}
        {outfit.weatherMeta && (
          <View style={styles.weatherInfo}>
            <Ionicons name="partly-sunny" size={20} color="#4B2E2B" />
            <Text style={styles.weatherText}>
              {outfit.weatherMeta.location || 'Current location'} • {outfit.weatherMeta.description || outfit.weather}
              {outfit.weatherMeta.temperature && ` • ${outfit.weatherMeta.temperature}°C`}
            </Text>
          </View>
        )}

        {/* Item Cards */}
        <View style={styles.itemsContainer}>
          {renderItemCard('Top', outfit.top, 'shirt-outline')}
          {renderItemCard('Bottom', outfit.bottom, 'shirt-outline')}
          {renderItemCard('Shoes', outfit.shoes, 'walk-outline')}
          {renderAccessoriesCard(outfit.accessories || [])}
        </View>

        {/* Use It Button */}
        <TouchableOpacity 
          style={styles.useItButton}
          onPress={() => saveOutfit(outfit)}
        >
          <Text style={styles.useItButtonText}>Use it</Text>
        </TouchableOpacity>
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5D1C0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
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
    backgroundColor: '#F4C2C2',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 20,
  },
  outfitName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2E2B',
    flex: 1,
  },
  outfitBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  outfitBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8E3D6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  weatherText: {
    color: '#4B2E2B',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  itemsContainer: {
    marginBottom: 30,
  },
  itemCard: {
    backgroundColor: '#F8E3D6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  itemCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginLeft: 8,
  },
  itemCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
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
    paddingVertical: 20,
  },
  emptyItemText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  accessoriesList: {
    gap: 12,
  },
  accessoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  accessoryImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  accessoryInfo: {
    flex: 1,
  },
  accessoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 2,
  },
  accessoryDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  useItButton: {
    backgroundColor: '#F8E3D6',
    borderWidth: 2,
    borderColor: '#4B2E2B',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignSelf: 'center',
    marginBottom: 30,
    minWidth: 150,
    alignItems: 'center',
  },
  useItButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
});
