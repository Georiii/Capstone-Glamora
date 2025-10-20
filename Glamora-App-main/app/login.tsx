import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setCheckingAuth(false);
  }, []);

  if (checkingAuth) return null;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (email.includes('@') && !(/@(gmail|yahoo|outlook)\.com$/.test(email))) {
      Alert.alert('Email must be a valid Gmail, Yahoo, or Outlook address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse);
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      Alert.alert('Login successful!');
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify({
        _id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      }));
      router.push('/wardrobe');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Login Failed', error.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.text}>Login to your{'\n'}Account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="white"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      {/* PASSWORD FIELD */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.input,
            styles.passwordInput,
            ...(Platform.OS === 'web' ? [{ outlineStyle: 'none' } as any] : []),
          ]}
          placeholder="Password"
          placeholderTextColor="white"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
        {/* SINGLE EYE ICON FIX */}
        {password.length > 0 && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="black" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
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

// ✅ STYLES
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
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 0,
    marginBottom: 20,
    lineHeight: 35,
    textAlign: 'center',
  },
  input: {
    width: 270,
    height: 50,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 15,
    color: 'black',
  },
  passwordContainer: {
    width: 270,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    position: 'relative',
  },
  passwordInput: {
    flex: 1,
    marginTop: 0,
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    padding: 8,
    zIndex: 2,
  },
  loginButton: {
    width: 150,
    height: 40,
    backgroundColor: '#FFE8C8',
    borderRadius: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textDecorationLine: 'underline',
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
});
