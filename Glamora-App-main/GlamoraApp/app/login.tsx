import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView, Platform, Pressable, Keyboard, Dimensions, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS, getApiBaseUrl } from '../config/api';
import { useTheme } from './contexts/ThemeContext';
import { useUser } from './contexts/UserContext';

const { width, height } = Dimensions.get('window');

// Remove Firebase imports and usage. Refactor login to use your backend API.

export default function Login() {
  const router = useRouter();
  const { theme } = useTheme();
  const { setUser } = useUser();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [restrictionModalVisible, setRestrictionModalVisible] = useState(false);
  const [restrictionInfo, setRestrictionInfo] = useState<{ message: string; title: string } | null>(null);

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
          if (response.status === 403 && errorData.restrictionMessage) {
            setRestrictionInfo({
              title: 'Account Restricted',
              message: errorData.restrictionMessage,
            });
            setRestrictionModalVisible(true);
            setLoading(false);
            return;
          }

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
      const userData = { 
        _id: data.user.id,
        name: data.user.name, 
        email: data.user.email,
        role: data.user.role || 'user',
        profilePicture: data.user.profilePicture,
        bodyMeasurements: data.user.bodyMeasurements,
        stylePreferences: data.user.stylePreferences,
        profileSettings: data.user.profileSettings,
        subscription: data.user.subscription,
      };
      
      // Update UserContext immediately
      setUser(userData);
      console.log('✅ UserContext updated with new user data');
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('✅ User data saved to AsyncStorage');
      
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
    <Pressable onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss} style={styles.containerWrapper}>
      <Modal visible={restrictionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.restrictionModal, { maxWidth: width * 0.85, backgroundColor: theme.colors.containerBackground }]}>
            <Text style={[styles.restrictionTitle, { color: theme.colors.primaryText }]}>{restrictionInfo?.title || 'Account Notice'}</Text>
            <Text style={[styles.restrictionMessage, { color: theme.colors.secondaryText }]}>{restrictionInfo?.message ?? ''}</Text>
            <TouchableOpacity style={[styles.restrictionButton, { backgroundColor: theme.colors.buttonBackground }]} onPress={() => setRestrictionModalVisible(false)}>
              <Text style={[styles.restrictionButtonText, { color: theme.colors.buttonText }]}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={[styles.container, { backgroundColor: theme.colors.bodyBackground }]}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Image source={require('../assets/logo.png')} style={styles.logo} />

          <Text style={[styles.text, { color: theme.colors.primaryText }]}>Login to your{"\n"}Account</Text>

          {/* 🔲 New Container for the Inputs + Button */}
          <View style={[styles.loginBox, { backgroundColor: theme.colors.containerBackground }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border, color: theme.colors.primaryText }]}
              placeholder="Email"
              placeholderTextColor={theme.colors.secondaryText}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { backgroundColor: theme.colors.containerBackground, borderColor: theme.colors.border, color: theme.colors.primaryText }]}
                placeholder="Password"
                placeholderTextColor={theme.colors.secondaryText}
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
                    color={theme.colors.secondaryText}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: theme.colors.buttonBackground }]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={[styles.loginButtonText, { color: theme.colors.buttonText }]}>{loading ? 'Logging In...' : 'Login'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/forgotpass')}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          {/* End Container */}

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.colors.primaryText }]}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signUpText}>Sign up.</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  containerWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
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
    resizeMode: 'contain',
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 10,
    right: Platform.OS === 'web' ? 20 : 10,
  },

  text: {
    fontSize: Math.min(36, width * 0.09),
    fontWeight: 'bold',
    marginTop: Platform.OS === 'web' ? 40 : 20,
    marginBottom: 30,
    lineHeight: Math.min(42, width * 0.105),
    textAlign: 'center',
    letterSpacing: 1,
  },
  loginBox: {
    width: '100%',
    maxWidth: 360,
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
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 25,
    marginTop: 20,
    fontSize: Math.min(18, width * 0.045),
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
    height: Math.min(60, height * 0.075),
    borderWidth: 2,
    borderRadius: 25,
    paddingHorizontal: 25,
    paddingRight: 55,
    fontSize: Math.min(18, width * 0.045),
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
    width: Math.min(200, width * 0.5),
    height: Math.min(55, height * 0.07),
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
    fontSize: Math.min(20, width * 0.05),
    fontWeight: '700',
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },

  forgotPassword: {
    color: '#2D6AFC',
    fontSize: Math.min(13, width * 0.033),
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 10,
    textDecorationLine: 'underline',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  restrictionModal: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  restrictionTitle: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'Arial',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  restrictionMessage: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'Arial',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  restrictionButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  restrictionButtonText: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : 'Arial',
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: Math.min(13, width * 0.033),
  },

  signUpText: {
    color: '#2D6AFC',
    fontSize: Math.min(13, width * 0.033),
    textDecorationLine: 'underline',
  },

  errorText: {
    color: '#FF6B6B',
    fontSize: Math.min(14, width * 0.035),
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontWeight: '500',
  },
});
