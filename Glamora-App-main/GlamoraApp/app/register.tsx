import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';

const { width, height } = Dimensions.get('window');

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
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  // Animations
  const [animStrength] = useState(new Animated.Value(0));
  const [shakeAnim] = useState(new Animated.Value(0));

  // Evaluate password
  const evaluatePassword = (pwd: string) => {
    const lengthOk = pwd.length >= 8;
    const upper = /[A-Z]/.test(pwd);
    const lower = /[a-z]/.test(pwd);
    const number = /[0-9]/.test(pwd);
    const special = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const score = [lengthOk, upper, lower, number, special].filter(Boolean).length;

    if (score >= 5) return 'strong';
    if (score >= 3) return 'medium';
    return 'weak';
  };

  const onChangePassword = (text: string) => {
    setPassword(text);
    const strength = evaluatePassword(text);
    setPasswordStrength(strength);
  };

  // Animate transitions
  useEffect(() => {
    Animated.timing(animStrength, {
      toValue: passwordStrength === 'weak' ? 0 : passwordStrength === 'medium' ? 0.5 : 1,
      duration: 450,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    if (passwordStrength === 'weak' && password.length > 0) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 3, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [passwordStrength]);

  const animatedWidth = animStrength.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['30%', '65%', '100%'],
  });

  const animatedColor = animStrength.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#F15A5A', '#FFD166', '#06D6A0'],
  });

  const clientSideValidation = () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (passwordStrength === 'weak' || passwordStrength === '') {
      Alert.alert('Weak password', 'Password is not strong enough. Please follow the password requirements.');
      return false;
    }
    if (!termsChecked) {
      Alert.alert('Terms required', 'You must agree to the Terms and Conditions before registering.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!clientSideValidation()) return;

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.register, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const data = await response.json();
      Alert.alert('Account created successfully!');
      await AsyncStorage.setItem('user', JSON.stringify({ _id: data.user?._id, name, email }));
      router.push({ pathname: '/login', params: { fromRegister: 'true' } });
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      if (String((error as any).message).includes('Network request failed')) {
        Alert.alert('Connection Error', 'Unable to connect to server. Please check your internet connection.');
      } else {
        Alert.alert('Registration error: ' + (error as any).message || 'Unknown error');
      }
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
        <View style={styles.logoContainer}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
        </View>

        <Text style={styles.header}>Create Account</Text>

        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Name" placeholderTextColor="rgba(0,0,0,0.45)" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Surname" placeholderTextColor="rgba(0,0,0,0.45)" value={username} onChangeText={setUsername} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="rgba(0,0,0,0.45)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          {/* Password Input */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Password"
              placeholderTextColor="rgba(0,0,0,0.45)"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={onChangePassword}
            />
            <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#6b6b6b" />
            </TouchableOpacity>
          </View>

          {/* Guidelines + Animated Strength */}
          <View style={styles.pwGuidelines}>
            <Text style={styles.pwGuidelineHeader}>Password must be:</Text>
            <View style={styles.pwRules}>
              <Text style={styles.pwRule}>• At least 8 characters</Text>
              <Text style={styles.pwRule}>• One uppercase letter (A-Z)</Text>
              <Text style={styles.pwRule}>• One lowercase letter (a-z)</Text>
              <Text style={styles.pwRule}>• One number (0-9)</Text>
              <Text style={styles.pwRule}>• One special character (!,@,#,$, etc.)</Text>
            </View>

            <Animated.View style={[styles.strengthRow, { transform: [{ translateX: shakeAnim }] }]}>
              <Animated.View
                style={[
                  styles.animatedStrengthBar,
                  {
                    width: animatedWidth,
                    backgroundColor: animatedColor,
                    opacity: animStrength.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
                ]}
              />
            </Animated.View>

            {/* Weak password message */}
            {passwordStrength === 'weak' && password.length > 0 && (
              <Text style={styles.weakPasswordText}>Password is weak</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm Password"
              placeholderTextColor="rgba(0,0,0,0.45)"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((prev) => !prev)} style={styles.eyeIcon}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color="#6b6b6b" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.signUpButton, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.signUpButtonText}>{loading ? 'Signing up...' : 'Register'}</Text>
          </TouchableOpacity>

          <View style={styles.termsRow}>
            <TouchableOpacity onPress={() => setTermsChecked((s) => !s)} style={[styles.checkbox, termsChecked && styles.checkboxChecked]}>
              {termsChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I have read and agree to the{' '}
              <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                Terms and Conditions
              </Text>.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Have an Account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>Login here</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={termsModalVisible} animationType="fade" transparent onRequestClose={() => setTermsModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalHeader}>Terms and Conditions</Text>
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalText}>Your Terms and Conditions go here.</Text>
              </ScrollView>
              <Pressable style={styles.modalClose} onPress={() => setTermsModalVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
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
  logoContainer: { 
    position: 'absolute', 
    top: Platform.OS === 'web' ? 20 : 5, 
    right: Platform.OS === 'web' ? 20 : 5,
  },
  logo: { 
    width: Math.min(90, width * 0.23), 
    height: Math.min(90, width * 0.23), 
    resizeMode: 'contain',
  },
  header: { 
    fontSize: Math.min(28, width * 0.07), 
    fontWeight: '700', 
    color: 'white', 
    marginTop: Platform.OS === 'web' ? 60 : 50, 
    marginBottom: 18,
    textAlign: 'center',
  },
  card: {
    width: '100%', 
    maxWidth: 360, 
    backgroundColor: 'rgba(255, 255, 255, 0.36)', 
    borderRadius: 20, 
    padding: Math.max(18, width * 0.045),
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, 
    shadowRadius: 5, 
    elevation: 6,
  },
  input: {
    width: '100%', 
    height: Math.min(60, height * 0.075), 
    borderRadius: 25, 
    paddingHorizontal: 25, 
    backgroundColor: 'rgba(255, 255, 255, 0.4)', 
    marginBottom: 12, 
    color: '#333', 
    fontSize: Math.min(18, width * 0.045), 
    borderWidth: 2, 
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  passwordContainer: { 
    width: '100%', 
    position: 'relative', 
    marginBottom: 12,
  },
  passwordInput: { 
    marginBottom: 0,
    paddingRight: 55,
  },
  eyeIcon: { 
    position: 'absolute', 
    right: 18, 
    top: '50%',
    marginTop: -11,
    padding: 6,
    zIndex: 1,
  },
  pwGuidelines: { 
    width: '100%', 
    marginTop: 6, 
    marginBottom: 8,
  },
  pwGuidelineHeader: { 
    fontWeight: '600', 
    marginBottom: 6, 
    color: '#333',
    fontSize: Math.min(14, width * 0.035),
  },
  pwRules: { 
    marginBottom: 8,
  },
  pwRule: { 
    fontSize: Math.min(12, width * 0.03), 
    color: '#555', 
    marginBottom: 2,
  },
  strengthRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    gap: 8,
  },
  animatedStrengthBar: { 
    height: 8, 
    borderRadius: 6, 
    backgroundColor: '#eee', 
    marginRight: 6, 
    alignSelf: 'flex-start',
  },
  weakPasswordText: { 
    color: '#F15A5A', 
    fontSize: Math.min(12, width * 0.03), 
    fontWeight: '600', 
    marginTop: 4,
  },
  signUpButton: {
    width: Math.min(200, width * 0.5), 
    height: Math.min(55, height * 0.07), 
    backgroundColor: '#FFE8C8', 
    borderRadius: 25,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signUpButtonText: { 
    fontSize: Math.min(20, width * 0.05), 
    fontWeight: '700', 
    color: '#000', 
    textDecorationLine: 'underline',
    letterSpacing: 1,
  },
  termsRow: { 
    width: '100%', 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 12, 
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22, 
    height: 22, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#bdbdbd',
    marginRight: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff',
  },
  checkboxChecked: { 
    backgroundColor: '#F88379', 
    borderColor: '#F88379',
  },
  termsText: { 
    flex: 1, 
    color: '#333', 
    fontSize: Math.min(13, width * 0.033),
  },
  termsLink: { 
    color: '#2D6AFC', 
    textDecorationLine: 'underline',
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 30,
    marginBottom: 20,
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
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.45)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
  },
  modalContainer: { 
    width: '100%', 
    maxWidth: 720, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 18, 
    maxHeight: '80%',
  },
  modalHeader: { 
    fontSize: Math.min(18, width * 0.045), 
    fontWeight: '700', 
    marginBottom: 8,
  },
  modalScroll: { 
    marginBottom: 12,
  },
  modalText: { 
    color: '#333', 
    lineHeight: 20,
    fontSize: Math.min(14, width * 0.035),
  },
  modalClose: { 
    alignSelf: 'flex-end', 
    marginTop: 6, 
    backgroundColor: '#F4C2C2', 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8,
  },
  modalCloseText: { 
    fontWeight: '700', 
    color: '#222',
    fontSize: Math.min(14, width * 0.035),
  },
});
