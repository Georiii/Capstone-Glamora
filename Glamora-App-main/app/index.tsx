import { useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.text}>WELCOME TO GLAMORA</Text>
      <Text style={styles.subtext}>Choose your outfit</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push('/login')}>
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
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  text: {
    fontSize: 36,
    fontFamily: 'PlayfairDisplay-Medium',
    marginBottom: 5,
    textAlign: 'center',
    color: 'white',
  },
  subtext: {
    fontSize: 20,
    fontFamily: 'PlayfairDisplay-Medium',
    marginBottom: 20,
    color: 'white',
  },
  button: {
    backgroundColor: '#FDD6A5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 150,
    width: 225,
  },
  buttonText: {
    color: 'black',
    fontSize: 23,
    fontWeight: '600',
    textAlign: 'center',
  },
});
