import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { useUser } from './contexts/UserContext';


export default function EditProfile() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const [name, setName] = useState('Name');
  const [email, setEmail] = useState('Email');
  const [role, setRole] = useState('User');
  const [profileImage, setProfileImage] = useState('https://randomuser.me/api/portraits/men/1.jpg');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfilePicture = useCallback(async (userEmail: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.getProfile(userEmail));
      if (response.ok) {
        const data = await response.json();
        if (data.user.profilePicture && data.user.profilePicture.url) {
          setProfileImage(data.user.profilePicture.url);
        }
      }
    } catch (error) {
      console.error('Error loading profile picture:', error);
    }
  }, []);

  const loadUserProfile = useCallback(async () => {
    try {
      if (user) {
        setName(user.name || 'Name');
        setEmail(user.email || 'Email');
        setRole(user.role || 'User');
        
        // Set profile picture from user context
        if (user.profilePicture?.url) {
          setProfileImage(user.profilePicture.url);
        }
        
        // Load profile picture from backend if not in context
        if (user.email && !user.profilePicture?.url) {
          await loadProfilePicture(user.email);
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loadProfilePicture]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to upload a profile picture.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        console.log('📸 Image picker result:', result);
        console.log('🖼️ Selected image URI:', imageUri);
        console.log('📁 Image asset:', result.assets[0]);
        await uploadProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfilePicture = async (imageUri: string) => {
    setIsUploading(true);
    
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) {
        Alert.alert('Error', 'User not found. Please login again.');
        return;
      }

      const user = JSON.parse(userStr);
      
      // Create FormData for upload
      const formData = new FormData();
      
      // For React Native, we need to handle the file differently
      if (Platform.OS === 'web') {
        // For web, we need to fetch the image and create a blob
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('image', blob, 'profile-picture.jpg');
      } else {
        // For React Native, use the file object format
        formData.append('image', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'profile-picture.jpg',
        } as any);
      }
      
      formData.append('email', user.email);

      console.log('📤 Uploading profile picture...');
      console.log('📧 Email:', user.email);
      console.log('🖼️ Image URI:', imageUri);
      console.log('🌐 Platform:', Platform.OS);

      // Upload to backend
      const uploadResponse = await fetch(API_ENDPOINTS.uploadProfilePicture, {
        method: 'POST',
        body: formData,
      });

      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        
        // Update local state
        setProfileImage(data.profilePicture.url);
        
        // Update global user context
        updateUser({ profilePicture: data.profilePicture });
        
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        const errorData = await uploadResponse.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(errorData.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!user?._id) {
      Alert.alert('Error', 'User not found. Please login again.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(API_ENDPOINTS.updateUser(user._id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: role,
          profilePicture: user.profilePicture, // Keep existing profile picture
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update global user context
        updateUser({
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          profilePicture: data.user.profilePicture,
        });
        
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Update failed' }));
        throw new Error(errorData.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to save profile: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B2E2B" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Profile Picture */}
      <View style={styles.profileImageContainer}>
        <TouchableOpacity 
          style={styles.profileImageWrapper}
          onPress={pickImage}
          disabled={isUploading}
        >
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
          <View style={styles.editIconContainer}>
            <Ionicons 
              name="camera" 
              size={20} 
              color="#fff" 
            />
          </View>
        </TouchableOpacity>
        <Text style={styles.editImageText}>Tap to change photo</Text>
      </View>

      {/* Profile Form */}
      <View style={styles.formContainer}>
        {/* Name Field */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Email Field */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Role Field */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Role</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
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
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4B2E2B',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editImageText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  roleContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
});