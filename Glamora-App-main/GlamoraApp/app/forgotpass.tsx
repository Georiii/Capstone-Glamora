import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, TouchableWithoutFeedback, Keyboard, Dimensions, Platform } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

const { width, height } = Dimensions.get('window');

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.header}>Forgot Password</Text>
          <Text style={styles.subtext}>Enter your email to receive a reset link</Text>
          
          <View style={styles.loginBox}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(0,0,0,0.45)"
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
          </View>
          
          <View style={styles.footer}>
            <Text style={styles.footerText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.loginText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
    minHeight: height,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Math.max(20, width * 0.05),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height,
    paddingBottom: Math.max(40, height * 0.05),
  },
  logo: {
    width: Math.min(100, width * 0.25),
    height: Math.min(100, width * 0.25),
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 10,
    right: Platform.OS === 'web' ? 20 : 10,
    resizeMode: 'contain',
  },
  header: {
    fontSize: Math.min(36, width * 0.09),
    fontWeight: 'bold',
    color: 'white',
    marginTop: Platform.OS === 'web' ? 40 : 20,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtext: {
    fontSize: Math.min(15, width * 0.038),
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  loginBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: Math.max(20, width * 0.05),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: Math.min(60, height * 0.075),
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 20,
    color: '#333',
    fontSize: Math.min(18, width * 0.045),
    alignSelf: 'center',
  },
  resetButton: {
    width: Math.min(200, width * 0.5),
    height: Math.min(55, height * 0.07),
    backgroundColor: '#FFE8C8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButtonText: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: '700',
    color: '#000',
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    alignSelf: 'center',
  },
  footerText: {
    color: 'white',
    fontSize: Math.min(13, width * 0.033),
  },
  loginText: {
    color: '#2D6AFC',
    fontSize: Math.min(13, width * 0.033),
    textDecorationLine: 'underline',
  },
});
