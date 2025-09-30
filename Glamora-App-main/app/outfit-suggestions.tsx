import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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
  weather: string;
  occasion: string;
}

export default function OutfitSuggestions() {
  const router = useRouter();
  const [outfits, setOutfits] = useState<OutfitCombination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGeneratedOutfits();
  }, []);

  const loadGeneratedOutfits = async () => {
    try {
      const outfitsData = await AsyncStorage.getItem('generatedOutfits');
      if (outfitsData) {
        const parsedOutfits = JSON.parse(outfitsData);
        setOutfits(parsedOutfits);
        console.log('Loaded outfits:', parsedOutfits.length);
      } else {
        Alert.alert('No Outfits', 'No outfit suggestions found. Please go back and generate some outfits.');
      }
    } catch (error) {
      console.error('Error loading outfits:', error);
      Alert.alert('Error', 'Failed to load outfit suggestions');
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert(
          'Success!', 
          'Outfit saved to your collection!', 
          [
            {
              text: 'View History',
              onPress: () => goToOutfitHistory()
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

  const goToOutfitHistory = () => {
    (router as any).push('/outfit-history');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading outfit suggestions...</Text>
      </View>
    );
  }

  if (outfits.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => (router as any).push('/combine-outfits')}>
            <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Outfit Suggestions</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No outfit suggestions found</Text>
          <TouchableOpacity style={styles.backToCombineButton} onPress={() => router.back()}>
            <Text style={styles.backToCombineButtonText}>Go Back to Combine</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router as any).push('/combine-outfits')}>
          <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Outfit Suggestions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Outfit Suggestions */}
        {outfits.map((outfit, index) => (
          <View key={outfit.id} style={styles.outfitCard}>
            {/* Outfit Header */}
            <View style={styles.outfitHeader}>
              <Text style={styles.outfitName}>{outfit.name}</Text>
              <View style={styles.outfitBadge}>
                <Text style={styles.outfitBadgeText}>{outfit.occasion}</Text>
              </View>
            </View>

            {/* Outfit Preview Images */}
            <View style={styles.outfitPreview}>
              <View style={styles.outfitImageContainer}>
                <Image
                  source={{ uri: outfit.top.imageUrl }}
                  style={styles.outfitImage}
                  resizeMode="cover"
                  onError={() => console.log('Top image failed to load:', outfit.top.imageUrl)}
                />
                {!outfit.top.imageUrl && (
                  <View style={[styles.outfitImage, styles.outfitImagePlaceholder]}>
                    <Ionicons name="shirt" size={24} color="#999" />
                  </View>
                )}
              </View>
              <View style={styles.outfitImageContainer}>
                <Image
                  source={{ uri: outfit.bottom.imageUrl }}
                  style={[styles.outfitImage, styles.outfitImageOverlap]}
                  resizeMode="cover"
                  onError={() => console.log('Bottom image failed to load:', outfit.bottom.imageUrl)}
                />
                {!outfit.bottom.imageUrl && (
                  <View style={[styles.outfitImage, styles.outfitImagePlaceholder]}>
                    <Ionicons name="shirt" size={24} color="#999" />
                  </View>
                )}
              </View>
            </View>

            {/* Outfit Details */}
            <View style={styles.outfitDetails}>
              {/* Top Item */}
              <View style={styles.itemSection}>
                <Text style={styles.itemLabel}>Top:</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{outfit.top.clothName}</Text>
                  <Text style={styles.itemDescription}>
                    {outfit.top.description || `${outfit.top.category} - ${outfit.top.color || 'N/A'}`}
                  </Text>
                </View>
              </View>

              {/* Bottom Item */}
              <View style={styles.itemSection}>
                <Text style={styles.itemLabel}>Bottom:</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{outfit.bottom.clothName}</Text>
                  <Text style={styles.itemDescription}>
                    {outfit.bottom.description || `${outfit.bottom.category} - ${outfit.bottom.color || 'N/A'}`}
                  </Text>
                </View>
              </View>

              {/* Weather and Occasion */}
              <View style={styles.itemSection}>
                <Text style={styles.itemLabel}>Weather:</Text>
                <Text style={styles.itemValue}>{outfit.weather}</Text>
              </View>
              <View style={styles.itemSection}>
                <Text style={styles.itemLabel}>Occasion:</Text>
                <Text style={styles.itemValue}>{outfit.occasion}</Text>
              </View>
            </View>

            {/* Use It Button */}
            <TouchableOpacity 
              style={styles.useItButton}
              onPress={() => saveOutfit(outfit)}
            >
              <Text style={styles.useItButtonText}>Use it</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* View All Outfits Button */}
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={goToOutfitHistory}
        >
          <Text style={styles.viewAllButtonText}>View Combine History</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8ECE6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#F8ECE6',
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
    backgroundColor: '#F8ECE6',
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
  backToCombineButton: {
    backgroundColor: '#F8E3D6',
    borderWidth: 1,
    borderColor: '#4B2E2B',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToCombineButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  outfitCard: {
    backgroundColor: '#F8E3D6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  outfitName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  outfitBadge: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  outfitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  outfitPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  outfitImageContainer: {
    position: 'relative',
    width: 80,
    height: 100,
  },
  outfitImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  outfitImageOverlap: {
    marginLeft: -20,
    zIndex: 1,
  },
  outfitImagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  outfitDetails: {
    marginBottom: 16,
  },
  itemSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    width: 80,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  itemValue: {
    fontSize: 16,
    color: '#4B2E2B',
    flex: 1,
  },
  useItButton: {
    backgroundColor: '#F8E3D6',
    borderWidth: 1,
    borderColor: '#4B2E2B',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-end',
  },
  useItButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  viewAllButton: {
    backgroundColor: '#F8E3D6',
    borderWidth: 1,
    borderColor: '#4B2E2B',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
    minWidth: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
});
