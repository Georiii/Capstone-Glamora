import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleReset = () => {
    if (!email) {
      Alert.alert('Please enter your email address.');
      return;
    }
    if (!/@(gmail|yahoo|outlook)\.com$/.test(email)) {
      Alert.alert('Email must be a valid Gmail, Yahoo, or Outlook address.');
      return;
    }
    // Here you would call your backend API for password reset
    Alert.alert('If this email exists, you will receive a reset link.');
    setEmail('');
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.header}>Forgot Password</Text>
      <Text style={styles.subtext}>Enter your email to receive a reset link</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="white"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Text style={styles.resetButtonText}>Send Reset Link</Text>
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Remember your password? </Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    position: 'absolute',
    top: 50,
    right: 15,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 0,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    color: 'white',
    marginBottom: 20,
  },
  input: {
    width: 270,
    height: 50,
    borderRadius: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 12,
    color: 'black',
  },
  resetButton: {
    width: 170,
    height: 40,
    backgroundColor: '#FFE8C8',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    alignSelf: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    color: 'white',
    fontSize: 13,
  },
  loginText: {
    color: '#F88379',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
