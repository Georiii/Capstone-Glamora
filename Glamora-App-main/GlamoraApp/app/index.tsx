import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const decideInitialRoute = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          router.replace('/wardrobe');
          return;
        }

        const hasLaunched = await AsyncStorage.getItem('hasLaunched');
        if (hasLaunched === 'true') {
          router.replace('/login');
          return;
        }
      } catch (e) {
        // If anything fails, just show onboarding
      } finally {
        setIsChecking(false);
      }
    };

    decideInitialRoute();
  }, [router]);

  if (isChecking) {
    return null;
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
});
