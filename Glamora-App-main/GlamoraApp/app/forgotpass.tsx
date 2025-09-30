import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔍 Sending password reset request for:', email);
      
      const response = await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const data = await response.json();
      console.log('📧 Password reset response:', data);

      if (response.ok && data.success) {
        Alert.alert(
          'Success', 
          'Password reset link has been sent to your email. Please check your inbox.',
          [
            {
              text: 'OK',
              onPress: () => {
                setEmail('');
                router.push('/login');
              }
            }
          ]
        );
      } else {
        // Handle specific error cases
        if (response.status === 404) {
          Alert.alert('Error', 'Email not found. Please check your email address.');
        } else {
          Alert.alert('Error', data.message || 'Failed to send reset link. Please try again.');
        }
      }
    } catch (error) {
      console.error('❌ Error sending password reset:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
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
      <TouchableOpacity 
        style={[styles.resetButton, isLoading && styles.resetButtonDisabled]} 
        onPress={handleReset}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.resetButtonText}>Send Reset Link</Text>
        )}
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
  resetButtonDisabled: {
    opacity: 0.6,
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
