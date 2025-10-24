import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useAuth } from './contexts/AuthContext';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const decideInitialRoute = async () => {
      try {
        if (isAuthenticated) {
          // User is authenticated, go to main app
          console.log('✅ User is authenticated, redirecting to wardrobe');
          router.replace('/wardrobe');
          return;
        }

        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (hasLaunched === 'true') {
          // User has launched before but not authenticated, go to login
          console.log('🔄 User has launched before, redirecting to login');
          router.replace('/login');
          return;
        }
        
        // First time user, show onboarding
        console.log('👋 First time user, showing onboarding');
      } catch (e) {
        console.error('Error checking auth status:', e);
        // If anything fails, just show onboarding
      } finally {
        setIsChecking(false);
      }
    };

    // Only decide route when auth loading is complete
    if (!isLoading) {
      decideInitialRoute();
    }
  }, [router, isAuthenticated, isLoading]);

  if (isChecking || isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFE8C8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
    } catch (e) {
      // ignore
    }
    router.push('/login');
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.text}>WELCOME TO GLAMORA</Text>
      <Text style={styles.subtext}>Choose your outfit</Text>

      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>GET STARTED</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
    alignItems: 'center',
    paddingTop: 30,
  },
  logo: {
    width: 280,
    height: 280,
    resizeMode: 'contain',
    marginBottom: 30,
    marginTop: 50,
  },
  text: {
    fontSize: 48,
    fontFamily: 'PlayfairDisplay-Medium',
    marginBottom: 10,
    textAlign: 'center',
    color: 'white',
    letterSpacing: 2,
  },
  subtext: {
    fontSize: 28,
    fontFamily: 'PlayfairDisplay-Medium',
    marginBottom: 40,
    color: 'white',
    opacity: 0.9,
  },
  button: {
    backgroundColor: '#FDD6A5',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 15,
    marginTop: 80,
    width: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'black',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  loadingText: {
    color: '#4B2E2B',
    fontSize: 16,
    marginTop: 20,
  },
});
