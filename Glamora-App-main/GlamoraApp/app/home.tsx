import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './contexts/ThemeContext';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    // Check if user is logged in
    const checkAuthStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const token = await AsyncStorage.getItem('token');
        
        if (userData && token) {
          setUser(JSON.parse(userData));
        } else {
          // No user data, redirect to login
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        router.replace('/login');
      }
    };
    
    checkAuthStatus();
  }, [router]);



  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <Text style={[styles.loading, { color: theme.colors.primaryText }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={[styles.title, { color: theme.colors.primaryText }]}>Welcome to Glamora!</Text>
      <Text style={[styles.email, { color: theme.colors.secondaryText }]}>{user.email}</Text>
      <TouchableOpacity style={[styles.mainAppButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={() => router.push('/wardrobe')}>
        <Text style={[styles.mainAppButtonText, { color: theme.colors.buttonText }]}>Go to Main App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4C2C2',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  mainAppButton: {
    backgroundColor: '#4B2E2B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 20,
  },
  mainAppButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  loading: {
    fontSize: 18,
    color: 'white',
  },
}); 