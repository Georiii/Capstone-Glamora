import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './contexts/ThemeContext';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
      <Image source={require('../assets/glamoralogo.png')} style={styles.logo} />
      <Text style={[styles.text, { color: theme.colors.primaryText }]}>WELCOME TO GLAMORA</Text>

      <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.buttonBackground }]} onPress={() => router.push('/login')}>
        <Text style={[styles.buttonText, { color: theme.colors.buttonText }]}>CHOOSE YOUR OUTFIT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    letterSpacing: 2,
  },
  button: {
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
    fontSize: 16.5,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
