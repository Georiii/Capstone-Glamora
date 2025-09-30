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

  const handleOutfitPress = (outfit: OutfitCombination) => {
    // Navigate to outfit details with the outfit data
    router.push({
      pathname: '/outfit-details',
      params: {
        outfitData: JSON.stringify(outfit)
      }
    });
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
      {/* Weather Banner */}
      {outfits[0]?.weatherMeta ? (
        <View style={styles.weatherBanner}>
          <View style={styles.weatherLeft}>
            {outfits[0].weatherMeta?.icon ? (
              <Image source={{ uri: `https:${outfits[0].weatherMeta.icon}` }} style={styles.weatherIcon} />
            ) : (
              <Ionicons name="partly-sunny" size={20} color="#4B2E2B" />
            )}
            <Text style={styles.weatherText}>
              {outfits[0].weatherMeta?.location || 'Current location'} • {outfits[0].weatherMeta?.description || outfits[0].weather}
            </Text>
          </View>
          <Text style={styles.weatherTemp}>{outfits[0].weatherMeta?.temperature}°C</Text>
        </View>
      ) : (
        <View style={styles.weatherBanner}>
          <View style={styles.weatherLeft}>
            <Ionicons name="information-circle" size={20} color="#4B2E2B" />
            <Text style={styles.weatherText}>
              Weather data unavailable • Using general recommendations
            </Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router as any).push('/combine-outfits')}>
          <Ionicons name="arrow-back" size={24} color="#4B2E2B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Outfit Suggestions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Outfit List */}
        {outfits.map((outfit, index) => (
          <TouchableOpacity 
            key={outfit.id} 
            style={styles.outfitCard}
            onPress={() => handleOutfitPress(outfit)}
            activeOpacity={0.7}
          >
            {/* Outfit Header */}
            <View style={styles.outfitHeader}>
              <View style={styles.outfitTitleContainer}>
                <Text style={styles.outfitName}>
                  {outfit.name}
                  <Text style={styles.weatherOptimizedLabel}>  • Weather-Optimized Outfit</Text>
                </Text>
              </View>
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
              {/* Add more preview images if needed */}
              {outfit.shoes && (
                <View style={styles.outfitImageContainer}>
                  <Image
                    source={{ uri: outfit.shoes.imageUrl }}
                    style={[styles.outfitImage, styles.outfitImageOverlap]}
                    resizeMode="cover"
                    onError={() => console.log('Shoes image failed to load:', outfit.shoes?.imageUrl || 'No image URL')}
                  />
                </View>
              )}
            </View>

            {/* Quick Preview Info */}
            <View style={styles.quickPreview}>
              <Text style={styles.quickPreviewText}>
                {outfit.top.clothName} + {outfit.bottom.clothName}
                {outfit.shoes && ` + ${outfit.shoes.clothName}`}
                {outfit.accessories && outfit.accessories.length > 0 && ` + ${outfit.accessories.length} accessories`}
              </Text>
            </View>

            {/* Tap to view details hint */}
            <View style={styles.tapHint}>
              <Ionicons name="chevron-forward" size={16} color="#666" />
              <Text style={styles.tapHintText}>Tap to view details</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* View All Outfits Button */}
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => (router as any).push('/outfit-history')}
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
  quickPreview: {
    marginBottom: 12,
  },
  quickPreviewText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tapHintText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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
  outfitTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weatherOptimizedLabel: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 6,
  },
  weatherBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8E3D6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5D1C0',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  weatherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  weatherText: {
    color: '#4B2E2B',
    fontWeight: '600',
  },
  weatherTemp: {
    color: '#4B2E2B',
    fontWeight: '700',
  },
});