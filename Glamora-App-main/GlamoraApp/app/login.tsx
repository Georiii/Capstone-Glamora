import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { API_ENDPOINTS } from '../config/api';

// Remove Firebase imports and usage. Refactor login to use your backend API.

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  React.useEffect(() => {
    // Remove Firebase onAuthStateChanged usage.
    setCheckingAuth(false);
  }, []);

  if (checkingAuth) {
    return null; // or a loading spinner if you prefer
  }

  const handleLogin = async () => {
    // Clear any previous error messages
    setErrorMessage('');
    
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields');
      return;
    }
    if (email.includes('@') && !(/@(gmail|yahoo|outlook)\.com$/.test(email))) {
      setErrorMessage('Email must be a valid Gmail, Yahoo, or Outlook address.');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Starting login process...');
      console.log('API endpoint:', API_ENDPOINTS.login);
      
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          
          // Handle account restriction
          if (response.status === 403 && errorData.restrictionReason) {
            const daysRemaining = errorData.daysRemaining || 0;
            errorMessage = `Your account was suspended for ${errorData.restrictionReason}. ${daysRemaining} days remaining.`;
          }
        } catch {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          errorMessage = `Server error: ${response.status}`;
        }
        setErrorMessage(errorMessage);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }
      
      console.log('Login successful, data:', data);
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify({ 
        _id: data.user.id,
        name: data.user.name, 
        email: data.user.email 
      }));
      router.push('/wardrobe');
    } catch (error: any) {
      console.error('Login error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      if (error.message.includes('Network request failed')) {
        setErrorMessage('Unable to connect to server. Please check your internet connection.');
      } else {
        setErrorMessage(error.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />

      <Text style={styles.text}>Login to your{"\n"}Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="white"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="white"
        secureTextEntry={true}
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {/* Error Message */}
      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity 
        style={styles.loginButton} 
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>{loading ? 'Logging In...' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/forgotpass')}>
        <Text style={styles.forgotPassword}>Forgot Password?</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.signUpText}>Sign up.</Text>
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
    top: 40,
    right: 10,
  },

  text: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 0,
    marginBottom: 30,
    lineHeight: 42,
    textAlign: 'center',
    letterSpacing: 1,
  },

  input: {
    width: 320,
    height: 60,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 20,
    color: 'black',
    fontSize: 18,
  },

  loginButton: {
    width: 200,
    height: 55,
    backgroundColor: '#FFE8C8',
    borderRadius: 25,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  loginButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },

  forgotPassword: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 10,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },

  footerText: {
    color: 'white',
    fontSize: 13,
  },

  signUpText: {
    color: '#F88379',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontWeight: '500',
  },
});
