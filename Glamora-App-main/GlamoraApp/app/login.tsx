import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, ScrollView, Platform, Dimensions, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/api';
import { useAuth } from './contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Remove Firebase imports and usage. Refactor login to use your backend API.

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
      console.log('🚀 Starting login process...');
      console.log('📡 API endpoint:', API_ENDPOINTS.login);
      console.log('📍 Connecting to server at:', API_ENDPOINTS.login);
      
      // Test server connectivity first
      try {
        const apiBaseUrl = getApiBaseUrl('production');
        const healthUrl = `${apiBaseUrl}/health`;
        const testResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });
        console.log('✅ Server health check:', await testResponse.json());
      } catch (healthError: any) {
        console.error('❌ Server health check failed:', healthError.message);
        const apiBaseUrl = getApiBaseUrl('production');
        throw new Error(`Cannot reach server at ${apiBaseUrl}. Make sure: 
1) Backend server is running
2) You have internet connection
3) Server is accessible

Technical details: ${healthError.message}`);
      }
      
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
      
      // Use AuthContext login method for consistent session management
      await login(data.token, { 
        _id: data.user.id,
        name: data.user.name, 
        email: data.user.email 
      });
      
      router.replace('/wardrobe');
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
        <Image source={require('../assets/logo.png')} style={styles.logo} />

        <Text style={styles.text}>Login to your{"\n"}Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="white"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="white"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
          />
          
          {/* Password Visibility Toggle Icon */}
          {password.length > 0 && (
            <TouchableOpacity
              style={styles.passwordToggleIcon}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              activeOpacity={0.6}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off" : "eye"}
                size={22}
                color="#000000"
              />
            </TouchableOpacity>
          )}
        </View>

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.9,
  },
  logo: {
    width: Math.min(width * 0.25, 100),
    height: Math.min(width * 0.25, 100),
    resizeMode: 'contain',
    position: 'absolute',
    top: height * 0.02,
    right: width * 0.05,
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
    width: '100%',
    maxWidth: 320,
    height: 60,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 20,
    color: 'black',
    fontSize: 18,
    alignSelf: 'center',
  },

  passwordContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 320,
    marginTop: 20,
    alignSelf: 'center',
  },

  passwordInput: {
    width: '100%',
    height: 60,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 25,
    paddingRight: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    color: 'black',
    fontSize: 18,
  },

  passwordToggleIcon: {
    position: 'absolute',
    right: 18,
    top: '50%',
    marginTop: -11,
    padding: 6,
    zIndex: 1,
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
