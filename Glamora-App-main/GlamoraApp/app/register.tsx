import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '../config/api';
import { validatePassword, getPasswordStrengthColor, getPasswordStrengthText, PasswordValidationResult } from '../utils/passwordValidation';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (newPassword.length > 0) {
      const validation = validatePassword(newPassword);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation(null);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      Alert.alert(
        'Password Requirements Not Met',
        'Your password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, username, email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed.';
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

      try {
        await response.json();
      } catch {
        console.error('JSON parse error');
        throw new Error('Invalid server response. Please try again.');
      }
      
      Alert.alert('Account created successfully!', 'Please login with your new credentials.', [
        {
          text: 'OK',
          onPress: () => {
            router.replace('/login');
          }
        }
      ]);
    } catch (error: any) {
      setLoading(false);
      console.error('Registration error:', error);
      if (error.message.includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Registration error: ' + (error.message || 'Unknown error'));
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Brand */}
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
        </View>

      <Text style={styles.header}>Create an account</Text>

      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor="rgba(255, 255, 255, 0.8)"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="rgba(255, 255, 255, 0.8)"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="rgba(255, 255, 255, 0.8)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          placeholderTextColor="rgba(255, 255, 255, 0.8)"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={handlePasswordChange}
        />
        <TouchableOpacity 
          onPress={() => setShowPassword((prev) => !prev)} 
          style={styles.eyeIcon}
        >
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </View>

      {/* Password Strength Indicator */}
      {passwordValidation && (
        <View style={styles.passwordStrengthContainer}>
          <View style={styles.passwordStrengthBar}>
            <View 
              style={[
                styles.passwordStrengthFill, 
                { 
                  width: passwordValidation.strength === 'weak' ? '33%' : 
                         passwordValidation.strength === 'medium' ? '66%' : '100%',
                  backgroundColor: getPasswordStrengthColor(passwordValidation.strength)
                }
              ]} 
            />
          </View>
          <Text style={[
            styles.passwordStrengthText,
            { color: getPasswordStrengthColor(passwordValidation.strength) }
          ]}>
            Password Strength: {getPasswordStrengthText(passwordValidation.strength)}
          </Text>
          {passwordValidation.errors.length > 0 && (
            <View style={styles.passwordErrorsContainer}>
              {passwordValidation.errors.map((error, index) => (
                <Text key={index} style={styles.passwordErrorText}>
                  • {error}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Confirm Password"
          placeholderTextColor="rgba(255, 255, 255, 0.8)"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity 
          onPress={() => setShowConfirmPassword((prev) => !prev)} 
          style={styles.eyeIcon}
        >
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signUpButton} onPress={handleRegister} disabled={loading}>
        <Text style={styles.signUpButtonText}>{loading ? 'Signing up...' : 'Sign up'}</Text>
      </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4C2C2',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },

  logoContainer: {
    position: 'absolute',
    top: 10,
    right: 45,
    alignItems: 'center',
  },

  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    position: 'absolute',
  },


  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  input: {
    width: 280,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 15,
    color: 'white',
    fontSize: 16,
  },

  passwordContainer: {
    width: 280,
    position: 'relative',
    marginBottom: 15,
  },

  passwordInput: {
    marginBottom: 0,
  },

  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 14,
  },
  passwordStrengthContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  passwordErrorsContainer: {
    marginTop: 4,
  },
  passwordErrorText: {
    fontSize: 11,
    color: '#FF6B6B',
    marginBottom: 2,
  },

  signUpButton: {
    width: 160,
    height: 45,
    backgroundColor: '#FFE8C8',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    alignSelf: 'center',
  },

  signUpButtonText: {
    fontSize: 18,
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
    fontSize: 14,
  },

  loginText: {
    color: '#F88379',
    fontSize: 14,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
});
