import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useTheme } from './contexts/ThemeContext';

interface BodyMeasurements {
  height?: number;
  weight?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
  shoulder?: number;
  armLength?: number;
  shoeSize?: number;
  measurementsUnit: 'cm' | 'inches';
}

interface StylePreferences {
  preferredColors: string[];
  preferredStyles: string[];
  sizePreferences: {
    tops?: string;
    bottoms?: string;
    shoes?: string;
  };
  fitPreferences: {
    tops: 'loose' | 'regular' | 'fitted';
    bottoms: 'loose' | 'regular' | 'fitted';
  };
}

export default function BodyMeasurements() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Form states
  const [measurements, setMeasurements] = useState<BodyMeasurements>({
    measurementsUnit: 'cm'
  });
  const [stylePreferences, setStylePreferences] = useState<StylePreferences>({
    preferredColors: [],
    preferredStyles: [],
    sizePreferences: {},
    fitPreferences: {
      tops: 'regular',
      bottoms: 'regular'
    }
  });
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [allowRecommendations, setAllowRecommendations] = useState(true);

  // Style options
  const colorOptions = ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Purple', 'Pink', 'Brown', 'Gray'];
  const styleOptions = ['Casual', 'Formal', 'Vintage', 'Minimalist', 'Bohemian', 'Sporty', 'Elegant', 'Streetwear'];
  const sizeOptions = {
    tops: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    bottoms: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    shoes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
  };
  const fitOptions = ['loose', 'regular', 'fitted'];

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        
        // Load existing profile data
        if (user.email) {
          await fetchUserProfile(user.email);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchUserProfile = async (email: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.baseUrl}/api/auth/profile/${email}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.user.bodyMeasurements) {
          setMeasurements(data.user.bodyMeasurements);
        }
        if (data.user.stylePreferences) {
          setStylePreferences(data.user.stylePreferences);
        }
        if (data.user.profileSettings) {
          setShowMeasurements(data.user.profileSettings.showMeasurements || false);
          setAllowRecommendations(data.user.profileSettings.allowPersonalizedRecommendations || true);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.email) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch(`${API_ENDPOINTS.baseUrl}/api/auth/profile/measurements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: currentUser.email,
          bodyMeasurements: measurements,
          stylePreferences: stylePreferences,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local storage with new user data
        const updatedUser = { ...currentUser, ...data.user };
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        
        Alert.alert('Success', 'Body measurements and style preferences saved successfully!');
        router.back();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to save measurements');
      }
    } catch (error) {
      console.error('Error saving measurements:', error);
      Alert.alert('Error', 'Failed to save measurements. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleColor = (color: string) => {
    setStylePreferences(prev => ({
      ...prev,
      preferredColors: prev.preferredColors.includes(color)
        ? prev.preferredColors.filter(c => c !== color)
        : [...prev.preferredColors, color]
    }));
  };

  const toggleStyle = (style: string) => {
    setStylePreferences(prev => ({
      ...prev,
      preferredStyles: prev.preferredStyles.includes(style)
        ? prev.preferredStyles.filter(s => s !== style)
        : [...prev.preferredStyles, style]
    }));
  };

  const updateMeasurement = (field: keyof BodyMeasurements, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setMeasurements(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const updateSizePreference = (category: keyof StylePreferences['sizePreferences'], size: string) => {
    setStylePreferences(prev => ({
      ...prev,
      sizePreferences: {
        ...prev.sizePreferences,
        [category]: size
      }
    }));
  };

  const updateFitPreference = (category: keyof StylePreferences['fitPreferences'], fit: string) => {
    setStylePreferences(prev => ({
      ...prev,
      fitPreferences: {
        ...prev.fitPreferences,
        [category]: fit as any
      }
    }));
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bodyBackground }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.primaryText }]}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.icon} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.headerText }]}>Body Measurements</Text>
        <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.buttonText} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.buttonText }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Body Measurements Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Body Measurements</Text>
          
          {/* Unit Toggle */}
          <View style={styles.unitToggle}>
            <Text style={[styles.unitLabel, { color: theme.colors.primaryText }]}>Unit:</Text>
            <TouchableOpacity
              style={[
                styles.unitButton,
                { backgroundColor: theme.colors.buttonSecondary },
                measurements.measurementsUnit === 'cm' && { backgroundColor: theme.colors.accent }
              ]}
              onPress={() => setMeasurements(prev => ({ ...prev, measurementsUnit: 'cm' }))}
            >
              <Text style={[
                styles.unitButtonText,
                { color: theme.colors.primaryText },
                measurements.measurementsUnit === 'cm' && { color: theme.colors.buttonText }
              ]}>CM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.unitButton,
                { backgroundColor: theme.colors.buttonSecondary },
                measurements.measurementsUnit === 'inches' && { backgroundColor: theme.colors.accent }
              ]}
              onPress={() => setMeasurements(prev => ({ ...prev, measurementsUnit: 'inches' }))}
            >
              <Text style={[
                styles.unitButtonText,
                { color: theme.colors.primaryText },
                measurements.measurementsUnit === 'inches' && { color: theme.colors.buttonText }
              ]}>IN</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Measurements */}
          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Height ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.height?.toString() || ''}
              onChangeText={(value) => updateMeasurement('height', value)}
              placeholder="Enter height"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Weight (kg)</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.weight?.toString() || ''}
              onChangeText={(value) => updateMeasurement('weight', value)}
              placeholder="Enter weight"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          {/* Body Measurements */}
          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Bust ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.bust?.toString() || ''}
              onChangeText={(value) => updateMeasurement('bust', value)}
              placeholder="Enter bust"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Waist ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.waist?.toString() || ''}
              onChangeText={(value) => updateMeasurement('waist', value)}
              placeholder="Enter waist"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Hips ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.hips?.toString() || ''}
              onChangeText={(value) => updateMeasurement('hips', value)}
              placeholder="Enter hips"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Inseam ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.inseam?.toString() || ''}
              onChangeText={(value) => updateMeasurement('inseam', value)}
              placeholder="Enter inseam"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Shoulder ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.shoulder?.toString() || ''}
              onChangeText={(value) => updateMeasurement('shoulder', value)}
              placeholder="Enter shoulder"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Arm Length ({measurements.measurementsUnit})</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.armLength?.toString() || ''}
              onChangeText={(value) => updateMeasurement('armLength', value)}
              placeholder="Enter arm length"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.measurementRow}>
            <Text style={[styles.measurementLabel, { color: theme.colors.primaryText }]}>Shoe Size (EU)</Text>
            <TextInput
              style={[styles.measurementInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.inputText }]}
              value={measurements.shoeSize?.toString() || ''}
              onChangeText={(value) => updateMeasurement('shoeSize', value)}
              placeholder="Enter shoe size"
              placeholderTextColor={theme.colors.placeholderText}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Style Preferences Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Style Preferences</Text>
          
          {/* Preferred Colors */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.primaryText }]}>Preferred Colors</Text>
          <View style={styles.tagContainer}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.tag,
                  { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                  stylePreferences.preferredColors.includes(color) && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                ]}
                onPress={() => toggleColor(color)}
              >
                <Text style={[
                  styles.tagText,
                  { color: theme.colors.primaryText },
                  stylePreferences.preferredColors.includes(color) && { color: theme.colors.buttonText }
                ]}>
                  {color}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Preferred Styles */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.primaryText }]}>Preferred Styles</Text>
          <View style={styles.tagContainer}>
            {styleOptions.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.tag,
                  { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                  stylePreferences.preferredStyles.includes(style) && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                ]}
                onPress={() => toggleStyle(style)}
              >
                <Text style={[
                  styles.tagText,
                  { color: theme.colors.primaryText },
                  stylePreferences.preferredStyles.includes(style) && { color: theme.colors.buttonText }
                ]}>
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Size Preferences */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.primaryText }]}>Size Preferences</Text>
          
          <View style={styles.preferenceRow}>
            <Text style={[styles.preferenceLabel, { color: theme.colors.primaryText }]}>Tops:</Text>
            <View style={styles.sizeButtonContainer}>
              {sizeOptions.tops.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                    stylePreferences.sizePreferences.tops === size && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                  ]}
                  onPress={() => updateSizePreference('tops', size)}
                >
                  <Text style={[
                    styles.sizeButtonText,
                    { color: theme.colors.primaryText },
                    stylePreferences.sizePreferences.tops === size && { color: theme.colors.buttonText }
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={[styles.preferenceLabel, { color: theme.colors.primaryText }]}>Bottoms:</Text>
            <View style={styles.sizeButtonContainer}>
              {sizeOptions.bottoms.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                    stylePreferences.sizePreferences.bottoms === size && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                  ]}
                  onPress={() => updateSizePreference('bottoms', size)}
                >
                  <Text style={[
                    styles.sizeButtonText,
                    { color: theme.colors.primaryText },
                    stylePreferences.sizePreferences.bottoms === size && { color: theme.colors.buttonText }
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={[styles.preferenceLabel, { color: theme.colors.primaryText }]}>Shoes:</Text>
            <View style={styles.sizeButtonContainer}>
              {sizeOptions.shoes.map((size) => (
                <TouchableOpacity
                  key={size}
                  style={[
                    styles.sizeButton,
                    { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                    stylePreferences.sizePreferences.shoes === size && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                  ]}
                  onPress={() => updateSizePreference('shoes', size)}
                >
                  <Text style={[
                    styles.sizeButtonText,
                    { color: theme.colors.primaryText },
                    stylePreferences.sizePreferences.shoes === size && { color: theme.colors.buttonText }
                  ]}>
                    {size}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Fit Preferences */}
          <Text style={[styles.subsectionTitle, { color: theme.colors.primaryText }]}>Fit Preferences</Text>
          
          <View style={styles.preferenceRow}>
            <Text style={[styles.preferenceLabel, { color: theme.colors.primaryText }]}>Tops:</Text>
            <View style={styles.fitButtonContainer}>
              {fitOptions.map((fit) => (
                <TouchableOpacity
                  key={fit}
                  style={[
                    styles.fitButton,
                    { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                    stylePreferences.fitPreferences.tops === fit && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                  ]}
                  onPress={() => updateFitPreference('tops', fit)}
                >
                  <Text style={[
                    styles.fitButtonText,
                    { color: theme.colors.primaryText },
                    stylePreferences.fitPreferences.tops === fit && { color: theme.colors.buttonText }
                  ]}>
                    {fit.charAt(0).toUpperCase() + fit.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.preferenceRow}>
            <Text style={[styles.preferenceLabel, { color: theme.colors.primaryText }]}>Bottoms:</Text>
            <View style={styles.fitButtonContainer}>
              {fitOptions.map((fit) => (
                <TouchableOpacity
                  key={fit}
                  style={[
                    styles.fitButton,
                    { backgroundColor: theme.colors.buttonSecondary, borderColor: theme.colors.border },
                    stylePreferences.fitPreferences.bottoms === fit && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                  ]}
                  onPress={() => updateFitPreference('bottoms', fit)}
                >
                  <Text style={[
                    styles.fitButtonText,
                    { color: theme.colors.primaryText },
                    stylePreferences.fitPreferences.bottoms === fit && { color: theme.colors.buttonText }
                  ]}>
                    {fit.charAt(0).toUpperCase() + fit.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Privacy Settings Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primaryText }]}>Privacy Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.primaryText }]}>Show measurements to others</Text>
            <Switch
              value={showMeasurements}
              onValueChange={setShowMeasurements}
              trackColor={{ false: theme.colors.buttonSecondary, true: theme.colors.accent }}
              thumbColor={theme.colors.buttonText}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.primaryText }]}>Allow personalized recommendations</Text>
            <Switch
              value={allowRecommendations}
              onValueChange={setAllowRecommendations}
              trackColor={{ false: theme.colors.buttonSecondary, true: theme.colors.accent }}
              thumbColor={theme.colors.buttonText}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4C2C2',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4B2E2B',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B2E2B',
  },
  saveButton: {
    backgroundColor: '#8B4513',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#F8E3D6',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5D1C0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginBottom: 16,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  unitLabel: {
    fontSize: 16,
    color: '#4B2E2B',
    marginRight: 16,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#8B4513',
    marginRight: 8,
  },
  unitButtonActive: {
    backgroundColor: '#8B4513',
  },
  unitButtonText: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  measurementLabel: {
    fontSize: 16,
    color: '#4B2E2B',
    flex: 1,
  },
  measurementInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5D1C0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 120,
    textAlign: 'center',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B2E2B',
    marginTop: 20,
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5D1C0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tagSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  tagText: {
    color: '#4B2E2B',
    fontSize: 14,
  },
  tagTextSelected: {
    color: '#fff',
  },
  preferenceRow: {
    marginBottom: 16,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#4B2E2B',
    marginBottom: 8,
  },
  sizeButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sizeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5D1C0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  sizeButtonSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  sizeButtonText: {
    color: '#4B2E2B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sizeButtonTextSelected: {
    color: '#fff',
  },
  fitButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fitButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5D1C0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  fitButtonSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#8B4513',
  },
  fitButtonText: {
    color: '#4B2E2B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fitButtonTextSelected: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#4B2E2B',
    flex: 1,
  },
}); 