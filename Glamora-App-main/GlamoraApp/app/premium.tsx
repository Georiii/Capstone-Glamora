import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function Premium() {
  const router = useRouter();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setCheckingStatus(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.subscriptionStatus, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.isSubscribed || false);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please log in to subscribe');
        router.push('/login');
        return;
      }

      const response = await fetch(API_ENDPOINTS.subscribe, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to subscribe. Please try again.');
        return;
      }

      setIsSubscribed(true);
      
      // Update AsyncStorage user data
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.isSubscribed = true;
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
      } catch (storageError) {
        console.error('Error updating user in storage:', storageError);
      }

      Alert.alert(
        'Success!',
        'Welcome to Glamora PLUS! You now have unlimited wardrobe storage and outfit suggestions.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error subscribing:', error);
      Alert.alert(
        'Error',
        error.message?.includes('Network request failed')
          ? 'Unable to connect to server. Please check your internet connection.'
          : 'Failed to subscribe. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <ImageBackground 
        source={require('../assets/Premium.jpg')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#5C3E30" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Glamora PLUS</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground 
      source={require('../assets/Premium.jpg')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#5C3E30" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Glamora PLUS</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Subscription Content */}
        <View style={styles.subscriptionContainer}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.glamoraText}>Glamora</Text>
          <Text style={styles.plusText}>PLUS</Text>
        </View>

        {/* Price */}
        <View style={styles.priceContainer}>
          <Text style={styles.pesoSign}>₱</Text>
          <Text style={styles.price}>120.00</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.featureText}>Unlimited Wardrobe storage</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.featureText}>Unlimited Outfit suggestion</Text>
          </View>
          
          <View style={styles.featureItem}>
            <View style={styles.checkmarkCircle}>
              <Ionicons name="checkmark" size={18} color="#4CAF50" />
            </View>
            <Text style={styles.featureText}>Remove ads</Text>
          </View>
        </View>

        {/* Subscribe Button */}
        {isSubscribed ? (
          <View style={styles.subscribedContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.subscribedText}>You&apos;re subscribed to Glamora PLUS!</Text>
            <Text style={styles.subscribedSubtext}>Enjoy unlimited features</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.subscribeButton, loading && styles.disabledButton]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            <Text style={styles.subscribeButtonText}>
              {loading ? 'Processing...' : 'Subscribe'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // Semi-transparent overlay for readability
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5C3E30',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  subscriptionContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.51)', // Light overlay for content area
    marginHorizontal: 16,
    borderRadius: 20,
    paddingBottom: 30,
    marginTop: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  glamoraText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5C3E30',
    fontFamily: 'sans-serif',
    letterSpacing: 1,
  },
  plusText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4AF37',
    fontFamily: 'sans-serif',
    letterSpacing: 1,
    marginTop: -5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  pesoSign: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5C3E30',
    marginRight: 4,
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#5C3E30',
  },
  divider: {
    height: 1,
    backgroundColor: '#D0D0D0',
    width: '100%',
    marginBottom: 30,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkmarkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    fontSize: 18,
    color: '#5C3E30',
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#D4AF37',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'sans-serif',
  },
  subscribedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  subscribedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C3E30',
    marginTop: 12,
    textAlign: 'center',
  },
  subscribedSubtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

