import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Dimensions, SafeAreaView, Platform } from 'react-native';
import { useAuth } from './contexts/AuthContext';
import * as Storage from '../utils/storage';

const { width, height } = Dimensions.get('window');

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

        // Web environment: Check sessionStorage for fresh server start
        // Mobile environment: Check AsyncStorage for first install
        const isWeb = Platform.OS === 'web';
        
        if (isWeb) {
          // Web: Use sessionStorage to detect fresh server start
          // sessionStorage persists across page reloads but clears on server restart
          const hasSeenOnboarding = typeof window !== 'undefined' ? 
            sessionStorage.getItem('hasSeenOnboarding') : null;
          
          if (hasSeenOnboarding === 'true') {
            console.log('🌐 Web: User has seen onboarding this session, redirecting to login');
            router.replace('/login');
            return;
          }
          console.log('🌐 Web: First load this session, showing onboarding');
        } else {
          // Mobile: Use AsyncStorage for persistent storage (only show once per install)
          const hasLaunched = await Storage.getStorageItem('hasLaunched');
          if (hasLaunched === 'true') {
            console.log('📱 Mobile: User has launched before, redirecting to login');
            router.replace('/login');
            return;
          }
          console.log('📱 Mobile: First time user, showing onboarding');
        }
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
      const isWeb = Platform.OS === 'web';
      
      if (isWeb) {
        // Web: Set sessionStorage flag (persists across page reloads, cleared on server restart)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('hasSeenOnboarding', 'true');
          console.log('🌐 Web: Set session flag for onboarding');
        }
      } else {
        // Mobile: Set AsyncStorage flag (persistent until app uninstall)
        await Storage.setStorageItem('hasLaunched', 'true');
        console.log('📱 Mobile: Set persistent flag for onboarding');
      }
    } catch (e) {
      console.error('Error setting onboarding flag:', e);
    }
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../assets/logo.png')} style={styles.logo} />
        <Text style={styles.text}>WELCOME TO GLAMORA</Text>
        <Text style={styles.subtext}>Choose your outfit</Text>

        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>GET STARTED</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.05,
  },
  logo: {
    width: Math.min(width * 0.7, 280),
    height: Math.min(width * 0.7, 280),
    resizeMode: 'contain',
    marginBottom: height * 0.03,
  },
  text: {
    fontSize: Math.min(width * 0.12, 48),
    fontFamily: 'PlayfairDisplay-Medium',
    marginBottom: height * 0.01,
    textAlign: 'center',
    color: 'white',
    letterSpacing: 2,
    paddingHorizontal: width * 0.05,
  },
  subtext: {
    fontSize: Math.min(width * 0.07, 28),
    fontFamily: 'PlayfairDisplay-Medium',
    marginBottom: height * 0.05,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FDD6A5',
    paddingVertical: height * 0.02,
    paddingHorizontal: width * 0.1,
    borderRadius: 15,
    width: Math.min(width * 0.7, 280),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'black',
    fontSize: Math.min(width * 0.07, 28),
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  loadingText: {
    color: '#4B2E2B',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
});
